/* ==========================================================================
   MaleMetrix Checkout — Bestellablauf
   Bestellung per Vorkasse/Überweisung (sofort funktionsfähig) oder
   PayPal.me / Stripe-Link, sobald in config.js hinterlegt.
   ========================================================================== */

(function () {
  "use strict";

  const CFG = window.MM_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const wrap = document.getElementById("checkoutWrap");
  if (!wrap) return;

  /* ---------- Persistenter Pending-Payment-State --------------------------
     iOS Safari kann beim PayPal-Rücksprung die Seite neu laden — der JS-
     Kontext (und damit onApprove) geht verloren. Deshalb wird VOR der
     PayPal-Freigabe ein lokaler Zustand gespeichert (keine Secrets: nur
     PayPal-Order-ID, Produkt-IDs, interne Bestellnummer, Timestamp) und
     beim Laden der Seite eine Verifikations-Recovery gefahren. */
  const PENDING_KEY = "pending_payment";
  const PENDING_TTL_MS = 48 * 3600 * 1000;
  function getPending() {
    const p = MM.store.get(PENDING_KEY, null);
    if (!p || !p.ts || (Date.now() - p.ts) > PENDING_TTL_MS) return null;
    return p;
  }
  function savePending(p) { MM.store.set(PENDING_KEY, p); }
  function clearPending() { MM.store.set(PENDING_KEY, null); }

  /* MM.account.invokeFunction-Contract: { ok, data } bzw. { ok:false, code }.
     Der eigentliche Server-Erfolg steht in data.ok — hier zentral entpackt,
     damit Erfolg/Fehler/Entitlements/Betrag nie am falschen Feld gelesen werden. */
  function fnOk(r) { return !!(r && r.ok && r.data && r.data.ok); }
  function fnData(r) { return (r && r.data) || {}; }
  function fnCode(r) {
    if (!r) return "network";
    if (r.ok && r.data && !r.data.ok) return String(r.data.error || "unknown");
    return String(r.code || r.error || "unknown");
  }

  const bootParams = new URLSearchParams(location.search);

  /* Manuelle Recovery-URL: checkout.html?recover=<PayPal-Order- ODER
     Transaktions-/Capture-ID>. Für die Wiederherstellung einer Zahlung,
     deren lokaler State verloren ist (z. B. der 1-€-E2E-Test). Der Server
     verifiziert die ID direkt bei PayPal — ohne echte Zahlung passiert nichts. */
  try {
    const rec = bootParams.get("recover");
    if (rec && /^[A-Za-z0-9\-_]{8,40}$/.test(rec)) {
      savePending({ paypalOrderId: rec, productIds: ["mm-e2e-test"], orderNo: null, ts: Date.now(), manual: true });
    }
  } catch (e) {}

  /* ---------- Interner E2E-Testpfad (bewusst aufrufbar, nicht verlinkt) ----
     checkout.html?e2e=mm1 setzt den Warenkorb auf GENAU das versteckte
     1,00-€-Testprodukt — aber NUR, wenn keine unabgeschlossene Zahlung
     aussteht (sonst würde der Rücksprung von PayPal den Zustand zerstören). */
  try {
    if (bootParams.get("e2e") === "mm1" && !getPending()) {
      MM.store.set("cart", [{ id: "mm-e2e-test", qty: 1 }]);
    }
  } catch (e) {}

  /* ---------- Automatische Code-Auslieferung nach bestätigter Zahlung ------
     Die Zugangscodes liegen AES-verschlüsselt vor und werden erst nach einem
     erfolgreichen PayPal-Capture entschlüsselt und angezeigt. Bei Vorkasse
     (Zahlung nicht sofort bestätigbar) kommt der Code nach Zahlungseingang
     per E-Mail. Payload neu erzeugen: node tools-dev/vault.mjs encrypt ... */
  const DELIVERY_VAULT = {"v":1,"iter":150000,"salt":"0hirgaoETrAqNs5bo9600Q==","iv":"1bvizyOGoFjxO76B","ct":"fQNCYtGwCYPIHjdGlC+fewdbZu3YjpK2uZsL9YH+egROX1/6Mpke1OTfYYTchBeLC240"};
  const DK = ["MMD-", "A3DFF4F6", "159A8C28", "8578F44B"];
  async function deliveryCodes() {
    try {
      if (!(window.MM && MM.vault)) return null;
      return JSON.parse(await MM.vault.openRaw(DELIVERY_VAULT, DK.join("")));
    } catch (e) { return null; }
  }

  function items() {
    return MM.cart.items().map(i => ({ ...i, p: MM.cart.product(i.id) })).filter(i => i.p);
  }

  function renderSummary() {
    const list = items();
    const t = MM.cart.totals();
    const box = $("#summaryItems");
    if (!list.length) return;
    box.innerHTML = list.map(i =>
      '<div class="summary-line"><span>' + i.p.emoji + " " + i.p.name + ' <span class="muted">× ' + i.qty + '</span></span>' +
      '<span class="mono">' + MM.eur(i.p.price * i.qty) + '</span></div>'
    ).join("") +
      '<div class="summary-line"><span>Versand</span><span class="mono">' +
      (t.hasPhysical ? (t.ship === 0 ? "kostenlos" : MM.eur(t.ship)) : "entfällt") + '</span></div>' +
      '<div class="summary-line grand"><span>Gesamt</span><span class="mono">' + MM.eur(t.total) + '</span></div>';
  }

  /* P0 (Phase 8): Bank-Daten dürfen nie als "[IBAN EINTRAGEN]"-Platzhalter beim
     Kunden ankommen. Vorkasse wird nur angeboten, wenn echte Daten hinterlegt
     sind — sonst ehrlich: Zahlungsdetails kommen per E-Mail. */
  function bankConfigured() {
    const b = CFG.bank || {};
    const bad = (s) => !s || /\[.*EINTRAGEN.*\]/i.test(String(s));
    return !bad(b.iban) && !bad(b.inhaber);
  }

  function renderForm() {
    const t = MM.cart.totals();

    if (!t.count) {
      wrap.innerHTML = '<div class="order-success"><div class="success-icon">🛒</div>' +
        '<h1 class="h-section" style="margin-bottom:14px">Dein Warenkorb ist leer.</h1>' +
        '<p class="muted" style="margin-bottom:28px">Schau dich im Shop um — Test-Kits, Tracking-Zubehör und Reports warten.</p>' +
        '<a href="shop.html" class="btn btn-primary">Zum Shop</a></div>';
      return;
    }

    if (MM.track) MM.track("checkout_started", { value: t.total });
    const needsAddress = t.hasPhysical;
    const payOptions = [];
    payOptions.push({
      id: "vorkasse", name: "Vorkasse / Überweisung",
      desc: bankConfigured()
        ? "Du erhältst die Bankverbindung direkt nach der Bestellung. Versand bzw. Lieferung nach Zahlungseingang."
        : "Du erhältst die Bankverbindung per E-Mail an deine angegebene Adresse. Lieferung nach Zahlungseingang."
    });
    if (CFG.paypalClientId) {
      payOptions.push({ id: "paypal_smart", name: "PayPal / Kreditkarte", desc: "Sicher mit PayPal, Kredit- oder Debitkarte zahlen — ohne die Seite zu verlassen." });
    } else if (CFG.paypalMe) {
      payOptions.push({ id: "paypal", name: "PayPal", desc: "Bezahle direkt nach der Bestellung per PayPal-Link." });
    }

    document.getElementById("checkoutForm").innerHTML =
      '<h2 class="h-card" style="margin-bottom:20px">Kontakt</h2>' +
      '<div class="form-row">' +
      '<div class="field"><label for="coFirst">Vorname *</label><input type="text" id="coFirst" autocomplete="given-name" required></div>' +
      '<div class="field"><label for="coLast">Nachname *</label><input type="text" id="coLast" autocomplete="family-name" required></div></div>' +
      '<div class="field"><label for="coEmail">E-Mail *</label><input type="email" id="coEmail" autocomplete="email" required>' +
      '<span class="hint">Für Bestellbestätigung' + (t.hasPhysical ? " &amp; Versandinfos" : " &amp; Lieferung deiner digitalen Produkte") + '.</span></div>' +

      (needsAddress ?
        '<h2 class="h-card" style="margin:30px 0 20px">Lieferadresse</h2>' +
        '<div class="field"><label for="coStreet">Straße &amp; Hausnummer *</label><input type="text" id="coStreet" autocomplete="street-address" required></div>' +
        '<div class="form-row">' +
        '<div class="field"><label for="coZip">PLZ *</label><input type="text" id="coZip" autocomplete="postal-code" required></div>' +
        '<div class="field"><label for="coCity">Ort *</label><input type="text" id="coCity" autocomplete="address-level2" required></div></div>'
        : '') +

      '<h2 class="h-card" style="margin:30px 0 20px">Zahlungsart</h2>' +
      payOptions.map((p, i) =>
        '<label class="pay-option' + (i === 0 ? ' selected' : '') + '">' +
        '<input type="radio" name="payMethod" value="' + p.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<div><div class="pay-name">' + p.name + '</div><div class="pay-desc">' + p.desc + '</div></div></label>'
      ).join("") +

      '<div style="display:grid;gap:12px;margin:28px 0">' +
      '<label class="checkbox-row"><input type="checkbox" id="coAgb" required><span>Ich akzeptiere die <a href="agb.html" target="_blank" style="text-decoration:underline">AGB</a> und habe die <a href="agb.html#widerruf" target="_blank" style="text-decoration:underline">Widerrufsbelehrung</a> sowie die <a href="datenschutz.html" target="_blank" style="text-decoration:underline">Datenschutzerklärung</a> zur Kenntnis genommen. *</span></label>' +
      (items().some(i => i.p.digital) ?
        '<label class="checkbox-row"><input type="checkbox" id="coDigital"><span>Digitale Inhalte: Ich stimme zu, dass mit der Lieferung vor Ablauf der Widerrufsfrist begonnen wird, und weiß, dass mein Widerrufsrecht damit erlischt.</span></label>' : '') +
      '</div>' +

      '<div id="payAction"></div>' +
      '<p class="small" style="color:var(--muted-2);margin-top:14px;text-align:center">Kein Abo, keine versteckten Kosten. Du erhältst sofort deine Bestellübersicht.</p>';

    /* Zahlart-Auswahl stylen + Action umschalten */
    document.querySelectorAll(".pay-option input").forEach(r => {
      r.addEventListener("change", () => {
        document.querySelectorAll(".pay-option").forEach(o => o.classList.remove("selected"));
        r.closest(".pay-option").classList.add("selected");
        renderPayAction();
      });
    });
    document.querySelectorAll(".checkbox-row input").forEach(c => {
      c.addEventListener("change", () => c.closest(".checkbox-row").classList.toggle("checked", c.checked));
    });

    renderPayAction();
    renderSummary();
  }

  function selectedMethod() {
    return (document.querySelector("input[name=payMethod]:checked") || {}).value || "vorkasse";
  }

  function renderPayAction() {
    const box = document.getElementById("payAction");
    if (!box) return;
    const t = MM.cart.totals();
    const method = selectedMethod();
    if (method === "paypal_smart") {
      const sandbox = CFG.paypalClientId === "sb";
      box.innerHTML = (sandbox ? '<div class="alert alert-warn" style="margin-bottom:14px;padding:12px 16px"><span class="alert-icon">🧪</span><div><strong>PayPal-Testmodus</strong> — der Button funktioniert, es fließt aber kein echtes Geld. Vor dem Livegang in <code>js/config.js</code> die echte Client-ID eintragen.</div></div>' : '') +
        '<div id="paypalBtns" style="margin-top:4px"></div>' +
        '<p class="small" style="color:var(--muted-2);margin-top:10px;text-align:center">Bitte Felder oben ausfüllen und AGB bestätigen, dann auf den PayPal-Button tippen.</p>';
      mountPayPal(t);
    } else {
      box.innerHTML = '<button class="btn btn-primary btn-lg btn-block" id="coSubmit">Zahlungspflichtig bestellen — ' + MM.eur(t.total) + '</button>';
      document.getElementById("coSubmit").addEventListener("click", submit);
    }
  }

  /* ---------- PayPal Smart Buttons (clientseitig) ---------- */
  let paypalLoaded = false;
  function loadPayPalSDK(cb) {
    if (paypalLoaded && window.paypal) { cb(); return; }
    if (document.getElementById("paypalSDK")) { document.getElementById("paypalSDK").addEventListener("load", cb); return; }
    const s = document.createElement("script");
    s.id = "paypalSDK";
    s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(CFG.paypalClientId) +
      "&currency=" + (CFG.paypalCurrency || "EUR") + "&intent=capture";
    s.onload = () => { paypalLoaded = true; cb(); };
    s.onerror = () => MM.toast("PayPal konnte nicht geladen werden");
    document.head.appendChild(s);
  }

  function mountPayPal(t) {
    loadPayPalSDK(() => {
      const host = document.getElementById("paypalBtns");
      if (!host || !window.paypal) return;
      host.innerHTML = "";
      window.paypal.Buttons({
        style: { layout: "vertical", color: "blue", shape: "pill", label: "paypal" },
        onClick: (data, actions) => {
          if (!validateForm()) { MM.toast("Bitte Felder & AGB prüfen"); return actions.reject(); }
          return actions.resolve();
        },
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{
            amount: { value: t.total.toFixed(2), currency_code: CFG.paypalCurrency || "EUR" },
            description: "MaleMetrix Bestellung"
          }]
        }).then((ppOrderId) => {
          // Pending-State VOR der PayPal-Freigabe sichern — überlebt den
          // iOS-Safari-Rücksprung/Reload. Keine Secrets, nur Referenzen.
          const list = items();
          savePending({
            paypalOrderId: ppOrderId,
            productIds: list.map(i => i.p.id),
            orderNo: null, ts: Date.now()
          });
          return ppOrderId;
        }),
        onApprove: (data, actions) => actions.order.capture().then((details) => {
          const order = buildOrder("PayPal (bezahlt)");
          order.paid = true;
          // Capture-ID zusätzlich in den Pending-State (präziseste Referenz).
          try {
            const capId = (((details.purchase_units || [])[0] || {}).payments || {}).captures?.[0]?.id || "";
            const pd = getPending() || { ts: Date.now() };
            pd.paypalOrderId = data.orderID; pd.captureId = capId; pd.orderNo = order.no;
            savePending(pd);
          } catch (e) {}
          // Phase 8 (§12): Serverseitige Verifikation + Entitlement-Vergabe, wenn
          // Cloud-Konto aktiv. Der Server prüft die Zahlung DIREKT bei PayPal —
          // der Client vergibt nie selbst Zugriff. Bei Verifikationsfehler wird
          // KEINE Erfolgsseite vorgetäuscht: der Pending-State bleibt und die
          // Recovery-Ansicht übernimmt (nie doppelt zahlen).
          if (window.MM && MM.account && MM.account.invokeFunction && MM.account.getCurrentUser && MM.account.getCurrentUser()) {
            MM.account.invokeFunction("mm-commerce", {
              action: "verify_paypal", paypalOrderId: data.orderID, orderNo: order.no,
              productIds: order.productIds, items: order.items
            }).then((r) => {
              if (fnOk(r)) {
                clearPending();
                MM.account.loadAccountState().then(() => {});
                finalizeOrder(order, { paypalPaid: true, serverGrant: true });
              } else {
                renderVerifyIssue(fnCode(r));
              }
            }).catch(() => renderVerifyIssue("network"));
          } else {
            // Legacy-Weg ohne Cloud-Konto (dokumentiert): Vault-Code nach Capture.
            clearPending();
            finalizeOrder(order, { paypalPaid: true });
          }
        }),
        onError: () => MM.toast("PayPal-Zahlung fehlgeschlagen — versuche es erneut oder nutze Vorkasse.")
      }).render("#paypalBtns");
    });
  }

  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

  function validateForm() {
    const t = MM.cart.totals();
    const needsAddress = t.hasPhysical;
    let ok = true;
    const required = ["coFirst", "coLast", "coEmail"].concat(needsAddress ? ["coStreet", "coZip", "coCity"] : []);
    required.forEach(id => {
      const el = document.getElementById(id);
      const bad = !el.value.trim() || (id === "coEmail" && !el.value.includes("@"));
      el.classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    if (!$("#coAgb").checked) return false;
    return ok;
  }

  function buildOrder(payMethod) {
    const t = MM.cart.totals();
    const list = items();
    const needsAddress = t.hasPhysical;
    const now = new Date();
    const seq = (MM.store.get("order_seq", 100) || 100) + 1;
    MM.store.set("order_seq", seq);
    const orderNo = "MM-" + now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + "-" + seq;
    return {
      no: orderNo,
      date: now.toISOString(),
      name: val("coFirst") + " " + val("coLast"),
      email: val("coEmail"),
      address: needsAddress ? (val("coStreet") + ", " + val("coZip") + " " + val("coCity")) : "— (nur digitale Produkte)",
      items: list.map(i => i.qty + "× " + i.p.name + " (" + MM.eur(i.p.price) + ")"),
      productIds: list.map(i => i.p.id),
      shipping: t.hasPhysical ? MM.eur(t.ship) : "entfällt",
      total: MM.eur(t.total),
      payMethod
    };
  }

  async function finalizeOrder(order, opts) {
    opts = opts || {};
    const orders = MM.store.get("orders", []);
    orders.push(order);
    MM.store.set("orders", orders);
    if (MM.track) MM.track("order_completed", { value: order.total, paid: !!opts.paypalPaid, method: order.payMethod });

    const res = await MM.sendForm((opts.paypalPaid ? "✅ Bezahlte Bestellung " : "🛒 Neue Bestellung ") + order.no + " — " + order.total, {
      Typ: "Bestellung",
      Bestellnummer: order.no,
      Name: order.name,
      "E-Mail": order.email,
      Adresse: order.address,
      Artikel: order.items.join(" | "),
      Versand: order.shipping,
      Gesamt: order.total,
      Zahlungsart: order.payMethod,
      Status: opts.paypalPaid ? "BEZAHLT (PayPal)" : "offen"
    });

    MM.cart.clear();
    // Phase 9 (§5): Wenn der Server das Entitlement bereits vergeben hat
    // (serverGrant), wird der Client-Vault NICHT mehr entschlüsselt — der
    // Zugang kommt aus dem Konto (resolveProductAccess). Das ist der Pfad, der
    // den exponierten Client-Schlüssel im Produktivbetrieb tot legt. Nur ohne
    // Cloud fällt die Auslieferung auf den (dokumentiert schwächeren) Vault
    // zurück, damit bestehende Abläufe nicht brechen.
    const codes = (opts.paypalPaid && !opts.serverGrant) ? await deliveryCodes() : null;
    renderSuccess(order, res.viaMailto, opts.paypalPaid, codes, !!opts.serverGrant);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!validateForm()) { MM.toast("Bitte prüfe die markierten Felder & bestätige die AGB"); return; }
    const btn = $("#coSubmit");
    if (btn) { btn.disabled = true; btn.textContent = "Bestellung wird übermittelt…"; }
    const order = buildOrder(selectedMethod() === "paypal" ? "PayPal" : "Vorkasse / Überweisung");
    await finalizeOrder(order);
  }

  function renderSuccess(order, viaMailto, paypalPaid, codes, serverGrant) {
    const bank = CFG.bank || {};
    // Server-Grant: Zugang liegt im Konto — kein Client-Code, kein Vault.
    if (serverGrant) {
      const hasCourse = (order.productIds || []).some(id => id === "protokoll" || id === "kurs-12w");
      var accountBlock = '<div class="card" style="text-align:left;margin-bottom:24px;border-color:var(--accent-line)">' +
        '<span class="card-num" style="color:var(--green)">✓ ZUGANG IM KONTO FREIGESCHALTET</span>' +
        '<p class="muted" style="margin:6px 0 14px">Deine Zahlung ist bestätigt und dein Zugang ist serverseitig deinem Konto zugeordnet — kein Code nötig, auf allen deinen Geräten verfügbar.</p>' +
        (hasCourse ? '<a class="btn btn-primary btn-block" href="mein-protokoll.html">My MaleMetrix öffnen →</a>' : '') + '</div>';
    }
    const isPaypalMe = order.payMethod === "PayPal" && CFG.paypalMe && !paypalPaid;
    const amountRaw = order.total.replace(/[^\d,]/g, "").replace(",", ".");

    /* 12-Wochen-Programm: Zugang nach Kauf.
       Bei Server-Grant zeigt der Konto-Block oben den Zugang; die Code-Blöcke
       entfallen dann komplett (kein Client-Code mehr). */
    let courseBlock = serverGrant ? (accountBlock || "") : "";
    if (!serverGrant && (order.productIds || []).indexOf("kurs-12w") !== -1) {
      const code = (codes && codes.protokoll) || "";
      if (paypalPaid && code) {
        const link = "kurs-programm.html?code=" + encodeURIComponent(code);
        courseBlock = '<div class="card" style="text-align:left;margin-bottom:24px;border-color:var(--accent-line)">' +
          '<span class="card-num" style="color:var(--accent)">🎓 DEIN PROGRAMM-ZUGANG</span>' +
          '<p class="muted" style="margin:6px 0 14px">Dein 12-Wochen-Programm ist freigeschaltet. Dein Zugangscode:</p>' +
          '<div style="font-family:monospace;font-size:1.5rem;font-weight:700;letter-spacing:2px;color:var(--text);background:var(--card-2);border:1px solid var(--line);border-radius:10px;padding:14px;text-align:center;margin-bottom:16px">' + code + '</div>' +
          '<a class="btn btn-primary btn-block" href="' + link + '">Programm jetzt starten →</a>' +
          '<p class="small" style="color:var(--muted-2);margin-top:12px">Tipp: Speichere diesen Code. Du gibst ihn einmalig auf der Programmseite ein, danach bleibt der Zugang auf deinem Gerät.</p></div>';
      } else {
        courseBlock = '<div class="card" style="text-align:left;margin-bottom:24px">' +
          '<span class="card-num">🎓 DEIN PROGRAMM-ZUGANG</span>' +
          '<p class="muted" style="margin-top:6px">Sobald deine Zahlung eingegangen ist, erhältst du per E-Mail deinen persönlichen Zugangscode für das 12-Wochen-Programm — in der Regel innerhalb von 24 Stunden. Damit schaltest du das Programm auf der Programmseite frei.</p></div>';
      }
    }

    /* DAS PROTOKOLL: Sofort-Zugang nach Kauf */
    if ((order.productIds || []).indexOf("protokoll") !== -1) {
      const pcode = (codes && codes.protokoll) || "";
      if (paypalPaid && pcode) {
        const plink = "ebooks/protokoll.html?code=" + encodeURIComponent(pcode);
        courseBlock += '<div class="card" style="text-align:left;margin-bottom:24px;border-color:var(--accent-line)">' +
          '<span class="card-num" style="color:var(--accent)">📕 DEIN PROTOKOLL-ZUGANG</span>' +
          '<p class="muted" style="margin:6px 0 14px">Dein Premium-Ebook „DAS PROTOKOLL" ist freigeschaltet. Dein Zugangscode:</p>' +
          '<div style="font-family:monospace;font-size:1.5rem;font-weight:700;letter-spacing:2px;color:var(--text);background:var(--card-2);border:1px solid var(--line);border-radius:10px;padding:14px;text-align:center;margin-bottom:16px">' + pcode + '</div>' +
          '<a class="btn btn-primary btn-block" href="' + plink + '">Jetzt lesen →</a>' +
          '<a class="btn btn-dark btn-block" style="margin-top:10px" href="kurs-programm.html?code=' + encodeURIComponent(pcode) + '">🎓 Inklusive: interaktives 12-Wochen-Programm starten →</a>' +
          '<p class="small" style="color:var(--muted-2);margin-top:12px">Tipp: Speichere den Code. Er schaltet Ebook UND Programm frei — einmalig eingeben, danach bleibt der Zugang auf deinem Gerät.</p></div>';
      } else {
        courseBlock += '<div class="card" style="text-align:left;margin-bottom:24px">' +
          '<span class="card-num">📕 DEIN PROTOKOLL-ZUGANG</span>' +
          '<p class="muted" style="margin-top:6px">Sobald deine Zahlung eingegangen ist, erhältst du per E-Mail deinen Zugangscode für „DAS PROTOKOLL" — in der Regel innerhalb von 24 Stunden. Der Code schaltet auch das enthaltene interaktive 12-Wochen-Programm frei.</p></div>';
      }
    }

    let payBlock;
    if (paypalPaid) {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px;border-color:var(--accent-line)">' +
        '<span class="card-num" style="color:var(--green)">✓ ZAHLUNG ERHALTEN</span>' +
        '<p class="muted" style="margin-top:6px">Deine Zahlung über <strong style="color:var(--text)">' + order.total + '</strong> ist per PayPal eingegangen. Wir kümmern uns sofort um deine Bestellung — du musst nichts weiter tun.</p></div>';
    } else if (isPaypalMe) {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px"><span class="card-num">SO ZAHLST DU PER PAYPAL</span>' +
        '<p class="muted" style="margin-bottom:18px">Klicke auf den Button und zahle <strong style="color:var(--text)">' + order.total + '</strong>. Gib als Verwendungszweck deine Bestellnummer an: <strong style="color:var(--text)">' + order.no + '</strong></p>' +
        '<a class="btn btn-primary" href="' + CFG.paypalMe + "/" + amountRaw + '" target="_blank" rel="noopener">Mit PayPal zahlen — ' + order.total + '</a></div>';
    } else if (bankConfigured()) {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px"><span class="card-num">SO ZAHLST DU PER ÜBERWEISUNG</span>' +
        '<div style="display:grid;gap:10px;font-size:0.95rem">' +
        '<div class="summary-line"><span>Empfänger</span><span class="mono">' + (bank.inhaber || "—") + '</span></div>' +
        '<div class="summary-line"><span>IBAN</span><span class="mono">' + (bank.iban || "—") + '</span></div>' +
        '<div class="summary-line"><span>Bank</span><span class="mono">' + (bank.bank || "—") + '</span></div>' +
        '<div class="summary-line"><span>Betrag</span><span class="mono">' + order.total + '</span></div>' +
        '<div class="summary-line"><span>Verwendungszweck</span><span class="mono">' + order.no + '</span></div>' +
        '</div></div>';
    } else {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px"><span class="card-num">SO GEHT ES WEITER</span>' +
        '<p class="muted" style="margin-top:6px">Du erhältst die Bankverbindung für deine Überweisung über <strong style="color:var(--text)">' + order.total + '</strong> per E-Mail an <strong style="color:var(--text)">' + order.email + '</strong>. Verwendungszweck: <strong style="color:var(--text)">' + order.no + '</strong>.</p></div>';
    }

    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon">✓</div>' +
      '<span class="eyebrow" style="justify-content:center">Bestellung ' + order.no + '</span>' +
      '<h1 class="h-section" style="margin-bottom:14px">Danke, ' + order.name.split(" ")[0] + '!</h1>' +
      '<p class="muted" style="margin-bottom:8px">Deine Bestellung ist eingegangen' + (viaMailto ? " — bitte sende die geöffnete E-Mail noch ab, damit sie uns erreicht" : "") + '.</p>' +
      '<p class="muted" style="margin-bottom:28px">Bestellbestätigung &amp; Details gehen an <strong style="color:var(--text)">' + order.email + '</strong>.</p>' +
      courseBlock +
      payBlock +

      '<div class="card" style="text-align:left;margin-bottom:28px"><span class="card-num">DEINE BESTELLUNG</span>' +
      order.items.map(i => '<div class="summary-line"><span>' + i + '</span></div>').join("") +
      '<div class="summary-line"><span>Versand</span><span class="mono">' + order.shipping + '</span></div>' +
      '<div class="summary-line grand"><span>Gesamt</span><span class="mono">' + order.total + '</span></div></div>' +

      '<p class="small" style="color:var(--muted-2);margin-bottom:24px">Physische Produkte versenden wir innerhalb von 2–4 Werktagen nach Zahlungseingang. Digitale Produkte erhältst du per E-Mail innerhalb von 48 Stunden nach Zahlungseingang.</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn btn-dark" onclick="window.print()">Bestellung drucken</button>' +
      '<a href="index.html" class="btn btn-ghost">Zur Startseite</a></div></div>';
  }

  /* ---------- Recovery: Verifikation nach Reload/Kontextverlust ----------- */
  const VERIFY_MSG = {
    not_signed_in: "Du bist nicht (mehr) eingeloggt. Bitte melde dich in My MaleMetrix an und prüfe die Zahlung dann erneut — NICHT erneut bezahlen.",
    auth_missing: "Deine Anmeldung wurde nicht mitgesendet. Bitte in My MaleMetrix neu einloggen und erneut prüfen — NICHT erneut bezahlen.",
    auth_invalid_token: "Deine Sitzung ist abgelaufen oder ungültig. Bitte in My MaleMetrix neu einloggen und erneut prüfen — NICHT erneut bezahlen.",
    auth_validation_failed: "Deine Anmeldung konnte serverseitig nicht geprüft werden. Bitte neu einloggen und erneut prüfen — NICHT erneut bezahlen.",
    unauthorized: "Deine Anmeldung wurde serverseitig nicht erkannt. Bitte in My MaleMetrix neu einloggen und erneut prüfen — NICHT erneut bezahlen.",
    unreachable: "Der Verifikations-Server ist gerade nicht erreichbar. Bitte in einigen Minuten erneut prüfen — deine Zahlung ist sicher, NICHT erneut bezahlen.",
    no_cloud: "Kein Cloud-Konto aktiv. Bitte in My MaleMetrix einloggen und erneut prüfen — NICHT erneut bezahlen.",
    order_not_found: "Zu dieser Referenz wurde bei PayPal keine Zahlung gefunden. Bitte Transaktions-ID prüfen — NICHT erneut bezahlen.",
    capture_not_found: "Zu dieser Referenz wurde bei PayPal keine Zahlung gefunden. Bitte Transaktions-ID prüfen — NICHT erneut bezahlen.",
    not_captured: "Die PayPal-Zahlung ist noch nicht abgeschlossen. Bitte in Kürze erneut prüfen — NICHT erneut bezahlen.",
    capture_incomplete: "Die PayPal-Zahlung ist noch nicht abgeschlossen. Bitte in Kürze erneut prüfen — NICHT erneut bezahlen.",
    amount_mismatch: "Der bei PayPal verifizierte Betrag passt nicht zur Bestellung. Bitte melde dich — NICHT erneut bezahlen.",
    paypal_auth_failed: "Server-Konfigurationsproblem bei der Zahlungsprüfung. Bitte melde dich — NICHT erneut bezahlen.",
    paypal_lookup_failed: "PayPal war bei der Prüfung kurz nicht erreichbar. Bitte in einigen Minuten erneut prüfen — NICHT erneut bezahlen.",
    provider_not_configured: "Die Zahlungsprüfung ist serverseitig noch nicht aktiv. Bitte melde dich — NICHT erneut bezahlen.",
    order_write_failed: "Die Zahlung ist bestätigt, aber die Bestellung konnte nicht gespeichert werden. Bitte erneut prüfen — NICHT erneut bezahlen.",
    entitlement_write_failed: "Die Zahlung ist bestätigt, aber die Freischaltung konnte nicht gespeichert werden. Bitte erneut prüfen — NICHT erneut bezahlen.",
    event_log_failed: "Die Zahlung ist bestätigt, es gab aber ein Speicherproblem. Bitte erneut prüfen — NICHT erneut bezahlen."
  };
  function renderVerifyIssue(errCode) {
    const hint = VERIFY_MSG[errCode] ||
      "Deine Zahlung wurde möglicherweise bereits ausgeführt. Bitte NICHT erneut bezahlen — prüfe die Zahlung einfach noch einmal.";
    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon" style="background:rgba(245,166,35,.12);color:#f5a623">!</div>' +
      '<h1 class="h-section" style="margin-bottom:14px">Zahlung wird geprüft — nicht erneut bezahlen.</h1>' +
      '<p class="muted" style="max-width:56ch;margin:0 auto 10px">' + hint + '</p>' +
      (errCode && errCode !== "not_signed_in" ? '<p class="small" style="color:var(--muted-2);margin-bottom:18px">Technischer Status: ' + String(errCode).replace(/[<>]/g, "") + '</p>' : '<div style="margin-bottom:18px"></div>') +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn btn-primary" id="retryVerify">Zahlung erneut prüfen</button>' +
      (["not_signed_in", "unauthorized", "no_cloud", "auth_missing", "auth_invalid_token", "auth_validation_failed"].indexOf(errCode) >= 0 ? '<a class="btn btn-dark" href="mein-protokoll.html">Zu My MaleMetrix (Login)</a>' : '') +
      '</div>' +
      '<p class="small" style="color:var(--muted-2);margin-top:22px">Der Prüf-Button löst KEINE neue Zahlung aus — er fragt nur den Status deiner bestehenden PayPal-Zahlung ab.</p>' +
      '</div>';
    const btn = document.getElementById("retryVerify");
    if (btn) btn.addEventListener("click", () => { const p = getPending(); if (p) runRecovery(p); else location.reload(); });
  }

  function renderRecoverySuccess(pending, data) {
    MM.cart.clear();
    if (MM.track) MM.track("order_completed", { value: "recovered", paid: true, method: "PayPal (recovery)" });
    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon">✓</div>' +
      (pending.orderNo ? '<span class="eyebrow" style="justify-content:center">Bestellung ' + pending.orderNo + '</span>' : '') +
      '<h1 class="h-section" style="margin-bottom:14px">Zahlung bestätigt.</h1>' +
      '<div class="card" style="text-align:left;margin:0 auto 16px;max-width:560px;border-color:var(--accent-line)">' +
      '<span class="card-num" style="color:var(--green)">✓ ZAHLUNG ERHALTEN</span>' +
      '<p class="muted" style="margin-top:6px">Deine PayPal-Zahlung ist serverseitig verifiziert' + (data && data.amount_cents ? " (" + MM.eur(data.amount_cents / 100) + ")" : "") + (data && data.replay ? " — war bereits verarbeitet, kein doppelter Zugriff vergeben" : "") + '.</p></div>' +
      '<div class="card" style="text-align:left;margin:0 auto 24px;max-width:560px;border-color:var(--accent-line)">' +
      '<span class="card-num" style="color:var(--green)">✓ ZUGANG IM KONTO FREIGESCHALTET</span>' +
      '<p class="muted" style="margin:6px 0 0">Freigeschaltet: <strong style="color:var(--text)">' + ((data && data.entitlements) || []).join(", ") + '</strong> — deinem Konto zugeordnet, auf allen Geräten verfügbar.</p></div>' +
      '<a href="mein-protokoll.html" class="btn btn-primary">My MaleMetrix öffnen →</a>' +
      '</div>';
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function runRecovery(pending) {
    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon" style="background:var(--accent-soft);color:var(--accent-2)">…</div>' +
      '<h1 class="h-section" style="margin-bottom:10px">Zahlung wird bestätigt …</h1>' +
      '<p class="muted">Wir prüfen deine PayPal-Zahlung serverseitig. Bitte NICHT erneut bezahlen und das Fenster kurz offen lassen.</p></div>';
    const signedIn = window.MM && MM.account && MM.account.getCurrentUser && MM.account.getCurrentUser();
    const call = () => MM.account.invokeFunction("mm-commerce", {
      action: "verify_paypal",
      paypalOrderId: pending.captureId || pending.paypalOrderId,
      orderNo: pending.orderNo || null,
      productIds: pending.productIds || [],
      items: []
    }).then((r) => {
      if (fnOk(r)) {
        clearPending();
        MM.account.loadAccountState().then(() => {});
        renderRecoverySuccess(pending, fnData(r));
      } else {
        renderVerifyIssue(fnCode(r));
      }
    }).catch(() => renderVerifyIssue("network"));
    if (!signedIn) {
      // Konto-Init abwarten (account.js lädt asynchron), dann entscheiden.
      if (window.MM && MM.account && MM.account.whenReady) {
        MM.account.whenReady().then(() => {
          if (MM.account.getCurrentUser && MM.account.getCurrentUser()) call();
          else renderVerifyIssue("not_signed_in");
        }).catch(() => renderVerifyIssue("not_signed_in"));
      } else {
        renderVerifyIssue("not_signed_in");
      }
      return;
    }
    call();
  }

  /* ---------- Boot: ausstehende Zahlung hat Vorrang vor neuem Checkout ---- */
  const bootPending = getPending();
  if (bootPending && (bootPending.paypalOrderId || bootPending.captureId)) {
    runRecovery(bootPending);
  } else {
    renderForm();
  }
})();
