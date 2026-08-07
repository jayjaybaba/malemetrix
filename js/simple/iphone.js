/* ==========================================================================
   MaleMetrix Generation 2 — „Auf meinem iPhone einrichten" (Phase 6)

   MaleMetrix bleibt die Quelle der Wahrheit; Apple-Apps sind Ausgabekanäle.
   Ehrlichkeitsregeln (§1.3/§23/§24):
     · Nichts wird „automatisch eingerichtet"-genannt, was nur ein Dialog ist.
     · Push wird nicht als aktiv dargestellt, solange die serverseitige
       Zustellung nicht konfiguriert ist (PRODUCTION_TRUTH: REQUIRES CONFIG).
     · Notizen/Erinnerungen: Teilen/Kopieren + Anleitung — keine Fake-Automatik.
   ========================================================================== */
(function () {
  "use strict";
  window.MMSimple = window.MMSimple || {};

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function en() { return !!(window.MM && MM.i18n && MM.i18n.lang === "en"); }
  function tx(de, enTxt) { return en() ? (enTxt || de) : de; }
  function pick(o) { return o == null ? "" : (typeof o === "object" ? (en() ? (o.en || o.de) : o.de) : o); }
  function track(ev, p) { try { if (MM.track) MM.track(ev, p); } catch (e) {} }
  function isIos() { return /iPhone|iPad|iPod/.test(navigator.userAgent); }
  function isNativeApp() { return !!(window.MM && MM.native && MM.native.isApp); }
  function isStandalone() {
    if (isNativeApp()) return true; // native App = installierte App, nur ehrlicher
    try { return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; }
  }
  var WDN = { de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
  function wd(i) { return (en() ? WDN.en : WDN.de)[i]; }

  function copyBtn(label, textFn, trackId) {
    var b = el("button", "btn btn-ghost btn-sm", esc(label));
    b.addEventListener("click", function () {
      var txt = textFn();
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        b.textContent = tx("Kopiert ✓", "Copied ✓");
      }).catch(function () { window.prompt(tx("Manuell kopieren:", "Copy manually:"), txt); });
      if (trackId) track(trackId);
    });
    return b;
  }
  function shareBtn(label, textFn, trackId) {
    if (!navigator.share) return null;
    var b = el("button", "btn btn-ghost btn-sm", esc(label));
    b.style.marginLeft = "8px";
    b.addEventListener("click", function () {
      navigator.share({ title: "MaleMetrix", text: textFn() }).then(function () { if (trackId) track(trackId); }).catch(function () {});
    });
    return b;
  }

  /* ------------- Textbausteine für Erinnerungen / Notizen ------------- */
  function reminderText(p) {
    var lines = [tx("MaleMetrix — Erinnerungen (zum manuellen Anlegen in der Erinnerungen-App)", "MaleMetrix — reminders (to create manually in the Reminders app)"), ""];
    var t = (p.training.preferredTimes && p.training.preferredTimes[p.training.weekdays[0]]) || "18:00";
    lines.push(tx("Training: ", "Training: ") + p.training.weekdays.map(wd).join(", ") + " · " + t);
    lines.push(tx("Wiegen: ", "Weigh-in: ") + p.dailyTargets.weighInWeekdays.map(wd).join(", ") + " · " + tx("morgens", "morning"));
    lines.push(tx("Wochencheck: ", "Weekly check: ") + wd(p.reminderPreferences.weeklyReviewWeekday) + " · " + p.reminderPreferences.weeklyReviewTime);
    lines.push(tx("Einkauf: ", "Groceries: ") + wd(p.nutrition.shoppingDay));
    lines.push("Meal-Prep: " + wd(p.nutrition.mealPrepDay));
    lines.push(tx("Fortschrittsfoto: Start, Woche 4, 8, 12", "Progress photo: start, weeks 4, 8, 12"));
    return lines.join("\n");
  }

  function notesText(p) {
    var e = MMSimple.engine;
    var L = [tx("MALEMETRIX — DEIN 12-WOCHEN-PLAN (Kurzfassung)", "MALEMETRIX — YOUR 12-WEEK PLAN (summary)"), ""];
    L.push(tx("Woche:", "Week:"));
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var info = (p.week || []).filter(function (x) { return x.weekday === d; })[0] || {};
      var what = [];
      if (info.training) what.push("Training");
      if (info.shopping) what.push(tx("Einkauf", "Groceries"));
      if (info.mealPrep) what.push("Meal-Prep");
      if (info.review) what.push(tx("Wochencheck", "Weekly check"));
      if (!what.length) what.push(tx("Bewegung", "Movement"));
      L.push("  " + wd(d) + ": " + what.join(" + "));
    });
    L.push("");
    L.push(tx("Training (kompakt):", "Training (compact):"));
    p.training.sessions.forEach(function (s) {
      L.push("  " + pick(s.name) + ": " + s.exercises.map(function (x) { return (en() ? x.nameEn : x.name) + " " + x.sets + "×" + x.repsLo + "–" + x.repsHi; }).join(" · "));
    });
    L.push("");
    L.push(tx("Ernährung: ", "Nutrition: ") + p.nutrition.calorieTarget + " kcal · " + p.nutrition.proteinTargetGrams + " g Protein · " + p.nutrition.mealCount + " " + tx("Mahlzeiten", "meals"));
    (p.nutrition.meals || []).forEach(function (m) {
      var names = m.options.map(function (o) { return pick(o.name); }).join(" / ");
      L.push("  " + m.slot + ": " + names);
    });
    L.push("");
    L.push(tx("Unterwegs-Regeln:", "On-the-go rules:"));
    (p.nutrition.practicalRules || []).slice(0, 6).forEach(function (r) {
      L.push("  " + pick(r.name) + ": " + pick(r.rule));
    });
    return L.join("\n");
  }

  /* ------------- Server-Push (nur echte Zustände, keine Fake-Zusagen) ------ */
  function urlB64ToUint8(s) {
    var pad = "=".repeat((4 - s.length % 4) % 4);
    var b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(b64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function renderPushSection(card) {
    // In der nativen App plant iOS die Erinnerungen selbst — kein Web-Push,
    // kein Konto noetig. Die native Bruecke rendert diesen Abschnitt dann.
    if (isNativeApp() && MM.native.renderNotifications) {
      if (MM.native.renderNotifications(card, { el: el, esc: esc, tx: tx })) return;
    }
    var key = (window.MM_CONFIG && MM_CONFIG.VAPID_PUBLIC_KEY) || "";
    var supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    var signedIn = false;
    try { signedIn = !!(MM.account && MM.account.getDashboardState && MM.account.getDashboardState().user); } catch (e) {}

    if (!key) {
      card.appendChild(el("p", "hint", tx("Server-Push ist derzeit nicht konfiguriert — Erinnerungen kommen über den Kalender (oben).",
        "Server push is not configured — reminders arrive via the calendar (above).")));
      return;
    }
    if (!supported) {
      card.appendChild(el("p", "hint", tx("Dieser Browser unterstützt keine Web-Push-Benachrichtigungen.",
        "This browser does not support web push notifications.")));
      return;
    }
    if (isIos() && !isStandalone()) {
      card.appendChild(el("p", "hint", tx(
        "Auf dem iPhone verlangt Apple dafür die installierte App: erst Schritt 2 (Zum Home-Bildschirm), dann die App vom Home-Bildschirm öffnen — hier erscheint dann der Schalter.",
        "On iPhone, Apple requires the installed app: do step 2 first (Add to Home Screen), then open the app from your home screen — the toggle appears here.")));
      return;
    }
    if (!signedIn) {
      card.appendChild(el("p", "hint", tx(
        "Benachrichtigungen brauchen dein (kostenloses) Konto — sonst weiß der Server nicht, wohin er senden soll. Einloggen im Profil.",
        "Notifications need your (free) account — otherwise the server doesn't know where to send. Sign in via Profile.")));
      return;
    }

    card.appendChild(el("p", "hint", tx(
      "Nur Wertvolles: Morning Brief und Wochencheck-Erinnerung. Ruhezeiten 21:30–07:30 werden respektiert, Inhalte bleiben auf dem Sperrbildschirm diskret. Jederzeit abschaltbar.",
      "Only what's valuable: morning brief and weekly-check reminder. Quiet hours 21:30–07:30 respected, lock-screen content stays discreet. Switch off anytime.")));
    var status = el("p", "hint");
    var btn = el("button", "btn btn-primary btn-sm");
    var offBtn = el("button", "btn btn-ghost btn-sm", tx("Abschalten", "Turn off"));
    offBtn.style.marginLeft = "8px";

    function refresh() {
      navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
        .then(function (sub) {
          var on = !!sub;
          btn.textContent = on ? tx("Aktiv ✓", "Active ✓") : tx("Benachrichtigungen aktivieren", "Enable notifications");
          btn.disabled = on;
          offBtn.style.display = on ? "" : "none";
          status.textContent = on ? "" : (Notification.permission === "denied"
            ? tx("Vom Browser blockiert — in den Website-Einstellungen erlauben, dann erneut versuchen.", "Blocked by the browser — allow in site settings, then retry.")
            : "");
        });
    }
    btn.addEventListener("click", function () {
      btn.disabled = true; btn.textContent = "…";
      Notification.requestPermission().then(function (perm) {
        if (perm !== "granted") { btn.disabled = false; refresh(); return null; }
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) });
        }).then(function (sub) {
          var json = JSON.parse(JSON.stringify(sub));
          return MM.account.savePushSubscription(json, {}).then(function (r) {
            if (r.ok) { track("push_enabled"); status.textContent = tx("Aktiviert ✓ — der nächste Morning Brief kommt automatisch.", "Enabled ✓ — the next morning brief arrives automatically."); }
            else {
              // Ehrlich bleiben: ohne Server-Speicherung KEIN aktiver Zustand vortäuschen
              sub.unsubscribe().catch(function () {});
              status.textContent = tx("Serverseitig fehlgeschlagen (", "Server-side failed (") + (r.message || r.code || "?") + ") — " + tx("bitte später erneut versuchen.", "please try again later.");
            }
            refresh();
          });
        });
      }).catch(function (e2) {
        status.textContent = String(e2 && e2.message || e2);
        btn.disabled = false; refresh();
      });
    });
    offBtn.addEventListener("click", function () {
      navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
        .then(function (sub) {
          if (!sub) return refresh();
          var ep = sub.endpoint;
          return sub.unsubscribe().then(function () {
            return MM.account.removePushSubscription(ep);
          }).then(function () { status.textContent = tx("Abgeschaltet.", "Turned off."); refresh(); });
        });
    });
    card.appendChild(btn); card.appendChild(offBtn); card.appendChild(status);
    refresh();
  }

  /* ------------- Renderer ------------- */
  function render(root, p) {
    track("iphone_setup_opened");
    root.appendChild(el("p", "s-sub", tx(
      "MaleMetrix bleibt die Quelle der Wahrheit — dein iPhone zeigt den Plan dort an, wo du ohnehin hinschaust. Alles ist einzeln wählbar, nichts wird ungefragt eingerichtet.",
      "MaleMetrix stays the source of truth — your iPhone shows the plan where you already look. Everything is optional, nothing is set up unasked.")));

    /* 1 — Kalender */
    var cal = el("div", "s-card");
    cal.appendChild(el("h3", null, tx("1 · Trainings- & Wochenplanung im Kalender", "1 · Training & weekly schedule in your calendar")));
    cal.appendChild(el("p", "hint", tx(
      "Nur echte Zeitblöcke: Training, Einkauf, Meal-Prep, Wochencheck, Fotos, Abschlussmessung — keine Mahlzeiten, keine Gesundheitsdaten.",
      "Only real time blocks: training, groceries, meal prep, weekly check, photos, final measurement — no meals, no health data.")));

    // 1a: Abo-Feed (Konto nötig)
    var feedWrap = el("div");
    var saved = MM.store.get("simple_calfeed", null);
    function renderFeed() {
      feedWrap.innerHTML = "";
      var signedIn = false;
      try { signedIn = !!(MM.account && MM.account.getDashboardState && MM.account.getDashboardState().user); } catch (e) {}
      if (saved && saved.webcalUrl) {
        var a = el("a", "btn btn-primary btn-sm", tx("Kalender abonnieren (öffnet Kalender-App)", "Subscribe (opens Calendar app)"));
        a.href = saved.webcalUrl;
        a.addEventListener("click", function () { track("calendar_subscribe_started"); });
        feedWrap.appendChild(a);
        feedWrap.appendChild(copyBtn(tx("HTTPS-Link kopieren", "Copy HTTPS link"), function () { return saved.httpsUrl; }));
        var rev = el("button", "btn btn-ghost btn-sm", tx("Zugriff widerrufen", "Revoke access"));
        rev.style.marginLeft = "8px";
        rev.addEventListener("click", function () {
          MM.account.invokeFunction("mm-plan-ics", { action: "revoke" }).then(function () {
            MM.store.remove("simple_calfeed"); saved = null; renderFeed();
          });
        });
        feedWrap.appendChild(rev);
        feedWrap.appendChild(el("p", "hint", tx(
          "Der Feed aktualisiert sich bei Plananpassungen von selbst (Apple prüft periodisch). Widerrufen macht die URL sofort ungültig; danach kannst du neu abonnieren.",
          "The feed updates itself after plan adjustments (Apple polls periodically). Revoking invalidates the URL immediately; you can subscribe again afterwards.")));
      } else if (signedIn) {
        var mk = el("button", "btn btn-primary btn-sm", tx("Persönlichen Kalender-Feed erzeugen", "Create your personal calendar feed"));
        mk.addEventListener("click", function () {
          mk.disabled = true; mk.textContent = "…";
          MM.account.invokeFunction("mm-plan-ics", { action: "create" }).then(function (r) {
            if (r && r.ok && r.data && r.data.webcalUrl) {
              saved = { webcalUrl: r.data.webcalUrl, httpsUrl: r.data.httpsUrl };
              MM.store.set("simple_calfeed", saved);
              track("calendar_feed_created");
            } else {
              alert(tx("Feed konnte nicht erzeugt werden — bitte später erneut versuchen.", "Could not create the feed — please try again later."));
            }
            renderFeed();
          });
        });
        feedWrap.appendChild(mk);
        feedWrap.appendChild(el("p", "hint", tx(
          "Die Feed-URL enthält einen zufälligen, jederzeit widerrufbaren Schlüssel — nie deine E-Mail oder Nutzer-ID.",
          "The feed URL contains a random, revocable key — never your email or user ID.")));
      } else {
        feedWrap.appendChild(el("p", "hint", tx(
          "Für den automatisch aktuellen Abo-Kalender brauchst du ein (kostenloses) Konto — sonst kann der Feed deinen Plan nicht kennen. Ohne Konto funktioniert der Datei-Download darunter.",
          "The auto-updating subscription needs a (free) account — otherwise the feed cannot know your plan. Without an account, use the file download below.")));
      }
    }
    renderFeed();
    cal.appendChild(feedWrap);

    // 1b: ICS-Download (immer verfügbar)
    var dl = el("button", "btn btn-ghost btn-sm", tx("Kalenderdatei (.ics) herunterladen", "Download calendar file (.ics)"));
    dl.style.marginTop = "10px";
    dl.addEventListener("click", function () {
      var txt = MMSimple.ics.build(p, { lang: en() ? "en" : "de", now: new Date().toISOString() });
      var blob = new Blob([txt], { type: "text/calendar" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "malemetrix-plan.ics";
      document.body.appendChild(a); a.click(); a.remove();
      track("calendar_export_done");
    });
    cal.appendChild(el("div")).appendChild(dl);
    cal.appendChild(el("p", "hint", tx(
      "Hinweis: Die Datei ist ein einmaliger Schnappschuss — bei Plananpassungen lädst du sie neu (oder nutzt den Abo-Feed).",
      "Note: the file is a one-time snapshot — after plan adjustments download it again (or use the subscription feed).")));
    root.appendChild(cal);

    /* 2 — PWA */
    var pwa = el("div", "s-card");
    pwa.appendChild(el("h3", null, tx("2 · MaleMetrix als App auf dem Home-Bildschirm", "2 · MaleMetrix as an app on your home screen")));
    if (isStandalone()) {
      pwa.appendChild(el("p", null, tx("✓ Läuft bereits als installierte App.", "✓ Already running as an installed app.")));
    } else if (isIos()) {
      pwa.appendChild(el("p", "hint", tx(
        "In Safari: <strong>Teilen</strong> (Quadrat mit Pfeil) → <strong>Zum Home-Bildschirm</strong> → <strong>Hinzufügen</strong>. Danach öffnet MaleMetrix wie eine App — offlinefähig.",
        "In Safari: <strong>Share</strong> (square with arrow) → <strong>Add to Home Screen</strong> → <strong>Add</strong>. MaleMetrix then opens like an app — works offline.")));
      var help = el("button", "btn btn-ghost btn-sm", tx("Schritt-für-Schritt anzeigen", "Show step by step"));
      help.addEventListener("click", function () {
        track("pwa_help_opened");
        alert(tx("1) Diese Seite in Safari öffnen\n2) Teilen-Symbol unten in der Mitte tippen\n3) 'Zum Home-Bildschirm' wählen\n4) 'Hinzufügen' bestätigen",
          "1) Open this page in Safari\n2) Tap the Share icon (bottom center)\n3) Choose 'Add to Home Screen'\n4) Confirm 'Add'"));
      });
      pwa.appendChild(help);
    } else {
      pwa.appendChild(el("p", "hint", tx(
        "Auf dem iPhone: Seite in Safari öffnen → Teilen → Zum Home-Bildschirm. (Dieses Gerät ist kein iPhone — die Anleitung gilt dort.)",
        "On the iPhone: open this page in Safari → Share → Add to Home Screen. (This device is not an iPhone — the steps apply there.)")));
    }
    root.appendChild(pwa);

    /* 3 — Benachrichtigungen (Server-Push, seit 06.08.2026 aktiv) */
    var push = el("div", "s-card");
    push.appendChild(el("h3", null, tx("3 · Benachrichtigungen", "3 · Notifications")));
    renderPushSection(push);
    root.appendChild(push);

    /* 4 — Einkaufsliste */
    var shop = el("div", "s-card");
    shop.appendChild(el("h3", null, tx("4 · Einkaufsliste teilen oder kopieren", "4 · Share or copy the shopping list")));
    shop.appendChild(el("p", "hint", tx("Abhaken bleibt in MaleMetrix (Mein Plan → Einkauf); Teilen/Kopieren z. B. in Nachrichten oder Notizen.", "Ticking off stays in MaleMetrix (My plan → Shopping); share/copy e.g. into Messages or Notes.")));
    var listFn = function () { return MMSimple.engine.shoppingListText(MMSimple.engine.shoppingList(p.nutrition), en() ? "en" : "de"); };
    shop.appendChild(copyBtn(tx("Liste kopieren", "Copy list"), listFn, "shopping_copied"));
    var sb = shareBtn(tx("Liste teilen", "Share list"), listFn, "shopping_shared");
    if (sb) shop.appendChild(sb);
    root.appendChild(shop);

    /* 5 — Erinnerungen (EHRLICHER Fallback) */
    var rem = el("div", "s-card");
    rem.appendChild(el("h3", null, tx("5 · Apple Erinnerungen", "5 · Apple Reminders")));
    rem.appendChild(el("p", "hint", tx(
      "Eine Website kann keine Erinnerungen direkt in deine Erinnerungen-App schreiben — das behaupten wir auch nicht. Stattdessen: Übersicht kopieren und die wenigen wiederkehrenden Erinnerungen einmalig manuell anlegen (2 Minuten).",
      "A website cannot write directly into your Reminders app — and we don't pretend it can. Instead: copy the overview and create the few recurring reminders manually once (2 minutes).")));
    rem.appendChild(copyBtn(tx("Erinnerungs-Übersicht kopieren", "Copy reminder overview"), function () { return reminderText(p); }, "reminders_copied"));
    var rs = shareBtn(tx("Teilen", "Share"), function () { return reminderText(p); }, null);
    if (rs) rem.appendChild(rs);
    root.appendChild(rem);

    /* 6 — Notizen */
    var notes = el("div", "s-card");
    notes.appendChild(el("h3", null, tx("6 · Planübersicht für Apple Notizen", "6 · Plan overview for Apple Notes")));
    notes.appendChild(el("p", "hint", tx(
      "Kompakte Kurzfassung (Woche, Training, Mahlzeitenoptionen, Unterwegs-Regeln) — über Teilen in Notizen sichern. Der Teilen-Dialog speichert erst, wenn DU dort bestätigst.",
      "Compact summary (week, training, meal options, on-the-go rules) — save via Share into Notes. The share sheet only saves once YOU confirm there.")));
    notes.appendChild(copyBtn(tx("Kurzfassung kopieren", "Copy summary"), function () { return notesText(p); }, "notes_copied"));
    var ns = shareBtn(tx("In Notizen teilen", "Share to Notes"), function () { return notesText(p); }, "notes_shared");
    if (ns) notes.appendChild(ns);
    root.appendChild(notes);
  }

  MMSimple.iphone = { render: render, reminderText: reminderText, notesText: notesText };
})();
