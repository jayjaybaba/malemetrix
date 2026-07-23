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
};
const KNOWN_PRICES_CENTS: Record<string, number> = { "protokoll": 4900 };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
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

async function handleSubscriptionEvent(body: any, user: any): Promise<Response> {
  const provider = String(body.provider || "");
  const eventId = String(body.eventId || "");
  const eventType = String(body.eventType || "");
  const plan = String(body.plan || "");
  if (!provider || !eventId || !eventType || !plan) return json({ error: "bad_request" }, 400);
  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const body = await req.json();

    // --- Konfigurations-Ehrlichkeit: ohne Secrets keine Vortäuschung ---
    const PP_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
    const PP_SECRET = Deno.env.get("PAYPAL_SECRET") || "";
    if (!PP_ID || !PP_SECRET) return json({ error: "provider_not_configured" }, 503);
    const PP_BASE = (Deno.env.get("PAYPAL_ENV") || "live") === "sandbox"
      ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

    // --- Auth: Nutzer-JWT (Entitlements brauchen ein Konto) ---
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { authorization: req.headers.get("authorization") || "" } },
    });
    const { data: userData } = await supa.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "not_signed_in" }, 401);

    // --- Abo-Webhook (§10–§12): deterministische Zustandsmaschine, idempotent ---
    if (body.action === "subscription_event") {
      return await handleSubscriptionEvent(body, user);
    }

    if (body.action !== "verify_paypal" || typeof body.paypalOrderId !== "string") {
      return json({ error: "bad_request" }, 400);
    }
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds.filter((p: unknown) => typeof p === "string") : [];
    const keys = [...new Set(productIds.flatMap((p) => PRODUCT_KEYS[p] || []))];
    if (!keys.length) return json({ error: "no_entitled_products" }, 400);

    // --- Zahlung DIREKT bei PayPal prüfen (nie dem Client glauben) ---
    const token = await paypalToken(PP_BASE, PP_ID, PP_SECRET);
    if (!token) return json({ error: "provider_auth_failed" }, 502);
    const or = await fetch(PP_BASE + "/v2/checkout/orders/" + encodeURIComponent(body.paypalOrderId), {
      headers: { authorization: "Bearer " + token },
    });
    if (!or.ok) return json({ error: "order_not_found" }, 404);
    const order = await or.json();
    if (order.status !== "COMPLETED") return json({ error: "not_captured", status: order.status }, 409);
    const pu = (order.purchase_units || [])[0] || {};
    const cap = ((pu.payments || {}).captures || [])[0] || {};
    if (cap.status !== "COMPLETED") return json({ error: "capture_incomplete" }, 409);
    const paidCents = Math.round(parseFloat(cap.amount?.value || "0") * 100);
    const minCents = productIds.reduce((a, p) => a + (KNOWN_PRICES_CENTS[p] || 0), 0);
    if (minCents > 0 && paidCents < minCents) return json({ error: "amount_mismatch" }, 409);

    // --- Idempotenz ZUERST (§73): unique insert, Duplikat => bereits verarbeitet ---
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const evIns = await service.from("commerce_events").insert({
      provider: "paypal", event_id: String(cap.id || body.paypalOrderId), event_type: "capture.completed",
      order_no: body.orderNo || null,
    });
    if (evIns.error) {
      // 23505 unique violation = Replay: kein zweites Grant, aber ehrlicher Erfolg
      const already = String(evIns.error.code) === "23505" || /duplicate/i.test(evIns.error.message || "");
      if (!already) return json({ error: "event_log_failed" }, 500);
      return json({ ok: true, replay: true, entitlements: keys });
    }

    // --- Order + Entitlements (Service-Role, RLS-geschützt vor Clients) ---
    await service.from("orders").insert({
      user_id: user.id, order_no: body.orderNo || ("PP-" + cap.id), email: user.email,
      items: body.items || [], product_keys: keys, total_cents: paidCents,
      currency: cap.amount?.currency_code || "EUR", pay_method: "paypal",
      status: "paid", provider: "paypal", provider_ref: String(cap.id || body.paypalOrderId),
      paid_at: new Date().toISOString(),
    });
    for (const k of keys) {
      await service.from("entitlements").upsert(
        { user_id: user.id, product_key: k, status: "active", source: "paypal" },
        { onConflict: "user_id,product_key" },
      );
    }
    return json({ ok: true, entitlements: keys });
  } catch (e) {
    return json({ error: "internal", detail: String(e?.message || e) }, 500);
  }
});
