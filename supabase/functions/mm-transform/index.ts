// ============================================================================
// MaleMetrix — Edge Function `mm-transform`
// Körper-Transformation als Bild: Der Nutzer lädt ein Foto von sich hoch und
// bekommt eine fotorealistische Vorschau, wie er mit einem Zielgewicht
// aussehen würde. Provider: fal.ai (Bild-Editing-Modell). Der API-Key lebt
// NUR serverseitig — Function-Secret FAL_KEY oder Supabase-Vault
// (public.mm_get_fal_key, service_role-only) — nie im Repo/Client/Log.
//
// Sicherheit & Datenfluss:
// · Auth IM HANDLER (ES256, P0.6): Bearer → service.auth.getUser(jwt),
//   verify_jwt=false in config.toml. CORS-Allowlist (P0.7).
// · Rate-Limit pro Nutzer über ai_request_log (Bilder kosten echtes Geld).
// · Das Foto wird NICHT gespeichert: es geht als Data-URI durch diese
//   Function an fal.ai und wird dort nur zur Generierung verarbeitet.
//   In ai_request_log landen nur task/model/ok — nie Bilddaten.
// · Der Prompt wird SERVERSEITIG aus validierten Zahlen gebaut. Der Client
//   liefert keinen Freitext — es gibt nichts zu injizieren.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight, requireUser } from "../_shared/edge.mjs";
// Zielengine: EINE Quelle der Wahrheit für Grenzen, Schätzungen und
// Prompt-Bausteine — dieselbe Datei läuft im Browser und in den Node-Tests.
// Direkt manipulierte API-Aufrufe treffen hier auf dieselben Regeln wie die UI.
import { IDENTITY_FRAGMENT, SHAPES, targetLookFragment, validateTarget } from "../_shared/transform-goals.mjs";

// 12 Bilder/Stunde pro Nutzer = 6 komplette Läufe (2 Ziele je Lauf).
// Bewusst knapper als mm-ai (30/h): ein Bild kostet ~4 Cent statt Bruchteilen.
const RATE_LIMIT_PER_HOUR = 12;

// ---------------------------------------------------------------------------
// Missbrauchsschutz in Schichten (05.08.2026, v9). Das Stundenlimit allein
// schützt nicht: Magic Link = beliebig viele Wegwerf-Konten. Deshalb:
//
// 1. FREIKONTINGENT: Nicht-Kunden haben ein LIFETIME-Kontingent von
//    FREE_LIFETIME_IMAGES erfolgreichen Bildern (fehlgeschlagene zählen
//    nicht). Danach: Kauf (Protokoll/Coaching) statt weiterer Gratisbilder.
//    Kunden behalten das normale Stundenlimit.
// 2. IP-LIMIT: Wegwerf-Konten laufen meist über EINE Leitung. Pro IP
//    (SHA-256 mit serverseitigem Schlüssel — die rohe IP wird nie
//    gespeichert) gilt ein eigenes Stundenlimit über alle Konten hinweg.
// 3. TAGES-DECKEL: Globale Kosten-Notbremse über alle Nutzer. Bei ~4 Cent
//    pro Bild deckelt GLOBAL_DAILY_CAP den schlimmsten Tag auf ~16 €.
//
// BEWUSST KEINE Score-Pflicht mehr vor der Generierung (v9): Der Funnel ist
// Bild → Zielwahl → Score → Paket. Die Bilder sind der Haken und durch das
// 4-Bilder-Kontingent gedeckelt; der Score sitzt clientseitig vor dem
// maßgeschneiderten Paket (js/transformation.js, Paket-Gate).
// ---------------------------------------------------------------------------
const FREE_LIFETIME_IMAGES = 4;        // = 2 komplette Läufe à 2 Ziele
const IP_LIMIT_PER_HOUR = 24;          // über alle Konten einer IP
const GLOBAL_DAILY_CAP = 400;          // Bilder/24h gesamt, Notbremse

