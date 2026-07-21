/* ==========================================================================
   MaleMetrix Growth OS — TikTok OAuth & API Worker (Cloudflare Worker) · v2
   --------------------------------------------------------------------------
   Serverseitige TikTok-Anbindung + optionale Daten-Zentrale (D1 + Cron).
   Tokens und Passwörter verlassen den Worker NIE.

   SICHERHEITSMODELL (v2 — nach Security-Audit):
   - KEIN Admin-Key im Frontend, in config.js, in URLs oder Query-Params.
   - Login: POST /auth/login mit ADMIN_PASSWORD (nur Worker-Secret).
     Antwort: kurzlebige, serverseitig gespeicherte Session (KV, 12 h TTL,
     jederzeit widerrufbar). Der Browser hält NUR diese Session-ID
     (sessionStorage) und sendet sie als Custom-Header "x-session".
   - Custom-Header-Pflicht auf ALLEN Auth-/API-Routen => CSRF-immun
     (Cross-Site-Formulare/Bilder können keine Custom-Header senden;
     Cross-Origin-fetch scheitert an der CORS-Allowlist).
   - Kein Cookie-Pfad: workers.dev ist cross-site zur Website; Third-Party-
     Cookies sind unzuverlässig. Wer zusätzliche Härtung will, legt
     Cloudflare Access vor die Worker-Route (Zero-Code, siehe GROWTH-OS.md).
   - OAuth-State: einmalig (Delete-on-use), 10 Min TTL, an die Session
     gebunden (State wird nur über eine authentifizierte Route erzeugt).
   - Login-Rate-Limit 5/10 Min/IP, generelles Limit 120/10 Min/IP.
   - Fehlerantworten enthalten nie Tokens; Logs enthalten nie Secrets.

   TOKEN-LIFECYCLE (v2 — Refresh-Bug behoben):
   - Ein einziges Token-Bundle in KV ("tt:tokens"): access_token,
     refresh_token, expiresAt, refreshExpiresAt, scope, open_id,
     connectedAt, refreshedAt.
   - freshTokens() liefert IMMER das aktuellste Bundle und speichert nach
     Refresh atomar genau dieses (Refresh-Rotation berücksichtigt).
   - lastSync/lastAutoSync liegen in EIGENEN KV-Keys — kein Codepfad
     schreibt je ein veraltetes Token-Bundle zurück.
   - Paralleler Refresh: kurzes KV-Lock ("tt:refreshing", 30 s) + Re-Read.

   ENDPUNKTE (offizielle TikTok-Doku, geprüft 2026-07-20):
     Authorize: https://www.tiktok.com/v2/auth/authorize/
     Token:     https://open.tiktokapis.com/v2/oauth/token/
     Revoke:    https://open.tiktokapis.com/v2/oauth/revoke/
     UserInfo:  https://open.tiktokapis.com/v2/user/info/
     VideoList: https://open.tiktokapis.com/v2/video/list/
   Zusätzlich (offizielle, freie API): PubMed E-Utilities (Research-Radar).

   SETUP (Details in GROWTH-OS.md):
     wrangler kv namespace create TOKENS
     wrangler secret put TT_CLIENT_KEY
     wrangler secret put TT_CLIENT_SECRET
     wrangler secret put ADMIN_PASSWORD     # NUR hier — nie im Frontend
     # optional (Phase 2 — zentrale Daten + tägliche Auto-Snapshots):
     wrangler d1 create mm-growth && wrangler d1 execute mm-growth --file=schema.sql
     wrangler deploy

   wrangler.toml (Beispiel):
     name = "mm-tiktok"
     main = "tiktok-oauth-worker.js"
     compatibility_date = "2026-07-01"
     [[kv_namespaces]]
     binding = "TOKENS"
     id = "<kv-id>"
     # Token-Koordinator (STARK konsistent — Pflicht für korrekte
     # Refresh-Serialisierung über alle PoPs):
     [[durable_objects.bindings]]
     name = "TOKENDO"
     class_name = "TokenDO"
     [[migrations]]
     tag = "v1"
     new_sqlite_classes = ["TokenDO"]
     # optional Phase 2:
     # [[d1_databases]]
     # binding = "DB"
     # database_name = "mm-growth"
     # database_id = "<d1-id>"
     # [triggers]
     # crons = ["0 5 * * *"]
   ========================================================================== */

