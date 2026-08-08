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
    platform: isNative ? C.getPlatform() : "web",
    /* Diese Datei liegt ausschliesslich im App-Bundle. Ihre blosse Anwesenheit
       ist damit der verlaessliche Hinweis „diese Seite kommt aus dem Bundle" —
       unabhaengig davon, ob Capacitor gerade antwortet. js/main.js registriert
       daraufhin keinen Service Worker: ein Cache im Bundle wuerde nach einem
       App-Store-Update die alte Fassung weiterliefern. */
    inBundle: true
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
  var KAUF_SEL = 'a[href*="shop.html"], a[href*="checkout.html"], a[href*="ebooks.html"], ' +
                 'a[href*="coaching.html"], a[href*="protokoll.html"], a[href*="kurs-programm.html"]';
  function kaufflaechenAusblenden(wurzel) {
    Array.prototype.forEach.call((wurzel || document).querySelectorAll(KAUF_SEL), function (a) {
      if (a.closest) { var li = a.closest("li"); if (li) { li.hidden = true; return; } }
      a.hidden = true;
    });
  }
  window.addEventListener("DOMContentLoaded", function () {
    kaufflaechenAusblenden(document);
    /* Einmal auf DOMContentLoaded reicht nicht: die Score-Seite baut ihr
       Ergebnis erst NACH dem Fragebogen zusammen, und genau dort standen
       zwei Angebotskarten mit Preisen. Ein Beobachter faengt auch das, was
       spaeter dazukommt. */
    try {
      var beob = new MutationObserver(function (eintraege) {
        eintraege.forEach(function (e) {
          Array.prototype.forEach.call(e.addedNodes || [], function (n) {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches(KAUF_SEL)) { n.hidden = true; return; }
            kaufflaechenAusblenden(n);
          });
        });
      });
      beob.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* ohne Beobachter greifen CSS und der Erstlauf */ }
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

  /* ---------- 5 · Apple Health ----------------------------------------
     Zweck: den geschaetzten Tagesverbrauch durch einen gemessenen ersetzen.
     Die Plausibilitaetspruefung liegt bewusst NICHT hier, sondern in
     MMSimple.engine.resolveTdee — an einer Stelle, getestet, fuer Web und
     App identisch. Diese Bruecke holt nur Zahlen und legt sie ab. */
  var HEALTH_KEY = "health_energy";      // -> mm_health_energy (gemessener TDEE)
  var TODAY_KEY  = "health_today";       // Tageswerte + Baseline fuer die Tagesentscheidung
  var STEPS_KEY  = "health_steps_by_day";// Schrittreihe fuer den Execution Score
  var H = P.Health;

  MM.native.health = {
    supported: !!H,

    /** Fragt die Berechtigung ab und liest danach sofort. */
    connect: function () {
      if (!H) return Promise.reject(new Error("Apple Health ist in dieser App-Version nicht eingebaut"));
      return H.requestAuthorization().then(function (r) {
        if (!r || !r.available) throw new Error("Apple Health ist auf diesem Geraet nicht verfuegbar");
        return MM.native.health.refresh();
      });
    },

    /**
     * Liest Tageswerte und Baseline und legt den gemessenen Verbrauch ab.
     * Gibt zurueck, was wirklich ankam — auch wenn nichts ankam. Apple sagt
     * aus Datenschutzgruenden nicht, ob Lesen erlaubt wurde; leere Daten und
     * verweigerte Erlaubnis sehen gleich aus und werden gleich behandelt.
     */
    refresh: function () {
      if (!H) return Promise.resolve(null);
      return Promise.all([H.today(), H.baseline()]).then(function (res) {
        var today = res[0] || {}, base = res[1] || {};
        var out = { today: today, baseline: base, stored: null };
        if (typeof base.tdee === "number" && base.tdee > 0) {
          var rec = {
            tdee: Math.round(base.tdee),
            days: base.tdeeDays || 0,
            source: "apple_health",
            readAt: new Date().toISOString()
          };
          if (MM.store) MM.store.set(HEALTH_KEY, rec);
          out.stored = rec;
        }
        if (!MM.store) return out;

        // Tageswerte fuer die Entscheidung von HEUTE. Ohne die Baseline daneben
        // waeren HRV und Ruhepuls bedeutungslos — 45 ms sind fuer den einen
        // gut und fuer den anderen schlecht.
        var ymd = new Date().toISOString().slice(0, 10);
        MM.store.set(TODAY_KEY, {
          date: ymd,
          sleepHours: today.sleepHours != null ? today.sleepHours : null,
          hrvMs: today.hrvMs != null ? today.hrvMs : null,
          restingHeartRate: today.restingHeartRate != null ? today.restingHeartRate : null,
          steps: today.steps != null ? today.steps : null,
          weightKg: today.weightKg != null ? today.weightKg : null,
          baselineHrv: base.hrvMs != null ? base.hrvMs : null,
          baselineRhr: base.restingHeartRate != null ? base.restingHeartRate : null
        });

        // Schrittreihe fuer den Execution Score. Zusammengefuehrt statt
        // ersetzt: aeltere Tage aus frueheren Abrufen bleiben erhalten.
        if (base.stepsByDay && typeof base.stepsByDay === "object") {
          var map = MM.store.get(STEPS_KEY, {}) || {};
          Object.keys(base.stepsByDay).forEach(function (d) { map[d] = base.stepsByDay[d]; });
          // Aelter als 60 Tage interessiert keine Entscheidung mehr.
          var keys = Object.keys(map).sort();
          while (keys.length > 60) { delete map[keys.shift()]; }
          MM.store.set(STEPS_KEY, map);
        }
        return out;
      });
    },

    /** Trennt: gespeicherte Messung verwerfen. Die Erlaubnis selbst kann nur
        der Nutzer in den iPhone-Einstellungen zuruecknehmen — das sagt die UI. */
    forget: function () {
      if (MM.store) {
        MM.store.remove(HEALTH_KEY);
        MM.store.remove(TODAY_KEY);
        MM.store.remove(STEPS_KEY);   // nichts halb liegen lassen
      }
      return Promise.resolve();
    },

    stored: function () { return MM.store ? MM.store.get(HEALTH_KEY, null) : null; }
  };

  /**
   * Rendert den Health-Abschnitt in „iPhone einrichten". Wird von
   * js/simple/iphone.js aufgerufen, wenn die App nativ laeuft.
   */
  MM.native.renderHealth = function (card, helpers) {
    var el = helpers.el;
    if (!H) {
      card.appendChild(el("p", "hint", tx("Diese App-Version hat die Apple-Health-Anbindung nicht.",
        "This app version does not include the Apple Health connection.")));
      return true;
    }
    card.appendChild(el("p", "hint", tx(
      "Ohne Health schaetzt MaleMetrix deinen Tagesverbrauch aus Groesse, Gewicht, Alter und einem Auswahlfeld. Mit Health nimmt es deinen gemessenen Verbrauch der letzten Tage — Aktiv- plus Grundumsatz von Uhr oder iPhone. Gelesen wird nur, was der Plan braucht; nichts verlaesst dein Geraet.",
      "Without Health, MaleMetrix estimates your daily burn from height, weight, age and a dropdown. With Health it uses your measured burn of the last days — active plus basal energy from your watch or iPhone. Only what the plan needs is read; nothing leaves your device.")));

    var status = el("p", "hint");
    var detail = el("div");
    var btn = el("button", "btn btn-primary btn-sm", tx("Mit Apple Health verbinden", "Connect Apple Health"));
    var offBtn = el("button", "btn btn-ghost btn-sm", tx("Messung verwerfen", "Discard measurement"));
    offBtn.style.marginLeft = "8px";

    function n(v, digits) { return typeof v === "number" && isFinite(v) ? v.toFixed(digits || 0) : null; }

    function paint(live) {
      detail.innerHTML = "";
      var rec = MM.native.health.stored();
      offBtn.style.display = rec ? "" : "none";
      if (!rec) {
        btn.textContent = tx("Mit Apple Health verbinden", "Connect Apple Health");
        btn.disabled = false;
      } else {
        btn.textContent = tx("Werte aktualisieren", "Refresh values");
        btn.disabled = false;
        var rows = [[tx("Gemessener Tagesverbrauch", "Measured daily burn"), rec.tdee + " kcal"],
                    [tx("Volle Messtage", "Full measured days"), String(rec.days)]];
        if (live && live.today) {
          var t = live.today;
          if (n(t.steps)) rows.push([tx("Schritte heute", "Steps today"), n(t.steps)]);
          if (n(t.sleepHours, 1)) rows.push([tx("Schlaf letzte Nacht", "Sleep last night"), n(t.sleepHours, 1) + " h"]);
          if (n(t.restingHeartRate)) rows.push([tx("Ruhepuls", "Resting heart rate"), n(t.restingHeartRate) + " bpm"]);
          if (n(t.hrvMs)) rows.push([tx("HRV", "HRV"), n(t.hrvMs) + " ms"]);
          if (n(t.weightKg, 1)) rows.push([tx("Gewicht (Health)", "Weight (Health)"), n(t.weightKg, 1) + " kg"]);
        }
        rows.forEach(function (r) {
          var p = el("p", "hint");
          p.textContent = r[0] + ": " + r[1];
          detail.appendChild(p);
        });
        if (rec.days < 5) {
          detail.appendChild(el("p", "hint", tx(
            "Unter 5 vollen Messtagen bleibt die Formel massgeblich — zu wenig Grundlage. Trage die Uhr ein paar Tage, dann hier aktualisieren.",
            "Below 5 full measured days the formula stays in charge — too little basis. Wear the watch for a few days, then refresh here.")));
        }
      }
    }

    btn.addEventListener("click", function () {
      btn.disabled = true; status.textContent = "…";
      MM.native.health.connect().then(function (r) {
        if (!r || !r.stored) {
          status.textContent = tx(
            "Verbunden, aber es kamen keine Verbrauchsdaten an. Entweder ist der Zugriff in Einstellungen > Datenschutz > Health noch nicht erlaubt, oder es liegen noch keine Tage vor.",
            "Connected, but no energy data arrived. Either access is not yet allowed in Settings > Privacy > Health, or there are no days recorded yet.");
        } else {
          status.textContent = tx("Verbunden ✓ — dein naechster Plan rechnet mit dem gemessenen Verbrauch.",
            "Connected ✓ — your next plan uses the measured burn.");
          track("health_connected", { days: r.stored.days });
        }
        paint(r);
      }).catch(function (e) {
        status.textContent = String((e && e.message) || e);
        paint(null);
      }).then(function () { btn.disabled = false; });
    });

    offBtn.addEventListener("click", function () {
      MM.native.health.forget().then(function () {
        track("health_forgotten");
        status.textContent = tx(
          "Verworfen — es gilt wieder die Schaetzformel. Die Health-Erlaubnis selbst nimmst du in Einstellungen > Datenschutz & Sicherheit > Health zurueck.",
          "Discarded — the estimate formula applies again. Revoke the Health permission itself in Settings > Privacy & Security > Health.");
        paint(null);
      });
    });

    card.appendChild(btn);
    card.appendChild(offBtn);
    card.appendChild(status);
    card.appendChild(detail);
    paint(null);
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
