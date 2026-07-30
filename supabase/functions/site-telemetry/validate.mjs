// ============================================================================
// site-telemetry — Allowlist-Validierung (reines ESM, auch in Node-Tests
// nutzbar). Leitgedanke wie bei score-telemetry/validate.mjs: Es gibt KEIN
// Freitextfeld. Jedes Feld muss ein enges Muster erfüllen, sonst fliegt das
// einzelne Ereignis raus. Ein manipulierter Client kann strukturell weder
// personenbezogene Daten noch Freitext in die Datenbank schreiben.
// ============================================================================

export const MAX_BODY_BYTES = 16 * 1024;   // ~16 KB reichen für 30 Ereignisse
export const MAX_BATCH = 30;

const RE_ID      = /^[a-f0-9]{8,64}$/;      // event_id, session_id (Hex)
const RE_EVENT   = /^[a-z0-9_]{3,48}$/;     // z. B. pageview, protokoll_add_to_cart
const RE_PAGE    = /^[a-z0-9_-]{1,48}$/;    // Seiten-Slug, nie ein Pfad
const RE_HOST     = /^[a-z0-9.-]{3,64}$/;   // Herkunfts-Host, nie Pfad/Query
const DEVICES    = new Set(["mobile", "tablet", "desktop"]);

function str(v) { return typeof v === "string" ? v : ""; }

/** Ein Ereignis prüfen. Rückgabe: sauberes Objekt oder null (wird verworfen). */
export function validateEvent(raw) {
  if (!raw || typeof raw !== "object") return null;

  const event_id   = str(raw.event_id).toLowerCase();
  const session_id = str(raw.session_id).toLowerCase();
  const event_name = str(raw.event_name).toLowerCase();
  if (!RE_ID.test(event_id) || !RE_ID.test(session_id) || !RE_EVENT.test(event_name)) return null;

  const page   = str(raw.page).toLowerCase();
  const host   = str(raw.ref_host).toLowerCase();
  const device = str(raw.device_class).toLowerCase();

  // client_ts nur übernehmen, wenn es ein plausibles ISO-Datum ist. Ein
  // manipulierter oder falsch gestellter Client verschiebt sonst die
  // Auswertung; received_at bleibt ohnehin die verlässliche Zeitachse.
  let client_ts = null;
  const ts = str(raw.client_ts);
  if (ts) {
    const t = Date.parse(ts);
    if (!Number.isNaN(t) && Math.abs(Date.now() - t) < 7 * 24 * 3600 * 1000) {
      client_ts = new Date(t).toISOString();
    }
  }

  return {
    event_id,
    session_id,
    event_name,
    page: RE_PAGE.test(page) ? page : null,
    ref_host: RE_HOST.test(host) ? host : null,
    device_class: DEVICES.has(device) ? device : null,
    client_ts,
  };
}

/** Batch prüfen. Ungültige Einzel-Ereignisse werden still verworfen — ein
 *  fehlerhaftes Ereignis darf nie den ganzen Beacon scheitern lassen. */
export function validateBatch(body) {
  const list = Array.isArray(body) ? body : (body && Array.isArray(body.events) ? body.events : null);
  if (!list) return { error: "bad_shape" };
  if (list.length > MAX_BATCH) return { error: "too_many_events" };
  const rows = [];
  for (const item of list) {
    const ok = validateEvent(item);
    if (ok) rows.push(ok);
  }
  return { rows };
}
