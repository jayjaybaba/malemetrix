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

  /** HTML-Escaping für Nutzereingaben, die per innerHTML gerendert werden. */
  MM.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  };

  /** Lokales Datum als "YYYY-MM-DD" (akzeptiert Date oder ISO-String). */
  MM.ymd = function (d) {
    const x = d instanceof Date ? d : new Date(d);
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  };

  MM.validEmail = function (s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());
  };

  /** Dateiname der aktuellen Seite, z. B. "check.html". */
  function pageFile() {
    return location.pathname.split("/").pop() || "index.html";
  }

  /* Seiten ohne Lead-Band / Tages-Hinweis (Checkout, Recht, Reader, Print). */
  const QUIET_PAGES = ["checkout.html", "kurs-programm.html", "lead-blutwerte.html",
    "checkliste.html", "datenschutz.html", "impressum.html", "agb.html", "report.html"];
  function isQuietPage(extra) {
    if (location.pathname.indexOf("/ebooks/") !== -1) return true;
    const file = pageFile();
    return QUIET_PAGES.indexOf(file) !== -1 || (extra || []).indexOf(file) !== -1;
  }

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
    },
    remove(key) {
      try { localStorage.removeItem("mm_" + key); } catch (e) { /* noop */ }
    }
  };

  MM.toast = function (msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
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
   * opts.quiet unterdrückt den Mailto-Fallback (für Hintergrund-Einträge,
   * die die Seite nicht kapern dürfen).
   * Gibt ein Promise<{ok:boolean, viaMailto:boolean}> zurück.
   */
  MM.sendForm = async function (subject, data, opts) {
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

    if (opts && opts.quiet) return { ok: false, viaMailto: false };

    // Fallback: mailto
    const lines = Object.entries(data)
      .map(([k, v]) => k + ": " + (Array.isArray(v) ? v.join(", ") : v))
      .join("\n");
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
      await MM.sendForm("📩 Newsletter — " + email, {
        Typ: "E-Mail-Unlock", "E-Mail": email, Quelle: source || "leadmagnet"
      }, { quiet: true });
      return { ok: true, viaMailto: false };
    }

    const res = await MM.sendForm("📩 Ebook-Unlock / Newsletter — " + email, {
      Typ: "E-Mail-Unlock", "E-Mail": email, Quelle: source || "ebooks"
    });
    return { ok: true, viaMailto: res.viaMailto };
  };

  /* ---------- Warenkorb (geteilt über alle Seiten) ---------- */

  MM.cart = {
    items() { return MM.store.get("cart", []); },

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
    // Theme aus Speicher (Bootstrap-Script im <head> setzt es bereits früh)
    let theme = "dark";
    try { theme = localStorage.getItem("mm_theme") || "dark"; } catch (e) {}
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");

    document.querySelectorAll(".theme-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const isLight = document.documentElement.getAttribute("data-theme") === "light";
        const next = isLight ? "dark" : "light";
        if (next === "light") document.documentElement.setAttribute("data-theme", "light");
        else document.documentElement.removeAttribute("data-theme");
        try { localStorage.setItem("mm_theme", next); } catch (e) {}
        document.dispatchEvent(new CustomEvent("mm:themechange", { detail: { theme: next } }));
      });
    });

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

    // "Mehr"-Dropdown
    const moreToggle = document.querySelector(".nav-more-toggle");
    const moreMenu = document.querySelector(".nav-more-menu");
    if (moreToggle && moreMenu) {
      moreToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".nav-more")) moreMenu.classList.remove("open");
      });
    }

    // Aktive Nav-Markierung nach Dateiname
    const file = pageFile();
    document.querySelectorAll(".main-nav a[href]").forEach(a => {
      if (a.getAttribute("href") === file) a.classList.add("active");
    });
  }

  function init() {
    // Header-Scroll-Effekt
    const header = document.getElementById("siteHeader");
    if (header) {
      const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

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
        var swPath = location.pathname.indexOf("/ebooks/") !== -1 || location.pathname.indexOf("/blog/") !== -1 ? "../sw.js" : "sw.js";
        navigator.serviceWorker.register(swPath).catch(function () {});
      }
    } catch (e) {}
  }

  /* ---------- "Heute dran": tägliche Trainings-Erinnerung auf allen Seiten
     Erscheint nur für Nutzer, die im Gym-Tracker einen Wochenplan haben und
     heute noch nichts geloggt haben — die Website-Version der Morgen-Push. */
  function injectTodayHint() {
    if (isQuietPage(["tracker.html"])) return;

    var plan = MM.store.get("trk_plan", null);
    if (!plan) return; // nur Nutzer, die den Tracker eingerichtet haben

    var today = MM.ymd(new Date());
    var done =
      (MM.store.get("trk_sessions", []) || []).some(function (s) { return MM.ymd(s.date) === today; }) ||
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
    if (isQuietPage()) return;
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
      if (!MM.validEmail(email)) {
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
