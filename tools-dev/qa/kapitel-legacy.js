/* Gezielter Nachlauf: nur Abschnitt E (historische Ergebnisse) + Report. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  OK  " + m); else { fail++; console.error("  FAIL: " + m); } };
global.window = {};
require("/home/user/malemetrix/js/check-data.js");
const C = global.window.MM_CHECK;
const SEED_LEGACY = {
  date: "2025-11-03T09:00:00.000Z", total: 55, level: "Solide Basis", levelText: "T.",
  scores: { body: 40, strength: 62, fuel: 50, recovery: 44, blood: 60, drive: 58, execution: 51 },
  archetype: { id: "x", name: "Der Aufbauer", tagline: "T.", text: "T.", offer: "", cta: "" },
  plan: "recomp", bottleneck: { key: "recovery", name: "Regeneration", text: "T." },
  weakest: ["body", "recovery", "fuel"], strongest: "strength", flags: [], answers: {}
};
(async () => {
  for (const width of [390, 1440]) {
    console.log("\n== Abschnitt E @" + width + "px ==");
    const b = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
    const page = await (await b.newContext({ viewport: { width, height: 950 } })).newPage();
    const errs = []; page.on("pageerror", (e) => errs.push(String(e.message || e)));
    await page.goto(BASE + "check.html", { waitUntil: "load" });
    await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("mm_check_result", JSON.stringify(s)); }, SEED_LEGACY);
    await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
    await page.waitForSelector("#existingResult [data-show]", { timeout: 10000 });
    await page.click("#existingResult [data-show]"); await page.waitForTimeout(700);
    const legacy = await page.evaluate(() => ({
      chap: !!document.querySelector(".mm-chap"),
      areas: document.querySelectorAll(".mm-area").length,
      links: document.querySelectorAll(".mm-area .sec a").length,
      hinweis: /frühere[s]? Ergebnis/.test(document.body.innerText),
      profil: /verdichtetes Profil/.test(document.body.innerText)
    }));
    ok(legacy.areas === 0 && legacy.links === 0, "Alt-Ergebnis ohne Domains: keine erfundene Empfehlung");
    ok(!legacy.chap, "und keine Kapitelempfehlung");
    ok(legacy.hinweis, "der bestehende ehrliche Hinweis bleibt");
    ok(legacy.profil, "die historische Profildarstellung bleibt erhalten");
    ok(await page.evaluate(() => localStorage.getItem("mm_check_result")) === JSON.stringify(SEED_LEGACY), "das Alt-Ergebnis wurde nicht mutiert");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over <= 0, "kein horizontaler Ueberlauf (" + over + "px)");
    ok(errs.length === 0, "keine JavaScript-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
    await b.close();
  }
  console.log("\n" + (fail ? "FAILS: " + fail : "NACHLAUF BESTANDEN"));
  console.log("EXIT=" + (fail ? 1 : 0));
  process.exit(fail ? 1 : 0);
})();
