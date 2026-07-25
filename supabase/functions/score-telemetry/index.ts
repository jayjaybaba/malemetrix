// =============================================================================
// score-telemetry — Supabase Edge Function (Phase 12)
//
// Nimmt pseudonyme Score-Funnel-Events entgegen. Bewusst OHNE User-Auth:
// der Score ist anonym nutzbar, ein Login wäre hier ein Rückschritt für die
// Privatsphäre, kein Fortschritt. Stattdessen:
//
//   · ALLOWLIST-Validierung (validate.mjs) — es gibt kein Freitextfeld,
//     Antworten/Laborwerte/Substanzen/Status können strukturell nicht
//     gespeichert werden, auch nicht von einem manipulierten Client.
//   · Origin-Allowlist (_shared/edge.mjs) wie bei allen Browser-Functions.
//   · Idempotenz über event_id (upsert, ignoreDuplicates) — Retries und
//     doppelte Beacons erzeugen keine doppelten Zeilen.
//   · Schreiben ausschließlich per Service Role; die Tabelle hat RLS an und
//     KEINE Policy, ist also für anon/authenticated weder les- noch schreibbar.
//   · Keine IP-Speicherung, kein User-Agent, keine Cookies.
//
// config.toml: verify_jwt = false (öffentlicher Ingest, siehe oben).
// Deploy: supabase functions deploy score-telemetry
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

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await service
      .from("score_events")
      .upsert(result.events, { onConflict: "event_id", ignoreDuplicates: true });

    if (error) {
      // Nie Details an den Client zurückgeben — der Score ignoriert die
      // Antwort ohnehin und darf niemals wegen Telemetrie stehen bleiben.
      console.error("score-telemetry insert failed", error.message);
      return jsonResponse({ error: "store_failed" }, 500, cors);
    }

    return jsonResponse({ ok: true, accepted: result.events.length, rejected: result.rejected }, 200, cors);
  } catch (e) {
    console.error("score-telemetry unexpected", e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: "unexpected" }, 500, cors);
  }
});
