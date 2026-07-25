#!/usr/bin/env node
// ============================================================================
// MaleMetrix — Score-Kalibrierungsbericht (intern, Phase 12)
//
// Beantwortet genau die Fragen, die für die Kalibrierung zählen:
//   Starts · Abschlüsse · Abschlussquote · Median-Dauer · Abbruch je Abschnitt
//   · durchschnittliche Fragenzahl · Abschluss nach Routenlänge
//   · Ergebnis-Feedback (ja/teilweise/nein) · häufigste Feedback-Gründe
//   · CTA-Verteilung · Score-Version
//
// SICHERHEIT — bewusst KEINE neue öffentliche Route:
//   · Läuft lokal/serverseitig, nie im Browser.
//   · Braucht den SERVICE-ROLE-KEY. Der steht NICHT im Repo und wird NICHT
//     als Argument übergeben (Shell-History), sondern nur als Umgebungsvariable.
//   · Die Tabelle score_events hat RLS ohne Policy — ohne Service Role
//     bekommt niemand Zeilen zu sehen, auch nicht eingeloggte Nutzer.
//
// Aufruf:
//   SUPABASE_URL=https://<projekt>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
//   node tools-dev/score-calibration.mjs [--days 30] [--json]
//
// Ohne Umgebungsvariablen erklärt das Skript nur, was es täte (Trockenlauf) —
// es rät nichts und erfindet keine Zahlen.
// ============================================================================
"use strict";

const args = process.argv.slice(2);
const DAYS = (() => {
  const i = args.indexOf("--days");
  const n = i >= 0 ? parseInt(args[i + 1], 10) : 30;
  return Number.isFinite(n) && n > 0 && n <= 365 ? n : 30;
})();
const AS_JSON = args.includes("--json");

const URL_BASE = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || "";

/* -------------------------------------------------------------- Auswertung */

const SECTION_ORDER = [
  "goal", "basics", "body", "status", "ctx_natural", "ctx_former", "ctx_trt",
  "ctx_enhanced", "ctx_glp1", "strength", "movement", "fuel", "recovery",
  "blood", "cardiometabolic", "labs", "drive", "execution", "safety", "qualify",
];

function median(list) {
  if (!list.length) return null;
  const s = list.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * Reine Funktion: Events → Kennzahlen. Dadurch in Tests prüfbar,
 * ohne Netzwerk und ohne Datenbank.
 */
export function buildReport(events) {
  const bySession = new Map();
  const counts = {};
  const sectionEntered = {};
  const sectionCompleted = {};
  const ctas = {};
  const feedback = { yes: 0, partial: 0, no: 0 };
  const reasons = {};
  const routes = {};
  const versions = {};
  const durations = [];
  const questionCounts = [];

  for (const e of events) {
    counts[e.event_name] = (counts[e.event_name] || 0) + 1;
    if (e.score_version) versions[e.score_version] = (versions[e.score_version] || 0) + 1;
    if (!bySession.has(e.score_session_id)) bySession.set(e.score_session_id, {});
    const s = bySession.get(e.score_session_id);

    switch (e.event_name) {
      case "score_started":
        s.started = true;
        break;
      case "score_section_entered":
        if (e.section_id) sectionEntered[e.section_id] = (sectionEntered[e.section_id] || 0) + 1;
        s.lastSection = e.section_id || s.lastSection;
        break;
      case "score_section_completed":
        if (e.section_id) sectionCompleted[e.section_id] = (sectionCompleted[e.section_id] || 0) + 1;
        break;
      case "score_completed":
        s.completed = true;
        if (Number.isFinite(e.elapsed_seconds)) durations.push(e.elapsed_seconds);
        if (Number.isFinite(e.visible_question_count)) questionCounts.push(e.visible_question_count);
        if (e.route_length_bucket) {
          routes[e.route_length_bucket] = routes[e.route_length_bucket] || { started: 0, completed: 0 };
          routes[e.route_length_bucket].completed++;
        }
        break;
      case "score_result_feedback_submitted":
        if (e.feedback_rating && feedback[e.feedback_rating] !== undefined) feedback[e.feedback_rating]++;
        (e.feedback_reason_codes || []).forEach((c) => { reasons[c] = (reasons[c] || 0) + 1; });
        break;
      case "score_cta_clicked":
        if (e.cta_id) ctas[e.cta_id] = (ctas[e.cta_id] || 0) + 1;
        break;
      default:
        break;
    }
    if (e.route_length_bucket && e.event_name === "score_started") {
      routes[e.route_length_bucket] = routes[e.route_length_bucket] || { started: 0, completed: 0 };
      routes[e.route_length_bucket].started++;
    }
  }

  const sessions = [...bySession.values()];
  const started = sessions.filter((s) => s.started).length;
  const completed = sessions.filter((s) => s.completed).length;

  /* Abbruch: letzter betretener Abschnitt einer Sitzung OHNE Abschluss.
     Bewusst als Schätzung benannt — ein geschlossener Tab meldet sich nicht. */
  const dropoff = {};
  for (const s of sessions) {
    if (s.completed || !s.lastSection) continue;
    dropoff[s.lastSection] = (dropoff[s.lastSection] || 0) + 1;
  }

  const fbTotal = feedback.yes + feedback.partial + feedback.no;

  return {
    window_days: DAYS,
    events_total: events.length,
    sessions_total: sessions.length,
    score_started: started,
    score_completed: completed,
    completion_rate: started ? Math.round((completed / started) * 1000) / 10 : null,
    median_duration_seconds: median(durations),
    avg_visible_questions: questionCounts.length
      ? Math.round((questionCounts.reduce((a, b) => a + b, 0) / questionCounts.length) * 10) / 10
      : null,
    sections: SECTION_ORDER.filter((id) => sectionEntered[id] || dropoff[id]).map((id) => ({
      section_id: id,
      entered: sectionEntered[id] || 0,
      completed: sectionCompleted[id] || 0,
      inferred_dropoff: dropoff[id] || 0,
    })),
    route_length: routes,
    feedback: {
      total: fbTotal,
      yes: feedback.yes,
      partial: feedback.partial,
      no: feedback.no,
      accuracy_rate: fbTotal ? Math.round((feedback.yes / fbTotal) * 1000) / 10 : null,
      top_reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 7),
    },
    cta_clicks: Object.entries(ctas).sort((a, b) => b[1] - a[1]).slice(0, 12),
    event_counts: counts,
    score_versions: versions,
  };
}

