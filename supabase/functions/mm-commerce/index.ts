// ============================================================================
// MaleMetrix Phase 10 — Edge Function `mm-commerce`
// SERVERSEITIGE Kauf-Verifikation + Entitlement-Vergabe (PayPal UND Stripe).
//   supabase secrets set PAYPAL_CLIENT_ID=... PAYPAL_SECRET=... [PAYPAL_ENV=live]
//   supabase secrets set STRIPE_SECRET_KEY=...      (für action: verify_stripe)
//   supabase functions deploy mm-commerce
//
// EISERNE REGELN:
// · Der Client vergibt NIE bezahlten Zugriff und bestimmt NIE Preis/Währung/
//   Entitlements — er meldet nur Kaufabsicht (Produkt-IDs). Die Zahlung wird
//   DIREKT beim Anbieter (Server→Server) verifiziert: bei PayPal die Order/
//   Capture, bei Stripe die Checkout-Session (status=complete + paid).
// · Fulfillment-Reihenfolge (Live-Bugfix, siehe fulfillment.mjs):
//   ZAHLUNG VERIFIZIERT → ORDER → ENTITLEMENT → AUDIT (best effort).
//   orders(provider, provider_ref) ist die Transaktions-Idempotenz,
//   entitlements(user_id, product_key) die Access-Idempotenz,
//   commerce_events ist NUR Audit und blockiert nie einen bezahlten Kauf.
// · Eine Capture kann nie von einem zweiten Account geclaimt werden
//   (409 payment_already_claimed).
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { fulfillVerifiedCapture, PRODUCTS, validateProducts } from "./fulfillment.mjs";
import { corsHeaders, jsonResponse, preflight } from "../_shared/edge.mjs";

// CORS (P0.7): die Funktion wird vom Browser (www.malemetrix.com) cross-origin
// aufgerufen. supabase-js sendet authorization + x-client-info + apikey →
// der Browser macht einen Preflight (OPTIONS). Ohne diese Header schlägt der
// Preflight fehl und der eigentliche POST wird NIE gesendet (Symptom:
// "function_error" ohne lesbaren Server-Body). Deshalb: jede Antwort trägt
// CORS-Header und OPTIONS wird mit 204 beantwortet. Seit P10: Allowlist
// (www + Apex) statt Wildcard — _shared/edge.mjs. Die Header werden PRO
// Request berechnet (Origin-Echo), nie in Modul-State gehalten (Race-frei).
type JsonFn = (data: unknown, status?: number) => Response;

