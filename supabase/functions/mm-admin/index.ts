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

/** Alle Konten seitenweise laden. listUsers kennt keinen E-Mail-Filter, und
 *  eine einzelne Seite mit perPage=1000 wuerde ab Konto 1001 still Konten
 *  uebersehen — ein vorhandenes Konto bekaeme dann faelschlich eine offene
 *  Einladung statt einer Verknuepfung. Deshalb: paginieren bis zum Ende,
 *  mit hartem Sicherheitsdeckel gegen Endlosschleifen. */
async function alleKonten(admin: ReturnType<typeof createClient>) {
  const konten: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] = [];
  const PER_PAGE = 200, MAX_PAGES = 100; // Deckel: 20.000 Konten
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      konten.push({
        id: u.id,
        email: normEmail(u.email),
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (users.length < PER_PAGE) break;
  }
  return konten;
}

Deno.serve(async (req) => {
  // Muster wie in allen anderen Functions (edge.mjs P0.7): corsHeaders erwartet
  // den Origin-STRING, preflight liefert IMMER eine 204-Response und darf nur
  // für OPTIONS zurückgegeben werden.
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

  // ---------------------------------------------------------- LIST_MEMBERS --
  // Echte Mitgliederuebersicht: jedes registrierte Konto mit Produkten,
  // Abo-Zustand, Rolle und Herkunft (Kauf vs. manuelle Vergabe). Nur lesend —
  // hier wird nichts vergeben und nichts entzogen.
  if (action === "list_members") {
    let konten;
    try { konten = await alleKonten(admin); } catch { return json({ error: "db_error" }, 500); }

    const [entsQ, subsQ, rolesQ, grantsQ] = await Promise.all([
      admin.from("entitlements").select("user_id,product_key,status,source,granted_at"),
      admin.from("subscriptions").select("user_id,plan,state,current_period_end"),
      admin.from("user_roles").select("user_id,role"),
      admin.from("access_grants").select("user_id,product_key,status"),
    ]);
    if (entsQ.error || subsQ.error || rolesQ.error || grantsQ.error) {
      return json({ error: "db_error" }, 500);
    }

    const proUser = new Map<string, {
      entitlements: { product_key: string; status: string; source: string | null }[];
      subscription: { plan: string; state: string; current_period_end: string | null } | null;
      role: string | null;
    }>();
    const eintrag = (id: string) => {
      let e = proUser.get(id);
      if (!e) { e = { entitlements: [], subscription: null, role: null }; proUser.set(id, e); }
      return e;
    };
    for (const e of entsQ.data ?? []) {
      eintrag(e.user_id).entitlements.push({ product_key: e.product_key, status: e.status, source: e.source ?? null });
    }
    for (const s of subsQ.data ?? []) {
      // Bei mehreren Abos zaehlt das juengste aktive; sonst das letzte.
      const ziel = eintrag(s.user_id);
      if (!ziel.subscription || s.state === "ACTIVE" || s.state === "TRIALING") {
        ziel.subscription = { plan: s.plan, state: s.state, current_period_end: s.current_period_end ?? null };
      }
    }
    for (const r of rolesQ.data ?? []) eintrag(r.user_id).role = r.role;

    const members = konten.map((u) => {
      const e = proUser.get(u.id);
      return {
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: e?.role ?? null,
        entitlements: e?.entitlements ?? [],
        subscription: e?.subscription ?? null,
      };
    }).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return json({ ok: true, count: members.length, members });
  }

  // ----------------------------------------------------------------- GRANT --
  if (action === "grant") {
    const email = normEmail(body.email);
    if (!istEmail(email)) return json({ error: "invalid_email" }, 400);

    // Existiert schon ein Konto? Dann direkt an die user_id binden.
    // Paginiert ueber ALLE Konten — die fruehere Einzelseite (perPage=1000)
    // haette ab Konto 1001 vorhandene Konten uebersehen.
    let konten;
    try { konten = await alleKonten(admin); } catch { return json({ error: "db_error" }, 500); }
    const treffer = konten.filter((u) => u.email === email);
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
