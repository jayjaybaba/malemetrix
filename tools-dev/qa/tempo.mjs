#!/usr/bin/env node
/**
 * tempo.mjs — misst, wie lange die App braucht, bis man sie bedienen kann.
 *
 * „Keine Wartezeiten" ist keine Meinung, sondern eine Zahl. Gemessen wird auf
 * einem gedrosselten Geraet (4x langsamere CPU), weil ein iPhone unter Last
 * und ein Rechner im Rechenzentrum nichts miteinander zu tun haben.
 *
 * Gemessen wird:
 *   1. Bis der erste Inhalt steht (First Contentful Paint)
 *   2. Bis der Tagesauftrag wirklich im DOM ist
 *   3. Wie lange ein Ansichtswechsel dauert
 *   4. Wie lange das Abhaken einer Aufgabe dauert
 *   5. Was ueberhaupt geladen wird (Anzahl und Groesse)
 *
 * Aufruf: node tools-dev/qa/tempo.mjs
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

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
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
  for (let i = 60; i >= 1; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    daylog[ymd(d)] = { tasks: { training: true, protein: true, steps: true }, closed: true, workout: null };
    metrics.push({ type: "weight", value: Math.round((95 - 0.07 * (60 - i)) * 10) / 10,
      unit: "kg", date: ymd(d), source: "simple" });
  }
  return { mm_simple_plan: r.plan, mm_simple_daylog: daylog, mm_os_metrics: metrics, mm_transform_goal: tg };
}

/* Grenzwerte. Nicht aus der Luft: 100 ms fuehlt sich unmittelbar an,
   1 s ist die Grenze, ab der ein Gedanke abreisst (Nielsen, seit 1993
   unveraendert gueltig, weil es um Menschen geht und nicht um Hardware). */
const GRENZE = { erstInhalt: 2000, bedienbar: 2500, wechsel: 300, haekchen: 150 };

let bestanden = 0, gescheitert = 0;
const ok = (c, m) => { if (c) { bestanden++; console.log("  ✓ " + m); } else { gescheitert++; console.error("  ✗ ZU LANGSAM: " + m); } };
const gruppe = (g) => console.log("\n== " + g + " ==");

async function main() {
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, locale: "de-DE"
  });
  const page = await ctx.newPage();

  /* Ladeliste mitschreiben, bevor irgendetwas laeuft. */
  const dateien = [];
  page.on("response", async (r) => {
    const u = r.url();
    if (!u.startsWith(`http://localhost:${PORT}/`)) return;
    let n = 0;
    try { n = (await r.body()).length; } catch { /* nicht abrufbar */ }
    dateien.push({ pfad: u.replace(`http://localhost:${PORT}/`, ""), bytes: n });
  });

  await page.addInitScript((s) => {
    Object.keys(s).forEach((k) => localStorage.setItem(k, JSON.stringify(s[k])));
  }, state());

  /* Gedrosselt: 4x langsamere CPU. Das entspricht grob einem Telefon, das
     nicht neu ist — und genau dort entscheidet sich, ob es sich zaeh anfuehlt. */
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  gruppe("Kaltstart auf gedrosseltem Geraet (CPU 4x langsamer)");
  const t0 = Date.now();
  await page.goto(`http://localhost:${PORT}/meinplan.html#heute`, { waitUntil: "commit" });
  await page.waitForSelector("main .s-head", { timeout: 15000 });
  const bedienbar = Date.now() - t0;

  const fcp = await page.evaluate(() => {
    const e = performance.getEntriesByName("first-contentful-paint")[0];
    return e ? Math.round(e.startTime) : null;
  });
  ok(fcp != null && fcp < GRENZE.erstInhalt, `erster Inhalt nach ${fcp} ms (Grenze ${GRENZE.erstInhalt})`);
  ok(bedienbar < GRENZE.bedienbar, `Tagesauftrag steht nach ${bedienbar} ms (Grenze ${GRENZE.bedienbar})`);

  gruppe("Was wird geladen");
  const gesamt = dateien.reduce((a, d) => a + d.bytes, 0);
  console.log(`  ${dateien.length} Dateien, ${Math.round(gesamt / 1024)} KB`);
  dateien.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 6)
    .forEach((d) => console.log(`    ${String(Math.round(d.bytes / 1024)).padStart(4)} KB  ${d.pfad}`));

  gruppe("Bedienung (dieselbe Drosselung)");
  /* Ansichtswechsel: Klick bis der neue Inhalt steht. */
  const wechsel = await page.evaluate(async () => {
    const t = performance.now();
    location.hash = "#fortschritt";
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return Math.round(performance.now() - t);
  });
  ok(wechsel < GRENZE.wechsel, `Ansichtswechsel in ${wechsel} ms (Grenze ${GRENZE.wechsel})`);

  await page.evaluate(() => { location.hash = "#heute"; });
  await page.waitForTimeout(500);
  const haekchen = await page.evaluate(async () => {
    const t = [...document.querySelectorAll("main .s-task")]
      .filter((e) => /Schritte/.test(e.textContent))[0] || document.querySelector("main .s-task");
    const s = performance.now();
    t.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return Math.round(performance.now() - s);
  });
  ok(haekchen < GRENZE.haekchen, `Aufgabe abhaken in ${haekchen} ms (Grenze ${GRENZE.haekchen})`);

  await browser.close();
  server.close();
  console.log("\n" + (gescheitert ? "FEHLGESCHLAGEN" : "OK") +
    ` — ${bestanden} bestanden, ${gescheitert} fehlgeschlagen`);
  process.exit(gescheitert ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
