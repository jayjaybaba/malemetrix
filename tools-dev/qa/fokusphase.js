/* Paket-2-Browserprüfung: kompletter kostenloser Auftragsfluss @390/@1440. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");

/* Paket-5-Realität: die Tageserfassung ist je nach Messdatenstufe eine
   Checkbox (Stufe C) ODER eine Schaltflächenreihe (Stufe A/B). */
async function tagAbhaken(page) {
  const cb = await page.$("#focusToday");
  if (cb) { await cb.click(); await page.waitForTimeout(400); return true; }
  for (const a of ["bestaetigen", "ja", "toggle"]) {
    const b = await page.$('[data-fday="' + a + '"]');
    if (b) { await b.click(); await page.waitForTimeout(400); return true; }
  }
  return false;
}
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  ✓ " + m); else { fail++; console.error("  ✗ FAIL: " + m); } };

const SEED_RESULT = {
  date: "2026-07-27", total: 55, level: "Solide Basis", levelText: "Fundament steht.",
  plan: "recomp", scores: { body: 50, strength: 55, fuel: 48, recovery: 40, blood: 52, drive: 47, execution: 60 },
  bottleneck: { key: "sleep", domain: "sleep", name: "Schlaf" },
  weakest: [], flags: [], answers: {}
};
const SEED_HISTORY = [{ date: "2026-06-27", total: 50, scores: {} }, { date: "2026-07-27", total: 55, scores: {} }];

async function openResult(page) {
  await page.waitForSelector("#existingResult [data-show]", { timeout: 10000 });
  await page.click("#existingResult [data-show]");
  await page.waitForTimeout(600);
}

async function checkPage(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, label + ": kein horizontaler Überlauf (" + over + "px)");
}

