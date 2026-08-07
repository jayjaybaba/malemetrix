/* Rendert tools-dev/og-image.html zu /og-home.png (1200x630) — der
 * Share-Vorschau NUR der Startseite.
 *
 * Bewusst nicht og-image.png: das teilen sich rund 60 Seiten (Blog, Shop,
 * Tools). Ein Startseiten-Motiv dort würde als Vorschau eines Blogartikels
 * erscheinen.
 *
 * Warum gerendert statt gezeichnet: Die Share-Vorschau nutzt so exakt
 * dieselben Schriften, Farben und Showcase-Bilder wie der Hero — sie kann
 * nicht auseinanderlaufen, und eine Textänderung ist eine HTML-Änderung.
 *
 * Voraussetzung: lokaler Server auf 127.0.0.1:4173 (python3 serve.py) und
 * Playwright (lokal oder global installiert).
 * Aufruf:  node tools-dev/build-og-image.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/* createRequire statt import: findet Playwright auch in einer globalen
   Installation (NODE_PATH), die ESM-Auflösung ignoriert. */
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright fehlt. Installieren mit: npm i -D playwright");
  process.exit(1);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "http://127.0.0.1:4173/tools-dev/og-image.html";
const OUT = resolve(ROOT, "og-home.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
const res = await page.goto(URL, { waitUntil: "networkidle" });
if (!res || !res.ok()) {
  await browser.close();
  throw new Error(`Vorlage nicht erreichbar (${res && res.status()}). Läuft "python3 serve.py"?`);
}
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log(`og-home.png geschrieben: ${OUT}`);
