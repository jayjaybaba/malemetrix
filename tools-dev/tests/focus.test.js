/* ==========================================================================
   DER EINE AUFTRAG — Score → Tracker → zweiter Score

   Geprüft wird die Kette, nicht nur die Teile: aus einem Ergebnis entsteht
   ein Auftrag, der Auftrag lässt sich täglich abhaken, und beim zweiten
   Score gibt es daraus ein Fazit. Dazu die inhaltlichen Leitplanken —
   keine Diagnose, keine Dosierung, kein Perfektionsziel.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

/* ------------------------------------------------------------- Sandbox --- */
/* localStorage-Attrappe, damit focus.js unverändert laufen kann. */
function sandbox() {
  const mem = {};
  const ctx = {
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    },
    console: { log() {}, error() {} },
    Date, Math, JSON, Object, Array, String, Number, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/check-data.js"), ctx);
  vm.runInContext(read("js/focus.js"), ctx);
  return ctx;
}

/* ==================================================================== 1 */
group("1 · Aus jedem Engpass entsteht genau ein Auftrag");
(function () {
  const ctx = sandbox();
  const C = ctx.window.MM_CHECK;
  ok(typeof C.focusFor === "function", "C.focusFor existiert");
  ok(C.FOCUS && Object.keys(C.FOCUS).length >= 12, "FOCUS deckt " + Object.keys(C.FOCUS).length + " Domains ab");

  /* Jede Domain, die als Engpass herauskommen kann, braucht einen Auftrag —
     sonst landet ein Teil der Nutzer stumm im Fallback. */
  const domains = Object.keys(C.domainMeta);
  const ohne = domains.filter((d) => !C.FOCUS[d]);
  ok(ohne.length === 0, "jede Engpass-Domain hat einen Auftrag" + (ohne.length ? ": fehlt " + ohne.join(", ") : ""));

  domains.forEach((d) => {
    const f = C.focusFor({ total: 55, bottleneck: { domain: d, name: C.domainMeta[d].name } });
    ok(f && f.domain === d && f.title && f.daily && f.why && f.proof,
      d + ": vollständiger Auftrag (Titel, Tagesfrage, Begründung, Beleg)");
  });

  /* Unbekannter Engpass darf nicht ins Leere laufen. */
  const fb = C.focusFor({ total: 40, bottleneck: { domain: "gibtsnicht", name: "X" } });
  ok(fb && fb.domain === "execution", "unbekannte Domain fällt auf 'execution' zurück statt zu scheitern");
  const leer = C.focusFor({ total: 40 });
  ok(leer && leer.title, "Ergebnis ohne bottleneck liefert trotzdem einen Auftrag");
})();

/* ==================================================================== 2 */
group("2 · Das Ziel ist nicht Perfektion");
(function () {
  const ctx = sandbox();
  const C = ctx.window.MM_CHECK;
  Object.keys(C.FOCUS).forEach((d) => {
    const f = C.FOCUS[d];
    ok(f.target >= 18 && f.target <= 24,
      d + ": Ziel " + f.target + "/28 — fordernd, aber ein verpasster Tag bricht nichts");
  });
  const perfekt = Object.keys(C.FOCUS).filter((d) => C.FOCUS[d].target >= 28);
  ok(perfekt.length === 0, "kein Auftrag verlangt 28 von 28 Tagen");

  /* Genau EINE Tagesfrage — nicht drei Dinge in einem Satz. */
  const mehrfach = Object.keys(C.FOCUS).filter((d) => (C.FOCUS[d].daily.match(/ und /g) || []).length > 1);
  ok(mehrfach.length === 0, "jede Tagesfrage bleibt eine einzige Handlung" + (mehrfach.length ? ": " + mehrfach.join(", ") : ""));
})();

