/* ==========================================================================
   MaleMetrix Phase 6 — Invarianten-Tests für die Execution-Schicht.
   Node-Harness mit Fake-Browser-Umgebung (kein Build-System nötig):
     node tools-dev/test-execution.mjs
   Testet INVARIANTEN, nicht Trivialitäten:
     A  Eine erledigte Session = EIN Abschluss (c2_daily.dN.p), keine Kopie.
     B  Reparatur/Reschedule schreibt NIE die Vergangenheit um.
     C  Reminder feuern nie für Erledigtes; Dedup; Quiet Hours; Eskalation 1×.
     D  Kompression erhält die Stimulus-Hierarchie (Compounds bleiben).
     E  Kalender/ICS enthält NUR echte Termine (keine Ruhetag-Events).
     F  Kontext-Overlays laufen ab und sind reversibel.
     G  Tages-Snapshots: Vergangenheit unveränderlich.
     H  Decision Ledger: fällige Reviews erscheinen, geschlossene verschwinden.
     I  dayType-Spiegel entspricht dem course.js-Muster (Fixture).
   ========================================================================== */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- Fake-Browser ---------- */
const storeData = new Map();
const store = {
  get(k, d) { return storeData.has(k) ? JSON.parse(JSON.stringify(storeData.get(k))) : d; },
  set(k, v) { storeData.set(k, JSON.parse(JSON.stringify(v))); },
  remove(k) { storeData.delete(k); },
  clear() { storeData.clear(); }
};
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function addD(base, n) { const d = new Date(base.getTime()); d.setDate(d.getDate() + n); return d; }
const NOW = new Date();
const TODAY = ymd(NOW);

function parseYmdUTC(s) { const p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }

const fakeAccount = {
  getDashboardState() {
    const start = store.get("c2_start", ""); const g = store.get("c2_goal", "");
    let prog = { active: false };
    if (start && g) {
      const paused = store.get("c2_paused_days", 0) || 0;
      const ref = store.get("c2_pause_since", "") || TODAY;
      const notStarted = diffDays(start, TODAY) < 0;
      const pd = Math.max(1, Math.max(1, diffDays(start, ref) + 1) - paused);
      const clamped = Math.min(84, pd);
      const week = Math.min(12, Math.max(1, Math.ceil(clamped / 7)));
      prog = { active: true, notStarted, over: pd > 84, mode: g, bottleneck: store.get("c2_bottleneck", ""), day: clamped, week, phase: week <= 3 ? 1 : week <= 6 ? 2 : week <= 9 ? 3 : 4, paused: !!store.get("c2_pause_since", ""), consistency: 0, active_days: 0, nextReviewDays: null };
    }
    return { name: "", hasScore: false, score: null, mode: g || "", bottleneck: store.get("c2_bottleneck", "") || "", program: prog, sync: "local", access: { twelve_week: true, protocol: true, coaching: false, advanced_library: false } };
  },
  registerStateDomain() {}, snapshot() { return { state: "local" }; }, onChange() {}, whenReady() { return Promise.resolve(); }, getSyncStatus() { return "local"; }
};

const sandboxWindow = {
  MM: { store, account: fakeAccount, toast() {}, track() {} },
  addEventListener() {}
};
const ctx = {
  window: sandboxWindow,
  document: { dispatchEvent() {}, addEventListener() {}, getElementById() { return null; } },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: {},
  location: { hash: "", protocol: "https:" },
  console, Date, Math, JSON, Object, Array, String, Number, Promise, parseFloat, parseInt, isNaN, atob: (s) => Buffer.from(s, "base64").toString("binary"), setInterval() {}, setTimeout() {}
};
ctx.MM = sandboxWindow.MM;
ctx.globalThis = ctx;
vm.createContext(ctx);

for (const f of ["js/os/program-view.js", "js/os/os-core.js", "js/os/engines.js", "js/os/execution.js"]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
}
const MM = sandboxWindow.MM;
const X = MM.exec, E = MM.engines, OS = MM.os;

