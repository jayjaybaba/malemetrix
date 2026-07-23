// Live/lokaler Mixed-Language-Scanner (P9.8 §67).
// Rendert eine Route in DE und EN und meldet verdächtige Sprach-Leaks.
// Aufruf:  node tools-dev/i18n-scan.mjs http://localhost:PORT route1.html route2.html ...
// Kombiniert mit manueller QA — kein alleiniger Vollständigkeitsbeweis.
import pkg from "/tmp/claude-0/-home-user-malemetrix/a722da41-ab93-546e-a152-51caec508443/scratchpad/node_modules/playwright/index.js";
const { chromium } = pkg;

const base = process.argv[2] || "http://localhost:8303";
const routes = process.argv.slice(3);
if (!routes.length) { console.error("usage: i18n-scan.mjs <base> <route.html> ..."); process.exit(1); }

// Wörter, die in der jeweils ANDEREN Sprache im Kern-UI nicht auftauchen sollten.
const EN_LEAK = /\b(Continue|Save|Cancel|Back|Next|Loading|Error|Recommended|Your|Learn more|Settings|Sign in|Sign up|Log ?out|Search)\b/;
const DE_LEAK = /\b(Weiter|Speichern|Abbrechen|Zurück|Nächste|Laden|Fehler|Empfohlen|Dein|Deine|Mehr erfahren|Einstellungen|Anmelden|Registrieren|Abmelden|Suche)\b/;
// Marken-/Fachbegriffe, die in beiden Sprachen erlaubt sind:
const ALLOW = /MaleMetrix|Score|Stack|Labs|Library|Today|Performance Map|Recovery|Engine|Baseline|Cut|Build|Recomp|Perform/;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let issues = 0;
for (const route of routes) {
  for (const lang of ["de", "en"]) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(base + "/" + route, { waitUntil: "networkidle" });
    await p.evaluate((l) => { try { localStorage.setItem("mm_lang", l); } catch (e) {} }, lang);
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForTimeout(300);
    const text = await p.evaluate(() => {
      // nur sichtbarer Body-Text der Kern-UI (Header-Nav ausgenommen: Marken)
      return document.body ? document.body.innerText : "";
    });
    const leak = lang === "de" ? EN_LEAK : DE_LEAK;
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean)
      .filter(s => leak.test(s) && !ALLOW.test(s));
    if (lines.length) {
      issues += lines.length;
      console.log(`[${lang}] ${route}: ${lines.length} verdächtig`);
      lines.slice(0, 5).forEach(l => console.log("   • " + l.slice(0, 90)));
    } else {
      console.log(`[${lang}] ${route}: ok`);
    }
    await p.close();
  }
}
await browser.close();
console.log(issues ? `\n${issues} potenzielle Leaks (manuell prüfen)` : "\nkeine offensichtlichen Leaks");