/* ==================================================================== 3 */
group("3 · Inhaltliche Leitplanken");
(function () {
  const ctx = sandbox();
  const C = ctx.window.MM_CHECK;
  /* Geprüft werden die ANWEISENDEN Felder. Das Feld `arzt` ist ausgenommen —
     dort steht der Vorbehalt, und der muss die Wörter nennen dürfen, die er
     ausschließt ("keine Dosierungsempfehlung"). Eine Prüfung, die den eigenen
     Haftungshinweis anschlägt, prüft die falsche Stelle. */
  const anweisend = Object.keys(C.FOCUS)
    .map((d) => [C.FOCUS[d].title, C.FOCUS[d].daily, C.FOCUS[d].why, C.FOCUS[d].proof].join(" "))
    .join(" ");
  const VERBOTEN = /\bmg\b|\bml\b|Dosier|Zyklus|\bKur\b|PCT|Nolvadex|Clomifen|Anastrozol/i;
  ok(!VERBOTEN.test(anweisend), "keine Aufgabe nennt Dosierungen, Zyklen oder Präparate");
  ok(!/du hast (eine|einen)\s+\w*(mangel|störung|erkrankung)|leidest an|Diagnose gestellt/i
      .test(anweisend + " " + Object.keys(C.FOCUS).map((d) => C.FOCUS[d].arzt || "").join(" ")),
    "keine Aufgabe stellt eine Diagnose");

  /* Und die Gegenprobe: der Vorbehalt bei den heiklen Domains muss den
     Ausschluss tatsächlich aussprechen, nicht nur vage auf „Arzt" zeigen. */
  ok(/keine\s+Einnahme-,\s*Dosierungs-\s*oder\s*Präparateempfehlung/i.test(C.FOCUS.enhancedControl.arzt),
    "der Enhanced-Vorbehalt schließt Einnahme, Dosierung und Präparate ausdrücklich aus");

  /* Wo der ärztliche Vorbehalt hingehört, muss er auch stehen. */
  ["cardiovascular", "hormonal", "enhancedControl", "therapyControl", "recoveryStatus"].forEach((d) => {
    ok(C.FOCUS[d] && C.FOCUS[d].arzt && C.FOCUS[d].arzt.length > 20,
      d + ": trägt den ärztlichen Vorbehalt");
  });
  ok(/keine\s+(Einnahme|Diagnose)|stellt keine Diagnose|ärztlich/i.test(C.FOCUS.enhancedControl.arzt),
    "Enhanced-Auftrag verweist ausdrücklich auf ärztliche Begleitung");
})();

/* ==================================================================== 4 */
group("4 · Der Auftrag lässt sich führen (Speicher-Logik)");
(function () {
  const ctx = sandbox();
  const C = ctx.window.MM_CHECK, F = ctx.window.MM.focus;

  ok(F.current() === null, "ohne Start gibt es keinen Auftrag");

  const f = C.focusFor({ total: 58, bottleneck: { domain: "sleep", name: "Schlaf" } });
  F.start(f);
  ok(F.current() && F.current().domain === "sleep", "Auftrag ist gestartet und gespeichert");

  let p = F.progress();
  ok(p.erledigt === 0 && p.heuteErledigt === false, "am Starttag ist nichts erledigt");
  ok(p.offen === 28, "28 Tage Laufzeit");
  ok(p.abgelaufen === false, "läuft noch");

  F.toggleDay();
  p = F.progress();
  ok(p.erledigt === 1 && p.heuteErledigt === true, "heute abgehakt zählt");
  F.toggleDay();
  ok(F.progress().erledigt === 0, "nochmal klicken macht es rückgängig");

  /* Rückdatierte Tage — der Nutzer holt den gestrigen Haken nach. */
  const gestern = new Date(Date.now() - 86400000);
  const ymd = (d) => d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  F.toggleDay(ymd(gestern));
  ok(F.progress().erledigt === 1, "ein nachgetragener Tag zählt");

  /* Ziel erreicht → geschafft, unabhängig von der Perfektion. */
  const cur = F.current();
  for (let i = 0; i < f.target; i++) cur.done["2026-01-" + ("0" + ((i % 28) + 1)).slice(-2)] = true;
  ok(F.progress(cur).geschafft === true, "Ziel erreicht = geschafft, auch ohne 28/28");
})();

/* ==================================================================== 5 */
group("5 · Ein zweiter Auftrag löscht den ersten nicht still");
(function () {
  const ctx = sandbox();
  const C = ctx.window.MM_CHECK, F = ctx.window.MM.focus;
  F.start(C.focusFor({ total: 50, bottleneck: { domain: "sleep", name: "Schlaf" } }));
  F.toggleDay();
  F.start(C.focusFor({ total: 62, bottleneck: { domain: "nutrition", name: "Ernährung" } }));

  ok(F.current().domain === "nutrition", "der neue Auftrag ist aktiv");
  const h = F.history();
  ok(h.length === 1 && h[0].domain === "sleep" && h[0].erledigt === 1,
    "der alte wandert mit seinem Fortschritt in die Historie");

  F.clear();
  ok(F.current() === null && F.history().length === 2, "Beenden archiviert ebenfalls, statt zu löschen");
})();