const TT_AUTH = "https://www.tiktok.com/v2/auth/authorize/";
const TT_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const TT_REVOKE = "https://open.tiktokapis.com/v2/oauth/revoke/";
const TT_USER = "https://open.tiktokapis.com/v2/user/info/";
const TT_VIDEOS = "https://open.tiktokapis.com/v2/video/list/";
const SCOPES = "user.info.basic,user.info.stats,video.list"; // minimal

const ALLOWED_ORIGINS = [
  "https://malemetrix.de",
  "https://www.malemetrix.de",
  "https://jayjaybaba.github.io"
];
const SESSION_TTL = 43200; // 12 h

function corsHeaders(request) {
  const o = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.indexOf(o) >= 0 ? o : ALLOWED_ORIGINS[0],
    "access-control-allow-headers": "content-type,x-session",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "vary": "origin"
  };
}
function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json" }, corsHeaders(request))
  });
}
function page(body, status) {
  return new Response("<!doctype html><meta charset='utf-8'><body style='font-family:system-ui;background:#07090d;color:#e8edf5;display:grid;place-items:center;height:100vh'><div style='text-align:center;max-width:420px'>" + body + "</div></body>", {
    status: status || 200, headers: { "content-type": "text/html; charset=utf-8" }
  });
}
function timingSafeEqual(a, b) {
  const ea = new TextEncoder().encode(String(a));
  const eb = new TextEncoder().encode(String(b));
  if (ea.length !== eb.length) {
    // dennoch konstant über eigene Länge iterieren
    let x = 1;
    for (let i = 0; i < ea.length; i++) x |= ea[i];
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Rate-Limits ---------- */
async function bumpCounter(env, key, ttl) {
  const cur = parseInt((await env.TOKENS.get(key)) || "0", 10) + 1;
  await env.TOKENS.put(key, String(cur), { expirationTtl: ttl });
  return cur;
}
async function rateLimited(env, request, bucket, max) {
  try {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const key = "rl:" + bucket + ":" + ip + ":" + Math.floor(Date.now() / 600000);
    return (await bumpCounter(env, key, 660)) > max;
  } catch (e) { return false; }
}

/* ---------- Sessions (serverseitig, kurzlebig, widerrufbar) ---------- */
async function createSession(env) {
  const id = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  await env.TOKENS.put("sess:" + id, JSON.stringify({ created: Date.now() }), { expirationTtl: SESSION_TTL });
  return id;
}
async function getSession(env, request) {
  const id = request.headers.get("x-session") || "";
  if (!id || id.length < 32) return null;
  const raw = await env.TOKENS.get("sess:" + id);
  return raw ? { id: id } : null;
}

/* ======================================================================
   TOKEN-KOORDINATOR (Durable Object) — STARK konsistente Serialisierung.

   Workers KV ist eventual-consistent und kennt kein Compare-and-Swap;
   ein KV-„Lock“ kann Requests aus verschiedenen PoPs nicht garantiert
   serialisieren. Deshalb liegt das Token-Bundle in EINEM Durable Object
   (global genau eine Instanz, Single-Threaded): Alle konkurrierenden
   /fresh-Aufrufe teilen sich dieselbe In-Flight-Refresh-Promise —
   es ist damit technisch unmöglich, dass zwei Requests gleichzeitig
   denselben Refresh Token verwenden oder konkurrierende rotierte
   Bundles speichern. DO-Storage ist stark konsistent.

   Fallback: Ohne TOKENDO-Binding (altes wrangler.toml) läuft der
   bisherige Best-Effort-KV-Pfad weiter — Deploy bricht nicht, aber
   die Garantie gilt nur mit DO (siehe wrangler.toml-Vorlage oben).
   ====================================================================== */
export class TokenDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.refreshing = null; // geteilte In-Flight-Promise (Instanz-lokal = global, da 1 Instanz)
  }
  async fetch(request) {
    const url = new URL(request.url);
    const out = (d) => new Response(JSON.stringify(d == null ? null : d), { headers: { "content-type": "application/json" } });
    if (url.pathname === "/load") return out(await this.state.storage.get("tokens"));
    if (url.pathname === "/save") {
      await this.state.storage.put("tokens", await request.json());
      return out({ ok: true });
    }
    if (url.pathname === "/delete") {
      await this.state.storage.delete("tokens");
      return out({ ok: true });
    }
    if (url.pathname === "/fresh") {
      const t = await this.state.storage.get("tokens");
      if (!t) return out({ reason: "not_connected" });
      if (Date.now() < t.expiresAt - 60000) return out({ bundle: t });
      if (t.refreshExpiresAt && Date.now() > t.refreshExpiresAt) return out({ reason: "refresh_expired" });
      /* check-and-set der Promise ist synchron => atomar im Single-Thread-DO */
      if (!this.refreshing) {
        this.refreshing = this._refresh().finally(() => { this.refreshing = null; });
      }
      const fresh = await this.refreshing;
      return out(fresh ? { bundle: fresh } : { reason: "refresh_failed" });
    }
    return out({ error: "not_found" });
  }
  async _refresh() {
    // Re-Read: falls ein früherer Durchlauf schon gespeichert hat
    const cur = await this.state.storage.get("tokens");
    if (!cur) return null;
    if (Date.now() < cur.expiresAt - 60000) return cur;
    const res = await fetch(TT_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: this.env.TT_CLIENT_KEY, client_secret: this.env.TT_CLIENT_SECRET,
        grant_type: "refresh_token", refresh_token: cur.refresh_token
      })
    });
    const data = await res.json();
    if (!data.access_token) return null;
    const fresh = bundleFromTokenResponse(data, cur);
    await this.state.storage.put("tokens", fresh); // einzige Schreibstelle nach Refresh
    return fresh;
  }
}

