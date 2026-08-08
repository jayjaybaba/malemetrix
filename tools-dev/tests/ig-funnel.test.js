/* ==========================================================================
   MALEMETRIX — INSTAGRAM-COMMENT-FUNNEL: Verhaltens- und Sicherheitstests.

   Diese Suite friert die Zusagen ein, deren Bruch ein Instagram-Konto kostet
   oder eine Abmahnung auslöst. Sie prüft die ECHTEN Module:
     supabase/functions/ig-webhook/funnel.mjs   (Entscheidungslogik)
     supabase/functions/ig-webhook/index.ts     (Transport, statisch geprüft)
     supabase/functions/ig-admin/index.ts       (Owner-Schranke, statisch)
     supabase/migrations/20260808000019_ig_comment_funnel.sql

   Kernaussagen:
     · Ohne gültige HMAC-Signatur wird nichts verarbeitet.
     · Der Funnel schweigt in der Voreinstellung — jede Prüfung kann nur
       verhindern, nie erlauben.
     · Ein Widerspruch (STOPP) ist endgültig und schlägt jedes Stichwort.
     · Dieselbe Person bekommt innerhalb der Sperrfrist keine zweite Nachricht.
     · Der Tagesdeckel hält, auch wenn 50 Kommentare gleichzeitig eintreffen.
     · Der Kommentartext wird nirgends gespeichert.
     · Es gibt keinen Code-Pfad, der Liker oder Follower anschreibt.

   Ausführen:  node tools-dev/tests/ig-funnel.test.js
   ========================================================================== */
"use strict";
var fs = require("node:fs");
var path = require("node:path");
var ROOT = path.resolve(__dirname, "../..");
var passed = 0, failed = 0;
function group(g) { console.log("\n== " + g + " =="); }
function ok(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } }
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }

var F = require(path.join(ROOT, "supabase/functions/ig-webhook/funnel.mjs"));
var WEBHOOK = read("supabase/functions/ig-webhook/index.ts");
var ADMIN = read("supabase/functions/ig-admin/index.ts");
var SQL = read("supabase/migrations/20260808000019_ig_comment_funnel.sql");
var TOML = read("supabase/config.toml");

/* Basiskontext: alles erlaubt. Jeder Test verbiegt genau EINE Sache und prüft,
   dass sie allein die Nachricht verhindert. */
var REGEL = { id: 1, keyword: "plan", match_mode: "contains", message: "Hier ist dein Plan: {link}", link_url: "https://www.malemetrix.com/check.html", priority: 100, is_default: false, active: true };
function ctx(over) {
  return Object.assign({
    active: true, isOwnComment: false, commentAgeDays: 0, commentWindowDays: 7,
    optedOut: false, rule: REGEL, lastDmAtMs: null, nowMs: 1770000000000,
    cooldownDays: 30, sentToday: 0, dailyCap: 40
  }, over || {});
}

/* ------------------------------------------------------------------ IG1 */
group("IG1 · Signaturprüfung — ohne sie ist der Webhook ein offenes Formular");
(function () {
  var body = JSON.stringify({ object: "instagram", entry: [] });
  var secret = "app-secret-xyz";

  return F.hmacSha256Hex(body, secret).then(function (hex) {
    return Promise.all([
      F.verifySignature(body, "sha256=" + hex, secret),
      F.verifySignature(body, "sha256=" + hex.replace(/.$/, hex.slice(-1) === "a" ? "b" : "a"), secret),
      F.verifySignature(body + " ", "sha256=" + hex, secret),
      F.verifySignature(body, "sha256=" + hex, ""),
      F.verifySignature(body, null, secret),
      F.verifySignature(body, hex, secret),
      F.verifySignature(body, "sha256=nichthex", secret)
    ]).then(function (r) {
      ok(r[0] === true, "gültige Signatur wird akzeptiert");
      ok(r[1] === false, "ein einziges verändertes Zeichen fliegt raus");
      ok(r[2] === false, "ein veränderter Body fliegt raus");
      ok(r[3] === false, "ohne konfiguriertes App-Secret wird NICHTS akzeptiert");
      ok(r[4] === false, "ohne Signatur-Header wird nichts akzeptiert");
      ok(r[5] === false, "Header ohne sha256=-Präfix wird abgelehnt");
      ok(r[6] === false, "Nicht-Hex im Header wird abgelehnt");

      ok(F.timingSafeEqual("abc", "abc") === true && F.timingSafeEqual("abc", "abd") === false,
        "der Vergleich ist konstant lang und korrekt");
      ok(F.timingSafeEqual("", "") === true && F.timingSafeEqual("a", "") === false,
        "unterschiedliche Längen sind nie gleich");
    });
  });
})();

