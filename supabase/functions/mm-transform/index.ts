// ============================================================================
// MaleMetrix — Edge Function `mm-transform`
// Körper-Transformation als Bild: Der Nutzer lädt ein Foto von sich hoch und
// bekommt eine fotorealistische Vorschau, wie er mit einem Zielgewicht
// aussehen würde. Provider: fal.ai (Bild-Editing-Modell). Der API-Key lebt
// NUR hier als Function-Secret (FAL_KEY) — nie im Repo/Client/Log.
//
// STATUS: CODE COMPLETE · CONFIG REQUIRED (Secret + Deploy):
//   supabase secrets set FAL_KEY=...        (Key von fal.ai → Dashboard)
//   supabase functions deploy mm-transform
// Ohne Secret antwortet die Function ehrlich mit provider_not_configured.
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

// Foto als Data-URI. Der Client verkleinert auf max. 1280 px JPEG (~200-500 KB
// Base64); 8 MB ist die harte Grenze gegen Roh-Uploads direkt aus der Kamera.
const MAX_BODY_BYTES = 8_000_000;

// Bild-Editing-Modell: erhält Identität, Pose und Hintergrund und ändert
// gezielt die Körperkomposition. Nachfolger einfach hier tauschen.
const FAL_MODEL = "fal-ai/nano-banana/edit";
const FAL_URL = `https://fal.run/${FAL_MODEL}`;

// Prompt auf Englisch — Bildmodelle folgen englischen Anweisungen messbar
// präziser. Die Zahlen sind validiert, der Text ist konstant.
function buildPrompt(currentKg: number, targetKg: number): string {
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
      `of his body weight) through training and nutrition. Visibly reduced body fat: ` +
      `slimmer waist, flatter stomach, reduced chest and face fat, slightly more ` +
      `visible muscle definition. ` + identity
    );
  }
  return (
    `Edit this photo: show the exact same man as if he weighed ${targetKg} kg ` +
    `instead of his current ${currentKg} kg — he has gained ${delta} kg of lean ` +
    `muscle mass (about ${pct}%) through strength training. Broader shoulders, ` +
    `fuller chest and arms, athletic build, still natural looking. ` + identity
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

    // --- Rate-Limit pro Nutzer (nur die eigenen Transform-Aufrufe zählen,
    //     damit Intelligence-Fragen das Bild-Kontingent nicht auffressen) ---
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from("ai_request_log").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("task", "BODY_TRANSFORM").gte("created_at", oneHourAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) return json({ error: "rate_limited" }, 429);

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

    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) return json({ error: "provider_not_configured" }, 503);

    // --- Provider-Aufruf (synchron; fal.run wartet auf das Ergebnis) ---
    const r = await fetch(FAL_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Key ${falKey}` },
      body: JSON.stringify({
        prompt: buildPrompt(currentKg, targetKg),
        image_urls: [image],
        num_images: 1,
        output_format: "jpeg",
      }),
    });

    if (!r.ok) {
      await admin.from("ai_request_log").insert({ user_id: user.id, task: "BODY_TRANSFORM", model: FAL_MODEL, ok: false });
      // 422 = das Modell lehnt den Inhalt ab (z. B. komplett unbekleidetes
      // Foto). Dem Nutzer ehrlich sagen, statt "Serverfehler" zu heucheln.
      if (r.status === 422) return json({ error: "content_rejected" }, 422);
      if (r.status === 401 || r.status === 403) return json({ error: "provider_auth_failed" }, 502);
      return json({ error: "provider_error", status: r.status }, 502);
    }

    const d = await r.json();
    const url = d?.images?.[0]?.url ?? null;
    if (!url) {
      await admin.from("ai_request_log").insert({ user_id: user.id, task: "BODY_TRANSFORM", model: FAL_MODEL, ok: false });
      return json({ error: "provider_error" }, 502);
    }

    // --- Observability ohne Bilddaten (§23/§253) ---
    await admin.from("ai_request_log").insert({ user_id: user.id, task: "BODY_TRANSFORM", model: FAL_MODEL, ok: true });
    return json({ image_url: url, target_kg: targetKg, model: FAL_MODEL });
  } catch (e) {
    return json({ error: "internal", detail: String((e as Error)?.message ?? e).slice(0, 200) }, 500);
  }
});
