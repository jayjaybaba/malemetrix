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
// sich selbst). Kunden überspringen Score-Pflicht und Freikontingent;
// Stundenlimit, IP-Limit und Tages-Deckel gelten weiter für alle.

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
// präziser. Die Zahlen sind validiert; `look` und `enhanced` kommen als
// Enum/Boolean und werden auf KONSTANTE Fragmente abgebildet — der Client
// liefert nie Freitext ans Bildmodell (keine Prompt-Injection-Fläche).
const LOOKS = new Set(["lean", "athletic", "muscular"]);

function lookFragment(cut: boolean, look: string, enhanced: boolean): string {
  if (cut) {
    if (look === "lean") return "Very lean and defined: visible abs, tight waist, clear muscle separation. ";
    if (look === "muscular") return "Recomposition: leaner AND visibly more muscular at the same time — tighter waist with fuller shoulders and arms. ";
    return "Athletic and fit: slimmer waist, flat stomach, healthy defined build. ";
  }
  if (look === "lean") return "Lean-muscle build: added muscle stays defined, waist stays tight. ";
  if (look === "muscular") {
    return enhanced
      ? "Significantly more muscular: dense, powerful physique with broad shoulders, thick chest, arms and legs. "
      : "Noticeably more muscular and broader, still a natural achievable look. ";
  }
  return "Athletic build: fuller chest, shoulders and arms, balanced proportions. ";
}

// Definition skaliert MIT dem Gewichtsverlust. Live-Befund 05.08.2026:
// Ohne diese Staffel machte das Modell −16 kg „insgesamt dünner", aber
// WEICHER als −8 kg — physiologisch verkehrt herum. Je größer das Defizit,
// desto niedriger das Körperfett, desto härter die Definition.
function cutIntensity(pct: number): string {
  if (pct >= 15) {
    return "At this large loss he is VERY lean (low body fat): a sharply defined six-pack, " +
      "clear muscle separation, visible veins on the arms, tight chest and a leaner, more angular face. ";
  }
  if (pct >= 8) {
    return "He is now lean: clearly visible abs, defined waist, noticeably slimmer face. ";
  }
  return "He is moderately leaner: flatter stomach, first hints of abs. ";
}

function buildPrompt(currentKg: number, targetKg: number, look: string, enhanced: boolean): string {
  const delta = Math.round(Math.abs(currentKg - targetKg));
  const pct = Math.round((delta / currentKg) * 100);
  const identity =
    "Keep the SAME person and identity: identical face, same pose, same clothing " +
    "(if any — do NOT add clothing to a bare torso), same background, same lighting " +
    "and camera angle. Photorealistic, natural skin texture. Change nothing except " +
    "his body composition.";
  if (targetKg < currentKg) {
    return (
      `Edit this photo: show the exact same man as if he weighed ${targetKg} kg ` +
      `instead of his current ${currentKg} kg — he has lost ${delta} kg (about ${pct}% ` +
      `of his body weight) through training and nutrition. He kept his muscle: the ` +
      `weight lost is body fat. ` + cutIntensity(pct) +
      `IMPORTANT: muscle definition INCREASES with the amount of weight lost — at this ` +
      `weight he must look MORE defined than at any smaller loss. Never soften or smooth ` +
      `the abdominal area. ` +
      lookFragment(true, look, enhanced) + identity
    );
  }
  return (
    `Edit this photo: show the exact same man as if he weighed ${targetKg} kg ` +
    `instead of his current ${currentKg} kg — he has gained ${delta} kg of lean ` +
    `muscle mass (about ${pct}%) through strength training. ` +
    lookFragment(false, look, enhanced) + identity
  );
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

    // --- Payload-Validierung: genau drei Felder, alle hart geprüft ---
    const currentKg = Number(body.current_kg);
    const targetKg = Number(body.target_kg);
    const image = String(body.image ?? "");
    if (!Number.isFinite(currentKg) || currentKg < 40 || currentKg > 300) {
      return json({ error: "invalid_current_kg" }, 400);
    }
    if (!Number.isFinite(targetKg) || targetKg < 40 || targetKg > 300) {
      return json({ error: "invalid_target_kg" }, 400);
    }
    // Mehr als 60 % Differenz ist keine Transformation mehr, sondern eine
    // andere Person — das Ergebnis wäre unglaubwürdig und die Kosten umsonst.
    if (Math.abs(currentKg - targetKg) > currentKg * 0.6 || currentKg === targetKg) {
      return json({ error: "invalid_target_range" }, 400);
    }
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
      return json({ error: "invalid_image" }, 400);
    }
    // Wunsch-Look: Enum-validiert, unbekannte Werte fallen auf "athletic".
    const look = LOOKS.has(String(body.look)) ? String(body.look) : "athletic";
    const enhanced = body.enhanced === true;

    const falKey = await resolveFalKey(admin);
    if (!falKey) return json({ error: "provider_not_configured" }, 503);

    // --- Provider-Aufruf (synchron; fal.run wartet auf das Ergebnis) ---
    const r = await fetch(FAL_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt: buildPrompt(currentKg, targetKg, look, enhanced),
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
