// ============================================================================
// MaleMetrix P10/P0.9 — ECHTE Unit-Tests für den mm-commerce Fulfillment-Kern.
//
// Importiert supabase/functions/mm-commerce/fulfillment.mjs (dieselbe Datei,
// die die Edge Function ausführt) und ruft die Logik mit einer Fake-DB auf.
// Kein Regex auf Quelltext: Diese Tests beweisen Verhalten.
//
// Abgedeckt (P0.9): Audit blockiert nie, Order vor Audit, Entitlement vor
// Audit, Replay same-user, Claim durch Fremd-User, Betrag/Währung/Produkt-
// Validierung, Replay-Manipulation, Capture-Status, unauth, DB-Fehler, Races.
// ============================================================================
"use strict";

let PASS = 0, FAIL = 0;
function ok(cond, name, detail) {
  if (cond) { PASS++; console.log("  ✓ " + name); }
  else { FAIL++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
}
function group(title) { console.log("\n· " + title); }

// --- Fake-DB: zeichnet Aufrufreihenfolge auf, Verhalten pro Test steuerbar --
function makeDb(opts = {}) {
  const calls = [];
  const orders = opts.orders || [];       // vorhandene Orders (by provider_ref)
  return {
    calls, orders,
    findOrderByProviderRef: async (provider, ref) => {
      calls.push("findOrder");
      if (opts.lookupError) return { error: { message: "boom" } };
      const hit = orders.find((o) => o.provider === provider && o.provider_ref === ref);
      return { data: hit || null, error: null };
    },
    insertOrder: async (row) => {
      calls.push("insertOrder");
      if (opts.orderInsertError) return { error: opts.orderInsertError };
      orders.push({ provider: row.provider, provider_ref: row.provider_ref, ...row });
      return { error: null };
    },
    upsertEntitlement: async (row) => {
      calls.push("upsertEntitlement:" + row.product_key);
      if (opts.entitlementError) return { error: { message: "ent boom" } };
      return { error: null };
    },
    logEvent: async (_row) => {
      calls.push("logEvent");
      if (opts.auditThrows) throw new Error("audit down");
      if (opts.auditError) return { error: opts.auditError };
      return { error: null };
    },
  };
}

const CAP_OK = { id: "CAP-123", status: "COMPLETED", amountCents: 4900, currency: "EUR" };
const BASE = { userId: "user-a", email: "a@example.com", orderNo: null, items: [], productIds: ["protokoll"] };
const OWN_ORDER = {
  provider: "paypal", provider_ref: "CAP-123", user_id: "user-a",
  status: "paid", total_cents: 4900, currency: "EUR", product_keys: ["protocol", "twelve_week"],
};

(async () => {
  const { fulfillVerifiedCapture, validateProducts, PRODUCTS } =
    await import("../../supabase/functions/mm-commerce/fulfillment.mjs");

  group("Katalog server-autoritativ (P0.2)");
  ok(PRODUCTS.protokoll && PRODUCTS.protokoll.priceCents === 4900, "protokoll kostet serverseitig exakt 4900 Cent");
  ok(PRODUCTS.protokoll.currency === "EUR", "protokoll ist EUR");
  ok(JSON.stringify([...PRODUCTS.protokoll.entitlements].sort()) === JSON.stringify(["protocol", "twelve_week"]),
    "protokoll trägt genau protocol + twelve_week");
  {
    const v = validateProducts(["protokoll", "protokoll"]);
    ok(v.ok && v.expectedCents === 4900, "doppelte Produkt-IDs werden dedupliziert (kein 9800)");
  }
  {
    const v = validateProducts(["protokoll", "hax0r-product"]);
    ok(!v.ok && v.error === "unknown_product", "unbekannte Produkt-ID wird abgelehnt, nie still toleriert");
  }
  {
    const v = validateProducts([]);
    ok(!v.ok && v.error === "no_entitled_products", "leere Produktliste wird abgelehnt");
    const v2 = validateProducts("protokoll");
    ok(!v2.ok && v2.error === "bad_request", "Nicht-Array wird abgelehnt");
  }

  group("P0.9-1/2/3 — Audit ist NIE Gatekeeper, Order+Entitlement vor Audit");
  {
    const db = makeDb({ auditError: { code: "XX000", message: "db down" } });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 200 && r.body.ok === true, "commerce_events-Fehler blockiert den verifizierten Kauf NICHT");
    ok(r.body.audit_logged === false, "Audit-Fehler wird ehrlich als audit_logged:false gemeldet");
    ok(db.calls.includes("insertOrder"), "Order wurde trotz Audit-Fehler geschrieben");
    ok(db.calls.includes("upsertEntitlement:protocol") && db.calls.includes("upsertEntitlement:twelve_week"),
      "beide Entitlements wurden trotz Audit-Fehler vergeben");
    ok(db.calls.indexOf("insertOrder") < db.calls.indexOf("logEvent"), "Order wird VOR dem Audit finalisiert");
    ok(db.calls.indexOf("upsertEntitlement:protocol") < db.calls.indexOf("logEvent"),
      "Entitlement wird VOR dem Audit finalisiert");
  }
  {
    const db = makeDb({ auditThrows: true });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 200 && r.body.ok === true && r.body.audit_logged === false,
      "auch eine Audit-EXCEPTION blockiert den Kauf nicht");
  }
  {
    const db = makeDb({ auditError: { code: "23505", message: "duplicate key" } });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 200 && r.body.audit_logged === true, "Audit-Duplikat (Replay) gilt nicht als Audit-Fehler");
  }

  group("P0.9-4 — Replay: gleiche Capture + gleicher User");
  {
    const db = makeDb({ orders: [{ ...OWN_ORDER }] });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 200 && r.body.ok === true && r.body.replay === true, "Replay liefert ok + replay:true");
    ok(!db.calls.includes("insertOrder"), "Replay erzeugt KEINE zweite Order");
    ok(db.calls.filter((c) => c.startsWith("upsertEntitlement")).length === 2,
      "Replay stellt Entitlements idempotent sicher (Upsert, kein Duplikat möglich)");
  }

  group("P0.9-5 — Claim-Schutz: gleiche Capture + ANDERER User (P0.1)");
  {
    const db = makeDb({ orders: [{ ...OWN_ORDER }] });
    const r = await fulfillVerifiedCapture({ ...BASE, userId: "user-b", capture: CAP_OK }, db);
    ok(r.status === 409 && r.body.error === "payment_already_claimed",
      "fremde Capture → 409 payment_already_claimed");
    ok(!db.calls.some((c) => c.startsWith("upsertEntitlement")),
      "fremder User bekommt NIEMALS Entitlements");
    ok(!db.calls.includes("insertOrder"), "fremder User erzeugt keine zweite Order");
  }
  {
    const db = makeDb({ orders: [{ ...OWN_ORDER, user_id: null }] });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 409 && r.body.error === "payment_already_claimed",
      "verwaiste Order (user_id null) ist ebenfalls nicht claimbar");
  }

  group("P0.9-6/7/8 — Betrag, Währung, Produkt server-autoritativ");
  {
    const db = makeDb();
    const r = await fulfillVerifiedCapture({ ...BASE, capture: { ...CAP_OK, amountCents: 100 } }, db);
    ok(r.status === 409 && r.body.error === "amount_mismatch", "zu niedriger Betrag → reject");
    ok(db.calls.length === 0, "bei amount_mismatch wird NICHTS geschrieben");
  }
  {
    const db = makeDb();
    const r = await fulfillVerifiedCapture({ ...BASE, capture: { ...CAP_OK, amountCents: 9900 } }, db);
    ok(r.status === 409 && r.body.error === "amount_mismatch", "abweichend hoher Betrag → reject (exakter Preis)");
  }
  {
    const db = makeDb();
    const r = await fulfillVerifiedCapture({ ...BASE, capture: { ...CAP_OK, currency: "USD" } }, db);
    ok(r.status === 409 && r.body.error === "currency_mismatch", "falsche Währung → reject (EUR erzwungen)");
  }
  {
    const db = makeDb();
    const r = await fulfillVerifiedCapture({ ...BASE, productIds: ["mm-e2e-test"], capture: CAP_OK }, db);
    ok(r.status === 400 && r.body.error === "unknown_product", "entferntes Testprodukt ist serverseitig unbekannt");
  }

  group("P0.9-9 — Replay-Manipulation wird abgelehnt");
  {
    const db = makeDb({ orders: [{ ...OWN_ORDER, product_keys: ["protocol"] }] });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 409 && r.body.error === "order_conflict",
      "veränderte Product-Keys beim Replay → order_conflict");
    ok(!db.calls.some((c) => c.startsWith("upsertEntitlement")), "kein Entitlement bei Replay-Konflikt");
  }
  {
    const db = makeDb({ orders: [{ ...OWN_ORDER, total_cents: 100 }] });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 409 && r.body.error === "order_conflict", "abweichender Order-Betrag beim Replay → order_conflict");
  }
  {
    const db = makeDb({ orders: [{ ...OWN_ORDER, status: "refunded" }] });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 409 && r.body.error === "order_conflict", "refundete Order gibt beim Replay keinen Zugang mehr");
  }

  group("P0.9-10/11 — Capture-Status + Auth");
  {
    const db = makeDb();
    const r = await fulfillVerifiedCapture({ ...BASE, capture: { ...CAP_OK, status: "PENDING" } }, db);
    ok(r.status === 409 && r.body.error === "capture_incomplete", "Capture nicht COMPLETED → reject");
    ok(db.calls.length === 0, "keine Writes bei nicht-completed Capture");
  }
  {
    const db = makeDb();
    const r = await fulfillVerifiedCapture({ ...BASE, userId: null, capture: CAP_OK }, db);
    ok(r.status === 401 && r.body.error === "auth_missing", "ohne User → 401, keine Verarbeitung");
    ok(db.calls.length === 0, "keine Writes ohne Auth");
  }
  {
    const db = makeDb();
    const r = await fulfillVerifiedCapture({ ...BASE, capture: { status: "COMPLETED", amountCents: 4900, currency: "EUR" } }, db);
    ok(r.status === 404 && r.body.error === "capture_not_found", "Capture ohne ID → capture_not_found");
  }

  group("P0.9-14 — DB-Schreibfehler: ehrlicher Fehler, nie falscher Erfolg");
  {
    const db = makeDb({ orderInsertError: { code: "42501", message: "permission denied" } });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 500 && r.body.error === "order_write_failed", "Order-Write-Fehler → 500 order_write_failed");
    ok(!r.body.ok, "kein ok:true bei Order-Fehler");
  }
  {
    const db = makeDb({ entitlementError: true });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 500 && r.body.error === "entitlement_write_failed", "Entitlement-Fehler → 500, ehrlich gemeldet");
  }
  {
    const db = makeDb({ lookupError: true });
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 500 && r.body.error === "order_lookup_failed", "Order-Lookup-Fehler → 500, kein blinder Insert");
  }

  group("Race Conditions über UNIQUE(provider, provider_ref)");
  {
    // Insert kollidiert (paralleler Aufruf war schneller) → Refetch → eigene Order → Replay ok.
    let raced = false;
    const db = makeDb({ orderInsertError: { code: "23505", message: "duplicate key value violates unique constraint" } });
    const origFind = db.findOrderByProviderRef;
    db.findOrderByProviderRef = async (p, ref) => {
      if (raced) return { data: { ...OWN_ORDER }, error: null };
      raced = true;
      return await origFind(p, ref); // erster Lookup: noch keine Order
    };
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 200 && r.body.ok === true && r.body.replay === true,
      "Unique-Kollision + eigene Order → Replay-Selbstheilung");
  }
  {
    // Insert kollidiert, Refetch zeigt FREMDE Order → payment_already_claimed, kein Entitlement.
    let raced = false;
    const db = makeDb({ orderInsertError: { code: "23505", message: "duplicate key" } });
    const origFind = db.findOrderByProviderRef;
    db.findOrderByProviderRef = async (p, ref) => {
      if (raced) return { data: { ...OWN_ORDER, user_id: "user-x" }, error: null };
      raced = true;
      return await origFind(p, ref);
    };
    const r = await fulfillVerifiedCapture({ ...BASE, capture: CAP_OK }, db);
    ok(r.status === 409 && r.body.error === "payment_already_claimed",
      "Race gegen fremden Claim → 409, kein Zugriff");
    ok(!db.calls.some((c) => c.startsWith("upsertEntitlement")), "kein Entitlement im Race-Verlierer-Pfad");
  }

  console.log("\n==============================");
  console.log("PASS: " + PASS + "  FAIL: " + FAIL);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(1); });
