#!/usr/bin/env node
/**
 * bedienhilfen.mjs — prueft die App so, wie jemand sie bedient, der nicht
 * tippt oder nicht sieht.
 *
 * Apple prueft das in der Review, und es ist der Teil, den man mit blossem
 * Hinsehen nie bemerkt: ein klickbares DIV sieht aus wie ein Knopf, ist aber
 * mit der Tastatur nicht erreichbar. Eine Auswahl, die nur farbig ist, sagt
 * VoiceOver gar nichts. Ein Blatt ohne role="dialog" laesst den Bildschirm
 * dahinter weiter vorlesen.
 *
 * Geprueft wird:
 *   1. Jedes Bedienelement ist per Tastatur erreichbar und hat einen Namen.
 *   2. Ausgewaehlte Antworten tragen aria-pressed, nicht nur eine Farbe.
 *   3. Das Blatt ist ein Dialog, legt den Hintergrund still und gibt den
 *      Fokus danach zurueck.
 *   4. Es gibt eine Ueberschrift der Ebene 1 und keine Sprunge in der Folge.
 *   5. aria-live liegt auf einer Statuszeile, nicht auf dem ganzen Bildschirm.
 *
 * Aufruf: node tools-dev/qa/bedienhilfen.mjs
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

function zustand() {
  const engine = require(path.join(ROOT, "js/simple/plan-engine.js"));
  const input = require(path.join(ROOT, "js/simple/plan-input.js"));
  const heute = new Date();
  const ymd = (d) => d.toISOString().slice(0, 10);
  const start = new Date(heute); start.setDate(start.getDate() - 30);
  const tg = { date: ymd(start) + "T10:00:00Z", current_kg: 95, target_kg: 85, height_cm: 183,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "moderat", diet: "misch" };
  const wd = heute.getDay();
  const r = engine.createPlan(input.collect({
    transformGoal: tg, checkResult: null,
    answers: { weekdays: [wd, (wd + 2) % 7, (wd + 4) % 7].sort() }
  }), ymd(start));
  if (!r.ok) throw new Error("Testplan ungueltig: " + r.errors.join(", "));
  r.plan.status = "active";
  const daylog = {}, metrics = [];
  for (let i = 20; i >= 1; i--) {
    const d = new Date(heute); d.setDate(d.getDate() - i);
    daylog[ymd(d)] = { tasks: { training: true, protein: true, steps: true }, closed: true, workout: null };
    metrics.push({ type: "weight", value: Math.round((95 - 0.07 * (20 - i)) * 10) / 10,
      unit: "kg", date: ymd(d), source: "simple" });
  }
  return { mm_simple_plan: r.plan, mm_simple_daylog: daylog, mm_os_metrics: metrics, mm_transform_goal: tg };
}

let bestanden = 0, gescheitert = 0;
const ok = (c, m) => { if (c) { bestanden++; console.log("  ✓ " + m); } else { gescheitert++; console.error("  ✗ FEHLER: " + m); } };
const gruppe = (g) => console.log("\n== " + g + " ==");

/* Der zugaengliche Name eines Elements — grob nach derselben Reihenfolge,
   die Hilfstechnik verwendet. */
const OHNE_NAMEN = `(() => {
  const raus = [];
  document.querySelectorAll("main button, main a[href], main input, main select, main textarea").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const name = (el.getAttribute("aria-label") || "").trim()
      || (el.getAttribute("aria-labelledby") ? "via labelledby" : "")
      || (el.id && document.querySelector('label[for="' + el.id + '"]') ? "via label" : "")
      || (el.closest("label") ? (el.closest("label").textContent || "").trim() : "")
      || (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" ? "" : (el.textContent || "").trim())
      || (el.getAttribute("title") || "").trim()
      || (el.getAttribute("placeholder") || "").trim();
    if (!name) raus.push(el.tagName.toLowerCase() + "." + String(el.className || "").split(" ")[0]);
  });
  return raus;
})()`;

