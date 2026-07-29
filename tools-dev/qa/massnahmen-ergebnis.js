/* Paket 7 — Abläufe D (Ergebnisprüfung) und E (persönlicher Standard), @390/@1440. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  OK  " + m); else { fail++; console.error("  FAIL: " + m); } };
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const H = new Date();
const back = (n) => { const d = new Date(H); d.setDate(d.getDate() - n); return ymd(d); };
const P1 = { id: "pt_1", area: "recovery", areaLabel: "Regeneration", title: "Abendliche Regeneration verbessern",
  status: "erkannt", source_type: "manual", source_id: "op1", created: back(20), updated_at: new Date().toISOString() };
const M = { id: "pt_2", area: "recovery", areaLabel: "Regeneration", title: "Magnesium (abends)",
  measure_label_snapshot: "Magnesium (abends)", origin: "massnahme", source_type: "measure",
  source_id: "pt_1|stack:magnesium", optimization_point_id: "pt_1", measure_source: "stack",
  measure_id: "magnesium", measure_started_at: back(20), observation_days: 14, review_date: back(6),
  criterion_label: "Morgenenergie", criterion_source: "manuell", baseline_snapshot: null,
  arztVorbehalt: false, measure_warning: "", status: "in_umsetzung", result_summary: "",
  measure_decision: null, usability_result: "", standard: null, completed_at: null,
  created: back(20), updated_at: new Date().toISOString() };

async function run(width) {
  console.log("\n== Abläufe D + E @" + width + "px ==");
  const b = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const page = await (await b.newContext({ viewport: { width, height: 950 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message || e)));
  await page.goto(BASE + "mein-protokoll.html#plan", { waitUntil: "load" });
  await page.evaluate((s) => { localStorage.clear(); Object.keys(s).forEach((k) => localStorage.setItem("mm_" + k, JSON.stringify(s[k]))); },
    { opt_points: [P1, M], os_stack: { budget: "optimal", items: [{ id: "creatine", name: "Kreatin Monohydrat" }], saved: back(40) } });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1400);

  /* D — Ergebnisprüfung */
  ok(await page.evaluate(() => /Prüfung fällig/.test((document.querySelector(".mn-st") || {}).textContent || "")),
    "am Prüfungstermin wird die Maßnahme fällig");
  ok(await page.evaluate(() => document.querySelectorAll(".os-massnahme.is-due").length === 1), "und ist als fällig hervorgehoben");
  ok(await page.evaluate(() => /Morgenenergie/.test(document.querySelector(".mn-meta").textContent)), "das Erfolgssignal ist sichtbar");
  const felder = await page.evaluate(() => Array.from(document.querySelectorAll("[data-mnf]")).map((e) => e.getAttribute("data-mnf")));
  ["umsetzung", "wirkung", "alltag", "decision"].forEach((f) => ok(felder.indexOf(f) >= 0, "die Prüfung erfasst " + f + " getrennt"));
  const wirk = await page.evaluate(() => Array.from(document.querySelectorAll('[data-mnf="wirkung"] option')).map((o) => o.textContent));
  ok(!wirk.some((t) => /bewiesen|garantiert|verursacht|bestätigt/i.test(t)), "keine Kausalitäts- oder Beweisformulierung");

  await page.selectOption('[data-mnf="umsetzung"][data-id="pt_2"]', "regelmaessig");
  await page.selectOption('[data-mnf="wirkung"][data-id="pt_2"]', "erkennbar");
  await page.selectOption('[data-mnf="alltag"][data-id="pt_2"]', "gut");
  await page.selectOption('[data-mnf="decision"][data-id="pt_2"]', "beibehalten");
  await page.evaluate(() => document.querySelector('[data-mnsave="pt_2"]').click());
  await page.waitForTimeout(900);
  let m = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points")).filter((x) => x.id === "pt_2")[0]);
  ok(m.umsetzung_result === "regelmaessig" && m.result_summary === "erkennbar" && m.usability_result === "gut",
    "Umsetzung, Wirkung und Alltagstauglichkeit sind getrennt gespeichert");
  ok(m.measure_decision === "beibehalten", "die Entscheidung ist gespeichert");
  ok(!m.standard, "kein automatischer persönlicher Standard");
  ok(!/verursacht|bewiesen/i.test(await page.evaluate(() => document.body.innerText)), "keine automatische Kausalitätsaussage");

  /* E — persönlicher Standard */
  ok(await page.evaluate(() => !!document.querySelector("[data-mnstd]")), "die Empfehlung zur dauerhaften Übernahme erscheint");
  ok(!(await page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points")).some((x) => x.standard && x.standard.bestaetigt))),
    "ohne Bestätigung entsteht kein Standard");
  await page.evaluate(() => document.querySelector("[data-mnstd]").click());
  await page.waitForTimeout(900);
  m = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points")).filter((x) => x.id === "pt_2")[0]);
  ok(m.standard && m.standard.bestaetigt, "die ausdrückliche Übernahme erzeugt den Standard");
  ok(m.standard.was === "Magnesium (abends)" && m.standard.bereich, "in der kanonischen Struktur aus Paket 3");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1400);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points")).some((x) => x.standard && x.standard.bestaetigt)),
    "nach Reload bleibt der Standard erhalten");

  /* H — Historie eingefroren */
  const hist = await page.evaluate(() => { const h = document.querySelector(".os-mnhist"); return h ? h.innerText : ""; });
  ok(/ABGESCHLOSSENE/.test(hist) && /Magnesium/.test(hist), "die abgeschlossene Prüfung erscheint in der Historie");
  ok(/beibehalten/.test(hist), "mit ihrer Entscheidung");
  await page.evaluate(() => { (window.MM.engines.SUPPS || []).forEach((s) => { s.name = "GEAENDERT " + s.id; }); location.hash = "#today"; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = "#plan"; });
  await page.waitForTimeout(1000);
  const h2 = await page.evaluate(() => { const h = document.querySelector(".os-mnhist"); return h ? h.innerText : ""; });
  ok(h2 === hist && !/GEAENDERT/.test(h2), "nach Änderung der Katalogtitel bleibt die Historie unverändert lesbar");
  const vor = await page.evaluate(() => localStorage.getItem("mm_opt_points"));
  await page.evaluate(() => localStorage.setItem("mm_os_metrics", JSON.stringify([{ type: "weight", value: 99, date: "2026-01-01" }])));
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => localStorage.getItem("mm_opt_points")) === vor,
    "spätere Messwertänderungen verändern die abgeschlossene Bilanz nicht");

  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, "kein horizontaler Überlauf (" + over + "px)");
  ok(errs.length === 0, "keine JavaScript-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await b.close();
}
(async () => {
  await run(390); await run(1440);
  console.log("\n" + (fail ? "FAILS: " + fail : "ABLAEUFE D+E BESTANDEN"));
  console.log("EXIT=" + (fail ? 1 : 0));
  process.exit(fail ? 1 : 0);
})();