/* ------------------------------------------------------------------ IG2 */
group("IG2 · Entscheidung — Schweigen ist die Voreinstellung");
(function () {
  ok(F.decide(ctx()).action === "send", "vollständig erfüllter Kontext sendet");

  ok(F.decide(ctx({ active: false })).action === "skipped_inactive",
    "Not-Aus schlägt alles — ein ausgeschalteter Funnel sendet nie");
  ok(F.decide(ctx({ isOwnComment: true })).action === "skipped_own",
    "der eigene Kommentar löst keine Antwort aus (sonst Endlosschleife)");
  ok(F.decide(ctx({ commentAgeDays: 8 })).action === "skipped_window",
    "jenseits von 7 Tagen wird gar nicht erst versucht");
  ok(F.decide(ctx({ commentAgeDays: 6.9 })).action === "send",
    "innerhalb des Fensters wird gesendet");
  ok(F.decide(ctx({ optedOut: true })).action === "skipped_optout",
    "Widerspruch verhindert die Nachricht");
  ok(F.decide(ctx({ rule: null })).action === "skipped_no_rule",
    "ohne passende Regel passiert nichts — kein Blind-Versand");
  ok(F.decide(ctx({ sentToday: 40, dailyCap: 40 })).action === "skipped_cap",
    "der Tagesdeckel greift exakt beim Erreichen, nicht erst danach");
  ok(F.decide(ctx({ sentToday: 39, dailyCap: 40 })).action === "send",
    "ein Platz unter dem Deckel sendet noch");
  ok(F.decide(ctx({ dailyCap: 0 })).action === "skipped_cap",
    "Deckel 0 heißt aus — nicht unbegrenzt");

  /* Reihenfolge ist Absicht: Widerspruch muss AUCH dann greifen, wenn der
     Kommentar ein Stichwort enthält, und der Not-Aus muss vor allem stehen. */
  ok(F.decide(ctx({ active: false, optedOut: true, rule: null })).action === "skipped_inactive",
    "der Not-Aus wird zuerst geprüft");
  ok(F.decide(ctx({ optedOut: true, rule: REGEL })).action === "skipped_optout",
    "Widerspruch schlägt ein passendes Stichwort");

  /* Sperrfrist pro Person: aus einer Automatisierung wird sonst Belästigung. */
  var tag = 86400000;
  ok(F.decide(ctx({ lastDmAtMs: 1770000000000 - 5 * tag })).action === "skipped_cooldown",
    "5 Tage nach der letzten Nachricht bleibt es bei 30 Tagen Sperrfrist still");
  ok(F.decide(ctx({ lastDmAtMs: 1770000000000 - 31 * tag })).action === "send",
    "nach Ablauf der Sperrfrist darf wieder gesendet werden");
  ok(F.decide(ctx({ lastDmAtMs: 1770000000000 - 5 * tag, cooldownDays: 0 })).action === "send",
    "Sperrfrist 0 schaltet die Prüfung bewusst ab");

  /* Das Fenster darf nie über Metas Grenze hinaus aufgemacht werden. */
  ok(F.decide(ctx({ commentAgeDays: 9, commentWindowDays: 30 })).action === "skipped_window",
    "eine zu große Einstellung wird auf 7 Tage gedeckelt, nicht übernommen");
  ok(F.MAX_COMMENT_WINDOW_DAYS === 7, "die Obergrenze steht als Konstante fest");
})();

