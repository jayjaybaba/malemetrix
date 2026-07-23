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
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: cors });
  try {
    // Auth SERVER-AUTORITATIV validieren (neue ES256/Publishable-Key-Welt).
    // Der frühere ANON_KEY-Client + getUser() ohne Token liefert hier keinen
    // User. Deshalb: Bearer-Token explizit mit dem Service-Role-Client prüfen.
    // Diese Funktion läuft mit verify_jwt=false (config.toml) — die Auth wird
    // hier im Handler erzwungen, nie über ungeprüfte Claims.
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "auth_missing" }), { status: 401, headers: cors });
    }
    const { data: userData, error: userErr } = await service.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "auth_invalid_token" }), { status: 401, headers: cors });
    }
    const uid = userData.user.id;
    const { product_key } = await req.json().catch(() => ({}));
    if (!product_key || !(product_key in SECRET_BY_PRODUCT)) {
      return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: cors });
    }
    // Entitlement-Check strikt auf den validierten Nutzer beschränkt (Service-
    // Role umgeht RLS, deshalb user_id EXPLIZIT filtern — nur eigene Rechte).
    const { data: ents, error: entErr } = await service
      .from("entitlements")
      .select("product_key,status,expires_at")
      .eq("user_id", uid)
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