function tokenStub(env) {
  if (!env.TOKENDO) return null;
  return env.TOKENDO.get(env.TOKENDO.idFromName("tiktok"));
}

/* ---------- Token-Bundle-Zugriff (DO bevorzugt, KV-Fallback) ---------- */
async function loadTokens(env) {
  const stub = tokenStub(env);
  if (stub) return await (await stub.fetch("https://do/load")).json();
  const raw = await env.TOKENS.get("tt:tokens");
  return raw ? JSON.parse(raw) : null;
}
async function saveTokens(env, t) {
  const stub = tokenStub(env);
  if (stub) { await stub.fetch("https://do/save", { method: "POST", body: JSON.stringify(t) }); return; }
  await env.TOKENS.put("tt:tokens", JSON.stringify(t));
}
async function deleteTokens(env) {
  const stub = tokenStub(env);
  if (stub) { await stub.fetch("https://do/delete", { method: "POST" }); return; }
  await env.TOKENS.delete("tt:tokens");
}
function bundleFromTokenResponse(data, prev) {
  const now = Date.now();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || (prev && prev.refresh_token) || null,
    expiresAt: now + (data.expires_in || 86400) * 1000,
    refreshExpiresAt: data.refresh_expires_in
      ? now + data.refresh_expires_in * 1000
      : (prev && prev.refreshExpiresAt) || null,
    scope: data.scope || (prev && prev.scope) || "",
    open_id: data.open_id || (prev && prev.open_id) || null,
    connectedAt: (prev && prev.connectedAt) || new Date(now).toISOString(),
    refreshedAt: new Date(now).toISOString()
  };
}
/* Liefert IMMER das aktuell gespeicherte, gültige Bundle (refresht bei Bedarf).
   Mit TOKENDO-Binding: garantiert serialisiert (siehe TokenDO oben).
   KV-Fallback nur ohne Binding — Best-Effort-Lock, dokumentiert. */
async function freshTokens(env) {
  const stub = tokenStub(env);
  if (stub) {
    const d = await (await stub.fetch("https://do/fresh")).json();
    return d && d.bundle ? d.bundle : null;
  }
  /* ---------- KV-Fallback (nur ohne DO-Binding) ---------- */
  let t = await loadTokens(env);
  if (!t) return null;
  if (Date.now() < t.expiresAt - 60000) return t;
  if (t.refreshExpiresAt && Date.now() > t.refreshExpiresAt) return null;
  const lockId = crypto.randomUUID();
  const existing = await env.TOKENS.get("tt:refreshing");
  if (!existing) {
    await env.TOKENS.put("tt:refreshing", lockId, { expirationTtl: 30 });
    await sleep(60);
  }
  const owner = await env.TOKENS.get("tt:refreshing");
  if (owner !== lockId) {
    for (let i = 0; i < 6; i++) {
      await sleep(500);
      const again = await loadTokens(env);
      if (again && Date.now() < again.expiresAt - 60000) return again;
      if (!(await env.TOKENS.get("tt:refreshing"))) break;
    }
    return await loadTokens(env);
  }
  try {
    t = await loadTokens(env);
    if (!t) return null;
    if (Date.now() < t.expiresAt - 60000) return t;
    const res = await fetch(TT_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: env.TT_CLIENT_KEY, client_secret: env.TT_CLIENT_SECRET,
        grant_type: "refresh_token", refresh_token: t.refresh_token
      })
    });
    const data = await res.json();
    if (!data.access_token) {
      const again = await loadTokens(env);
      if (again && Date.now() < again.expiresAt - 60000) return again;
      return null;
    }
    const fresh = bundleFromTokenResponse(data, t);
    await saveTokens(env, fresh);
    return fresh;
  } finally {
    await env.TOKENS.delete("tt:refreshing");
  }
}

