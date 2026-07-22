// =============================================================================
// delete-account — Supabase Edge Function
// Deletes the CALLING user's auth account; owned rows cascade via FKs.
// Requires the service role key as a FUNCTION SECRET (server-side only):
//   supabase secrets set SERVICE_ROLE_KEY=...   (never in the repo/client)
// Deploy: supabase functions deploy delete-account
// Client flow: explicit re-confirmation in UI → this call → session revoked →
// client offers intentional local-data cleanup (never before server confirm).
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "https://www.malemetrix.com",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
    }
    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== true) {
      return new Response(JSON.stringify({ error: "confirmation_required" }), { status: 400, headers: cors });
    }
    // Admin client (service role) — exists only inside this function's env.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );
    const { error: delErr } = await admin.auth.admin.deleteUser(userData.user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: "delete_failed" }), { status: 500, headers: cors });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "error" }), { status: 500, headers: cors });
  }
});
