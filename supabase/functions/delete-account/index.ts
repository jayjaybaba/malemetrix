// =============================================================================
// delete-account — Supabase Edge Function (Phase 10 / P0.8)
// Löscht den AUFRUFENDEN Auth-Account. DESTRUKTIV — deshalb:
//   · Auth IM HANDLER (P0.6): Bearer → service.auth.getUser(jwt); die Identität
//     kommt ausschließlich aus dem validierten Token, nie aus dem Body.
//     Es kann strukturell nur der eigene Account gelöscht werden.
//   · Explizite Bestätigung: Body { confirm: true } ist Pflicht.
//   · Secrets: SUPABASE_SERVICE_ROLE_KEY (Standard-Name; Fallback auf den
//     früher dokumentierten Namen SERVICE_ROLE_KEY, damit ein bestehendes
//     Secret nicht still bricht).
//
// DATEN-VERHALTEN (auditiert gegen supabase/migrations, Stand P10):
//   · CASCADE (persönliche Daten, werden mit dem Account gelöscht): profiles,
//     entitlements, score_results, program_cycles, lab_*-Tabellen,
//     push_subscriptions, push_delivery_log, ai_request_log, subscriptions.
//   · orders: user_id ist ON DELETE SET NULL — bezahlte Bestellungen bleiben
//     als anonymisierte Belege erhalten (gesetzliche Aufbewahrung/Buchhaltung,
//     §147 AO). Sie sind danach KEINEM Konto mehr zuzuordnen und können nicht
//     erneut geclaimt werden (mm-commerce behandelt verwaiste Orders als
//     payment_already_claimed).
//   · commerce_events/subscription_events tragen keine user_id (reines Audit).
// Account-Löschung und Aufbewahrung sind damit logisch getrennt: personen-
// bezogene Daten fallen weg, Zahlungsbelege bleiben anonymisiert bestehen.
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight, requireUser } from "../_shared/edge.mjs";

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return preflight(cors);
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
    if (!url || !srKey) return jsonResponse({ error: "provider_not_configured" }, 503, cors);
    const service = createClient(url, srKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const authRes = await requireUser(req, service, cors);
    if (authRes.errorResponse) return authRes.errorResponse;
    const user = authRes.user;

    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== true) {
      return jsonResponse({ error: "confirmation_required" }, 400, cors);
    }

    // Nur die eigene, token-verifizierte user.id — niemals eine ID aus dem Body.
    const { error: delErr } = await service.auth.admin.deleteUser(user.id);
    if (delErr) {
      return jsonResponse({ error: "delete_failed" }, 500, cors);
    }
    return jsonResponse({ ok: true }, 200, cors);
  } catch (_e) {
    return jsonResponse({ error: "internal" }, 500, cors);
  }
});
