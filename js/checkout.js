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

  /* ---------- Automatische Code-Auslieferung nach bestätigter Zahlung ------
     Die Zugangscodes liegen AES-verschlüsselt vor und werden erst nach einem
     erfolgreichen PayPal-Capture entschlüsselt und angezeigt. Bei Vorkasse
     (Zahlung nicht sofort bestätigbar) kommt der Code nach Zahlungseingang
     per E-Mail. Payload neu erzeugen: node tools-dev/vault.mjs encrypt ... */
  const DELIVERY_VAULT = {"v":1,"iter":150000,"salt":"fROUAG3L0nEoxIpJtMRLeg==","iv":"ZzFb44oXqImirqFo","ct":"GFtc9HlVhwT04djp2FzBSpcwmVmZeyte8WkGl2awmSdp5FqQyfSPtH1/6k38CqHG4t893Z4NGv2NTFKmfg=="};
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
      desc: "Du erhältst die Bankverbindung direkt nach der Bestellung. Versand bzw. Lieferung nach Zahlungseingang."
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
        }),
        onApprove: (data, actions) => actions.order.capture().then((details) => {
          const order = buildOrder("PayPal (bezahlt)");
          order.paid = true;
          finalizeOrder(order, { paypalPaid: true });
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
      const bad = !el.value.trim() || (id === "coEmail" && !MM.validEmail(el.value));
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
    const codes = opts.paypalPaid ? await deliveryCodes() : null;
    renderSuccess(order, res.viaMailto, opts.paypalPaid, codes);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!validateForm()) { MM.toast("Bitte prüfe die markierten Felder & bestätige die AGB"); return; }
    const btn = $("#coSubmit");
    if (btn) { btn.disabled = true; btn.textContent = "Bestellung wird übermittelt…"; }
    const order = buildOrder(selectedMethod() === "paypal" ? "PayPal" : "Vorkasse / Überweisung");
    await finalizeOrder(order);
  }

  function renderSuccess(order, viaMailto, paypalPaid, codes) {
    const bank = CFG.bank || {};
    const isPaypalMe = order.payMethod === "PayPal" && CFG.paypalMe && !paypalPaid;
    const amountRaw = order.total.replace(/[^\d,]/g, "").replace(",", ".");

    /* 12-Wochen-Programm: Zugang nach Kauf */
    let courseBlock = "";
    if ((order.productIds || []).indexOf("kurs-12w") !== -1) {
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
    } else {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px"><span class="card-num">SO ZAHLST DU PER ÜBERWEISUNG</span>' +
        '<div style="display:grid;gap:10px;font-size:0.95rem">' +
        '<div class="summary-line"><span>Empfänger</span><span class="mono">' + (bank.inhaber || "—") + '</span></div>' +
        '<div class="summary-line"><span>IBAN</span><span class="mono">' + (bank.iban || "—") + '</span></div>' +
        '<div class="summary-line"><span>Bank</span><span class="mono">' + (bank.bank || "—") + '</span></div>' +
        '<div class="summary-line"><span>Betrag</span><span class="mono">' + order.total + '</span></div>' +
        '<div class="summary-line"><span>Verwendungszweck</span><span class="mono">' + order.no + '</span></div>' +
        '</div></div>';
    }

    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon">✓</div>' +
      '<span class="eyebrow" style="justify-content:center">Bestellung ' + order.no + '</span>' +
      '<h1 class="h-section" style="margin-bottom:14px">Danke, ' + MM.esc(order.name.split(" ")[0]) + '!</h1>' +
      '<p class="muted" style="margin-bottom:8px">Deine Bestellung ist eingegangen' + (viaMailto ? " — bitte sende die geöffnete E-Mail noch ab, damit sie uns erreicht" : "") + '.</p>' +
      '<p class="muted" style="margin-bottom:28px">Bestellbestätigung &amp; Details gehen an <strong style="color:var(--text)">' + MM.esc(order.email) + '</strong>.</p>' +
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

  renderForm();
})();