/* ------------------------------------------------------------------ Ausgabe */

function render(r) {
  const L = [];
  const pct = (v) => (v === null ? "—" : v + " %");
  L.push("==================================================");
  L.push("MALEMETRIX — SCORE-KALIBRIERUNG · letzte " + r.window_days + " Tage");
  L.push("==================================================");
  L.push("Events gesamt          " + r.events_total);
  L.push("Score-Versuche         " + r.sessions_total);
  L.push("Starts                 " + r.score_started);
  L.push("Abschlüsse             " + r.score_completed);
  L.push("Abschlussquote         " + pct(r.completion_rate));
  L.push("Median-Dauer           " + (r.median_duration_seconds === null ? "—" :
    Math.floor(r.median_duration_seconds / 60) + ":" + String(r.median_duration_seconds % 60).padStart(2, "0") + " min"));
  L.push("Ø sichtbare Fragen     " + (r.avg_visible_questions ?? "—"));
  L.push("Score-Versionen        " + JSON.stringify(r.score_versions));
  L.push("");
  L.push("ABSCHNITTE (betreten / abgeschlossen / geschätzter Abbruch)");
  r.sections.forEach((s) => {
    L.push("  " + s.section_id.padEnd(18) + String(s.entered).padStart(6) +
      String(s.completed).padStart(8) + String(s.inferred_dropoff).padStart(9));
  });
  L.push("");
  L.push("ROUTENLÄNGE");
  Object.entries(r.route_length).forEach(([k, v]) => {
    const rate = v.started ? Math.round((v.completed / v.started) * 100) + " %" : "—";
    L.push("  " + k.padEnd(18) + "Start " + String(v.started).padStart(5) +
      "  Abschluss " + String(v.completed).padStart(5) + "  " + rate);
  });
  L.push("");
  L.push("ERGEBNIS-FEEDBACK");
  L.push("  Antworten            " + r.feedback.total);
  L.push("  JA / TEILWEISE / NEIN  " + r.feedback.yes + " / " + r.feedback.partial + " / " + r.feedback.no);
  L.push("  Trefferquote (JA)    " + pct(r.feedback.accuracy_rate));
  if (r.feedback.top_reasons.length) {
    L.push("  Häufigste Gründe:");
    r.feedback.top_reasons.forEach(([k, v]) => L.push("    " + k.padEnd(20) + v));
  }
  L.push("");
  L.push("CTA-KLICKS");
  if (!r.cta_clicks.length) L.push("  (keine)");
  r.cta_clicks.forEach(([k, v]) => L.push("  " + k.padEnd(24) + v));
  return L.join("\n");
}

/* -------------------------------------------------------------------- Main */

async function main() {
  if (!URL_BASE || !KEY) {
    console.log([
      "TROCKENLAUF — keine Zugangsdaten gesetzt, es wurden keine Daten gelesen.",
      "",
      "Aufruf mit echten Daten:",
      "  SUPABASE_URL=https://<projekt>.supabase.co \\",
      "  SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \\",
      "  node tools-dev/score-calibration.mjs --days 30",
      "",
      "Der Service-Role-Key steht bewusst NICHT im Repository. Er liegt in der",
      "Supabase-Projektverwaltung und gehört ausschließlich in die Umgebung",
      "des ausführenden Rechners — niemals in den Client, niemals in ein Commit.",
      "",
      "Voraussetzung: Migration 20260725000010_score_telemetry.sql eingespielt",
      "und Function `score-telemetry` deployt (siehe EDGE_FUNCTIONS.md).",
    ].join("\n"));
    process.exit(0);
  }

  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const url = URL_BASE.replace(/\/+$/, "") +
    "/rest/v1/score_events?select=*&received_at=gte." + encodeURIComponent(since) +
    "&order=received_at.asc&limit=100000";

  const res = await fetch(url, { headers: { apikey: KEY, authorization: "Bearer " + KEY } });
  if (!res.ok) {
    console.error("Abfrage fehlgeschlagen:", res.status, await res.text());
    process.exit(1);
  }
  const rows = await res.json();
  const report = buildReport(rows);
  console.log(AS_JSON ? JSON.stringify(report, null, 2) : render(report));
}

if (process.argv[1] && process.argv[1].endsWith("score-calibration.mjs")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
