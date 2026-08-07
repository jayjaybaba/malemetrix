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
  // Die HealthKit-Schlafphasen (Kern/Tief/REM) gibt es erst ab iOS 16.
  // Steht das Ziel niedriger, bricht der Build — genau das ist einmal passiert.
  ok(!/IPHONEOS_DEPLOYMENT_TARGET = 1[0-5]\./.test(pbx),
    "Mindestziel iOS 16 oder hoeher (darunter fehlen die Schlafphasen)");
  ok((pbx.match(/IPHONEOS_DEPLOYMENT_TARGET = 16\.0;/g) || []).length === 4,
    "und zwar in allen vier Konfigurationen, nicht nur in einer");

  const icon = "ios-app/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";
  ok(exists(icon), "App-Icon vorhanden");
  const buf = fs.readFileSync(path.join(ROOT, icon));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), colorType = buf[25];
  ok(w === 1024 && h === 1024, "App-Icon ist 1024x1024 (" + w + "x" + h + ")");
  ok(colorType === 2 || colorType === 0 || colorType === 3,
    "App-Icon ohne Alphakanal — sonst weist der Upload es zurueck (PNG-Farbtyp " + colorType + ")");
}

group("Apple Health: im Xcode-Projekt vollstaendig verdrahtet");
{
  ok(exists("ios-app/App/App/HealthPlugin.swift"), "das Plugin existiert");
  const pbx = read("ios-app/App/App.xcodeproj/project.pbxproj");
  ok(/HealthPlugin\.swift in Sources/.test(pbx),
    "es wird auch uebersetzt (Sources-Build-Phase) — sonst faellt es lautlos aus");
  ok(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/.test(pbx),
    "die Entitlements sind im Target gesetzt");
  ok((pbx.match(/CODE_SIGN_ENTITLEMENTS/g) || []).length === 2,
    "in beiden Konfigurationen (Debug und Release), nicht nur in einer");

  const ent = read("ios-app/App/App/App.entitlements");
  ok(/com\.apple\.developer\.healthkit/.test(ent), "HealthKit-Berechtigung beantragt");
  // Nur echte Schluessel pruefen — im Kommentar darueber stehen die Namen
  // absichtlich, als Begruendung fuer ihr Fehlen.
  ok(!/<key>com\.apple\.developer\.healthkit\.(recalibrate-estimates|background-delivery)<\/key>/.test(ent) &&
     !/<key>com\.apple\.developer\.healthkit\.clinical-health-records<\/key>/.test(ent),
    "keine Berechtigung mehr als noetig (keine Patientenakten, kein Hintergrundempfang)");

  const plist = read("ios-app/App/App/Info.plist");
  // Ohne diese beiden Texte stuerzt iOS beim ersten Health-Zugriff ab und
  // Apple lehnt die App im Review ab.
  ok(/NSHealthShareUsageDescription/.test(plist), "Lesetext fuer den Berechtigungsdialog vorhanden");
  ok(/NSHealthUpdateUsageDescription/.test(plist), "Schreibtext vorhanden");
  ok(/bleiben auf dem Geraet/.test(plist), "der Dialogtext sagt, dass die Daten das Geraet nicht verlassen");

  const swift = read("ios-app/App/App/HealthPlugin.swift");
  ok(/CAPBridgedPlugin/.test(swift) && /public let jsName = "Health"/.test(swift),
    "als Capacitor-Plugin registriert, erreichbar als Capacitor.Plugins.Health");
  ["isAvailable", "requestAuthorization", "today", "baseline", "writeWeight"].forEach((m) =>
    ok(new RegExp('CAPPluginMethod\\(name: "' + m + '"').test(swift), "Methode angemeldet: " + m));
  ok(/writeTypes: Set<HKSampleType> \{ \[qt\(\.bodyMass\)\] \}/.test(swift),
    "geschrieben wird ausschliesslich das Gewicht");
  ok(/b > 800 && sum > 1200/.test(swift),
    "Tage ohne getragene Uhr fliegen schon nativ aus dem Schnitt");
}

