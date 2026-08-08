#!/usr/bin/env node
/**
 * anpassen.mjs — das dichteste Formular der App im Browser.
 *
 * „Plan anpassen" hat rund 20 Fragen und schreibt beim Speichern den ganzen
 * Plan neu. Genau dort sitzen die Fehler, die man erst merkt, wenn der Plan
 * schon kaputt ist — und die kein Unit-Test sieht, weil sie aus dem
 * Zusammenspiel von Eingabefeld, Sammler und Torwaechter entstehen.
 *
 * Geprueft wird:
 *   1. Ein geleertes Zahlenfeld speichert KEINEN Plan ohne Kalorienziel.
 *   2. Ein Fehlschlag beim Speichern ist sichtbar (das Feld war nie
 *      in die Seite eingehaengt — jeder Fehlschlag war stumm).
 *   3. Speichern ohne Aenderung erzeugt keine neue Planversion.
 *   4. Eine Anpassung verwirft nicht still, was der Wochencheck aufgebaut hat.
 *   5. Verlassen ohne Speichern verwirft die Eingaben wirklich.
 *
 * Aufruf: node tools-dev/qa/anpassen.mjs
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

function zustand(kcalVersatz) {
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
  /* Einen Wochencheck nachstellen: das System hat gekuerzt, der Fragebogen
     weiss davon nichts. engineBase haelt fest, was der Fragebogen zuletzt
     errechnet hatte. */
  if (kcalVersatz) {
    r.plan.engineBase = { kcal: r.plan.nutrition.calorieTarget, steps: r.plan.dailyTargets.steps };
    r.plan.nutrition.calorieTarget += kcalVersatz;
    r.plan.version = 2;
  }
  return { mm_simple_plan: r.plan, mm_transform_goal: tg, mm_simple_daylog: {}, mm_os_metrics: [] };
}

let bestanden = 0, gescheitert = 0;
const ok = (c, m) => { if (c) { bestanden++; console.log("  ✓ " + m); } else { gescheitert++; console.error("  ✗ FEHLER: " + m); } };
const gruppe = (g) => console.log("\n== " + g + " ==");

async function seite(browser, st) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: "de-DE" });
  const page = await ctx.newPage();
  await page.addInitScript((s) => {
    Object.keys(s).forEach((k) => localStorage.setItem(k, JSON.stringify(s[k])));
  }, st);
  await page.goto(`http://localhost:${PORT}/meinplan.html#anpassen`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  return { ctx, page };
}
const planLesen = (page) => page.evaluate(() => {
  try {
    const p = JSON.parse(localStorage.getItem("mm_simple_plan"));
    return { v: p.version, kcal: p.nutrition.calorieTarget, prot: p.nutrition.proteinTargetGrams,
             mahlzeiten: p.nutrition.mealCount, basis: p.engineBase ? p.engineBase.kcal : null };
  } catch { return null; }
});
/* Leert ein Zahlenfeld so, wie ein Mensch es tut: markieren, loeschen,
   Feld verlassen. Das change-Ereignis kommt beim Verlassen. */
