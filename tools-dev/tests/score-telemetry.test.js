/* ==========================================================================
   MALEMETRIX — SCORE-TELEMETRIE & ERGEBNIS-FEEDBACK: Datenschutz- und
   Verhaltenstests (Phase 12).

   Diese Suite friert die Versprechen ein, die auf dem Einwilligungsschirm
   stehen. Sie prüft die ECHTEN Module:
     js/score-telemetry.js                      (Client, in jsdom-artigem Shim)
     supabase/functions/score-telemetry/validate.mjs  (Server-Validierung)
     tools-dev/score-calibration.mjs            (Auswertung)

   Kernaussagen:
     · ohne Einwilligung wird NICHTS gesendet
     · Antworten, Laborwerte, Substanzen, Status, Name, E-Mail werden NIE
       übertragen — auch nicht, wenn ein Aufrufer sie mitgibt
     · Telemetriefehler brechen den Score nicht
     · keine Doppel-Events bei Zurück-Navigation/Reload
     · Abschluss feuert genau einmal

   Ausführen:  node tools-dev/tests/score-telemetry.test.js
   ========================================================================== */
"use strict";
var path = require("path");
var fs = require("fs");
var ROOT = path.resolve(__dirname, "../..");

var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }

/* ------------------------------------------------------------- Browser-Shim */

