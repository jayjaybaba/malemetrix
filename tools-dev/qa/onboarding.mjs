#!/usr/bin/env node
/**
 * onboarding.mjs — der erste Weg durch die App, vom leeren Geraet bis zum
 * aktiven Plan.
 *
 * Warum eigens: alle anderen Nachweise setzen einen fertigen Plan per
 * localStorage voraus. Genau der Weg DORTHIN ist aber der einzige, den jeder
 * Nutzer genau einmal geht — und wenn er klemmt, hat die App fuer diesen
 * Nutzer nie existiert. In genau diesem Pfad lag der schwerste Fehler des
 * Tages: transformation.html konnte im Bundle seine Zielberechnung nicht
 * laden, und Schritt 1 war tot.
 *
 * Geprueft wird der ganze Ablauf:
 *   1. Leeres Geraet: alle vier Schritte sind sichtbar, drei gesperrt.
 *   2. Ziel gesetzt: Schritt 1 haekchen, Schritt 2 und 3 gehen auf.
 *   3. Planfragen beantworten -> Vorschau entsteht, ohne Fehlermeldung.
 *   4. Freigeschaltet: Plan aktivieren -> Tag 1 laeuft, Heute zeigt Aufgaben.
 *   5. Und der Plan ueberlebt einen Neustart der App.
 *
 * Aufruf: node tools-dev/qa/onboarding.mjs
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

let bestanden = 0, gescheitert = 0;
const ok = (c, m) => { if (c) { bestanden++; console.log("  ✓ " + m); } else { gescheitert++; console.error("  ✗ FEHLER: " + m); } };
const gruppe = (g) => console.log("\n== " + g + " ==");

/* Das Zielbild, wie transformation.html es hinterlegt. Bewusst hier
   nachgebildet statt die Seite fernzusteuern: geprueft wird die App, nicht
   der Fragebogen davor — und dessen eigener Nachweis ist bundle-smoke. */
const ZIEL = {
  date: new Date().toISOString(), current_kg: 95, target_kg: 85, height_cm: 183,
  kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
  mode: "natural", equip: "gym", age: 34, activity: "moderat", diet: "misch"
};

/* Beantwortet jede offene Planfrage mit einer plausiblen Angabe. Was die App
   fragt, wechselt mit dem Zielbild — deshalb wird nicht nach Feldnamen
   gesucht, sondern genommen, was dasteht. */