/* ------------------------------------------------------------------ IG3 */
group("IG3 · Stichwort-Zuordnung");
(function () {
  var regeln = [
    { id: 1, keyword: "plan", match_mode: "contains", message: "A", priority: 100, active: true },
    { id: 2, keyword: "plan für frauen", match_mode: "contains", message: "B", priority: 100, active: true },
    { id: 3, keyword: "score", match_mode: "exact", message: "C", priority: 50, active: true },
    { id: 4, keyword: "standard", is_default: true, message: "D", priority: 900, active: true }
  ];
  ok(F.matchRule("Ich will den PLAN!!! 🔥", regeln).id === 1, "Groß-/Kleinschreibung und Emoji stören nicht");
  ok(F.matchRule("gib mir den plan für frauen bitte", regeln).id === 2,
    "das längere Stichwort gewinnt — sonst wäre die speziellere Regel unerreichbar");
  ok(F.matchRule("score", regeln).id === 3, "exakte Regel greift bei genauer Übereinstimmung");
  ok(F.matchRule("mein score ist mies", regeln).id !== 3, "exakte Regel greift NICHT als Teilstring");
  ok(F.matchRule("hallo", regeln).id === 4, "ohne Treffer greift die Standard-Regel");
  ok(F.matchRule("hallo", regeln.slice(0, 3)) === null,
    "ohne Standard-Regel bleibt es bei null — schweigen statt raten");
  ok(F.matchRule("plan", [{ id: 9, keyword: "plan", active: false, message: "X" }]) === null,
    "eine abgeschaltete Regel greift nicht");
  ok(F.matchRule("plan", []) === null && F.matchRule("", regeln).id === 4,
    "leere Eingaben führen nie zu einem zufälligen Treffer");
})();

/* ------------------------------------------------------------------ IG4 */
group("IG4 · Widerspruch (STOPP) wird großzügig erkannt");
(function () {
  ["STOPP", "stop", "Stopp!", "bitte abmelden", "kein Interesse", "NEIN DANKE", "unsubscribe", "das ist spam"]
    .forEach(function (t) { ok(F.isOptOut(t) === true, 'erkannt: "' + t + '"'); });
  ["hey", "wie läuft das?", "", "schick mal den plan"]
    .forEach(function (t) { ok(F.isOptOut(t) === false, 'kein Widerspruch: "' + (t || "(leer)") + '"'); });
})();

/* ------------------------------------------------------------------ IG5 */
group("IG5 · Nachrichtentext — Opt-out-Hinweis ist nicht abschaltbar");
(function () {
  var m = F.renderMessage({ message: "Hey {name}, hier: {link}", link_url: "https://x.de/a" }, { username: "max" });
  ok(m.indexOf("@max") >= 0, "{name} wird ersetzt");
  ok(m.indexOf("https://x.de/a") >= 0, "{link} wird ersetzt");
  ok(m.indexOf("STOPP") >= 0, "der Opt-out-Hinweis hängt automatisch an");

  var ohneName = F.renderMessage({ message: "Hey {name}!", link_url: "" }, {});
  ok(ohneName.indexOf("{name}") < 0 && ohneName.indexOf("undefined") < 0,
    "fehlender Benutzername hinterlässt keinen Platzhalter und kein 'undefined'");

  var schonDrin = F.renderMessage({ message: "Text. " + F.OPT_OUT_HINT }, {});
  ok((schonDrin.match(/STOPP/g) || []).length === 1, "der Hinweis wird nicht doppelt angehängt");

  var lang = F.renderMessage({ message: "x".repeat(900) }, {});
  ok(lang.length <= F.MAX_DM_CHARS, "die Nachricht bleibt unter Instagrams 1000-Zeichen-Grenze");
})();