group("Apple Health: die Weboberflaeche bleibt ohne App unveraendert");
{
  const bridge = read("js/native-bridge.js");
  ok(/MM\.native\.health = \{/.test(bridge), "die Bruecke bietet MM.native.health an");
  ok(bridge.indexOf("MM.native.health") > bridge.indexOf("if (!isNative) return;"),
    "aber erst NACH dem Ausstieg fuer den Browser — im Web existiert sie nicht");
  ok(/MM\.native\.renderHealth/.test(bridge), "und rendert den Abschnitt selbst");

  const iph = read("js/simple/iphone.js");
  ok(/isNativeApp\(\) && MM\.native\.renderHealth/.test(iph),
    "iphone.js zeigt den Health-Abschnitt nur in der App");

  // Die fachliche Grenze liegt in der Engine, nicht in der Bruecke — sonst
  // gaebe es zwei Wahrheiten (App und Web) statt einer.
  ok(!/1200|lowerFactor|minDays/.test(bridge),
    "die Bruecke enthaelt KEINE Plausibilitaetsgrenzen (die liegen in der Engine)");
  const eng = read("js/simple/plan-engine.js");
  ok(/function resolveTdee/.test(eng), "resolveTdee ist die eine Stelle dafuer");
  ok(/minKcalPerDay: 1200/.test(eng) && /lowerFactor: 0\.75/.test(eng),
    "und traegt die Grenzen sichtbar im Quelltext");
}


group("Health-Daten haben Konsequenzen — die Verdrahtung haelt");
{
  const bridge = read("js/native-bridge.js");
  const app = read("js/simple/app.js");
  const swift = read("ios-app/App/App/HealthPlugin.swift");

  // Der teuerste Fehler waere ein Schluessel, den einer schreibt und keiner
  // liest (oder umgekehrt): dann waere das Erholungssignal reine Dekoration.
  ["health_energy", "health_today", "health_steps_by_day"].forEach((k) => {
    ok(new RegExp('"' + k + '"').test(bridge), "die Bruecke schreibt " + k);
  });
  ok(/MM\.store\.get\("health_today"/.test(app), "die App liest health_today");
  ok(/MM\.store\.get\("health_steps_by_day"/.test(app), "die App liest health_steps_by_day");
  ok(/MM\.store\.get\("health_energy"/.test(app), "die App liest health_energy");

  ok(/baselineHrv/.test(bridge) && /baselineRhr/.test(bridge),
    "die Baseline wird mitgespeichert — 45 ms HRV sind ohne sie bedeutungslos");
  ok(/out\["stepsByDay"\] = stepMap/.test(swift), "das Plugin liefert die Schrittreihe");
  ok(/yyyy-MM-dd/.test(swift), "und zwar in derselben Datumsform wie das Tagesprotokoll");
  ok(/en_US_POSIX/.test(swift),
    "mit festem Locale — sonst liefert ein arabischer Kalender unbrauchbare Schluessel");

  ok(/MM\.store\.remove\(TODAY_KEY\)/.test(bridge) && /MM\.store\.remove\(STEPS_KEY\)/.test(bridge),
    "beim Trennen wird alles entfernt, nicht nur der Verbrauchswert");

  // Der heutige Health-Stand darf nicht von gestern stammen.
  ok(/h\.date !== todayYmd\(\)/.test(app),
    "veraltete Tageswerte werden verworfen statt fuer heute ausgegeben");
}

group("Entscheidungsschicht ist in der App verdrahtet");
{
  const page = read("meinplan.html");
  ok(/js\/simple\/decide\.js/.test(page), "decide.js wird geladen");
  ok(page.indexOf("decide.js") < page.indexOf("app.js"), "und zwar vor app.js");
  const app = read("js/simple/app.js");
  ok(/decide = MMSimple\.decide/.test(app), "app.js kennt das Modul");
  ok(/decide\.dailyPrescription\(/.test(app), "Today nutzt den Tagesauftrag");
  ok(/decide\.executionScore\(/.test(app), "Fortschritt und Wochencheck nutzen den Execution Score");
  ok(/decide\.trajectory\(/.test(app), "Fortschritt zeigt den Verlauf");
  const weekly = read("js/simple/weekly-check.js");
  ok(/ctx\.execution/.test(weekly), "der Wochencheck nimmt die Messung entgegen");
}


group("Xcode Cloud: der Weg ohne API-Schluessel ist vollstaendig");
{
  const sh = "ios-app/App/ci_scripts/ci_post_clone.sh";
  ok(exists(sh), "das Vorbereitungsskript existiert");
  // Apple sucht ci_scripts im Ordner des Xcode-Projekts, nicht im Repo-Wurzel.
  ok(exists("ios-app/App/App.xcodeproj"),
    "und liegt neben App.xcodeproj — dort sucht Xcode Cloud danach");
  const mode = fs.statSync(path.join(ROOT, sh)).mode;
  ok((mode & 0o111) !== 0, "es ist ausfuehrbar (sonst startet Xcode Cloud es nicht)");
  const t = read(sh);
  ok(/CI_PRIMARY_REPOSITORY_PATH/.test(t), "es wechselt ins Repo-Wurzelverzeichnis");
  ok(/set -e/.test(t), "es bricht beim ersten Fehler ab statt weiterzulaufen");
  ok(/npm ci/.test(t), "Abhaengigkeiten werden installiert");
  ok(/build-app\.mjs/.test(t) && /cap sync ios/.test(t),
    "das Web-Bundle entsteht VOR dem Xcode-Build — sonst baut Apple eine leere App");
  ok(/brew install node/.test(t), "Node wird nachinstalliert (die Images haben keins)");
  ok(/native-app\.test\.js/.test(t) && /decide\.test\.js/.test(t),
    "die Fachtests laufen mit — ein roter Test stoppt den Build vor der Rechenzeit");
  // Ein geteiltes Schema ist Pflicht: ohne findet Xcode Cloud kein Ziel.
  ok(exists("ios-app/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme"),
    "das Schema ist geteilt — sonst sieht Xcode Cloud kein Build-Ziel");
}


group("Essens-Protokoll ist vollstaendig verdrahtet");
{
  const page = read("meinplan.html");
  ok(/js\/simple\/foodlog\.js/.test(page), "foodlog.js wird geladen");
  ok(page.indexOf("foodlog.js") < page.indexOf("decide.js"),
    "und zwar vor decide.js — der Score braucht die Auswertung");
  const app = read("js/simple/app.js");
  ok(/foodlog = MMSimple\.foodlog/.test(app), "app.js kennt das Modul");
  ok(/nutritionByDay: nutritionByDay\(p\)/.test(app),
    "die gemessene Ernaehrung geht in JEDEN Execution-Score-Aufruf");
  ok((app.match(/nutritionByDay: nutritionByDay\(p\)/g) || []).length === 3,
    "in alle drei Aufrufe (Today, Fortschritt, Wochencheck) — sonst waeren die Zahlen widerspruechlich");
  ok(/openFoodSheet/.test(app), "das Eintragen-Blatt existiert");

  const store = read("js/simple/plan-store.js");
  ok(/registerStateDomain\("simple_foodlog"/.test(store),
    "das Protokoll synct mit dem Konto — sonst faellt der Score auf einem zweiten Geraet grundlos ab");

  const fl = read("js/simple/foodlog.js");
  ok(!/fetch\(|XMLHttpRequest|https:\/\//.test(fl),
    "das Modul ruft nichts ab — keine Naehrwertdatenbank, keine Verbindung nach draussen");
  ok(/return null/.test(fl) && /minEntriesForDay/.test(fl),
    "ein leerer Tag liefert kein Urteil (sonst waere jedes Vergessen ein Diaetfehler)");
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
