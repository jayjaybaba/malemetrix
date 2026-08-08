// =============================================================================
// MaleMetrix — ig-admin
// Verwaltung des Instagram-Comment-Funnels. Ausschliesslich fuer den Owner.
//
// Sicherheitszusagen (identisch zu mm-admin, P0.6):
//   * Die Identitaet kommt aus dem verifizierten JWT (auth.getUser), NIE aus
//     dem Request-Body.
//   * Die Owner-Pruefung laeuft gegen public.user_roles, gebunden an
//     auth.users.id. Reihenfolge: Token-Auth → Owner-Check → erst dann Body.
//   * Diese Funktion vergibt niemals eine Rolle und ruehrt keine Entitlements an.
//   * Gelesen wird ausschliesslich ueber die SECURITY-DEFINER-Berichte
//     (ig_funnel_report, ig_lead_list) — Rohzeilen der Kommentartabelle
//     verlassen die Datenbank nie.
//
// Der wichtigste Knopf hier ist `settings_save { active: false }`: der Not-Aus.
// Er liegt bewusst in der Datenbank und nicht im Code — wer den Funnel stoppen
// will, klickt und wartet nicht auf einen Deploy.
//
// config.toml: verify_jwt = false (ES256-Projekt, Auth im Handler).
// Deploy: supabase functions deploy ig-admin
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight } from "../_shared/edge.mjs";

/** Serverseitige Spiegelung der CHECK-Bedingungen aus Migration 0019. Die
 *  Datenbank ist die verbindliche Grenze; diese Pruefung existiert nur, damit
 *  der Owner eine verstaendliche Meldung statt eines DB-Fehlers sieht. */
