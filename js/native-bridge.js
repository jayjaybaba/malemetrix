/* native-bridge.js — verbindet die bestehende Weboberflaeche mit der nativen
   iOS-App (Capacitor). Wird NUR im App-Bundle geladen (scripts/build-app.mjs)
   und tut im normalen Browser nachweislich nichts.

   Grundsatz wie im restlichen Projekt (§21): keine Zustaende vortaeuschen.
   Was die App wirklich kann, wird angeboten; was sie nicht kann, wird
   weggelassen statt beschoenigt.

   Aufgaben:
   1. Plattform erkennen und dem Rest der App bekannt machen (MM.native)
   2. Statusleiste, Splash, sichere Bereiche
   3. Links, die nicht im App-Bundle liegen, im Systembrowser oeffnen
   4. Erinnerungen ueber lokale Mitteilungen (ohne Server, ohne Konto) */
(function () {
  "use strict";

  var C = window.Capacitor;
  var isNative = !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
  var MM = (window.MM = window.MM || {});

  MM.native = {
    isApp: isNative,
    platform: isNative ? C.getPlatform() : "web"
  };

  if (!isNative) return;

  var P = (C.Plugins || {});
  document.documentElement.classList.add("is-native-app", "is-native-" + MM.native.platform);

  function track(ev, props) { try { if (MM.track) MM.track(ev, props); } catch (e) {} }
  function en() { return !!(MM.i18n && MM.i18n.lang === "en"); }
  function tx(de, enTxt) { return en() ? (enTxt || de) : de; }

  /* ---------- 1 · Systemoberflaeche ---------------------------------- */
  try {
    if (P.StatusBar) {
      P.StatusBar.setStyle({ style: "DARK" });          // helle Schrift auf dunklem Grund
      if (MM.native.platform === "android") P.StatusBar.setBackgroundColor({ color: "#070A0F" });
    }
  } catch (e) {}

  window.addEventListener("load", function () {
    try { if (P.SplashScreen) P.SplashScreen.hide(); } catch (e) {}
  });

  /* ---------- 2 · Links nach draussen --------------------------------
     Im Bundle liegt nur die Produktflaeche. Verweise auf Seiten, die dort
     nicht liegen, wuerden ins Leere laufen — sie gehen in den Systembrowser.
     Kaufseiten sind bewusst ausgenommen: eine iOS-App darf nicht an der
     App-Store-Abrechnung vorbei auf einen Shop verlinken (Richtlinie 3.1.1);
     solche Verweise werden entfernt statt umgeleitet. */
  var BUNDLED = ["index.html", "meinplan.html", "transformation.html", "check.html",
    "tools.html", "tracker.html", "impressum.html", "datenschutz.html", "agb.html"];
  var COMMERCE = /(^|\/)(shop|checkout|ebooks?|kurs|kurs-programm|coaching|termin|protokoll|mein-protokoll|anabole-matrix)\.html/i;
  var SITE = "https://www.malemetrix.com/";

  function openExternal(url) {
    try {
      if (P.Browser) { P.Browser.open({ url: url, presentationStyle: "popover" }); return true; }
    } catch (e) {}
    return false;
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || /^(mailto|tel|webcal|javascript):/i.test(href)) return;

    // Absolute fremde URL -> Systembrowser
    if (/^https?:\/\//i.test(href)) {
      if (href.indexOf(SITE) !== 0 && openExternal(href)) ev.preventDefault();
      return;
    }
    var page = href.replace(/^\.\//, "").split("#")[0].split("?")[0];
    if (!page || BUNDLED.indexOf(page) !== -1) return;      // im Bundle: normal navigieren
    if (COMMERCE.test(page)) { ev.preventDefault(); return; } // bewusst kein Kauf-Ausgang
    ev.preventDefault();
    openExternal(SITE + href.replace(/^\.\//, ""));
  }, true);

  /* Kauf-Elemente, die im App-Bundle keinen Sinn ergeben, ausblenden statt
     ins Leere zeigen zu lassen. */
  window.addEventListener("DOMContentLoaded", function () {
    var sel = 'a[href*="shop.html"], a[href*="checkout.html"], a[href*="ebooks.html"], a[href*="coaching.html"]';
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (a) {
      if (a.closest) { var li = a.closest("li"); if (li) { li.hidden = true; return; } }
      a.hidden = true;
    });
  });

  /* ---------- 3 · Haptik bei der App-Navigation ----------------------- */
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest(".s-nav a, .btn-primary") : null;
    if (!t) return;
    try { if (P.Haptics) P.Haptics.impact({ style: "LIGHT" }); } catch (e) {}
  });

  /* ---------- 4 · Erinnerungen (lokale Mitteilungen) ------------------
     In der App braucht es keinen Web-Push und kein Konto: iOS plant die
     Mitteilungen selbst, die Daten bleiben auf dem Geraet. */
  var NOTIF_KEY = "native_reminders";           // MM.store-Key -> mm_native_reminders
  var ID_DAILY = 4101, ID_WEEKLY = 4102;

  // MM.store kommt aus js/main.js und ist erst nach dessen Laden da; diese
  // Bruecke laeuft frueher (damit MM.native.isApp beim Rendern feststeht).
  var FALLBACK = { on: false, hour: 7, minute: 0 };
  function settings() {
    if (!MM.store) return FALLBACK;
    return MM.store.get(NOTIF_KEY, FALLBACK);
  }
  function saveSettings(v) { if (MM.store) MM.store.set(NOTIF_KEY, v); }

  function schedule(cfg) {
    if (!P.LocalNotifications) return Promise.reject(new Error("LocalNotifications fehlt"));
    return P.LocalNotifications.cancel({ notifications: [{ id: ID_DAILY }, { id: ID_WEEKLY }] })
      .catch(function () {})
      .then(function () {
        if (!cfg.on) return null;
        return P.LocalNotifications.schedule({
          notifications: [
            {
              id: ID_DAILY,
              title: tx("Dein Tag steht", "Your day is set"),
              body: tx("Oeffne MaleMetrix — heute ist dran, was im Plan steht.",
                "Open MaleMetrix — today's step is in your plan."),
              schedule: { on: { hour: cfg.hour, minute: cfg.minute }, allowWhileIdle: true }
            },
            {
              id: ID_WEEKLY,
              title: tx("Wochencheck", "Weekly check"),
              body: tx("5 Minuten: Gewicht, Umsetzung, Anpassung fuer die neue Woche.",
                "5 minutes: weight, adherence, adjustment for the new week."),
              schedule: { on: { weekday: 1, hour: 18, minute: 0 }, allowWhileIdle: true }
            }
          ]
        });
      });
  }

  /**
   * Ersetzt im Abschnitt „Benachrichtigungen" den Web-Push-Teil durch die
   * native Variante. Wird von js/simple/iphone.js aufgerufen, wenn die App
   * nativ laeuft. Gibt true zurueck, wenn der Abschnitt bedient wurde.
   */
  MM.native.renderNotifications = function (card, helpers) {
    var el = helpers.el;
    if (!P.LocalNotifications) {
      card.appendChild(el("p", "hint", tx("Mitteilungen stehen in dieser App-Version nicht zur Verfuegung.",
        "Notifications are not available in this app version.")));
      return true;
    }
    var cfg = settings();
    card.appendChild(el("p", "hint", tx(
      "Zwei Erinnerungen, mehr nicht: morgens dein Tagesschritt, montags der Wochencheck. Geplant von deinem iPhone selbst — kein Server, kein Konto, keine Daten nach draussen.",
      "Two reminders, nothing else: your daily step in the morning, the weekly check on Mondays. Scheduled by your iPhone itself — no server, no account, no data leaving the device.")));

    var row = el("div", "s-row");
    var time = document.createElement("input");
    time.type = "time";
    time.className = "s-input";
    time.value = String(cfg.hour).padStart(2, "0") + ":" + String(cfg.minute).padStart(2, "0");
    time.setAttribute("aria-label", tx("Uhrzeit der Morgen-Erinnerung", "Time of the morning reminder"));
    row.appendChild(time);
    card.appendChild(row);

    var status = el("p", "hint");
    var btn = el("button", "btn btn-primary btn-sm");
    var offBtn = el("button", "btn btn-ghost btn-sm", tx("Abschalten", "Turn off"));
    offBtn.style.marginLeft = "8px";

    function paint() {
      var s = settings();
      btn.textContent = s.on ? tx("Aktiv ✓", "Active ✓") : tx("Erinnerungen einschalten", "Turn on reminders");
      btn.disabled = !!s.on;
      offBtn.style.display = s.on ? "" : "none";
    }

    btn.addEventListener("click", function () {
      btn.disabled = true; btn.textContent = "…";
      P.LocalNotifications.requestPermissions().then(function (res) {
        if (!res || res.display !== "granted") {
          status.textContent = tx("iOS hat die Erlaubnis nicht erteilt — in den iPhone-Einstellungen unter MaleMetrix > Mitteilungen erlauben.",
            "iOS did not grant permission — allow it in iPhone Settings > MaleMetrix > Notifications.");
          paint(); return null;
        }
        var parts = (time.value || "07:00").split(":");
        var next = { on: true, hour: parseInt(parts[0], 10) || 7, minute: parseInt(parts[1], 10) || 0 };
        return schedule(next).then(function () {
          saveSettings(next);
          track("native_reminders_enabled", { hour: next.hour });
          status.textContent = tx("Eingeschaltet ✓", "Turned on ✓");
          paint();
        });
      }).catch(function (e) {
        // Ehrlich bleiben: nichts als aktiv anzeigen, was nicht geplant wurde.
        status.textContent = String((e && e.message) || e);
        saveSettings({ on: false, hour: cfg.hour, minute: cfg.minute });
        paint();
      });
    });

    offBtn.addEventListener("click", function () {
      var s = settings(); s.on = false;
      schedule(s).catch(function () {}).then(function () {
        saveSettings(s);
        track("native_reminders_disabled");
        status.textContent = tx("Abgeschaltet.", "Turned off.");
        paint();
      });
    });

    time.addEventListener("change", function () {
      var s = settings();
      if (!s.on) return;
      var parts = (time.value || "07:00").split(":");
      s.hour = parseInt(parts[0], 10) || 7; s.minute = parseInt(parts[1], 10) || 0;
      schedule(s).then(function () { saveSettings(s); status.textContent = tx("Uhrzeit gespeichert ✓", "Time saved ✓"); });
    });

    card.appendChild(btn);
    card.appendChild(offBtn);
    card.appendChild(status);
    paint();
    return true;
  };

  /* Nach einem Neustart der App die Planung auffrischen (iOS behaelt geplante
     Mitteilungen zwar, aber nach Sprach- oder Zeitwechsel sollen sie stimmen).
     Erst wenn MM.store steht (js/main.js ist dann geladen). */
  window.addEventListener("DOMContentLoaded", function () {
    try {
      var s0 = settings();
      if (s0.on) schedule(s0).catch(function () {});
    } catch (e) {}
  });
})();
