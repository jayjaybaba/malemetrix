/* ==========================================================================
   MALEMETRIX — ASSERTIONSZÄHLER (Paket 8)
   --------------------------------------------------------------------------
   Die Auditzeile in MALEMETRIX_OS.md nennt die Gesamtzahl der Assertions.
   Diese Zahl wurde bis Paket 7 von Hand fortgeschrieben und war um 67 zu hoch.
   Ab hier wird sie gemessen, nicht geschätzt: jede Suite wird ausgeführt und
   ihre bestandenen Assertions werden gezählt (eine Zeile mit ✓ = eine
   Assertion — genau das, was `ok()` in jeder Suite ausgibt).

   Ausführen:
     node tools-dev/count-assertions.mjs           → Tabelle + Summe
     node tools-dev/count-assertions.mjs --write    → schreibt die Auditzeile
   ========================================================================== */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "tools-dev/tests");
const DOC = path.join(ROOT, "MALEMETRIX_OS.md");

const suiten = readdirSync(DIR).filter((f) => /\.test\.js$/.test(f)).sort();
let gesamt = 0, fehler = 0;

for (const f of suiten) {
  let out = "";
  let code = 0;
  try {
    out = execFileSync("node", [path.join(DIR, f)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    out = String((e.stdout || "") + (e.stderr || ""));
    code = e.status == null ? 1 : e.status;
  }
  const n = (out.match(/^\s*✓ /gm) || []).length;
  const failed = (out.match(/^\s*✗ /gm) || []).length;
  gesamt += n;
  if (code !== 0 || failed) fehler++;
  console.log(String(n).padStart(5) + "  " + f + (failed ? "   ✗ " + failed + " FEHLER" : "") + (code !== 0 && !failed ? "   ✗ ABBRUCH" : ""));
}

const zeile = "Gesamt " + gesamt + " Assertions über " + suiten.length + " Suiten.";
console.log("\n" + "-".repeat(52));
console.log(zeile + (fehler ? "  (" + fehler + " Suiten mit Fehlern)" : "  Alle Suiten grün."));

if (process.argv.includes("--write")) {
  const sw = (readFileSync(path.join(ROOT, "sw.js"), "utf8").match(/const VERSION = "(mm-v\d+)"/) || [])[1] || "";
  const doc = readFileSync(DOC, "utf8");
  /* Vorhandensein und Änderung getrennt prüfen. Vorher galt "unverändert"
     als "nicht gefunden" — wer die Zahl schon korrekt hatte, bekam einen
     Fehlalarm samt Exit-Code 1. */
  const muster = /Gesamt \d+ Assertions über \d+ Suiten\. SW: mm-v\d+\./;
  if (!muster.test(doc)) { console.error("Auditzeile nicht gefunden — nichts geschrieben."); process.exit(1); }
  const neu = doc.replace(muster, zeile + " SW: " + sw + ".");
  if (neu === doc) { console.log("Auditzeile bereits aktuell — nichts zu schreiben."); process.exit(0); }
  writeFileSync(DOC, neu);
  console.log("MALEMETRIX_OS.md aktualisiert: " + zeile + " SW: " + sw + ".");
}
process.exit(fehler ? 1 : 0);
