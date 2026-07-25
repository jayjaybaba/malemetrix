/* ==========================================================================
   MaleMetrix — SCORE-TELEMETRIE (first-party, datenminimierend)
   --------------------------------------------------------------------------
   ZWECK: verstehen, wo Männer im Score aussteigen, wie lange er dauert und
   ob das Ergebnis als zutreffend empfunden wird. NICHT: ein zweites
   Gesundheitsdaten-Lager aufbauen.

   HARTE REGELN (im Code erzwungen, nicht nur dokumentiert):

   1. OHNE EINWILLIGUNG WIRD NICHTS GESENDET.
      Die Einwilligung ist eine eigene, optionale Checkbox im Score-Consent.
      Ohne sie läuft der Score vollständig — nur eben ohne Statistik.

   2. ANTWORTEN VERLASSEN DAS GERÄT NIE.
      Gesendet werden ausschließlich Felder aus FIELD_RULES (Whitelist).
      Alles andere wird verworfen — auch wenn ein späterer Aufrufer es
      versehentlich mitgibt. Es gibt kein Freitextfeld.

   3. KEIN STATUS, KEINE LABORWERTE, KEINE SUBSTANZEN, KEINE SYMPTOME.
      Der Natural/TRT/Enhanced-Wert wird bewusst NICHT übertragen.

   4. TELEMETRIE DARF DEN SCORE NIE BREMSEN ODER BRECHEN.
      Asynchron, fehlertolerant, gedeckelte Warteschlange, kein Retry-Sturm,
      keine Fehlermeldung an den Nutzer.

   Transport: eigene Supabase Edge Function `score-telemetry` (Origin-
   Allowlist, serverseitige Zweitvalidierung). Kein Drittanbieter.
   ========================================================================== */

