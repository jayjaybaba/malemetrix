// ============================================================================
// ig-webhook — die Entscheidungslogik, getrennt vom Transport.
//
// Reines ESM ohne Deno-Globals: dieselbe Datei läuft in der Edge Function UND
// im Node-Test (tools-dev/tests/ig-funnel.test.js). Der Grund für die Trennung
// ist nicht Ästhetik: Die Frage „geht hier eine Nachricht raus?" entscheidet
// über Kontosperre und Abmahnung. Sie gehört an eine Stelle, die man ohne
// Webhook, ohne Datenbank und ohne Meta-Konto vollständig durchtesten kann.
//
// Leitsatz der ganzen Datei: SCHWEIGEN IST DIE VOREINSTELLUNG. Jede Prüfung
// unten kann nur verhindern, nie erlauben. Wer eine Bedingung entfernt, macht
// den Funnel nicht großzügiger — er macht ihn kaputt.
// ============================================================================

/** Instagram schneidet Direktnachrichten bei 1000 Zeichen ab. */
export const MAX_DM_CHARS = 1000;

/** Metas Private-Reply-Fenster. Danach lehnt die API ab (Fehler 10). */
export const MAX_COMMENT_WINDOW_DAYS = 7;

/** Wird an jede Nachricht angehängt. Rechtlich der Unterschied zwischen einer
 *  Antwort und einer Belästigung: der Empfänger muss in einem Wort widersprechen
 *  können, ohne suchen zu müssen. */
export const OPT_OUT_HINT = "Antworte STOPP, wenn du nichts mehr hören willst.";

/** Wörter, die einen Widerspruch auslösen. Bewusst großzügig und mehrsprachig —
 *  im Zweifel lieber einmal zu viel abgemeldet als einmal zu wenig. */
export const OPT_OUT_WORDS = [
  "stopp", "stop", "abmelden", "kein interesse", "keine werbung",
  "lass mich in ruhe", "unsubscribe", "spam", "nein danke",
];

/* ------------------------------------------------------------- Signatur ---- */

/** Konstantzeit-Vergleich. Ein `===` auf Hex-Strings verrät über die Laufzeit,
 *  wie viele Zeichen stimmen — damit lässt sich eine Signatur Zeichen für
 *  Zeichen erraten. */
