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
group("11 · Score-Einstieg ohne Wand — Nutzungsmessung erst NACH dem Ergebnis");
(function () {
  var html = fs.readFileSync(path.join(ROOT, "check.html"), "utf8");
  var js = fs.readFileSync(path.join(ROOT, "js/check.js"), "utf8");

  /* Der Einstieg ist frei: keine Checkbox, keine Bestätigungswand. */
  ok(!/type="checkbox"/.test(html), "check.html enthält KEINE einzige Checkbox mehr");
  ok(!/id="checkConsent"/.test(html), "die Einwilligungs-Sektion ist entfernt");
  ok(!/id="btnConsentNext"/.test(html), "der gesperrte „Verstanden“-Button ist weg");
  ok(!/id="consentTelemetry"/.test(html), "die Statistik-Abfrage steht nicht mehr vor dem Score");
  ok(!/\bdisabled\b/.test(html.split('id="btnStartCheck"')[1].split(">")[0] || ""),
    "der Start-Button ist nicht deaktiviert");
  ok(/id="btnStartCheck"/.test(html) && /SCORE STARTEN/.test(html), "es gibt genau einen klaren Start-Button");
  ok(/ersetzt keine medizinische Diagnose oder ärztliche Beratung/.test(html),
    "genau ein untergeordneter Hinweissatz bleibt stehen");
  ok((html.match(/ersetzt keine medizinische Diagnose/g) || []).length === 1,
    "… und zwar nur einmal, nicht als Warnblock");
  ok(/score-telemetry\.js/.test(html), "das Telemetrie-Modul ist weiterhin eingebunden");
  ok(/addEventListener\("click", startScore\)/.test(js), "der Start-Button startet den Score direkt");
  ok(!/show\("checkConsent"\)/.test(js), "kein Code führt mehr auf eine Einwilligungs-Sektion");

  /* Die Messung wird erst im Ergebnis angeboten — standardmäßig AUS. */
  ok(/id="scoreOptin"/.test(js), "die Nutzungsmessung erscheint als Modul auf der Ergebnisseite");
  ok(/MALEMETRIX VERBESSERN/.test(js), "kompaktes Modul mit klarer Überschrift");
  ok(/Es werden keine Antworten oder Gesundheitsdaten übertragen/.test(js),
    "der kurze Text sagt, was NICHT übertragen wird");
  ok(/aria-checked="false"/.test(js), "der Schalter startet sichtbar auf AUS");
  ok(/role="switch"/.test(js), "korrekte Semantik für den Schalter");
  ok(/t\.setConsent\(!cur\)/.test(js), "der Schalter kippt die Einwilligung in beide Richtungen (an UND aus)");
  ok(js.indexOf('id="scoreOptin"') > js.indexOf('id="scoreFeedback"'),
    "das Modul steht nach dem Ergebnisinhalt, nicht davor");

  ok(/telOnce\("completed", "score_completed"/.test(js), "Abschluss läuft über die Einmal-Variante");
  ok(!/tel\((?:'|")score_(started|completed)/.test(js), "Start und Abschluss nutzen nie die Mehrfach-Variante");
})();

/* ==================================================================== 11b */
group("11b · Navigation: kein toter „System“-Eintrag mehr");
(function () {
  var htmlFiles = [];
  (function walk(dir) {
    fs.readdirSync(dir).forEach(function (f) {
      if (f === "node_modules" || f === ".git" || f === "tools-dev") return;
      var p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".html")) htmlFiles.push(p);
    });
  })(ROOT);
  ok(htmlFiles.length > 20, htmlFiles.length + " HTML-Seiten geprüft");

  var offenders = htmlFiles.filter(function (f) {
    return /<a href="(?:\.\.\/)*index\.html#system"/.test(fs.readFileSync(f, "utf8"));
  });
  ok(offenders.length === 0, "kein einziger „System“-Navigationslink mehr (Desktop, Mobil, Footer): " +
    (offenders.length ? offenders.join(", ") : "0 Treffer"));

  var i18n = fs.readFileSync(path.join(ROOT, "js/i18n.js"), "utf8");
  ok(!/"nav\.system"/.test(i18n), "die verwaiste Übersetzung nav.system ist entfernt");

  /* Die verbleibenden Hauptnavigationspunkte müssen echte Ziele haben. */
  var nav = fs.readFileSync(path.join(ROOT, "check.html"), "utf8").split('class="main-nav"')[1].split("</nav>")[0];
  var hrefs = (nav.match(/href="([^"]+)"/g) || []).map(function (h) { return h.slice(6, -1); });
  ok(hrefs.length >= 5, hrefs.length + " Navigationsziele vorhanden");
  hrefs.forEach(function (h) {
    if (/^https?:/.test(h)) return;
    var file = h.split("#")[0];
    ok(!file || fs.existsSync(path.join(ROOT, file)), "Navigationsziel existiert: " + h);
  });
  ok(hrefs.every(function (h) { return h !== "#" && h !== ""; }), "kein leerer oder toter href in der Hauptnavigation");
})();

/* ==================================================================== 11c */
group("11c · My-Protokoll-Bottom-Navigation: sichtbar, bedienbar, korrekt aktiv");
(function () {
  var app = fs.readFileSync(path.join(ROOT, "js/os/app.js"), "utf8");
  var css = fs.readFileSync(path.join(ROOT, "css/os.css"), "utf8");
  var navFn = app.split("function navBar(")[1].split("\n  }")[0];

  ["today", "plan", "track", "progress", "learn"].forEach(function (v) {
    ok(new RegExp('\\["' + v + '"').test(navFn), "Navigationspunkt vorhanden: " + v);
    ok(new RegExp('VIEWS = \\[[^\\]]*"' + v + '"').test(app), "… und " + v + " ist eine gültige Route");
  });
  ok(/NAV_ICON/.test(app) && Object.keys({}).length === 0, "Icons sind Teil der Navigation");
  ok(/aria-current="page"/.test(navFn), "der aktive Punkt ist auch für Screenreader markiert");
  ok(/aria-label="Hauptnavigation"/.test(navFn), "die Navigation hat einen beschreibenden Namen");
  ok(/on = active === it\[0\]/.test(navFn), "aktiv ist genau das aktuelle Ziel — keine Heuristik, keine Fehltreffer");

  /* Sichtbarkeit statt Fußnotentext */
  var bar = css.split(".os-nav {")[1].split("}")[0];
  ok(/rgba\(10, 13, 19, 0\.92\)/.test(bar), "deckender Untergrund statt durchscheinender Fläche");
  ok(/min-height: 44px/.test(css.split(".os-nav a {")[1].split("}")[0]), "Touch-Ziel mindestens 44 px");

  var navMobile = css.split(".os-nav {").slice(1).join(".os-nav {").split("Typo-Drama")[0];
  ok(/background: #05070b/.test(navMobile), "mobil: deckend schwarze Bar");
  ok(/border-top: 1px solid rgba\(255, 255, 255, 0\.10\)/.test(navMobile), "mobil: sichtbare Trennkante nach oben");
  ok(/box-shadow: 0 -10px 30px/.test(navMobile), "mobil: zurückhaltender Schatten zur Abgrenzung");
  ok(/min-height: 50px/.test(navMobile), "mobil: Touch-Ziele über dem Minimum");
  ok(/z-index: 110/.test(navMobile), "z-index über dem Inhalt, aber unter Sheets (120) und Modals (200)");
  ok((css.match(/env\(safe-area-inset-bottom/g) || []).length >= 2, "Safe Area sowohl für die Bar als auch für den Inhaltsabstand");

  /* Aktiv-Zustand hängt nicht nur an der Farbe */
  ok(/\.os-nav a\.on::before/.test(css), "aktiver Punkt hat zusätzlich einen Linien-Indikator");
  ok(/\.os-nav a\.on \{[^}]*font-weight: 700/.test(css), "… und einen kräftigeren Schriftschnitt");
  ok(/\.os-nav a\.on \{[^}]*var\(--accent-2\)/.test(css), "… in Electric Cyan");
  ok(/color: #aeb8c7/.test(css), "inaktive Punkte bleiben klar lesbar (kein Fast-Unsichtbar)");
  ok(/\.os-nav a:focus-visible/.test(css), "sichtbarer Tastaturfokus");

  /* Inhalt wird nicht verdeckt — und der Abstand existiert genau einmal */
  ok(/\.os-shell \{[^}]*padding-bottom: 48px/.test(css), "Desktop: normaler Abstand ohne feste Bar");
  ok(/\.os-shell \{ padding-bottom: calc\(96px \+ env\(safe-area-inset-bottom/.test(css),
    "Mobil: genau ein Abstand für Barhöhe + Safe Area");
  ok((css.match(/padding-bottom: calc\(96px/g) || []).length === 1, "kein doppelter Bottom-Abstand");
})();

/* ==================================================================== 12 */
group("12 · Touch-Target: „Ergebnis senden“ erfüllt 44 px");
(function () {
  var css = fs.readFileSync(path.join(ROOT, "css/style.css"), "utf8");
  ok(/#scoreLead \.btn[\s\S]{0,120}min-height:\s*44px/.test(css),
    "CSS garantiert mindestens 44 px für den Absende-Button");
  ok(/#scoreLead input\[type="email"\][\s\S]{0,80}min-height:\s*44px/.test(css),
    "… und für die Eingabefelder daneben");
  var js = fs.readFileSync(path.join(ROOT, "js/check.js"), "utf8");
  ok(/class="btn btn-primary" id="scoreLeadSend"/.test(js),
    "der Button bleibt ein vollwertiger .btn (kein .btn-sm mit kleinerem Padding)");
  ok(/id="fbSubmit"[^>]*min-height:44px/.test(js), "auch der Feedback-Button hält 44 px ein");
})();

/* ==================================================================== 13 */
group("13 · Score-Logik unverändert (Freeze-Nachweis)");
(function () {
  global.window = {};
  require(path.join(ROOT, "js/check-data.js"));
  var C = global.window.MM_CHECK;
  /* Der Fragenbestand war auf 87 eingefroren. Nach dem ersten Testlauf mit
     einem echten Anwender hat der Betreiber acht Fragen ausdrücklich
     beauftragt (Vertiefung beim Ziel „gesünder werden") und den gesamten
     Sicherheits-Check gestrichen (87 + 8 − 1 = 94). Der Freeze schützt vor unbemerktem
     Wildwuchs, nicht vor beauftragten Änderungen — die Zahl wandert also
     mit, die Prüfung bleibt scharf. */
  ok(C.allSteps.length === 94, "Fragenbestand wie beauftragt: 94 (" + C.allSteps.length + ")");
  var healthdeep = C.modules.filter(function (m) { return m.id === "healthdeep"; })[0];
  ok(healthdeep && healthdeep.questions.length === 8, "die acht Vertiefungsfragen hängen an einem eigenen, bedingten Modul");
  ok(typeof healthdeep.when === "function" && !healthdeep.when({}) && healthdeep.when({ goal_main: ["gesundheit"] }),
    "sie erscheinen nur beim Gesundheitsziel — kein anderer Nutzer bekommt mehr Fragen");
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

/* ==================================================================== 14 */
group("14 · Rückkehr-Mechanik: Termin statt Newsletter");
(function () {
  var js = fs.readFileSync(path.join(ROOT, "js/check.js"), "utf8");
  ok(/id="scoreAgain"/.test(js), "Ergebnisseite bietet den nächsten Score an");
  ok(/DEINE ERGEBNISPRÜFUNG/.test(js), "eigener, klar benannter Block");
  ok(/getDate\(\) \+ 28/.test(js), "Vorschlag liegt bei 4 Wochen (Kalendertage statt Millisekunden)");
  ok(/BEGIN:VCALENDAR/.test(js) && /DTSTART;VALUE=DATE:/.test(js), "echter Kalendereintrag (.ics), ganztägig");
  ok(/BEGIN:VALARM/.test(js), "mit Erinnerung, damit der Termin nicht untergeht");
  ok(!/newsletter|mailchimp|brevo\.com\/subscribe/i.test(js.split("scoreAgain")[1].slice(0, 2000)),
    "keine E-Mail-Erfassung an dieser Stelle");
  ok(/cta_id: "rescore_reminder"/.test(js), "der Klick ist messbar — über die bestehende CTA-Kategorie, ohne neues Event");
  ok(/URL\.revokeObjectURL/.test(js), "die Blob-URL wird wieder freigegeben");

  /* Passiver Teil: alter Score wird beim Wiederkommen als fällig erkannt. */
  ok(/ageDays >= 28/.test(js), "ab 28 Tagen gilt ein gespeichertes Ergebnis als überholt");
  ok(/vor \" \+ \(ageDays/.test(js) || /vor "/.test(js), "das Alter wird dem Nutzer genannt, nicht verschwiegen");
  ok(/Zeit für den nächsten Score/.test(js), "ruhiger Hinweis statt Pop-up");
  ok(!/localStorage\.setItem\("mm_next_score/.test(js), "kein zusätzlicher Speicherschlüssel nötig — das Datum steckt im Ergebnis");
})();

/* ==================================================================== 15 */
group("15 · Positionierung: die vier Kontexte sind auch außerhalb des Scores sichtbar");
(function () {
  var idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  ok(/Natural, früher Enhanced, ärztliche TRT oder Enhanced/.test(idx),
    "Startseite benennt die vier Kontexte");
  ok(/kostet dich keinen einzigen Punkt/.test(idx), "… inklusive der entscheidenden Zusage");
  ok(/keine Dosierungen, keine Empfehlungen zu Substanzen/.test(idx),
    "… und der Grenze, die das Ganze seriös hält");
  ok(!/misst sieben Bereiche/.test(idx), "die überholte Sieben-Bereiche-Aussage ist weg");
  ok(/zwölf Optimierungsbereiche/.test(idx), "die Startseite beschreibt den tatsächlichen Score");
  ["Alltagsbewegung", "Herz-Kreislauf", "Datenlage", "Stoffwechsel"].forEach(function (d) {
    ok(new RegExp("<strong>" + d).test(idx), "System in der Übersicht: " + d);
  });

  var chk = fs.readFileSync(path.join(ROOT, "check.html"), "utf8");
  ok(/Natural, TRT & Enhanced/.test(chk), "Seitentitel trägt die Positionierung");
  ok(!/10-Minuten-Check/.test(chk), "die überholte 10-Minuten-Behauptung ist raus");
  ok(/12 Bereiche, dein primärer Engpass und deine Datenlücken/.test(chk), "Description beschreibt das echte Produkt");

  var faq = fs.readFileSync(path.join(ROOT, "faq.html"), "utf8");
  ok(/vier Kontexte/.test(faq), "FAQ erklärt die Kontexte");
  ok(/Dosierungen oder Absetzprotokollen/.test(faq), "FAQ zieht die Grenze ausdrücklich");
  ok(/Wie oft sollte ich den Score wiederholen/.test(faq), "FAQ erklärt den Wiederholungs-Rhythmus");
  ok(/gilt nicht als „normal“/.test(faq), "FAQ erklärt den Datenlücken-Gedanken");
})();

/* ==================================================================== 16 */
group("16 · Betriebs-Werkzeuge: Produktionsstand messen statt behaupten");
(function () {
  var chk = path.join(ROOT, "tools-dev/check-functions.sh");
  var dep = path.join(ROOT, "tools-dev/deploy-telemetry.sh");
  ok(fs.existsSync(chk), "check-functions.sh existiert");
  ok(fs.existsSync(dep), "deploy-telemetry.sh existiert");
  var c = fs.readFileSync(chk, "utf8"), d = fs.readFileSync(dep, "utf8");
  ok(/x-client-info/.test(c), "erkennt den P10-Stand am CORS-Header");
  ok(/send-brief/.test(c) && /bewusst nicht vorgesehen/.test(c),
    "die Scheduler-Function wird nicht fälschlich als veraltet gemeldet");
  ok(/SUPABASE_ACCESS_TOKEN/.test(d) && !/sbp_[A-Za-z0-9]{10}/.test(d),
    "Deploy-Skript verlangt den Token aus der Umgebung und enthält keinen");
  ok(/--verify-only/.test(d), "Nachprüfung ist auch einzeln aufrufbar");
  ok(/score-telemetry\.test\.js/.test(d), "vor dem Deploy laufen die Tests");

  var doc = fs.readFileSync(path.join(ROOT, "EDGE_FUNCTIONS.md"), "utf8");
  ok(/live nachgemessen/.test(doc), "die Statusmatrix sagt, woher ihr Wissen stammt");
  ok(!/NEIN — Live läuft noch der/.test(doc), "die überholte mm-commerce-Warnung ist korrigiert");
  /* 05.08.2026: score-telemetry ist deployt (check-functions.sh: AKTUELL).
     Vorher stand hier „genau eine Function ist noch offen" — die Doku darf
     jetzt KEINE Function mehr als nicht-deployt führen, und der Deploy-Nachweis
     muss in der score-telemetry-Zeile stehen, nicht nur behauptet sein. */
  ok((doc.match(/⚠️ \*\*NEIN/g) || []).length === 0, "keine Function steht mehr als nicht-deployt in der Matrix");
  ok(/score-telemetry[^\n]*JA — live nachgemessen/.test(doc), "der Deploy von score-telemetry ist mit Messdatum dokumentiert");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