// "Kunde" = irgendein aktives Entitlement ODER die server-vergebene
// Owner-Rolle (user_roles — der Betreiber testet viel und kauft nicht bei
// sich selbst). Kunden überspringen das Freikontingent; Stundenlimit,
// IP-Limit und Tages-Deckel gelten weiter für alle.

// IP pseudonymisieren: SHA-256 über serverseitigen Schlüssel + IP. Einweg,
// nur für Ratenzählung — die rohe IP verlässt den Handler nie.
async function hashIp(ip: string): Promise<string | null> {
  if (!ip) return null;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "mm";
  const data = new TextEncoder().encode(`${key}:transform-ip:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || "").trim() || req.headers.get("cf-connecting-ip") || "";
}

// Foto als Data-URI. Der Client verkleinert auf max. 1280 px JPEG (~200-500 KB
// Base64); 8 MB ist die harte Grenze gegen Roh-Uploads direkt aus der Kamera.
const MAX_BODY_BYTES = 8_000_000;

// Bild-Editing-Modell: erhält Identität, Pose und Hintergrund und ändert
// gezielt die Körperkomposition. Nachfolger einfach hier tauschen.
const FAL_MODEL = "fal-ai/nano-banana/edit";
const FAL_URL = `https://fal.run/${FAL_MODEL}`;

// FAL_KEY-Auflösung: Function-Secret (Standardweg) → Vault-Fallback.
// Der Vault-Getter public.mm_get_fal_key() ist SECURITY DEFINER und
// AUSSCHLIESSLICH für service_role ausführbar (Migration
// mm_transform_vault_fal_key) — Clients kommen strukturell nicht an den Key.
// Modul-Cache: eine RPC pro Isolate, nicht pro Anfrage.
let falKeyCache: string | null = null;
async function resolveFalKey(admin: { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> }): Promise<string | null> {
  const env = Deno.env.get("FAL_KEY");
  if (env) return env;
  if (falKeyCache) return falKeyCache;
  try {
    const { data, error } = await admin.rpc("mm_get_fal_key");
    if (!error && typeof data === "string" && data.length > 10) {
      falKeyCache = data;
      return data;
    }
  } catch (_e) { /* fällt unten auf provider_not_configured */ }
  return null;
}

// Prompt auf Englisch — Bildmodelle folgen englischen Anweisungen messbar
// präziser. Die Zieloptik hängt am GESCHÄTZTEN ZIEL-KÖRPERFETT (Zielengine,
// Phase 2), nicht mehr am verlorenen Prozentsatz: 160→136 kg wird „deutlich
// schlanker, aber weich", nicht automatisch ein Sixpack. Alle Eingaben sind
// hart validierte Zahlen/Enums — der Client liefert nie Freitext ans Modell.
function buildPrompt(p: { currentKg: number; targetKg: number; heightCm: number; waistCm: number | null; shape: string }): string {
  const delta = Math.round(Math.abs(p.currentKg - p.targetKg));
  const intro = p.targetKg < p.currentKg
    ? `Edit this photo: show the exact same man as if he weighed ${p.targetKg} kg instead of his ` +
      `current ${p.currentKg} kg — he has lost ${delta} kg of mostly body fat through consistent ` +
      `training and nutrition over a realistic timeframe. `
    : `Edit this photo: show the exact same man as if he weighed ${p.targetKg} kg instead of his ` +
      `current ${p.currentKg} kg — he has gained ${delta} kg through long-term strength training, ` +
      `mostly muscle with a small natural amount of body fat. `;
  return intro +
    targetLookFragment({ weightKg: p.currentKg, heightCm: p.heightCm, waistCm: p.waistCm, shape: p.shape, targetKg: p.targetKg }) +
    IDENTITY_FRAGMENT;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin") || "");
  const json = (obj: unknown, status = 200) => jsonResponse(obj, status, cors);
  try {
    if (req.method === "OPTIONS") return preflight(cors);
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
    const body = JSON.parse(raw);

    // --- Auth IM HANDLER (P0.6) ---
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authRes = await requireUser(req, admin, cors);
    if (authRes.errorResponse) return authRes.errorResponse;
    const user = authRes.user;

    // --- Kunde oder Interessent? Entscheidet über Score-Pflicht + Kontingent ---
    const { data: roleRow } = await admin.from("user_roles").select("role")
      .eq("user_id", user.id).maybeSingle();
    const { count: entCount } = await admin.from("entitlements")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("status", "active");
    const isCustomer = roleRow?.role === "owner" || (entCount ?? 0) > 0;

    // --- Rate-Limit pro Nutzer (nur die eigenen Transform-Aufrufe zählen,
    //     damit Intelligence-Fragen das Bild-Kontingent nicht auffressen) ---
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from("ai_request_log").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("task", "BODY_TRANSFORM").gte("created_at", oneHourAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) return json({ error: "rate_limited" }, 429);

    // --- Lifetime-Freikontingent für Nicht-Kunden (nur ERFOLGREICHE Bilder
    //     zählen — ein Provider-Fehler frisst kein Gratiskontingent) ---
    let freeUsed = 0;
    if (!isCustomer) {
      const { count: okCount } = await admin.from("ai_request_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("task", "BODY_TRANSFORM").eq("ok", true);
      freeUsed = okCount ?? 0;
      if (freeUsed >= FREE_LIFETIME_IMAGES) return json({ error: "free_quota_exhausted" }, 403);
    }

    // --- IP-Limit über alle Konten: Wegwerf-Konten teilen sich die Leitung ---
    const ipHash = await hashIp(clientIp(req));
    if (ipHash) {
      const { count: ipCount } = await admin.from("ai_request_log")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).eq("task", "BODY_TRANSFORM").gte("created_at", oneHourAgo);
      if ((ipCount ?? 0) >= IP_LIMIT_PER_HOUR) return json({ error: "rate_limited" }, 429);
    }

    // --- Globaler Tages-Deckel: Kosten-Notbremse, unabhängig vom Nutzer ---
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const { count: dayCount } = await admin.from("ai_request_log")
      .select("id", { count: "exact", head: true })
      .eq("task", "BODY_TRANSFORM").gte("created_at", oneDayAgo);
    if ((dayCount ?? 0) >= GLOBAL_DAILY_CAP) return json({ error: "daily_capacity" }, 503);

    // --- Einwilligung (P0): ohne aktive Bestätigung im Client (18+, eigenes
    //     Foto, Nutzungsrecht, Verarbeitung) wird nichts generiert. Der
    //     Server erzwingt das Merkmal, gespeichert wird es nicht. ---
    if (body.consent !== true) return json({ error: "consent_required" }, 400);

    // --- Payload-Validierung: alle Felder hart geprüft. Die Zielprüfung
    //     läuft über die Zielengine — clientseitig blockierte Werte können
    //     nicht per direktem API-Aufruf umgangen werden (Phase 2/6). ---
    const currentKg = Number(body.current_kg);
    const targetKg = Number(body.target_kg);
    const heightCm = Number(body.height_cm);
    const waistCm = Number.isFinite(Number(body.waist_cm)) && Number(body.waist_cm) >= 50 && Number(body.waist_cm) <= 200
      ? Number(body.waist_cm) : null;
    const shape = Object.prototype.hasOwnProperty.call(SHAPES, String(body.shape)) ? String(body.shape) : "durchschnitt";
    const image = String(body.image ?? "");
    if (!Number.isFinite(currentKg) || currentKg < 40 || currentKg > 300) {
      return json({ error: "invalid_current_kg" }, 400);
    }
    if (!Number.isFinite(heightCm) || heightCm < 140 || heightCm > 220) {
      return json({ error: "invalid_height" }, 400);
    }
    const verdictRes = validateTarget({ weightKg: currentKg, heightCm, waistCm, shape, targetKg });
    if (verdictRes.verdict !== "plausibel" && verdictRes.verdict !== "ambitioniert") {
      // Blockierte Ziele bekommen die dynamische Alternative mitgeliefert —
      // die UI macht daraus eine Empfehlung statt einer Sackgasse.
      return json({
        error: "target_blocked", verdict: verdictRes.verdict, code: verdictRes.code,
        alt_lo: verdictRes.altLo ?? null, alt_hi: verdictRes.altHi ?? null,
      }, 400);
    }
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
      return json({ error: "invalid_image" }, 400);
    }

    const falKey = await resolveFalKey(admin);
    if (!falKey) return json({ error: "provider_not_configured" }, 503);

    // --- Provider-Aufruf (synchron; fal.run wartet auf das Ergebnis) ---
    // Datensparsamkeit (P0, fal-Doku "Data Retention" + "Media Expiration"):
    // · x-fal-store-io: 0 → die Request-Payloads (inkl. Foto-Data-URI) werden
    //   bei fal NICHT gespeichert (Standard wäre 30 Tage).
    // · x-fal-object-lifecycle-preference → generierte CDN-Bilder verfallen
    //   nach 1 Stunde statt der Standard-Mindestdauer von 7 Tagen.
    // Header-Versand ist Code-Fakt; die tatsächliche Löschung beim Anbieter
    // ist extern und hier nicht messbar — so auch dokumentiert.
    const r = await fetch(FAL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Key ${falKey}`,
        "x-fal-store-io": "0",
        "x-fal-object-lifecycle-preference": JSON.stringify({ expiration_duration_seconds: 3600 }),
      },
      body: JSON.stringify({
        prompt: buildPrompt({ currentKg, targetKg, heightCm, waistCm, shape }),
        image_urls: [image],
        num_images: 1,
        output_format: "jpeg",
      }),
    });

    if (!r.ok) {
      await admin.from("ai_request_log").insert({ user_id: user.id, task: "BODY_TRANSFORM", model: FAL_MODEL, ok: false, ip_hash: ipHash });
      const errBody = await r.text().catch(() => "");
      // 422 = das Modell lehnt den Inhalt ab (z. B. komplett unbekleidetes
      // Foto). Dem Nutzer ehrlich sagen, statt "Serverfehler" zu heucheln.
      if (r.status === 422) return json({ error: "content_rejected" }, 422);
      // fal meldet ein leeres Konto als 403 "Exhausted balance" — das ist
      // KEIN Schlüsselproblem und verdient eine eigene, ehrliche Meldung.
      if (r.status === 403 && /balance|locked/i.test(errBody)) return json({ error: "provider_balance" }, 503);
      if (r.status === 401 || r.status === 403) return json({ error: "provider_auth_failed" }, 502);
      return json({ error: "provider_error", status: r.status }, 502);
    }

    const d = await r.json();
    const url = d?.images?.[0]?.url ?? null;
    if (!url) {
      await admin.from("ai_request_log").insert({ user_id: user.id, task: "BODY_TRANSFORM", model: FAL_MODEL, ok: false, ip_hash: ipHash });
      return json({ error: "provider_error" }, 502);
    }

    // --- Observability ohne Bilddaten (§23/§253) ---
    await admin.from("ai_request_log").insert({ user_id: user.id, task: "BODY_TRANSFORM", model: FAL_MODEL, ok: true, ip_hash: ipHash });
    // Nicht-Kunden sehen ihr Rest-Kontingent — die Seite macht daraus einen
    // ehrlichen Zähler ("noch X Gratis-Bilder") statt einer Überraschungswand.
    const freeRemaining = isCustomer ? null : Math.max(0, FREE_LIFETIME_IMAGES - freeUsed - 1);
    return json({ image_url: url, target_kg: targetKg, model: FAL_MODEL, free_remaining: freeRemaining });
  } catch (e) {
    return json({ error: "internal", detail: String((e as Error)?.message ?? e).slice(0, 200) }, 500);
  }
});