export function timingSafeEqual(a, b) {
  const x = String(a || ""), y = String(b || "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA256 über den ROHEN Body — nicht über ein neu serialisiertes JSON.
 *  Ein `JSON.stringify(JSON.parse(body))` ändert Reihenfolge und Escaping und
 *  lässt jede gültige Signatur scheitern. */
export async function hmacSha256Hex(rawBody, secret, cryptoImpl) {
  const c = cryptoImpl || globalThis.crypto;
  const enc = new TextEncoder();
  const key = await c.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return toHex(await c.subtle.sign("HMAC", key, enc.encode(rawBody)));
}

/** Prüft den Header `x-hub-signature-256: sha256=<hex>`.
 *  Ohne Secret oder ohne Header: FALSE. Ein Webhook ohne Signaturprüfung ist
 *  ein offenes Formular, in das jeder beliebige „Kommentare" schreiben kann —
 *  und jeder eingeworfene Kommentar kostet eine echte Direktnachricht. */
export async function verifySignature(rawBody, headerValue, appSecret, cryptoImpl) {
  if (!appSecret || !headerValue) return false;
  const m = /^sha256=([a-f0-9]{64})$/i.exec(String(headerValue).trim());
  if (!m) return false;
  const expected = await hmacSha256Hex(rawBody, appSecret, cryptoImpl);
  return timingSafeEqual(expected.toLowerCase(), m[1].toLowerCase());
}

/* -------------------------------------------------------------- Parsing ---- */

function asArray(v) { return Array.isArray(v) ? v : []; }
function asText(v) { return typeof v === "string" ? v : ""; }

/** Nur numerische IDs akzeptieren. Meta liefert ausschließlich solche; alles
 *  andere wäre ein manipuliertes Payload und hat in einer DB-Abfrage nichts
 *  verloren. */
function asId(v) {
  const s = asText(v).trim();
  return /^[0-9]{1,32}$/.test(s) ? s : "";
}

/** Kommentar-Ereignisse aus dem Webhook holen. Alles, was nicht vollständig
 *  ist (keine Kommentar-ID, kein Absender), fliegt still raus — ein kaputtes
 *  Einzelereignis darf nie den ganzen Batch scheitern lassen, sonst wiederholt
 *  Meta ihn endlos.
 *
 *  Kommentar-IDs sind je nach Feldtyp numerisch oder alphanumerisch, deshalb
 *  hier ein eigenes, etwas weiteres Muster. */
export function parseComments(payload) {
  const out = [];
  if (!payload || payload.object !== "instagram") return out;
  for (const entry of asArray(payload.entry)) {
    for (const change of asArray(entry.changes)) {
      if (change.field !== "comments") continue;
      const v = change.value || {};
      const commentId = asText(v.id).trim();
      if (!/^[A-Za-z0-9_-]{5,64}$/.test(commentId)) continue;
      const from = v.from || {};
      const igsid = asId(from.id);
      if (!igsid) continue;
      const username = asText(from.username).trim();
      out.push({
        commentId,
        igsid,
        username: /^[A-Za-z0-9._]{1,30}$/.test(username) ? username : "",
        mediaId: asId((v.media || {}).id),
        text: asText(v.text).slice(0, 2000),
        // Metas Zeitstempel sind Sekunden. Fehlt er, gilt „jetzt" — das ist die
        // strengere Annahme nur beim Fenster, nie beim Deckel.
        createdAtMs: Number.isFinite(Number(entry.time)) ? Number(entry.time) * 1000 : null,
      });
    }
  }
  return out;
}

/** Eingehende Direktnachrichten (das 24-Stunden-Fenster). `is_echo` markiert
 *  unsere EIGENEN Nachrichten, die Meta zurückspiegelt — die dürfen niemals
 *  als Antwort des Leads gezählt werden, sonst gilt jeder Empfänger sofort
 *  als „hat geantwortet". */
export function parseInbound(payload) {
  const out = [];
  if (!payload || payload.object !== "instagram") return out;
  for (const entry of asArray(payload.entry)) {
    for (const ev of asArray(entry.messaging)) {
      const msg = ev.message || {};
      if (msg.is_echo === true) continue;
      const messageId = asText(msg.mid).trim();
      const igsid = asId((ev.sender || {}).id);
      if (!messageId || !igsid) continue;
      out.push({ messageId: messageId.slice(0, 200), igsid, text: asText(msg.text).slice(0, 2000) });
    }
  }
  return out;
}

/* ------------------------------------------------------------- Matching ---- */

/** Vergleichsform: klein, ohne Emoji/Satzzeichen, Mehrfach-Leerzeichen
 *  zusammengefasst. „PLAN!!! 🔥" und „plan" sollen dasselbe Stichwort treffen. */
export function normalizeText(s) {
  return asText(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOptOut(text) {
  const t = normalizeText(text);
  if (!t) return false;
  return OPT_OUT_WORDS.some((w) => t === w || t.split(" ").includes(w) || t.includes(w));
}

/** Passende Regel finden. Reihenfolge: niedrigste `priority` zuerst, bei
 *  Gleichstand das LÄNGERE Stichwort — sonst gewinnt „plan" gegen
 *  „plan für frauen" und die speziellere Regel wird nie erreicht.
 *  Die Default-Regel greift erst, wenn gar nichts passt. */
export function matchRule(commentText, rules) {
  const t = normalizeText(commentText);
  const active = asArray(rules).filter((r) => r && r.active !== false);
  const keyed = active.filter((r) => !r.is_default).sort((a, b) => {
    const p = (a.priority ?? 100) - (b.priority ?? 100);
    return p !== 0 ? p : String(b.keyword || "").length - String(a.keyword || "").length;
  });
  for (const r of keyed) {
    const k = normalizeText(r.keyword);
    if (!k) continue;
    if (r.match_mode === "exact" ? t === k : t.includes(k)) return r;
  }
  return active.find((r) => r.is_default) || null;
}

/** Platzhalter einsetzen und den Opt-out-Hinweis anhängen. Es gibt bewusst nur
 *  zwei Platzhalter: mehr Freiheit im Template heißt mehr Wege, versehentlich
 *  etwas Falsches an einen echten Menschen zu schicken. */
export function renderMessage(rule, vars) {
  const v = vars || {};
  let text = asText(rule && rule.message)
    .replace(/\{name\}/g, v.username ? "@" + v.username : "")
    .replace(/\{link\}/g, asText(rule && rule.link_url))
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const hint = OPT_OUT_HINT;
  if (!normalizeText(text).includes(normalizeText(hint))) {
    text = text + "\n\n" + hint;
  }
  // Lieber sauber am Wortende kürzen als mitten im Link abschneiden.
  if (text.length > MAX_DM_CHARS) {
    const cut = text.slice(0, MAX_DM_CHARS - 1);
    const lastSpace = cut.lastIndexOf(" ");
    text = (lastSpace > MAX_DM_CHARS * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
  }
  return text;
}

/* ---------------------------------------------------------- Entscheidung ---- */

export const DECISIONS = [
  "skipped_inactive", "skipped_own", "skipped_window", "skipped_optout",
  "skipped_no_rule", "skipped_cooldown", "skipped_cap", "send",
];

/**
 * Die eine Stelle, an der entschieden wird, ob eine Nachricht rausgeht.
 *
 * ctx = {
 *   active, isOwnComment, commentAgeDays, optedOut, rule,
 *   lastDmAtMs, nowMs, cooldownDays, sentToday, dailyCap
 * }
 *
 * Die REIHENFOLGE ist Absicht und kein Zufall:
 *   1. Not-Aus zuerst  — ein abgeschalteter Funnel prüft gar nichts anderes.
 *   2. Eigener Kommentar — sonst antwortet das System auf sich selbst und
 *      erzeugt eine Endlosschleife aus Webhook und Antwort.
 *   3. Zeitfenster — jenseits von 7 Tagen lehnt Meta ab; ein Versuch dort
 *      zählt trotzdem auf das API-Fehlerkonto.
 *   4. Widerspruch — steht VOR dem Regel-Matching, damit ein Opt-out auch
 *      dann greift, wenn jemand später ein Stichwort kommentiert.
 *   5. Regel, 6. Cooldown, 7. Tagesdeckel.
 */
export function decide(ctx) {
  const c = ctx || {};
  if (!c.active) return { action: "skipped_inactive" };
  if (c.isOwnComment) return { action: "skipped_own" };

  const window = Math.min(Number(c.commentWindowDays) || MAX_COMMENT_WINDOW_DAYS, MAX_COMMENT_WINDOW_DAYS);
  if (Number.isFinite(c.commentAgeDays) && c.commentAgeDays > window) {
    return { action: "skipped_window" };
  }
  if (c.optedOut) return { action: "skipped_optout" };
  if (!c.rule) return { action: "skipped_no_rule" };

  const cooldownDays = Number(c.cooldownDays);
  if (c.lastDmAtMs && Number.isFinite(cooldownDays) && cooldownDays > 0) {
    const elapsedDays = (Number(c.nowMs) - Number(c.lastDmAtMs)) / 86400000;
    if (elapsedDays < cooldownDays) return { action: "skipped_cooldown" };
  }

  const cap = Number(c.dailyCap);
  if (Number.isFinite(cap) && Number(c.sentToday) >= cap) return { action: "skipped_cap" };

  return { action: "send", rule: c.rule };
}
