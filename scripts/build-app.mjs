#!/usr/bin/env node
/**
 * build-app.mjs — erzeugt aus der bestehenden Website das Web-Bundle der
 * nativen App (`app-build/`). EINE Codebasis, kein zweiter Planmotor:
 * die App laedt exakt dieselben Dateien wie malemetrix.com.
 *
 * Bewusste Auswahl (APP.md, Abschnitt "Was in der App ist"):
 * Nur die Produktflaeche (Transformation, Score, Mein Plan, Tools, Recht).
 * Shop/Checkout/Ebook-Verkauf sind NICHT enthalten — digitale Kaeufe muessten
 * in einer iOS-App ueber In-App-Purchase laufen (App-Store-Richtlinie 3.1.1).
 *
 * Aufruf: node scripts/build-app.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "app-build");

/** Seiten, die in der App erreichbar sind. Reihenfolge = Dokumentation. */
const PAGES = [
  "meinplan.html",        // die App selbst (wird zusaetzlich index.html)
  "transformation.html",  // Onboarding Schritt 1: Zielbild
  "check.html",           // Onboarding Schritt 2: Score
  "tools.html",           // Rechner
  "tracker.html",         // Trainings-Tracker
  "impressum.html",
  "datenschutz.html",
  "agb.html",
];

/** Ordner, die vollstaendig mitkommen. */
const DIRS = ["css", "js", "fonts", "icons", "img", "assets/brand", "assets/transform", "assets/hero"];

/** Einzeldateien. */
const FILES = ["manifest.webmanifest"];

/** Diese Dateien gehoeren nicht ins App-Bundle (Verkauf/Analyse/Legacy-Ballast). */
const SKIP = new Set(["js/paypal.js", "js/checkout.js", "js/shop.js"]);

async function rmrf(p) {
  await fs.rm(p, { recursive: true, force: true });
}

async function copyDir(rel) {
  const src = path.join(ROOT, rel);
  const dst = path.join(OUT, rel);
  let entries;
  try {
    entries = await fs.readdir(src, { withFileTypes: true });
  } catch {
    return; // Ordner existiert nicht -> still ueberspringen
  }
  await fs.mkdir(dst, { recursive: true });
  for (const e of entries) {
    const childRel = path.posix.join(rel, e.name);
    if (SKIP.has(childRel)) continue;
    if (e.isDirectory()) await copyDir(childRel);
    else await fs.copyFile(path.join(src, e.name), path.join(dst, e.name));
  }
}

/**
 * Fuegt in jede Seite die App-Bruecke ein (native Anpassungen: externe Links,
 * Statusleiste, Haptik). Genau ein <script>-Tag, direkt vor </body>.
 */
function injectBridge(html) {
  let out = html;
  if (!out.includes("css/native.css")) {
    out = out.replace(/<\/head>/i, '  <link rel="stylesheet" href="css/native.css">\n</head>');
  }
  if (!out.includes("js/native-bridge.js")) {
    // Die Bruecke muss laufen, bevor die App rendert (MM.native wird von
    // js/simple/iphone.js abgefragt) -> vor allen anderen Skripten.
    out = out.replace(/<script /i, '<script src="js/native-bridge.js"></script>\n<script ');
  }
  return out;
}

async function main() {
  await rmrf(OUT);
  await fs.mkdir(OUT, { recursive: true });

  for (const dir of DIRS) await copyDir(dir);
  for (const f of FILES) await fs.copyFile(path.join(ROOT, f), path.join(OUT, f));

  for (const page of PAGES) {
    const html = injectBridge(await fs.readFile(path.join(ROOT, page), "utf8"));
    await fs.writeFile(path.join(OUT, page), html);
  }

  // Startseite der App = Mein Plan.
  await fs.copyFile(path.join(OUT, "meinplan.html"), path.join(OUT, "index.html"));

  const bundled = new Set([...PAGES, "index.html"]);
  const missing = await findMissingLinks(bundled);
  const bytes = await dirSize(OUT);
  console.log(`app-build/: ${PAGES.length + 1} Seiten, ${(bytes / 1048576).toFixed(1)} MB`);
  if (missing.length) {
    console.log(`Hinweis: ${missing.length} Verweise auf nicht gebuendelte Seiten ` +
      `(oeffnen im Systembrowser): ${missing.join(", ")}`);
  }
}

/** Sammelt Verweise auf .html-Seiten, die nicht im Bundle liegen. */
async function findMissingLinks(bundled) {
  const found = new Set();
  for (const page of [...bundled]) {
    let html;
    try { html = await fs.readFile(path.join(OUT, page), "utf8"); } catch { continue; }
    for (const m of html.matchAll(/href="([a-z0-9._/-]+\.html)/gi)) {
      const target = m[1].replace(/^\.\//, "");
      if (!bundled.has(target)) found.add(target);
    }
  }
  return [...found].sort();
}

async function dirSize(dir) {
  let total = 0;
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirSize(p);
    else total += (await fs.stat(p)).size;
  }
  return total;
}

main().catch((err) => { console.error(err); process.exit(1); });
