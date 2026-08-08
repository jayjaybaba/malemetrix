#!/usr/bin/env node
/**
 * app-sweep.mjs — faehrt die gesamte App in einem echten Browser ab und sucht
 * Fehler, die kein Unit-Test finden kann.
 *
 * Der Unterschied zu tools-dev/tests/: Dort wird Logik geprueft. Hier wird
 * BEDIENUNG geprueft — jeder Bildschirm in jedem Zustand, jeder Knopf, jede
 * Flaeche. Genau dazwischen sitzen die peinlichen Fehler: ein Knopf ohne
 * Wirkung, ein Text, der aus dem Bild laeuft, eine Flaeche, die auf dem
 * Daumen zu klein ist, ein leerer Bildschirm ohne Erklaerung.
 *
 * Geprueft wird je Bildschirm:
 *   1. Laufzeitfehler (JS-Ausnahmen, Konsolenfehler)
 *   2. Tote Knoepfe — klickbar, aber ohne Wirkung
 *   3. Seitlicher Ueberlauf — Text oder Karten, die aus dem Bild laufen
 *   4. Zu kleine Tippflaechen (Apple: mindestens 44x44 pt)
 *   5. Leere Bildschirme ohne erklaerenden Text
 *   6. Ueberlappungen mit der festen Kopf- und Fusszeile
 *
 * Aufruf: node tools-dev/qa/app-sweep.mjs
 * Ausgabe: Befundliste auf stdout, Aufnahmen in tools-dev/qa/out/sweep/
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "tools-dev/qa/out/sweep");
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

/* ---------------- Zustaende, in denen die App existieren kann ------------- */
function baseState(opts) {
  opts = opts || {};
  const engine = require(path.join(ROOT, "js/simple/plan-engine.js"));
  const input = require(path.join(ROOT, "js/simple/plan-input.js"));

  const today = new Date();
  const ymd = (d) => d.toISOString().slice(0, 10);
  const todayYmd = ymd(today);
  const start = new Date(today); start.setDate(start.getDate() - (opts.dayNo || 31) + 1);
  const startYmd = ymd(start);

  const tg = { date: startYmd + "T10:00:00Z", current_kg: 95, target_kg: 85, height_cm: 183,
    kind: "realistic", direction: "cut", months: 6, exp: "mid", days: 3,
    mode: "natural", equip: "gym", age: 34, activity: "moderat", diet: "misch" };
  const wd = today.getDay();
  const r = engine.createPlan(input.collect({
    transformGoal: tg, checkResult: null,
    answers: { weekdays: [wd, (wd + 2) % 7, (wd + 4) % 7].sort() }
  }), startYmd);
  if (!r.ok) throw new Error("Testplan ungueltig: " + r.errors.join(", "));
  const plan = r.plan;
  plan.status = "active";

  const daylog = {}, metrics = [];
  for (let i = 20; i >= 1; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    daylog[ymd(d)] = { tasks: { training: true, protein: true, steps: true }, closed: true, workout: null };
    metrics.push({ type: "weight", value: Math.round((95 - 0.07 * (20 - i)) * 10) / 10,
      unit: "kg", date: ymd(d), source: "simple" });
  }
  return { mm_simple_plan: plan, mm_simple_daylog: daylog, mm_os_metrics: metrics,
           mm_transform_goal: tg, _todayYmd: todayYmd };
}

const ZUSTAENDE = [
  { id: "neu", de: "Neuer Nutzer, kein Plan", state: () => ({}) },
  { id: "aktiv", de: "Aktiver Plan, Tag 31", state: () => baseState() },
  {
    id: "leer", de: "Plan aktiv, aber noch nichts protokolliert",
    state: () => { const s = baseState({ dayNo: 2 }); s.mm_simple_daylog = {}; s.mm_os_metrics = []; return s; }
  },
  {
    id: "fertig", de: "12 Wochen abgeschlossen",
    state: () => baseState({ dayNo: 90 })
  }
];

/* Jeder erreichbare Bildschirm. Die Plan-Untertabs zaehlen einzeln — sie
   sind eigene Ansichten, auch wenn sie dieselbe Route teilen. */