async function run(width) {
  console.log("\n== Fluss @" + width + "px ==");
  const browser = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e)));
  page.on("dialog", (d) => d.accept());

  // 1. Score-Ergebnis öffnen (gespeichertes Ergebnis, Hydrate-Pfad)
  await page.goto(BASE + "check.html", { waitUntil: "load" });
  await page.evaluate(([r, h]) => {
    localStorage.setItem("mm_check_result", JSON.stringify(r));
    localStorage.setItem("mm_check_history", JSON.stringify(h));
    localStorage.removeItem("mm_focus"); localStorage.removeItem("mm_focus_history");
  }, [SEED_RESULT, SEED_HISTORY]);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(600);
  await openResult(page);
  ok(await page.locator("#scoreFocus").count() === 1, "Ergebnisseite zeigt den Auftrags-Block");
  ok(await page.locator("#fpChips [data-fdays]").count() === 3, "drei Dauern (7/14/28) stehen zur Wahl");
  const zielDefault = await page.locator("#fpZiel").innerText();
  ok(/14 Tage \(empfohlen\)/.test(zielDefault), "empfohlene Dauer (Schlaf: 14) ist vorausgewählt und gekennzeichnet");
  await checkPage(page, "check.html Ergebnis");

  // 2. Dauer wählen: 7 Tage
  await page.click('[data-fdays="7"]');
  const ziel7 = await page.locator("#fpZiel").innerText();
  ok(/Fokusphase: 7 Tage/.test(ziel7) && /5 von 7 Tagen/.test(ziel7), "7-Tage-Wahl aktualisiert Ziel (5 von 7)");
  const kette = await page.locator("#fpKette").innerText();
  ok(/7 Tage/.test(kette) && !/28 Tage/.test(kette), "Kettentext folgt der Wahl — kein 28-Tage-Widerspruch");

  // 3. Auftrag starten → Tracker
  await page.click("#btnFocusStart");
  await page.waitForURL("**/tracker.html*", { timeout: 5000 });
  await page.waitForTimeout(700);
  let card = await page.locator("#focus").innerText();
  ok(/Fokusphase 7 Tage/.test(card), "Tracker zeigt die Fokusphase (7 Tage)");
  ok(/Umsetzungsprüfung am/.test(card), "Tracker zeigt den Termin der Umsetzungsprüfung");
  {
    const m = card.match(/Fokusphase 7 Tage: (\d{2}\.\d{2}\.\d{4})–(\d{2}\.\d{2}\.\d{4}) · Umsetzungsprüfung am (\d{2}\.\d{2}\.\d{4})/);
    ok(!!m, "Zeitraum und Prüfungstag sind getrennt formatiert");
    if (m) {
      const d = (x) => { const q = x.split("."); return new Date(+q[2], +q[1] - 1, +q[0]); };
      ok(Math.round((d(m[2]) - d(m[1])) / 86400000) === 6, "letzter Umsetzungstag = Start + 6 (7 Umsetzungstage)");
      ok(Math.round((d(m[3]) - d(m[2])) / 86400000) === 1, "Prüfungstag liegt EINEN Tag nach dem letzten Umsetzungstag");
    }
  }
  ok(/NOCH 7 TAGE/.test(card), "verbleibende Tage stimmen am Starttag (7)");
  await checkPage(page, "tracker.html laufend");

  // 4. Reload: Zustand bleibt
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  card = await page.locator("#focus").innerText();
  ok(/Fokusphase 7 Tage/.test(card), "Reload: gewählte Dauer bleibt erhalten");

  // 5. Tagesstatus erfassen
  await tagAbhaken(page);
  await page.waitForTimeout(400);
  card = await page.locator("#focus").innerText();
  ok(/1 von 7 Tagen umgesetzt · Ziel: 5 Tage/.test(card), "laufend: 1 von 7 Tagen umgesetzt, Ziel 5 getrennt genannt");

  // 6. Kein Doppelstart: Ergebnisseite zeigt laufenden Auftrag
  await page.goto(BASE + "check.html", { waitUntil: "load" }); await page.waitForTimeout(600);
  await openResult(page);
  const fb = await page.locator("#scoreFocus").innerText();
  ok(/laufenden Auftrag/.test(fb) && !/Auftrag starten/.test(fb), "kein zweiter Start möglich — laufender Auftrag wird angezeigt");
  const ep = await page.locator("#scoreAgain").innerText();
  ok(/Umsetzungsprüfung/.test(ep) && /vollständiger Score/.test(ep) && /unabhängig/.test(ep), "Ergebnisprüfungs-Block trennt Prüfungen vom vollständigen Score");

  // 7. ICS mit tatsächlichem Termin (Fokusphase 7 Tage)
  const until = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_focus")).until);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(() => null), page.click("#btnScoreIcs")]);
  if (dl) {
    const p = await dl.path();
    const ics = require("fs").readFileSync(p, "utf8");
    ok(ics.includes("DTSTART;VALUE=DATE:" + until.replace(/-/g, "")), "ICS-Termin = tatsächliches Fokusphasen-Ende (" + until + ")");
    ok(/Umsetzungsprüfung/.test(ics), "ICS benennt die Umsetzungsprüfung");
    ok(!/Score wiederholen/.test(ics), "ICS erzwingt keinen neuen Score bei laufendem Auftrag");
  } else { fail++; console.error("  ✗ FAIL: ICS-Download kam nicht an"); }

  // 8. Phasenende simulieren (kontrolliert: Daten in die Vergangenheit legen)
  await page.evaluate(() => {
    const f = JSON.parse(localStorage.getItem("mm_focus"));
    f.started = "2026-07-18"; f.until = "2026-07-25"; f.wirkungBis = "2026-07-25";
    f.done = { "2026-07-18": true, "2026-07-19": true, "2026-07-20": true, "2026-07-21": true, "2026-07-22": true };
    localStorage.setItem("mm_focus", JSON.stringify(f));
  });
  await page.goto(BASE + "tracker.html#focus", { waitUntil: "load" }); await page.waitForTimeout(600);
  card = await page.locator("#focus").innerText();
  ok(/ERGEBNISPRÜFUNG/.test(card), "Phasenende: Ergebnisprüfung öffnet sich");
  ok(/Umsetzung: 5 von 7 Tagen — ausreichend umgesetzt/.test(card), "Umsetzungsprüfung: 5 von 7 Tagen umgesetzt (Ziel ist NICHT der Nenner)");
  ok(/Ziel: 5 von 7 Tagen — erreicht · Umsetzungsquote 71 %/.test(card), "Ziel, Zielstatus und Quote stehen getrennt daneben");
  ok(/Fokusphase 7 Tage \(18\.07\.2026–24\.07\.2026\) · Umsetzungsprüfung 25\.07\.2026/.test(card), "Ergebnisprüfung nennt Zeitraum und Prüfungstag getrennt");
  ok(/Wirkungsprüfung/.test(card) && /Einschätzung/.test(card), "Wirkungsprüfung wird getrennt erfragt");
  ok(/Optional: zweiten Score/.test(card) && /unabhängig/.test(card), "kein Score-Zwang nach der Fokusphase");
  await checkPage(page, "tracker.html Ergebnisprüfung");

  // 9. Wirkung erfassen
  await page.click('[data-fwirkung="erkennbar"]'); await page.waitForTimeout(400);
  card = await page.locator("#focus").innerText();
  ok(/Wirkung erkennbar/.test(card), "Wirkung ‚erkennbar' erfasst und angezeigt");

  // 10. Abschließen & archivieren → Historie
  await page.click("#focusDrop"); await page.waitForTimeout(500);
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_focus_history") || "[]"));
  ok(hist.length === 1 && hist[0].days === 7 && hist[0].wirkung && hist[0].wirkung.verdict === "erkennbar",
    "Historie: Eintrag mit Dauer 7 und Wirkungs-Urteil gespeichert");

  // 11. Bilanz beim zweiten Besuch der Ergebnisseite (Historie lesbar)
  await page.goto(BASE + "check.html", { waitUntil: "load" }); await page.waitForTimeout(600);
  await openResult(page);
  const body = await page.evaluate(() => document.body.textContent);
  ok(/DEIN LETZTER AUFTRAG/.test(body) && /Wirkung erkennbar/.test(body), "Bilanz zeigt Umsetzung UND erfasste Wirkung getrennt");
  await checkPage(page, "check.html Bilanz");

  // 12. Archiviert MIT offener Wirkungsprüfung: bleibt sichtbar und bearbeitbar
  await page.goto(BASE + "tracker.html", { waitUntil: "load" });
  await page.evaluate(() => {
    localStorage.removeItem("mm_focus");
    localStorage.setItem("mm_focus_history", JSON.stringify([{
      domain: "training", title: "Drei feste Trainingstage", started: "2026-07-01", until: "2026-07-15",
      erledigt: 11, ziel: 10, geschafft: true, days: 14, quote: 79, wirkung: null, wirkungBis: "2026-07-29"
    }]));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  ok(await page.locator("#focus").count() === 1, "offene Wirkungsprüfung bleibt nach dem Archivieren sichtbar");
  card = await page.locator("#focus").innerText();
  ok(/WIRKUNGSPRÜFUNG · OFFEN/.test(card), "eigene Karte: Wirkungsprüfung offen");
  ok(/Umsetzung abgeschlossen/.test(card) && /11 von 14 Tagen \(Ziel: 10\)/.test(card), "zeigt: Umsetzung abgeschlossen, 11 von 14, Ziel 10");
  ok(/29\.07\.2026/.test(card), "zeigt den Termin der Wirkungsprüfung");
  ok(await page.locator('[data-fwirkung="nicht_geprueft"]').count() === 1, "bewusste Abwahl wird angeboten");
  await checkPage(page, "tracker.html offene Wirkungsprüfung");

  // Vertagen schließt NICHT ab
  await page.click('[data-fwirkung="offen"]'); await page.waitForTimeout(400);
  ok(await page.locator("#focus").count() === 1, "Vertagen (spaeter pruefen) laesst die Karte bestehen");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(500);
  ok(await page.locator("#focus").count() === 1, "auch nach Reload bleibt die offene Wirkungsprüfung auffindbar");
  // Ergebnis erfassen schließt ab
  await page.click('[data-fwirkung="teilweise"]'); await page.waitForTimeout(400);
  ok(await page.locator("#focus").count() === 0, "mit erfasstem Wirkungsergebnis verschwindet die Karte");
  const h2 = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_focus_history"))[0].wirkung.verdict);
  ok(h2 === "teilweise", "das Ergebnis ist am archivierten Vorgang gespeichert");

  const realErrs = errs.filter((e) => !/supabase|fetch|Failed to load|NetworkError|ERR_/i.test(e));
  ok(realErrs.length === 0, "keine JavaScript-Fehler im gesamten Fluss" + (realErrs.length ? ": " + realErrs.join(" | ") : ""));
  await browser.close();
}

(async () => {
  await run(390);
  await run(1440);
  console.log(fail ? "\nFLUSS-CHECK: " + fail + " FEHLER" : "\nFLUSS-CHECK: OK");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("QA ERROR: " + (e && e.stack || e)); process.exit(1); });
