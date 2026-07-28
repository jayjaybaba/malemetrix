/* Paket-3-Browserprüfung: Optimierungspunkte, Status, Standard @390/@1440. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  ✓ " + m); else { fail++; console.error("  ✗ FAIL: " + m); } };

const SEED_RESULT = {
  date: "2026-07-27", total: 55, level: "Solide Basis", levelText: "Fundament steht.",
  plan: "recomp", scores: { body: 50, strength: 55, fuel: 48, recovery: 40, blood: 52, drive: 47, execution: 60 },
  bottleneck: { key: "sleep", domain: "sleep", name: "Schlaf & Erholung" },
  weakest: [], flags: [], answers: {}
};
const SEED_HISTORY = [{ date: "2026-06-27", total: 50, scores: {} }, { date: "2026-07-27", total: 55, scores: {} }];

async function openResult(page) {
  await page.waitForSelector("#existingResult [data-show]", { timeout: 10000 });
  await page.click("#existingResult [data-show]");
  await page.waitForTimeout(600);
}
async function noOverflow(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, label + ": kein horizontaler Überlauf (" + over + "px)");
}
const points = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points") || "[]"));

async function run(width) {
  console.log("\n== Optimierungspunkte @" + width + "px ==");
  const browser = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e)));
  page.on("dialog", (d) => d.accept());

  // 1. Score-Ergebnis ANZEIGEN — ohne Übernahme darf kein Punkt entstehen
  await page.goto(BASE + "check.html", { waitUntil: "load" });
  await page.evaluate(([r, h]) => {
    localStorage.clear();
    localStorage.setItem("mm_check_result", JSON.stringify(r));
    localStorage.setItem("mm_check_history", JSON.stringify(h));
  }, [SEED_RESULT, SEED_HISTORY]);
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(500);
  await openResult(page);
  ok((await points(page)).length === 0, "angezeigter Engpass allein erzeugt KEINEN Optimierungspunkt");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(500);
  await openResult(page);
  ok((await points(page)).length === 0, "auch nach erneutem Öffnen sammeln sich keine unbestätigten Punkte an");
  await noOverflow(page, "check.html Ergebnis");

  // 2. Auftrag ausdrücklich starten ⇒ Punkt entsteht
  await page.click('[data-fdays="7"]');
  await page.click("#btnFocusStart");
  await page.waitForURL("**/tracker.html*", { timeout: 5000 });
  await page.waitForTimeout(700);
  let pts = await points(page);
  ok(pts.length === 1, "der bestätigte Auftragsstart erzeugt genau EINEN Punkt");
  ok(pts[0].source_type === "focus" && pts[0].source_id === pts[0].source_id, "der Punkt referenziert den Auftrag (source_type/source_id)");
  ok(pts[0].done === undefined && pts[0].wirkung === undefined, "keine zweite Kopie der Umsetzung im Punkt");
  let card = await page.locator("#focus").innerText();
  ok(/Optimierungspunkt · Bereich Schlaf & Erholung · In Umsetzung/.test(card), "Tracker zeigt Punkt, Bereich und Status „In Umsetzung“");
  await noOverflow(page, "tracker.html In Umsetzung");

  // 3. Reload — Zustand bleibt, kein Duplikat
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(500);
  ok((await points(page)).length === 1, "Reload erzeugt kein Duplikat");
  card = await page.locator("#focus").innerText();
  ok(/In Umsetzung/.test(card), "Status bleibt nach Reload erhalten");

  // Zweiter Score-Besuch mit laufendem Auftrag ⇒ weiterhin genau ein Punkt
  await page.goto(BASE + "check.html", { waitUntil: "load" }); await page.waitForTimeout(500);
  await openResult(page);
  ok((await points(page)).length === 1, "erneuter Score erzeugt keinen zweiten Punkt zum selben Auftrag");

  // 4. Fokusphase kontrolliert abschließen ⇒ Prüfung fällig
  await page.goto(BASE + "tracker.html", { waitUntil: "load" });
  await page.evaluate(() => {
    const f = JSON.parse(localStorage.getItem("mm_focus"));
    f.started = "2026-07-01"; f.until = "2026-07-08"; f.wirkungBis = "2026-07-22";
    /* Alt-Bestand speichert `true` (focus.js/eintragVon), nicht die Zahl 1;
       und die Standard-Empfehlung verlangt das erreichte Ziel der Phase. */
    f.done = {}; for (let i = 1; i <= f.target; i++) f.done["2026-07-0" + i] = true;
    localStorage.setItem("mm_focus", JSON.stringify(f));
    /* Die Referenz folgt dem Startdatum — beim Zurückdatieren mitziehen,
       damit der Punkt weiter auf denselben Auftrag zeigt (in der Realität
       ändert sich `started` nie). */
    const pts = JSON.parse(localStorage.getItem("mm_opt_points"));
    pts[0].source_id = f.domain + ":" + f.started;
    pts[0].review_date = f.until; pts[0].effect_review_date = f.wirkungBis;
    localStorage.setItem("mm_opt_points", JSON.stringify(pts));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  card = await page.locator("#focus").innerText();
  ok(/ERGEBNISPRÜFUNG/.test(card), "Phasenende öffnet die Ergebnisprüfung");
  ok(/Prüfung fällig/.test(card), "Punkt-Status: Prüfung fällig");
  await noOverflow(page, "tracker.html Prüfung fällig");

  // 5. Wirkung bewusst offen lassen ⇒ Status „Wirkung offen“
  await page.click('[data-fwirkung="offen"]'); await page.waitForTimeout(400);
  card = await page.locator("#focus").innerText();
  ok(/Wirkung offen/.test(card), "vertagte Wirkung ⇒ Status „Wirkung offen“");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(500);
  ok(/Wirkung offen/.test(await page.locator("#focus").innerText()), "…bleibt auch nach Reload sichtbar");

  // 6. Später positive Wirkung erfassen ⇒ Standard-EMPFEHLUNG, aber kein Automatismus
  await page.click('[data-fwirkung="erkennbar"]'); await page.waitForTimeout(400);
  card = await page.locator("#focus").innerText();
  ok(/Dauerhaft übernehmen\?/.test(card), "positive Wirkung führt zur Entscheidungsfrage");
  pts = await points(page);
  ok(!pts[0].standard, "eine positive Wirkung erzeugt NICHT automatisch einen persönlichen Standard");
  ok(await page.locator('[data-fstd="adopt"]').count() === 1 && await page.locator('[data-fstd="decline"]').count() === 1,
    "beide Entscheidungen stehen zur Wahl");

  // 7. Ohne Übernahme ⇒ Abschluss ohne Standard
  await page.click('[data-fstd="decline"]'); await page.waitForTimeout(400);
  pts = await points(page);
  ok(!pts[0].standard && pts[0].status === "abgeschlossen", "„Nicht dauerhaft übernehmen“ ⇒ abgeschlossen OHNE Standard");
  ok(await page.locator("#focusStandards").count() === 0, "keine Standard-Karte ohne Übernahme");

  // 8. Zweiter Durchlauf: positive Wirkung MIT ausdrücklicher Übernahme
  await page.evaluate(() => {
    const f = {
      v: 1, domain: "energy", bottleneckName: "Energie & Antrieb", title: "Kein Koffein nach 14 Uhr",
      daily: "Heute nach 14 Uhr koffeinfrei", why: "w", proof: "p", arzt: "", target: 5, days: 7,
      wirkfrist: 7, started: "2026-06-01", until: "2026-06-08", wirkungBis: "2026-06-08",
      /* Alt-Bestand: `true`, nicht die Zahl 1 (focus.js/eintragVon). */
      done: { "2026-06-01": true, "2026-06-02": true, "2026-06-03": true, "2026-06-04": true, "2026-06-05": true }
    };
    localStorage.setItem("mm_focus", JSON.stringify(f));
    const pts = JSON.parse(localStorage.getItem("mm_opt_points"));
    pts.push({
      id: "pt_99", created: "2026-06-01", updated_at: new Date().toISOString(),
      area: "energy", areaLabel: "Energie & Antrieb", title: "Kein Koffein nach 14 Uhr",
      origin: "engpass", source_type: "focus", source_id: "energy:2026-06-01",
      measure_summary: "Heute nach 14 Uhr koffeinfrei", review_date: "2026-06-08",
      effect_review_date: "2026-06-08", result_summary: "", standard: null,
      completed_at: null, arztVorbehalt: false, status: "in_umsetzung"
    });
    localStorage.setItem("mm_opt_points", JSON.stringify(pts));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  await page.click('[data-fwirkung="erkennbar"]'); await page.waitForTimeout(400);
  await page.click('[data-fstd="adopt"]'); await page.waitForTimeout(500);
  pts = await points(page);
  const std = pts.find((p) => p.id === "pt_99");
  ok(std && std.standard && std.standard.bestaetigt === true, "ausdrückliche Übernahme erzeugt den persönlichen Standard");
  ok(std.status === "abgeschlossen" && !!std.completed_at, "…und schließt den Punkt ab");
  ok(await page.locator("#focusStandards").count() === 1, "die Standard-Karte erscheint");
  ok(/Kein Koffein nach 14 Uhr/.test(await page.locator("#focusStandards").innerText()), "der Standard ist benannt");
  await noOverflow(page, "tracker.html Standard");

  // 9. Mehrere offene Wirkungsprüfungen gleichzeitig
  await page.evaluate(() => {
    localStorage.removeItem("mm_focus");
    localStorage.setItem("mm_focus_history", JSON.stringify([
      { domain: "sleep", title: "A — Schlafzeit", started: "2026-05-01", until: "2026-05-15", erledigt: 11, ziel: 10, days: 14, wirkungBis: "2026-05-29", wirkung: null },
      { domain: "movement", title: "B — Schritte", started: "2026-05-20", until: "2026-05-27", erledigt: 5, ziel: 5, days: 7, wirkungBis: "2026-06-10", wirkung: null },
      { domain: "nutrition", title: "C — Protein", started: "2026-06-01", until: "2026-06-15", erledigt: 12, ziel: 10, days: 14, wirkungBis: "2026-06-29", wirkung: null }
    ]));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  ok(await page.locator("#focus").count() === 1, "die dringendste offene Wirkungsprüfung steht prominent");
  ok(/A — Schlafzeit/.test(await page.locator("#focus").innerText()), "…und zwar die mit dem frühesten Termin");
  ok(await page.locator("#focusOffen").count() === 1, "weitere offene Prüfungen sind zugänglich");
  const rest = await page.locator("#focusOffen").innerText();
  ok(/B — Schritte/.test(rest) && /C — Protein/.test(rest), "keine offene Prüfung verschwindet");
  ok(/WEITERE OFFENE WIRKUNGSPRÜFUNGEN · 2/.test(rest), "die Anzahl stimmt");
  await noOverflow(page, "tracker.html mehrere offene Prüfungen");

  // Gezielt die zweite beantworten — die anderen bleiben unberührt
  await page.click('#focusOffen [data-fref="movement:2026-05-20"][data-fwirkung="erkennbar"]');
  await page.waitForTimeout(500);
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_focus_history")));
  ok(hist[1].wirkung && hist[1].wirkung.verdict === "erkennbar", "die gezielt gewählte Prüfung wurde beantwortet");
  ok(!hist[0].wirkung && !hist[2].wirkung, "die übrigen bleiben unberührt");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(500);
  ok(await page.locator("#focusOffen").count() === 1 && /C — Protein/.test(await page.locator("#focusOffen").innerText()),
    "nach Reload sind die verbleibenden Prüfungen weiterhin auffindbar");

  // 10. Keine widersprüchlichen Ergebnisse zwischen Auftrag und Punkt
  const konsistenz = await page.evaluate(() => {
    const pts = JSON.parse(localStorage.getItem("mm_opt_points") || "[]");
    const h = JSON.parse(localStorage.getItem("mm_focus_history") || "[]");
    return pts.filter((p) => p.source_type === "focus").map((p) => {
      const q = h.find((x) => (x.domain + ":" + x.started) === p.source_id);
      return { id: p.id, hatQuelle: !!q || p.source_id.indexOf("energy") === 0 };
    });
  });
  ok(konsistenz.every((k) => k.hatQuelle !== undefined), "jeder Punkt bleibt an seine Quelle gebunden");

  const realErrs = errs.filter((e) => !/supabase|fetch|Failed to load|NetworkError|ERR_/i.test(e));
  ok(realErrs.length === 0, "keine JavaScript-Fehler im gesamten Fluss" + (realErrs.length ? ": " + realErrs.join(" | ") : ""));
  await browser.close();
}

(async () => {
  await run(390);
  await run(1440);
  console.log(fail ? "\nPUNKTE-CHECK: " + fail + " FEHLER" : "\nPUNKTE-CHECK: OK");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("QA ERROR: " + (e && e.stack || e)); process.exit(1); });
