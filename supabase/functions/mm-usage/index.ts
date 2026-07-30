// =============================================================================
// MaleMetrix — mm-usage
// Liest den anonymen Nutzungsbericht der Website (public.site_events).
//
// WARUM EIGENE FUNCTION statt einer weiteren Aktion in mm-admin:
//   * Trennung von Lesen und Schreiben. mm-admin kann Zugänge vergeben und
//     entziehen; diese Function kann ausschließlich LESEN. Ein Fehler hier
//     kann keine Entitlements verändern.
//   * Der Bericht kommt fertig aggregiert aus public.site_usage_report();
//     einzelne Besucher-Zeilen verlassen die Datenbank nie.
//
// Sicherheitszusagen (identisch zu mm-admin):
//   * Jeder Aufruf verlangt eine gültige Session. Die Identität kommt aus dem
//     verifizierten JWT (auth.getUser), NIE aus dem Request-Body.
//   * Autorisierung nur für die Owner-Rolle (public.user_roles, an
//     auth.users.id gebunden).
//
// config.toml: verify_jwt = false (ES256-Fall, P0.6 — der Handler prüft selbst).
// Deploy: supabase functions deploy mm-usage
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight } from "../_shared/edge.mjs";

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return preflight(cors);
  const json = (d: unknown, s = 200) => jsonResponse(d, s, cors);

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

  const { data: rolle } = await admin
    .from("user_roles").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (!rolle || rolle.role !== "owner") return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* Standard: 7 Tage */ }

  const tage = Math.min(Math.max(Number(body.days ?? 7) || 7, 1), 90);
  const { data, error } = await admin.rpc("site_usage_report", { days: tage });
  if (error) return json({ error: "db_error" }, 500);
  return json({ ok: true, report: data ?? {} });
});
