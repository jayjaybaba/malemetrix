/* ==========================================================================
   Native App (Capacitor) — Bundle, Bruecke, Projektkonfiguration

   Geprueft wird, was ohne Mac und ohne Apple-Konto pruefbar ist:
   1. Das App-Bundle enthaelt genau die vorgesehene Produktflaeche und keine
      Verkaufsseiten (App-Store-Richtlinie 3.1.1).
   2. Die native Bruecke ist im Browser wirkungslos und faelscht keine
      Zustaende (§21).
   3. Die iOS-Projektdaten sind so gesetzt, dass ein Upload nicht an
      Formalien scheitert (Icon ohne Alpha, Bundle-ID, Ausrichtung).

   Ausfuehren: node tools-dev/tests/native-app.test.js
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ FAIL: " + m); } };
const group = (g) => console.log("\n== " + g + " ==");

/* Das Bundle wird fuer den Test frisch erzeugt — geprueft wird das Ergebnis
   des echten Build-Skripts, nicht eine Nachbildung davon. */
execFileSync("node", [path.join(ROOT, "scripts/build-app.mjs")], { encoding: "utf8" });
const OUT = path.join(ROOT, "app-build");
const inBundle = (p) => fs.existsSync(path.join(OUT, p));

group("App-Bundle: Inhalt");
{
  ok(inBundle("index.html"), "index.html existiert (Startseite der App)");
  ok(read("app-build/index.html") === read("app-build/meinplan.html"),
    "index.html ist die Planoberflaeche — kein zweiter Einstiegspunkt");
  ["transformation.html", "check.html", "tools.html", "tracker.html"].forEach((p) =>
    ok(inBundle(p), "Produktseite im Bundle: " + p));
  ["impressum.html", "datenschutz.html", "agb.html"].forEach((p) =>
    ok(inBundle(p), "Pflichtseite im Bundle: " + p));
  ["shop.html", "checkout.html", "ebooks.html", "coaching.html", "kurs-programm.html"].forEach((p) =>
    ok(!inBundle(p), "Verkaufsseite NICHT im Bundle (Richtlinie 3.1.1): " + p));
  ok(inBundle("js/simple/plan-engine.js") && inBundle("css/simple.css"),
    "Planmotor und App-Styles liegen im Bundle — eine Codebasis, kein Zweitmotor");
  ok(!inBundle("assets/protocol"), "Ebook-Bilder (12 MB) bleiben draussen");
}

group("App-Bundle: Einbindung der Bruecke");
{
  const pages = ["index.html", "meinplan.html", "transformation.html", "check.html",
    "tools.html", "tracker.html", "impressum.html", "datenschutz.html", "agb.html"];
  const html = pages.map((p) => read("app-build/" + p));
  ok(html.every((h) => h.includes("js/native-bridge.js")), "jede Seite laedt die Bruecke");
  ok(html.every((h) => h.includes("css/native.css")), "jede Seite laedt die App-Styles");
  const plan = read("app-build/meinplan.html");
  ok(plan.indexOf("native-bridge.js") < plan.indexOf("js/config.js"),
    "die Bruecke laeuft vor der uebrigen App (MM.native steht beim Rendern fest)");
  ok((plan.match(/native-bridge\.js/g) || []).length === 1, "genau eine Einbindung, kein Doppelladen");
  // Quelle unveraendert: die Website selbst darf die App-Dateien nicht laden
  ok(!read("meinplan.html").includes("native-bridge.js"),
    "die Website bleibt unangetastet — die Bruecke existiert nur im Bundle");
}

group("Bruecke: im Browser wirkungslos");
{
  function run(capacitor) {
    const listeners = [];
    const ctx = {
      console: { log() {}, error() {} },
      Date, Math, JSON, Object, Array, String, Number, Promise, RegExp, Error,
      Capacitor: capacitor,
      document: {
        documentElement: { classList: { added: [], add(...c) { this.added.push(...c); } } },
        addEventListener: (t, f) => listeners.push(t),
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute() {}, addEventListener() {}, style: {}, appendChild() {} })
      },
      addEventListener: (t) => listeners.push("win:" + t),
      localStorage: { getItem: () => null, setItem() {} }
    };
    ctx.window = ctx; ctx.self = ctx;
    vm.createContext(ctx);
    vm.runInContext(read("js/native-bridge.js"), ctx);
    return { ctx, listeners };
  }

  const web = run(undefined);
  ok(web.ctx.MM.native.isApp === false, "ohne Capacitor: isApp === false");
  ok(web.ctx.MM.native.platform === "web", "ohne Capacitor: platform === 'web'");
  ok(web.listeners.length === 0, "ohne Capacitor: kein einziger Listener wird registriert");
  ok(web.ctx.document.documentElement.classList.added.length === 0,
    "ohne Capacitor: keine CSS-Klasse — die Website bleibt unveraendert");
  ok(!web.ctx.MM.native.renderNotifications,
    "ohne Capacitor: keine Mitteilungs-API vorgetaeuscht");

  const nativeCtx = run({ isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {} });
  ok(nativeCtx.ctx.MM.native.isApp === true, "nativ: isApp === true");
  ok(nativeCtx.ctx.document.documentElement.classList.added.includes("is-native-app"),
    "nativ: CSS-Klasse is-native-app gesetzt");
  ok(typeof nativeCtx.ctx.MM.native.renderNotifications === "function",
    "nativ: Mitteilungs-Abschnitt wird von der Bruecke bedient");
}

