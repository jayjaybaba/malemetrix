/* ==========================================================================
   MaleMetrix — geteilte Logik (Header, Warenkorb, Toast, Animationen)
   ========================================================================== */

(function () {
  "use strict";

  const CFG = window.MM_CONFIG || {};

  /* ---------- Utilities ---------- */

  window.MM = window.MM || {};

  MM.eur = function (n) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
  };

  // Übersetzungs-Helfer mit Fallback (i18n.js lädt vor main.js)
  function T(key, fallback) {
    return (window.MM && MM.i18n && MM.i18n.t(key)) || fallback;
  }

  MM.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem("mm_" + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem("mm_" + key, JSON.stringify(val)); } catch (e) { /* voll/blockiert */ }
      // Persistenz-Hook (keine Business-Logik): erlaubt dem Account-Adapter,
      // Änderungen local-first zu erkennen und in die Cloud zu syncen.
      // Wirft nie und blockiert nie die eigentliche Aktion.
      try { document.dispatchEvent(new CustomEvent("mm:store", { detail: { key: key, operation: "set" } })); } catch (e) {}
    },
    remove(key) {
      try { localStorage.removeItem("mm_" + key); } catch (e) { /* noop */ }
      // Auch Löschungen sind Persistenz-Ereignisse (z. B. Programm-Reset) —
      // ohne dieses Event könnte ein Cloud-Zyklus als Zombie weiterleben.
      try { document.dispatchEvent(new CustomEvent("mm:store", { detail: { key: key, operation: "remove" } })); } catch (e) {}
    }
  };

  MM.toast = function (msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      /* Ohne diese drei Attribute ist jede Bestätigung ("Gespeichert",
         "In Zwischenablage kopiert") für Screenreader nicht existent. */
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      t.setAttribute("aria-atomic", "true");
      t.innerHTML = '<span class="toast-icon">✓</span><span class="toast-msg"></span>';
      document.body.appendChild(t);
    }
    t.querySelector(".toast-msg").textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 3200);
  };

  /**
   * Sendet Formulardaten an den konfigurierten E-Mail-Endpoint (FormSubmit).
   * Fallback: öffnet das Mailprogramm des Besuchers mit fertigem Text.
   * Gibt ein Promise<{ok:boolean, viaMailto:boolean}> zurück.
   */
  MM.sendForm = async function (subject, data) {
    const lines = Object.entries(data)
      .map(([k, v]) => k + ": " + (Array.isArray(v) ? v.join(", ") : v))
      .join("\n");

    if (CFG.formEndpoint) {
      try {
        const res = await fetch(CFG.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(Object.assign({ _subject: subject }, data))
        });
        if (res.ok) return { ok: true, viaMailto: false };
      } catch (e) { /* offline o. nicht aktiviert → Fallback */ }
    }

    // Fallback: mailto
    const mailto = "mailto:" + encodeURIComponent(CFG.contactEmail || "") +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines);
    window.location.href = mailto;
    return { ok: true, viaMailto: true };
  };

  /**
   * Trägt eine E-Mail in die Liste ein. Mit Brevo-Formular (config.brevoFormAction)
   * landet sie direkt in deiner Liste (Double-Opt-In über Brevo), sonst per
   * FormSubmit in deinem Postfach. Speichert die E-Mail lokal (Unlock-Status).
   */
  MM.subscribe = async function (email, source, opts) {
    MM.store.set("unlock_email", email);
    MM.store.set("unlock_date", new Date().toISOString());
    if (MM.track) MM.track("email_unlock", { source: source || "ebook" });
    const quiet = opts && opts.quiet;
    const name = (opts && opts.name) ? String(opts.name).trim() : "";
    const ebook = (opts && opts.ebook) ? String(opts.ebook) : "";
    if (name) MM.store.set("unlock_name", name);

    if (CFG.brevoFormAction) {
      try {
        const iframe = document.createElement("iframe");
        iframe.name = "mm_brevo_" + Date.now();
        iframe.style.display = "none";
        document.body.appendChild(iframe);
        const f = document.createElement("form");
        f.action = CFG.brevoFormAction;
        f.method = "POST";
        f.target = iframe.name;
        f.style.display = "none";
        const inp = document.createElement("input");
        inp.type = "email";
        inp.name = CFG.brevoEmailField || "EMAIL";
        inp.value = email;
        f.appendChild(inp);
        document.body.appendChild(f);
        f.submit();
        setTimeout(() => { f.remove(); iframe.remove(); }, 5000);
        return { ok: true, viaBrevo: true };
      } catch (e) { /* Fallback unten */ }
    }

    // quiet: Hintergrund-Eintrag ohne Mailto-Fallback (würde die Seite kapern)
    if (quiet) {
      if (CFG.formEndpoint) {
        try {
          await fetch(CFG.formEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(Object.assign({ _subject: "📩 Lead — " + (name ? name + " · " : "") + email, Typ: "Ebook-Lead", "E-Mail": email, Quelle: source || "leadmagnet" }, name ? { Name: name } : {}, ebook ? { Ebook: ebook } : {}))
          });
        } catch (e) { /* Unlock bleibt lokal gespeichert */ }
      }
      return { ok: true, viaMailto: false };
    }

    const res = await MM.sendForm("📩 Ebook-Unlock / Newsletter — " + (name ? name + " · " : "") + email,
      Object.assign({ Typ: "E-Mail-Unlock", "E-Mail": email, Quelle: source || "ebooks" },
        name ? { Name: name } : {}, ebook ? { Ebook: ebook } : {}));
    return { ok: true, viaMailto: res.viaMailto };
  };

  /* ---------- Warenkorb (geteilt über alle Seiten) ---------- */

  MM.cart = {
    /* Der Warenkorb lebt im Browser des Besuchers und überlebt Katalog-
       Änderungen. Wird ein Produkt entfernt (z. B. das 1-€-Testprodukt nach
       dem PayPal-Live-Test), blieb der Eintrag liegen: Das Abzeichen zählte
       ihn, die Liste konnte ihn nicht anzeigen und die Summe blieb 0,00 € —
       ein Warenkorb, der voll aussah und leer war.
       Deshalb wird hier bei JEDEM Lesen bereinigt: unbekannte Produkte,
       kaputte Mengen und Fremdformate fliegen raus.
       WICHTIG: Ohne geladenen Katalog wird NICHT gefiltert — sonst würde eine
       Seite ohne shop-data.js einen gültigen Warenkorb leeren. */
    items() {
      const raw = MM.store.get("cart", []);
      if (!Array.isArray(raw)) return [];
      const katalog = window.MM_PRODUCTS;
      if (!Array.isArray(katalog) || !katalog.length) return raw;

      const clean = [];
      raw.forEach(i => {
        if (!i || typeof i.id !== "string") return;
        if (!katalog.some(p => p.id === i.id)) return;                 // Produkt existiert nicht mehr
        const qty = Math.floor(Number(i.qty));
        if (!(qty > 0)) return;                                        // 0, negativ, NaN
        const vorhanden = clean.find(c => c.id === i.id);              // Dubletten zusammenführen
        if (vorhanden) vorhanden.qty = Math.min(99, vorhanden.qty + qty);
        else clean.push({ id: i.id, qty: Math.min(99, qty) });
      });

      // Nur schreiben, wenn sich wirklich etwas geändert hat. Der Schreibvorgang
      // löst kein Re-Render aus, das hier wieder hereinlaufen könnte — beim
      // zweiten Lesen ist die Liste bereits sauber.
      if (JSON.stringify(clean) !== JSON.stringify(raw)) MM.store.set("cart", clean);
      return clean;
    },

    save(items) {
      MM.store.set("cart", items);
      MM.cart.renderBadge();
      MM.cart.renderDrawer();
    },

    add(productId, qty) {
      const items = MM.cart.items();
      const found = items.find(i => i.id === productId);
      if (found) found.qty += (qty || 1);
      else items.push({ id: productId, qty: qty || 1 });
      MM.cart.save(items);
      const p = MM.cart.product(productId);
      MM.toast((p ? p.name : "Produkt") + " im Warenkorb");
      if (MM.track) MM.track("add_to_cart", { product: productId });
      MM.cart.open();
    },

    setQty(productId, qty) {
      let items = MM.cart.items();
      if (qty <= 0) items = items.filter(i => i.id !== productId);
      else items.forEach(i => { if (i.id === productId) i.qty = qty; });
      MM.cart.save(items);
    },

    remove(productId) {
      MM.cart.save(MM.cart.items().filter(i => i.id !== productId));
    },

    clear() { MM.cart.save([]); },

    product(id) {
      return (window.MM_PRODUCTS || []).find(p => p.id === id);
    },

    totals() {
      const items = MM.cart.items();
      let sub = 0, hasPhysical = false;
      items.forEach(i => {
        const p = MM.cart.product(i.id);
        if (!p) return;
        sub += p.price * i.qty;
        if (!p.digital) hasPhysical = true;
      });
      const ship = (hasPhysical && sub < (CFG.shipping ? CFG.shipping.freeFrom : 50))
        ? (CFG.shipping ? CFG.shipping.flat : 3.90) : 0;
      return { sub, ship, total: sub + ship, count: items.reduce((a, i) => a + i.qty, 0), hasPhysical };
    },

    renderBadge() {
      const badge = document.getElementById("cartCount");
      if (!badge) return;
      const count = MM.cart.totals().count;
      badge.textContent = count;
      badge.classList.toggle("empty", count === 0);
    },

    open() {
      document.getElementById("cartDrawer").classList.add("open");
      document.getElementById("cartOverlay").classList.add("open");
      document.body.style.overflow = "hidden";
    },

    close() {
      document.getElementById("cartDrawer").classList.remove("open");
      document.getElementById("cartOverlay").classList.remove("open");
      document.body.style.overflow = "";
    },

    renderDrawer() {
      const wrap = document.getElementById("cartItems");
      const foot = document.getElementById("cartFoot");
      if (!wrap) return;
      const items = MM.cart.items();

      if (!items.length) {
        wrap.innerHTML = '<div class="cart-empty"><div class="big">🛒</div>' +
          '<p>' + T("cart.empty", "Dein Warenkorb ist leer.") + '</p>' +
          '<a class="btn btn-ghost btn-sm" href="shop.html" style="margin-top:16px">' + T("cart.toShop", "Zum Shop") + '</a></div>';
        foot.innerHTML = "";
        return;
      }

      wrap.innerHTML = items.map(i => {
        const p = MM.cart.product(i.id);
        if (!p) return "";
        return '<div class="cart-item">' +
          '<div class="cart-item-thumb">' + p.emoji + '</div>' +
          '<div><div class="cart-item-name">' + p.name + '</div>' +
          '<div class="cart-item-price">' + MM.eur(p.price) + (p.digital ? " · digital" : "") + '</div>' +
          '<button class="cart-item-remove" data-remove="' + p.id + '">' + T("cart.remove", "Entfernen") + '</button></div>' +
          '<div class="qty-stepper">' +
          '<button data-dec="' + p.id + '" aria-label="Menge verringern">−</button>' +
          '<span class="qty">' + i.qty + '</span>' +
          '<button data-inc="' + p.id + '" aria-label="Menge erhöhen">+</button>' +
          '</div></div>';
      }).join("");

      const t = MM.cart.totals();
      foot.innerHTML =
        '<div class="cart-total-row"><span>' + T("cart.subtotal", "Zwischensumme") + '</span><span class="mono">' + MM.eur(t.sub) + '</span></div>' +
        '<div class="cart-total-row"><span>' + T("cart.shipping", "Versand") + '</span><span class="mono">' +
        (t.hasPhysical ? (t.ship === 0 ? T("cart.free", "kostenlos") : MM.eur(t.ship)) : T("cart.digital", "entfällt (digital)")) + '</span></div>' +
        '<div class="cart-total-row grand"><span>' + T("cart.total", "Gesamt") + '</span><span class="mono">' + MM.eur(t.total) + '</span></div>' +
        '<a class="btn btn-primary btn-block" href="checkout.html">' + T("cart.checkout", "Zur Kasse") + '</a>';

      wrap.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => {
        const item = MM.cart.items().find(x => x.id === b.dataset.inc);
        MM.cart.setQty(b.dataset.inc, (item ? item.qty : 0) + 1);
      }));
      wrap.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => {
        const item = MM.cart.items().find(x => x.id === b.dataset.dec);
        MM.cart.setQty(b.dataset.dec, (item ? item.qty : 1) - 1);
      }));
      wrap.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => MM.cart.remove(b.dataset.remove)));
    }
  };

  /* ---------- DOM-Setup ---------- */

  function injectCartDrawer() {
    if (document.getElementById("cartDrawer")) return;
    const overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    overlay.id = "cartOverlay";
    overlay.addEventListener("click", MM.cart.close);

    const drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.id = "cartDrawer";
    drawer.setAttribute("aria-label", "Warenkorb");
    drawer.innerHTML =
      '<div class="cart-head"><h3>' + T("cart.title", "Warenkorb") + '</h3>' +
      '<button class="cart-close" id="cartClose" aria-label="Schließen">✕</button></div>' +
      '<div class="cart-items" id="cartItems"></div>' +
      '<div class="cart-foot" id="cartFoot"></div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    drawer.querySelector("#cartClose").addEventListener("click", MM.cart.close);
  }

  /* ---------- Social Proof / Trust ---------- */

  MM.renderTrust = function () {
    const tess = CFG.testimonials || [];
    const en = (window.MM.i18n && MM.i18n.lang === "en");
    document.querySelectorAll("[data-mm-trust]").forEach(el => {
      if (tess.length) {
        el.innerHTML = '<div class="grid-3">' + tess.slice(0, 3).map(t =>
          '<div class="card"><div style="color:var(--amber);margin-bottom:8px">★★★★★</div>' +
          '<p style="color:var(--text);font-size:0.95rem">„' + t.text + '"</p>' +
          '<div class="small muted" style="margin-top:10px">' + t.name + (t.result ? ' · <span style="color:var(--accent-2)">' + t.result + '</span>' : '') + '</div></div>'
        ).join("") + '</div>';
      } else {
        const badges = en
          ? ["🔒 Data stays on your device", "✓ Free check & consultation", "🚫 No medical promises", "↩ 14-day right of withdrawal", "🇩🇪 Made in Germany"]
          : ["🔒 Daten bleiben auf deinem Gerät", "✓ Check & Analysegespräch kostenlos", "🚫 Keine Heilversprechen", "↩ 14 Tage Widerrufsrecht", "🇩🇪 Aus Deutschland"];
        el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">' +
          badges.map(b => '<span class="chip">' + b + '</span>').join("") + '</div>';
      }
    });
  };

  /* ---------- Theme / Sprache / Navigation ---------- */

  function setupChrome() {
    // MaleMetrix ist bewusst DARK-ONLY. Altlast bereinigen: eine evtl. früher
    // gespeicherte Theme-Präferenz darf keinerlei Wirkung mehr haben.
    try { localStorage.removeItem("mm_theme"); } catch (e) {}
    document.documentElement.removeAttribute("data-theme");

    // Sprach-Umschalter
    const curLang = (window.MM && MM.i18n) ? MM.i18n.lang : "de";
    document.querySelectorAll(".lang-code").forEach(el => el.textContent = (curLang === "de" ? "EN" : "DE"));
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => { if (window.MM && MM.i18n) MM.i18n.toggle(); });
    });

    // Cart-Drawer bei Sprachwechsel neu rendern
    document.addEventListener("mm:langchange", () => {
      MM.cart.renderDrawer();
      const t = document.querySelector("#cartDrawer .cart-head h3");
      if (t) t.textContent = T("cart.title", "Warenkorb");
    });

    // Dropdown-Menüs (Knowledge / About) — mehrere möglich
    const dropdowns = document.querySelectorAll(".nav-more");
    dropdowns.forEach((dd) => {
      const tog = dd.querySelector(".nav-more-toggle");
      const menu = dd.querySelector(".nav-more-menu");
      if (!tog || !menu) return;
      tog.addEventListener("click", (e) => {
        e.stopPropagation();
        // andere offene Menüs schließen
        dropdowns.forEach((o) => { if (o !== dd) { const m = o.querySelector(".nav-more-menu"); if (m) m.classList.remove("open"); } });
        menu.classList.toggle("open");
      });
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav-more")) dropdowns.forEach((dd) => { const m = dd.querySelector(".nav-more-menu"); if (m) m.classList.remove("open"); });
    });

    // Aktive Nav-Markierung nach Dateiname
    const file = (location.pathname.split("/").pop() || "index.html") || "index.html";
    document.querySelectorAll(".main-nav a[href]").forEach(a => {
      const href = a.getAttribute("href");
      if (href === file || (file === "index.html" && href === "index.html")) a.classList.add("active");
    });
  }

  /* =======================================================================
     TEXTSCHUTZ
     -----------------------------------------------------------------------
     Die Inhalte dieser Seite sind das Produkt. Markieren und Kopieren wird
     deshalb unterbunden — CSS allein genügt dafür nicht: "Alles markieren"
     (Strg+A) umgeht user-select in mehreren Browsern. Deshalb wird zusätzlich
     das Kopier-Ereignis selbst abgefangen.

     GRENZE, ehrlich benannt: Wer den Text wirklich will, holt ihn über
     "Seite anzeigen", den Reader-Modus oder einen Screenshot mit
     Texterkennung. Absoluter Schutz ist im Web unmöglich — jeder Text, den
     ein Browser darstellen kann, ist auslesbar. Das hier hält
     Gelegenheits-Kopierer und Copy-Paste-Blogs ab, nicht einen Entschlossenen.

     AUSGENOMMEN, und zwar aus je einem konkreten Grund:
       · Rechtsseiten (AGB, Datenschutz, Impressum) — Verbraucher müssen die
         Vertragsbedingungen speichern können (§ 312i BGB, Textform). Diese
         Seiten zu sperren wäre ein Rechtsfehler, kein Schutz.
       · Eingabefelder, IBAN, Bestellnummern, Beträge, Kontakt-Links — siehe
         die Freigabeliste in css/style.css. Wer seine IBAN nicht kopieren
         kann, überweist nicht.
       · Das Betreiber-Konto: der Autor muss an seine eigenen Texte kommen.
         Geprüft wird die Rolle beim Server, nie localStorage — sonst wäre der
         Schutz mit einer Zeile im Browser ausgehebelt.
     ======================================================================= */
  const GUARD_AUS = ["agb.html", "datenschutz.html", "impressum.html"];
  const GUARD_FREI = "input, textarea, select, [contenteditable], .mono, code, kbd, pre," +
    " .summary-line, .order-success, .mm-copyable, a[href^='mailto:'], a[href^='tel:']";

  function textschutz() {
    const datei = (location.pathname.split("/").pop() || "index.html") || "index.html";
    if (GUARD_AUS.indexOf(datei) >= 0) return;
    // Der Premium-Reader schützt sich selbst (mit Wasserzeichen) — dort nicht
    // doppelt eingreifen.
    if (location.pathname.indexOf("/ebooks/") !== -1) return;

    document.body.classList.add("mm-guard");

    const freigegeben = (el) => {
      try { return !!(el && el.closest && el.closest(GUARD_FREI)); } catch (e) { return false; }
    };
    // Kopieren/Ausschneiden nur aus den freigegebenen Bereichen.
    ["copy", "cut"].forEach((typ) => {
      document.addEventListener(typ, (e) => {
        if (document.body.classList.contains("mm-guard-off")) return;
        if (freigegeben(e.target)) return;
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.anchorNode && freigegeben(sel.anchorNode.parentElement || sel.anchorNode)) return;
        e.preventDefault();
      });
    });
    /* Kontextmenü nur auf geschütztem Text unterdrücken. Ein Rechtsklick-Verbot
       auf der GANZEN Seite nimmt dem Besucher auch "Link in neuem Tab öffnen"
       und "Bild speichern" — das ärgert, ohne zu schützen. */
    document.addEventListener("contextmenu", (e) => {
      if (document.body.classList.contains("mm-guard-off")) return;
      if (freigegeben(e.target)) return;
      if (e.target && e.target.closest && e.target.closest("a[href], img, video")) return;
      e.preventDefault();
    });
    // Bilder nicht per Ziehen herausschleppen.
    document.addEventListener("dragstart", (e) => {
      if (document.body.classList.contains("mm-guard-off")) return;
      if (e.target && e.target.tagName === "IMG") e.preventDefault();
    });

    /* Autor-Ausnahme: kommt NACH dem Schutz, damit eine langsame Antwort nie
       ein offenes Fenster hinterlässt.

       ACHTUNG, im Test gestolpert: main.js wird VOR account.js geladen. Zum
       Zeitpunkt von init() gibt es MM.account also noch nicht — ein einfaches
       "if (!MM.account) return" lässt die Ausnahme für immer aus, und der
       Autor sitzt vor seinem eigenen gesperrten Text. Deshalb kurz warten,
       statt einmal zu prüfen und aufzugeben.

       REICHWEITE, damit niemand sie sucht: account.js wird nur auf den Seiten
       mit Konto-Bezug geladen (check, checkout, mein-protokoll, labor,
       kurs-programm und der Reader). Nur dort kann die Rolle überhaupt
       geprüft werden. Auf den reinen Marketing-Seiten gilt der Schutz für
       alle — auch für den Autor. Das ist kein Verlust: diese Texte stehen im
       Repository, wo er sie ohnehin bearbeitet. Die Alternative wäre, das
       Konto-Modul samt SDK auf jede Seite zu laden — teuer für jeden
       Besucher, nur damit einer kopieren kann. */
    const frei = () => {
      try {
        if (MM.account.role && MM.account.role() === "owner") {
          document.body.classList.remove("mm-guard");
          document.body.classList.add("mm-guard-off");
        }
      } catch (e) {}
    };
    let versuche = 0;
    (function wartenAufKonto() {
      if (window.MM && MM.account && MM.account.loadRole) {
        if (MM.account.role && MM.account.role() === "owner") { frei(); return; }
        const p = MM.account.whenReady ? MM.account.whenReady() : Promise.resolve();
        Promise.resolve(p).then(() => MM.account.loadRole()).then(frei).catch(() => {});
        return;
      }
      // Höchstens ~5 Sekunden. Ohne Konto-Modul bleibt der Schutz einfach an —
      // das ist die richtige Vorgabe, nicht ein Fehler.
      if (++versuche <= 25) setTimeout(wartenAufKonto, 200);
    })();
  }

  function init() {
    textschutz();
    // Header-Scroll-Effekt
    const header = document.getElementById("siteHeader");
    if (header) {
      const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // Cinematic Ambient ist bewusst STATISCH (Flagschiff-Prinzip wie in den
    // Ebooks): der Hintergrund steht, nur der Inhalt scrollt. Kein Parallax.

    // Mobile Navigation
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.textContent = open ? "✕" : "☰";
      });
    }

    setupChrome();

    // Warenkorb
    injectCartDrawer();
    MM.cart.renderBadge();
    MM.cart.renderDrawer();
    const cartBtn = document.getElementById("cartBtn");
    if (cartBtn) cartBtn.addEventListener("click", MM.cart.open);

    // Reveal-Animationen
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));

    // Animierte Balken (data-width)
    const ioBars = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.querySelectorAll(".bar-fill[data-width]").forEach(b => {
            b.style.width = b.dataset.width + "%";
          });
          ioBars.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll(".js-bars").forEach(el => ioBars.observe(el));

    // E-Mail-Adressen aus Config einsetzen
    document.querySelectorAll("[data-mm-email]").forEach(el => {
      el.textContent = CFG.contactEmail || "";
      if (el.tagName === "A") el.href = "mailto:" + (CFG.contactEmail || "");
    });

    // Jahr im Footer
    document.querySelectorAll("[data-year]").forEach(el => {
      el.textContent = new Date().getFullYear();
    });

    // Social Proof
    MM.renderTrust();
    document.addEventListener("mm:langchange", MM.renderTrust);

    // Lead-Magnet-Band (E-Mail-Liste) vor dem Footer
    injectLeadBand();

    // "Heute dran"-Hinweis für Tracker-Nutzer mit Wochenplan
    injectTodayHint();

    // PWA: Service Worker registrieren (nur über http/https)
    try {
      if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
        var sub = location.pathname.indexOf("/ebooks/") !== -1 || location.pathname.indexOf("/blog/") !== -1;
        var swPath = sub ? "../sw.js" : "sw.js";
        /* App-Seiten: hier zahlt sich der Cache aus. Marketing-Seiten nicht —
           dort kostet die Registrierung ~475 KB Vorab-Transfer für Dateien,
           die der Besucher womöglich nie braucht. */
        var APP_PAGES = ["mein-protokoll.html", "tracker.html", "labor.html", "dinner.html",
          "kurs-programm.html", "check.html", "report.html", "tools.html", "ebooks.html"];
        var file = location.pathname.split("/").pop() || "index.html";
        var installed = false;
        try { installed = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; } catch (e) {}
        var isApp = APP_PAGES.indexOf(file) !== -1 || sub || installed;
        if (isApp) {
          navigator.serviceWorker.register(swPath).catch(function () {});
        } else {
          /* Wer den SW schon hat, soll ihn trotzdem aktualisiert bekommen —
             sonst bliebe ein Besucher, der nur noch die Startseite öffnet,
             dauerhaft auf einer alten Version hängen. */
          navigator.serviceWorker.getRegistration().then(function (reg) {
            if (reg) reg.update();
          }).catch(function () {});
        }
      }
    } catch (e) {}
  }

  /* ---------- "Heute dran": tägliche Trainings-Erinnerung auf allen Seiten
     Erscheint nur für Nutzer, die im Gym-Tracker einen Wochenplan haben und
     heute noch nichts geloggt haben — die Website-Version der Morgen-Push. */
  function injectTodayHint() {
    var file = (location.pathname.split("/").pop() || "index.html") || "index.html";
    var skip = ["tracker.html", "checkout.html", "kurs-programm.html", "lead-blutwerte.html",
      "checkliste.html", "datenschutz.html", "impressum.html", "agb.html", "report.html"];
    if (skip.indexOf(file) !== -1) return;
    if (location.pathname.indexOf("/ebooks/") !== -1) return;

    var plan = MM.store.get("trk_plan", null);
    if (!plan) return; // nur Nutzer, die den Tracker eingerichtet haben

    function ymdLocal(d) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    var today = ymdLocal(new Date());
    var done =
      (MM.store.get("trk_sessions", []) || []).some(function (s) { return ymdLocal(new Date(s.date)) === today; }) ||
      (MM.store.get("trk_cardio", []) || []).some(function (c) { return c.date === today; }) ||
      (MM.store.get("trk_daily", []) || []).some(function (d) { return d.date === today; });
    if (done) return;

    var wd = String(new Date().getDay());
    var tplId = (plan.gymDays || {})[wd];
    var NAMES = { push: "Push", pull: "Pull", legs: "Legs", fullA: "Ganzkörper A", fullB: "Ganzkörper B", fullC: "Ganzkörper C", upper: "Oberkörper", lower: "Unterkörper" };
    var label = tplId
      ? "🏋️ Heute ist Gym-Tag: <strong>" + (NAMES[tplId] || "Dein Plan") + "</strong> — jetzt trainieren"
      : "🚶 Heute: <strong>" + (plan.dailyMin || 25) + " min Bewegung</strong> — kein Null-Tag";

    var pill = document.createElement("a");
    pill.id = "todayHint";
    pill.href = (location.pathname.indexOf("/blog/") !== -1 ? "../" : "") + "tracker.html";
    pill.className = "today-hint no-print";
    pill.innerHTML = label + " →";
    document.body.appendChild(pill);
  }

  /* ---------- Lead-Magnet: E-Mail-Einsammler vor dem Footer ----------
     Gratis-PDF gegen E-Mail (lead-blutwerte.html). Nutzt MM.subscribe
     (Brevo, sonst FormSubmit). Erscheint nicht auf Checkout-, Rechts-,
     Reader- und bereits konvertierenden Seiten. */
  function injectLeadBand() {
    const skip = ["checkout.html", "kurs-programm.html", "lead-blutwerte.html",
      "checkliste.html", "datenschutz.html", "impressum.html", "agb.html", "report.html"];
    const file = (location.pathname.split("/").pop() || "index.html") || "index.html";
    if (skip.indexOf(file) !== -1) return;
    if (location.pathname.indexOf("/ebooks/") !== -1) return;
    const footer = document.querySelector(".site-footer");
    if (!footer || document.getElementById("leadBand")) return;

    const unlocked = !!MM.store.get("unlock_email", null);
    const band = document.createElement("section");
    band.id = "leadBand";
    band.className = "section-tight no-print";
    band.innerHTML =
      '<div class="container">' +
      '<div class="cta-band" style="text-align:center">' +
      '<span class="eyebrow" style="justify-content:center">Gratis-Download</span>' +
      '<h2 style="margin-bottom:8px">Die 5 Blutwerte, die jeder Mann ab 30 kennen muss.</h2>' +
      '<p style="max-width:560px;margin:0 auto 18px">Das kostenlose Cheat-Sheet: was jeder Wert bedeutet, worauf du achtest und was du konkret tun kannst — auf einer Seite, zum Ausdrucken.</p>' +
      (unlocked
        ? '<a href="lead-blutwerte.html" class="btn btn-primary btn-lg btn-arrow">Cheat-Sheet öffnen</a>'
        : '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;max-width:520px;margin:0 auto">' +
          '<input type="email" id="leadEmail" placeholder="deine@email.de" autocomplete="email" ' +
          'style="flex:1;min-width:220px;padding:13px 16px;border-radius:10px;border:1px solid var(--line);background:var(--card-2);color:var(--text);font-size:1rem">' +
          '<button class="btn btn-primary btn-lg" id="leadSubmit">Gratis holen</button></div>' +
          '<p class="small" style="color:var(--muted-2);margin-top:12px">Dazu gelegentliche, ehrliche Tipps für Männer. Kein Spam, jederzeit abbestellbar. Mit dem Absenden akzeptierst du die <a href="datenschutz.html" style="text-decoration:underline">Datenschutzerklärung</a>.</p>' +
          '<p id="leadErr" class="small" style="color:var(--red);display:none;margin-top:8px"></p>'
      ) +
      '</div></div>';
    footer.parentNode.insertBefore(band, footer);

    const btn = document.getElementById("leadSubmit");
    const input = document.getElementById("leadEmail");
    if (!btn || !input) return;
    const submit = () => {
      const email = String(input.value || "").trim();
      const err = document.getElementById("leadErr");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        if (err) { err.textContent = "Bitte gib eine gültige E-Mail-Adresse ein."; err.style.display = "block"; }
        return;
      }
      // UI sofort umschalten; der Listen-Eintrag läuft im Hintergrund weiter
      band.querySelector(".cta-band").innerHTML =
        '<span class="eyebrow" style="justify-content:center">✅ Freigeschaltet</span>' +
        '<h2 style="margin-bottom:8px">Dein Cheat-Sheet ist bereit.</h2>' +
        '<p style="max-width:520px;margin:0 auto 18px">Öffne es jetzt und speichere es über den PDF-Button — es gehört dir.</p>' +
        '<a href="lead-blutwerte.html" class="btn btn-primary btn-lg btn-arrow">Cheat-Sheet öffnen</a>';
      if (MM.track) MM.track("leadmagnet_signup", {});
      try { Promise.resolve(MM.subscribe(email, "leadmagnet", { quiet: true })).catch(function () {}); }
      catch (e) { /* Unlock ist lokal gespeichert; Eintrag ggf. beim nächsten Besuch */ }
    };
    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* =========================================================================
   AMBIENT MOTION — Seitenkopf-Video (.mm-ambient in .page-head).
   Gleiche Regeln wie der Home-Hero: preload=none, spielt nur im Viewport
   und bei sichtbarem Tab, respektiert prefers-reduced-motion (Poster
   bleibt stehen). Ein Handler für alle Seiten.
   ========================================================================= */
(function () {
  "use strict";
  var vids = document.querySelectorAll(".mm-ambient video");
  if (!vids.length) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); v.classList.add("is-live"); }
  function pause(v) { try { v.pause(); } catch (e) {} }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? play(e.target) : pause(e.target); });
    }, { threshold: 0.15 });
    vids.forEach(function (v) { io.observe(v); });
  } else {
    vids.forEach(play);
  }
  document.addEventListener("visibilitychange", function () {
    vids.forEach(function (v) { document.hidden ? pause(v) : play(v); });
  });
})();
