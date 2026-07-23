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
import { corsHeaders, jsonResponse, preflight, requireUser } from "../_shared/edge.mjs";

const SECRET_BY_PRODUCT: Record<string, string | undefined> = {
  protocol: Deno.env.get("PROTOCOL_VAULT_KEY"),
  twelve_week: Deno.env.get("TWELVE_WEEK_VAULT_KEY"),
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return preflight(cors);
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);
  try {
    // Auth SERVER-AUTORITATIV validieren (P0.6-Standard, _shared/edge.mjs):
    // verify_jwt=false (config.toml) + Bearer → service.auth.getUser(jwt).
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const authRes = await requireUser(req, service, cors);
    if (authRes.errorResponse) return authRes.errorResponse;
    const uid = authRes.user.id;
    const { product_key } = await req.json().catch(() => ({}));
    if (!product_key || !(product_key in SECRET_BY_PRODUCT)) {
      return jsonResponse({ error: "bad_request" }, 400, cors);
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
      return jsonResponse({ error: "unauthorized" }, 403, cors);
    }
    const material = SECRET_BY_PRODUCT[product_key];
    if (!material) {
      return jsonResponse({ error: "unavailable" }, 503, cors);
    }
    // Never log the material. Return the minimum needed to unlock this product.
    return jsonResponse({ material }, 200, cors);
  } catch (_e) {
    return jsonResponse({ error: "internal" }, 500, cors);
  }
});
