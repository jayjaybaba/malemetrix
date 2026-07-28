/* Paket-7-Browserprüfung: Maßnahmenprüfung im Stack @390/@1440. */
/* Läuft gegen einen lokalen Server (Standard: http://127.0.0.1:8899/).
   Siehe tools-dev/qa/README.md. */
const pw = require(process.env.MM_PLAYWRIGHT || "playwright-core");
const BASE = process.env.MM_BASE || "http://127.0.0.1:8899/";
let fail = 0;
const ok = (c, m) => { if (c) console.log("  OK  " + m); else { fail++; console.error("  FAIL: " + m); } };

const HEUTE = new Date();
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const T0 = ymd(HEUTE);

const PUNKT = {
  id: "pt_1", area: "recovery", areaLabel: "Regeneration",
  title: "Abendliche Regeneration verbessern", status: "erkannt",
  source_type: "manual", source_id: "op1", created: T0, updated_at: new Date().toISOString()
};
/* Basis-Stack, der unverändert bleiben muss. */
const STACK = { budget: "optimal", items: [{ id: "creatine", name: "Kreatin Monohydrat", timing: "täglich 3–5 g" }], saved: ymd(plus(HEUTE, -30)) };

async function seed(page, store) {
  await page.goto(BASE + "mein-protokoll.html#plan", { waitUntil: "load" });
  await page.evaluate((s) => {
    localStorage.clear();
    Object.keys(s).forEach((k) => localStorage.setItem("mm_" + k, JSON.stringify(s[k])));
  }, store);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1400);
}
const punkte = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_opt_points") || "[]"));
const massnahmen = (page) => page.evaluate(() => Array.from(document.querySelectorAll(".os-massnahme")).map((el) => ({
  name: (el.querySelector(".mn-hd b") || {}).textContent || "",
  status: (el.querySelector(".mn-st") || {}).textContent || "",
  pt: (el.querySelector(".mn-pt") || {}).textContent || "",
  meta: (el.querySelector(".mn-meta") || {}).textContent || "",
  warn: (el.querySelector(".mn-warn") || {}).textContent || "",
  note: (el.querySelector(".mn-note") || {}).textContent || "",
  due: el.classList.contains("is-due"),
  text: el.innerText
})));
async function noOverflow(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, label + ": kein horizontaler Ueberlauf (" + over + "px)");
}
async function startMassnahme(page, suppId, days, crit) {
  await page.selectOption("#mnSupp", suppId);
  await page.selectOption("#mnDays", String(days));
  if (crit) await page.fill("#mnCrit", crit);
  await page.evaluate(() => document.getElementById("mnStart").click());
  await page.waitForTimeout(700);
}