group("Bruecke: iphone.js zeigt in der App echte Zustaende");
{
  const src = read("js/simple/iphone.js");
  ok(/function isNativeApp\(\)/.test(src), "iphone.js kennt den nativen Zustand");
  ok(/if \(isNativeApp\(\)\) return true;/.test(src),
    "in der App gilt die Oberflaeche als installiert — keine PWA-Anleitung ins Leere");
  ok(/MM\.native\.renderNotifications\(card/.test(src),
    "Benachrichtigungen laufen in der App ueber lokale Mitteilungen statt Web-Push");
  const bridge = read("js/native-bridge.js");
  ok(/requestPermissions\(\)/.test(bridge) && /display !== "granted"/.test(bridge),
    "ohne Erlaubnis wird nichts als aktiv angezeigt (§21)");
  ok(/saveSettings\(\{ on: false/.test(bridge),
    "schlaegt das Planen fehl, bleibt der gespeicherte Zustand 'aus'");
}

group("iOS-Projekt: Formalien fuer den Upload");
{
  const plist = read("ios-app/App/App/Info.plist");
  ok(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(plist),
    "Exportkonformitaet vorbeantwortet — kein Dialog bei jedem Upload");
  ok(/UIInterfaceOrientationPortrait/.test(plist) && !/LandscapeLeft/.test(plist),
    "nur Hochformat (die Oberflaeche ist dafuer gebaut)");
  ok(/<key>CFBundleDevelopmentRegion<\/key>\s*<string>de<\/string>/.test(plist),
    "Hauptsprache Deutsch");

  const cfg = JSON.parse(read("capacitor.config.json"));
  ok(cfg.appId === "de.malemetrix.app", "Bundle-ID de.malemetrix.app");
  ok(cfg.webDir === "app-build", "Capacitor baut aus app-build/");
  ok(cfg.ios.path === "ios-app", "das Xcode-Projekt liegt in ios-app/ — ios/ bleibt der HealthKit-Entwurf");

  const pbx = read("ios-app/App/App.xcodeproj/project.pbxproj");
  ok(/PRODUCT_BUNDLE_IDENTIFIER = de\.malemetrix\.app;/.test(pbx), "Bundle-ID auch im Xcode-Projekt");
  ok(/TARGETED_DEVICE_FAMILY = 1;/.test(pbx), "iPhone-App (keine iPad-Screenshots noetig)");

  const icon = "ios-app/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";
  ok(exists(icon), "App-Icon vorhanden");
  const buf = fs.readFileSync(path.join(ROOT, icon));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), colorType = buf[25];
  ok(w === 1024 && h === 1024, "App-Icon ist 1024x1024 (" + w + "x" + h + ")");
  ok(colorType === 2 || colorType === 0 || colorType === 3,
    "App-Icon ohne Alphakanal — sonst weist der Upload es zurueck (PNG-Farbtyp " + colorType + ")");
}

group("Keine Geheimnisse im App-Bundle");
{
  const suspicious = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|json|html)$/.test(e.name)) continue;
      const t = fs.readFileSync(p, "utf8");
      // Echtes Schluesselmaterial, nicht das Wort in einem Kommentar:
      // privater Schluessel, Stripe-Live-Key, oder ein JWT mit service_role.
      let hit = /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t) || /\bsk_live_[A-Za-z0-9]{16,}/.test(t);
      if (!hit) {
        for (const m of t.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/g)) {
          try {
            const payload = JSON.parse(Buffer.from(m[0].split(".")[1], "base64url").toString("utf8"));
            if (payload.role === "service_role") { hit = true; break; }
          } catch (e) { /* kein lesbares JWT — dann auch kein Fund */ }
        }
      }
      if (hit) suspicious.push(path.relative(OUT, p));
    }
  };
  walk(OUT);
  ok(suspicious.length === 0, "kein Service-Key / privater Schluessel im Bundle" +
    (suspicious.length ? " — gefunden in: " + suspicious.join(", ") : ""));
}

console.log("\n" + (failed ? "FAILED" : "OK") + " — " + passed + " bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
