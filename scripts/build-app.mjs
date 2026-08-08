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

/** Ordner, die vollstaendig mitkommen. `js` steht bewusst NICHT hier —
    siehe sammleSkripte(). */
const DIRS = ["css", "fonts", "icons", "img", "assets/brand", "assets/transform", "assets/hero"];

/** Einzeldateien. */
const FILES = ["manifest.webmanifest"];

/** Diese Dateien gehoeren nicht ins App-Bundle (Verkauf/Analyse/Legacy-Ballast).
 *
 *  Die drei Medien am Ende sind kein Ballast aus Versehen, sondern gezielt:
 *  WebKit spielt kein WebM — das Video liegt daneben als MP4 vor, und die
 *  <source>-Kette faellt ohnehin auf das MP4 zurueck. Die beiden 1024er
 *  Icons sind Store- und Marketingvorlagen; das App-Icon selbst liegt im
 *  Xcode-Projekt, nicht im Web-Bundle. Zusammen 1,4 MB, die kein Nutzer je
 *  abruft, aber jeder mit herunterlaedt. */
const SKIP = new Set([
  "js/paypal.js", "js/checkout.js", "js/shop.js",
  "assets/hero/mm-home-hero.webm",
  "icons/icon-1024.png", "icons/tiktok-app-icon-1024.png"
]);

/**
 * Skripte, die zur Laufzeit nachgeladen werden und deshalb in keinem
 * <script src> stehen. Jeder Eintrag braucht eine Begruendung — sonst
 * waechst diese Liste wieder zu dem zurueck, was sie ersetzt hat.
 */
const NACHGELADEN = {
  "js/i18n-en.js": "js/i18n.js laedt das Glossar beim Umschalten auf Englisch nach",
  "js/native-bridge.js": "wird von injectBridge() in jede Seite eingehaengt"
};

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
  /* Passend zur Umbenennung in sammleSkripte(): die Importpfade der Seite
     zeigen im Bundle auf .js. */
  out = out.replace(/(from\s+["'][^"']+)\.mjs(["'?])/g, "$1.js$2");
  /* Das WebM liegt nicht im Bundle (WebKit spielt es nicht). Dann darf die
     Seite es auch nicht anbieten — sonst holt es sich ein Browser, der es
     koennte, und laeuft in einen 404, bevor er auf das MP4 zurueckfaellt. */
  out = out.replace(/\s*<source[^>]+type="video\/webm"[^>]*>/g, "");
  if (!out.includes("js/native-bridge.js")) {
    // Die Bruecke muss laufen, bevor die App rendert (MM.native wird von
    // js/simple/iphone.js abgefragt) -> vor allen anderen Skripten.
    out = out.replace(/<script /i, '<script src="js/native-bridge.js"></script>\n<script ');
  }
  return out;
}

/**
 * Sammelt genau die Skripte, die die gebuendelten Seiten wirklich laden.
 *
 * Vorher kam `js/` komplett mit: 2,5 MB, darunter 824 KB `js/os/` und
 * `js/growth/`, die keine Seite im Bundle referenziert — und darunter die
 * gesamte alte Verkaufsoberflaeche. In einem iOS-Binary hat Verkaufscode
 * nichts verloren (App-Store-Richtlinie 3.1.1), auch nicht ungenutzt.
 *
 * @returns {{gebraucht: Set<string>, uebersprungen: string[]}}
 */
async function sammleSkripte() {
  const gebraucht = new Set(Object.keys(NACHGELADEN));
  const module = new Set();
  for (const page of PAGES) {
    const html = await fs.readFile(path.join(ROOT, page), "utf8");
    for (const m of html.matchAll(/<script[^>]+src="([^"?]+)/gi)) {
      const rel = m[1].replace(/^\.\//, "");
      if (rel.startsWith("http")) continue;              // fremde Quelle
      gebraucht.add(rel);
    }
    /* ES-Module in <script type="module">. Genau so kam transformation.html
       an seine Zielengine — und genau die fehlte im Bundle, weil hier nur
       nach src="" gesucht wurde. Ohne sie zeigt Onboarding-Schritt 1 nach
       fuenf Sekunden "Die Zielberechnung konnte nicht geladen werden": ein
       neuer Nutzer kommt in der App gar nicht erst zu einem Plan. */
    for (const m of html.matchAll(/\bfrom\s+["']([^"'?]+)/g)) {
      const rel = m[1].replace(/^\.\//, "");
      if (rel.startsWith("http") || !rel.includes("/")) continue;
      module.add(rel);
    }
  }
  /* .mjs wird im Bundle zu .js.
     Capacitor bestimmt den Inhaltstyp auf iOS ueber UTType(filenameExtension:)
     mit einer kleinen Ersatztabelle — und die kennt "mjs" nicht. Faellt beides
     aus, liefert es "application/octet-stream", und WebKit lehnt das Modul ab:
     "Expected a JavaScript-or-Wasm module script". Fuer ".js" ist der Typ in
     jedem Fall richtig. Die Umbenennung passiert nur im Bundle; im Projekt
     bleibt die Datei, wie die Edge Function sie braucht. */
  for (const rel of module) {
    const ziel = rel.replace(/\.mjs$/, ".js");
    await fs.mkdir(path.join(OUT, path.dirname(ziel)), { recursive: true });
    await fs.copyFile(path.join(ROOT, rel), path.join(OUT, ziel));
  }
  const alle = [];
  const gehe = async (rel) => {
    for (const e of await fs.readdir(path.join(ROOT, rel), { withFileTypes: true })) {
      const kind = path.posix.join(rel, e.name);
      if (e.isDirectory()) await gehe(kind); else alle.push(kind);
    }
  };
  await gehe("js");
  const uebersprungen = alle.filter((f) => !gebraucht.has(f));
  return { gebraucht: new Set([...gebraucht].filter((f) => alle.includes(f))), uebersprungen };
}

async function main() {
  await rmrf(OUT);
  await fs.mkdir(OUT, { recursive: true });

  for (const dir of DIRS) await copyDir(dir);
  for (const f of FILES) await fs.copyFile(path.join(ROOT, f), path.join(OUT, f));

  const { gebraucht, uebersprungen } = await sammleSkripte();
  for (const rel of gebraucht) {
    if (SKIP.has(rel)) continue;
    await fs.mkdir(path.join(OUT, path.dirname(rel)), { recursive: true });
    await fs.copyFile(path.join(ROOT, rel), path.join(OUT, rel));
  }

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
  console.log(`Skripte: ${gebraucht.size} eingepackt, ${uebersprungen.length} weggelassen ` +
    `(nicht referenziert). Groesste weggelassene Ordner: ` +
    [...new Set(uebersprungen.map((f) => f.split("/").slice(0, 2).join("/")))].slice(0, 6).join(", "));
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
