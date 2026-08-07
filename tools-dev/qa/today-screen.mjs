#!/usr/bin/env node
/**
 * today-screen.mjs — faehrt den Today-Screen in einem echten Browser gegen
 * echte Zustaende und macht Aufnahmen davon.
 *
 * Warum: Unit-Tests beweisen, dass die Entscheidung stimmt. Sie beweisen
 * nicht, dass der Bildschirm sie verstaendlich zeigt. Genau dazwischen
 * verstecken sich die peinlichen Fehler — ein Auftrag, den man wegscrollen
 * muss, oder eine Begruendung, die den Auftrag erschlaegt.
 *
 * Aufruf: node tools-dev/qa/today-screen.mjs
 * Ausgabe: tools-dev/qa/out/today-*.png plus eine Bilanz auf stdout.
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "tools-dev/qa/out");
// Port 0 = das Betriebssystem waehlt einen freien. Ein fester Port kollidiert
// mit einem noch laufenden Vorgaenger und laesst den Lauf ohne Not scheitern.
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

/* ---- Ein vollstaendiger, gueltiger Zustand: Plan aus der echten Engine ---- */
async function buildState(scenario) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const engine = require(path.join(ROOT, "js/simple/plan-engine.js"));
  const input = require(path.join(ROOT, "js/simple/plan-input.js"));
  const model = require(path.join(ROOT, "js/simple/plan-model.js"));

  const today = new Date();
  const ymd = (d) => d.toISOString().slice(0, 10);
  const todayYmd = ymd(today);
  const start = new Date(today); start.setDate(start.getDate() - 30);   // Tag 31
  const startYmd = ymd(start);

  const tg = { date: startYmd + "T10:00:00Z", current_kg: 95, target_kg: 85, height_cm: 183,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "moderat", diet: "misch" };
  // Die Trainingstage so waehlen, dass HEUTE einer ist — sonst zeigt der
  // Screen einen Ruhetag und die interessanten Faelle bleiben ungeprueft.
  const wdHeute = today.getDay();
  const weekdays = [wdHeute, (wdHeute + 2) % 7, (wdHeute + 4) % 7].sort();
  const r = engine.createPlan(input.collect({
    transformGoal: tg, checkResult: null, answers: { weekdays: weekdays }
  }), startYmd);
  if (!r.ok) throw new Error(r.errors.join(", "));
  const plan = r.plan;
  plan.status = "active";

  // Tagesprotokoll und Gewichte je Szenario
  const daylog = {};
  const metrics = [];
  const fill = (fromBack, toBack, done) => {
    for (let i = fromBack; i >= toBack; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      daylog[ymd(d)] = { tasks: { training: done, protein: done, steps: done }, closed: done, workout: null };
    }
  };
  for (let i = 30; i >= 1; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    metrics.push({ type: "weight", value: Math.round((95 - 0.07 * (30 - i)) * 10) / 10,
      unit: "kg", date: ymd(d), source: "simple" });
  }

  const store = {
    mm_simple_plan: plan,
    mm_os_metrics: metrics,
    mm_transform_goal: tg
  };

  if (scenario === "laeuft") {
    fill(14, 1, true);
  } else if (scenario === "wiedereinstieg") {
    fill(14, 6, true);                                  // danach 5 Tage nichts
  } else if (scenario === "erholung") {
    fill(14, 1, true);
    store.mm_health_today = { date: todayYmd, sleepHours: 5.1, hrvMs: 28,
      restingHeartRate: 62, baselineHrv: 58, baselineRhr: 55, steps: 3200 };
  } else if (scenario === "auswaerts") {
    fill(14, 1, true);
    store.mm_simple_day_modifier = { [todayYmd]: { type: "auswaerts", minutes: null } };
  } else if (scenario === "essen") {
    fill(14, 1, true);
    // Halber Tag gegessen: die Zeile muss den REST zeigen, nicht das Ziel.
    store.mm_simple_foodlog = {
      [todayYmd]: { kcalTarget: plan.nutrition.calorieTarget, entries: [
        { id: "fe:1", label: "Frühstück", kcal: 520, protein: 42, source: "plan" },
        { id: "fe:2", label: "Mittag", kcal: 640, protein: 51, source: "plan" }
      ] }
    };
  } else if (scenario === "schwache_umsetzung") {
    for (let i = 14; i >= 1; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const hit = i % 3 === 0;
      daylog[ymd(d)] = { tasks: { training: hit, protein: hit, steps: hit }, closed: hit };
    }
  }
  store.mm_simple_daylog = daylog;
  return store;
}

const SZENARIEN = [
  { id: "laeuft", hash: "#heute", de: "Alles laeuft" },
  { id: "wiedereinstieg", hash: "#heute", de: "Fuenf Tage Pause" },
  { id: "erholung", hash: "#heute", de: "Zwei Erholungssignale" },
  { id: "auswaerts", hash: "#heute", de: "Auswaertsessen gemeldet" },
  { id: "essen", hash: "#heute", de: "Halber Tag gegessen" },
  { id: "schwache_umsetzung", hash: "#fortschritt", de: "Schwache Umsetzung (Fortschritt)" }
];

