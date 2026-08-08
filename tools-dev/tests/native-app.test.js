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


group("App-Bundle: nur was gebraucht wird — aber alles, was gebraucht wird");
{
  const build = read("scripts/build-app.mjs");
  ok(!/const DIRS = \[[^\]]*"js"/.test(build),
    "js/ wird nicht mehr pauschal kopiert (824 KB js/os hatte niemand angefordert)");
  ok(/sammleSkripte/.test(build), "die Skripte kommen aus den Referenzen der Seiten");
  ok(/module\.add\(rel\)/.test(build) && /bfrom/.test(build),
    "und ES-Modul-Importe zaehlen mit — daran ist transformation.html gescheitert");
  /* Der eigentliche Beweis: die Datei, an der es haengt, muss ankommen. */
  ok(/import \* as G from "\.\/supabase\/functions\/_shared\/transform-goals\.mjs/.test(read("transformation.html")),
    "transformation.html laedt die Zielengine weiterhin als Modul");
  /* Im Bundle heisst sie .js: iOS kennt die Endung .mjs nicht und liefert
     application/octet-stream, womit WebKit das Modul ablehnt. */
  ok(/\.mjs\$\/, "\.js"/.test(build) && /\\.mjs\(\["'\?\]\)/.test(build),
    "der Build benennt .mjs im Bundle nach .js um und zieht den Importpfad mit");
  if (exists("app-build")) {
    ok(exists("app-build/supabase/functions/_shared/transform-goals.js"),
      "und die Zielengine liegt wirklich im gebauten Bundle");
    ok(/transform-goals\.js/.test(read("app-build/transformation.html")),
      "die gebaute Seite zeigt auf den umbenannten Pfad");
  }
  ok(/NACHGELADEN/.test(build) && /i18n-en\.js/.test(build),
    "zur Laufzeit nachgeladene Dateien stehen in einer benannten Liste, nicht im Zufall");
  ok(/uebersprungen\.length/.test(build),
    "der Build sagt laut, was er weglaesst — stilles Weglassen liest sich wie Vollstaendigkeit");

  /* Ein Service Worker im App-Binary wuerde nach einem Store-Update die alte
     Fassung weiterliefern. */
  const main = read("js/main.js");
  ok(/MM\.native\.isApp \|\| MM\.native\.inBundle/.test(main) && /!inApp && "serviceWorker" in navigator/.test(main),
    "in der App wird kein Service Worker registriert");
  ok(/inBundle: true/.test(read("js/native-bridge.js")),
    "und die Bruecke markiert jede Seite, die aus dem Bundle kommt");

  ok(/bundle-smoke/.test(read("tools-dev/qa/bundle-smoke.mjs")),
    "es gibt einen Browser-Nachweis, dass das verschlankte Bundle wirklich laedt");

  /* Medien, die auf iOS nie abgespielt oder nie angezeigt werden. */
  ok(!inBundle("assets/hero/mm-home-hero.webm"), "kein WebM im Bundle — WebKit spielt es nicht");
  ok(inBundle("assets/hero/mm-home-hero.mp4"), "das MP4 daneben ist da, sonst faellt das Video ins Leere");
  ["check.html", "tools.html"].forEach(function (p) {
    ok(!/type="video\/webm"/.test(read("app-build/" + p)),
      p + " bietet das fehlende WebM nicht mehr an (sonst: 404 vor dem Rueckfall aufs MP4)");
    ok(/mm-home-hero\.mp4/.test(read("app-build/" + p)), p + " zeigt weiterhin auf das MP4");
  });
  ok(!inBundle("icons/tiktok-app-icon-1024.png") && !inBundle("icons/icon-1024.png"),
    "Store- und Marketingvorlagen bleiben draussen (das App-Icon liegt im Xcode-Projekt)");
  ok(inBundle("icons/icon-180.png"), "das Touch-Icon, auf das jede Seite zeigt, ist drin");

  /* Die Groesse selbst ist eine Zusage: 7,0 MB waren es vor dieser Runde. */
  const groesse = (function dirSize(d) {
    let n = 0;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const q = path.join(d, e.name);
      n += e.isDirectory() ? dirSize(q) : fs.statSync(q).size;
    }
    return n;
  })(OUT);
  ok(groesse < 4.5 * 1048576,
    "das Bundle bleibt unter 4,5 MB (aktuell " + (groesse / 1048576).toFixed(1) + " MB)");
}

group("Zahlen und Daten stehen in der Sprache des Nutzers");
{
  const app = read("js/simple/app.js");
  ok(/function nf\(/.test(app) && /Intl\.NumberFormat/.test(app),
    "es gibt genau einen Zahlenformatierer, und der nutzt Intl");
  ok(/function dt\(/.test(app) && /Intl\.DateTimeFormat/.test(app),
    "und einen Datumsformatierer");

  /* Der Fortschritts-Bildschirm hat „93.7 kg" und „85 kg am 2026-12-24"
     gezeigt — beides sind Datenbankausgaben, keine deutschen Saetze. */
  const roh = [];
  app.split("\n").forEach((z, i) => {
    if (/^\s*(\/\*|\*|\/\/)/.test(z)) return;
    // Gewichte: eine Variable, direkt gefolgt von " kg"
    if (/[A-Za-z0-9_\]\)]\s*\+\s*" kg"/.test(z) && !/nf\(|zde\(|zen\(/.test(z)) roh.push((i + 1) + " (kg)");
    // Datumsangaben: ein *Date-Feld direkt in einen Text gehaengt
    if (/\+\s*(traj\.projectedDate|p\.startDate|last\.date)\b/.test(z)) roh.push((i + 1) + " (Datum)");
    // Raten: „-0.45 kg/Woche" stand doppelt auf dem Fortschritts-Bildschirm
    if (/(deltaPerWeek|RatePerWeek)\s*\+\s*" kg\//.test(z)) roh.push((i + 1) + " (Rate)");
  });
  ok(roh.length === 0, "keine ungeformatierte Zahl oder Datumsangabe in der Ausgabe" +
    (roh.length ? " — Zeile " + roh.join(", ") : ""));

  /* Auch die Entscheidungsschicht baut fertige Saetze — dort gilt dasselbe. */
  const dec = read("js/simple/decide.js");
  ok(/function zde\(/.test(dec), "decide.js formatiert deutsche Zahlen mit Komma");
}

group("Bewegung: drei Motive, ein Ausschalter");
{
  const css = read("css/simple.css");
  const app = read("js/simple/app.js");

  ok(/transition:[^;]*140ms/.test(css), "Rueckmeldung beim Antippen: 140 ms");
  ok(/animation:\s*s-sheet-in 320ms cubic-bezier\(0\.32, 0\.72, 0, 1\)/.test(css),
    "Blatt auf: 320 ms auf der iOS-Kurve");
  ok(/animation:\s*s-sheet-out 220ms/.test(css), "Blatt zu: 220 ms — schneller als auf");
  ok(/animation:\s*s-rise 220ms cubic-bezier\(0\.23, 1, 0\.32, 1\)/.test(css),
    "Inhalt laeuft in 220 ms ein");
  ok(/nth-child\(2\)\s*{\s*animation-delay:\s*40ms/.test(css), "versetzt um 40 ms");
  ok(/nth-child\(n\+5\)/.test(css), "aber gedeckelt — kein Wasserfall bei langen Listen");

  /* Der teuerste Fehler waere, den Einlauf bei JEDEM render() zu zeigen:
     render() laeuft auch beim Abhaken einer Aufgabe. */
  ok(/viewChanged && !reducedMotion\(\)/.test(app),
    "der Einlauf laeuft nur beim echten Ansichtswechsel, nicht bei jedem Haekchen");
  ok(/classList\.remove\("s-enter"\)/.test(app), "und wird vorher zurueckgesetzt");

  /* Das Blatt darf nicht verschwinden, bevor es sich bewegt hat. */
  ok(/is-closing/.test(app) && /is-closing/.test(css),
    "das Zugehen laeuft ueber eine Klasse, nicht ueber sofortiges Entfernen");
  ok(/SHEET_OUT_MS\s*=\s*220/.test(app), "und die Wartezeit in JS passt zur Dauer in CSS");

  /* Apple prueft das in der Review, und es ist ohnehin richtig. */
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(css),
    "wer Bewegung reduziert hat, bekommt keine");
  const rm = (css.match(/@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*?)\n}/) || ["", ""])[1];
  ["s-sheet", "s-enter", "s-task"].forEach(function (k) {
    ok(rm.indexOf(k) >= 0, "und zwar auch fuer ." + k);
  });
  ok(/matchMedia\("\(prefers-reduced-motion: reduce\)"\)/.test(app),
    "auch die JS-Seite fragt die Einstellung ab, statt blind zu warten");

  /* Bewusste Ablehnungen — sie stehen im Code, damit sie nicht zurueckkommen. */
  ok(!/cubic-bezier\([^)]*,\s*-[0-9.]/.test(css) && !/\bspring\b/.test(css),
    "keine Feder, kein Nachwippen");
  ok(!/skeleton|shimmer/i.test(css), "keine Skelett-Platzhalter — die Daten liegen lokal");

  /* Ein Blatt, ueber dem noch etwas liegt, ist kein Modal. Die feste
     Kopfzeile der Website steht bei z-index 100 — das Blatt muss darueber. */
  const zKopf = parseInt((read("css/style.css").match(/\.site-header\s*{[^}]*z-index:\s*(\d+)/) || [])[1], 10);
  const zBlatt = parseInt((css.match(/\.s-sheet-back\s*{[^}]*z-index:\s*(\d+)/) || [])[1], 10);
  const zVorn = parseInt((css.match(/\.s-sheet\s*{[^}]*z-index:\s*(\d+)/) || [])[1], 10);
  ok(zKopf > 0 && zBlatt > zKopf, "die Abdunklung liegt ueber der Kopfzeile (" + zBlatt + " > " + zKopf + ")");
  ok(zVorn > zBlatt, "und das Blatt ueber der Abdunklung");

  ok(/tools-dev\/qa\/motion\.mjs/.test(read("tools-dev/qa/motion.mjs")),
    "es gibt einen Browser-Nachweis fuer die Bewegung, nicht nur diesen Texttest");
}

group("App-Oberflaeche: Regeln, die auf dem Telefon anders sind als am Schreibtisch");
{
  const css = read("css/simple.css");

  /* Apples Mindestmass fuer eine Tippflaeche. Der Browser-Durchlauf hat
     98 Elemente darunter gefunden; die Regel dagegen steht zentral. */
  ok(/min-height:\s*44px/.test(css), "die 44-pt-Regel steht im App-Stylesheet");
  ok(/\.sapp button/.test(css), "und gilt fuer alle Knoepfe der App, nicht nur einzelne");
  ["30px", "34px"].forEach(function (alt) {
    ok(!new RegExp("width:\\s*" + alt + ";\\s*height:\\s*" + alt).test(css),
      "kein quadratisches Bedienelement mehr mit " + alt);
  });

  /* Der Sprachknopf auf meinplan.html hing an einer Klasse, die es weder in
     CSS noch in JS gab — unformatiert und ohne Wirkung. */
  const seite = read("meinplan.html");
  ok(!/class="[^"]*\blang-toggle\b/.test(seite),
    "kein Element traegt mehr die tote Klasse lang-toggle");
  ok(/class="icon-btn lang-btn"/.test(seite), "der Sprachknopf traegt die Klasse, die js/main.js bindet");
  ok(/querySelectorAll\("\.lang-btn"\)/.test(read("js/main.js")), "und js/main.js bindet sie wirklich");

  /* Auf Touch bleibt :hover nach dem Antippen haengen. Jede Hover-Regel im
     App-Stylesheet muss deshalb hinter einem Zeiger-Test stehen. */
  const hoverRegeln = css.split("\n")
    .map((z, i) => ({ z: z, nr: i + 1 }))
    .filter((o) => /:hover/.test(o.z) && !/^\s*\/\*/.test(o.z));
  const guardBloecke = [];
  {
    let tiefe = 0, offen = false;
    css.split("\n").forEach((z, i) => {
      if (/@media[^{]*\(hover:\s*hover\)/.test(z)) { offen = true; tiefe = 0; }
      if (offen) {
        tiefe += (z.match(/{/g) || []).length - (z.match(/}/g) || []).length;
        guardBloecke.push(i + 1);
        if (tiefe <= 0 && /}/.test(z)) offen = false;
      }
    });
  }
  const ungeschuetzt = hoverRegeln.filter((o) => guardBloecke.indexOf(o.nr) < 0);
  ok(ungeschuetzt.length === 0,
    "keine ungeschuetzte :hover-Regel in css/simple.css" +
    (ungeschuetzt.length ? " — Zeile " + ungeschuetzt.map((o) => o.nr).join(", ") : ""));

  /* Gruen heisst in dieser App „laeuft". Der Fokussatz ist eine Anweisung. */
  const statusRegel = (css.match(/\.s-head \.status\s*{[^}]*}/) || [""])[0];
  ok(statusRegel.length > 0, "die Fokuszeile hat eine eigene Regel");
  ok(!/var\(--green\)/.test(statusRegel),
    "die Fokuszeile ist nicht gruen — Gruen bleibt fuer erreichte Ziele reserviert");
  ok(/\.s-head \.status\.warn/.test(css),
    "abweichende Tage bekommen weiterhin eine eigene Farbe");
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
  /* Die Zahl der Aufrufe darf wachsen — was nicht wachsen darf, ist die
     Zahl der Aufrufe OHNE gemessene Ernaehrung. Sonst zeigen zwei
     Bildschirme zwei verschiedene Umsetzungsquoten. */
  const aufrufe = (app.match(/decide\.executionScore\(/g) || []).length;
  const mitEssen = (app.match(/nutritionByDay: nutritionByDay\(p\)/g) || []).length;
  ok(aufrufe >= 3 && mitEssen === aufrufe,
    "jeder der " + aufrufe + " Execution-Score-Aufrufe bekommt die gemessene Ernaehrung (" + mitEssen + ")");
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


group("Ersatzweg zu TestFlight: ohne API-Schluessel, mit manueller Signatur");
{
  const wf = ".github/workflows/ios-testflight-manuell.yml";
  ok(exists(wf), "der Workflow existiert");
  const t = read(wf);
  ok(!/ASC_KEY_ID|ASC_PRIVATE_KEY|authenticationKeyPath/.test(t),
    "er braucht KEINEN App-Store-Connect-API-Schluessel — das ist sein ganzer Zweck");
  ok(/altool --upload-app/.test(t) && /-u "\$APPLE_ID" -p "\$APPLE_APP_PASSWORD"/.test(t),
    "der Upload laeuft ueber ein app-spezifisches Passwort (Text, kein Download)");
  ok(/CODE_SIGN_STYLE=Manual/.test(t), "manuelle Signatur statt automatischer");

  // Frueh scheitern ist billiger als spaet: beide Pruefungen muessen drin sein.
  ok(/MOD_K" != "\$MOD_C/.test(t),
    "Zertifikat und Schluessel werden abgeglichen, bevor Xcode startet");
  ok(/com\.apple\.developer\.healthkit/.test(t),
    "das Profil wird auf die HealthKit-Berechtigung geprueft — sonst faellt es erst beim Upload auf");
  ok(/de\.malemetrix\.app/.test(t), "und auf die richtige App-ID");

  ok(/set-key-partition-list/.test(t),
    "der Schluesselbund wird freigegeben, sonst blockiert codesign bis zum Timeout");
  ok(/security delete-keychain/.test(t) && /if: always\(\)/.test(t),
    "Schluesselbund und Profil werden auch nach einem Fehlschlag entfernt");
  ok(/::add-mask::/.test(t), "erzeugte Passwoerter werden im Protokoll maskiert");

  ok(exists("tools-dev/signing/MaleMetrix.certSigningRequest"),
    "die Zertifikatsanfrage liegt bereit (Download von GitHub statt von Apple)");
  const csr = read("tools-dev/signing/MaleMetrix.certSigningRequest");
  ok(/BEGIN CERTIFICATE REQUEST/.test(csr) && !/PRIVATE KEY/.test(csr),
    "sie enthaelt nur den oeffentlichen Teil — kein privater Schluessel im Repository");
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
