#!/usr/bin/env node
/**
 * run-tests.mjs — fuehrt alle Fachtests aus und meldet EINE Zahl.
 *
 * Vorher stand in package.json nur native-app.test.js. Wer `npm test` tippte,
 * bekam gruen, waehrend decide.js kaputt sein konnte — und dieselbe Luecke
 * stand im CI-Lauf, der zu TestFlight fuehrt.
 *
 * Aufruf: npm test
 */
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEIEN = readdirSync(path.join(HIER, "tests")).filter((f) => f.endsWith(".test.js")).sort();

let gescheitert = 0;
for (const f of DATEIEN) {
  const pfad = path.join(HIER, "tests", f);
  try {
    const out = execFileSync("node", [pfad], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const letzte = out.trim().split("\n").filter(Boolean).pop() || "";
    console.log("  ✓ " + f.padEnd(34) + letzte.trim().slice(0, 60));
  } catch (e) {
    gescheitert++;
    console.error("\n✗ " + f + "\n" + ((e.stdout || "") + (e.stderr || "")).split("\n")
      .filter((z) => /FAIL|✗|Error/.test(z)).slice(0, 12).join("\n"));
  }
}
console.log("\n" + (gescheitert
  ? `FEHLGESCHLAGEN — ${gescheitert} von ${DATEIEN.length} Dateien`
  : `OK — alle ${DATEIEN.length} Testdateien gruen`));
process.exit(gescheitert ? 1 : 0);