async function main() {
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: "de-DE" });
  const page = await ctx.newPage();
  await page.addInitScript((s) => {
    Object.keys(s).forEach((k) => localStorage.setItem(k, JSON.stringify(s[k])));
  }, zustand());
  const oeffnen = async (hash) => {
    await page.goto(`http://localhost:${PORT}/meinplan.html${hash}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
  };

  /* ---------------------------------------------------------------- */
  gruppe("aria-live liegt nicht auf dem ganzen Bildschirm");
  await oeffnen("#heute");
  ok(!(await page.evaluate(() => document.getElementById("sapp").hasAttribute("aria-live"))),
    "main traegt kein aria-live — sonst liest VoiceOver bei jedem Haekchen alles neu vor");
  ok(await page.evaluate(() => !!document.getElementById("sappStatus")),
    "es gibt eine eigene Statuszeile fuer Ansagen");
  /* Und sie wird auch benutzt. */
  await page.locator("main .s-task", { hasText: "Schritte" }).first().click();
  await page.waitForTimeout(300);
  const ansage = await page.evaluate(() => document.getElementById("sappStatus").textContent.trim());
  ok(ansage.length > 0 && /Schritte/.test(ansage), "und beim Abhaken steht dort genau ein Satz: " + ansage);

  /* ---------------------------------------------------------------- */
  gruppe("Die Tagesaufgaben sind mit der Tastatur bedienbar");
  await oeffnen("#heute");
  const aufgaben = await page.evaluate(() => {
    const t = [...document.querySelectorAll("main .s-task")];
    return t.map((e) => ({ tag: e.tagName, pressed: e.getAttribute("aria-pressed") }));
  });
  ok(aufgaben.length >= 2, `es gibt ${aufgaben.length} Aufgabenzeilen`);
  ok(aufgaben.every((a) => a.tag === "BUTTON"),
    "jede ist ein <button>, kein klickbares DIV (" + aufgaben.map((a) => a.tag).join(",") + ")");
  ok(aufgaben.every((a) => a.pressed === "true" || a.pressed === "false"),
    "und jede sagt ihren Zustand an (aria-pressed)");
  /* Wirklich per Tastatur: mit der Leertaste abhaken. */
  const vorher = await page.evaluate(() =>
    document.querySelectorAll("main .s-task.done").length);
  await page.locator("main .s-task").last().focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  const nachher = await page.evaluate(() =>
    document.querySelectorAll("main .s-task.done").length);
  ok(nachher !== vorher, `die Leertaste hakt wirklich ab (${vorher} -> ${nachher})`);

  /* ---------------------------------------------------------------- */
  gruppe("Jedes Bedienelement hat einen Namen");
  for (const [hash, name] of [["#heute", "Heute"], ["#anpassen", "Plan anpassen"],
                              ["#check", "Wochencheck"], ["#workout", "Workout"],
                              ["#profil", "Profil"]]) {
    await oeffnen(hash);
    const ohne = await page.evaluate(OHNE_NAMEN);
    ok(ohne.length === 0, `${name}: alle Bedienelemente haben einen Namen` +
      (ohne.length ? " — ohne: " + [...new Set(ohne)].slice(0, 5).join(", ") : ""));
  }

  /* ---------------------------------------------------------------- */
  gruppe("Auswahl ist nicht nur eine Farbe");
  await oeffnen("#anpassen");
  const chips = await page.evaluate(() => {
    const b = [...document.querySelectorAll("main .s-q .opts button")];
    return { gesamt: b.length, mitZustand: b.filter((x) => x.hasAttribute("aria-pressed")).length,
             an: b.filter((x) => x.classList.contains("on")).length,
             anUndGesetzt: b.filter((x) => x.classList.contains("on") && x.getAttribute("aria-pressed") === "true").length };
  });
  ok(chips.gesamt > 10, `${chips.gesamt} Auswahlknoepfe auf dem dichtesten Formular`);
  ok(chips.mitZustand === chips.gesamt,
    `alle sagen ihren Zustand an (${chips.mitZustand}/${chips.gesamt})`);
  ok(chips.an > 0 && chips.anUndGesetzt === chips.an,
    `und bei den ausgewaehlten stimmt er (${chips.anUndGesetzt}/${chips.an})`);

  /* ---------------------------------------------------------------- */
  gruppe("Das Blatt ist ein Dialog");
  await oeffnen("#heute");
  await page.locator("main .s-chip", { hasText: "passt nicht" }).first().click();
  await page.waitForTimeout(500);
  const blatt = await page.evaluate(() => {
    const s = document.querySelector(".s-sheet");
    return s ? {
      rolle: s.getAttribute("role"), modal: s.getAttribute("aria-modal"),
      betitelt: !!s.getAttribute("aria-labelledby"),
      hintergrundStill: document.getElementById("sapp").getAttribute("aria-hidden") === "true",
      navStill: (document.querySelector(".s-nav") || {}).getAttribute
        ? document.querySelector(".s-nav").getAttribute("aria-hidden") === "true" : false
    } : null;
  });
  ok(blatt && blatt.rolle === "dialog", "es sagt sich als Dialog an");
  ok(blatt && blatt.modal === "true", "und als modal");
  ok(blatt && blatt.betitelt, "mit einem Titel (aria-labelledby)");
  ok(blatt && blatt.hintergrundStill && blatt.navStill,
    "der Bildschirm dahinter ist fuer Hilfstechnik stillgelegt");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const danach = await page.evaluate(() => ({
    weg: !document.querySelector(".s-sheet"),
    frei: !document.getElementById("sapp").hasAttribute("aria-hidden"),
    fokus: document.activeElement ? document.activeElement.tagName + "." +
      String(document.activeElement.className || "").split(" ")[0] : "—"
  }));
  ok(danach.weg, "Escape schliesst es");
  ok(danach.frei, "der Hintergrund ist danach wieder freigegeben");
  ok(danach.fokus !== "BODY.", "und der Fokus faellt nicht auf <body>: " + danach.fokus);

  /* ---------------------------------------------------------------- */
  gruppe("Ueberschriften");
  await oeffnen("#heute");
  const h = await page.evaluate(() =>
    [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map((e) => +e.tagName[1]));
  ok(h.length > 0, `der Hauptbildschirm hat Ueberschriften (${h.join(",")})`);
  ok(h[0] === 1, "und faengt bei Ebene 1 an — ein Einstiegspunkt fuer die Navigation");
  let sprung = null;
  for (let i = 1; i < h.length; i++) if (h[i] - h[i - 1] > 1) sprung = h[i - 1] + "->" + h[i];
  ok(!sprung, "keine uebersprungene Ebene" + (sprung ? " — " + sprung : ""));

  await browser.close();
  server.close();
  console.log("\n" + (gescheitert ? "FEHLGESCHLAGEN" : "OK") +
    ` — ${bestanden} bestanden, ${gescheitert} fehlgeschlagen`);
  process.exit(gescheitert ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
