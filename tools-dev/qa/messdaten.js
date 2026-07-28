/* Paket-5-Browserprüfung: Messdatenbrücke, Abläufe A–E @390/@1440. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  " + (c ? "OK  " : "") + m); else { fail++; console.error("  FAIL: " + m); } };

const HEUTE = new Date();
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const T0 = ymd(HEUTE);
const START = ymd(plus(HEUTE, -3));
const UNTIL = ymd(plus(HEUTE, 11));

function auftrag(domain, over) {
  return Object.assign({
    v: 1, domain: domain, bottleneckName: "Test", title: "Testauftrag " + domain,
    daily: domain === "energy" ? "Heute nach 14 Uhr koffeinfrei"
      : domain === "training" ? "Heute Plan eingehalten (trainiert oder geplanter Ruhetag)"
      : "Heute 30 Minuten in Bewegung",
    why: "w", proof: "p", arzt: "", target: 10, days: 14, wirkfrist: 14,
    started: START, until: UNTIL, wirkungBis: UNTIL, done: {}
  }, over || {});
}

async function seed(page, store) {
  await page.goto(BASE + "tracker.html", { waitUntil: "load" });
  await page.evaluate((s) => {
    localStorage.clear();
    Object.keys(s).forEach((k) => localStorage.setItem("mm_" + k, JSON.stringify(s[k])));
  }, store);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(700);
}
const karte = (page) => page.evaluate(() => {
  const c = document.getElementById("focus");
  if (!c) return null;
  const auto = c.querySelector(".trk-focus-auto");
  return {
    text: c.innerText,
    hatCheckbox: !!c.querySelector("#focusToday"),
    checked: !!(c.querySelector("#focusToday") || {}).checked,
    hatAuto: !!auto,
    state: auto && auto.querySelector(".ta-state") ? auto.querySelector(".ta-state").textContent : null,
    ev: auto && auto.querySelector(".ta-ev") ? auto.querySelector(".ta-ev").textContent : null,
    src: auto && auto.querySelector(".ta-src") ? auto.querySelector(".ta-src").textContent : null,
    buttons: Array.from(c.querySelectorAll("[data-fday]")).map((b) => b.getAttribute("data-fday") + "|" + b.textContent.trim())
  };
});
const focusStore = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_focus") || "null"));
const punkte = (page) => page.evaluate(() => localStorage.getItem("mm_opt_points"));
async function klick(page, action) {
  await page.click('[data-fday="' + action + '"]');
  await page.waitForTimeout(400);
}
async function noOverflow(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, label + ": kein horizontaler Ueberlauf (" + over + "px)");
}

async function run(width) {
  console.log("\n======== MESSDATENBRUECKE @" + width + "px ========");
  const browser = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e)));
  page.on("dialog", (d) => d.accept());

  /* ---------------- A. Automatisch erkennbarer Auftrag --------------- */
  console.log("\n-- A. Automatisch erkennbarer Auftrag --");
  await seed(page, { focus: auftrag("cardiovascular"), trk_daily: [{ date: T0, min: 18 }] });
  let k = await karte(page);
  ok(!!k && k.hatAuto, "Stufe A zeigt die Messdaten-Tagesdarstellung statt der Checkbox");
  ok(k && !k.hatCheckbox, "keine doppelte Ja/Nein-Checkbox daneben");
  ok(k && /noch offen/i.test(k.state || ""), "Messwert unter Ziel: keine automatische Erfuellung — " + (k.state || ""));
  ok(k && /18 min von 30 min/.test(k.ev || ""), "der Abstand zum Ziel ist sichtbar: " + (k.ev || ""));
  let f = await focusStore(page);
  ok(f && Object.keys(f.done).length === 0, "unter dem Ziel entsteht kein Tageseintrag");

  await page.evaluate((t) => localStorage.setItem("mm_trk_daily", JSON.stringify([{ date: t, min: 45 }])), T0);
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(700);
  k = await karte(page);
  ok(k && /Heute umgesetzt/.test(k.state || ""), "Ziel erreicht: der Tag wird automatisch erkannt");
  ok(k && /45 min erfasst/.test(k.ev || ""), "der beobachtete Wert ist sichtbar: " + (k.ev || ""));
  ok(k && /Ziel: mindestens 30 min/.test(k.ev || ""), "der Schwellenwert ist sichtbar");
  ok(k && /Quelle: Alltagsbewegung/.test(k.ev || ""), "die verwendete Quelle ist sichtbar");
  ok(k && /Automatisch aus Messdaten erkannt/.test(k.src || ""), "die Herkunft ist sichtbar benannt");
  f = await focusStore(page);
  ok(f && f.done[T0] && f.done[T0].s === "ja" && f.done[T0].q === "auto", "gespeichert ist nur der abgeleitete Status samt Herkunft");
  ok(f && f.done[T0].val === 45 && f.done[T0].ziel === 30, "beobachteter und erforderlicher Wert liegen bei");
  ok(f && !f.done[T0].entries && JSON.stringify(f).length < 3000, "der vollstaendige Messdatensatz wandert NICHT nach mm_focus");
  ok((await punkte(page)) === null, "es entsteht kein Optimierungspunkt");

  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  const f2 = await focusStore(page);
  ok(JSON.stringify(f2.done) === JSON.stringify(f.done), "ein Reload erzeugt keine Duplikate und keinen zweiten Eintrag");

  ok((await karte(page)).buttons.some((b) => b.indexOf("toggle|") === 0), "eine Korrektur ist erreichbar");
  await klick(page, "toggle");
  k = await karte(page);
  ok(/nicht umgesetzt/i.test(k.state || ""), "die manuelle Korrektur greift sofort");
  ok(/Manuell korrigiert/.test(k.src || ""), "und wird als manuelle Korrektur ausgewiesen");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(700);
  k = await karte(page);
  ok(/nicht umgesetzt/i.test(k.state || ""), "nach Reload bleibt die manuelle Korrektur erhalten");
  const f3 = await focusStore(page);
  ok(f3.done[T0].q === "korrigiert", "die Messdaten ueberschreiben die Entscheidung nicht");
  await noOverflow(page, "Stufe A");

  /* ---------------- B. Bestaetigung erforderlich --------------------- */
  console.log("\n-- B. Bestaetigung erforderlich --");
  await seed(page, { focus: auftrag("training"), trk_sessions: [{ date: T0 + "T09:00:00.000Z", duration: 55, name: "Push" }] });
  k = await karte(page);
  ok(k && /Messdaten sprechen dafuer|Messdaten sprechen dafür/.test(k.state || ""), "das System schlaegt die Erfuellung vor");
  ok(k && /Quelle: Trainingslog im Tracker/.test(k.ev || ""), "die Quelle des Vorschlags ist sichtbar");
  ok(k && /zusaetzliche Bedingungen|zusätzliche Bedingungen/.test(k.src || ""), "der Grund fuer die Rueckfrage ist benannt");
  ok(k && k.buttons.length === 3, "drei Wege: bestaetigen, nicht umgesetzt, spaeter");
  f = await focusStore(page);
  ok(f && Object.keys(f.done).length === 0, "ohne Bestaetigung entsteht KEIN Haekchen");

  await klick(page, "spaeter");
  f = await focusStore(page);
  ok(f && Object.keys(f.done).length === 0, "auch nach spaeter entscheiden bleibt der Tag leer");

  /* Ein verwandter Wert UNTER dem Ziel darf nicht als Vorschlag auftreten. */
  await seed(page, { focus: auftrag("movement"), trk_daily: [{ date: T0, min: 8 }] });
  const kb = await karte(page);
  ok(kb && /noch offen/i.test(kb.state || ""), "ein Wert unter dem Ziel erzeugt KEINEN Vorschlag: " + (kb.state || ""));
  ok(kb && /reicht als Beleg nicht/.test(kb.ev || ""), "stattdessen steht ehrlich da, dass der Beleg nicht reicht");
  ok(kb && !/sprechen dafuer|sprechen dafür/.test(kb.text), "keine unbelegte Behauptung");
  await seed(page, { focus: auftrag("movement"), trk_daily: [{ date: T0, min: 80 }] });
  const kb2 = await karte(page);
  ok(kb2 && /sprechen dafuer|sprechen dafür/.test(kb2.state || ""), "über dem Ziel erscheint der Vorschlag");
  ok(kb2 && /zaehlt Schritte|zählt Schritte/.test(kb2.src || ""), "und benennt, dass Schritte nicht erfasst werden");

  await seed(page, { focus: auftrag("training"), trk_sessions: [{ date: T0 + "T09:00:00.000Z", duration: 55, name: "Push" }] });
  await klick(page, "bestaetigen");
  f = await focusStore(page);
  ok(f && f.done[T0] && f.done[T0].s === "ja" && f.done[T0].q === "bestaetigt", "die Bestaetigung erzeugt ein manuelles Ergebnis");
  k = await karte(page);
  ok(/Manuell bestaetigt|Manuell bestätigt/.test(k.src || ""), "die Herkunft steht als manuelle Bestaetigung da");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(700);
  f = await focusStore(page);
  ok(f.done[T0].q === "bestaetigt", "nach Reload bleibt das Ergebnis erhalten");
  ok((await punkte(page)) === null, "auch die Bestaetigung erzeugt keinen Optimierungspunkt");
  await noOverflow(page, "Stufe B");

  /* ---------------- C. Nur manueller Auftrag ------------------------- */
  console.log("\n-- C. Nur manueller Auftrag --");
  await seed(page, { focus: auftrag("energy"), trk_daily: [{ date: T0, min: 120 }], trk_sessions: [{ date: T0 + "T10:00:00.000Z", duration: 90 }] });
  k = await karte(page);
  ok(k && k.hatCheckbox && !k.hatAuto, "die bestehende Ja/Nein-Erfassung ist unveraendert");
  ok(k && !/Messdaten/.test(k.text), "trotz vieler Messdaten keine automatische Aussage");
  f = await focusStore(page);
  ok(f && Object.keys(f.done).length === 0, "und kein automatischer Eintrag");
  await page.click("#focusToday"); await page.waitForTimeout(400);
  f = await focusStore(page);
  ok(f.done[T0] && f.done[T0].s === "ja" && f.done[T0].q === "manuell", "die Checkbox speichert manuell umgesetzt");
  await page.click("#focusToday"); await page.waitForTimeout(400);
  f = await focusStore(page);
  ok(!f.done[T0], "und laesst sich unveraendert wieder abwaehlen");
  await noOverflow(page, "Stufe C");

  /* ---------------- D. Quellenkonflikt ------------------------------- */
  console.log("\n-- D. Quellenkonflikt --");
  const diary = {}; diary["diary_" + T0] = { fruehstueck: [{ p: 30 }], mittag: [], abend: [], snacks: [] };
  await seed(page, Object.assign({
    focus: auftrag("nutrition"),
    os_nutrition_plan: { protein: 180, kcal: 2600 },
    os_nutrition_log: (() => { const o = {}; o[T0] = [{ p: 175 }]; return o; })(),
    goals: { kcal: 2600, p: 180, c: 0, f: 0 }
  }, diary));
  k = await karte(page);
  f = await focusStore(page);
  ok(f && Object.keys(f.done).length === 0, "ein Quellenkonflikt erfuellt nichts automatisch");
  ok(k && /unterschiedlichen Ergebnissen/.test(k.src || ""), "der Konflikt wird verstaendlich angezeigt");
  ok(k && k.buttons.length === 3, "der Nutzer entscheidet manuell");
  ok(k && !/355|205/.test(k.ev || ""), "die beiden Quellen werden nicht addiert: " + (k.ev || ""));
  await noOverflow(page, "Konflikt");

  /* Ohne Konflikt: OS ist kanonisch, es wird nicht summiert. */
  const diary2 = {}; diary2["diary_" + T0] = { fruehstueck: [{ p: 175 }], mittag: [], abend: [], snacks: [] };
  await seed(page, Object.assign({
    focus: auftrag("nutrition"),
    os_nutrition_plan: { protein: 180 },
    os_nutrition_log: (() => { const o = {}; o[T0] = [{ p: 175 }]; return o; })(),
    goals: { p: 180 }
  }, diary2));
  k = await karte(page);
  ok(k && /175 g erfasst/.test(k.ev || ""), "bei uebereinstimmenden Quellen zaehlt genau ein Wert: " + (k.ev || ""));
  ok(k && /Quelle: OS-Ernaehrungslog|Quelle: OS-Ernährungslog/.test(k.ev || ""), "die kanonische OS-Quelle gewinnt");
  ok(k && /Heute umgesetzt/.test(k.state || ""), "und erfuellt den Auftrag automatisch");

  /* ---------------- E. Ergebnispruefung ------------------------------ */
  console.log("\n-- E. Ergebnispruefung --");
  const d1 = ymd(plus(HEUTE, -12)), d2 = ymd(plus(HEUTE, -11)), d3 = ymd(plus(HEUTE, -10)), d4 = ymd(plus(HEUTE, -9));
  const abgelaufen = auftrag("cardiovascular", {
    started: ymd(plus(HEUTE, -14)), until: T0, wirkungBis: T0, target: 10, days: 14
  });
  abgelaufen.done[d4] = { v: 1, s: "ja", q: "manuell", at: "x" };
  await seed(page, {
    focus: abgelaufen,
    trk_daily: [{ date: d1, min: 40 }, { date: d2, min: 40 }, { date: d3, min: 40 }]
  });
  const txt = await page.evaluate(() => (document.getElementById("focus") || {}).innerText || "");
  ok(/Umsetzung: 4 von 14 Tagen/.test(txt), "manuelle und automatisch erkannte Tage zaehlen gemeinsam (4)");
  ok(/Ziel: 10 von 14 Tagen/.test(txt), "Ziel und Gesamttage bleiben getrennt ausgewiesen");
  ok(/nicht erreicht/.test(txt), "der Zielstatus ist korrekt");
  ok(/Umsetzungsquote/.test(txt), "die Umsetzungsquote bleibt erhalten");
  ok(/davon 3 Tage aus Tracking erkannt/.test(txt), "die Herkunft ergaenzt die Bilanz");
  ok(!/Tracking-Quote|zweite Quote/.test(txt), "es gibt keine zweite Quote fuer automatische Tage");
  ok(/Wirkungspruefung|Wirkungsprüfung/.test(txt), "die Wirkungspruefung bleibt eine eigenstaendige Frage");
  ok(!/hat gewirkt|wirksam/.test(txt), "die erkannte Umsetzung behauptet keine Wirkung");

  await page.evaluate(() => { const b = document.getElementById("focusDrop"); if (b) b.click(); });
  await page.waitForTimeout(600);
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_focus_history") || "[]"));
  ok(hist.length === 1 && hist[0].erledigt === 4, "die Bilanz wird als historischer Stand eingefroren");
  ok(hist[0].ausTracking === 3, "samt Herkunftsangabe");
  ok(hist[0].done === undefined, "die Tagesliste wandert nicht mit in die Historie");
  await page.evaluate(() => localStorage.setItem("mm_trk_daily", JSON.stringify([])));
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(700);
  const hist2 = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_focus_history") || "[]"));
  ok(JSON.stringify(hist2) === JSON.stringify(hist), "eine spaetere Tracker-Aenderung veraendert die archivierte Bilanz nicht");
  await noOverflow(page, "Ergebnispruefung");

  /* ---------------- Querschnitt --------------------------------------- */
  console.log("\n-- Querschnitt --");
  await seed(page, { focus: auftrag("cardiovascular"), trk_daily: [{ date: T0, min: 45 }] });
  const abgeschnitten = await page.evaluate(() => {
    const c = document.getElementById("focus");
    if (!c) return -1;
    return Array.from(c.querySelectorAll(".ta-head,.ta-state,.ta-ev,.ta-src,button"))
      .filter((e) => e.scrollWidth - e.clientWidth > 1).length;
  });
  ok(abgeschnitten === 0, "keine abgeschnittenen Labels (" + abgeschnitten + ")");
  const klein = await page.evaluate(() => Math.min.apply(null,
    Array.from(document.querySelectorAll(".trk-focus-auto p, .trk-focus-auto button"))
      .map((e) => parseFloat(getComputedStyle(e).fontSize))));
  ok(klein >= 10, "keine unlesbar kleine Typografie (" + klein + "px)");
  const bw = await page.evaluate(() => localStorage.getItem("mm_check_result"));
  ok(bw === null, "das Tagestracking legt kein Score-Ergebnis an und veraendert keinen Bereichswert");
  ok((await punkte(page)) === null, "kein Optimierungspunkt, kein persoenlicher Standard");

  /* PWA-Darstellung */
  const ctx2 = await browser.newContext({ viewport: { width, height: 950 } });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on("pageerror", (e) => errs2.push(String(e.message || e)));
  await p2.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) => { const r = orig(q); if (/display-mode/.test(q)) { try { Object.defineProperty(r, "matches", { value: /standalone/.test(q) }); } catch (e) {} } return r; };
  });
  await seed(p2, { focus: auftrag("cardiovascular"), trk_daily: [{ date: T0, min: 45 }] });
  const kp = await karte(p2);
  ok(kp && /Heute umgesetzt/.test(kp.state || ""), "identische Darstellung in der PWA");
  await noOverflow(p2, "PWA");
  ok(errs2.length === 0, "keine JavaScript-Fehler in der PWA" + (errs2.length ? ": " + errs2.join(" | ") : ""));
  await ctx2.close();

  ok(errs.length === 0, "keine JavaScript-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await browser.close();
}

(async () => {
  console.log("Heute: " + T0 + " · Fokusphase " + START + " bis " + UNTIL);
  await run(390);
  await run(1440);
  console.log("\n==============================");
  console.log(fail ? "FAILS: " + fail : "ALLE BROWSER-PRUEFUNGEN BESTANDEN");
  console.log("EXIT=" + (fail ? 1 : 0));
  process.exit(fail ? 1 : 0);
})();