/* ---------- TikTok-API-Helfer ---------- */
async function ttUserInfo(at) {
  const r = await fetch(TT_USER + "?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count", {
    headers: { authorization: "Bearer " + at }
  });
  const d = await r.json();
  return (d.data && d.data.user) || null;
}
async function ttVideoPage(at, cursor) {
  const r = await fetch(TT_VIDEOS + "?fields=id,title,create_time,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count", {
    method: "POST",
    headers: { authorization: "Bearer " + at, "content-type": "application/json" },
    body: JSON.stringify(cursor ? { max_count: 20, cursor: cursor } : { max_count: 20 })
  });
  return await r.json();
}
/* Cursor-Pagination über ALLE eigenen Videos (Display API liefert max. 20 pro
   Seite). Sicherheitslimit gegen Endlosschleifen/Kosten; bei API-Fehler
   mitten in der Pagination werden die bereits geladenen Seiten zurückgegeben
   und der Fehler gemeldet statt verschluckt. */
const VIDEO_CAP = 250; // ~12 Seiten — weit über aktueller Kanalgröße, anpassbar
async function ttAllVideos(at) {
  const videos = [];
  let cursor = null, error = null, truncated = false;
  for (let page = 0; page < Math.ceil(VIDEO_CAP / 20); page++) {
    let d;
    try { d = await ttVideoPage(at, cursor); }
    catch (e) { error = "network:" + e.message; break; }
    if (d.error && d.error.code && d.error.code !== "ok") { error = d.error.message || d.error.code; break; }
    const batch = (d.data && d.data.videos) || [];
    videos.push(...batch);
    if (!(d.data && d.data.has_more) || !batch.length) break;
    cursor = d.data.cursor;
    if (videos.length >= VIDEO_CAP) { truncated = true; break; }
  }
  return { videos: videos.slice(0, VIDEO_CAP), truncated, error };
}

