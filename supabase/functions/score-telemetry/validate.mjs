// ============================================================================
// MaleMetrix — Score-Telemetrie: serverseitige Validierung (Phase 12).
//
// BEWUSST ohne Deno-/Supabase-Imports: reine Logik, damit exakt dieselbe
// Funktion in der Edge Function (Deno) UND in den Node-Unit-Tests läuft
// (tools-dev/tests/score-telemetry.test.js).
//
// SICHERHEITSPRINZIP: Der Client ist nicht vertrauenswürdig. Auch wenn der
// Browser-Code bereits filtert, ist DIESE Stelle die verbindliche Grenze:
// Es wird eine ALLOWLIST angewandt. Alles, was nicht ausdrücklich erlaubt
// ist, fällt weg — inklusive jedes Freitextfelds. Dadurch kann eine Antwort
// aus dem Score strukturell nicht in der Datenbank landen, selbst wenn ein
// manipulierter oder fehlerhafter Client sie mitschickt.
// ============================================================================

export const MAX_EVENTS_PER_REQUEST = 40;
export const MAX_BODY_BYTES = 32 * 1024;

export const EVENT_NAMES = [
  "score_started",
  "score_resumed",
  "score_section_entered",
  "score_section_completed",
  "score_progress_checkpoint",
  "score_completed",
  "score_result_viewed",
  "score_result_feedback_submitted",
  "score_cta_clicked",
  "score_email_result_opened",
  "score_email_result_submitted",
];

export const ENUMS = {
  device_class: ["mobile", "tablet", "desktop"],
  route_length_bucket: ["common", "short_adaptive", "medium_adaptive", "long_adaptive"],
  result_mode: ["cut", "recomp", "build", "perform", "health_first"],
  assessment_confidence: ["high", "moderate", "limited"],
  completion_duration_bucket: ["lt3m", "3to6m", "6to10m", "gt10m"],
  feedback_rating: ["yes", "partial", "no"],
  primary_bottleneck_id: [
    "bodyComposition", "training", "movement", "sleep", "recovery", "nutrition",
    "metabolic", "cardiovascular", "hormonal", "energy", "dataQuality", "execution",
    "enhancedControl", "therapyControl", "recoveryStatus",
  ],
};

export const FEEDBACK_REASONS = [
  "bottleneck_wrong", "mode_wrong", "too_generic", "context_missing",
  "reasoning_unclear", "too_long", "other",
];

export const SCORE_VERSIONS = ["v2"];

// Abschnitts-IDs sind die Modul-IDs des Scores. Bewusst als feste Liste:
// ein unbekannter Wert deutet auf einen manipulierten Client hin und wird
// verworfen, statt eine neue Kategorie in der Datenbank anzulegen.
export const SECTION_IDS = [
  "goal", "basics", "body", "status", "ctx_natural", "ctx_former", "ctx_trt",
  "ctx_enhanced", "ctx_glp1", "strength", "movement", "fuel", "recovery",
  "blood", "cardiometabolic", "labs", "drive", "execution", "safety", "qualify",
];

const isHexId = (v, min, max) =>
  typeof v === "string" && v.length >= min && v.length <= max && /^[a-f0-9]+$/i.test(v);

const intIn = (v, lo, hi) => {
  if (typeof v === "boolean") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < lo || n > hi) return undefined;
  return n;
};

const oneOf = (v, list) => (typeof v === "string" && list.includes(v) ? v : undefined);

const reasonCodes = (v) => {
  if (!Array.isArray(v)) return undefined;
  const out = [];
  for (const x of v) {
    if (typeof x === "string" && FEEDBACK_REASONS.includes(x) && !out.includes(x)) out.push(x);
  }
  return out.length ? out.slice(0, FEEDBACK_REASONS.length) : undefined;
};

// Allowlist: Spaltenname → Validator. Es gibt hier absichtlich KEIN Feld,
// das freien Text, Antworten, Laborwerte, Substanzen, Symptome, den
// Natural/TRT/Enhanced-Status, Namen oder E-Mail-Adressen aufnehmen könnte.
const FIELDS = {
  section_id: (v) => oneOf(v, SECTION_IDS),
  question_index: (v) => intIn(v, 0, 200),
  visible_question_count: (v) => intIn(v, 0, 200),
  completion_percentage: (v) => intIn(v, 0, 100),
  elapsed_seconds: (v) => intIn(v, 0, 7200),
  device_class: (v) => oneOf(v, ENUMS.device_class),
  route_length_bucket: (v) => oneOf(v, ENUMS.route_length_bucket),
  result_mode: (v) => oneOf(v, ENUMS.result_mode),
  primary_bottleneck_id: (v) => oneOf(v, ENUMS.primary_bottleneck_id),
  assessment_confidence: (v) => oneOf(v, ENUMS.assessment_confidence),
  completion_duration_bucket: (v) => oneOf(v, ENUMS.completion_duration_bucket),
  data_gap_count: (v) => intIn(v, 0, 40),
  feedback_rating: (v) => oneOf(v, ENUMS.feedback_rating),
  feedback_reason_codes: reasonCodes,
  cta_id: (v) =>
    typeof v === "string" && v.length > 0 && v.length <= 40 && /^[a-z0-9_]+$/i.test(v)
      ? v
      : undefined,
};

export const ALLOWED_FIELDS = Object.keys(FIELDS);

// Zeitstempel des Clients wird übernommen, aber nur in einem plausiblen
// Fenster (±7 Tage). Alles andere fällt auf die Serverzeit zurück — ein
// gefälschter Client soll die Auswertung nicht verschieben können.
function clientTimestamp(v, nowMs) {
  if (typeof v !== "string" || v.length > 40) return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;
  const week = 7 * 24 * 3600 * 1000;
  if (t > nowMs + 3600 * 1000 || t < nowMs - week) return null;
  return new Date(t).toISOString();
}

/**
 * Validiert EIN Event. Rückgabe: sauberes Objekt (nur Allowlist-Felder)
 * oder null, wenn das Event verworfen wird.
 */
export function validateEvent(raw, nowMs = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const name = oneOf(raw.event_name, EVENT_NAMES);
  if (!name) return null;
  if (!isHexId(raw.event_id, 8, 64)) return null;
  if (!isHexId(raw.score_session_id, 8, 64)) return null;
  const version = oneOf(raw.score_version, SCORE_VERSIONS);
  if (!version) return null;

  const out = {
    event_id: String(raw.event_id).toLowerCase(),
    score_session_id: String(raw.score_session_id).toLowerCase(),
    event_name: name,
    score_version: version,
    client_ts: clientTimestamp(raw.client_ts, nowMs),
  };

  for (const key of ALLOWED_FIELDS) {
    if (!(key in raw)) continue;
    const clean = FIELDS[key](raw[key]);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

/**
 * Validiert einen ganzen Request-Body.
 * Rückgabe: { events: [...], rejected: n } oder { error: "code" }.
 */
export function validateBatch(body, nowMs = Date.now()) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "bad_body" };
  const list = body.events;
  if (!Array.isArray(list) || list.length === 0) return { error: "no_events" };
  if (list.length > MAX_EVENTS_PER_REQUEST) return { error: "too_many_events" };

  const events = [];
  const seen = new Set();
  let rejected = 0;
  for (const raw of list) {
    const ev = validateEvent(raw, nowMs);
    if (!ev) { rejected++; continue; }
    if (seen.has(ev.event_id)) { rejected++; continue; }   // Dedup im Batch
    seen.add(ev.event_id);
    events.push(ev);
  }
  if (!events.length) return { error: "no_valid_events" };
  return { events, rejected };
}
