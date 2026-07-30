// =============================================================================
// site-telemetry — Supabase Edge Function
//
// Nimmt anonyme Nutzungs-Ereignisse der Website entgegen ("welche Seite, welche
// Aktion, woher gekommen"). Bewusst OHNE User-Auth: Besucher sind anonym, ein
// Login-Zwang wäre für die Privatsphäre ein Rückschritt. Der Schutz liegt
// woanders — exakt wie bei score-telemetry:
//
//   · ALLOWLIST-Validierung (validate.mjs) — kein Freitextfeld, jedes Feld
//     muss ein enges Muster erfüllen.
//   · Origin-Allowlist (_shared/edge.mjs).
//   · Idempotenz über event_id (upsert, ignoreDuplicates) — Retries und
//     doppelte Beacons erzeugen keine doppelten Zeilen.
//   · Schreiben ausschließlich per Service Role; public.site_events hat RLS an
//     und KEINE Policy, ist also für Clients weder les- noch schreibbar.
//   · Keine IP-Speicherung, kein User-Agent, keine Cookies, keine user_id.
//
// config.toml: verify_jwt = false (öffentlicher Ingest, siehe oben).
// Deploy: supabase functions deploy site-telemetry
//
// HINWEIS ZUM IMPORT: `../_shared/edge.mjs` ist der Standard aller Functions
// hier und funktioniert mit dem CLI-Deploy. Beim Ausrollen über die
// Management-API (die nur Dateien des Function-Ordners mitnimmt) wird stattdessen
// eine inhaltsgleiche Kopie als ./edge.mjs mitgeschickt — Verhalten identisch.
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight } from "../_shared/edge.mjs";
import { validateBatch, MAX_BODY_BYTES } from "./validate.mjs";

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return preflight(cors);
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);

  try {
    // sendBeacon schickt text/plain (kein Preflight) — der Body ist trotzdem
    // JSON. Deshalb bewusst über Text lesen statt req.json().
    const text = await req.text();
    if (!text || text.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "payload_too_large" }, 413, cors);
    }

    let body: unknown;
    try { body = JSON.parse(text); }
    catch { return jsonResponse({ error: "bad_json" }, 400, cors); }

    const result = validateBatch(body);
    if ("error" in result) return jsonResponse({ error: result.error }, 400, cors);
    if (!result.rows.length) return jsonResponse({ ok: true, stored: 0 }, 200, cors);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await service
      .from("site_events")
      .upsert(result.rows, { onConflict: "event_id", ignoreDuplicates: true });

    if (error) return jsonResponse({ error: "db_error" }, 500, cors);
    return jsonResponse({ ok: true, stored: result.rows.length }, 200, cors);
  } catch {
    return jsonResponse({ error: "unexpected" }, 500, cors);
  }
});