(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  var CFG = window.MM_CONFIG || {};
  var SCORE_VERSION = "v2";

  /* ------------------------------------------------------------ SPEICHER */
  var K_CONSENT = "mm_consent_telemetry";
  var K_QUEUE   = "mm_score_tel_q";
  var K_ATTEMPT = "mm_score_attempt";

  function readJSON(key, fb) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fb; }
    catch (e) { return fb; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* voll/blockiert */ }
  }

  /* ---------------------------------------------------------- EINWILLIGUNG */

  function consentGranted() {
    var c = readJSON(K_CONSENT, null);
    return !!(c && c.granted === true);
  }
  function setConsent(granted) {
    writeJSON(K_CONSENT, { v: 1, granted: !!granted, ts: new Date().toISOString() });
    if (!granted) { try { localStorage.removeItem(K_QUEUE); } catch (e) {} }
  }

  /* ------------------------------------------------------ SCORE-ATTEMPT-ID
     Zufällig, nicht aus E-Mail/Konto/Score abgeleitet, pro Score-Versuch.
     Sie taugt nicht als Werbe-ID: sie wird beim nächsten Versuch ersetzt. */

  function randomId() {
    try {
      var b = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(b);
      return Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    } catch (e) {
      return String(Date.now()) + Math.random().toString(16).slice(2, 14);
    }
  }

  function attempt() { return readJSON(K_ATTEMPT, null); }

  function startAttempt() {
    var a = { id: randomId(), started: Date.now(), sent: {}, v: SCORE_VERSION };
    writeJSON(K_ATTEMPT, a);
    return a;
  }
  function ensureAttempt() { return attempt() || startAttempt(); }
  function endAttempt() { try { localStorage.removeItem(K_ATTEMPT); } catch (e) {} }

  function elapsedSeconds() {
    var a = attempt();
    if (!a || !a.started) return null;
    var s = Math.round((Date.now() - a.started) / 1000);
    /* Ausreißer (Tab tagelang offen) fliegen raus statt die Statistik zu kippen. */
    return (s >= 0 && s <= 7200) ? s : null;
  }

  /* Deterministische Deduplizierung: jedes „einmal pro Versuch"-Ereignis
     merkt sich seinen Schlüssel im Attempt. Zurück-Navigation, Reload,
     Rerender und doppelte Callbacks erzeugen dadurch keine Doppel-Events. */
  function onceKey(key) {
    var a = ensureAttempt();
    if (a.sent && a.sent[key]) return false;
    a.sent = a.sent || {};
    a.sent[key] = 1;
    writeJSON(K_ATTEMPT, a);
    return true;
  }

  /* ------------------------------------------------------------- SCHEMA */

  var EVENTS = [
    "score_started", "score_section_entered", "score_section_completed",
    "score_progress_checkpoint", "score_completed", "score_result_viewed",
    "score_result_feedback_submitted", "score_cta_clicked",
    "score_email_result_opened", "score_email_result_submitted",
    "score_resumed"
  ];

  var ENUM = {
    device_class: ["mobile", "tablet", "desktop"],
    route_length_bucket: ["common", "short_adaptive", "medium_adaptive", "long_adaptive"],
    feedback_rating: ["yes", "partial", "no"],
    result_mode: ["cut", "recomp", "build", "perform", "health_first"],
    assessment_confidence: ["high", "moderate", "limited"],
    completion_duration_bucket: ["lt3m", "3to6m", "6to10m", "gt10m"],
    primary_bottleneck_id: [
      "bodyComposition", "training", "movement", "sleep", "recovery", "nutrition",
      "metabolic", "cardiovascular", "hormonal", "energy", "dataQuality", "execution",
      "enhancedControl", "therapyControl", "recoveryStatus"
    ]
  };

  var FEEDBACK_REASONS = [
    "bottleneck_wrong", "mode_wrong", "too_generic", "context_missing",
    "reasoning_unclear", "too_long", "other"
  ];

  /* Whitelist: Feldname → Validator. Was hier nicht steht, wird NIE gesendet. */
  var FIELD_RULES = {
    section_id:                function (v) { return slug(v, 40); },
    question_index:            function (v) { return int(v, 0, 200); },
    visible_question_count:    function (v) { return int(v, 0, 200); },
    completion_percentage:     function (v) { return int(v, 0, 100); },
    elapsed_seconds:           function (v) { return int(v, 0, 7200); },
    device_class:              function (v) { return oneOf(v, ENUM.device_class); },
    route_length_bucket:       function (v) { return oneOf(v, ENUM.route_length_bucket); },
    result_mode:               function (v) { return oneOf(v, ENUM.result_mode); },
    primary_bottleneck_id:     function (v) { return oneOf(v, ENUM.primary_bottleneck_id); },
    assessment_confidence:     function (v) { return oneOf(v, ENUM.assessment_confidence); },
    completion_duration_bucket: function (v) { return oneOf(v, ENUM.completion_duration_bucket); },
    data_gap_count:            function (v) { return int(v, 0, 40); },
    feedback_rating:           function (v) { return oneOf(v, ENUM.feedback_rating); },
    feedback_reason_codes:     function (v) { return codes(v, FEEDBACK_REASONS, 7); },
    cta_id:                    function (v) { return slug(v, 40); }
  };

  function int(v, lo, hi) {
    var n = parseInt(v, 10);
    if (!isFinite(n) || n < lo || n > hi) return undefined;
    return n;
  }
  function oneOf(v, list) { return list.indexOf(String(v)) >= 0 ? String(v) : undefined; }
  function slug(v, max) {
    var s = String(v == null ? "" : v).trim().slice(0, max);
    return /^[a-z0-9_]+$/i.test(s) ? s : undefined;   // keine Freitexte, keine Sonderzeichen
  }
  function codes(v, list, max) {
    if (!Array.isArray(v)) return undefined;
    var out = [];
    v.forEach(function (x) { if (list.indexOf(String(x)) >= 0 && out.indexOf(String(x)) < 0) out.push(String(x)); });
    return out.length ? out.slice(0, max) : undefined;
  }

  /* Gerätekasse ausschließlich aus der Viewport-Breite — kein User-Agent,
     kein Fingerprint, keine IP-Ableitung im Client. */
  function deviceClass() {
    var w = window.innerWidth || 0;
    return w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  }

  function routeBucket(count) {
    var n = parseInt(count, 10);
    if (!isFinite(n) || n <= 0) return undefined;
    if (n <= 50) return "common";
    if (n <= 56) return "short_adaptive";
    if (n <= 61) return "medium_adaptive";
    return "long_adaptive";
  }

  function durationBucket(sec) {
    var n = parseInt(sec, 10);
    if (!isFinite(n) || n < 0) return undefined;
    if (n < 180) return "lt3m";
    if (n < 360) return "3to6m";
    if (n < 600) return "6to10m";
    return "gt10m";
  }

  /* ------------------------------------------------------------- QUEUE */

  var MAX_QUEUE = 40;
  var MAX_ATTEMPTS = 3;
  var failuresThisLoad = 0;
  var MAX_FAILURES_PER_LOAD = 3;
  var flushing = false;

  function queue() { var q = readJSON(K_QUEUE, []); return Array.isArray(q) ? q : []; }
  function saveQueue(q) { writeJSON(K_QUEUE, q.slice(-MAX_QUEUE)); }

  function endpoint() {
    var base = CFG.supabaseUrl;
    if (!base) return null;
    return String(base).replace(/\/+$/, "") + "/functions/v1/score-telemetry";
  }
  function apiKey() { return CFG.supabasePublishableKey || CFG.supabaseAnonKey || ""; }

  /* ------------------------------------------------------------- SENDEN */

  function buildEvent(name, fields) {
    if (EVENTS.indexOf(name) < 0) return null;
    var a = ensureAttempt();
    var ev = {
      event_id: randomId(),
      score_session_id: a.id,
      event_name: name,
      score_version: SCORE_VERSION,
      client_ts: new Date().toISOString(),
      device_class: deviceClass()
    };
    var src = fields || {};
    Object.keys(FIELD_RULES).forEach(function (k) {
      if (!(k in src)) return;
      var clean = FIELD_RULES[k](src[k]);
      if (clean !== undefined) ev[k] = clean;
    });
    if (ev.elapsed_seconds === undefined) {
      var el = elapsedSeconds();
      if (el !== null) ev.elapsed_seconds = el;
    }
    return ev;
  }

  function track(name, fields) {
    try {
      if (!consentGranted()) return false;
      var ev = buildEvent(name, fields);
      if (!ev) return false;
      var q = queue();
      q.push({ e: ev, n: 0 });
      saveQueue(q);
      scheduleFlush();
      return true;
    } catch (e) { return false; }   // Telemetrie darf NIE nach oben werfen
  }

  /* Einmal-pro-Versuch-Variante (Dedup über den Attempt-Zustand). */
  function trackOnce(key, name, fields) {
    try {
      if (!consentGranted()) return false;
      if (!onceKey(key)) return false;
      return track(name, fields);
    } catch (e) { return false; }
  }

  var flushTimer = null;
  function scheduleFlush(immediate) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, immediate ? 0 : 1200);
  }

  function flush(useBeacon) {
    if (flushing) return;
    if (!consentGranted()) return;
    if (failuresThisLoad >= MAX_FAILURES_PER_LOAD) return;   // kein Netzwerk-Sturm
    var url = endpoint();
    if (!url) return;
    var q = queue();
    if (!q.length) return;

    var batch = q.slice(0, MAX_QUEUE);
    var payload = JSON.stringify({ v: 1, events: batch.map(function (x) { return x.e; }) });

    if (useBeacon && navigator.sendBeacon) {
      /* Beim Verlassen der Seite: kein Preflight, deshalb text/plain und
         der Publishable Key als Query-Parameter (öffentlich, kein Secret). */
      var ok = false;
      try {
        ok = navigator.sendBeacon(url + "?apikey=" + encodeURIComponent(apiKey()),
          new Blob([payload], { type: "text/plain;charset=UTF-8" }));
      } catch (e) { ok = false; }
      if (ok) saveQueue(q.slice(batch.length));
      return;
    }

    flushing = true;
    var done = function (ok) {
      flushing = false;
      var rest = queue();
      if (ok) {
        saveQueue(rest.slice(batch.length));
      } else {
        failuresThisLoad++;
        /* Nach MAX_ATTEMPTS Versuchen werden Events verworfen — die
           Warteschlange darf nicht ewig wachsen. */
        var kept = rest.map(function (x, i) {
          if (i < batch.length) x.n = (x.n || 0) + 1;
          return x;
        }).filter(function (x) { return (x.n || 0) < MAX_ATTEMPTS; });
        saveQueue(kept);
      }
    };

    try {
      fetch(url, {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json", "apikey": apiKey() },
        body: payload
      }).then(function (r) { done(r && r.ok); }).catch(function () { done(false); });
    } catch (e) { done(false); }
  }

  /* Beim Verlassen/Verstecken der Seite: letzte Chance, ohne UX-Kosten. */
  function onLeave() { try { flush(true); } catch (e) {} }
  window.addEventListener("pagehide", onLeave);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") onLeave();
  });

  /* ------------------------------------------------------------ PUBLIC API */

  MM.telemetry = {
    version: SCORE_VERSION,
    consent: consentGranted,
    setConsent: setConsent,
    startAttempt: startAttempt,
    endAttempt: endAttempt,
    attemptId: function () { var a = attempt(); return a ? a.id : null; },
    elapsedSeconds: elapsedSeconds,
    routeBucket: routeBucket,
    durationBucket: durationBucket,
    deviceClass: deviceClass,
    track: track,
    trackOnce: trackOnce,
    flush: function () { scheduleFlush(true); },
    /* Nur für Tests/Diagnose — zeigt, WAS gesendet würde. */
    _build: buildEvent,
    _queue: queue,
    _events: EVENTS,
    _fields: Object.keys(FIELD_RULES),
    _reasons: FEEDBACK_REASONS
  };

  /* Reste aus einer früheren Sitzung nachliefern (einmalig, still). */
  if (consentGranted() && queue().length) scheduleFlush();
})();
