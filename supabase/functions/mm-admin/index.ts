// =============================================================================
// MaleMetrix — mm-admin
// Geschuetzte Admin-Funktion fuer "Zugaenge verwalten".
//
// Sicherheitszusagen:
//   * Jeder Aufruf verlangt eine gueltige Session. Die Identitaet kommt aus
//     dem verifizierten JWT (auth.getUser), NIE aus dem Request-Body.
//   * Die Owner-Pruefung laeuft gegen public.user_roles, gebunden an
//     auth.users.id. Eine im Body mitgeschickte E-Mail oder user_id wird fuer
//     die Autorisierung ignoriert.
//   * Empfaenger erhalten ausschliesslich ein product_key-Entitlement.
//     Rollen werden hier grundsaetzlich nicht vergeben.
//   * Der Owner kann sich selbst nicht entziehen.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight } from "../_shared/edge.mjs";

const ERLAUBTE_PRODUKTE = new Set(["protocol"]);

/** Normalisierung gegen Schreibweisen-Tricks: Trim, Kleinschreibung,
 *  Unicode-Normalform. Plus-Aliase werden NICHT aufgeloest — sie sind
 *  eigenstaendige Adressen und sollen es bleiben. */
function normEmail(raw: unknown): string {
  return String(raw ?? "").normalize("NFKC").trim().toLowerCase();
}
function istEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
}

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

  // --- Identitaet aus dem Token, nicht aus dem Body -------------------------
  const { data: userData, error: userErr } = await admin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const callerId = userData.user.id;

  // --- Autorisierung: nur Owner --------------------------------------------
  const { data: rolle } = await admin
    .from("user_roles").select("role").eq("user_id", callerId).maybeSingle();
  if (!rolle || rolle.role !== "owner") return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  const action = String(body.action ?? "");
  const product = String(body.product_key ?? "protocol");
  if (!ERLAUBTE_PRODUKTE.has(product)) return json({ error: "unknown_product" }, 400);

  // ------------------------------------------------------------------ LIST --
  if (action === "list") {
    const { data, error } = await admin
      .from("access_grants")
      .select("id,email_norm,user_id,product_key,status,granted_at,claimed_at,revoked_at,expires_at,note")
      .order("granted_at", { ascending: false })
      .limit(200);
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true, grants: data ?? [] });
  }

  // ----------------------------------------------------------------- GRANT --
  if (action === "grant") {
    const email = normEmail(body.email);
    if (!istEmail(email)) return json({ error: "invalid_email" }, 400);

    // Existiert schon ein Konto? Dann direkt an die user_id binden.
    const { data: liste } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const treffer = (liste?.users ?? []).filter((u) => normEmail(u.email) === email);
    if (treffer.length > 1) return json({ error: "ambiguous_account", count: treffer.length }, 409);
    const ziel = treffer[0] ?? null;

    const { data: grant, error: gErr } = await admin
      .from("access_grants")
      .upsert({
        email_norm: email,
        user_id: ziel?.id ?? null,
        product_key: product,
        status: ziel ? "active" : "pending",
        granted_by: callerId,
        granted_at: new Date().toISOString(),
        claimed_at: ziel ? new Date().toISOString() : null,
        revoked_at: null,
        expires_at: body.expires_at ? String(body.expires_at) : null,
        note: body.note ? String(body.note).slice(0, 300) : null,
      }, { onConflict: "email_norm,product_key" })
      .select().maybeSingle();
    if (gErr) return json({ error: "db_error" }, 500);

    // Nur ein Produkt-Entitlement — niemals eine Rolle.
    if (ziel) {
      await admin.from("entitlements").upsert({
        user_id: ziel.id, product_key: product, status: "active", source: "manual_grant",
      }, { onConflict: "user_id,product_key" });
    }
    return json({ ok: true, status: grant?.status ?? (ziel ? "active" : "pending"), linked: !!ziel });
  }

  // ---------------------------------------------------------------- REVOKE --
  if (action === "revoke") {
    const email = normEmail(body.email);
    if (!istEmail(email)) return json({ error: "invalid_email" }, 400);

    const { data: grant } = await admin
      .from("access_grants").select("id,user_id")
      .eq("email_norm", email).eq("product_key", product)
      .neq("status", "revoked").maybeSingle();
    if (!grant) return json({ error: "not_found" }, 404);

    // Der Owner darf sich nicht selbst aussperren.
    if (grant.user_id && grant.user_id === callerId) {
      return json({ error: "cannot_revoke_self" }, 400);
    }
    const { data: ownerCheck } = await admin
      .from("user_roles").select("role").eq("user_id", grant.user_id ?? "").maybeSingle();
    if (ownerCheck?.role === "owner") return json({ error: "cannot_revoke_owner" }, 400);

    await admin.from("access_grants")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", grant.id);

    if (grant.user_id) {
      await admin.from("entitlements")
        .update({ status: "revoked" })
        .eq("user_id", grant.user_id).eq("product_key", product).eq("source", "manual_grant");
    }
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});