async function fragenBeantworten(page) {
  for (let runde = 0; runde < 12; runde++) {
    const offen = await page.evaluate(() => {
      const q = [...document.querySelectorAll("main .s-q")];
      const leer = q.filter((w) => {
        const b = [...w.querySelectorAll(".opts button")];
        if (b.length) return !b.some((x) => x.classList.contains("on"));
        const i = w.querySelector("input");
        return i ? !i.value : false;
      });
      return leer.length;
    });
    if (!offen) return runde;
    /* Immer nur EINE Frage je Runde: die App zeichnet nach jeder Antwort neu,
       danach sind alle vorher geholten Elemente veraltet. */
    const gemacht = await page.evaluate(() => {
      const w = [...document.querySelectorAll("main .s-q")].find((x) => {
        const b = [...x.querySelectorAll(".opts button")];
        if (b.length) return !b.some((y) => y.classList.contains("on"));
        const i = x.querySelector("input");
        return i ? !i.value : false;
      });
      if (!w) return false;
      const b = [...w.querySelectorAll(".opts button")];
      if (b.length) {
        /* Mehrfachauswahl (Wochentage): so viele anklicken, wie der Plan
           vorsieht. Genau hier lag der Fund — ein einzelner Tag bei drei
           geplanten fuehrt in eine Sackgasse. */
        const mehrfach = w.textContent.indexOf("Wochentagen") >= 0;
        if (mehrfach) {
          const soll = (() => {
            const t = [...document.querySelectorAll("main .s-q")]
              .find((x) => x.textContent.indexOf("Trainingstage pro Woche") >= 0);
            const an = t && t.querySelector(".opts button.on");
            return an ? parseInt(an.textContent, 10) || 3 : 3;
          })();
          b.slice(0, soll).forEach((x) => x.click());
          return true;
        }
        b[Math.min(1, b.length - 1)].click();
        return true;
      }
      const i = w.querySelector("input");
      if (i) {
        i.value = i.type === "time" ? "18:00" : (i.min ? String(Number(i.min) + 1) : "3");
        i.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      return false;
    });
    if (!gemacht) return runde;
    await page.waitForTimeout(220);
  }
  return -1;
}

async function main() {
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: "de-DE" });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message.slice(0, 140)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    const fremd = (t.match(/https?:\/\/[^\s'"]+/g) || [])
      .some((u) => !u.includes("localhost") && !u.includes("127.0.0.1"));
    if (fremd) return;
    if (/ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|net::ERR_FAILED/.test(t)) return;
    fehler.push(t.slice(0, 140));
  });

  /* about:blank dazwischen erzwingt einen echten Neustart. Ohne das ist ein
     goto auf dieselbe Adresse samt Hash KEINE Navigation — die Skripte laufen
     nicht neu, und eine gerade gesetzte localStorage-Zeile bleibt wirkungslos.
     Daran ist dieser Nachweis zuerst selbst hereingefallen. */
  const oeffnen = async (hash) => {
    await page.goto("about:blank");
    await page.goto(`http://localhost:${PORT}/meinplan.html${hash || ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
  };
  const text = () => page.locator("main").innerText().catch(() => "");

  /* ---------------------------------------------------------------- */
  gruppe("Schritt 0 — leeres Geraet");
  await oeffnen("#heute");
  /* Die App aendert dabei den Hash NICHT (render() waehlt die Ansicht
     intern) — geprueft wird also der Inhalt, nicht die Adresse. */
  const t0 = await text();
  ok(/12-Wochen-Plan/.test(t0), "ohne Plan steht das Einrichten da, nicht ein leeres Heute");
  ok(/Transformation starten/.test(t0), "Schritt 1 bietet den Einstieg an");
  const schritte = await page.locator("main .s-card h3").allInnerTexts();
  ok(schritte.length >= 4,
    `alle vier Schritte sind sichtbar, auch die gesperrten (${schritte.length}: ${schritte.join(" | ").slice(0, 80)})`);
  const punkte = await page.locator("main .s-steps i").count();
  ok(punkte === schritte.length,
    `die Fortschrittspunkte (${punkte}) passen zur Zahl der Schritte (${schritte.length})`);
  const gesperrt = await page.locator("main .s-locked").count();
  ok(gesperrt === 3, `drei Schritte sind sichtbar gesperrt (${gesperrt})`);
  ok(!/undefined|NaN|null/.test(t0), "keine Platzhalter im Text");

  /* ---------------------------------------------------------------- */
  gruppe("Schritt 1 — Ziel gesetzt");
  await page.evaluate((z) => localStorage.setItem("mm_transform_goal", JSON.stringify(z)), ZIEL);
  await oeffnen("#einrichten");
  const t1 = await text();
  ok(/95 kg → 85 kg/.test(t1), "das gewaehlte Ziel steht da: " + (t1.match(/9\d kg → \d+ kg/) || ["—"])[0]);
  ok(/Score/.test(t1), "Schritt 2 ist jetzt anwaehlbar");
  const nochGesperrt = await page.locator("main .s-locked").count();
  ok(nochGesperrt === 0, `keine gesperrte Kachel mehr, der Weg ist offen (${nochGesperrt})`);
  ok((await page.locator("main .s-q").count()) > 0, "die Planfragen stehen da");

  /* ---------------------------------------------------------------- */
  gruppe("Schritt 3 — Planfragen beantworten");
  const runden = await fragenBeantworten(page);
  ok(runden >= 0, `alle Fragen beantwortet (in ${runden} Runden)`);
  const offen = await page.evaluate(() =>
    [...document.querySelectorAll("main .s-q")].filter((w) => {
      const b = [...w.querySelectorAll(".opts button")];
      if (b.length) return !b.some((x) => x.classList.contains("on"));
      const i = w.querySelector("input");
      return i ? !i.value : false;
    }).length);
  ok(offen === 0, `keine Frage bleibt offen (${offen})`);

  await page.locator("main button", { hasText: "Planvorschau" }).first().click();
  await page.waitForTimeout(700);
  const fehlerText = (await page.locator("main .s-err").innerText().catch(() => "")).trim();
  ok(!fehlerText, "kein Fehler beim Erzeugen des Plans" + (fehlerText ? ": " + fehlerText : ""));

  const entwurf = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("mm_simple_plan") || "null"); } catch { return null; }
  });
  ok(entwurf && entwurf.status === "draft", "ein Planentwurf liegt vor (" + (entwurf && entwurf.status) + ")");
  ok(entwurf && entwurf.nutrition && entwurf.nutrition.calorieTarget >= 1500,
    "mit einem Kalorienziel ueber der Untergrenze (" + (entwurf && entwurf.nutrition && entwurf.nutrition.calorieTarget) + ")");
  ok(entwurf && entwurf.training && entwurf.training.sessions.length >= 2,
    "und mit Trainingseinheiten (" + (entwurf && entwurf.training && entwurf.training.sessions.length) + ")");

  const t3 = await text();
  ok(/Vorschau|Gesamtziel/.test(t3), "die Vorschau ist sichtbar");

  /* ---------------------------------------------------------------- */
  gruppe("Schritt 4 — Plan aktivieren");
  /* Ohne Freischaltung darf kein Plan starten — das ist die Geschaeftsregel,
     nicht ein Fehler. Erst pruefen, DASS gesperrt ist, dann freischalten. */
  const vorKauf = await text();
  const kaufKnopf = await page.locator("main a,main button", { hasText: /freischalten/i }).count();
  ok(kaufKnopf > 0 || /aktivieren/i.test(vorKauf),
    "ohne Freischaltung steht dort ein Kaufweg statt eines toten Endes");

  await page.evaluate(() => localStorage.setItem("mm_account_entitlements", JSON.stringify(["twelve_week"])));
  await oeffnen("#einrichten");
  const aktivKnopf = page.locator("main button", { hasText: /aktivieren/i }).first();
  const daKnopf = await aktivKnopf.count();
  ok(daKnopf === 1, "freigeschaltet erscheint der Aktivieren-Knopf" +
    (daKnopf ? "" : " — stattdessen steht da: " + (await text()).replace(/\n/g, " · ").slice(0, 200)));
  if (!daKnopf) {
    console.error("\nDIAGNOSE");
    console.error("  Plan:", await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("mm_simple_plan")).status; } catch { return "kein Plan"; } }));
    console.error("  Zugang:", JSON.stringify(await page.evaluate(() => {
      try { return MM.account.getDashboardState().access; } catch (e) { return String(e); } })));
    console.error("  Ueberschriften:", (await page.locator("main .s-card h3").allInnerTexts()).join(" | "));
    console.error("\nAbbruch: ohne Aktivierung ist der Rest nicht pruefbar.");
    await browser.close(); server.close();
    console.log("\nFEHLGESCHLAGEN — " + bestanden + " bestanden, " + gescheitert + " fehlgeschlagen");
    process.exit(1);
  }
  await aktivKnopf.click();
  await page.waitForTimeout(800);

  const aktiv = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("mm_simple_plan") || "null"); } catch { return null; }
  });
  const heute = new Date().toISOString().slice(0, 10);
  ok(aktiv && aktiv.status === "active", "der Plan ist aktiv (" + (aktiv && aktiv.status) + ")");
  ok(aktiv && aktiv.startDate === heute, `Tag 1 ist heute (${aktiv && aktiv.startDate})`);
  ok(aktiv && aktiv.endDate > aktiv.startDate, "und das Ende liegt danach (" + (aktiv && aktiv.endDate) + ")");
  ok((await page.evaluate(() => location.hash)) === "#heute",
    "nach dem Aktivieren steht man auf Heute, nicht weiter im Formular");

  const t4 = await text();
  ok(/TAG 1 \/ 84/.test(t4.toUpperCase().replace(/ /g, " ")), "der Kopf zeigt Tag 1 von 84");
  ok((await page.locator("main .s-task").count()) >= 2,
    "und es stehen Aufgaben da (" + (await page.locator("main .s-task").count()) + ")");
  ok(!/undefined|NaN|Infinity/.test(t4), "keine kaputten Zahlen am ersten Tag");
  /* Der Fehler, der diesen Nachweis ausgeloest hat: eine Quote aus einem
     einzigen Tag liest sich wie ein Vorwurf, bevor etwas passiert ist. */
  ok(!/Umsetzung liegt bei/.test(t4), "am ersten Tag steht keine Umsetzungsquote");

  /* ---------------------------------------------------------------- */
  gruppe("Neustart — der Plan ueberlebt");
  await oeffnen("#heute");
  const t5 = await text();
  ok(/TAG 1/.test(t5.toUpperCase().replace(/ /g, " ")), "nach dem Neuladen laeuft derselbe Tag");
  ok((await page.locator("main .s-task").count()) >= 2, "die Aufgaben sind wieder da");
  const startGewicht = await page.evaluate(() => {
    try {
      return (JSON.parse(localStorage.getItem("mm_os_metrics") || "[]") || [])
        .filter((m) => m.type === "weight").length;
    } catch { return 0; }
  });
  ok(startGewicht >= 1, `das Startgewicht wurde als Messpunkt gesetzt (${startGewicht})`);

  ok(fehler.length === 0, "kein Laufzeitfehler auf dem ganzen Weg" +
    (fehler.length ? ": " + fehler.slice(0, 3).join(" | ") : ""));

  await browser.close();
  server.close();
  console.log("\n" + (gescheitert ? "FEHLGESCHLAGEN" : "OK") +
    ` — ${bestanden} bestanden, ${gescheitert} fehlgeschlagen`);
  process.exit(gescheitert ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