/* ------------------------------------------------------------------ IG6 */
group("IG6 · Webhook-Parsing verwirft alles Unvollständige");
(function () {
  var gut = {
    object: "instagram",
    entry: [{ time: 1770000000, changes: [{ field: "comments", value: {
      id: "17900000000000000", text: "plan bitte",
      from: { id: "123456789", username: "max.mustermann" }, media: { id: "555" } } }] }]
  };
  var c = F.parseComments(gut);
  ok(c.length === 1 && c[0].igsid === "123456789" && c[0].mediaId === "555", "vollständiges Ereignis wird gelesen");
  ok(c[0].createdAtMs === 1770000000000, "der Zeitstempel wird von Sekunden in Millisekunden umgerechnet");

  ok(F.parseComments({ object: "page", entry: gut.entry }).length === 0,
    "ein fremdes object wird nicht verarbeitet");
  ok(F.parseComments({ object: "instagram", entry: [{ changes: [{ field: "likes", value: gut.entry[0].changes[0].value }] }] }).length === 0,
    "andere Felder als 'comments' werden ignoriert — es gibt keinen Liker-Pfad");
  ok(F.parseComments({ object: "instagram", entry: [{ changes: [{ field: "comments", value: { id: "17900000000000000" } }] }] }).length === 0,
    "ohne Absender-ID wird verworfen");
  ok(F.parseComments({ object: "instagram", entry: [{ changes: [{ field: "comments", value: { id: "x", from: { id: "1" } } }] }] }).length === 0,
    "eine unplausible Kommentar-ID wird verworfen");
  ok(F.parseComments(null).length === 0 && F.parseComments({}).length === 0,
    "Müll führt nicht zu einer Ausnahme");

  var benutzername = F.parseComments({ object: "instagram", entry: [{ changes: [{ field: "comments", value: {
    id: "17900000000000000", from: { id: "123456789", username: "<script>alert(1)</script>" } } }] }] });
  ok(benutzername[0].username === "", "ein unplausibler Benutzername wird verworfen, nicht gespeichert");

  var echo = F.parseInbound({ object: "instagram", entry: [{ messaging: [
    { sender: { id: "123456789" }, message: { mid: "m1", text: "hi", is_echo: true } },
    { sender: { id: "987654321" }, message: { mid: "m2", text: "STOPP" } }
  ] }] });
  ok(echo.length === 1 && echo[0].messageId === "m2",
    "die eigene zurückgespiegelte Nachricht (is_echo) zählt nicht als Antwort des Leads");
})();

