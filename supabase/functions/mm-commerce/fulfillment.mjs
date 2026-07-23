// ============================================================================
// MaleMetrix — Fulfillment-Kern für mm-commerce (Phase 10 / P0).
//
// Dieses Modul ist BEWUSST ohne Deno-/Supabase-Imports geschrieben: reine
// Geschäftslogik mit injizierten Abhängigkeiten (db, Katalog). Dadurch läuft
// exakt derselbe Code in der Edge Function (Deno) UND in den Node-Unit-Tests
// (tools-dev/tests/commerce-fulfillment.test.js) — die Regressionstests prüfen
// die echte Logik, nicht nur Quelltext-Muster.
//
// ARCHITEKTUR (die Reihenfolge ist der Kern des Live-Bugfixes):
//   PayPal serverseitig verifiziert (macht der Aufrufer)
//     → 1. Produkt/Preis/Währung server-autoritativ validieren
//     → 2. Order sicherstellen  — orders(provider, provider_ref) UNIQUE ist die
//          autoritative Transaktions-Idempotenz; Claim-Schutz über user_id
//     → 3. Entitlements idempotent vergeben — entitlements(user_id, product_key)
//          UNIQUE ist die autoritative Access-Idempotenz
//     → 4. commerce_events NUR NOCH Audit/Tracing, best effort.
//          Ein Audit-Fehler darf einen verifizierten bezahlten Kauf NIEMALS
//          blockieren (der frühere event-log-first-Pfad hat live genau das
//          getan: Kunde hatte bezahlt, bekam aber keinen Zugang).
//
// CLAIM-SICHERHEIT (P0.1): Eine bereits verarbeitete Capture gehört dem User
// der bestehenden Order. Ein anderer authentifizierter User, der dieselbe
// Capture-ID einreicht, bekommt 409 payment_already_claimed und NIEMALS
// Entitlements. Ein Replay desselben Users stellt nur die ursprünglichen
// Entitlements derselben Transaktion wieder her — er kann weder Produkte
// hinzufügen noch Betrag/Währung ändern (409 order_conflict).
// ============================================================================

// Server-kanonischer Produktkatalog (P0.2): Der Client meldet nur Kaufabsicht
// (Produkt-IDs). Preis, Währung und Entitlements bestimmt ausschließlich der
// Server. Unbekannte IDs werden abgelehnt, nie still toleriert.
export const PRODUCTS = {
  "protokoll": { priceCents: 4900, currency: "EUR", entitlements: ["protocol", "twelve_week"] },
};

export function validateProducts(productIds, catalog = PRODUCTS) {
  if (!Array.isArray(productIds)) return { ok: false, status: 400, error: "bad_request" };
  const ids = [...new Set(productIds.filter((p) => typeof p === "string" && p))];
  if (!ids.length) return { ok: false, status: 400, error: "no_entitled_products" };
  const unknown = ids.filter((id) => !catalog[id]);
  if (unknown.length) return { ok: false, status: 400, error: "unknown_product", unknown };
  const expectedCents = ids.reduce((sum, id) => sum + catalog[id].priceCents, 0);
  const keys = [...new Set(ids.flatMap((id) => catalog[id].entitlements))].sort();
  return { ok: true, ids, keys, expectedCents, currency: "EUR" };
}

function res(status, body) {
  return { status, body };
}

function isUniqueViolation(err) {
  if (!err) return false;
  return String(err.code) === "23505" || /duplicate/i.test(String(err.message || ""));
}

function sameKeySet(a, b) {
  const sa = [...new Set(a || [])].sort();
  const sb = [...new Set(b || [])].sort();
  return sa.length === sb.length && sa.every((k, i) => k === sb[i]);
}

// Bestehende Order gegen den aktuellen Aufruf prüfen. null = Replay erlaubt.
function claimConflict(order, userId, v) {
  // Fremde ODER verwaiste Order (user_id null, z. B. nach Account-Löschung):
  // niemals einem anderen Account zuschreiben. Grundsatz: Entitlements gibt es
  // nur für eine Order, die nachweislich dem Aufrufer gehört.
  if (order.user_id !== userId) return res(409, { error: "payment_already_claimed" });
  // Replay darf nur die ursprüngliche Transaktion wiederherstellen:
  // gleicher Betrag, gleiche Währung, gleiche Produkte, Status paid.
  if (order.status !== "paid") return res(409, { error: "order_conflict", reason: "status" });
  if (order.total_cents !== v.expectedCents) return res(409, { error: "order_conflict", reason: "amount" });
  if ((order.currency || "EUR") !== v.currency) return res(409, { error: "order_conflict", reason: "currency" });
  if (!sameKeySet(order.product_keys, v.keys)) return res(409, { error: "order_conflict", reason: "products" });
  return null;
}