function makeEnv(opts) {
  opts = opts || {};
  var store = {};
  var listeners = {};
  var sent = [];
  var g = {
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { if (opts.storageFull) throw new Error("QuotaExceeded"); store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    innerWidth: opts.width || 390,
    crypto: { getValues: null },
    MM_CONFIG: {
      supabaseUrl: opts.noEndpoint ? "" : "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_TEST"
    },
    addEventListener: function (n, f) { (listeners[n] = listeners[n] || []).push(f); },
    setTimeout: function (fn) { fn(); return 0; },        // im Test synchron: Flush sofort
    clearTimeout: function () {},
    navigator: {
      sendBeacon: function (url, blob) { sent.push({ via: "beacon", url: url, blob: blob }); return !opts.beaconFails; }
    },
    fetch: function (url, init) {
      sent.push({ via: "fetch", url: url, init: init });
      if (opts.networkFails) return Promise.reject(new Error("offline"));
      return Promise.resolve({ ok: !opts.serverError, status: opts.serverError ? 500 : 200 });
    }
  };
  var seed = 1;
  g.crypto.getRandomValues = function (arr) { for (var i = 0; i < arr.length; i++) arr[i] = (seed = (seed * 31 + i * 7 + 13) % 251); return arr; };
  g.window = g;
  g.document = {
    addEventListener: function (n, f) { (listeners[n] = listeners[n] || []).push(f); },
    visibilityState: "visible"
  };
  g._sent = sent;
  g._store = store;
  g._fire = function (name) { (listeners[name] || []).forEach(function (f) { f(); }); };
  return g;
}

function loadClient(env) {
  var code = fs.readFileSync(path.join(ROOT, "js/score-telemetry.js"), "utf8");
  var vm = require("vm");
  vm.createContext(env);
  vm.runInContext(code, env);
  return env.MM.telemetry;
}

/* ===================================================================== 1 */
group("1 · Ohne Einwilligung wird nichts gesendet und nichts gespeichert");
(function () {
  var env = makeEnv();
  var T = loadClient(env);
  ok(T.consent() === false, "Standard ist: KEINE Einwilligung (Opt-in, nicht Opt-out)");
  var r = T.track("score_started", { question_index: 1, visible_question_count: 50 });
  ok(r === false, "track() ohne Einwilligung liefert false");
  ok(T._queue().length === 0, "nichts landet in der Warteschlange");
  T.flush();
  ok(env._sent.length === 0, "es geht keine einzige Anfrage raus");

  T.setConsent(true);
  T.track("score_started", { question_index: 1, visible_question_count: 50 });
  ok(T._queue().length === 1, "nach Einwilligung wird gepuffert");

  T.setConsent(false);
  ok(T._queue().length === 0, "Widerruf löscht die Warteschlange sofort");
  ok(T.track("score_completed", {}) === false, "nach Widerruf wird wieder nichts erfasst");
})();

/* ===================================================================== 2 */
group("2 · Keine Antworten, keine Gesundheitsdaten — auch nicht auf Zuruf");
(function () {
  var env = makeEnv();
  var T = loadClient(env);
  T.setConsent(true);
  /* Ein fehlerhafter Aufrufer versucht, den halben Score mitzugeben. */
  var ev = T._build("score_completed", {
    question_index: 12,
    perf_status: "enhanced",                       // Status: darf NIE raus
    enh_categories: ["testosterone", "oral"],      // Substanzen
    lab_known: ["apob", "haematokrit"],            // Laborkategorien
    waist: 104, weight: 98, height: 180, age: 41,  // Körpermaße
    drv_libido: "niedrig", drv_morning: "fast_nie", // Sexualität
    trt_fertility: "ja",                            // Fertilität
    redflags: ["brust"],                            // Symptome
    name: "Max Mustermann", email: "max@example.com",
    answers: { goal_pain: "bauch" },
    comment: "Ich nehme seit 2 Jahren...",          // Freitext
    result_mode: "cut"
  });
  var keys = Object.keys(ev);
  var forbidden = ["perf_status", "enh_categories", "lab_known", "waist", "weight", "height", "age",
    "drv_libido", "drv_morning", "trt_fertility", "redflags", "name", "email", "answers", "comment"];
  forbidden.forEach(function (k) { ok(keys.indexOf(k) < 0, "Feld '" + k + "' ist NICHT im Event"); });
  ok(ev.question_index === 12 && ev.result_mode === "cut", "erlaubte Felder kommen sauber durch");
  var json = JSON.stringify(ev);
  ok(!/Mustermann|example\.com|testosterone|haematokrit|bauch|2 Jahren/.test(json),
    "im gesamten Event-JSON steht kein einziger sensibler Wert");
  ok(T._fields.indexOf("perf_status") < 0 && T._fields.indexOf("status") < 0,
    "die Whitelist kennt überhaupt kein Statusfeld");
  ok(!/user_agent|userAgent|navigator\.userAgent/.test(fs.readFileSync(path.join(ROOT, "js/score-telemetry.js"), "utf8")),
    "kein User-Agent im Client-Code (Gerätekasse kommt aus der Viewport-Breite)");
})();

/* ===================================================================== 3 */
group("3 · Unbekannte Event-Namen und kaputte Werte werden verworfen");
(function () {
  var env = makeEnv();
  var T = loadClient(env);
  T.setConsent(true);
  ok(T._build("beliebiges_event", {}) === null, "unbekannter Event-Name ⇒ kein Event");
  ok(T.track("beliebiges_event", {}) === false, "… und track() meldet false");
  var ev = T._build("score_started", { question_index: -5, completion_percentage: 999, device_classx: "x" });
  ok(ev.question_index === undefined, "negativer Index wird verworfen");
  ok(ev.completion_percentage === undefined, "Prozentwert außerhalb 0..100 wird verworfen");
  ok(["mobile", "tablet", "desktop"].indexOf(ev.device_class) >= 0, "Gerätekasse ist eine der drei erlaubten");
  var ev2 = T._build("score_cta_clicked", { cta_id: "cta_protokoll<script>" });
  ok(ev2.cta_id === undefined, "CTA-ID mit Sonderzeichen wird verworfen (kein Freitextkanal)");
})();

/* ===================================================================== 4 */
group("4 · Deduplizierung: Zurück-Navigation, Reload und Rerender zählen nicht doppelt");
(function () {
  var env = makeEnv();
  var T = loadClient(env);
  T.setConsent(true);
  T.startAttempt();
  ok(T.trackOnce("sec_in_goal", "score_section_entered", { section_id: "goal" }) === true, "erster Eintritt zählt");
  ok(T.trackOnce("sec_in_goal", "score_section_entered", { section_id: "goal" }) === false, "zweiter Eintritt (zurück) zählt nicht");
  ok(T.trackOnce("sec_in_goal", "score_section_entered", { section_id: "goal" }) === false, "dritter (Rerender) auch nicht");
  ok(T._queue().length === 1, "genau ein Event in der Warteschlange");

  /* Reload: neues Modul-Load, gleicher Attempt aus dem Speicher */
  var T2 = loadClient(env);
  ok(T2.trackOnce("sec_in_goal", "score_section_entered", { section_id: "goal" }) === false,
    "auch nach Reload bleibt der Abschnitt als gezählt erkannt");
  ok(T2.trackOnce("completed", "score_completed", {}) === true, "Abschluss feuert einmal");
  ok(T2.trackOnce("completed", "score_completed", {}) === false, "Abschluss feuert kein zweites Mal");
  var completions = T2._queue().filter(function (x) { return x.e.event_name === "score_completed"; });
  ok(completions.length === 1, "genau EIN score_completed in der Warteschlange");

  var idBefore = T2.attemptId();
  T2.startAttempt();
  ok(T2.attemptId() !== idBefore, "ein neuer Versuch bekommt eine neue Zufalls-ID");
  ok(T2.trackOnce("completed", "score_completed", {}) === true, "… und darf wieder genau einmal abschließen");
})();

/* ===================================================================== 5 */
group("5 · Telemetriefehler brechen den Score nie");
(function () {
  var envs = [
    ["Netzwerk offline", makeEnv({ networkFails: true })],
    ["Server 500", makeEnv({ serverError: true })],
    ["kein Endpunkt konfiguriert", makeEnv({ noEndpoint: true })],
    ["localStorage voll/blockiert", makeEnv({ storageFull: true })]
  ];
  envs.forEach(function (pair) {
    var name = pair[0], env = pair[1];
    var threw = false;
    try {
      var T = loadClient(env);
      T.setConsent(true);
      T.track("score_started", { question_index: 1 });
      T.trackOnce("completed", "score_completed", {});
      T.flush();
      env._fire("pagehide");
    } catch (e) { threw = true; }
    ok(!threw, name + ": kein Fehler dringt nach oben durch");
  });

  /* Kein Retry-Sturm: nach mehreren Fehlschlägen wird aufgehört. */
  var env2 = makeEnv({ networkFails: true });
  var T2 = loadClient(env2);
  T2.setConsent(true);
  for (var i = 0; i < 12; i++) {
    T2.track("score_section_entered", { section_id: "goal" });
    env2._fire("pagehide");
  }
  ok(env2._sent.length <= 12, "die Zahl der Sendeversuche bleibt gedeckelt (" + env2._sent.length + ")");
})();

/* ===================================================================== 6 */
group("6 · Warteschlange bleibt gedeckelt, Events werden nicht ewig wiederholt");
(function () {
  var env = makeEnv();
  var T = loadClient(env);
  T.setConsent(true);
  for (var i = 0; i < 120; i++) T.track("score_section_entered", { section_id: "goal" });
  ok(T._queue().length <= 40, "höchstens 40 Events werden vorgehalten (" + T._queue().length + ")");
  var raw = env._store["mm_score_tel_q"] || "";
  ok(raw.length < 32000, "die Warteschlange bleibt klein genug für localStorage (" + raw.length + " Zeichen)");
})();

/* ===================================================================== 7 */
group("7 · Transport: erlaubte Ziele, richtige Kopfzeilen, keine Nutzdaten in der URL");
(function () {
  var env = makeEnv();
  var T = loadClient(env);
  T.setConsent(true);
  T.track("score_started", { question_index: 1, visible_question_count: 50 });
  T.flush();
  var f = env._sent.filter(function (s) { return s.via === "fetch"; })[0];
  ok(!!f, "es wird gesendet, sobald eingewilligt wurde");
  ok(/\/functions\/v1\/score-telemetry$/.test(f.url), "Ziel ist die eigene Edge Function (kein Drittanbieter): " + f.url);
  ok(f.init.method === "POST" && f.init.keepalive === true, "POST mit keepalive (blockiert die UX nicht)");
  ok(f.init.headers.apikey === "sb_publishable_TEST", "öffentlicher Publishable Key im Header (kein Secret im Client)");
  var body = JSON.parse(f.init.body);
  ok(Array.isArray(body.events) && body.events.length === 1, "Body enthält die Event-Liste");
  ok(!/plausible|google|facebook|segment|mixpanel/i.test(fs.readFileSync(path.join(ROOT, "js/score-telemetry.js"), "utf8")),
    "kein Drittanbieter-Analytics im Score-Telemetrie-Modul");
})();

/* ===================================================================== 8 */
group("8 · Serverseitige Allowlist (validate.mjs) — die verbindliche Grenze");
(function () {
  var V = require(path.join(ROOT, "supabase/functions/score-telemetry/validate.mjs"));
  var base = {
    event_id: "a1b2c3d4e5f60718", score_session_id: "0f1e2d3c4b5a6978",
    event_name: "score_completed", score_version: "v2", client_ts: new Date().toISOString()
  };
  var clean = V.validateEvent(Object.assign({}, base, {
    perf_status: "enhanced", enh_categories: ["oral"], answers: { a: 1 },
    email: "max@example.com", note: "freitext", waist: 104,
    result_mode: "cut", primary_bottleneck_id: "cardiovascular",
    assessment_confidence: "limited", data_gap_count: 5
  }));
  ok(!!clean, "gültiges Event wird angenommen");
  ["perf_status", "enh_categories", "answers", "email", "note", "waist"].forEach(function (k) {
    ok(!(k in clean), "Server verwirft '" + k + "'");
  });
  ok(clean.result_mode === "cut" && clean.primary_bottleneck_id === "cardiovascular",
    "erlaubte Ergebnis-Kategorien bleiben erhalten");

  ok(V.validateEvent(Object.assign({}, base, { event_name: "beliebig" })) === null, "unbekannter Event-Name ⇒ null");
  ok(V.validateEvent(Object.assign({}, base, { event_id: "kurz" })) === null, "zu kurze event_id ⇒ null");
  ok(V.validateEvent(Object.assign({}, base, { score_session_id: "max@example.com" })) === null,
    "E-Mail als Session-ID ⇒ null (nur Hex erlaubt)");
  ok(V.validateEvent(Object.assign({}, base, { score_version: "v1" })) === null, "fremde Score-Version ⇒ null");
  ok(V.validateEvent(Object.assign({}, base, { section_id: "geheim_frei_text_123" })) &&
     V.validateEvent(Object.assign({}, base, { section_id: "geheim_frei_text_123" })).section_id === undefined,
    "unbekannte Abschnitts-ID wird verworfen, das Event bleibt gültig");

  var batch = V.validateBatch({ events: [Object.assign({}, base), Object.assign({}, base)] });
  ok(batch.events.length === 1 && batch.rejected === 1, "doppelte event_id im Batch wird dedupliziert");
  ok(V.validateBatch({ events: [] }).error === "no_events", "leerer Batch ⇒ Fehlercode");
  ok(V.validateBatch({ events: new Array(60).fill(base) }).error === "too_many_events", "zu großer Batch ⇒ Fehlercode");
  ok(V.validateBatch("kein objekt").error === "bad_body", "kaputter Body ⇒ Fehlercode");

  var farFuture = V.validateEvent(Object.assign({}, base, { client_ts: "2099-01-01T00:00:00.000Z" }));
  ok(farFuture && farFuture.client_ts === null, "unplausibler Client-Zeitstempel wird verworfen (Serverzeit gilt)");

  var reasons = V.validateEvent(Object.assign({}, base, {
    event_name: "score_result_feedback_submitted", feedback_rating: "partial",
    feedback_reason_codes: ["bottleneck_wrong", "erfundener_grund", "too_long", "bottleneck_wrong"]
  }));
  ok(reasons.feedback_rating === "partial", "Feedback-Bewertung wird übernommen");
  ok(JSON.stringify(reasons.feedback_reason_codes) === '["bottleneck_wrong","too_long"]',
    "nur bekannte Gründe, ohne Dubletten: " + JSON.stringify(reasons.feedback_reason_codes));
})();

/* ===================================================================== 9 */
group("9 · Datenbankschema kennt keine Spalte für sensible Daten");
(function () {
  var sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/20260725000010_score_telemetry.sql"), "utf8");
  ok(/create table if not exists public\.score_events/.test(sql), "Tabelle score_events wird angelegt");
  ok(/enable row level security/.test(sql), "RLS ist aktiviert");
  ok(/revoke all on public\.score_events from anon, authenticated/.test(sql), "anon/authenticated haben keinerlei Rechte");
  ok(!/create policy/i.test(sql), "es gibt bewusst KEINE Policy — reine Server-Tabelle");
  ok(/event_id\s+text not null unique/.test(sql), "event_id ist unique (Idempotenz)");
  /* Spaltendefinition = Name + Typ. (SQL-COMMENT-Anweisungen sind keine Spalten.) */
  ["answers", "raw_answers", "comment", "free_text", "note", "email", "user_id",
   "ip_address", "ip", "user_agent", "perf_status", "status", "waist", "weight",
   "lab_values", "substances"].forEach(function (bad) {
    var col = new RegExp("^\\s+" + bad + "\\s+(text|int|bigint|jsonb|json|uuid|timestamptz|boolean|numeric|text\\[\\])", "mi");
    ok(!col.test(sql), "keine Spalte '" + bad + "'");
  });
  ok(/score_events_bottleneck_chk/.test(sql) && /score_events_mode_chk/.test(sql),
    "CHECK-Constraints als zweite Allowlist vorhanden");
})();

/* ==================================================================== 10 */
group("10 · Kalibrierungsbericht rechnet aus echten Events");
(function () {
  var mod = require(path.join(ROOT, "tools-dev/score-calibration.mjs"));
  var ev = function (o) { return Object.assign({ score_version: "v2" }, o); };
  var events = [
    ev({ score_session_id: "aa", event_name: "score_started", route_length_bucket: "common" }),
    ev({ score_session_id: "aa", event_name: "score_section_entered", section_id: "goal" }),
    ev({ score_session_id: "aa", event_name: "score_section_completed", section_id: "goal" }),
    ev({ score_session_id: "aa", event_name: "score_section_entered", section_id: "blood" }),
    ev({ score_session_id: "aa", event_name: "score_completed", elapsed_seconds: 300, visible_question_count: 50, route_length_bucket: "common" }),
    ev({ score_session_id: "aa", event_name: "score_result_feedback_submitted", feedback_rating: "partial", feedback_reason_codes: ["too_long"] }),
    ev({ score_session_id: "aa", event_name: "score_cta_clicked", cta_id: "cta_protokoll" }),
    ev({ score_session_id: "bb", event_name: "score_started", route_length_bucket: "common" }),
    ev({ score_session_id: "bb", event_name: "score_section_entered", section_id: "goal" }),
    ev({ score_session_id: "bb", event_name: "score_section_entered", section_id: "cardiometabolic" })
  ];
  var r = mod.buildReport(events);
  ok(r.score_started === 2 && r.score_completed === 1, "Starts 2 / Abschlüsse 1");
  ok(r.completion_rate === 50, "Abschlussquote 50 %");
  ok(r.median_duration_seconds === 300, "Median-Dauer 300 s");
  ok(r.avg_visible_questions === 50, "Ø sichtbare Fragen 50");
  var drop = r.sections.filter(function (s) { return s.section_id === "cardiometabolic"; })[0];
  ok(drop && drop.inferred_dropoff === 1, "Abbruch wird dem zuletzt betretenen Abschnitt zugeordnet");
  ok(r.feedback.total === 1 && r.feedback.partial === 1, "Feedback wird gezählt");
  ok(r.feedback.top_reasons[0][0] === "too_long", "häufigster Grund wird benannt");
  ok(r.cta_clicks[0][0] === "cta_protokoll", "CTA-Verteilung wird gebildet");
  ok(r.route_length.common.started === 2 && r.route_length.common.completed === 1, "Abschluss nach Routenlänge");
  var src = fs.readFileSync(path.join(ROOT, "tools-dev/score-calibration.mjs"), "utf8");
  ok(!/sb_secret|service_role_key\s*=\s*["']/i.test(src), "kein Schlüssel im Skript hinterlegt");
  ok(/SUPABASE_SERVICE_ROLE_KEY/.test(src) && /TROCKENLAUF/.test(src),
    "Schlüssel kommt aus der Umgebung; ohne ihn läuft nur ein Trockenlauf");
})();

/* ==================================================================== 11 */
group("11 · Einwilligung im Score-UI: optional, nicht vorangehakt, ehrlich beschriftet");
(function () {
  var html = fs.readFileSync(path.join(ROOT, "check.html"), "utf8");
  ok(/id="consentTelemetry"/.test(html), "die Statistik-Einwilligung existiert als eigene Checkbox");
  var box = html.split('id="consentTelemetry"')[0].split("<label").pop() + html.split('id="consentTelemetry"')[1].split("</label>")[0];
  ok(!/id="consentTelemetry"[^>]*checked/.test(html), "sie ist NICHT vorangehakt");
  ok(!/id="consentTelemetry"[^>]*required/.test(html), "sie ist NICHT Pflicht — der Score läuft auch ohne");
  ok(/Keine Antworten, keine Blutwerte, keine Substanzen, kein Status/.test(html),
    "der Text sagt ausdrücklich, was NICHT übertragen wird");
  ok(/nicht an uns übertragen/.test(html), "das Kernversprechen zu den Antworten steht weiterhin da");
  ok(/score-telemetry\.js/.test(html), "das Telemetrie-Modul ist eingebunden");
  var js = fs.readFileSync(path.join(ROOT, "js/check.js"), "utf8");
  ok(/setConsent\(telBox\.checked\)/.test(js), "die Checkbox steuert die Einwilligung wirklich");
  ok(/telOnce\("completed", "score_completed"/.test(js), "Abschluss läuft über die Einmal-Variante");
  ok(!/tel\((?:'|")score_(started|completed)/.test(js), "Start und Abschluss nutzen nie die Mehrfach-Variante");
})();

/* ==================================================================== 12 */
group("12 · Touch-Target: „Ergebnis senden“ erfüllt 44 px");
(function () {
  var css = fs.readFileSync(path.join(ROOT, "css/style.css"), "utf8");
  ok(/#emailForm \.btn[\s\S]{0,60}min-height:\s*44px/.test(css),
    "CSS garantiert mindestens 44 px für den Absende-Button");
  ok(/#emailForm input\s*\{[^}]*min-height:\s*44px|#emailForm input \{ min-height: 44px|#emailForm \.btn,\s*\n#emailForm input \{ min-height: 44px; \}/.test(css),
    "… und für die Eingabefelder daneben");
  var js = fs.readFileSync(path.join(ROOT, "js/check.js"), "utf8");
  ok(/id="btnSendResult"[^>]*class="btn btn-primary"|class="btn btn-primary" id="btnSendResult"/.test(js),
    "der Button bleibt ein vollwertiger .btn (kein .btn-sm mit kleinerem Padding)");
  ok(/id="fbSubmit"[^>]*min-height:44px/.test(js), "auch der Feedback-Button hält 44 px ein");
})();

/* ==================================================================== 13 */
group("13 · Score-Logik unverändert (Freeze-Nachweis)");
(function () {
  global.window = {};
  require(path.join(ROOT, "js/check-data.js"));
  var C = global.window.MM_CHECK;
  ok(C.allSteps.length === 87, "unverändert 87 Fragen in der Bank (" + C.allSteps.length + ")");
  ok(C.domainKeys.length === 12, "unverändert 12 Kern-Domains");
  var w = C.domainMeta;
  ok(w.cardiovascular.w === 11 && w.sleep.w === 11 && w.bodyComposition.w === 12 && w.dataQuality.w === 10,
    "Domain-Gewichte unverändert");
  ok(C.MODIFIERS.length === 2, "unverändert genau zwei Kontextmodifikatoren");
  var telemetryTouchesEngine = /MM\.telemetry|score-telemetry/.test(fs.readFileSync(path.join(ROOT, "js/check-data.js"), "utf8"));
  ok(!telemetryTouchesEngine, "die Engine (check-data.js) weiß nichts von Telemetrie — keine Vermischung");
  var freeze = fs.readFileSync(path.join(ROOT, "SCORE_V2_CALIBRATION.md"), "utf8");
  ok(/CALIBRATION FREEZE/.test(freeze) && /Regressionstest/.test(freeze), "der Freeze ist dokumentiert und fordert Regressionstests");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