// Zweiter Kontext OHNE program-view: prüft den Fallback-Spiegel in execution.js
// auf Parität mit MM.programView (gleicher Store, gleiche Keys).
const sandboxWindow2 = { MM: { store, account: fakeAccount, toast() {}, track() {} }, addEventListener() {} };
const ctx2 = Object.assign({}, ctx, { window: sandboxWindow2, MM: sandboxWindow2.MM });
ctx2.globalThis = ctx2;
vm.createContext(ctx2);
for (const f of ["js/os/os-core.js", "js/os/engines.js", "js/os/execution.js"]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), ctx2, { filename: f + "#noPV" });
}
const X2 = sandboxWindow2.MM.exec;

/* ---------- Mini-Assert ---------- */
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.error("  ✗ FAIL: " + name); } }
function section(t) { console.log("\n== " + t + " =="); }

/* ---------- Fixture: Programm läuft seit 9 Tagen (heute = Tag 10, Woche 2) ----------
   Kraft-Wochentage = Start-Wochentag +0, +2, +4 → Programmtag-Positionen 1/3/5.
   Heute (Tag 10, Position 2 = Index 2 im Wochenmuster) ist ein Krafttag. */
function setupProgram() {
  store.clear();
  const start = addD(NOW, -9);
  const startWd = start.getDay();
  store.set("c2_start", ymd(start));
  store.set("c2_goal", "recomp");
  store.set("c2_bottleneck", "body");
  store.set("c2_days", [startWd, (startWd + 2) % 7, (startWd + 4) % 7].sort((a, b) => a - b));
  store.set("c2_pulse", { 1: { done: true } });   // Woche-1-Pulse erledigt — sonst überstimmt er (korrekt, §57) das Training als NBA
  store.set("os_nutrition_plan", { kcal: 2600, kcalRange: [2450, 2750], protein: 180, fat: 78, carbs: 280 });
  const plan = E.buildTrainingPlan({ daysPerWeek: 3, minutes: 60, location: "gym", priority: "balanced", experience: "novice" });
  store.set("os_training_plan", plan);
}

/* ================= I — dayType-Spiegel ================= */
section("I · dayType-Spiegel (course.js-Muster)");
setupProgram();
ok(X.dayTypeAt(1) === "strength" && X.dayTypeAt(3) === "strength" && X.dayTypeAt(5) === "strength", "Krafttage liegen auf Programmtag 1/3/5");
ok(X.dayTypeAt(2) !== "strength" && X.dayTypeAt(4) !== "strength", "Zwischentage sind keine Krafttage");
ok(X.dayTypeAt(10) === "strength", "Heute (Tag 10) ist Krafttag");
ok(X.programDayForDate(TODAY) === 10, "programDayForDate(heute) = 10");
ok(X.dateForProgramDay(10) === TODAY, "dateForProgramDay(10) = heute");
{
  // PARITÄT: Fallback-Spiegel (execution.js ohne programView) ↔ MM.programView
  let drift = 0;
  for (let pd = 1; pd <= 84; pd++) { if (X.dayTypeAt(pd) !== X2.dayTypeAt(pd)) drift++; }
  ok(drift === 0, "Fallback-Spiegel ↔ programView: 0 Drift über 84 Tage");
}

/* ================= D — Kompression ================= */
section("D · Time Compression erhält Hierarchie");
{
  const plan = store.get("os_training_plan");
  const s = plan.sessions[0];
  const full = X.estimateSessionMin(s);
  const c30 = X.compressSession(s, 30);
  ok(c30.estMin <= 36, "30-min-Version ist ~30 min (ist: " + c30.estMin + ")");
  ok(c30.slots[0].ex === s.slots[0].ex && c30.slots[1].ex === s.slots[1].ex, "Die ersten zwei Slots (Compounds) bleiben IMMER");
  ok(c30.dropped.every(n => s.slots.slice(2).some(sl => sl.name === n)), "Gestrichen wird nur von hinten (Accessories)");
  const c15 = X.compressSession(s, 15);
  ok(c15.slots.length === 2 && c15.slots.every(sl => sl.sets === 2), "15-min-Version: 2 Slots à 2 Sätze");
  ok(full > c30.estMin && c30.estMin > c15.estMin, "Monotonie: voll > 30 > 15 (" + full + " > " + c30.estMin + " > " + c15.estMin + ")");
}