/* ------------------------------------------------------------------ IG7 */
group("IG7 · Webhook-Transport: Signatur vor allem, Idempotenz vor dem Senden");
(function () {
  /* Bewusst die AUFRUFSTELLEN, nicht die Import-Zeile — sonst prüft der Test
     die Reihenfolge der Importe statt die des Ablaufs. */
  var iSig = WEBHOOK.indexOf("await verifySignature(");
  var iClient = WEBHOOK.indexOf("const service = createClient(");
  var iFetch = WEBHOOK.indexOf("await fetch(");
  ok(iSig > 0 && iClient > iSig && iFetch > iSig,
    "die Signatur wird geprüft, BEVOR ein DB-Client entsteht oder etwas gesendet wird");
  ok(/if \(!sigOk\) return json\(\{ error: "bad_signature" \}, 403\)/.test(WEBHOOK),
    "ungültige Signatur endet mit 403");

  var iClaim = WEBHOOK.indexOf('ignoreDuplicates: true');
  ok(iClaim > 0 && iClaim < iFetch,
    "der Kommentar wird VOR dem Senden beansprucht — Metas Wiederholung sendet nicht erneut");
  ok(/if \(claimErr \|\| !claimed \|\| !claimed\.length\) \{ skipped\+\+; continue; \}/.test(WEBHOOK),
    "ein bereits bearbeiteter Kommentar wird übersprungen, nicht erneut beantwortet");

  ok(/recipient: \{ comment_id: c\.commentId \}/.test(WEBHOOK),
    "Empfänger ist die KOMMENTAR-ID — das macht den Aufruf zur erlaubten Private Reply");
  ok(!/recipient:\s*\{\s*id:/.test(WEBHOOK),
    "es gibt keinen Pfad, der direkt an eine Personen-ID sendet");

  ok(/let sentToday = Number\(sentTodayRaw\)/.test(WEBHOOK) && /sentToday\+\+/.test(WEBHOOK),
    "der Tagesstand wird lokal mitgezählt — ein Batch kann den Deckel nicht überschreiten");

  /* Der Kommentartext darf die Funktion nie in Richtung Datenbank verlassen. */
  ok(!/p_text|comment_text|text: c\.text/.test(WEBHOOK),
    "der Kommentartext wird nirgends gespeichert");
  ok(/p_matched_keyword: rule\.keyword/.test(WEBHOOK),
    "gespeichert wird nur das getroffene Stichwort");

  /* Meta darf das Webhook-Abo nicht wegen unserer Fehler deaktivieren. */
  ok(/return json\(\{ ok: false \}, 200\)/.test(WEBHOOK),
    "interne Fehler antworten 200 statt 500 (sonst deaktiviert Meta das Abo)");

  ok(/\[functions\.ig-webhook\]\s*\nverify_jwt = false/.test(TOML),
    "config.toml deklariert verify_jwt=false für ig-webhook (Meta kann keinen JWT senden)");

  /* GET-Verifikation: Konstantzeit-Vergleich, und ohne gesetztes Token nie ok. */
  ok(/expected && timingSafeEqual\(token, expected\)/.test(WEBHOOK),
    "die Webhook-Verifikation vergleicht in Konstantzeit und nur bei gesetztem Token");
})();

/* ------------------------------------------------------------------ IG8 */
group("IG8 · ig-admin: Token-Auth → Owner-Check → erst dann Aktionen");
(function () {
  ok(/authHeader\.startsWith\("Bearer "\)[\s\S]{0,60}unauthorized[\s\S]{0,20}401/.test(ADMIN),
    "ohne Bearer-Token endet der Request mit 401");
  ok(/admin\.auth\.getUser\(/.test(ADMIN) && /const callerId = userData\.user\.id/.test(ADMIN),
    "die Identität kommt ausschließlich aus dem verifizierten Token");
  ok(/from\("user_roles"\)\.select\("role"\)\.eq\("user_id", callerId\)/.test(ADMIN) &&
     /rolle\.role !== "owner"\) return json\(\{ error: "forbidden" \}, 403\)/.test(ADMIN),
    "ohne Owner-Rolle endet der Request mit 403");

  var iAuth = ADMIN.indexOf("auth.getUser"), iRole = ADMIN.indexOf('from("user_roles")'),
      iBody = ADMIN.indexOf("await req.json()"), iAction = ADMIN.indexOf('action === "report"');
  ok(iAuth > 0 && iRole > iAuth && iBody > iRole && iAction > iBody,
    "Reihenfolge erzwungen: Token-Auth → Owner-Check → erst dann Body/Aktionen");

  ok(!/body\.(user_id|role|owner|caller)/.test(ADMIN),
    "keine Identitäts- oder Rollenfelder aus dem Request-Body");
  ok(!/from\("user_roles"\)[\s\S]{0,200}\.(insert|upsert|update)\(/.test(ADMIN),
    "die Funktion vergibt niemals eine Rolle");
  ok(/\[functions\.ig-admin\]\s*\nverify_jwt = false/.test(TOML),
    "config.toml deklariert verify_jwt=false für ig-admin (Auth liegt im Handler)");

  /* Der Setup-Bericht darf sagen, OB ein Secret gesetzt ist — nie welchen Wert. */
  var setupBlock = ADMIN.split('action === "setup_state"')[1].split('action === "leads"')[0];
  ok(/!!\(Deno\.env\.get\(k\) \|\| ""\)\.trim\(\)/.test(setupBlock) &&
     !/secrets:[\s\S]{0,400}Deno\.env\.get\("IG_(APP_SECRET|ACCESS_TOKEN)"\)\s*[,}]/.test(setupBlock),
    "der Setup-Bericht meldet nur ja/nein, nie den Wert eines Secrets");

  /* Ein Opt-out muss über die Funktion laufen, die den Sperr-Zeitstempel setzt. */
  ok(/status === "opted_out"[\s\S]{0,200}rpc\("ig_opt_out"/.test(ADMIN),
    "ein Opt-out läuft über ig_opt_out — ein blosses Status-Update wäre eine Attrappe");
})();

/* ------------------------------------------------------------------ IG9 */
group("IG9 · Datenmodell: keine Policy, keine Kommentartexte, harte Grenzen");
(function () {
  ["ig_settings", "ig_rules", "ig_leads", "ig_comments", "ig_inbound"].forEach(function (t) {
    ok(new RegExp("alter table public\\." + t + "\\s+enable row level security").test(SQL),
      t + ": RLS ist eingeschaltet");
    ok(!new RegExp("create policy[\\s\\S]{0,200}on public\\." + t).test(SQL),
      t + ": es gibt KEINE Policy — kein Client kommt heran");
  });

  ok(!/comment_text|kommentartext\s+text|text\s+text/.test(SQL),
    "es gibt keine Spalte für den Kommentartext");
  ok(/matched_keyword text/.test(SQL), "gespeichert wird nur das getroffene Stichwort");
  ok(/comment_id\s+text not null unique/.test(SQL),
    "comment_id ist UNIQUE — das ist die Idempotenz gegen Metas Wiederholungen");
  ok(/comment_window_days\s+integer not null default 7 check \(comment_window_days between 1 and 7\)/.test(SQL),
    "das Antwortfenster kann nicht über Metas 7 Tage hinaus gestellt werden");
  ok(/active\s+boolean not null default false/.test(SQL),
    "der Funnel ist nach der Migration AUS — Einschalten ist eine bewusste Handlung");
  ok(/create unique index if not exists idx_ig_rules_one_default/.test(SQL),
    "es kann höchstens eine Standard-Regel geben");

  /* Alle Berichtsfunktionen sind security definer und für Clients gesperrt. */
  ["ig_funnel_report", "ig_lead_list", "ig_touch_lead", "ig_mark_comment", "ig_opt_out", "ig_forget_lead"].forEach(function (fn) {
    ok(new RegExp("revoke all on function public\\." + fn + "\\([^)]*\\)\\s+from public, anon, authenticated").test(SQL),
      fn + ": für anon und authenticated gesperrt");
  });
  ok(/grant execute on function public\.ig_funnel_report\(integer\)\s+to service_role/.test(SQL),
    "nur service_role darf den Bericht ausführen");
  ok(/ig_forget_lead/.test(SQL) && /delete from public\.ig_leads where igsid = p_igsid/.test(SQL),
    "eine Löschanfrage nach Art. 17 DSGVO ist in einem Aufruf erledigt");
})();

/* ----------------------------------------------------------------- IG10 */
group("IG10 · Es gibt keinen Weg, Liker oder Follower anzuschreiben");
(function () {
  /* Der Kern der Absage an die ursprüngliche Idee — als Test, nicht als
     Kommentar. Wer diese Pfade nachrüstet, bricht hier den Build. */
  var alle = WEBHOOK + ADMIN + read("supabase/functions/ig-webhook/funnel.mjs");
  ok(!/\/likes|"likes"|followers|following/i.test(alle),
    "keine Abfrage von Likes, Followern oder Following");
  ok(!/tiktok/i.test(alle), "kein TikTok-Versandpfad (TikTok hat keine DM-API)");
  ok(/change\.field !== "comments"/.test(alle),
    "verarbeitet werden ausschließlich Kommentar-Ereignisse");

  /* Die App-Ansicht darf nichts anderes versprechen, als der Server kann. */
  var app = read("js/os/app.js");
  ok(/ig-admin/.test(app) && /function vInsta/.test(app), "die App bindet den Funnel an");
  ok(/isOwner && MM\.entitlements\.isOwner\(\)/.test(app),
    "die Ansicht erscheint nur für den Owner (Autorisierung erzwingt der Server)");
  ok(/Liker|alle Besucher/.test(app),
    "die Ansicht sagt ausdrücklich, dass Liker und Besucher nicht erreichbar sind");
})();

/* ----------------------------------------------------------------- Ende */
setTimeout(function () {
  console.log("\n==============================");
  console.log("PASS: " + passed + "  FAIL: " + failed);
  if (failed) process.exit(1);
}, 150);
