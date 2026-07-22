// =============================================================================
// resolve-product-access — Supabase Edge Function
// Returns vault key material for a product ONLY to an authenticated user with
// an active, unexpired entitlement. Secrets live exclusively in the function's
// environment (never in the repo, never client-side):
//   supabase secrets set PROTOCOL_VAULT_KEY=...  TWELVE_WEEK_VAULT_KEY=...
// Deploy: supabase functions deploy resolve-product-access
// Honest scope: the browser must ultimately receive decryption material to
// decrypt client-side content. This function ensures only entitled accounts
// receive it, over HTTPS, without embedding it in any public asset.
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET_BY_PRODUCT: Record<string, string | undefined> = {
  protocol: Deno.env.get("PROTOCOL_VAULT_KEY"),
  twelve_week: Deno.env.get("TWELVE_WEEK_VAULT_KEY"),
};

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "https://www.malemetrix.com",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    // Client with the CALLER's JWT → RLS applies; no service role needed here.
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
    }
    const { product_key } = await req.json().catch(() => ({}));
    if (!product_key || !(product_key in SECRET_BY_PRODUCT)) {
      return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: cors });
    }
    // Entitlement check under RLS (caller sees only own rows).
    const { data: ents, error: entErr } = await supa
      .from("entitlements")
      .select("product_key,status,expires_at")
      .eq("product_key", product_key)
      .eq("status", "active");
    const now = new Date().toISOString();
    const valid = !entErr && (ents ?? []).some((e) => !e.expires_at || e.expires_at > now);
    if (!valid) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 403, headers: cors });
    }
    const material = SECRET_BY_PRODUCT[product_key];
    if (!material) {
      return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers: cors });
    }
    // Never log the material. Return the minimum needed to unlock this product.
    return new Response(JSON.stringify({ material }), { status: 200, headers: cors });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "error" }), { status: 500, headers: cors });
  }
});
