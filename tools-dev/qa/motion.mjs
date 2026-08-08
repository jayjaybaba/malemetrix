#!/usr/bin/env node
/**
 * motion.mjs — prueft die Bewegung der App in einem echten Browser.
 *
 * Ein Texttest kann nur zeigen, dass eine CSS-Regel DASTEHT. Ob sie greift,
 * ob sie im richtigen Moment greift und ob sie bei „Bewegung reduzieren"
 * wirklich verschwindet, zeigt nur ein Browser.
 *
 * Geprueft wird:
 *   1. Das Blatt bewegt sich beim Aufgehen und ist danach an seinem Platz.
 *   2. Das Blatt verschwindet nicht schlagartig, sondern faehrt hinaus.
 *   3. Der Einlauf laeuft beim Ansichtswechsel — und NICHT beim Abhaken.
 *   4. Mit „Bewegung reduzieren" bewegt sich nichts, und alles ist trotzdem
 *      sofort da (kein unsichtbarer Inhalt, weil eine Animation ausfaellt).
 *
 * Aufruf: node tools-dev/qa/motion.mjs
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let PORT = 0;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") || "index.html";
      try {
        const buf = await readFile(path.join(ROOT, rel));
        res.writeHead(200, { "Content-Type": MIME[path.extname(rel)] || "application/octet-stream" });
        res.end(buf);
      } catch { res.writeHead(404); res.end("not found"); }
    });
    server.listen(0, () => { PORT = server.address().port; resolve(server); });
  });
}

/* Aktiver Plan an Tag 31, damit alle Ansichten etwas zu zeigen haben. */
function state() {
  const engine = require(path.join(ROOT, "js/simple/plan-engine.js"));
  const input = require(path.join(ROOT, "js/simple/plan-input.js"));
  const today = new Date();
  const ymd = (d) => d.toISOString().slice(0, 10);
  const start = new Date(today); start.setDate(start.getDate() - 30);
  const tg = { date: ymd(start) + "T10:00:00Z", current_kg: 95, target_kg: 85, height_cm: 183,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "moderat", diet: "misch" };
  const wd = today.getDay();
  const r = engine.createPlan(input.collect({
    transformGoal: tg, checkResult: null,
    answers: { weekdays: [wd, (wd + 2) % 7, (wd + 4) % 7].sort() }
  }), ymd(start));
  if (!r.ok) throw new Error("Testplan ungueltig: " + r.errors.join(", "));
  r.plan.status = "active";
  const daylog = {}, metrics = [];
  for (let i = 20; i >= 1; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    daylog[ymd(d)] = { tasks: { training: true, protein: true, steps: true }, closed: true, workout: null };
    metrics.push({ type: "weight", value: Math.round((95 - 0.07 * (20 - i)) * 10) / 10,
      unit: "kg", date: ymd(d), source: "simple" });
  }
  return { mm_simple_plan: r.plan, mm_simple_daylog: daylog, mm_os_metrics: metrics, mm_transform_goal: tg };
}

let bestanden = 0, gescheitert = 0;
const ok = (c, m) => { if (c) { bestanden++; console.log("  ✓ " + m); } else { gescheitert++; console.error("  ✗ FEHLER: " + m); } };
const gruppe = (g) => console.log("\n== " + g + " ==");

async function seite(browser, reduziert) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, locale: "de-DE",
    reducedMotion: reduziert ? "reduce" : "no-preference"
  });
  const page = await ctx.newPage();
  await page.addInitScript((s) => {
    Object.keys(s).forEach((k) => localStorage.setItem(k, JSON.stringify(s[k])));
  }, state());
  await page.goto(`http://localhost:${PORT}/meinplan.html#heute`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { ctx, page };
}

/* „Heute passt nicht" ist der einzige Chip, den es an JEDEM Tag gibt —
   Wiegen und Einkauf haengen am Wochentag. */
const oeffneBlatt = (page) =>
  page.locator("main .s-chip", { hasText: "passt nicht" }).first().click();

/* Abstand der Blatt-Oberkante zum unteren Bildrand. Faehrt das Blatt hoch,
   waechst dieser Wert; steht es still, bleibt er gleich. */
const blattHoehe = (page) => page.evaluate(() => {
  const s = document.querySelector(".s-sheet");
  if (!s) return null;
  return Math.round(window.innerHeight - s.getBoundingClientRect().top);
});

