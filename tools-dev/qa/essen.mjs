#!/usr/bin/env node
/**
 * essen.mjs — prueft das Essens-Protokoll im Browser.
 *
 * Warum eigens: foodlog.js hat drei Eingabewege (Planmahlzeit, wiederholte
 * eigene Mahlzeit, freier Eintrag), und das Blatt rechnet nach jedem Eintrag
 * neu. Der Sweep tippt Knoepfe an und schaut, ob sich etwas ruehrt — er
 * prueft nicht, ob die RICHTIGE Zahl herauskommt. Genau dort sitzt aber der
 * Unterschied zwischen einer App, der man glaubt, und einer, der man nicht
 * mehr glaubt.
 *
 * Geprueft wird:
 *   1. Das Blatt oeffnet sich und zeigt Ziel und Rest.
 *   2. Ein Eintrag erhoeht die Summe um genau seinen Wert.
 *   3. Das Blatt bleibt dabei STEHEN — es schliesst und oeffnet sich nicht.
 *   4. Loeschen nimmt genau diesen Wert wieder heraus.
 *   5. Der Heute-Bildschirm zeigt danach dieselben Zahlen wie das Blatt.
 *
 * Aufruf: node tools-dev/qa/essen.mjs
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

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2",
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

/* Liest „1.234 / 2.363 kcal" aus der Kopfzeile des Blattes. */
const summe = (page) => page.evaluate(() => {
  const t = document.querySelector(".s-sheet .ctx");
  if (!t) return null;
  const m = t.textContent.replace(/\./g, "").match(/(\d+)\s*\/\s*(\d+)\s*kcal.*?(\d+)\s*\/\s*(\d+)\s*g/);
  return m ? { kcal: +m[1], kcalZiel: +m[2], protein: +m[3], proteinZiel: +m[4] } : null;
});

async function main() {
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: "de-DE" });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message.slice(0, 140)));
  await page.addInitScript((s) => {
    Object.keys(s).forEach((k) => localStorage.setItem(k, JSON.stringify(s[k])));
  }, state());
  await page.goto(`http://localhost:${PORT}/meinplan.html#heute`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  gruppe("Das Blatt oeffnet sich und rechnet");
  await page.locator("main .s-task", { hasText: "Protein" }).first().click();
  await page.waitForTimeout(500);
  ok((await page.locator(".s-sheet").count()) === 1, "das Essens-Blatt ist offen");
  const start = await summe(page);
  ok(start != null, "Ziel und Stand stehen als Zahlen da");
  ok(start && start.kcal === 0, `noch nichts gegessen: ${start && start.kcal} kcal`);
  ok(start && start.kcalZiel > 1500, `das Kalorienziel steht (${start && start.kcalZiel})`);

  gruppe("Ein Eintrag erhoeht die Summe um genau seinen Wert");
  /* Der erste Vorschlagsknopf traegt seine Werte im Text — daran laesst sich
     pruefen, ob die Summe genau darum waechst. */
  const vorschlag = page.locator(".s-sheet button", { hasText: /kcal ·/ }).first();
  const label = await vorschlag.innerText();
  const m = label.replace(/\./g, "").match(/(\d+)\s*kcal\s*·\s*(\d+)\s*g/);
  ok(m != null, "ein Vorschlag mit Naehrwerten ist da: " + label.split("\n")[0]);
  const zuKcal = m ? +m[1] : 0, zuP = m ? +m[2] : 0;

  const blattVorher = await page.evaluate(() => document.querySelector(".s-sheet") === null);
  await vorschlag.click();
  await page.waitForTimeout(60);
  /* Direkt nach dem Klick muss dasselbe Blatt noch stehen — kein Zu und Auf. */
  const nochOffen = await page.evaluate(() => {
    const s = document.querySelector(".s-sheet");
    return s ? { da: true, schliesst: s.classList.contains("is-closing") } : { da: false };
  });
  ok(nochOffen.da && !nochOffen.schliesst,
    "das Blatt bleibt stehen — der Inhalt wird getauscht, nicht das Blatt");
  ok(blattVorher === false, "und war vorher schon offen");

  await page.waitForTimeout(350);
  const nach = await summe(page);
  ok(nach && nach.kcal === zuKcal, `Summe stimmt: ${nach && nach.kcal} = ${zuKcal} kcal`);
  ok(nach && nach.protein === zuP, `Protein stimmt: ${nach && nach.protein} = ${zuP} g`);
  ok((await page.locator(".s-food-row").count()) === 1, "der Eintrag steht in der Liste");

  gruppe("Loeschen nimmt genau diesen Wert wieder heraus");
  await page.locator(".s-food-row button").first().click();
  await page.waitForTimeout(350);
  const zurueck = await summe(page);
  ok(zurueck && zurueck.kcal === 0, `wieder bei ${zurueck && zurueck.kcal} kcal`);
  ok((await page.locator(".s-food-row").count()) === 0, "die Liste ist leer");
  ok((await page.locator(".s-sheet").count()) === 1, "und das Blatt steht immer noch");

  gruppe("Der Heute-Bildschirm zeigt dieselben Zahlen");
  await page.locator(".s-sheet button", { hasText: /kcal ·/ }).first().click();
  await page.waitForTimeout(350);
  const imBlatt = await summe(page);
  await page.locator(".s-sheet-back").click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(400);
  ok((await page.locator(".s-sheet").count()) === 0, "das Blatt laesst sich schliessen");
  const zeile = await page.locator("main .s-task", { hasText: /kcal/ }).first().innerText();
  const zahl = zeile.replace(/\./g, "").match(/(\d+)\s*\/\s*(\d+)\s*kcal/);
  ok(zahl != null, "die Aufgabenzeile nennt jetzt echte Zahlen: " + zeile.replace(/\n/g, " · "));
  ok(zahl && imBlatt && +zahl[1] === imBlatt.kcal,
    `und dieselben wie im Blatt (${zahl && zahl[1]} = ${imBlatt && imBlatt.kcal})`);

  ok(fehler.length === 0, "kein Laufzeitfehler" + (fehler.length ? ": " + fehler.join(" | ") : ""));

  await browser.close();
  server.close();
  console.log("\n" + (gescheitert ? "FEHLGESCHLAGEN" : "OK") +
    ` — ${bestanden} bestanden, ${gescheitert} fehlgeschlagen`);
  process.exit(gescheitert ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
