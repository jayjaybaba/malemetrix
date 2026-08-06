// =============================================================================
// mm-plan-ics — Supabase Edge Function (Generation 2, Phase 6)
//
// Persönlicher, abonnierbarer Kalender zum 12-Wochen-Plan.
//
//   GET  ?t=<token>          → ICS-Feed (text/calendar). Kein Login — die
//                              Apple-Kalender-App kann keinen JWT senden.
//                              Schutz: 32-Byte-Zufallstoken, gespeichert nur
//                              als SHA-256-Hash, widerrufbar, 1 aktiver Token
//                              pro Nutzer. Kein Nutzername/keine ID in der URL.
//   POST {action:"create"}   → Token erzeugen/rotieren (Bearer-JWT, P0.6:
//                              service.auth.getUser im Handler). Antwort
//                              enthält den Klartext-Token GENAU EINMAL.
//   POST {action:"revoke"}   → aktiven Token widerrufen.
//
// Der Feed liest den Plan aus der bestehenden os_state-Tabelle (domain
// "simple_plan") — dieselbe Quelle der Wahrheit wie die App. Er enthält NUR
// ehrliche Zeitblöcke (Training, Einkauf, Prep, Wochencheck, Fotos,
// Abschlussmessung) — keine Mahlzeiten, keine Gesundheitsdaten (§21).
//
// config.toml: verify_jwt = false (Auth im Handler; GET ist token-basiert).
// ics.mjs ist die identische Kopie von js/simple/ics.js (Test erzwingt das).
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight, requireUser } from "../_shared/edge.mjs";
import "./ics.mjs";

const ics = (globalThis as Record<string, any>).MMSimple.ics;

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return preflight(cors);

  // ---------------------------------------------------------------- GET: Feed
  if (req.method === "GET") {
    const url = new URL(req.url);
    const token = (url.searchParams.get("t") || "").trim();
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return jsonResponse({ error: "bad_token" }, 400, cors);
    }
    const svc = service();
    const hash = await sha256Hex(token);
    const { data: row } = await svc
      .from("calendar_tokens")
      .select("user_id, revoked_at")
      .eq("token_hash", hash)
      .maybeSingle();
    if (!row || row.revoked_at) return jsonResponse({ error: "not_found" }, 404, cors);

    const { data: st } = await svc
      .from("os_state")
      .select("state")
      .eq("user_id", row.user_id)
      .eq("domain", "simple_plan")
      .maybeSingle();
    const plan = st?.state;
    if (!plan || !plan.startDate) return jsonResponse({ error: "no_plan" }, 404, cors);

    svc.from("calendar_tokens").update({ last_used_at: new Date().toISOString() })
      .eq("token_hash", hash).then(() => {}, () => {});

    const lang = (url.searchParams.get("lang") === "en") ? "en" : "de";
    const body = ics.build(plan, { lang, now: new Date().toISOString() });
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'inline; filename="malemetrix-plan.ics"',
        // Apple pollt Abos selbst; kurze Cache-Zeit hält Änderungen frisch.
        "cache-control": "private, max-age=300",
        ...cors,
      },
    });
  }

  // ------------------------------------------------- POST: create / revoke
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);

  const svc = service();
  const auth = await requireUser(req, svc, cors);
  if ("errorResponse" in auth) return auth.errorResponse;
  const userId = auth.user.id;

  let body: { action?: string } = {};
  try { body = await req.json(); } catch { /* leerer Body = create */ }
  const action = body.action === "revoke" ? "revoke" : "create";

  if (action === "revoke") {
    await svc.from("calendar_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId).is("revoked_at", null);
    return jsonResponse({ ok: true, revoked: true }, 200, cors);
  }

  // create/rotate: alten Token widerrufen, neuen anlegen
  await svc.from("calendar_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId).is("revoked_at", null);

  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const token = Array.from(raw).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await sha256Hex(token);
  const { error } = await svc.from("calendar_tokens").insert({ user_id: userId, token_hash: hash });
  if (error) {
    console.error("mm-plan-ics token insert failed", error.message);
    return jsonResponse({ error: "store_failed" }, 500, cors);
  }
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mm-plan-ics?t=${token}`;
  return jsonResponse({
    ok: true,
    token,
    httpsUrl: base,
    webcalUrl: base.replace(/^https:/, "webcal:"),
  }, 200, cors);
});
