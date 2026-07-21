/* ==========================================================================
   MaleMetrix Growth OS — TikTok OAuth & API Worker (Cloudflare Worker)
   --------------------------------------------------------------------------
   Serverseitige TikTok-Anbindung: OAuth-Code-Flow, Token-Speicherung in KV,
   Token-Refresh, minimale API-Proxys (User-Info, Video-Liste). Tokens
   verlassen den Worker NIE — der Browser bekommt nur aufbereitete Daten.

   Endpunkte (alle gegen offizielle TikTok-Doku gebaut, geprüft 2026-07-20):
     Authorize: https://www.tiktok.com/v2/auth/authorize/
     Token:     https://open.tiktokapis.com/v2/oauth/token/
     Revoke:    https://open.tiktokapis.com/v2/oauth/revoke/
     UserInfo:  https://open.tiktokapis.com/v2/user/info/
     VideoList: https://open.tiktokapis.com/v2/video/list/

   SETUP (Details in GROWTH-OS.md):
     1) TikTok-Developer-App anlegen (developers.tiktok.com), Login Kit
        aktivieren, Redirect-URI = https://<worker-url>/auth/callback
        Scopes beantragen: user.info.basic, user.info.stats, video.list
     2) wrangler kv namespace create TOKENS
     3) wrangler secret put TT_CLIENT_KEY
        wrangler secret put TT_CLIENT_SECRET
        wrangler secret put ADMIN_KEY        (frei wählbar, lang & zufällig)
     4) wrangler deploy
     5) In js/config.js: growth.tiktok.apiBase + adminKey eintragen.

   wrangler.toml (Beispiel):
     name = "mm-tiktok"
     main = "tiktok-oauth-worker.js"
     compatibility_date = "2026-07-01"
     [[kv_namespaces]]
     binding = "TOKENS"
     id = "<kv-id>"

   Sicherheit: Admin-Key-Pflicht auf allen /api/*- und /auth/start-Routen,
   CSRF-State in KV (10 Min TTL), Rate-Limit pro IP, keine Token-Logs.
   ========================================================================== */

const TT_AUTH = "https://www.tiktok.com/v2/auth/authorize/";
const TT_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const TT_REVOKE = "https://open.tiktokapis.com/v2/oauth/revoke/";
const TT_USER = "https://open.tiktokapis.com/v2/user/info/";
const TT_VIDEOS = "https://open.tiktokapis.com/v2/video/list/";
const SCOPES = "user.info.basic,user.info.stats,video.list"; // minimal (§5)

const ALLOWED_ORIGINS = [
  "https://malemetrix.de",
  "https://www.malemetrix.de",
  "https://jayjaybaba.github.io"
];
let CORS = {
  "access-control-allow-origin": ALLOWED_ORIGINS[0],
  "access-control-allow-headers": "content-type,x-admin-key",
  "access-control-allow-methods": "GET,POST,OPTIONS"
};
function corsFor(request) {
  const o = request.headers.get("origin") || "";
  return Object.assign({}, CORS, {
    "access-control-allow-origin": ALLOWED_ORIGINS.indexOf(o) >= 0 ? o : ALLOWED_ORIGINS[0]
  });
}
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json" }, CORS)
  });
}
function html(body, status) {
  return new Response("<!doctype html><meta charset='utf-8'><body style='font-family:system-ui;background:#07090d;color:#e8edf5;display:grid;place-items:center;height:100vh'><div style='text-align:center'>" + body + "</div></body>", {
    status: status || 200, headers: { "content-type": "text/html; charset=utf-8" }
  });
}

/* ---------- Rate-Limit: max. 60 Requests / 10 Min / IP ---------- */
async function rateLimited(env, request) {
  try {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const key = "rl:" + ip + ":" + Math.floor(Date.now() / 600000);
    const cur = parseInt((await env.TOKENS.get(key)) || "0", 10) + 1;
    await env.TOKENS.put(key, String(cur), { expirationTtl: 660 });
    return cur > 60;
  } catch (e) { return false; }
}

function checkAdmin(env, request, url) {
  const k = request.headers.get("x-admin-key") || url.searchParams.get("key") || "";
  return !!env.ADMIN_KEY && k === env.ADMIN_KEY;
}