let pass = 0, fail = 0, netz = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.error("  ✗ FAIL: " + m); } };

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const server = await serve();
  // Der Runner bringt Chromium mit (PLAYWRIGHT_BROWSERS_PATH). Die npm-Version
  // von Playwright erwartet unter Umstaenden einen anderen Build-Ordner —
  // deshalb wird der vorhandene Browser direkt benannt statt nachgeladen.
  const VORHANDEN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(VORHANDEN) ? { executablePath: VORHANDEN } : {});
  const errors = [];

  for (const s of SZENARIEN) {
    console.log("\n== " + s.de + " ==");
    const state = await buildState(s.id);
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 },
      deviceScaleFactor: 2, locale: "de-DE" });
    const page = await ctx.newPage();
    // Ausgehende Verbindungen (Supabase, Schriften, Analytics) sind in dieser
    // Umgebung gesperrt. Das ist Sandbox-Rauschen, kein App-Fehler — es wird
    // gezaehlt und benannt, aber nicht als Defekt gewertet.
    page.on("pageerror", (e) => errors.push(s.id + ": " + e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (/ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_FAILED/.test(t)) {
        netz++; return;
      }
      errors.push(s.id + " console: " + t);
    });

    await page.addInitScript((st) => {
      Object.keys(st).forEach((k) => localStorage.setItem(k, JSON.stringify(st[k])));
    }, state);
    await page.goto(`http://localhost:${PORT}/meinplan.html${s.hash}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    const shot = path.join(OUT, "today-" + s.id + ".png");
    await page.screenshot({ path: shot, fullPage: false });

    // Was der Bildschirm tatsaechlich sagt
    const headline = (await page.locator(".s-head .goal").first().textContent().catch(() => "")) || "";
    const focus = (await page.locator(".s-head .status").first().textContent().catch(() => "")) || "";
    const whys = await page.locator(".s-why p").allTextContents().catch(() => []);
    const bodyText = await page.locator("body").innerText();

    if (s.hash === "#heute") {
      ok(headline.trim().length > 0, "es steht eine Ansage oben: „" + headline.trim() + "”");
      // Der Auftrag muss ohne Scrollen sichtbar sein — das ist die Kernanforderung.
      const box = await page.locator(".s-tasks").first().boundingBox();
      ok(box && box.y < 852, "die Aufgabenliste beginnt im sichtbaren Bereich (y=" + Math.round(box ? box.y : -1) + ")");
      ok(whys.length <= 2, "hoechstens zwei Begruendungen (" + whys.length + ")");
      // Der gefundene Fehler als Dauerpruefung: die Ansage darf nicht unter
      // der fixierten Kopfzeile verschwinden.
      const kopf = await page.locator(".site-header").first().boundingBox();
      const ansage = await page.locator(".s-head").first().boundingBox();
      ok(kopf && ansage && ansage.y >= kopf.y + kopf.height - 1,
        "die Ansage liegt unter der Kopfzeile, nicht dahinter (Kopf endet " +
        Math.round(kopf ? kopf.y + kopf.height : -1) + ", Ansage beginnt " + Math.round(ansage ? ansage.y : -1) + ")");
    }

    if (s.id === "wiedereinstieg") {
      ok(/Wiedereinstieg/.test(headline), "der Wiedereinstieg wird benannt");
      ok(whys.some((w) => /nicht kaputt/.test(w)), "und ausdruecklich entlastet");
      ok(!/Streak|verloren/i.test(bodyText), "kein Wort von verlorener Streak");
    }
    if (s.id === "erholung") {
      ok(/leichter trainieren/.test(headline), "Ansage: leichter trainieren");
      ok(/Satz weniger/.test(bodyText), "das Volumen sinkt sichtbar, das Training faellt nicht aus");
    }
    if (s.id === "auswaerts") {
      ok(/Auswärtsessen|Auswaertsessen/.test(headline), "die Meldung ist oben sichtbar");
      ok(/Protein früh/.test(focus + bodyText), "und fuehrt zu einer Verteilungsregel");
    }
    if (s.id === "essen") {
      ok(/Noch \d+ g Protein/.test(bodyText),
        "die Zeile zeigt, was noch FEHLT, nicht das Tagesziel");
      ok(/1160 \/ \d+ kcal/.test(bodyText),
        "gegessene Kalorien stehen gegen das Ziel (1160 aus zwei Eintraegen)");
      ok(!/Mindestens \d+ g Protein erreichen/.test(bodyText),
        "die alte Haekchen-Formulierung ist verschwunden, sobald gemessen wird");
    }
    if (s.id === "schwache_umsetzung") {
      ok(/Ausführung/.test(bodyText), "die Execution-Karte ist da");
      ok(/NICHT verschärft/.test(bodyText), "und nennt die Konsequenz statt nur die Zahl");
    }

    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log("\n== Laufzeitfehler ==");
  ok(errors.length === 0, errors.length ? "Fehler: " + errors.slice(0, 5).join(" | ") : "keine JS-Fehler in allen Szenarien");
  console.log("  (" + netz + " blockierte Netzabrufe — Sandbox ohne Internet, kein App-Fehler)");
  console.log("\nAufnahmen in tools-dev/qa/out/");
  console.log((fail ? "FAILED" : "OK") + " — " + pass + " bestanden, " + fail + " fehlgeschlagen");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