/* ---------- D1-Snapshots (Phase 2, optional) ---------- */
async function snapshotToD1(env, user, videos) {
  if (!env.DB) return false;
  const ts = new Date().toISOString();
  if (user) {
    await env.DB.prepare(
      "INSERT INTO account_snapshots (ts, follower_count, following_count, likes_count, video_count) VALUES (?1,?2,?3,?4,?5)"
    ).bind(ts, user.follower_count || 0, user.following_count || 0, user.likes_count || 0, user.video_count || 0).run();
  }
  for (const v of videos || []) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO video_snapshots (video_id, ts, title, views, likes, comments, shares, duration, share_url) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)"
    ).bind(String(v.id), ts, v.title || "", v.view_count || 0, v.like_count || 0, v.comment_count || 0, v.share_count || 0, v.duration || 0, v.share_url || "").run();
  }
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
    if (await rateLimited(env, request, "all", 120)) return json({ error: "rate_limited" }, 429, request);

    /* ---------- Login / Logout (kein Secret im Frontend) ---------- */
    if (url.pathname === "/auth/login" && request.method === "POST") {
      if (await rateLimited(env, request, "login", 5)) return json({ error: "rate_limited" }, 429, request);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      if (!env.ADMIN_PASSWORD || !timingSafeEqual(body.password || "", env.ADMIN_PASSWORD)) {
        return json({ error: "invalid_credentials" }, 401, request);
      }
      const sess = await createSession(env);
      return json({ session: sess, expiresIn: SESSION_TTL }, 200, request);
    }
    if (url.pathname === "/auth/logout" && request.method === "POST") {
      const s = await getSession(env, request);
      if (s) await env.TOKENS.delete("sess:" + s.id);
      return json({ ok: true }, 200, request);
    }

    /* ---------- OAuth-Callback (öffentlich; State = einmalig + TTL) ---------- */
    if (url.pathname === "/auth/callback") {
      const state = url.searchParams.get("state") || "";
      const stored = state ? await env.TOKENS.get("state:" + state) : null;
      if (!stored) return page("⛔ Ungültiger oder bereits verwendeter State (CSRF-/Replay-Schutz). Bitte im Growth OS neu verbinden.", 400);
      await env.TOKENS.delete("state:" + state); // Delete-on-use: kein Replay
      const err = url.searchParams.get("error");
      if (err) return page("⛔ TikTok-Fehler: " + err + "<br>" + (url.searchParams.get("error_description") || ""), 400);
      const code = url.searchParams.get("code");
      if (!code) return page("⛔ Kein Code erhalten.", 400);
      const res = await fetch(TT_TOKEN, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: env.TT_CLIENT_KEY, client_secret: env.TT_CLIENT_SECRET,
          code: decodeURIComponent(code), grant_type: "authorization_code",
          redirect_uri: url.origin + "/auth/callback"
        })
      });
      const data = await res.json();
      if (!data.access_token) return page("⛔ Token-Tausch fehlgeschlagen: " + (data.error_description || data.error || "unbekannt"), 400);
      await saveTokens(env, bundleFromTokenResponse(data, null));
      return page("✅ <strong>TikTok verbunden.</strong><br>Fenster schließen und im Growth OS „Verbindung aktualisieren“ klicken.");
    }

    /* ---------- Ab hier: Session-Pflicht (Custom-Header ⇒ CSRF-immun) ---------- */
    const sess = await getSession(env, request);
    if (!sess) return json({ error: "unauthorized" }, 401, request);

    /* OAuth-Start: an Session gebunden, State einmalig, URL im Body (nie ?key=) */
    if (url.pathname === "/auth/start" && request.method === "POST") {
      const state = crypto.randomUUID();
      await env.TOKENS.put("state:" + state, JSON.stringify({ sess: sess.id }), { expirationTtl: 600 });
      const p = new URLSearchParams({
        client_key: env.TT_CLIENT_KEY, scope: SCOPES, response_type: "code",
        redirect_uri: url.origin + "/auth/callback", state: state
      });
      return json({ url: TT_AUTH + "?" + p.toString() }, 200, request);
    }

    if (url.pathname === "/api/status") {
      const t = await freshTokens(env);
      const lastSync = await env.TOKENS.get("tt:lastSync");
      const lastAutoSync = await env.TOKENS.get("tt:lastAutoSync");
      if (!t) {
        const stale = await loadTokens(env);
        return json({
          connected: false,
          reason: stale ? "token_expired_reconnect" : "not_connected",
          sync: { enabled: !!env.DB, lastAutoSync: lastAutoSync || null }
        }, 200, request);
      }
      let user = null;
      try { user = await ttUserInfo(t.access_token); } catch (e) { /* Status bleibt „verbunden ohne Stats“ */ }
      if (user) await env.TOKENS.put("tt:lastSync", new Date().toISOString());
      return json({
        connected: true, open_id: t.open_id,
        display_name: user ? user.display_name : null, stats: user,
        scopes: String(t.scope || "").split(","),
        videosAvailable: String(t.scope || "").indexOf("video.list") >= 0,
        lastSync: user ? new Date().toISOString() : lastSync,
        connectedAt: t.connectedAt, refreshedAt: t.refreshedAt,
        sync: { enabled: !!env.DB, lastAutoSync: lastAutoSync || null }
      }, 200, request);
    }

    if (url.pathname === "/api/videos") {
      const t = await freshTokens(env);
      if (!t) return json({ error: "not_connected" }, 400, request);
      const all = await ttAllVideos(t.access_token);
      if (all.error && !all.videos.length) {
        return json({ error: "tiktok_api", detail: all.error }, 502, request);
      }
      return json({
        videos: all.videos, count: all.videos.length, truncated: all.truncated,
        partialError: all.error || null, source: "tiktok_api"
      }, 200, request);
    }

    if (url.pathname === "/api/disconnect" && request.method === "POST") {
      const t = await loadTokens(env);
      if (t) {
        try {
          await fetch(TT_REVOKE, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ client_key: env.TT_CLIENT_KEY, client_secret: env.TT_CLIENT_SECRET, token: t.access_token })
          });
        } catch (e) {}
        await deleteTokens(env);
        await env.TOKENS.delete("tt:lastSync");
      }
      return json({ disconnected: true }, 200, request);
    }

    /* ---------- Research-Radar: PubMed E-Utilities (offizielle freie API) ---------- */
    if (url.pathname === "/api/research") {
      const q = (url.searchParams.get("q") || "").slice(0, 120);
      if (!q) return json({ error: "missing_q" }, 400, request);
      try {
        const es = await fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=date&reldate=120&retmax=8&term=" + encodeURIComponent(q));
        const ids = ((await es.json()).esearchresult || {}).idlist || [];
        if (!ids.length) return json({ results: [], source: "pubmed" }, 200, request);
        const su = await fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=" + ids.join(","));
        const sum = (await su.json()).result || {};
        const results = ids.map((id) => ({
          id: id, title: (sum[id] || {}).title || "", date: (sum[id] || {}).pubdate || "",
          url: "https://pubmed.ncbi.nlm.nih.gov/" + id + "/"
        })).filter((r) => r.title);
        return json({ results: results, source: "pubmed" }, 200, request);
      } catch (e) {
        return json({ error: "pubmed_unavailable" }, 502, request);
      }
    }

    /* ---------- Cloud-Sync (Phase 2, D1) ---------- */
    if (url.pathname === "/api/sync/push" && request.method === "POST") {
      if (!env.DB) return json({ error: "sync_not_configured" }, 501, request);
      let body = null;
      try { body = await request.json(); } catch (e) {}
      if (!body || body.app !== "malemetrix-growth-os") return json({ error: "invalid_payload" }, 400, request);
      const raw = JSON.stringify(body);
      if (raw.length > 4000000) return json({ error: "too_large" }, 413, request);
      await env.DB.prepare(
        "INSERT INTO kv_backup (id, data, updated_at) VALUES (1, ?1, ?2) ON CONFLICT(id) DO UPDATE SET data=?1, updated_at=?2"
      ).bind(raw, new Date().toISOString()).run();
      return json({ ok: true, updatedAt: new Date().toISOString() }, 200, request);
    }
    if (url.pathname === "/api/sync/pull") {
      if (!env.DB) return json({ error: "sync_not_configured" }, 501, request);
      const row = await env.DB.prepare("SELECT data, updated_at FROM kv_backup WHERE id=1").first();
      if (!row) return json({ data: null }, 200, request);
      return json({ data: JSON.parse(row.data), updatedAt: row.updated_at }, 200, request);
    }
    /* Cloud-Löschung (DSGVO): getrennte Scopes, ehrlich benannt.
       backup     = kv_backup (Growth-OS-Datenbestand)
       timeseries = account_snapshots + video_snapshots (TikTok-Historie)
       all        = beides */
    if (url.pathname === "/api/sync/delete" && request.method === "POST") {
      if (!env.DB) return json({ error: "sync_not_configured" }, 501, request);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const scope = body.scope;
      if (["backup", "timeseries", "all"].indexOf(scope) < 0) return json({ error: "invalid_scope" }, 400, request);
      const deleted = [];
      if (scope === "backup" || scope === "all") {
        await env.DB.prepare("DELETE FROM kv_backup").run();
        deleted.push("kv_backup");
      }
      if (scope === "timeseries" || scope === "all") {
        await env.DB.prepare("DELETE FROM account_snapshots").run();
        await env.DB.prepare("DELETE FROM video_snapshots").run();
        deleted.push("account_snapshots", "video_snapshots");
      }
      return json({ ok: true, deleted: deleted }, 200, request);
    }
    if (url.pathname === "/api/sync/timeseries") {
      if (!env.DB) return json({ error: "sync_not_configured" }, 501, request);
      const vids = await env.DB.prepare("SELECT video_id, ts, title, views, likes, comments, shares, share_url FROM video_snapshots ORDER BY ts DESC LIMIT 500").all();
      const acct = await env.DB.prepare("SELECT ts, follower_count, likes_count, video_count FROM account_snapshots ORDER BY ts DESC LIMIT 90").all();
      return json({ videoSnapshots: vids.results || [], accountSnapshots: acct.results || [], source: "tiktok_api_cron" }, 200, request);
    }

    return json({ error: "not_found" }, 404, request);
  },

  /* ---------- Täglicher Cron: automatische Metric-Snapshots nach D1
       (ALLE Videos via Cursor-Pagination, Sicherheitslimit VIDEO_CAP) ---------- */
  async scheduled(event, env, ctx) {
    const t = await freshTokens(env);
    if (!t) return;
    let user = null, videos = [];
    try { user = await ttUserInfo(t.access_token); } catch (e) {}
    try {
      const all = await ttAllVideos(t.access_token);
      videos = all.videos;
    } catch (e) {}
    try {
      if (await snapshotToD1(env, user, videos)) {
        await env.TOKENS.put("tt:lastAutoSync", new Date().toISOString());
      }
    } catch (e) { /* D1 nicht gebunden oder Fehler — kein Crash */ }
  }
};
