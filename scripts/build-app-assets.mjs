#!/usr/bin/env node
/**
 * build-app-assets.mjs — erzeugt App-Icon und Startbild fuer die iOS-App
 * aus dem Markenzeichen (dieselbe Geometrie wie das Logo im Header).
 *
 * Warum gerendert statt hochskaliert: Der App-Store verlangt 1024x1024 ohne
 * Alphakanal; die vorhandenen PNGs sind 512 und transparenzfaehig. Aus dem
 * Vektor entsteht ein scharfes, deckendes Bild in einem Schritt.
 *
 * Aufruf: node scripts/build-app-assets.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONSET = path.join(ROOT, "ios-app/App/App/Assets.xcassets/AppIcon.appiconset");
const SPLASHSET = path.join(ROOT, "ios-app/App/App/Assets.xcassets/Splash.imageset");

const BG = "#070A0F";
const WHITE = "#F0EEE9";
const CYAN = "#16C4F4";

/** Das MaleMetrix-X in einem 100x100-Feld, wie im Website-Header. */
function markSvg(size, { background = BG, scale = 1 } = {}) {
  const s = 100 / scale;
  const off = (100 - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${background}"/>
  <g transform="translate(${off} ${off}) scale(${1 / scale})" stroke-width="12" stroke-linecap="round" fill="none">
    <path d="M22 22 42 42 M22 78 42 58" stroke="${WHITE}"/>
    <path d="M78 22 58 42 M78 78 58 58" stroke="${CYAN}"/>
  </g>
</svg>`;
}

async function writePng(svg, size, file, { alpha = false } = {}) {
  let img = sharp(Buffer.from(svg)).resize(size, size);
  // App-Store-Icon darf keinen Alphakanal haben (Ablehnungsgrund bei Upload).
  if (!alpha) img = img.flatten({ background: BG });
  await fs.mkdir(path.dirname(file), { recursive: true });
  await img.png({ compressionLevel: 9 }).toFile(file);
}

async function main() {
  // 1 · App-Icon: iOS akzeptiert seit Xcode 14 ein einziges 1024er-Bild.
  const iconFile = path.join(ICONSET, "AppIcon-512@2x.png");
  await writePng(markSvg(1024), 1024, iconFile);
  await fs.writeFile(path.join(ICONSET, "Contents.json"), JSON.stringify({
    images: [{ filename: "AppIcon-512@2x.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
    info: { author: "xcode", version: 1 }
  }, null, 2) + "\n");

  // 2 · Startbild: quadratisch, wird von Capacitor mittig skaliert. Das
  //     Zeichen bleibt klein, damit es auf jedem Geraeteformat ruhig wirkt.
  const splash = markSvg(2732, { scale: 3.2 });
  for (const [name, size] of [["splash-2732x2732.png", 2732], ["splash-2732x2732-1.png", 2732], ["splash-2732x2732-2.png", 2732]]) {
    await writePng(splash, size, path.join(SPLASHSET, name));
  }
  await fs.writeFile(path.join(SPLASHSET, "Contents.json"), JSON.stringify({
    images: [
      { filename: "splash-2732x2732-1.png", idiom: "universal", scale: "1x" },
      { filename: "splash-2732x2732.png", idiom: "universal", scale: "2x" },
      { filename: "splash-2732x2732-2.png", idiom: "universal", scale: "3x" }
    ],
    info: { author: "xcode", version: 1 }
  }, null, 2) + "\n");

  // 3 · Web-Icon in 1024 nachziehen, damit Website und App dieselbe Quelle haben.
  await writePng(markSvg(1024), 1024, path.join(ROOT, "icons/icon-1024.png"));

  console.log("App-Icon (1024, ohne Alpha) und Startbild (2732) erzeugt.");
}

main().catch((err) => { console.error(err); process.exit(1); });