// ---------------------------------------------------------------------------
// fulfillVerifiedCapture — wird NUR mit einer bereits bei PayPal verifizierten
// Capture aufgerufen (Aufrufer hat Order/Capture direkt bei PayPal geladen).
//
// input: {
//   userId, email, orderNo, items,
//   capture: { id, status, amountCents, currency },   // aus PayPal-Antwort
//   productIds: string[]                              // Kaufabsicht des Clients
// }
// db (injiziert, alle async, Rückgabe { data?, error? }):
//   findOrderByProviderRef(provider, ref)
//   insertOrder(row)
//   upsertEntitlement(row)      // onConflict user_id,product_key
//   logEvent(row)               // Audit, best effort
// ---------------------------------------------------------------------------
export async function fulfillVerifiedCapture(input, db, catalog = PRODUCTS) {
  const { userId, email, orderNo, items, capture, productIds } = input || {};
  if (!userId) return res(401, { error: "auth_missing" });

  // 1) Server-autoritative Produkt-/Preis-/Währungsprüfung (P0.2)
  const v = validateProducts(productIds, catalog);
  if (!v.ok) return res(v.status, { error: v.error });
  if (!capture || !capture.id) return res(404, { error: "capture_not_found" });
  if (capture.status !== "COMPLETED") {
    return res(409, { error: "capture_incomplete", status: capture.status || "UNKNOWN" });
  }
  if ((capture.currency || "") !== v.currency) return res(409, { error: "currency_mismatch" });
  // Exakter Betrag für One-Time-Käufe: weder weniger noch mehr akzeptieren —
  // ein abweichender Betrag ist immer ein Fehler oder eine Manipulation.
  if (capture.amountCents !== v.expectedCents) return res(409, { error: "amount_mismatch" });

  const providerRef = String(capture.id);

  // 2) ORDER ZUERST — autoritative Transaktions-Idempotenz + Claim-Schutz
  let replay = false;
  const existing = await db.findOrderByProviderRef("paypal", providerRef);
  if (existing.error) return res(500, { error: "order_lookup_failed" });
  if (existing.data) {
    const conflict = claimConflict(existing.data, userId, v);
    if (conflict) return conflict;
    replay = true;
  } else {
    const ins = await db.insertOrder({
      user_id: userId,
      order_no: orderNo || ("PP-" + providerRef),
      email: email || null,
      items: Array.isArray(items) ? items : [],
      product_keys: v.keys,
      total_cents: capture.amountCents,
      currency: v.currency,
      pay_method: "paypal",
      status: "paid",
      provider: "paypal",
      provider_ref: providerRef,
      paid_at: new Date().toISOString(),
    });
    if (ins.error) {
      if (isUniqueViolation(ins.error)) {
        // Race: paralleler Aufruf hat die Order zuerst geschrieben. Der UNIQUE-
        // Index orders(provider, provider_ref) ist die Wahrheit — nachlesen
        // und dieselben Claim-Regeln anwenden wie beim normalen Replay.
        const again = await db.findOrderByProviderRef("paypal", providerRef);
        if (again.error || !again.data) return res(500, { error: "order_write_failed" });
        const conflict = claimConflict(again.data, userId, v);
        if (conflict) return conflict;
        replay = true;
      } else {
        return res(500, { error: "order_write_failed" });
      }
    }
  }

  // 3) ENTITLEMENTS — autoritative Access-Idempotenz (Upsert). Ein Fehler hier
  // ist ein echter Fehler (Kunde hat bezahlt, Zugang MUSS entstehen) — aber er
  // kommt NACH der Order, damit ein Retry/Replay sich selbst heilen kann.
  for (const key of v.keys) {
    const ue = await db.upsertEntitlement({
      user_id: userId, product_key: key, status: "active", source: "paypal",
    });
    if (ue.error) return res(500, { error: "entitlement_write_failed" });
  }

  // 4) AUDIT ZULETZT, BEST EFFORT — commerce_events ist Tracing, kein Gate.
  // Duplikat (Replay) ist normal; jeder andere Fehler wird gemeldet, aber der
  // verifizierte Kauf ist zu diesem Zeitpunkt bereits vollständig erfüllt.
  let auditLogged = true;
  try {
    const ev = await db.logEvent({
      provider: "paypal", event_id: providerRef,
      event_type: "capture.completed", order_no: orderNo || null,
    });
    if (ev && ev.error && !isUniqueViolation(ev.error)) auditLogged = false;
  } catch (_e) {
    auditLogged = false;
  }

  return res(200, {
    ok: true, replay, entitlements: v.keys,
    amount_cents: capture.amountCents, audit_logged: auditLogged,
  });
}