async function paypalToken(base: string, id: string, secret: string): Promise<string | null> {
  const r = await fetch(base + "/v1/oauth2/token", {
    method: "POST",
    headers: { authorization: "Basic " + btoa(id + ":" + secret), "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.access_token || null;
}

// --- Billing-Zustandsmaschine (§11): dieselbe Tabelle wie js/os/billing-machine.js.
// Out-of-order/rückwärtige/unbekannte Events sind No-Ops statt Zustandsschäden.
const BILLING_TRANSITIONS: Record<string, { from: string[]; to: string | null }> = {
  trial_started: { from: ["FREE"], to: "TRIALING" },
  subscription_created: { from: ["FREE", "TRIALING", "CANCELLED", "EXPIRED"], to: "ACTIVE" },
  invoice_paid: { from: ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE", "CANCEL_AT_PERIOD_END"], to: null },
  payment_failed: { from: ["ACTIVE", "TRIALING"], to: "PAST_DUE" },
  grace_entered: { from: ["PAST_DUE"], to: "GRACE" },
  cancel_at_period_end: { from: ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE"], to: "CANCEL_AT_PERIOD_END" },
  cancel_now: { from: ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE", "CANCEL_AT_PERIOD_END"], to: "CANCELLED" },
  period_ended: { from: ["CANCEL_AT_PERIOD_END", "GRACE", "PAST_DUE"], to: "EXPIRED" },
  refunded: { from: ["ACTIVE", "PAST_DUE", "GRACE", "CANCEL_AT_PERIOD_END", "CANCELLED"], to: "REFUNDED" },
  reactivated: { from: ["CANCELLED", "EXPIRED", "REFUNDED"], to: "ACTIVE" },
};
function billingNext(state: string, event: string): string {
  const t = BILLING_TRANSITIONS[event];
  if (!t) return state;
  if (!t.from.includes(state)) return state;
  if (event === "invoice_paid") return state === "CANCEL_AT_PERIOD_END" ? "CANCEL_AT_PERIOD_END" : "ACTIVE";
  return t.to as string;
}

async function handleSubscriptionEvent(body: any, user: any, service: any, json: JsonFn): Promise<Response> {
  const provider = String(body.provider || "");
  const eventId = String(body.eventId || "");
  const eventType = String(body.eventType || "");
  const plan = String(body.plan || "");
  if (!provider || !eventId || !eventType || !plan) return json({ error: "bad_request" }, 400);
  // service-Client wird vom Aufrufer übergeben (einmalig erzeugt, Service-Role).
  // Idempotenz zuerst (§12): unique(provider,event_id). Duplikat ⇒ No-Op.
  const ev = await service.from("subscription_events").insert({
    provider, event_id: eventId, event_type: eventType, provider_sub_id: body.providerSubId || null,
  });
  if (ev.error) {
    const dup = String(ev.error.code) === "23505" || /duplicate/i.test(ev.error.message || "");
    if (dup) return json({ ok: true, replay: true });
    return json({ error: "event_log_failed" }, 500);
  }
  // Aktuellen Zustand laden, deterministisch transitionieren, schreiben.
  const cur = await service.from("subscriptions").select("state")
    .eq("user_id", user.id).eq("provider", provider).eq("plan", plan).maybeSingle();
  const fromState = cur.data?.state || "FREE";
  const toState = billingNext(fromState, eventType);
  await service.from("subscriptions").upsert({
    user_id: user.id, provider, plan, state: toState,
    provider_sub_id: body.providerSubId || null,
    current_period_end: body.currentPeriodEnd || null,
    cancel_at_period_end: toState === "CANCEL_AT_PERIOD_END",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider,plan" });
  // Fähigkeits-Entitlement folgt dem Zustand: aktiv ⇒ intelligence_sub, sonst entziehen.
  const live = ["ACTIVE", "TRIALING", "GRACE", "CANCEL_AT_PERIOD_END"].includes(toState);
  await service.from("entitlements").upsert(
    { user_id: user.id, product_key: "intelligence_sub", status: live ? "active" : "revoked", source: provider },
    { onConflict: "user_id,product_key" },
  );
  return json({ ok: true, from: fromState, to: toState });
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get("origin") || "");
  const json: JsonFn = (data, status = 200) => jsonResponse(data, status, CORS);
  try {
    // CORS-Preflight zuerst — MUSS 2xx + CORS-Header liefern, sonst blockt
    // der Browser den nachfolgenden POST (Root Cause des function_error).
    if (req.method === "OPTIONS") return preflight(CORS);
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const body = await req.json();

    // --- Konfigurations-Ehrlichkeit: ohne Secrets keine Vortäuschung ---
    // Die Prüfung erfolgt PRO ANBIETER weiter unten. Früher stand hier ein
    // harter PayPal-Check für JEDEN Aufruf — damit hätte ein reiner
    // Stripe-Betrieb ohne PayPal-Secrets pauschal 503 bekommen.
    const PP_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
    const PP_SECRET = Deno.env.get("PAYPAL_SECRET") || "";
    const PP_BASE = (Deno.env.get("PAYPAL_ENV") || "live") === "sandbox"
      ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

    // --- Auth: JWT SERVER-AUTORITATIV validieren ---
    // Dieses Projekt nutzt neue Signing Keys (ES256) + das Publishable-Key-
    // System. Der frühere ANON_KEY-Client mit getUser() OHNE Token liefert
    // hier keinen User, obwohl das Gateway den JWT längst erkennt (leerer/
    // falscher SUPABASE_ANON_KEY für diesen Projekt-Typ). Korrekt: den Bearer-
    // Token EXPLIZIT mit dem Service-Role-Client validieren — autoritativ,
    // niemals ungeprüfte JWT-Claims als Wahrheit nehmen. Ein einziger
    // Service-Client wird ab hier für Auth UND alle Writes wiederverwendet.
    const SUPA_URL = Deno.env.get("SUPABASE_URL") || "";
    const SR_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!SUPA_URL || !SR_KEY) return json({ error: "provider_not_configured" }, 503);
    const service = createClient(SUPA_URL, SR_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "auth_missing" }, 401);
    let user: { id: string; email?: string } | null = null;
    try {
      const { data: uData, error: uErr } = await service.auth.getUser(jwt);
      if (uErr || !uData?.user) return json({ error: "auth_invalid_token" }, 401);
      user = uData.user;
    } catch (_e) {
      return json({ error: "auth_validation_failed" }, 401);
    }

    // --- Fulfillment: ORDER → ENTITLEMENT → AUDIT (fulfillment.mjs) ---
    // Der DB-Adapter kapselt Supabase; die Geschäftslogik ist injiziert und
    // in tools-dev/tests/commerce-fulfillment.test.js real unit-getestet.
    const db = {
      findOrderByProviderRef: async (provider: string, ref: string) =>
        await service.from("orders")
          .select("id,user_id,status,total_cents,currency,product_keys")
          .eq("provider", provider).eq("provider_ref", ref).maybeSingle(),
      insertOrder: async (row: Record<string, unknown>) => await service.from("orders").insert(row),
      upsertEntitlement: async (row: Record<string, unknown>) =>
        await service.from("entitlements").upsert(row, { onConflict: "user_id,product_key" }),
      logEvent: async (row: Record<string, unknown>) => await service.from("commerce_events").insert(row),
    };
    // --- Abo-Webhook (§10–§12): deterministische Zustandsmaschine, idempotent ---
    if (body.action === "subscription_event") {
      return await handleSubscriptionEvent(body, user, service, json);
    }

    // --- STRIPE: Zahlung serverseitig prüfen, dann derselbe Fulfillment-Kern ---
    // Die Rückleitung von Stripe ist KEIN Zahlungsnachweis. Beweis ist
    // ausschließlich die Checkout-Session, direkt bei Stripe abgefragt.
    // Als provider_ref dient der PaymentIntent: er ist die Geld-Identität und
    // bleibt über Wiederholungen stabil — genau das braucht die Idempotenz.
    if (body.action === "verify_stripe") {
      const SK = Deno.env.get("STRIPE_SECRET_KEY") || "";
      if (!SK) return json({ error: "provider_not_configured" }, 503);
      const sid = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
      // Formatprüfung vor dem Netzaufruf: nur echte Session-IDs, kein Freitext.
      if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sid)) return json({ error: "bad_request" }, 400);

      const idsS: string[] = Array.isArray(body.productIds) ? body.productIds : [];
      const pvS = validateProducts(idsS, PRODUCTS);
      if (!pvS.ok) return json({ error: pvS.error }, pvS.status);

      const sres = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sid), {
        headers: { authorization: "Bearer " + SK },
      });
      if (sres.status === 404) return json({ error: "order_not_found" }, 404);
      if (sres.status === 401 || sres.status === 403) return json({ error: "stripe_auth_failed" }, 502);
      if (!sres.ok) return json({ error: "stripe_lookup_failed", status: sres.status }, 502);
      const session = await sres.json();

      // Bezahlt heißt bei Stripe: Session abgeschlossen UND payment_status paid.
      if (session.status !== "complete" || session.payment_status !== "paid") {
        return json({ error: "not_captured", status: String(session.payment_status || session.status || "unknown") }, 409);
      }
      const ref = typeof session.payment_intent === "string" && session.payment_intent
        ? session.payment_intent : String(session.id);

      // Adaptive Pricing (am Zahlungslink aktiv, live geprüft Juli 2026): zahlt
      // ein Käufer in seiner Landeswährung, stehen `currency` und
      // `amount_total` in DIESER Währung — eine US-Zahlung käme als USD mit
      // umgerechnetem Betrag zurück. Der Fulfillment-Kern prüft exakt gegen den
      // EUR-Katalogpreis; ohne diese Umrechnung würde ein völlig korrekt
      // bezahlter Auslandskauf mit currency_mismatch/amount_mismatch abgelehnt.
      // Weist Stripe eine Umrechnung aus, gilt deshalb der Ursprungsbetrag.
      const conv = session.currency_conversion || null;
      const paidCents = Number((conv && conv.amount_total != null ? conv.amount_total : session.amount_total) || 0);
      const paidCurrency = String((conv && conv.source_currency) || session.currency || "").toUpperCase();

      const resultS = await fulfillVerifiedCapture({
        provider: "stripe",
        userId: user.id,
        email: user.email || null,
        // Bestellnummer aus dem Client ODER aus der Referenz, die der Checkout
        // beim Weiterleiten an Stripe mitgegeben hat (client_reference_id).
        orderNo: typeof body.orderNo === "string" && body.orderNo ? body.orderNo
          : (typeof session.client_reference_id === "string" ? session.client_reference_id : null),
        items: body.items,
        capture: {
          id: ref,
          // Der Kern erwartet die PayPal-Nomenklatur; die Prüfung "bezahlt"
          // ist oben schon anhand der Stripe-Felder erfolgt.
          status: "COMPLETED",
          amountCents: paidCents,
          currency: paidCurrency,
        },
        productIds: idsS,
      }, db, PRODUCTS);
      return json(resultS.body, resultS.status);
    }

    if (body.action !== "verify_paypal" || typeof body.paypalOrderId !== "string") {
      return json({ error: "bad_request" }, 400);
    }
    // Ab hier ausschließlich PayPal — erst jetzt sind PayPal-Secrets Pflicht.
    if (!PP_ID || !PP_SECRET) return json({ error: "provider_not_configured" }, 503);
    // Produkt-/Preis-Validierung VOR dem PayPal-Roundtrip: unbekannte oder
    // leere Produktlisten sofort ablehnen (P0.2) — nie still tolerieren.
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    const pv = validateProducts(productIds, PRODUCTS);
    if (!pv.ok) return json({ error: pv.error }, pv.status);

    // --- Zahlung DIREKT bei PayPal prüfen (nie dem Client glauben) ---
    // Robust für iOS-Safari-Kontextverlust: die übergebene ID darf eine
    // Order-ID ODER eine Capture-/Transaktions-ID sein (Recovery-Pfad).
    // Eine APPROVED-Order (Client-Capture kam nie zurück) wird serverseitig
    // idempotent captured — die Zahlung des Kunden geht nie verloren.
    const token = await paypalToken(PP_BASE, PP_ID, PP_SECRET);
    if (!token) return json({ error: "paypal_auth_failed" }, 502);
    const ppId = encodeURIComponent(body.paypalOrderId);
    let cap: any = null;
    // Die übergebene ID kann eine Order-ID ODER eine Capture-/Transaktions-ID
    // sein (Recovery nutzt die Transaktions-ID aus der PayPal-Aktivität).
    // Reihenfolge: erst als Order deuten (nötig fürs Capture einer nur
    // APPROVED-Order), sonst als Capture nachschlagen.
    const or = await fetch(PP_BASE + "/v2/checkout/orders/" + ppId, { headers: { authorization: "Bearer " + token } });
    if (or.ok) {
      let order = await or.json();
      if (order.status === "APPROVED") {
        // Kunde hat bei PayPal bestätigt, Client-Capture ging verloren →
        // serverseitig capturen (idempotent über PayPal-Request-Id).
        const capRes = await fetch(PP_BASE + "/v2/checkout/orders/" + ppId + "/capture", {
          method: "POST",
          headers: { authorization: "Bearer " + token, "content-type": "application/json", "PayPal-Request-Id": "mm-cap-" + body.paypalOrderId },
        });
        if (capRes.ok) order = await capRes.json();
      }
      if (order.status !== "COMPLETED") return json({ error: "not_captured", status: order.status }, 409);
      const pu = (order.purchase_units || [])[0] || {};
      cap = ((pu.payments || {}).captures || [])[0] || {};
      if (!cap || !cap.id) return json({ error: "capture_not_found" }, 404);
    } else if (or.status === 404) {
      // ID ist keine Order → als Capture-/Transaktions-ID nachschlagen.
      const cr = await fetch(PP_BASE + "/v2/payments/captures/" + ppId, { headers: { authorization: "Bearer " + token } });
      if (cr.status === 404) return json({ error: "capture_not_found" }, 404);
      if (!cr.ok) return json({ error: "paypal_lookup_failed", status: cr.status }, 502);
      cap = await cr.json();
    } else {
      // Weder Order-Lookup ok noch klares 404 → echtes PayPal-/Auth-Problem.
      return json({ error: "paypal_lookup_failed", status: or.status }, 502);
    }
    if (cap.status !== "COMPLETED") return json({ error: "capture_incomplete", status: cap.status }, 409);

    const result = await fulfillVerifiedCapture({
      provider: "paypal",
      userId: user.id,
      email: user.email || null,
      orderNo: typeof body.orderNo === "string" ? body.orderNo : null,
      items: body.items,
      capture: {
        id: String(cap.id),
        status: String(cap.status),
        amountCents: Math.round(parseFloat(cap.amount?.value || "0") * 100),
        currency: String(cap.amount?.currency_code || ""),
      },
      productIds,
    }, db, PRODUCTS);
    return json(result.body, result.status);
  } catch (e) {
    // Ursache bleibt im Funktions-Log; der Client bekommt nur den Code.
    console.error("[mm-commerce] unhandled", e);
    return json({ error: "internal" }, 500);
  }
});