async function feldLeeren(page, label) {
  return page.evaluate((lbl) => {
    const w = [...document.querySelectorAll("main .s-q")].find((x) => x.textContent.indexOf(lbl) === 0
      || x.querySelector(".lbl") && x.querySelector(".lbl").textContent.trim() === lbl);
    const i = w && w.querySelector("input");
    if (!i) return false;
    i.value = "";
    i.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, label);
}

async function main() {
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});

  /* ---------------------------------------------------------------- */
  gruppe("Ein geleertes Zahlenfeld darf den Plan nicht ausloeschen");
  {
    const { ctx, page } = await seite(browser, zustand(0));
    const vorher = await planLesen(page);
    ok(vorher && vorher.kcal > 1500, `Ausgangsplan hat ein Kalorienziel (${vorher && vorher.kcal})`);

    ok(await feldLeeren(page, "Alter"), "das Alter-Feld ist da und wurde geleert");
    await page.locator("main button", { hasText: "Anpassung speichern" }).first().click();
    await page.waitForTimeout(700);

    const nachher = await planLesen(page);
    ok(nachher && nachher.kcal === vorher.kcal,
      `das Kalorienziel steht unveraendert (${nachher && nachher.kcal})`);
    ok(nachher && nachher.v === vorher.v, `keine neue Planversion (${nachher && nachher.v})`);
    const meldung = (await page.locator("main .s-err").innerText().catch(() => "")).trim();
    ok(meldung.length > 0, "und es steht eine Meldung da: " + (meldung || "— keine —"));
    /* Ein geleertes Feld faellt auf den Wert des gespeicherten Plans zurueck,
       statt den Nutzer zur Neueingabe zu zwingen. Deshalb heisst die Meldung
       hier „Nichts geändert" und nicht „Es fehlt noch: Alter" — das ist das
       richtige Verhalten: Loeschen darf nichts kaputt machen, und es soll
       auch nicht in eine Pflichtabfrage zwingen. */
    ok(/Nichts geändert|Es fehlt noch/.test(meldung),
      "die verstaendlich ist, statt kommentarlos zu bleiben");
    ok(!/\bage\b|NaN|undefined/.test(meldung), "und keine internen Kennungen enthaelt");
    ok((await page.evaluate(() => location.hash)) === "#anpassen",
      "der Nutzer bleibt im Formular, statt kommentarlos wegzuspringen");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  gruppe("Speichern ohne Aenderung ist kein Speichern");
  {
    const { ctx, page } = await seite(browser, zustand(0));
    const vorher = await planLesen(page);
    await page.locator("main button", { hasText: "Anpassung speichern" }).first().click();
    await page.waitForTimeout(700);
    const nachher = await planLesen(page);
    ok(nachher && nachher.v === vorher.v,
      `keine neue Planversion aus dem Nichts (${vorher && vorher.v} -> ${nachher && nachher.v})`);
    const meldung = (await page.locator("main .s-err").innerText().catch(() => "")).trim();
    ok(/Nichts geändert/.test(meldung), "und die App sagt es: " + (meldung || "— nichts —"));
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  gruppe("Eine Anpassung verwirft nicht, was der Wochencheck aufgebaut hat");
  {
    /* Ausgangslage: der Wochencheck hat um 200 kcal gekuerzt. Jetzt aendert
       der Nutzer die Zahl der Mahlzeiten — etwas, das mit Kalorien nichts zu
       tun hat. Vorher setzte das den Wert auf den Fragebogenstand zurueck. */
    const st = zustand(-200);
    const gekuerzt = st.mm_simple_plan.nutrition.calorieTarget;
    const basis = st.mm_simple_plan.engineBase.kcal;
    const { ctx, page } = await seite(browser, st);
    ok(gekuerzt === basis - 200, `Ausgangslage: gekuerzt auf ${gekuerzt} (Fragebogen: ${basis})`);

    const gewechselt = await page.evaluate(() => {
      const w = [...document.querySelectorAll("main .s-q")]
        .find((x) => x.textContent.indexOf("Mahlzeiten") >= 0);
      const b = w && [...w.querySelectorAll(".opts button")].find((x) => !x.classList.contains("on"));
      if (!b) return null;
      const alt = w.querySelector(".opts button.on");
      b.click();
      return { von: alt ? alt.textContent : "?", zu: b.textContent };
    });
    ok(gewechselt, `Mahlzeiten geaendert (${gewechselt && gewechselt.von} -> ${gewechselt && gewechselt.zu})`);
    await page.waitForTimeout(300);
    await page.locator("main button", { hasText: "Anpassung speichern" }).first().click();
    await page.waitForTimeout(800);

    const nachher = await planLesen(page);
    ok(nachher && nachher.mahlzeiten !== st.mm_simple_plan.nutrition.mealCount,
      `die gewollte Aenderung ist da (Mahlzeiten ${nachher && nachher.mahlzeiten})`);
    ok(nachher && nachher.kcal < basis,
      `die Kuerzung des Wochenchecks ueberlebt (${nachher && nachher.kcal} statt ${basis})`);
    ok(nachher && Math.abs((nachher.kcal - nachher.basis) - (-200)) <= 2,
      `und zwar genau um die 200 kcal (Versatz ${nachher && (nachher.kcal - nachher.basis)})`);
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  gruppe("Verlassen ohne Speichern verwirft die Eingaben");
  {
    const { ctx, page } = await seite(browser, zustand(0));
    const vorher = await planLesen(page);
    await page.evaluate(() => {
      const w = [...document.querySelectorAll("main .s-q")]
        .find((x) => x.textContent.indexOf("Mahlzeiten") >= 0);
      const b = w && [...w.querySelectorAll(".opts button")].find((x) => !x.classList.contains("on"));
      if (b) b.click();
    });
    await page.waitForTimeout(300);
    /* Weg und zurueck, ohne zu speichern. */
    await page.evaluate(() => { location.hash = "#profil"; });
    await page.waitForTimeout(400);
    await page.evaluate(() => { location.hash = "#anpassen"; });
    await page.waitForTimeout(500);
    await page.locator("main button", { hasText: "Anpassung speichern" }).first().click();
    await page.waitForTimeout(700);
    const nachher = await planLesen(page);
    ok(nachher && nachher.mahlzeiten === vorher.mahlzeiten,
      `die verworfene Eingabe wird nicht nachtraeglich gespeichert (${nachher && nachher.mahlzeiten})`);
    ok(nachher && nachher.v === vorher.v, "und es entsteht keine Planversion daraus");
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log("\n" + (gescheitert ? "FEHLGESCHLAGEN" : "OK") +
    ` — ${bestanden} bestanden, ${gescheitert} fehlgeschlagen`);
  process.exit(gescheitert ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