async function main() {
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});

  /* ------------------------------------------------------------------ */
  gruppe("Das Blatt faehrt herein und wieder hinaus");
  {
    const { ctx, page } = await seite(browser, false);
    await oeffneBlatt(page);
    await page.waitForTimeout(60);
    const frueh = await blattHoehe(page);
    await page.waitForTimeout(400);
    const spaet = await blattHoehe(page);
    ok(frueh != null && spaet != null, "das Blatt ist da");
    ok(frueh < spaet, `es faehrt herein statt einfach zu erscheinen (${frueh}px -> ${spaet}px)`);
    ok(spaet > 150, `und steht danach vollstaendig im Bild (${spaet}px)`);

    /* Ein Modal muss alles verdecken. Die Kopfzeile der Website ist
       position:fixed mit z-index 100 und lag frueher hell und anklickbar
       ueber dem abgedunkelten Blatt. */
    const obenDrauf = await page.evaluate(() => {
      const e = document.elementFromPoint(window.innerWidth / 2, 30);
      return e ? (e.className || e.tagName).toString() : null;
    });
    ok(/s-sheet-back/.test(String(obenDrauf)),
      "am oberen Bildrand liegt die Abdunklung, nicht die Kopfzeile (" + obenDrauf + ")");

    /* Zugehen: erst muss es noch da sein, dann weg. */
    await page.locator(".s-sheet-back").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(80);
    const nochDa = await page.locator(".s-sheet").count();
    ok(nochDa === 1, "beim Schliessen ist es kurz danach noch da — es faehrt hinaus");
    await page.waitForTimeout(400);
    ok((await page.locator(".s-sheet").count()) === 0, "und ist danach wirklich entfernt, nicht nur unsichtbar");
    ok((await page.locator(".s-sheet-back").count()) === 0, "die Abdunklung ebenfalls");
    await ctx.close();
  }

  /* ------------------------------------------------------------------ */
  gruppe("Der Einlauf laeuft beim Ansichtswechsel — und nur dort");
  {
    const { ctx, page } = await seite(browser, false);
    const hatKlasse = () => page.evaluate(() => document.querySelector("main").classList.contains("s-enter"));

    await page.locator('.s-nav a[href="#fortschritt"]').click();
    await page.waitForTimeout(50);
    ok(await hatKlasse(), "Wechsel auf Fortschritt: der Inhalt laeuft ein");
    await page.waitForTimeout(500);

    /* Zurueck auf Heute und dort eine Aufgabe abhaken: render() laeuft
       wieder, der Bildschirm darf aber NICHT erneut einfliegen. */
    await page.locator('.s-nav a[href="#heute"]').click();
    await page.waitForTimeout(500);
    /* Bewusst die Schritte-Aufgabe: die Trainingsaufgabe fuehrt ins Workout,
       das WAERE ein Ansichtswechsel und wuerde hier nichts beweisen. */
    const aufgabe = page.locator("main .s-task", { hasText: "Schritte" }).first();
    await aufgabe.click();
    await page.waitForTimeout(50);
    ok((await page.evaluate(() => location.hash)) === "#heute", "das Abhaken wechselt die Ansicht nicht");
    ok(!(await hatKlasse()), "Aufgabe abgehakt: der Bildschirm bleibt stehen");
    ok((await page.locator("main .s-task.done").count()) > 0, "das Haekchen sitzt");
    const nichtSichtbar = await page.evaluate(() =>
      [...document.querySelectorAll("main > *")]
        .filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length);
    ok(nichtSichtbar === 0, "und der Bildschirm bleibt vollstaendig sichtbar");

    /* Sichtbarkeit nach dem Einlauf: nichts darf auf opacity 0 stehenbleiben. */
    await page.locator('.s-nav a[href="#plan"]').click();
    await page.waitForTimeout(800);
    const unsichtbar = await page.evaluate(() =>
      [...document.querySelectorAll("main > *")]
        .filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length);
    ok(unsichtbar === 0, "nach dem Einlauf ist jeder Block voll sichtbar (" + unsichtbar + " unsichtbar)");
    await ctx.close();
  }

  /* ------------------------------------------------------------------ */
  gruppe("Bewegung reduzieren: nichts bewegt sich, alles ist trotzdem da");
  {
    const { ctx, page } = await seite(browser, true);
    const sofortSichtbar = await page.evaluate(() =>
      [...document.querySelectorAll("main > *")]
        .filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length);
    ok(sofortSichtbar === 0, "der Inhalt steht sofort da, ohne Einblenden");

    await oeffneBlatt(page);
    await page.waitForTimeout(40);
    const h1 = await blattHoehe(page);
    await page.waitForTimeout(300);
    const h2 = await blattHoehe(page);
    ok(h1 != null && h1 === h2, `das Blatt steht sofort an seinem Platz (${h1}px)`);

    await page.locator(".s-sheet-back").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(40);
    ok((await page.locator(".s-sheet").count()) === 0, "und ist beim Schliessen sofort weg, ohne Wartezeit");
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log("\n" + (gescheitert ? "FEHLGESCHLAGEN" : "OK") +
    ` — ${bestanden} bestanden, ${gescheitert} fehlgeschlagen`);
  process.exit(gescheitert ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