const ANSICHTEN = [
  { hash: "#heute", de: "Heute" },
  { hash: "#plan", de: "Mein Plan · Woche", tab: "woche" },
  { hash: "#plan", de: "Mein Plan · Training", tab: "training" },
  { hash: "#plan", de: "Mein Plan · Ernährung", tab: "ernaehrung" },
  { hash: "#plan", de: "Mein Plan · Einkauf", tab: "einkauf" },
  { hash: "#plan", de: "Mein Plan · iPhone", tab: "iphone" },
  { hash: "#fortschritt", de: "Fortschritt" },
  { hash: "#profil", de: "Profil" },
  { hash: "#check", de: "Wochencheck" },
  { hash: "#anpassen", de: "Plan anpassen" },
  { hash: "#workout", de: "Workout" }
];

const VIEWPORT = { width: 393, height: 852 };   // iPhone 16 Pro
const MIN_TAP = 44;                              // Apple Human Interface Guidelines

const befunde = [];
function befund(schwere, zustand, ansicht, was, detail) {
  befunde.push({ schwere, zustand, ansicht, was, detail });
}

async function pruefeAnsicht(page, zustand, ansicht) {
  /* --- 3 · Seitlicher Ueberlauf ------------------------------------------ */
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    if (d.scrollWidth <= window.innerWidth + 1) return null;
    // Den Uebeltaeter benennen, nicht nur das Symptom melden.
    const schuldige = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > window.innerWidth + 1) {
        schuldige.push((el.tagName.toLowerCase() + "." + (el.className || "").toString().split(" ")[0])
          .slice(0, 40) + " bis " + Math.round(r.right) + "px");
      }
    });
    return { breite: d.scrollWidth, schuldige: schuldige.slice(0, 3) };
  });
  if (overflow) {
    befund("HOCH", zustand, ansicht,
      "Inhalt laeuft seitlich aus dem Bild (" + overflow.breite + "px statt " + VIEWPORT.width + ")",
      overflow.schuldige.join(" | "));
  }

  /* --- 4 · Zu kleine Tippflaechen ---------------------------------------- */
  const klein = await page.evaluate((min) => {
    const out = [];
    document.querySelectorAll("button, a[href], input, [role=button]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;          // unsichtbar: zaehlt nicht
      if (getComputedStyle(el).visibility === "hidden") return;
      /* Ein Kaestchen in einer Zeile ist selbst klein — angetippt wird die
         Zeile, denn ein <label> schaltet sein Kaestchen mit. Gemessen wird
         deshalb die Zeile, nicht das Kaestchen. */
      const lab = el.closest("label");
      const ziel = lab ? lab.getBoundingClientRect() : r;
      if (ziel.height < min || ziel.width < min) {
        out.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 28) +
          " (" + Math.round(ziel.width) + "x" + Math.round(ziel.height) + ")");
      }
    });
    return out;
  }, MIN_TAP);
  if (klein.length) {
    befund("MITTEL", zustand, ansicht,
      klein.length + " Tippflaeche(n) unter " + MIN_TAP + "x" + MIN_TAP + " pt",
      klein.slice(0, 4).join(" · "));
  }

  /* --- 3b · Bedienelemente ausserhalb des Bildes --------------------------
     Der Ueberlauftest oben misst die Seitenbreite. Wird ein Knopf INNERHALB
     einer Karte abgeschnitten, bleibt die Seite schmal und der Test still —
     im Workout lag so das vierte Satz-Kaestchen unsichtbar hinter dem
     Kartenrand. Ein Knopf, den man nicht sieht, ist kein Knopf. */
  const abgeschnitten = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("main button, main input, main select, main a[href]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        out.push((el.textContent || el.placeholder || el.tagName).trim().slice(0, 24) +
          " (bis " + Math.round(r.right) + "px)");
      }
    });
    return out.slice(0, 5);
  });
  if (abgeschnitten.length) {
    befund("HOCH", zustand, ansicht,
      abgeschnitten.length + " Bedienelement(e) liegen ausserhalb des Bildes", abgeschnitten.join(" · "));
  }

  /* --- 4b · Aufgabenzeilen, die um ihren Aktionslink herumbrechen ---------
     Steht rechts ein „Starten →" und bricht die Unterzeile links daneben in
     eine zweite Zeile, entsteht eine ausgefranste L-Form: die zweite Zeile
     faengt ganz links an, der Link schwebt auf halber Hoehe daneben. Sieht
     nach Versehen aus. Die Unterzeile ist ein Hinweis — sie muss in eine
     Zeile passen. */
  const fransig = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".s-task").forEach((row) => {
      const sub = row.querySelector(".t span");
      const go = row.querySelector(".go");
      if (!sub || !go) return;
      const lh = parseFloat(getComputedStyle(sub).lineHeight) || 18;
      const zeilen = Math.round(sub.getBoundingClientRect().height / lh);
      if (zeilen > 1) out.push((sub.textContent || "").trim().slice(0, 40) + " (" + zeilen + " Zeilen)");
    });
    return out;
  });
  if (fransig.length) {
    befund("MITTEL", zustand, ansicht,
      fransig.length + " Aufgabenzeile(n) brechen neben dem Aktionslink um", fransig.join(" · "));
  }

  /* --- 5 · Leerer Bildschirm --------------------------------------------- */
  const text = (await page.locator("main").innerText().catch(() => "")).trim();
  if (text.length < 20) {
    befund("HOCH", zustand, ansicht, "Bildschirm praktisch leer", "nur " + text.length + " Zeichen Text");
  }

  /* --- 6 · Ueberlappung mit fester Kopf-/Fusszeile ------------------------ */
  const verdeckt = await page.evaluate(() => {
    const kopf = document.querySelector(".site-header");
    const fuss = document.querySelector(".s-nav");
    const main = document.querySelector("main");
    if (!main) return null;
    const out = [];
    const ersteZeile = main.firstElementChild;
    if (kopf && ersteZeile) {
      const k = kopf.getBoundingClientRect(), e = ersteZeile.getBoundingClientRect();
      if (getComputedStyle(kopf).position === "fixed" && e.top < k.bottom - 1) {
        out.push("erster Inhalt liegt hinter der Kopfzeile");
      }
    }
    if (fuss) {
      const f = fuss.getBoundingClientRect();
      const letzte = main.lastElementChild;
      if (letzte) {
        const l = letzte.getBoundingClientRect();
        // Nur melden, wenn nicht scrollbar — sonst ist es normal.
        const scrollbar = document.documentElement.scrollHeight > window.innerHeight + 4;
        if (!scrollbar && l.bottom > f.top + 1) out.push("letzter Inhalt liegt hinter der Bottom-Navigation");
      }
    }
    return out.length ? out : null;
  });
  if (verdeckt) befund("HOCH", zustand, ansicht, "Inhalt verdeckt", verdeckt.join(" | "));

  /* --- 2 · Tote Knoepfe ---------------------------------------------------
     Ein Knopf ohne Ereignisbehandlung, ohne Ziel und ohne type=submit tut
     nichts. Playwright kann Listener nicht direkt sehen, deshalb wird jeder
     Knopf einzeln geklickt und geprueft, ob sich irgendetwas aendert.

     Der erste Entwurf verglich die LAENGE von main.innerHTML. Das hat 30
     funktionierende Auswahlknoepfe als tot gemeldet: wenn class="on" von
     einem Knopf zum naechsten wandert, bleibt die Laenge gleich. Verglichen
     wird deshalb der Inhalt, nicht seine Groesse — und ein Dialog oder ein
     Download zaehlt genauso als Wirkung wie eine DOM-Aenderung. */
  let dialoge = 0, downloads = 0;
  page.on("dialog", (d) => { dialoge++; d.dismiss().catch(() => {}); });
  page.on("download", () => { downloads++; });

  const knoepfe = await page.locator("main button:visible").all();
  for (let i = 0; i < Math.min(knoepfe.length, 14); i++) {
    const b = knoepfe[i];
    let label = "";
    try { label = ((await b.textContent()) || "").trim().slice(0, 30); } catch { continue; }
    if (!label) continue;
    /* Einen bereits gewaehlten Knopf noch einmal zu druecken darf nichts
       tun — das ist richtig so und kein Befund. */
    const schonAn = await b.evaluate((el) => el.classList.contains("on")).catch(() => false);
    if (schonAn) continue;

    const zustandLesen = () => page.evaluate(() => ({
      html: document.querySelector("main") ? document.querySelector("main").innerHTML : "",
      hash: location.hash,
      sheet: !!document.querySelector(".s-sheet"),
      store: JSON.stringify(Object.keys(localStorage).sort())
    }));
    const vorher = await zustandLesen();
    const d0 = dialoge, dl0 = downloads;
    try { await b.click({ timeout: 1200, noWaitAfter: true }); } catch { continue; }
    await page.waitForTimeout(220);
    const nachher = await zustandLesen();
    const passiert = vorher.html !== nachher.html || vorher.hash !== nachher.hash ||
                     vorher.sheet !== nachher.sheet || vorher.store !== nachher.store ||
                     dialoge > d0 || downloads > dl0;
    if (!passiert) {
      befund("MITTEL", zustand, ansicht, "Knopf ohne erkennbare Wirkung", "„" + label + "”");
    }
    /* Der Sprachumschalter liegt in „Profil" mitten in der Liste. Wird er
       geklickt, steht der Rest der Ansicht auf Englisch und jede weitere
       Meldung nennt einen englischen Knopfnamen. Also zurueckstellen. */
    const sprache = await page.evaluate(() => (window.MM && MM.i18n) ? MM.i18n.lang : null);
    if (sprache && sprache !== "de") {
      await page.evaluate(() => { try { MM.i18n.toggle(); } catch (e) {} });
      await page.waitForTimeout(200);
    }

    // Ein geoeffnetes Blatt wieder schliessen, sonst verdeckt es die naechsten.
    if (nachher.sheet) {
      await page.keyboard.press("Escape").catch(() => {});
      await page.locator(".s-sheet-back").click({ timeout: 600 }).catch(() => {});
      await page.waitForTimeout(150);
    }
    if (nachher.hash !== vorher.hash) return;   // Ansicht gewechselt: hier abbrechen
  }
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});

  let jsFehler = 0, geprueft = 0;

  for (const z of ZUSTAENDE) {
    const state = z.state();
    for (const a of ANSICHTEN) {
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, locale: "de-DE" });
      const page = await ctx.newPage();

      /* --- 1 · Laufzeitfehler ------------------------------------------- */
      page.on("pageerror", (e) => {
        jsFehler++;
        befund("KRITISCH", z.de, a.de, "JavaScript-Ausnahme", e.message.slice(0, 160));
      });
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text();
        // Gesperrte Netzabrufe sind Sandbox-Rauschen, kein App-Fehler.
        if (/ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|net::ERR_FAILED|Failed to load resource/.test(t)) return;
        jsFehler++;
        befund("HOCH", z.de, a.de, "Konsolenfehler", t.slice(0, 160));
      });

      await page.addInitScript((s) => {
        Object.keys(s).forEach((k) => { if (k[0] !== "_") localStorage.setItem(k, JSON.stringify(s[k])); });
      }, state);
      if (a.tab) {
        await page.addInitScript((t) => localStorage.setItem("mm_simple_plan_tab", JSON.stringify(t)), a.tab);
      }

      await page.goto(`http://localhost:${PORT}/meinplan.html${a.hash}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);

      const datei = `${z.id}--${a.de.replace(/[^a-zA-Z]+/g, "-").toLowerCase()}.png`;
      await page.screenshot({ path: path.join(OUT, datei) });

      await pruefeAnsicht(page, z.de, a.de);
      geprueft++;
      await ctx.close();
    }
  }

  await browser.close();
  server.close();

  /* ---------------- Bericht ---------------- */
  const rang = { KRITISCH: 0, HOCH: 1, MITTEL: 2 };
  befunde.sort((x, y) => rang[x.schwere] - rang[y.schwere]);
  console.log("\n" + "=".repeat(66));
  console.log(`${geprueft} Bildschirme in ${ZUSTAENDE.length} Zustaenden geprueft.`);
  console.log("=".repeat(66));
  if (!befunde.length) {
    console.log("\nKeine Befunde.");
  } else {
    let letzte = "";
    befunde.forEach((b) => {
      const kopf = b.schwere;
      if (kopf !== letzte) { console.log("\n--- " + kopf + " ---"); letzte = kopf; }
      console.log(`  [${b.zustand} · ${b.ansicht}] ${b.was}`);
      if (b.detail) console.log(`      ${b.detail}`);
    });
  }
  const kritisch = befunde.filter((b) => b.schwere === "KRITISCH").length;
  const hoch = befunde.filter((b) => b.schwere === "HOCH").length;
  console.log(`\n${befunde.length} Befunde: ${kritisch} kritisch, ${hoch} hoch, ` +
    `${befunde.length - kritisch - hoch} mittel.`);
  console.log(`Aufnahmen: tools-dev/qa/out/sweep/`);

  /* Der Bericht gehoert auf die Platte, nicht nur in die Konsole: ein Lauf
     dauert eine halbe Stunde, und abgeschnittene Ausgabe heisst sonst, dass
     man ihn wiederholen muss. */
  await fs.writeFile(path.join(OUT, "bericht.json"),
    JSON.stringify({ geprueft, kritisch, hoch, mittel: befunde.length - kritisch - hoch, befunde }, null, 1), "utf8");
  process.exit(kritisch > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