/* ================= Substitution ================= */
section("Substitution (Equivalence-Graph)");
{
  const plan = store.get("os_training_plan");
  const s = plan.sessions.find(x => x.slots.some(sl => sl.ex === "bench")) || plan.sessions[0];
  const sub = X.substituteSession(s, "home_none");
  ok(sub && sub.slots.length >= 2, "Bodyweight-Substitution liefert ausführbare Session");
  ok(!sub.slots.some(sl => (E.EXDB[sl.ex].equip.indexOf("home_none") < 0)), "Alle Slots sind mit dem Equipment machbar");
}

/* ================= A + B — Missed / Repair / One-Completion ================= */
section("A+B · Missed Workout, Week Repair, keine History-Rewrites");
{
  // Tag 8 (Krafttag, vor 2 Tagen) wurde verpasst; Tag 10 (heute) noch offen.
  const missed = X.missedThisWeek();
  ok(missed.length === 1 && missed[0].pd === 8, "Verpasste Einheit von Tag 8 erkannt");
  const opts = X.repairOptions(8);
  ok(opts.length > 0, "Repair-Optionen vorhanden (" + opts.length + ")");
  ok(opts.every(o => X.dayTypeAt(X.programDayForDate(o.date)) !== "strength"), "Nachholen nie auf geplantem Krafttag");
  const swapBefore = JSON.stringify(store.get("c2_dayswap", {}));
  const dailyBefore = JSON.stringify(store.get("c2_daily", {}));
  const r = X.applyReschedule(8, opts[0].date, "test");
  ok(JSON.stringify(store.get("c2_dayswap", {})) === swapBefore, "c2_dayswap unverändert — Vergangenheit nicht umgeschrieben");
  ok(JSON.stringify(store.get("c2_daily", {})) === dailyBefore, "c2_daily unverändert durch Reschedule");
  ok(X.makeupForDate(opts[0].date) !== null, "Makeup erscheint am Zieltag");
  X.completeMakeup(r.id);
  const daily = store.get("c2_daily", {});
  ok(!(daily.d8 && daily.d8.p), "Tag 8 bleibt ehrlich verpasst (kein p-Flag)");
  ok(daily["d" + r.toPd] && daily["d" + r.toPd].p === true, "Zieltag hat GENAU EINEN Abschluss (p=true)");
  ok(X.makeupForDate(opts[0].date) === null && X.makeupForDate(opts[0].date, true).done === true, "Makeup als erledigt markiert, nicht dupliziert");
}

/* ================= buildDay / NBA ================= */
section("NBA 2.0 · buildDay");
{
  const day = X.buildDay(TODAY);
  ok(day.actions.some(a => a.type === "workout" && a.id === "train:d10"), "Heutige Session ist als Aktion da");
  ok(day.nba.primary && (day.nba.primary.type === "workout"), "NBA-Primary = heutige Session (Training schlägt Rest)");
  ok(day.nba.secondary.length <= 2, "Max. zwei sekundäre Aktionen (Attention Budget)");
  ok(day.nba.why.length > 0, "NBA hat ein WARUM");
  OS.completeProgramDay(10);
  const day2 = X.buildDay(TODAY);
  const tAct = day2.actions.find(a => a.id === "train:d10");
  ok(tAct && tAct.done === true, "Ein Abschluss aktualisiert die Today-Aktion (One Completion)");
  ok(!day2.nba.primary || day2.nba.primary.type !== "workout", "Erledigte Session ist nie wieder NBA");
  // §57 (Phase 3.1 ∩ Phase 6): überfälliger Weekly Pulse überstimmt Training
  store.set("c2_pulse", {});
  const day3 = X.buildDay(TODAY);
  ok(day3.nba.primary && day3.nba.primary.type === "pulse_due", "Überfälliger Pulse überstimmt alles als NBA (§57)");
  store.set("c2_pulse", { 1: { done: true } });
}

