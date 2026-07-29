/* ==========================================================================
   MALEMETRIX — BROWSER-QA, ALLE SKRIPTE (Paket 8)
   Fährt jedes Skript in tools-dev/qa nacheinander und meldet eine Bilanz.
   Voraussetzungen und Umgebungsvariablen: siehe README.md.
   Ausführen:  node tools-dev/qa/run-all.mjs
   ========================================================================== */
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const skripte = readdirSync(DIR).filter((f) => /\.js$/.test(f) && f !== "run-all.mjs").sort();

let fehler = 0, gesamt = 0;
for (const s of skripte) {
  let out = "", code = 0;
  const start = process.hrtime.bigint();
  try {
    out = execFileSync("node", [path.join(DIR, s)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    out = String((e.stdout || "") + (e.stderr || ""));
    code = e.status == null ? 1 : e.status;
  }
  const sek = Number((process.hrtime.bigint() - start) / 1000000n) / 1000;
  const okN = (out.match(/^\s*(OK|✓) /gm) || []).length;
  const badN = (out.match(/^\s*(FAIL:|✗)/gm) || []).length;
  gesamt += okN;
  if (code !== 0) fehler++;
  console.log((code === 0 ? "  grün " : "  ROT  ") + s.padEnd(26) +
    String(okN).padStart(4) + " OK" + (badN ? "   " + badN + " Fehler" : "") +
    "   " + sek.toFixed(0) + " s");
  if (code !== 0) {
    out.split("\n").filter((l) => /FAIL:|✗|Error/.test(l)).slice(0, 6).forEach((l) => console.log("        " + l.trim()));
  }
}
console.log("\n" + "-".repeat(52));
console.log(gesamt + " bestandene Prüfungen über " + skripte.length + " Skripte." +
  (fehler ? "  " + fehler + " Skripte ROT." : "  Alle Skripte grün."));
process.exit(fehler ? 1 : 0);
