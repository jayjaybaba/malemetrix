#!/usr/bin/env node
/**
 * bundle-smoke.mjs — startet das fertige App-Bundle in einem Browser und
 * prueft, dass jede Seite laedt, ohne dass eine Datei fehlt.
 *
 * Warum es das gibt: build-app.mjs packt seit der Verschlankung nur noch die
 * Skripte ein, die die gebuendelten Seiten wirklich referenzieren (30 statt
 * 80). Das ist genau die Sorte Aenderung, die erst im Betrieb auffaellt —
 * ein fehlendes Skript wirft keinen Build-Fehler, sondern einen 404 und eine
 * halb tote Seite. Also wird jede Seite einmal geladen und jeder Abruf
 * mitgeschrieben.
 *
 * Aufruf: node scripts/build-app.mjs && node tools-dev/qa/bundle-smoke.mjs
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUNDLE = path.join(ROOT, "app-build");
let PORT = 0;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };

/* Bewusst NUR aus app-build/ ausliefern. Wuerde hier das Projektverzeichnis
   stehen, faende der Browser jede weggelassene Datei doch — und der Test
   wuerde genau das nicht pruefen, wofuer es ihn gibt. */
function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") || "index.html";
      try {
        const buf = await readFile(path.join(BUNDLE, rel));
        res.writeHead(200, { "Content-Type": MIME[path.extname(rel)] || "application/octet-stream" });
        res.end(buf);
      } catch { res.writeHead(404); res.end("not found"); }
    });
    server.listen(0, () => { PORT = server.address().port; resolve(server); });
  });
}

const SEITEN = ["index.html", "meinplan.html", "transformation.html", "check.html",
  "tools.html", "tracker.html", "impressum.html", "datenschutz.html", "agb.html"];

let bestanden = 0, gescheitert = 0;
const ok = (c, m) => { if (c) { bestanden++; console.log("  ✓ " + m); } else { gescheitert++; console.error("  ✗ FEHLER: " + m); } };

async function main() {
  if (!existsSync(BUNDLE)) {
    console.error("app-build/ fehlt — zuerst: node scripts/build-app.mjs");
    process.exit(1);
  }
  const server = await serve();
  const BIN = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(BIN) ? { executablePath: BIN } : {});

  for (const seite of SEITEN) {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: "de-DE" });
    const page = await ctx.newPage();
    const fehlend = [], fehler = [];
    page.on("response", (r) => {
      if (r.status() === 404) fehlend.push(r.url().replace(`http://localhost:${PORT}/`, ""));
    });
    page.on("pageerror", (e) => fehler.push(e.message.slice(0, 120)));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      /* Fremde Hosts sind nicht unser Problem: die Analyse-Beacons
         (Cloudflare, Plausible) scheitern hier je nach Umgebung mal an
         fehlendem Netz, mal an CORS. Gefiltert wird nach HOST, nicht nach
         Fehlertext — alles von localhost zaehlt weiter als Fehler. */
      const fremd = (t.match(/https?:\/\/[^\s'"]+/g) || [])
        .some((u) => !u.includes("localhost") && !u.includes("127.0.0.1"));
      if (fremd) return;
      if (/ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|net::ERR_FAILED/.test(t)) return;
      fehler.push(t.slice(0, 140));
    });

    /* "load" statt "networkidle": eine Seite mit einem dauerhaft offenen
       Abruf wuerde sonst 30 s lang haengen und den Lauf abbrechen. */
    await page.goto(`http://localhost:${PORT}/${seite}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(800);

    ok(fehlend.length === 0, `${seite}: keine fehlende Datei` +
      (fehlend.length ? " — 404 auf " + fehlend.join(", ") : ""));
    ok(fehler.length === 0, `${seite}: kein Laufzeitfehler` +
      (fehler.length ? " — " + fehler.join(" | ") : ""));
    const text = (await page.locator("body").innerText().catch(() => "")).trim();
    ok(text.length > 80, `${seite}: die Seite hat Inhalt (${text.length} Zeichen)`);

    /* Die App selbst muss auch bedienbar sein, nicht nur geladen. */
    if (seite === "index.html") {
      const nav = await page.locator(".s-nav a").count();
      ok(nav === 4, `index.html: die vier Bereiche stehen in der Navigation (${nav})`);
      ok((await page.locator("main").innerText()).length > 40, "index.html: der Startbildschirm ist gefuellt");
      /* Umschalten auf Englisch laedt js/i18n-en.js nach — das steht in
         keinem <script src> und faellt sonst als 404 auf die Nase. */
      await page.locator(".lang-btn").click();
      await page.waitForTimeout(600);
      ok(!fehlend.length, "index.html: auch das nachgeladene Sprachglossar ist im Bundle" +
        (fehlend.length ? " — fehlt: " + fehlend.join(", ") : ""));
    }
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log("\n" + (gescheitert ? "FEHLGESCHLAGEN" : "OK") +
    ` — ${bestanden} bestanden, ${gescheitert} fehlgeschlagen`);
  process.exit(gescheitert ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