/* ================= C — Reminder Engine ================= */
section("C · Reminder: Wert-Filter, Dedup, Quiet Hours, nie für Erledigtes");
{
  // Frisches Programm, Session heute offen, Erinnerungen an.
  setupProgram();
  X.setReminderPrefs({ enabled: true, quietFrom: "23:00", quietTo: "05:00", maxPerDay: 3, leadMin: 30 });
  const r1 = X.eligibleReminders("17:35");   // 25 min vor 18:00
  ok(r1.length >= 1 && r1[0].stage === "lead", "Heads-up im Lead-Fenster (17:35 für 18:00)");
  ok(r1[0].body.indexOf("min") >= 0, "Notification enthält Kontext, nicht nur 'Reminder'");
  // Dedup: als gesendet markieren (tick ohne Notification-API)
  storeMark(r1[0].dedupKey);
  ok(X.eligibleReminders("17:36").every(r => r.dedupKey !== r1[0].dedupKey), "Dedup: gleiche Erinnerung feuert nie zweimal");
  // Quiet hours
  X.setReminderPrefs({ quietFrom: "17:00", quietTo: "19:00" });
  ok(X.eligibleReminders("17:40").length === 0, "Quiet Hours unterdrücken alles");
  X.setReminderPrefs({ quietFrom: "23:00", quietTo: "05:00" });
  // Eskalation genau einmal
  const esc1 = X.eligibleReminders("19:45").filter(r => r.stage === "escalation");
  ok(esc1.length === 1, "Eskalation 90+ min danach: genau EINE Nachfrage");
  storeMark(esc1[0].dedupKey);
  ok(X.eligibleReminders("19:50").filter(r => r.stage === "escalation").length === 0, "Danach: Stille (kein Nagging)");
  ok(X.eligibleReminders("23:59").length === 0, "Spätfenster (4 h danach) erinnert nicht mehr");
  // Erledigt → nie erinnern
  OS.completeProgramDay(10);
  const st = store.get("os_reminder_state", {}); store.set("os_reminder_state", {}); // Dedup-State löschen
  ok(X.eligibleReminders("17:35").filter(r => r.actionId === "train:d10").length === 0, "INVARIANTE: Notification feuert NIE für erledigte Aktion");
  function storeMark(key) { const s = store.get("os_reminder_state", {}); const d = s[TODAY] || {}; d[key] = { sentAt: "x" }; s[TODAY] = d; store.set("os_reminder_state", s); }
  // Privacy
  const txt = X.notificationText({ title: "Bench heute", body: "80×10" }, "discreet");
  ok(txt.title === "MaleMetrix" && txt.body.indexOf("80") < 0, "DISCREET: kein Inhalt auf dem Sperrbildschirm");
  ok(X.notificationText({ title: "t", body: "b" }, "off") === null, "OFF: keine System-Notification");
}

/* ================= E — Kalender / ICS ================= */
section("E · Kalender ehrlich: nur echte Termine");
{
  setupProgram();
  const evs = X.calendarEvents(7);
  const trainEvs = evs.filter(e => e.domain === "training");
  const expectTrain = [];
  for (let i = 0; i < 7; i++) {
    const d = ymd(addD(NOW, i)); const pd = X.programDayForDate(d);
    if (pd != null && X.dayTypeAt(pd) === "strength") expectTrain.push(pd);
  }
  ok(trainEvs.length === expectTrain.length, "Trainings-Events = geplante Krafttage (" + trainEvs.length + "), NICHT jeder Tag");
  const ics = X.icsCalendar(7);
  ok(ics && ics.indexOf("DTEND") >= 0, "ICS hat DTEND (echte Dauer)");
  ok((ics.match(/BEGIN:VEVENT/g) || []).length === evs.filter(e => e.status !== "done").length, "ICS enthält exakt die offenen Events");
  ok(ics.indexOf("Z\r\n") < 0, "Floating local time (DST-/Reise-sicher, kein UTC-Z)");
}

