// ============================================================================
// MaleMetrix Phase 8 — Edge Function `mm-commerce`
// SERVERSEITIGE Kauf-Verifikation + Entitlement-Vergabe (§12/§73).
// STATUS: CODE COMPLETE · CONFIG REQUIRED (Secrets + Deploy — siehe COMMERCE.md).
//   supabase secrets set PAYPAL_CLIENT_ID=... PAYPAL_SECRET=... [PAYPAL_ENV=live]
//   supabase functions deploy mm-commerce
//
// EISERNE REGEL: Der Client vergibt NIE bezahlten Zugriff. Diese Funktion
// prüft die Zahlung DIREKT bei PayPal (Server→Server) und schreibt erst dann
// Order + Entitlements — idempotent über commerce_events (unique event_id).
// Ein wiederholter/replayter Aufruf mit derselben Capture-ID vergibt nichts
// doppelt und eine erfundene Order-ID scheitert an der PayPal-Verifikation.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const PRODUCT_KEYS: Record<string, string[]> = {
  // Produkt-ID (shop-data.js) -> Entitlements. Nur bekannte IDs werden gemappt.
  "protokoll": ["protocol", "twelve_week"],
  // Interner E2E-Test (1,00 €): vergibt AUSSCHLIESSLICH das isolierte
  // e2e_test-Entitlement — niemals Zugriff auf echte Produkte.
  "mm-e2e-test": ["e2e_test"],
};
const KNOWN_PRICES_CENTS: Record<string, number> = { "protokoll": 4900, "mm-e2e-test": 100 };

// CORS: die Funktion wird vom Browser (www.malemetrix.com) cross-origin
// aufgerufen. supabase-js sendet authorization + x-client-info + apikey →
// der Browser macht einen Preflight (OPTIONS). Ohne diese Header schlägt der
// Preflight fehl und der eigentliche POST wird NIE gesendet (Symptom:
// "function_error" ohne lesbaren Server-Body). Deshalb: jede Antwort trägt
// CORS-Header und OPTIONS wird sauber mit 204 beantwortet.
const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-max-age": "86400",
};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...CORS } });
}

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

async function handleSubscriptionEvent(body: any, user: any, service: any): Promise<Response> {
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
  try {
    // CORS-Preflight zuerst — MUSS 2xx + CORS-Header liefern, sonst blockt
    // der Browser den nachfolgenden POST (Root Cause des function_error).
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const body = await req.json();

    // --- Konfigurations-Ehrlichkeit: ohne Secrets keine Vortäuschung ---
    const PP_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
    const PP_SECRET = Deno.env.get("PAYPAL_SECRET") || "";
    if (!PP_ID || !PP_SECRET) return json({ error: "provider_not_configured" }, 503);
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

    // --- Abo-Webhook (§10–§12): deterministische Zustandsmaschine, idempotent ---
    if (body.action === "subscription_event") {
      return await handleSubscriptionEvent(body, user, service);
    }

    if (body.action !== "verify_paypal" || typeof body.paypalOrderId !== "string") {
      return json({ error: "bad_request" }, 400);
    }
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds.filter((p: unknown) => typeof p === "string") : [];
    const keys = [...new Set(productIds.flatMap((p) => PRODUCT_KEYS[p] || []))];
    if (!keys.length) return json({ error: "no_entitled_products" }, 400);

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
    const paidCents = Math.round(parseFloat(cap.amount?.value || "0") * 100);
    const minCents = productIds.reduce((a, p) => a + (KNOWN_PRICES_CENTS[p] || 0), 0);
    if (minCents > 0 && paidCents < minCents) return json({ error: "amount_mismatch" }, 409);
    // E2E-Testprodukt strikt isoliert: nie mit echten Produkten kombinierbar
    // und der Betrag muss EXAKT 1,00 € sein (nicht nur Mindestbetrag).
    if (productIds.includes("mm-e2e-test")) {
      if (productIds.length !== 1) return json({ error: "test_product_isolated" }, 400);
      if (paidCents !== 100) return json({ error: "amount_mismatch" }, 409);
    }

    // --- Idempotenz ZUERST (§73): unique insert, Duplikat => Replay.
    // WICHTIG: Ein Replay kehrt NICHT sofort zurück, sondern stellt Order +
    // Entitlements idempotent sicher (Selbstheilung, falls ein früherer
    // Aufruf nach dem Event-Log, aber vor den Writes abgebrochen ist).
    // (service-Client wird oben einmalig erzeugt und hier wiederverwendet.) ---
    const providerRef = String(cap.id || body.paypalOrderId);
    let replay = false;
    const evIns = await service.from("commerce_events").insert({
      provider: "paypal", event_id: providerRef, event_type: "capture.completed",
      order_no: body.orderNo || null,
    });
    if (evIns.error) {
      const already = String(evIns.error.code) === "23505" || /duplicate/i.test(evIns.error.message || "");
      if (!already) return json({ error: "event_log_failed" }, 500);
      replay = true;
    }

    // --- Order sicherstellen (kein Duplikat über provider_ref) ---
    const existing = await service.from("orders").select("id").eq("provider_ref", providerRef).maybeSingle();
    if (!existing.data) {
      const oi = await service.from("orders").insert({
        user_id: user.id, order_no: body.orderNo || ("PP-" + providerRef), email: user.email,
        items: body.items || [], product_keys: keys, total_cents: paidCents,
        currency: cap.amount?.currency_code || "EUR", pay_method: "paypal",
        status: "paid", provider: "paypal", provider_ref: providerRef,
        paid_at: new Date().toISOString(),
      });
      if (oi.error) return json({ error: "order_write_failed", detail: oi.error.message }, 500);
    }

    // --- Entitlements sicherstellen (idempotenter Upsert, Fehler = Fehler) ---
    for (const k of keys) {
      const ue = await service.from("entitlements").upsert(
        { user_id: user.id, product_key: k, status: "active", source: "paypal" },
        { onConflict: "user_id,product_key" },
      );
      if (ue.error) return json({ error: "entitlement_write_failed", detail: ue.error.message }, 500);
    }
    return json({ ok: true, replay, entitlements: keys, amount_cents: paidCents });
  } catch (e) {
    return json({ error: "internal", detail: String(e?.message || e) }, 500);
  }
});
