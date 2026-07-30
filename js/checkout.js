/* ==========================================================================
   MaleMetrix Checkout — Bestellablauf
   Bestellung per Vorkasse/Überweisung (sofort funktionsfähig) oder
   PayPal.me / Stripe-Link, sobald in config.js hinterlegt.
   ========================================================================== */

(function () {
  "use strict";

  /* Zustimmung zu sofort bereitgestellten digitalen Inhalten. Wortlaut und
     Version stehen an EINER Stelle, damit Checkout, Order und Bestaetigung
     nachweislich denselben Text dokumentieren (§ 356 Abs. 5 BGB). */
  const DIGITAL_CONSENT_VERSION = "digital-consent-2026-07";
  const DIGITAL_CONSENT_TEXT = "Digitale Inhalte: Ich verlange ausdrücklich, dass vor Ablauf der Widerrufsfrist mit der Vertragserfüllung begonnen wird, und bestätige, dass mein Widerrufsrecht mit Beginn der Vertragserfüllung erlischt.";

  const CFG = window.MM_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  /* Name und E-Mail stammen aus dem Bestellformular und werden in
     innerHTML gesetzt — vor der Ausgabe maskieren. */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
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

  /* Zugangscodes werden NICHT mehr im Browser ausgeliefert. Verschluesselter
     Payload und Schluessel lagen zuvor gemeinsam im ausgelieferten Skript —
     damit war der Schutz wirkungslos. Der Zugang kommt jetzt ausschliesslich
     aus dem Konto: PayPal wird serverseitig geprueft, das Entitlement
     serverseitig vergeben, der Reader holt sein Schluesselmaterial ueber
     resolveProductAccess. */

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
    /* Reihenfolge ist Vorauswahl: die Ansicht unten markiert den ERSTEN
       Eintrag als checked. Deshalb steht PayPal vorn — es ist der einzige
       Weg, der den versprochenen sofortigen Zugang auch einlöst. Vorkasse
       bleibt verfügbar, aber als bewusste Entscheidung des Käufers. */
    const payOptions = [];
    /* Apple Pay steht vorn, sobald das Gerät es wirklich kann — auf dem
       iPhone ist das der Weg mit den wenigsten Abbrüchen. Auf allen anderen
       Geräten führt derselbe Link zu Karte, Google Pay und Klarna, deshalb
       heißt die Zahlart dort anders. */
    const stripeUrl = stripeLinkFor();
    const applePay = stripeUrl && applePayAvailable();
    const stripeOption = {
      id: "stripe",
      name: applePay ? "Apple Pay" : "Kreditkarte / Google Pay / Klarna",
      desc: (applePay
        ? "Mit Face ID oder Touch ID bezahlen — ohne Formular, ohne Kartennummer. Karte, Google Pay und Klarna stehen auf derselben Seite zur Wahl."
        : "Sichere Bezahlseite von Stripe. Auf dem iPhone steht dort zusätzlich Apple Pay bereit.") +
        " Dein Zugang wird direkt nach der Zahlung freigeschaltet."
    };
    /* Auf einem Apple-Pay-fähigen Gerät steht Apple Pay vorn: dort ist es
       der Weg mit den wenigsten Abbrüchen. Überall sonst steht PayPal vorn,
       weil der Zugang dort ohne Seitenwechsel entsteht — der Käufer bleibt
       die ganze Zeit hier. Beide Wege schalten automatisch frei; bei Stripe
       geschieht das bei der Rückkehr (siehe renderStripeReturn, live geprüft
       Juli 2026). Sollte die Prüfung einmal nicht möglich sein — fehlende
       session_id oder Server-Secret —, sagt renderStripeManual die manuelle
       Freischaltung ehrlich an, statt ein Versprechen zu brechen. */
    if (applePay) payOptions.push(stripeOption);
    if (CFG.paypalClientId) {
      payOptions.push({ id: "paypal_smart", name: "PayPal / Kreditkarte", desc: "Sicher mit PayPal, Kredit- oder Debitkarte zahlen — ohne die Seite zu verlassen. Zugang sofort nach der Zahlung." });
    } else if (CFG.paypalMe) {
      payOptions.push({ id: "paypal", name: "PayPal", desc: "Bezahle direkt nach der Bestellung per PayPal-Link." });
    }
    if (stripeUrl && !applePay) payOptions.push(stripeOption);
    payOptions.push({
      id: "vorkasse", name: "Vorkasse / Überweisung",
      desc: bankConfigured()
        ? "Du erhältst die Bankverbindung direkt nach der Bestellung. Versand bzw. Lieferung nach Zahlungseingang."
        : "Du erhältst die Bankverbindung per E-Mail an deine angegebene Adresse. Lieferung nach Zahlungseingang."
    });

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
        '<label class="checkbox-row"><input type="checkbox" id="coDigital" required aria-describedby="coDigitalHint"><span>' + DIGITAL_CONSENT_TEXT + '</span></label>' +
        '<p id="coDigitalHint" class="small" style="color:var(--muted-2);margin:-4px 2px 0">Pflichtangabe für sofort bereitgestellte digitale Inhalte. Unabhängig davon gilt unsere freiwillige 30-Tage-Geld-zurück-Garantie.</p>' : '') +
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

  /* ---------- Apple Pay / Karte / Klarna über eine Stripe-Bezahlseite -----
     Apple Pay lässt sich nicht ohne Zahlungsdienstleister anbieten. Statt
     eine eigene Apple-Merchant-Integration zu bauen (die eine Domain-
     Verifizierungsdatei und ein Apple-Developer-Konto voraussetzt), führt
     der Weg über eine von Stripe gehostete Bezahlseite: Stripe steht
     gegenüber Apple für die Domain gerade, blendet Apple Pay auf jedem
     fähigen Gerät automatisch ein und bietet daneben Karte, Google Pay und
     Klarna an.

     Die Zahlart erscheint ausschließlich, wenn in config.js wirklich ein
     Zahlungslink hinterlegt ist. Ein Apple-Pay-Versprechen ohne
     funktionierenden Weg dahinter wäre schlimmer als keine Zahlart. */

  /* Ein Zahlungslink gilt pro Produkt. Er greift daher nur, wenn der
     Warenkorb genau dieses eine Produkt in einfacher Menge enthält —
     sonst stimmte der Betrag auf der Bezahlseite nicht mit dem Warenkorb
     überein, und der Käufer zahlte etwas anderes als bestellt. */
  function stripeLinkFor() {
    const links = CFG.stripeLinks || {};
    const list = items();
    if (list.length !== 1 || list[0].qty !== 1) return "";
    const url = links[list[0].p.id];
    return (typeof url === "string" && /^https:\/\/(buy\.stripe\.com|[a-z0-9-]+\.stripe\.com)\//.test(url)) ? url : "";
  }

  /* Apple Pay wird nur beworben, wenn das Gerät es tatsächlich anbietet.
     canMakePayments() prüft die Verfügbarkeit der Funktion, nicht ob eine
     Karte hinterlegt ist — das ist die richtige Ebene, denn eine fehlende
     Karte kann der Käufer auf der Stripe-Seite direkt ergänzen. */
  function applePayAvailable() {
    try {
      return !!(window.ApplePaySession && window.ApplePaySession.canMakePayments());
    } catch (e) { return false; }
  }

  /* Bestellung festhalten, bevor der Käufer die Seite verlässt. Sonst
     zahlt jemand bei Stripe und wir wissen weder wer noch wofür. */
  async function goToStripe() {
    const url = stripeLinkFor();
    if (!url) { MM.toast("Diese Zahlungsart steht für deinen Warenkorb nicht bereit"); return; }
    if (!validateForm()) { MM.toast("Bitte prüfe die markierten Felder, die AGB und die Zustimmung zu digitalen Inhalten"); return; }
    if (!digitalConsentGiven()) { MM.toast("Bitte stimme der sofortigen Bereitstellung digitaler Inhalte zu"); return; }

    const btn = document.getElementById("coStripe");
    if (btn) { btn.disabled = true; btn.textContent = "Bezahlseite wird geöffnet…"; }

    const order = buildOrder(applePayAvailable() ? "Apple Pay (Stripe)" : "Karte / Google Pay / Klarna (Stripe)");
    const orders = MM.store.get("orders", []);
    orders.push(order);
    MM.store.set("orders", orders);
    /* Damit die Rückkehr von Stripe die Bestellung wiederfindet. productIds
       müssen mit: der Warenkorb wird bei der Rückkehr geleert, aber der Server
       braucht die Produktliste, um Betrag und Freischaltung zu prüfen. */
    MM.store.set("stripe_pending", { no: order.no, at: Date.now(), productIds: order.productIds || [] });
    if (MM.track) MM.track("checkout_stripe_redirect", { value: order.total });

    /* Die Benachrichtigung darf den Kaufweg nicht blockieren. Antwortet der
       Endpoint nicht, wird trotzdem weitergeleitet — die Bestellung liegt
       bereits lokal, und ein Käufer, der auf einem toten Button hängen
       bleibt, ist teurer als eine verspätete Benachrichtigung. */
    const mitFrist = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(r, ms))]);
    try {
      await mitFrist(MM.sendForm("🛒 Neue Bestellung " + order.no + " — " + order.total + " (Stripe, Zahlung folgt)", {
        Typ: "Bestellung",
        Bestellnummer: order.no,
        Name: order.name,
        "E-Mail": order.email,
        Adresse: order.address,
        Artikel: order.items.join(" | "),
        Versand: order.shipping,
        Gesamt: order.total,
        Zahlungsart: order.payMethod,
        Status: "zur Bezahlseite weitergeleitet — Zahlungseingang bei Stripe prüfen",
        "Digitale Inhalte — Zustimmung": order.digitalConsent
          ? (order.digitalConsent.given ? "JA am " + order.digitalConsent.at + " (" + order.digitalConsent.version + "): " + order.digitalConsent.text : "NEIN")
          : "entfällt (kein digitales Produkt)"
      }), 4000);
    } catch (e) { /* Weiterleitung darf daran nicht scheitern */ }

    /* E-Mail und Bestellnummer mitgeben: Stripe füllt das Feld vor und
       schreibt die Referenz in die Zahlung, damit sich beides zuordnen
       lässt. */
    const sep = url.indexOf("?") < 0 ? "?" : "&";
    window.location.href = url + sep +
      "prefilled_email=" + encodeURIComponent(order.email) +
      "&client_reference_id=" + encodeURIComponent(order.no);
  }

  /* Rückkehr von der Bezahlseite. Stripe leitet mit
     ?bezahlt=stripe&session_id=cs_… zurück.

     Die Rückleitung selbst ist KEIN Zahlungsnachweis — jeder könnte die URL
     aufrufen. Beweis ist ausschließlich die Checkout-Session, die der Server
     direkt bei Stripe abfragt (action: verify_stripe). Erst wenn Stripe dort
     "complete/paid" meldet, vergibt der Server das Entitlement. Fehlt die
     session_id (Zahlungslink noch ohne Platzhalter konfiguriert), bleibt es
     beim ehrlichen Hinweis auf manuelle Freischaltung — nie eine
     Erfolgsmeldung ohne Deckung. */
  function stripeSessionIdFromUrl() {
    const m = /[?&]session_id=(cs_[A-Za-z0-9_]{10,200})(?:&|$)/.exec(window.location.search);
    return m ? m[1] : "";
  }

  /* Fällt der Pending-State weg (anderes Gerät, Speicher geleert), lässt sich
     die Produktliste rekonstruieren, solange genau EIN Zahlungslink
     konfiguriert ist. Ein Fehlgriff wäre unschädlich: der Server vergleicht
     den bei Stripe bezahlten Betrag exakt mit dem Produktpreis und lehnt
     Abweichungen mit amount_mismatch ab. */
  function stripeProductIds(pending) {
    const fromPending = (pending && Array.isArray(pending.productIds)) ? pending.productIds.filter(x => typeof x === "string" && x) : [];
    if (fromPending.length) return fromPending;
    const keys = Object.keys(CFG.stripeLinks || {});
    return keys.length === 1 ? [keys[0]] : [];
  }

  function renderStripeReturn() {
    const pending = MM.store.get("stripe_pending", null);
    MM.cart.clear();
    if (MM.track) MM.track("checkout_stripe_returned", {});
    const sid = stripeSessionIdFromUrl();
    if (!sid) { renderStripeManual(pending); return; }
    runStripeVerify(sid, pending);
  }

  /* Zwischenzustand: der Server fragt Stripe. Nie "bezahlt" behaupten,
     solange die Antwort fehlt. */
  function renderStripeChecking() {
    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon" style="background:var(--accent-soft);color:var(--accent-2)">…</div>' +
      '<h1 class="h-section" style="margin-bottom:10px">Zahlung wird bestätigt …</h1>' +
      '<p class="muted">Wir prüfen deine Zahlung direkt bei Stripe und schalten deinen Zugang frei. Bitte NICHT erneut bezahlen und das Fenster kurz offen lassen.</p></div>';
  }

  function runStripeVerify(sid, pending) {
    renderStripeChecking();
    const ids = stripeProductIds(pending);
    const call = () => MM.account.invokeFunction("mm-commerce", {
      action: "verify_stripe",
      sessionId: sid,
      orderNo: (pending && pending.no) || null,
      productIds: ids,
      items: []
    }).then((r) => {
      if (fnOk(r)) {
        MM.store.set("stripe_pending", null);
        MM.account.loadAccountState().then(() => {});
        renderStripeSuccess(pending, fnData(r));
      } else {
        renderStripeIssue(fnCode(r), sid, pending);
      }
    }).catch(() => renderStripeIssue("network", sid, pending));

    const signedIn = window.MM && MM.account && MM.account.getCurrentUser && MM.account.getCurrentUser();
    if (signedIn) { call(); return; }
    /* account.js lädt asynchron — erst die Sitzung abwarten, dann urteilen. */
    if (window.MM && MM.account && MM.account.whenReady) {
      MM.account.whenReady().then(() => {
        if (MM.account.getCurrentUser && MM.account.getCurrentUser()) call();
        else renderStripeIssue("not_signed_in", sid, pending);
      }).catch(() => renderStripeIssue("not_signed_in", sid, pending));
    } else {
      renderStripeIssue("not_signed_in", sid, pending);
    }
  }

  function renderStripeSuccess(pending, data) {
    const ents = (data && data.entitlements) || [];
    const nr = (pending && pending.no) ? pending.no : ((data && data.order_no) || null);
    if (MM.track) MM.track("order_completed", { value: data && data.amount_cents ? (data.amount_cents / 100) : "stripe", paid: true, method: "Stripe" });
    if (MM.track && ents.indexOf("protocol") >= 0) MM.track("protokoll_unlocked", {});
    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon">✓</div>' +
      (nr ? '<span class="eyebrow" style="justify-content:center">Bestellung ' + esc(nr) + '</span>' : '') +
      '<h1 class="h-section" style="margin-bottom:14px">Zahlung bestätigt — Zugang ist frei.</h1>' +
      '<div class="card" style="text-align:left;margin:0 auto 16px;max-width:560px;border-color:var(--accent-line)">' +
      '<span class="card-num" style="color:var(--green)">✓ ZAHLUNG ERHALTEN</span>' +
      '<p class="muted" style="margin-top:6px">Deine Zahlung ist bei Stripe verifiziert' +
      (data && data.amount_cents ? " (" + MM.eur(data.amount_cents / 100) + ")" : "") +
      (data && data.replay ? " — war bereits verarbeitet, kein doppelter Zugriff vergeben" : "") + '.</p></div>' +
      '<div class="mm-access" style="padding-top:8px">' +
      '<span class="stamp">ACCESS GRANTED</span>' +
      '<div class="grant">' + (ents.indexOf("protocol") >= 0 ? '<b>DAS PROTOKOLL</b>' : '') + (ents.indexOf("twelve_week") >= 0 ? '<b>12-WEEK SYSTEM</b>' : '') + '</div>' +
      '<p class="assigned">ASSIGNED TO YOUR ACCOUNT · ALLE GERÄTE</p></div>' +
      (ents.indexOf("protocol") >= 0
        ? '<div class="mm-access-choice"><a class="btn btn-primary" href="ebooks/protokoll.html" data-track="postbuy_read_protokoll">Das Protokoll lesen →</a>' +
          '<a class="btn btn-dark" href="mein-protokoll.html" data-track="postbuy_start_program">12-Wochen-Programm starten →</a></div>'
        : '<a href="mein-protokoll.html" class="btn btn-primary">Jetzt starten →</a>') +
      '<p class="small" style="color:var(--muted-2);margin-top:22px">Die Rechnung kommt per E-Mail von Stripe.</p>' +
      '</div>';
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* Fehlermeldungen für den Stripe-Weg. Die gemeinsamen Codes aus VERIFY_MSG
     nennen PayPal namentlich — hier stehen deshalb die anbieter-richtigen
     Texte, alles Übrige fällt auf VERIFY_MSG zurück. */
  const STRIPE_MSG = {
    order_not_found: "Zu dieser Bezahl-Sitzung findet Stripe keine Zahlung. Bitte melde dich bei uns — NICHT erneut bezahlen.",
    not_captured: "Stripe hat die Zahlung noch nicht als abgeschlossen gemeldet. Bitte in einer Minute erneut prüfen — NICHT erneut bezahlen.",
    capture_incomplete: "Stripe hat die Zahlung noch nicht als abgeschlossen gemeldet. Bitte in einer Minute erneut prüfen — NICHT erneut bezahlen.",
    capture_not_found: "Zu dieser Bezahl-Sitzung findet Stripe keine Zahlung. Bitte melde dich bei uns — NICHT erneut bezahlen.",
    amount_mismatch: "Der bei Stripe bezahlte Betrag passt nicht zur Bestellung. Bitte melde dich bei uns — NICHT erneut bezahlen.",
    currency_mismatch: "Die Währung der Stripe-Zahlung passt nicht zur Bestellung (EUR erwartet). Bitte melde dich — NICHT erneut bezahlen.",
    stripe_auth_failed: "Server-Konfigurationsproblem bei der Zahlungsprüfung. Deine Zahlung ist sicher — wir schalten von Hand frei, bitte melde dich.",
    stripe_lookup_failed: "Stripe war bei der Prüfung kurz nicht erreichbar. Bitte in einigen Minuten erneut prüfen — NICHT erneut bezahlen.",
    provider_not_configured: "Die automatische Prüfung ist serverseitig noch nicht aktiv. Deine Zahlung ist eingegangen — wir schalten den Zugang von Hand frei.",
    no_entitled_products: "Wir konnten deine Bestellung im Browser nicht mehr zuordnen. Deine Zahlung ist sicher — melde dich kurz, wir schalten von Hand frei.",
    unknown_product: "Wir konnten deine Bestellung im Browser nicht mehr zuordnen. Deine Zahlung ist sicher — melde dich kurz, wir schalten von Hand frei.",
    bad_request: "Die Bezahl-Referenz aus der Rückleitung war unvollständig. Deine Zahlung ist sicher — melde dich kurz, wir schalten von Hand frei.",
    unknown_provider: "Interner Fehler bei der Zahlungsprüfung. Deine Zahlung ist sicher — melde dich kurz, wir schalten von Hand frei."
  };

  function renderStripeIssue(errCode, sid, pending) {
    const loginNoetig = ["not_signed_in", "unauthorized", "no_cloud", "auth_missing", "auth_invalid_token", "auth_validation_failed"].indexOf(errCode) >= 0;
    const hint = STRIPE_MSG[errCode] || VERIFY_MSG[errCode] ||
      "Deine Zahlung ist bei Stripe eingegangen. Die automatische Freischaltung hat gerade nicht geklappt — bitte NICHT erneut bezahlen, prüfe es einfach noch einmal.";
    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon" style="background:rgba(245,166,35,.12);color:#f5a623">!</div>' +
      '<h1 class="h-section" style="margin-bottom:14px">Zahlung eingegangen — Freischaltung noch offen.</h1>' +
      '<p class="muted" style="max-width:56ch;margin:0 auto 10px">' + hint + '</p>' +
      ((pending && pending.no) ? '<p class="small" style="color:var(--muted-2);margin-bottom:6px">Deine Bestellnummer: <strong style="color:var(--text)">' + esc(pending.no) + '</strong></p>' : '') +
      (errCode && !loginNoetig ? '<p class="small" style="color:var(--muted-2);margin-bottom:18px">Technischer Status: ' + String(errCode).replace(/[<>]/g, "") + '</p>' : '<div style="margin-bottom:18px"></div>') +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn btn-primary" id="retryStripe">Zahlung erneut prüfen</button>' +
      (loginNoetig ? '<a class="btn btn-dark" href="mein-protokoll.html">Zu My MaleMetrix (Login)</a>' : '<a class="btn btn-dark" href="kontakt.html">Frage zur Bestellung</a>') +
      '</div>' +
      '<p class="small" style="color:var(--muted-2);margin-top:22px">Der Prüf-Button löst KEINE neue Zahlung aus — er fragt nur den Status deiner bestehenden Stripe-Zahlung ab.</p>' +
      '</div>';
    const btn = document.getElementById("retryStripe");
    if (btn) btn.addEventListener("click", () => runStripeVerify(sid, pending));
  }

  /* Ohne session_id in der Rückleitung ist keine Prüfung möglich — dann bleibt
     es beim ehrlichen Hinweis auf die manuelle Freischaltung. */
  function renderStripeManual(pending) {
    const nr = pending && pending.no ? pending.no : null;
    MM.store.set("stripe_pending", null);
    wrap.innerHTML = '<div class="order-success"><div class="success-icon">✅</div>' +
      '<h1 class="h-section" style="margin-bottom:14px">Danke — deine Zahlung ist bei Stripe eingegangen.</h1>' +
      (nr ? '<p class="muted" style="margin-bottom:10px">Deine Bestellnummer: <strong style="color:var(--text)">' + esc(nr) + '</strong></p>' : '') +
      '<p class="muted" style="margin-bottom:28px">Du bekommst die Bestätigung per E-Mail. Deinen Zugang zu DAS PROTOKOLL schalten wir nach der Prüfung des Zahlungseingangs frei — in der Regel innerhalb weniger Stunden. Sobald er aktiv ist, findest du ihn in deinem Konto unter My MaleMetrix.</p>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">' +
      '<a href="mein-protokoll.html" class="btn btn-primary">Zu My MaleMetrix</a>' +
      '<a href="kontakt.html" class="btn btn-dark">Frage zur Bestellung</a></div></div>';
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
    } else if (method === "stripe") {
      const ap = applePayAvailable();
      box.innerHTML = '<button class="btn btn-primary btn-lg btn-block" id="coStripe">' +
        (ap ? ' Pay — ' : "Weiter zur Bezahlseite — ") + MM.eur(t.total) + '</button>' +
        '<p class="small" style="color:var(--muted-2);margin-top:10px;text-align:center">Die Zahlung läuft auf der gesicherten Seite von Stripe. Wir sehen deine Kartendaten nie.</p>';
      document.getElementById("coStripe").addEventListener("click", goToStripe);
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
          if (!validateForm()) { MM.toast("Bitte Felder, AGB und die Zustimmung zu digitalen Inhalten prüfen"); return actions.reject(); }
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
    const agb = $("#coAgb");
    agb.closest(".checkbox-row").classList.toggle("invalid", !agb.checked);
    if (!agb.checked) ok = false;
    /* Digitale Inhalte werden sofort bereitgestellt — ohne diese ausdrueckliche
       Zustimmung darf der Kauf nicht starten. */
    const dig = document.getElementById("coDigital");
    if (dig) {
      dig.closest(".checkbox-row").classList.toggle("invalid", !dig.checked);
      if (!dig.checked) ok = false;
    }
    if (!ok) {
      const first = document.querySelector("#coForm .invalid, .checkbox-row.invalid input, .invalid");
      if (first && first.focus) { try { first.focus(); } catch (e) {} }
    }
    return ok;
  }

  /* Einheitlicher Gate vor JEDEM Kaufweg (PayPal wie Vorkasse). */
  function digitalConsentGiven() {
    const dig = document.getElementById("coDigital");
    return !dig || dig.checked;
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
      payMethod,
      /* Nachweis der Zustimmung zu sofort bereitgestellten digitalen Inhalten:
         Zeitpunkt, Wortlaut und Textversion wandern mit der Bestellung. */
      digitalConsent: list.some(i => i.p.digital) ? {
        given: !!(document.getElementById("coDigital") || {}).checked,
        at: now.toISOString(),
        version: DIGITAL_CONSENT_VERSION,
        text: DIGITAL_CONSENT_TEXT
      } : null
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
      Status: opts.paypalPaid ? "BEZAHLT (PayPal)" : "offen",
      /* Nachweis nach § 356 Abs. 5 BGB: Wortlaut und Version der Zustimmung
         gehen mit der Bestellbestaetigung raus. */
      "Digitale Inhalte — Zustimmung": order.digitalConsent
        ? (order.digitalConsent.given ? "JA am " + order.digitalConsent.at + " (" + order.digitalConsent.version + "): " + order.digitalConsent.text : "NEIN")
        : "entfällt (kein digitales Produkt)"
    });

    MM.cart.clear();
    // Phase 9 (§5): Wenn der Server das Entitlement bereits vergeben hat
    // (serverGrant), wird der Client-Vault NICHT mehr entschlüsselt — der
    // Zugang kommt aus dem Konto (resolveProductAccess). Das ist der Pfad, der
    // den exponierten Client-Schlüssel im Produktivbetrieb tot legt. Nur ohne
    // Cloud fällt die Auslieferung auf den (dokumentiert schwächeren) Vault
    // zurück, damit bestehende Abläufe nicht brechen.
    renderSuccess(order, res.viaMailto, opts.paypalPaid, !!opts.serverGrant);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!validateForm()) { MM.toast("Bitte prüfe die markierten Felder, die AGB und die Zustimmung zu digitalen Inhalten"); return; }
    const btn = $("#coSubmit");
    if (btn) { btn.disabled = true; btn.textContent = "Bestellung wird übermittelt…"; }
    if (!digitalConsentGiven()) { MM.toast("Bitte stimme der sofortigen Bereitstellung digitaler Inhalte zu"); return; }
    const order = buildOrder(selectedMethod() === "paypal" ? "PayPal" : "Vorkasse / Überweisung");
    await finalizeOrder(order);
  }

  /* ---------- Nach dem Kauf: der eine nächste Schritt -----------------------
     Der Moment direkt nach einem Kauf ist der einzige, in dem jemand
     nachweislich bereit ist, Geld auszugeben — und beim Protokoll endet der
     Kundenwert sonst bei 99 €. Genau daran scheitert später jede bezahlte
     Werbung, weil 99 € einmalig keine Werbekosten tragen.

     Bewusst zurückhaltend gebaut: Es erscheint nur nach einer bestätigten
     Zahlung, nur beim Protokoll, und es ist kein zweiter Kaufabschluss,
     sondern ein Erstgespräch. Ein Nachfassangebot, das den gerade gekauften
     Artikel kleinredet, macht aus einem zufriedenen Käufer einen Rückgabe-
     fall. */
  function naechsterSchritt(order, paypalPaid, serverGrant) {
    const bezahlt = !!(paypalPaid || serverGrant);
    const hatProtokoll = (order.productIds || []).indexOf("protokoll") !== -1;
    if (!bezahlt || !hatProtokoll) return "";
    if (MM.track) MM.track("upsell_coaching_view", {});
    return '<div class="card" style="text-align:left;margin-bottom:28px;border-color:var(--accent-line);background:linear-gradient(135deg,var(--accent-soft),transparent)">' +
      '<span class="card-num">WENN DU NICHT ALLEIN STARTEN WILLST</span>' +
      '<h3 style="margin:6px 0 8px">Das Protokoll erklärt das System. Ich kann es auf dich einstellen.</h3>' +
      '<p class="muted" style="margin:0 0 16px;font-size:0.95rem">Im 1:1 Coaching schaue ich mir deine Werte, deinen Alltag und deinen Score persönlich an und steuere das Programm wöchentlich nach. Das Erstgespräch ist kostenlos und unverbindlich — danach 199 € im Monat, monatlich kündbar.</p>' +
      '<a class="btn btn-primary btn-sm" href="coaching.html" data-track="upsell_coaching_click">Erstgespräch ansehen</a>' +
      '<p class="small" style="color:var(--muted-2);margin:14px 0 0">Kein Muss: Das Protokoll ist vollständig und funktioniert allein.</p>' +
      '</div>';
  }

  function renderSuccess(order, viaMailto, paypalPaid, serverGrant) {
    const bank = CFG.bank || {};
    // Server-Grant: Zugang liegt im Konto — kein Client-Code, kein Vault.
    if (serverGrant) {
      const hasCourse = (order.productIds || []).some(id => id === "protokoll" || id === "kurs-12w");
      // VS2 — PREMIUM ACCESS MOMENT: der Kauf ist ein Produkt-Upgrade, kein
      // Formularabschluss. ACCESS GRANTED → freigeschaltete Systeme →
      // ASSIGNED TO YOUR ACCOUNT, mit kurzer funktionaler Unlock-Animation.
      // Zwei gleichrangige Einstiege statt einem generischen „Jetzt starten":
      // der Käufer entscheidet nur noch, WOMIT er beginnt — nicht, WO sein
      // Kauf überhaupt liegt (§ Kauf-Sichtbarkeit).
      const hatProto = (order.productIds || []).indexOf("protokoll") !== -1;
      var accountBlock = '<div class="mm-access">' +
        '<span class="stamp">ACCESS GRANTED</span>' +
        '<div class="grant">' + (hasCourse ? '<b>DAS PROTOKOLL</b><b>12-WEEK SYSTEM</b>' : '<b>DEIN ZUGANG</b>') + '</div>' +
        '<p class="assigned">ASSIGNED TO YOUR ACCOUNT · ALLE GERÄTE</p>' +
        (hatProto
          ? '<div class="mm-access-choice"><a class="btn btn-primary" href="ebooks/protokoll.html" data-track="postbuy_read_protokoll">Das Protokoll lesen →</a>' +
            '<a class="btn btn-dark" href="mein-protokoll.html" data-track="postbuy_start_program">12-Wochen-Programm starten →</a></div>'
          : (hasCourse ? '<a class="btn btn-primary" style="margin-top:22px" href="mein-protokoll.html">Jetzt starten →</a>' : '')) + '</div>';
    }
    const isPaypalMe = order.payMethod === "PayPal" && CFG.paypalMe && !paypalPaid;
    const amountRaw = order.total.replace(/[^\d,]/g, "").replace(",", ".");

    /* 12-Wochen-Programm: Zugang nach Kauf.
       Bei Server-Grant zeigt der Konto-Block oben den Zugang; die Code-Blöcke
       entfallen dann komplett (kein Client-Code mehr). */
    /* Zugang kommt aus dem Konto. Ohne serverseitigen Grant gibt es hier
       keinen Code und keinen Direktlink — nur den ehrlichen Hinweis, wie es
       weitergeht. */
    let courseBlock = serverGrant ? (accountBlock || "") : "";
    const kauftProtokoll = (order.productIds || []).indexOf("protokoll") !== -1;
    if (!serverGrant && kauftProtokoll) {
      courseBlock += '<div class="card" style="text-align:left;margin-bottom:24px">' +
        '<span class="card-num">DEIN ZUGANG</span>' +
        '<p class="muted" style="margin-top:6px">Sobald deine Zahlung bestätigt ist, wird DAS PROTOKOLL deinem Konto zugeordnet. ' +
        'Melde dich dafür mit der E-Mail-Adresse an, mit der du bestellt hast — der Zugang erscheint dann in ' +
        '<a href="mein-protokoll.html">My MaleMetrix</a> auf allen deinen Geräten.</p>' +
        '<p class="small" style="color:var(--muted-2);margin-top:10px">Hat die Zuordnung nicht geklappt? In My MaleMetrix kannst du ' +
        'deine PayPal-Transaktions-ID prüfen lassen — das löst keine neue Zahlung aus.</p></div>';
    }


    let payBlock;
    if (paypalPaid) {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px;border-color:var(--accent-line)">' +
        '<span class="card-num" style="color:var(--green)">✓ ZAHLUNG ERHALTEN</span>' +
        '<p class="muted" style="margin-top:6px">Deine Zahlung über <strong style="color:var(--text)">' + order.total + '</strong> ist per PayPal eingegangen. Wir kümmern uns sofort um deine Bestellung — du musst nichts weiter tun.</p></div>';
    } else if (isPaypalMe) {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px"><span class="card-num">SO ZAHLST DU PER PAYPAL</span>' +
        '<p class="muted" style="margin-bottom:18px">Klicke auf den Button und zahle <strong style="color:var(--text)">' + order.total + '</strong>. Gib als Verwendungszweck deine Bestellnummer an: <strong style="color:var(--text)">' + esc(order.no) + '</strong></p>' +
        '<a class="btn btn-primary" href="' + CFG.paypalMe + "/" + amountRaw + '" target="_blank" rel="noopener">Mit PayPal zahlen — ' + order.total + '</a></div>';
    } else if (bankConfigured()) {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px"><span class="card-num">SO ZAHLST DU PER ÜBERWEISUNG</span>' +
        '<div style="display:grid;gap:10px;font-size:0.95rem">' +
        '<div class="summary-line"><span>Empfänger</span><span class="mono">' + (bank.inhaber || "—") + '</span></div>' +
        '<div class="summary-line"><span>IBAN</span><span class="mono">' + (bank.iban || "—") + '</span></div>' +
        '<div class="summary-line"><span>Bank</span><span class="mono">' + (bank.bank || "—") + '</span></div>' +
        '<div class="summary-line"><span>Betrag</span><span class="mono">' + order.total + '</span></div>' +
        '<div class="summary-line"><span>Verwendungszweck</span><span class="mono">' + esc(order.no) + '</span></div>' +
        '</div></div>';
    } else {
      payBlock = '<div class="card" style="text-align:left;margin-bottom:24px"><span class="card-num">SO GEHT ES WEITER</span>' +
        '<p class="muted" style="margin-top:6px">Du erhältst die Bankverbindung für deine Überweisung über <strong style="color:var(--text)">' + order.total + '</strong> per E-Mail an <strong style="color:var(--text)">' + esc(order.email) + '</strong>. Verwendungszweck: <strong style="color:var(--text)">' + esc(order.no) + '</strong>.</p></div>';
    }

    wrap.innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon">✓</div>' +
      '<span class="eyebrow" style="justify-content:center">Bestellung ' + esc(order.no) + '</span>' +
      '<h1 class="h-section" style="margin-bottom:14px">Danke, ' + esc(order.name.split(" ")[0]) + '!</h1>' +
      '<p class="muted" style="margin-bottom:8px">Deine Bestellung ist eingegangen' + (viaMailto ? " — bitte sende die geöffnete E-Mail noch ab, damit sie uns erreicht" : "") + '.</p>' +
      '<p class="muted" style="margin-bottom:28px">Bestellbestätigung &amp; Details gehen an <strong style="color:var(--text)">' + esc(order.email) + '</strong>.</p>' +
      courseBlock +
      payBlock +

      '<div class="card" style="text-align:left;margin-bottom:28px"><span class="card-num">DEINE BESTELLUNG</span>' +
      order.items.map(i => '<div class="summary-line"><span>' + i + '</span></div>').join("") +
      '<div class="summary-line"><span>Versand</span><span class="mono">' + order.shipping + '</span></div>' +
      '<div class="summary-line grand"><span>Gesamt</span><span class="mono">' + order.total + '</span></div></div>' +

      '<p class="small" style="color:var(--muted-2);margin-bottom:24px">Physische Produkte versenden wir innerhalb von 2–4 Werktagen nach Zahlungseingang. Digitale Produkte erhältst du per E-Mail innerhalb von 48 Stunden nach Zahlungseingang.</p>' +
      naechsterSchritt(order, paypalPaid, serverGrant) +
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
    order_lookup_failed: "Die Zahlung ist bestätigt, die Bestellprüfung ist aber kurz fehlgeschlagen. Bitte erneut prüfen — NICHT erneut bezahlen.",
    entitlement_write_failed: "Die Zahlung ist bestätigt, aber die Freischaltung konnte nicht gespeichert werden. Bitte erneut prüfen — NICHT erneut bezahlen.",
    event_log_failed: "Die Zahlung ist bestätigt, es gab aber ein Speicherproblem. Bitte erneut prüfen — NICHT erneut bezahlen.",
    payment_already_claimed: "Diese Zahlung ist bereits einem anderen Konto zugeordnet. Bitte melde dich mit dem Konto an, mit dem du gekauft hast — NICHT erneut bezahlen.",
    order_conflict: "Diese Zahlung passt nicht zu den angeforderten Produkten. Bitte melde dich beim Support — NICHT erneut bezahlen.",
    currency_mismatch: "Die Währung der PayPal-Zahlung passt nicht zur Bestellung (EUR erwartet). Bitte melde dich — NICHT erneut bezahlen.",
    unknown_product: "Ein Produkt in dieser Bestellung ist serverseitig unbekannt. Bitte Warenkorb neu laden — NICHT erneut bezahlen."
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
      '<div class="mm-access" style="padding-top:8px">' +
      '<span class="stamp">ACCESS GRANTED</span>' +
      '<div class="grant">' + (((data && data.entitlements) || []).indexOf("protocol") >= 0 ? '<b>DAS PROTOKOLL</b>' : '') + (((data && data.entitlements) || []).indexOf("twelve_week") >= 0 ? '<b>12-WEEK SYSTEM</b>' : '') + '</div>' +
      '<p class="assigned">ASSIGNED TO YOUR ACCOUNT · ALLE GERÄTE</p></div>' +
      (((data && data.entitlements) || []).indexOf("protocol") >= 0
        ? '<div class="mm-access-choice"><a class="btn btn-primary" href="ebooks/protokoll.html" data-track="postbuy_read_protokoll">Das Protokoll lesen →</a>' +
          '<a class="btn btn-dark" href="mein-protokoll.html" data-track="postbuy_start_program">12-Wochen-Programm starten →</a></div>'
        : '<a href="mein-protokoll.html" class="btn btn-primary">Jetzt starten →</a>') +
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
  const zurueckVonStripe = /[?&]bezahlt=stripe(&|$)/.test(window.location.search);
  if (zurueckVonStripe) {
    renderStripeReturn();
  } else if (bootPending && (bootPending.paypalOrderId || bootPending.captureId)) {
    runRecovery(bootPending);
  } else {
    renderForm();
  }
})();