/* ================= F — Overlays ================= */
section("F · Kontext-Overlays: Ablauf + Reversibilität");
{
  setupProgram();
  const o = X.startOverlay({ mode: "travel", start: TODAY, end: ymd(addD(NOW, 2)), mods: { location: "hotel_gym", minutes: 40 } });
  ok(X.activeOverlay(TODAY) && X.activeOverlay(TODAY).id === o.id, "Overlay aktiv heute");
  ok(X.activeOverlay(ymd(addD(NOW, 3))) === null, "Overlay läuft automatisch ab (Tag +3 frei)");
  const s = X.sessionForDay(TODAY);
  ok(s && (s.compressedTo === 40 || s.estMin <= 45), "Reise-Session ist komprimiert/übersetzt");
  X.endOverlay(o.id);
  ok(X.activeOverlay(TODAY) === null, "Beenden wirkt sofort — zurück zum Basisplan");
  const day = X.buildDay(TODAY);
  ok(!day.overlay, "buildDay sieht kein Overlay mehr");
}

/* ================= G — Tages-Snapshot unveränderlich ================= */
section("G · Evening Close: Vergangenheit unveränderlich");
{
  setupProgram();
  const old = { date: "2020-01-01", closedAt: "2020-01-01T21:00:00Z", verdict: "COMPLETE", training: "done" };
  store.set("os_daylog", { "2020-01-01": old });
  const snap = X.closeDay();
  ok(snap && snap.date === TODAY, "closeDay schreibt NUR heute");
  const log = store.get("os_daylog", {});
  ok(JSON.stringify(log["2020-01-01"]) === JSON.stringify(old), "Historischer Snapshot bleibt Byte-gleich");
  ok(X.isDayClosed(TODAY), "Heute ist geschlossen");
}

/* ================= H — Decision Ledger ================= */
section("H · Decision Ledger: Closed Loop");
{
  setupProgram();
  const dec = X.addDecision({ domain: "nutrition", what: "Kalorien +150", why: "Gewichtstrend zu schnell", reviewInDays: 0 });
  ok(X.dueDecisions().length === 1, "Review sofort fällig (reviewInDays=0)");
  const day = X.buildDay(TODAY);
  ok(day.actions.some(a => a.type === "decision_review"), "Fälliges Review erscheint als Today-Aktion");
  X.closeDecision(dec.id, "kept", "");
  ok(X.dueDecisions().length === 0, "Geschlossene Entscheidung verschwindet");
  ok(X.decisions().find(d => d.id === dec.id).status === "kept", "Outcome im Ledger dokumentiert");
}

/* ================= Nutrition Execution ================= */
section("Nutrition · Rest des Tages + Eat Now");
{
  setupProgram();
  X.logFood(45, 550, "Mittag");
  const rem = X.remaining(TODAY);
  ok(rem.protein === 135 && rem.kcal === 2050, "Remaining korrekt (135 g / 2050 kcal)");
  const en = X.eatNow({ where: "home" });
  ok(en.options.length === 3, "Genau 3 Optionen");
  const enR = X.eatNow({ where: "restaurant" });
  ok(enR.strategy === true && enR.options.length === 3, "Restaurant: Strategie statt Fake-Makros");
}

/* ================= Comeback ================= */
section("Comeback · Willkommen zurück statt Schuld");
{
  setupProgram();
  ok(X.comebackState() === null || X.absenceDays() < 7, "Kein Comeback-Screen bei aktiver Nutzung");
}

console.log("\n==============================");
console.log("PASS: " + pass + "  FAIL: " + fail);
if (fail) process.exit(1);