const RE_KEYWORD = /^[a-z0-9äöüß _-]{2,40}$/;
const RE_LINK = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i;
const RE_IGSID = /^[0-9]{5,32}$/;
const LEAD_STATUS = new Set(["new", "contacted", "replied", "converted", "opted_out"]);

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
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

  // ---------------------------------------------------------------- REPORT --
  if (action === "report") {
    const days = clampInt(body.days, 1, 365, 30);
    const { data, error } = await admin.rpc("ig_funnel_report", { days });
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true, report: data });
  }

  // ----------------------------------------------------------------- SETUP --
  // Meldet NUR, ob ein Secret gesetzt ist — nie seinen Wert. Ohne das sucht man
  // beim Einrichten im Dunkeln: der Funnel schweigt dann einfach, und man weiss
  // nicht, ob eine Regel fehlt oder der Token.
  if (action === "setup_state") {
    const gesetzt = (k: string) => !!(Deno.env.get(k) || "").trim();
    const { count } = await admin
      .from("ig_rules").select("id", { count: "exact", head: true }).eq("active", true);
    const { data: cfg } = await admin.from("ig_settings").select("*").eq("id", 1).maybeSingle();
    return json({
      ok: true,
      secrets: {
        IG_APP_SECRET: gesetzt("IG_APP_SECRET"),
        IG_VERIFY_TOKEN: gesetzt("IG_VERIFY_TOKEN"),
        IG_ACCESS_TOKEN: gesetzt("IG_ACCESS_TOKEN"),
        IG_BUSINESS_ID: gesetzt("IG_BUSINESS_ID"),
      },
      aktive_regeln: count ?? 0,
      settings: cfg ?? null,
    });
  }

  // ------------------------------------------------------------------ LEADS --
  if (action === "leads") {
    const limit = clampInt(body.limit, 1, 500, 100);
    const { data, error } = await admin.rpc("ig_lead_list", { p_limit: limit });
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true, leads: data ?? [] });
  }

  if (action === "lead_status") {
    const igsid = String(body.igsid ?? "");
    const status = String(body.status ?? "");
    if (!RE_IGSID.test(igsid)) return json({ error: "invalid_igsid" }, 400);
    if (!LEAD_STATUS.has(status)) return json({ error: "invalid_status" }, 400);
    // Ein Opt-out laeuft ueber die dafuer gebaute Funktion — sie setzt den
    // Zeitstempel, an dem die Sperre haengt. Ein blosses status='opted_out'
    // wuerde die Sperre optisch anzeigen, ohne sie zu erzeugen.
    if (status === "opted_out") {
      const { error } = await admin.rpc("ig_opt_out", { p_igsid: igsid });
      if (error) return json({ error: "db_error" }, 500);
      return json({ ok: true });
    }
    const { error } = await admin.from("ig_leads").update({ status }).eq("igsid", igsid);
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true });
  }

  // DSGVO Art. 17: eine Loeschanfrage muss in einem Schritt erledigt sein.
  if (action === "lead_forget") {
    const igsid = String(body.igsid ?? "");
    if (!RE_IGSID.test(igsid)) return json({ error: "invalid_igsid" }, 400);
    const { data, error } = await admin.rpc("ig_forget_lead", { p_igsid: igsid });
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true, geloescht: Number(data) || 0 });
  }

  // ------------------------------------------------------------------ REGELN --
  if (action === "rules_list") {
    const { data, error } = await admin
      .from("ig_rules")
      .select("id,keyword,match_mode,message,link_url,priority,is_default,active,created_at")
      .order("is_default", { ascending: true })
      .order("priority", { ascending: true })
      .limit(200);
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true, rules: data ?? [] });
  }

  if (action === "rule_save") {
    const keyword = String(body.keyword ?? "").trim().toLowerCase();
    const message = String(body.message ?? "").trim();
    const link = String(body.link_url ?? "").trim();
    const isDefault = body.is_default === true;

    // Die Default-Regel braucht kein Stichwort — sie greift ja gerade dann,
    // wenn keines passt. Sie bekommt trotzdem eines als Anzeigename.
    const effKeyword = isDefault ? (keyword || "standard") : keyword;
    if (!RE_KEYWORD.test(effKeyword)) return json({ error: "invalid_keyword" }, 400);
    if (message.length < 10 || message.length > 900) return json({ error: "invalid_message" }, 400);
    if (link && !RE_LINK.test(link)) return json({ error: "invalid_link" }, 400);

    const row = {
      keyword: effKeyword,
      match_mode: body.match_mode === "exact" ? "exact" : "contains",
      message,
      link_url: link || null,
      priority: clampInt(body.priority, 1, 999, 100),
      is_default: isDefault,
      active: body.active !== false,
      created_by: callerId,
    };

    // Es darf nur EINE Default-Regel geben (Partial-Unique-Index). Die alte
    // wird deshalb zuerst degradiert, sonst schlaegt das Insert fehl und der
    // Owner sieht einen unverstaendlichen Constraint-Fehler.
    if (isDefault) {
      const q = admin.from("ig_rules").update({ is_default: false }).eq("is_default", true);
      await (body.id ? q.neq("id", clampInt(body.id, 1, 2 ** 31 - 1, 0)) : q);
    }

    if (body.id) {
      const id = clampInt(body.id, 1, 2 ** 31 - 1, 0);
      const { error } = await admin.from("ig_rules").update(row).eq("id", id);
      if (error) return json({ error: "db_error", detail: error.code ?? null }, 500);
      return json({ ok: true, id });
    }
    const { data, error } = await admin.from("ig_rules").insert(row).select("id").maybeSingle();
    if (error) {
      // 23505 = das Stichwort gibt es schon. Das ist ein Bedienfehler, kein Serverfehler.
      if (error.code === "23505") return json({ error: "keyword_exists" }, 409);
      return json({ error: "db_error" }, 500);
    }
    return json({ ok: true, id: data?.id ?? null });
  }

  if (action === "rule_delete") {
    const id = clampInt(body.id, 1, 2 ** 31 - 1, 0);
    if (!id) return json({ error: "invalid_id" }, 400);
    const { error } = await admin.from("ig_rules").delete().eq("id", id);
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true });
  }

  // ------------------------------------------------------------ EINSTELLUNGEN --
  if (action === "settings_save") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: callerId };
    if ("active" in body) patch.active = body.active === true;
    if ("daily_cap" in body) patch.daily_cap = clampInt(body.daily_cap, 0, 500, 40);
    if ("per_lead_cooldown_days" in body) {
      patch.per_lead_cooldown_days = clampInt(body.per_lead_cooldown_days, 0, 365, 30);
    }
    // Groesser als 7 laesst Meta nicht zu — der Deckel steht hier UND als
    // CHECK in der Datenbank UND in funnel.mjs. Drei Stellen, weil ein zu
    // grosses Fenster nur Fehlversuche gegen das API-Kontingent erzeugt.
    if ("comment_window_days" in body) {
      patch.comment_window_days = clampInt(body.comment_window_days, 1, 7, 7);
    }
    const { error } = await admin.from("ig_settings").update(patch).eq("id", 1);
    if (error) return json({ error: "db_error" }, 500);
    const { data } = await admin.from("ig_settings").select("*").eq("id", 1).maybeSingle();
    return json({ ok: true, settings: data ?? null });
  }

  return json({ error: "unknown_action" }, 400);
});