/* ---------- Token-Verwaltung (nur serverseitig) ---------- */
async function getTokens(env) {
  const raw = await env.TOKENS.get("tt:tokens");
  return raw ? JSON.parse(raw) : null;
}
async function saveTokens(env, t) {
  await env.TOKENS.put("tt:tokens", JSON.stringify(t));
}
async function freshAccessToken(env) {
  let t = await getTokens(env);
  if (!t) return null;
  if (Date.now() < t.expiresAt - 60000) return t.access_token;
  // Refresh (Doku: refresh_token kann rotieren — immer neu speichern)
  const body = new URLSearchParams({
    client_key: env.TT_CLIENT_KEY, client_secret: env.TT_CLIENT_SECRET,
    grant_type: "refresh_token", refresh_token: t.refresh_token
  });
  const res = await fetch(TT_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body
  });
  const data = await res.json();
  if (!data.access_token) return null;
  t = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || t.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
    open_id: data.open_id || t.open_id,
    scope: data.scope || t.scope,
    connectedAt: t.connectedAt, lastSync: t.lastSync
  };
  await saveTokens(env, t);
  return t.access_token;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    CORS = corsFor(request); // Origin-Reflexion nur innerhalb der Allowlist
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (await rateLimited(env, request)) return json({ error: "rate_limited" }, 429);

    /* ---------- OAuth Start ---------- */
    if (url.pathname === "/auth/start") {
      if (!checkAdmin(env, request, url)) return html("⛔ Ungültiger Key", 403);
      const state = crypto.randomUUID();
      await env.TOKENS.put("state:" + state, "1", { expirationTtl: 600 });
      const p = new URLSearchParams({
        client_key: env.TT_CLIENT_KEY,
        scope: SCOPES,
        response_type: "code",
        redirect_uri: url.origin + "/auth/callback",
        state: state
      });
      return Response.redirect(TT_AUTH + "?" + p.toString(), 302);
    }

    /* ---------- OAuth Callback (CSRF-State-Validierung) ---------- */
    if (url.pathname === "/auth/callback") {
      const state = url.searchParams.get("state") || "";
      const ok = await env.TOKENS.get("state:" + state);
      if (!ok) return html("⛔ Ungültiger State (CSRF-Schutz). Bitte erneut verbinden.", 400);
      await env.TOKENS.delete("state:" + state);
      const err = url.searchParams.get("error");
      if (err) return html("⛔ TikTok-Fehler: " + err + "<br>" + (url.searchParams.get("error_description") || ""), 400);
      const code = url.searchParams.get("code");
      if (!code) return html("⛔ Kein Code erhalten.", 400);
      const body = new URLSearchParams({
        client_key: env.TT_CLIENT_KEY, client_secret: env.TT_CLIENT_SECRET,
        code: decodeURIComponent(code), grant_type: "authorization_code",
        redirect_uri: url.origin + "/auth/callback"
      });
      const res = await fetch(TT_TOKEN, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body
      });
      const data = await res.json();
      if (!data.access_token) return html("⛔ Token-Tausch fehlgeschlagen: " + (data.error_description || data.error || "unbekannt"), 400);
      await saveTokens(env, {
        access_token: data.access_token, refresh_token: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
        open_id: data.open_id, scope: data.scope,
        connectedAt: new Date().toISOString(), lastSync: null
      });
      return html("✅ <strong>TikTok verbunden.</strong><br>Du kannst dieses Fenster schließen und im Growth OS „Verbindung aktualisieren“ klicken.");
    }

    /* ---------- Ab hier: Admin-API ---------- */
    if (!checkAdmin(env, request, url)) return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/api/status") {
      const t = await getTokens(env);
      if (!t) return json({ connected: false });
      let stats = null, display = null;
      try {
        const at = await freshAccessToken(env);
        if (at) {
          const r = await fetch(TT_USER + "?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count", {
            headers: { authorization: "Bearer " + at }
          });
          const d = await r.json();
          if (d.data && d.data.user) {
            display = d.data.user.display_name;
            stats = d.data.user;
            t.lastSync = new Date().toISOString();
            await saveTokens(env, t);
          }
        }
      } catch (e) { /* Status bleibt „verbunden ohne Stats“ */ }
      return json({
        connected: true, open_id: t.open_id, display_name: display,
        scopes: String(t.scope || "").split(","), stats: stats,
        lastSync: t.lastSync, connectedAt: t.connectedAt,
        videosAvailable: String(t.scope || "").indexOf("video.list") >= 0
      });
    }

    if (url.pathname === "/api/videos") {
      const at = await freshAccessToken(env);
      if (!at) return json({ error: "not_connected" }, 400);
      const r = await fetch(TT_VIDEOS + "?fields=id,title,create_time,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count", {
        method: "POST",
        headers: { authorization: "Bearer " + at, "content-type": "application/json" },
        body: JSON.stringify({ max_count: 20 })
      });
      const d = await r.json();
      return json({ videos: (d.data && d.data.videos) || [], hasMore: !!(d.data && d.data.has_more), source: "tiktok_api" });
    }

    if (url.pathname === "/api/disconnect" && request.method === "POST") {
      const t = await getTokens(env);
      if (t) {
        try {
          await fetch(TT_REVOKE, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ client_key: env.TT_CLIENT_KEY, client_secret: env.TT_CLIENT_SECRET, token: t.access_token })
          });
        } catch (e) {}
        await env.TOKENS.delete("tt:tokens");
      }
      return json({ disconnected: true });
    }

    return json({ error: "not_found" }, 404);
  }
};