async function run(width) {
  console.log("\n======== MASSNAHMENPRUEFUNG @" + width + "px ========");
  const browser = await pw.chromium.launch({ executablePath: process.env.MM_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e)));
  page.on("dialog", (d) => d.accept());

  /* ---------------- A. Nur vorgeschlagen ------------------------------ */
  console.log("\n-- A. Massnahme nur vorgeschlagen --");
  await seed(page, { opt_points: [PUNKT], os_stack: STACK });
  const hatForm = await page.evaluate(() => !!document.getElementById("mnStart"));
  ok(hatForm, "die Startflaeche erscheint, weil ein offener Optimierungspunkt existiert");
  ok((await massnahmen(page)).length === 0, "es existiert keine aktive Verknuepfung");
  let p = await punkte(page);
  ok(p.length === 1 && !p[0].measure_source, "das blosse Anzeigen erzeugt keine Massnahme");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  p = await punkte(page);
  ok(p.length === 1 && !p.some((x) => x.measure_source), "auch nach Reload weiterhin nur vorgeschlagen");
  await noOverflow(page, "Stack-Ansicht");

  /* ---------------- B. Massnahme starten ------------------------------ */
  console.log("\n-- B. Massnahme starten --");
  const opts = await page.evaluate(() => Array.from(document.querySelectorAll("#mnSupp option")).map((o) => o.value));
  ok(opts.length > 0, "die Auswahl bietet reale Katalogeintraege (" + opts.length + ")");
  const ziel = opts.indexOf("magnesium") >= 0 ? "magnesium" : opts[0];
  await startMassnahme(page, ziel, 14, "Morgenenergie");
  p = await punkte(page);
  const m = p.filter((x) => x.measure_source)[0];
  ok(!!m, "der ausdrueckliche Start erzeugt die Verknuepfung");
  ok(m && m.optimization_point_id === "pt_1", "sie haengt am richtigen Optimierungspunkt");
  ok(m && m.measure_source === "stack" && m.measure_id === ziel, "mit stabiler Referenz: " + (m ? m.measure_source + ":" + m.measure_id : ""));
  ok(m && m.observation_days === 14 && m.review_date === ymd(plus(HEUTE, 14)), "Pruefungstermin korrekt: " + (m ? m.review_date : ""));
  ok(m && m.criterion_label === "Morgenenergie", "das Erfolgssignal ist festgelegt");
  ok(m && !m.evidence && !m.costMo && !m.why, "kein vollstaendiger Katalogeintrag wurde kopiert");
  let liste = await massnahmen(page);
  ok(liste.length === 1 && /In Beobachtung/.test(liste[0].status), "Status: In Beobachtung");
  ok(/Optimierungspunkt: Abendliche Regeneration/.test(liste[0].pt), "der Optimierungspunkt ist sichtbar");
  ok(/Erfolgssignal: Morgenenergie/.test(liste[0].meta), "das Erfolgssignal ist sichtbar");
  ok(/garantiert keinen bestimmten Wirkungseintritt/.test(liste[0].note), "der Zeitraum wird ehrlich eingeordnet");
  ok(!liste[0].due, "der Termin ist noch nicht faellig");

  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  p = await punkte(page);
  ok(p.filter((x) => x.measure_source).length === 1, "Reload erzeugt keine Duplikate");
  ok(p.filter((x) => x.measure_source)[0].review_date === m.review_date, "der Pruefungstermin bleibt korrekt");
  /* Die laufende Maßnahme verschwindet aus der Auswahl — der Doppelstart ist
     schon in der Oberfläche ausgeschlossen (die Duplikatregel selbst deckt
     die Unit-Suite ab, T13). */
  const nochWaehlbar = await page.evaluate(() => Array.from(document.querySelectorAll("#mnSupp option")).map((o) => o.value));
  ok(nochWaehlbar.indexOf(ziel) < 0, "die laufende Massnahme steht nicht erneut zur Auswahl — kein Doppelstart");
  ok((await punkte(page)).filter((x) => x.measure_source).length === 1, "es bleibt bei genau einer Verknuepfung");
  await noOverflow(page, "mit Massnahme");

  /* ---------------- C. Bestehender Stack ------------------------------ */
  console.log("\n-- C. Bestehender Basis-Stack --");
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_os_stack") || "null"));
  ok(st && st.items.length === 1 && st.items[0].id === "creatine", "der Basis-Stack ist unveraendert");
  ok(!st.items[0].measure_source && !st.items[0].review_date, "kein alter Stack-Eintrag traegt Pruefungsinformationen");
  p = await punkte(page);
  ok(!p.some((x) => x.measure_id === "creatine"), "kein alter Stack-Eintrag wurde rueckwirkend zugeordnet");

  /* ---------------- F. Mehrere Veraenderungen ------------------------- */
  console.log("\n-- F. Mehrere Veraenderungen --");
  const zweit = opts.filter((o) => o !== ziel)[0];
  if (zweit) {
    await startMassnahme(page, zweit, 14, "");
    liste = await massnahmen(page);
    ok(liste.length === 2, "beide Massnahmen bleiben getrennt sichtbar");
    ok(liste.some((x) => /schwerer eindeutig zuordnen/.test(x.text)), "der knappe Zuordnungshinweis erscheint");
    ok(!liste.some((x) => /wirkungslos|gescheitert/.test(x.text)), "kein falsches automatisches Ergebnis");
    p = await punkte(page);
    const refs = p.filter((x) => x.measure_source).map((x) => x.measure_id);
    ok(new Set(refs).size === refs.length && refs.length === 2, "beide Referenzen bleiben getrennt: " + refs.join(", "));
  }

  /* ---------------- D. Ergebnispruefung ------------------------------- */
  console.log("\n-- D. Ergebnispruefung --");
  /* Termin erreichen: Startdatum zurueckdatieren (nur im Test). */
  await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem("mm_opt_points") || "[]");
    /* Nur die erste Maßnahme fällig machen — Ablauf D bleibt eindeutig. */
    const erste = l.filter((x) => x.measure_source)[0];
    if (erste) {
      const d = new Date(); d.setDate(d.getDate() - 20);
      erste.measure_started_at = d.toISOString().slice(0, 10);
      const r = new Date(); r.setDate(r.getDate() - 6);
      erste.review_date = r.toISOString().slice(0, 10);
    }
    localStorage.setItem("mm_opt_points", JSON.stringify(l));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  liste = await massnahmen(page);
  ok(liste.some((x) => /Pruefung faellig|Prüfung fällig/.test(x.status)), "am Pruefungstermin wird die Massnahme faellig");
  ok(liste.some((x) => x.due), "und ist als faellig hervorgehoben");
  const felder = await page.evaluate(() => Array.from(document.querySelectorAll("[data-mnf]")).map((e) => e.getAttribute("data-mnf")));
  ["umsetzung", "wirkung", "alltag", "decision"].forEach((f) =>
    ok(felder.indexOf(f) >= 0, "die Ergebnispruefung erfasst " + f + " getrennt"));
  const wirkOpts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-mnf="wirkung"] option')).map((o) => o.textContent));
  ok(!wirkOpts.some((t) => /bewiesen|garantiert|verursacht/i.test(t)), "keine Kausalitaets- oder Beweisformulierung: " + wirkOpts.join(" | "));

  const erstesId = await page.evaluate(() => (document.querySelector("[data-mnsave]") || {}).getAttribute("data-mnsave"));
  await page.selectOption('[data-mnf="umsetzung"][data-id="' + erstesId + '"]', "regelmaessig");
  await page.selectOption('[data-mnf="wirkung"][data-id="' + erstesId + '"]', "erkennbar");
  await page.selectOption('[data-mnf="alltag"][data-id="' + erstesId + '"]', "gut");
  await page.selectOption('[data-mnf="decision"][data-id="' + erstesId + '"]', "beibehalten");
  await page.evaluate((i) => document.querySelector('[data-mnsave="' + i + '"]').click(), erstesId);
  await page.waitForTimeout(800);
  p = await punkte(page);
  const fertig = p.filter((x) => x.id === erstesId)[0];
  ok(fertig && fertig.umsetzung_result === "regelmaessig" && fertig.result_summary === "erkennbar" && fertig.usability_result === "gut",
    "Umsetzung, Wirkung und Alltagstauglichkeit sind getrennt gespeichert");
  ok(fertig && fertig.measure_decision === "beibehalten", "die Entscheidung ist gespeichert");
  ok(!fertig.standard, "kein automatischer persoenlicher Standard");
  await noOverflow(page, "Ergebnispruefung");

  /* ---------------- E. Persoenlicher Standard ------------------------- */
  console.log("\n-- E. Persoenlicher Standard --");
  const stdBtn = await page.evaluate(() => !!document.querySelector("[data-mnstd]"));
  ok(stdBtn, "die Empfehlung zur dauerhaften Uebernahme erscheint");
  p = await punkte(page);
  ok(!p.some((x) => x.standard && x.standard.bestaetigt), "ohne Bestaetigung entsteht kein Standard");
  await page.evaluate(() => document.querySelector("[data-mnstd]").click());
  await page.waitForTimeout(800);
  p = await punkte(page);
  const std = p.filter((x) => x.standard && x.standard.bestaetigt)[0];
  ok(!!std, "die ausdrueckliche Uebernahme erzeugt den Standard");
  ok(std && std.standard.was && std.standard.bereich, "in der kanonischen Struktur aus Paket 3");
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  ok((await punkte(page)).some((x) => x.standard && x.standard.bestaetigt), "nach Reload bleibt der Standard erhalten");

  /* ---------------- G. Warnhinweis ------------------------------------ */
  console.log("\n-- G. Warn- und Zugriffsfall --");
  await seed(page, { opt_points: [PUNKT], os_stack: STACK });
  const zinkDa = await page.evaluate(() => Array.from(document.querySelectorAll("#mnSupp option")).some((o) => o.value === "zinc"));
  if (zinkDa) {
    await startMassnahme(page, "zinc", 14, "");
    liste = await massnahmen(page);
    const zk = liste.filter((x) => /Zink/.test(x.name))[0];
    ok(zk && /Kupferaufnahme/.test(zk.warn), "der bestehende Warntext bleibt woertlich erhalten");
    ok(zk && /Weitere Abkl/.test(zk.status), "und fuehrt zu „Weitere Abklaerung“ statt stiller Aktivierung");
  } else {
    ok(true, "Zink steht in dieser Budgetstufe nicht zur Auswahl (Katalogkontext)");
  }
  const gesperrt = await page.evaluate(() => /protoVault|protoGate/.test(document.body.innerHTML));
  ok(!gesperrt, "die Massnahmenflaeche legt keine geschuetzten Inhalte offen");
  const ent = await page.evaluate(() => localStorage.getItem("mm_account_entitlements"));
  ok(ent === null, "Entitlements wurden nicht veraendert");

  /* ---------------- H. Historie --------------------------------------- */
  console.log("\n-- H. Historie --");
  await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem("mm_opt_points") || "[]");
    l.forEach((x) => {
      if (!x.measure_source) return;
      x.umsetzung_result = "regelmaessig"; x.result_summary = "teilweise";
      x.usability_result = "gut"; x.measure_decision = "beibehalten";
      x.status = "abgeschlossen"; x.measure_warning = "";
    });
    localStorage.setItem("mm_opt_points", JSON.stringify(l));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  const hist = await page.evaluate(() => {
    const h = document.querySelector(".os-mnhist");
    return h ? h.innerText : "";
  });
  ok(/ABGESCHLOSSENE/.test(hist), "die abgeschlossene Pruefung erscheint in der Historie");
  ok(/teilweise Verbesserung|Wirkung/.test(hist), "mit ihrem Ergebnis");
  ok(/beibehalten/.test(hist), "und ihrer Entscheidung");
  /* Katalogtitel zur Laufzeit aendern — die Historie bleibt lesbar. */
  const vorher = hist;
  await page.evaluate(() => { (window.MM.engines.SUPPS || []).forEach((s) => { s.name = "GEAENDERT " + s.id; }); });
  await page.evaluate(() => { location.hash = "#today"; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = "#plan"; });
  await page.waitForTimeout(900);
  const nachher = await page.evaluate(() => { const h = document.querySelector(".os-mnhist"); return h ? h.innerText : ""; });
  ok(nachher === vorher, "nach Aenderung der Katalogtitel bleibt die Historie unveraendert lesbar");
  ok(!/GEAENDERT/.test(nachher), "sie zeigt den eingefrorenen Anzeigenamen");
  /* Messdaten nachtraeglich aendern — die Bilanz bleibt eingefroren. */
  const bilanzVor = await punkte(page);
  await page.evaluate(() => {
    localStorage.setItem("mm_os_metrics", JSON.stringify([{ type: "weight", value: 99, date: "2026-01-01", unit: "kg", source: "manual" }]));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  const bilanzNach = await punkte(page);
  ok(JSON.stringify(bilanzNach.map((x) => [x.id, x.result_summary, x.measure_decision])) ===
     JSON.stringify(bilanzVor.map((x) => [x.id, x.result_summary, x.measure_decision])),
    "spaetere Messwertaenderungen veraendern die abgeschlossene Bilanz nicht");
  await noOverflow(page, "Historie");

  /* ---------------- Querschnitt --------------------------------------- */
  console.log("\n-- Querschnitt --");
  await seed(page, { opt_points: [PUNKT], os_stack: STACK });
  const abgeschnitten = await page.evaluate(() => {
    const sec = Array.from(document.querySelectorAll(".os-sec")).filter((s) => /Maßnahmen/.test(s.textContent))[0];
    if (!sec) return -1;
    return Array.from(sec.querySelectorAll("button, select, label, p")).filter((e) => e.scrollWidth - e.clientWidth > 1).length;
  });
  ok(abgeschnitten === 0, "keine abgeschnittenen Schaltflaechen oder Labels (" + abgeschnitten + ")");
  await page.focus("#mnSupp");
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === "mnSupp"), "die Auswahl ist per Tastatur erreichbar");
  const klein = await page.evaluate(() => {
    const sec = Array.from(document.querySelectorAll(".os-sec")).filter((s) => /Maßnahmen/.test(s.textContent))[0];
    if (!sec) return 99;
    return Math.min.apply(null, Array.from(sec.querySelectorAll("p, select, button")).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  });
  ok(klein >= 11, "keine unlesbar kleine Typografie (" + klein + "px)");
  const cr = await page.evaluate(() => localStorage.getItem("mm_check_result"));
  ok(cr === null, "keine automatische Score-Wiederholung und kein Score-Ergebnis angelegt");
  const fo = await page.evaluate(() => localStorage.getItem("mm_focus"));
  ok(fo === null, "kein Auftrag wurde automatisch gestartet");

  ok(errs.length === 0, "keine JavaScript-Fehler" + (errs.length ? ": " + errs.join(" | ") : ""));
  await browser.close();
}

(async () => {
  console.log("Heute: " + T0);
  await run(390);
  await run(1440);
  console.log("\n==============================");
  console.log(fail ? "FAILS: " + fail : "ALLE BROWSER-PRUEFUNGEN BESTANDEN");
  console.log("EXIT=" + (fail ? 1 : 0));
  process.exit(fail ? 1 : 0);
})();