/* ==================================================================== 6 */
group("6 · Der zweite Score bekommt ein Fazit");
(function () {
  const ctx = sandbox();
  const C = ctx.window.MM_CHECK, F = ctx.window.MM.focus;
  ok(F.lastOutcome() === null, "ohne Auftrag kein Fazit");

  F.start(C.focusFor({ total: 55, bottleneck: { domain: "movement", name: "Alltagsbewegung" } }));
  let o = F.lastOutcome();
  ok(o.laufend === true, "ein laufender Auftrag wird als laufend gemeldet — kein verfrühtes Fazit");

  F.clear();
  o = F.lastOutcome();
  ok(o && o.laufend === false && o.domain === "movement", "nach dem Abschluss steht das Fazit bereit");
  ok(o.scoreAtStart === 55, "der Score zum Startzeitpunkt ist festgehalten — sonst gäbe es nichts zu vergleichen");
})();

/* ==================================================================== 7 */
group("7 · Verdrahtung in Ergebnis, Tracker und Seiten");
(function () {
  const check = read("js/check.js");
  const trk = read("js/tracker.js");

  ok(/C\.focusFor\(r\)/.test(check), "die Ergebnisseite leitet den Auftrag aus dem Ergebnis ab");
  ok(/id="btnFocusStart"/.test(check) && /MM\.focus\.start/.test(check), "„Aufgabe starten“ schreibt sie in den Speicher");
  ok(/id="btnFocusSwap"/.test(check), "ein laufender Auftrag lässt sich bewusst tauschen statt still ersetzen");
  ok(/tracker\.html#focus/.test(check), "der Weg führt in den Tracker, nicht ins Produkt");
  ok(/DEIN LETZTER AUFTRAG/.test(check), "der zweite Score zeigt die Bilanz des letzten Auftrags");
  ok(/o\.laufend\) return/.test(check), "… aber nicht, solange er noch läuft");
  ok(/o\.erledigt === 0\) return/.test(check), "… und nicht, wenn nie begonnen wurde");

  ok(/focusHTML\(\)\s*\+\s*statsHTML\(\)/.test(trk), "im Tracker steht der Auftrag ÜBER den Statistiken");
  ok(/id="focusToday"/.test(trk) && /MM\.focus\.toggleDay/.test(trk), "die Tagesfrage ist abhakbar");
  ok(/id="focusDrop"/.test(trk) && /confirm\(/.test(trk), "Beenden erfordert eine Bestätigung");
  ok(/p\.abgelaufen/.test(trk) && /check\.html/.test(trk), "nach Ablauf führt der Block zum zweiten Score");

  ["check.html", "tracker.html"].forEach(function (p) {
    const h = read(p);
    ok(/<script src="js\/focus\.js">/.test(h), p + ": focus.js ist eingebunden");
    const iF = h.indexOf("js/focus.js");
    const iU = h.indexOf(p === "check.html" ? "js/check.js" : "js/tracker.js");
    ok(iF > 0 && iF < iU, p + ": focus.js lädt vor seinem Nutzer");
  });

  const css = read("css/style.css");
  ok(/\.trk-focus-check/.test(css) && /\.trk-focus-bar/.test(css), "die Styles liegen zentral in style.css");
  ok(/\.trk-focus-check:focus-within/.test(css), "die Checkbox ist per Tastatur sichtbar fokussiert");
  ok(/aria-hidden="true"><span style="width:/.test(trk.replace(/\s+/g, " ")) ||
     /trk-focus-bar" aria-hidden="true"/.test(trk), "der Fortschrittsbalken ist rein dekorativ ausgezeichnet");
})();

/* ==================================================================== 8 */
group("8 · Nichts davon kostet etwas oder verlässt das Gerät");
(function () {
  const f = read("js/focus.js");
  ok(!/fetch\(|XMLHttpRequest|sendBeacon|supabase/i.test(f), "focus.js sendet nichts nach außen");
  ok(!/e-?mail|newsletter|subscribe/i.test(f), "focus.js verlangt keine Adresse");
  const check = read("js/check.js");
  const block = check.slice(check.indexOf(">EIN AUFTRAG<"), check.indexOf("DEINE ERGEBNISPRÜFUNG"));
  ok(!/protokoll\.html|49\s*€/.test(block), "der Auftrags-Block verkauft nichts — er ist der kostenlose Teil");
})();

console.log("\n==============================");
console.log("PASS: " + passed + "  FAIL: " + failed);
process.exit(failed ? 1 : 0);
