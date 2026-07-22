/* ==========================================================================
   MALEMETRIX ACCOUNT ADAPTER — MM.account  (Phase 2.2: True Ownership & Sync)
   --------------------------------------------------------------------------
   Einzige Grenze zwischen MaleMetrix und dem Backend. Kein Feature ruft
   Supabase direkt. Business-Logik bleibt eingefroren — dieser Adapter liest/
   schreibt ausschließlich Persistenz (localStorage ↔ Cloud) und löst
   Produkt-Zugriff auf.

   Architektur:
     - DOMAIN SYNC ENGINE: registrierte Domains (score, program, profile …)
       mit eigener Dirty-Flag, eigenem Flush, eigenem Retry/Backoff. Ein
       Fehler in einer Domain blockiert keine andere. Dirty-Zustand wird
       persistiert und beim nächsten Start / online / sichtbar erneut geflusht.
     - PRODUKT-ZUGRIFF: Account-Entitlement → resolveProductAccess(productKey)
       → serverseitig autorisiertes Schlüsselmaterial (Edge Function) → Vault
       entschlüsselt. Legacy-Codes bleiben als lokaler Fallback. Der Schlüssel
       steht NIE im Repo/Client-Code; lokal bleibt der kryptografische
       Vault-Decrypt die einzige Autorität.
     - ZYKLUS-LIFECYCLE: active | completed | archived. Reset archiviert den
       Cloud-Zyklus (kein Zombie-Hydrate auf Gerät B). Max. 1 aktiver Zyklus.

   Backends: 'supabase' (konfiguriert) · 'test' (window.__MM_TEST_CLOUD, nur
   E2E) · null (lokaler Modus — Website voll funktionsfähig).
   Zustände: 'loading' | 'local' | 'signed_out' | 'signed_in'
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var CFG = window.MM_CONFIG || {};
  var PUBKEY = CFG.supabasePublishableKey || CFG.supabaseAnonKey || "";
  var VALIDATION_VERSION = 2; // P1-11: Version des lokalen Zugriffs-Nachweises

  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : (JSON.parse(localStorage.getItem("mm_" + k)) ?? d); } catch (e) { return d; } },
    setRaw: function (k, v) { try { localStorage.setItem("mm_" + k, JSON.stringify(v)); } catch (e) {} },  // KEIN mm:store-Event → hydrationssicher
    removeRaw: function (k) { try { localStorage.removeItem("mm_" + k); } catch (e) {} }
  };

  var backend = null;
  var _user = null, _profile = null, _entitlements = null;
  var _cloudScore = null, _cloudCycle = null;
  var _state = "loading";
  var _subs = [];
  var _initPromise = null;
  var _accessCache = {};   // productKey -> material (nur Speicher, nie persistiert)

  function configured() { return !!(CFG.supabaseUrl && PUBKEY); }
  function emit() { var s = api.snapshot(); _subs.forEach(function (cb) { try { cb(s); } catch (e) {} }); }
  function setState(s) { if (s !== _state) { _state = s; emit(); } }
  function nowStamp() { try { return new Date().toISOString(); } catch (e) { return ""; } }

  /* ---------- DST-sichere, rein LESENDE Programm-Ableitung ---------- */
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }
  function localScore() { var r = S.get("check_result", null); return (r && typeof r === "object") ? r : null; }
  function goal() { return S.get("c2_goal", "") || ""; }
  function bottleneck() { return S.get("c2_bottleneck", "") || ""; }

  function programView() {
    var start = S.get("c2_start", ""), g = goal(), b = bottleneck();
    if (!start || !g) return { active: false, mode: g || "", bottleneck: b || "" };
    var paused = S.get("c2_paused_days", 0) || 0;
    var ref = S.get("c2_pause_since", "") || todayYmd();
    var notStarted = diffDays(start, todayYmd()) < 0;
    var pd = Math.max(1, Math.max(1, diffDays(start, ref) + 1) - paused);
    var clamped = Math.min(84, pd), over = pd > 84;
    var week = Math.min(12, Math.max(1, Math.ceil(clamped / 7)));
    var phase = week <= 3 ? 1 : week <= 6 ? 2 : week <= 9 ? 3 : 4;
    var daily = S.get("c2_daily", {}) || {}, active = 0;
    if (!notStarted) for (var i = 1; i <= clamped; i++) { var rec = daily["d" + i] || {}; if (rec.p || rec.move || rec.recover) active++; }
    var pct = (!notStarted && clamped) ? Math.round(active / clamped * 100) : 0;
    var nextCp = week < 4 ? 4 : week < 8 ? 8 : week < 12 ? 12 : null;
    return { active: true, notStarted: notStarted, over: over, mode: g, bottleneck: b, day: clamped, week: week, phase: phase, paused: !!S.get("c2_pause_since", ""), consistency: pct, active_days: active, nextReviewDays: nextCp ? Math.max(0, (nextCp * 7) - clamped) : null };
  }

  /* =========================================================================
     PROGRAM PERSISTENCE SCHEMA v2 (P1: vollständiges Inventar, kein Raten)
     CLOUD PERSISTENT — reist über Geräte.
     LOCAL UI ONLY   — c2_view (Tab), c2_min_<datum> (Full/Min-Toggle).
     SYNC METADATA   — c2_state_version, c2_synced_version, account_*.
     ========================================================================= */
  var PROG_KEYS_STATIC = ["c2_goal", "c2_bottleneck", "c2_start", "c2_days", "c2_nutrition", "c2_daily", "c2_pulse", "course_rechecks", "c2_mode_history", "c2_bn_history", "c2_paused_days", "c2_pause_since", "c2_dayswap", "c2_lifts", "c2_ver", "c2_archive"];
  var PROG_KEYS_DYNAMIC = [/^c2_reassess_\d+$/];            // erlaubte dynamische Namespaces (getestete Allowlist)
  var PROG_LOCAL_ONLY = [/^c2_min_/, /^c2_view$/];
  function collectProgramState() {
    var o = { _schema: 2 };
    PROG_KEYS_STATIC.forEach(function (k) { var v = S.get(k, null); if (v != null) o[k] = v; });
    // Dynamische Keys über echtes localStorage-Scanning (Allowlist, nie "alles")
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var raw = localStorage.key(i); if (!raw || raw.indexOf("mm_") !== 0) continue;
        var k2 = raw.slice(3);
        if (PROG_KEYS_DYNAMIC.some(function (re) { return re.test(k2); })) { var v2 = S.get(k2, null); if (v2 != null) o[k2] = v2; }
      }
    } catch (e) {}
    return o;
  }
  function writeProgramState(state, version) {
    if (!state || typeof state !== "object") return;
    Object.keys(state).forEach(function (k) {
      if (k === "_schema" || k === "state_version") return;
      var isStatic = PROG_KEYS_STATIC.indexOf(k) >= 0;
      var isDyn = PROG_KEYS_DYNAMIC.some(function (re) { return re.test(k); });
      if (isStatic || isDyn) S.setRaw(k, state[k]);                 // setRaw → kein Sync-Loop
    });
    if (version != null) { S.setRaw("c2_state_version", version); S.setRaw("c2_synced_version", version); }
  }
  function stateVersion() { return S.get("c2_state_version", 0) || 0; }
  function bumpStateVersion() { var v = stateVersion() + 1; S.setRaw("c2_state_version", v); return v; }

  /* =========================================================================
     LOKALE ZUGRIFFS-VALIDIERUNG (P1-11/12) — Vault-Krypto ist die Autorität.
     Alte, unverifizierte account_entitlements werden beim Upgrade verworfen
     und nur nach echtem AES-GCM-Decrypt neu vergeben. localStorage steuert
     nur Komfort-UI — Premium-Inhalt öffnet ausschließlich per Decrypt.
     ========================================================================= */
  function tryValidateCode(code) {
    if (!window.MM || !MM.vault || !document.getElementById("courseVault")) return Promise.resolve(false);
    var c = MM.vault.norm(code);
    if (!c) return Promise.resolve(false);
    return MM.vault.open("courseVault", c).then(function () { return true; }).catch(function () { return false; });
  }
  function localEntitlements() { var e = S.get("account_entitlements", []); return Array.isArray(e) ? e.slice() : []; }
  function grantLocal(keys) {
    var e = localEntitlements();
    keys.forEach(function (k) { if (e.indexOf(k) < 0) e.push(k); });
    S.setRaw("account_entitlements", e); _entitlements = null;
  }
  function revalidateStoredCode() {
    var meta = S.get("account_access_validation", null);
    if (meta && meta.version === VALIDATION_VERSION) return Promise.resolve();
    // Validierung braucht den Vault-Payload; auf Seiten ohne Payload aufschieben
    // (Entitlements sind dort nur advisory — echter Zugriff verlangt Decrypt).
    if (!document.getElementById("courseVault")) return Promise.resolve();
    // P1-11: historische, unverifizierte Entitlements verwerfen …
    if (localEntitlements().length) S.setRaw("account_entitlements", []);
    _entitlements = null;
    var code = S.get("course_code", "");
    var p = code ? tryValidateCode(code) : Promise.resolve(false);
    // … und nur nach kryptografischem Beweis neu vergeben.
    return p.then(function (ok) {
      if (ok) grantLocal(["protocol", "twelve_week"]);
      S.setRaw("account_access_validation", { version: VALIDATION_VERSION, validated: ok, validated_at: nowStamp() });
    });
  }

  /* ================= BACKENDS ================= */
  function makeTestBackend() {
    var C = window.__MM_TEST_CLOUD;
    C.tables = C.tables || {}; ["profiles", "entitlements", "score_results", "program_cycles"].forEach(function (t) { C.tables[t] = C.tables[t] || []; });
    function rows(t) { return C.tables[t]; }
    return {
      kind: "test",
      getSession: function () { return Promise.resolve(C.user || null); },
      signIn: function () { return Promise.resolve({ ok: true, message: "test" }); },
      signOut: function () { C.user = null; return Promise.resolve(); },
      onAuthChange: function () {},
      select: function (t, q) {
        q = q || {}; var out = rows(t).filter(function (r) { return !q.eq || Object.keys(q.eq).every(function (k) { return r[k] === q.eq[k]; }); });
        if (q.order) out = out.slice().sort(function (a, b) { return (a[q.order] < b[q.order] ? 1 : -1); });
        if (q.limit) out = out.slice(0, q.limit);
        return Promise.resolve({ data: q.single ? (out[0] || null) : out, error: null });
      },
      upsert: function (t, row, onConflict) {
        if (C.failUpsert === t) return Promise.resolve({ data: null, error: { message: "forced_fail" } });
        var keys = (onConflict || "id").split(",");
        var arr = rows(t); var idx = arr.findIndex(function (r) { return keys.every(function (k) { return r[k] === row[k]; }); });
        if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], row); else arr.push(Object.assign({ id: arr.length + 1 }, row));
        C.upsertCount = (C.upsertCount || 0) + 1;
        return Promise.resolve({ data: row, error: null });
      },
      rpc: function (name, args) {
        if (name === "claim_access_code") {
          var rec = (C.codes || {})[(args.code || "").toUpperCase()];
          if (!rec || !rec.active || (rec.max_uses != null && (rec.used || 0) >= rec.max_uses)) return Promise.resolve({ data: null, error: { message: "invalid_code" } });
          rec.used = (rec.used || 0) + 1;
          (rec.product_keys || ["protocol", "twelve_week"]).forEach(function (k) { rows("entitlements").push({ user_id: C.user.id, product_key: k, status: "active" }); });
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: { message: "unknown_rpc" } });
      },
      // Simuliert die Edge Function: nur mit aktivem Entitlement gibt es Material.
      resolveAccess: function (productKey) {
        var has = rows("entitlements").some(function (e) { return e.user_id === C.user.id && e.product_key === productKey && e.status === "active"; });
        if (!has) return Promise.resolve({ data: null, error: { message: "unauthorized" } });
        var m = (C.vaultKeys || {})[productKey];
        return Promise.resolve(m ? { data: { material: m }, error: null } : { data: null, error: { message: "unavailable" } });
      },
      deleteAccount: function () {
        var uid = C.user.id;
        Object.keys(C.tables).forEach(function (t) { C.tables[t] = C.tables[t].filter(function (r) { return r.user_id !== uid; }); });
        C.user = null;
        return Promise.resolve({ data: { ok: true }, error: null });
      }
    };
  }

  function makeSupabaseBackend(client) {
    return {
      kind: "supabase", _c: client,
      getSession: function () { return client.auth.getSession().then(function (r) { return r && r.data && r.data.session ? r.data.session.user : null; }); },
      signIn: function (email) {
        var redirect = (CFG.siteUrl || location.origin) + "/mein-protokoll.html";
        return client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect } })
          .then(function (r) { return r.error ? { ok: false, message: r.error.message } : { ok: true, message: "Magic Link gesendet — prüfe dein Postfach." }; });
      },
      signOut: function () { return client.auth.signOut(); },
      onAuthChange: function (cb) { client.auth.onAuthStateChange(function (_e, s) { cb(s ? s.user : null); }); },
      select: function (t, q) {
        q = q || {}; var b = client.from(t).select("*");
        if (q.eq) Object.keys(q.eq).forEach(function (k) { b = b.eq(k, q.eq[k]); });
        if (q.order) b = b.order(q.order, { ascending: false });
        if (q.limit) b = b.limit(q.limit);
        if (q.single) b = b.maybeSingle();
        return b.then(function (r) { return { data: r.data, error: r.error, status: r.status }; });
      },
      upsert: function (t, row, onConflict) { return client.from(t).upsert(row, { onConflict: onConflict }).select().then(function (r) { return { data: r.data, error: r.error, status: r.status }; }); },
      rpc: function (name, args) { return client.rpc(name, args).then(function (r) { return { data: r.data, error: r.error }; }); },
      resolveAccess: function (productKey) {
        // Edge Function: verifiziert JWT + Entitlement serverseitig, Secret bleibt dort.
        return client.functions.invoke("resolve-product-access", { body: { product_key: productKey } })
          .then(function (r) { return { data: r.data, error: r.error }; });
      },
      deleteAccount: function () {
        return client.functions.invoke("delete-account", { body: { confirm: true } })
          .then(function (r) { return { data: r.data, error: r.error }; });
      }
    };
  }

  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
      s.async = true; s.onload = function () { resolve(window.supabase); }; s.onerror = function () { reject(new Error("sdk_load_failed")); };
      document.head.appendChild(s);
    });
  }

  /* =========================================================================
     DOMAIN SYNC ENGINE (P1-23…28) — dirty queue, unabhängige Flushes,
     persistierter Pending-Zustand, Retry (online/init/visibility), Backoff.
     Zukunft: registerDomain("tracker" | "nutrition" | "stack" | …, adapter).
     ========================================================================= */
  var DOMAINS = {};
  var _flushTimer = null;
  var _flushing = false;
  function syncMeta() { var m = S.get("account_sync", null); return (m && typeof m === "object") ? m : {}; }
  function setSyncMeta(m) { S.setRaw("account_sync", m); }
  function markDirty(domain, extra) {
    var m = syncMeta(); m[domain] = Object.assign({}, m[domain], { dirty: true, since: nowStamp() }, extra || {});
    setSyncMeta(m); scheduleFlush();
  }
  function markClean(domain) { var m = syncMeta(); if (m[domain]) { m[domain] = { dirty: false, attempts: 0 }; setSyncMeta(m); } }
  function registerDomain(name, adapter) { DOMAINS[name] = adapter; }
  function scheduleFlush(delay) {
    clearTimeout(_flushTimer);
    _flushTimer = setTimeout(flushDirty, delay != null ? delay : 1200);
  }
  function flushDirty() {
    if (_flushing || _state !== "signed_in" || !backend) return Promise.resolve();
    _flushing = true;
    var m = syncMeta();
    var names = Object.keys(DOMAINS).filter(function (n) { return m[n] && m[n].dirty; });
    // Jede Domain unabhängig: ein Fehler löscht keine andere (P1-24).
    return Promise.all(names.map(function (n) {
      return Promise.resolve().then(function () { return DOMAINS[n].flush(m[n]); }).then(function (r) {
        if (r && r.ok) { markClean(n); }
        else {
          var mm = syncMeta(); var att = ((mm[n] && mm[n].attempts) || 0) + 1;
          mm[n] = Object.assign({}, mm[n], { dirty: true, attempts: att, lastError: (r && (r.code || r.message)) || "error" });
          setSyncMeta(mm);
          if (!(r && r.permanent)) scheduleFlush(Math.min(60000, 2000 * Math.pow(2, att)));   // Backoff, gedeckelt
        }
      }).catch(function (e) {
        var mm = syncMeta(); var att = ((mm[n] && mm[n].attempts) || 0) + 1;
        mm[n] = Object.assign({}, mm[n], { dirty: true, attempts: att, lastError: String(e && e.message || e) });
        setSyncMeta(mm); scheduleFlush(Math.min(60000, 2000 * Math.pow(2, att)));
      });
    })).then(function () { _flushing = false; emit(); }).catch(function () { _flushing = false; });
  }
  function getSyncStatus() {
    if (_state !== "signed_in") return _state === "local" ? "local" : "n/a";
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
    var m = syncMeta();
    var dirtyList = Object.keys(DOMAINS).filter(function (n) { return m[n] && m[n].dirty; });
    if (!dirtyList.length) return "synced";
    if (dirtyList.some(function (n) { return (m[n].attempts || 0) > 0; })) return "error";
    return _flushing ? "saving" : "pending";
  }

  /* ---------- SCORE-Domain ---------- */
  function scoreDate(r) { return (r && (r.date || r.completed_at || "")) || ""; }
  function saveScoreResult(result) {
    if (!backend || !_user) return Promise.resolve({ ok: false, code: "no_cloud" });
    var r = result || localScore(); if (!r) return Promise.resolve({ ok: true, code: "no_score" });
    // History bleibt erhalten: pro Datum eine eigene Zeile (source_id).
    return backend.upsert("score_results", {
      user_id: _user.id, source_id: "score:" + (scoreDate(r) || "latest"),
      score_total: (r.total != null ? r.total : null), mode: (r.plan || null),
      bottleneck: (r.bottleneck && r.bottleneck.key) || null, result: r, scored_at: scoreDate(r) || null
    }, "user_id,source_id").then(function (x) { return x.error ? { ok: false, message: x.error.message } : { ok: true }; });
  }

  /* ---------- PROGRAM-Domain (mit Lifecycle) ---------- */
  function cycleSourceId(startDate) { return "cycle:" + startDate; }
  function archiveCloudCycle(cycle, newStatus) {
    if (!backend || !_user || !cycle) return Promise.resolve({ ok: true });
    return backend.upsert("program_cycles", {
      user_id: _user.id, source_id: cycle.source_id, status: newStatus || "archived", updated_at: nowStamp()
    }, "user_id,source_id").then(function (x) {
      if (!x.error && _cloudCycle && _cloudCycle.source_id === cycle.source_id) _cloudCycle = null;
      return x.error ? { ok: false, message: x.error.message } : { ok: true };
    });
  }
  function saveProgramState() {
    if (!backend || !_user) return Promise.resolve({ ok: false, code: "no_cloud" });
    var st = collectProgramState();
    var meta = syncMeta().program || {};
    if (!st.c2_start || !st.c2_goal) {
      // Lokal existiert KEIN Programm. Wenn das aus einem echten lokalen Reset
      // stammt (remove-Ereignis registriert) → Cloud-Zyklus archivieren, damit
      // Gerät B ihn nie wieder als aktiv hydratisiert (P1-13/17). Falls der
      // aktive Zyklus im Speicher fehlt, in der Cloud nachschlagen — der
      // Zombie darf auch dann nicht überleben.
      if (meta.resetSeen) {
        var find = (_cloudCycle && _cloudCycle.status === "active")
          ? Promise.resolve(_cloudCycle)
          : backend.select("program_cycles", { eq: { user_id: _user.id, status: "active" }, order: "updated_at", limit: 1, single: true }).then(function (r) { return r.error ? null : r.data; });
        return find.then(function (cycle) {
          if (cycle) return archiveCloudCycle(cycle, "archived");
          return { ok: true, code: "no_program" };
        });
      }
      return Promise.resolve({ ok: true, code: "no_program" });
    }
    var pv = programView();
    var sid = cycleSourceId(st.c2_start);
    var pre = Promise.resolve({ ok: true });
    // Ein-aktiver-Zyklus-Invariante: anderer aktiver Cloud-Zyklus → erst archivieren.
    if (_cloudCycle && _cloudCycle.status === "active" && _cloudCycle.source_id !== sid) {
      pre = archiveCloudCycle(_cloudCycle, "archived");
    }
    return pre.then(function (a) {
      if (!a.ok) return a;
      var ver = bumpStateVersion(); st.state_version = ver;
      return backend.upsert("program_cycles", {
        user_id: _user.id, source_id: sid, start_date: st.c2_start,
        status: pv.over ? "completed" : "active",                          // Lifecycle-Mapping (P1-18)
        mode: st.c2_goal, bottleneck: st.c2_bottleneck || null, current_day: pv.day || 1,
        state: st, state_version: ver, updated_at: nowStamp()
      }, "user_id,source_id").then(function (x) {
        if (x.error) return { ok: false, message: x.error.message };
        S.setRaw("c2_synced_version", ver);
        // Aktiven Cloud-Zyklus im Speicher aktuell halten — nötig für die
        // Reset-Archivierung und die Ein-aktiver-Zyklus-Invariante.
        _cloudCycle = { source_id: sid, status: pv.over ? "completed" : "active", state: st, state_version: ver, start_date: st.c2_start };
        var mm = syncMeta(); if (mm.program) { delete mm.program.resetSeen; setSyncMeta(mm); }
        return { ok: true, version: ver };
      });
    });
  }

  registerDomain("score", { flush: function () { return saveScoreResult(); } });
  registerDomain("program", { flush: function (meta) { return saveProgramState(meta); } });
  registerDomain("profile", { flush: function () { return Promise.resolve({ ok: true }); } });

  /* ================= CLOUD READ MODEL + HYDRATION ================= */
  function loadAccountState() {
    if (!backend || !_user) return Promise.resolve();
    var uid = _user.id;
    return Promise.all([
      backend.select("profiles", { eq: { user_id: uid }, single: true }).then(function (r) { if (r.error) throw r.error; _profile = r.data || null; }),
      backend.select("entitlements", { eq: { user_id: uid } }).then(function (r) { if (r.error) throw r.error; _entitlements = (r.data || []).filter(function (e) { return e.status === "active"; }).map(function (e) { return e.product_key; }); }),
      backend.select("score_results", { eq: { user_id: uid }, order: "scored_at", limit: 1, single: true }).then(function (r) { if (r.error) throw r.error; _cloudScore = r.data ? (r.data.result || r.data) : null; }),
      backend.select("program_cycles", { eq: { user_id: uid, status: "active" }, order: "updated_at", limit: 1, single: true }).then(function (r) { if (r.error) throw r.error; _cloudCycle = r.data || null; })
    ]);
  }

  // Domain-sichere Hydration (P1-31): nie neueren unsynchronisierten lokalen
  // Stand überschreiben, nie stillen Datenverlust, keine Sync-Loops (setRaw).
  function hydrateFromCloud() {
    // SCORE: deterministisch nach Datum (P1-29). History bleibt cloudseitig erhalten.
    var ls = localScore();
    if (_cloudScore && !ls) S.setRaw("check_result", _cloudScore);
    else if (_cloudScore && ls) {
      var cd = scoreDate(_cloudScore), ld = scoreDate(ls);
      if (cd && ld && cd > ld) S.setRaw("check_result", _cloudScore);       // Cloud neuer → übernehmen
      else if (ld && (!cd || ld > cd)) markDirty("score");                  // Lokal neuer → Upload einreihen
    } else if (!_cloudScore && ls) markDirty("score");                      // Cloud leer → Upload
    // PROGRAM: nur AKTIVE Zyklen hydratisieren (archived/completed nie — P1-13).
    if (_cloudCycle && _cloudCycle.state && _cloudCycle.status === "active") {
      var localHas = !!(S.get("c2_start", "") && goal());
      var cloudVer = _cloudCycle.state_version || 0;
      var localVer = stateVersion();
      var localSynced = S.get("c2_synced_version", -1);
      if (!localHas) writeProgramState(_cloudCycle.state, cloudVer);
      else if (cloudVer > localVer && localVer <= localSynced) writeProgramState(_cloudCycle.state, cloudVer);
      else if (localVer > localSynced) markDirty("program");                // lokal neuer → Upload
    } else if (!_cloudCycle && S.get("c2_start", "") && goal()) {
      markDirty("program");                                                 // lokal existiert, Cloud leer → Upload
    }
  }

  /* ================= PRODUKT-ZUGRIFF (Entitlement → Vault) ================= */
  // Ergebnis-States: authorized | unauthorized | offline_legacy_available |
  // unavailable | error. Material lebt nur im Speicher (kein localStorage).
  function resolveProductAccess(productKey) {
    if (_accessCache[productKey]) return Promise.resolve({ state: "authorized", material: _accessCache[productKey] });
    if (backend && _user && _state === "signed_in") {
      if (!api.hasAccess(productKey)) return Promise.resolve({ state: "unauthorized" });
      return backend.resolveAccess(productKey).then(function (r) {
        var mat = r && r.data && (r.data.material || r.data.vault_code);
        if (r.error || !mat) return { state: "error" };
        _accessCache[productKey] = mat;                                     // Session-Speicher, nie persistiert
        return { state: "authorized", material: mat };
      }).catch(function () { return { state: "error" }; });
    }
    var code = S.get("course_code", "") || (function () { try { return localStorage.getItem("mm_protokoll_code") || ""; } catch (e) { return ""; } })();
    if (code) return Promise.resolve({ state: "offline_legacy_available", material: code });
    return Promise.resolve({ state: "unavailable" });
  }

  /* ================= MIGRATION (verify-after-write) ================= */
  function migrationStatus() {
    var m = S.get("account_migration", null);
    if (!m || typeof m !== "object") return { state: "none", score: false, program: false };
    return m;
  }
  function importLocalData() {
    if (!backend || !_user) return Promise.resolve({ ok: false, code: "not_configured", message: "Kein Account-Sync aktiv — Daten bleiben lokal auf diesem Gerät." });
    var scope = { score: !!localScore(), program: !!(S.get("c2_start", "") && goal()) };
    var done = { score: !scope.score, program: !scope.program };
    var writes = [];
    if (scope.score) writes.push(saveScoreResult().then(function (r) { return { area: "score", ok: r.ok }; }));
    if (scope.program) writes.push(saveProgramState().then(function (r) { return { area: "program", ok: r.ok }; }));
    return Promise.all(writes).then(function (res) {
      res.forEach(function (r) { if (r.ok) done[r.area] = true; });
      return loadAccountState().then(function () {
        var vScore = !scope.score || !!_cloudScore;
        var vProg = !scope.program || !!_cloudCycle;
        var complete = vScore && vProg && (!scope.score || done.score) && (!scope.program || done.program);
        var status = { state: complete ? "complete" : "partial", score: scope.score ? (done.score && vScore) : false, program: scope.program ? (done.program && vProg) : false, version: 1 };
        S.setRaw("account_migration", status);
        return { ok: complete, status: status, imported: { score: status.score, program: status.program } };
      });
    }).catch(function (e) {
      var status = { state: "partial", score: false, program: false, version: 1 };
      S.setRaw("account_migration", status);
      return { ok: false, message: String(e && e.message || e), status: status };
    });
  }

  /* ================= CLAIM ================= */
  function claimAccessCode(code) {
    var norm = (window.MM && MM.vault) ? MM.vault.norm(code) : String(code || "").trim().toUpperCase();
    if (!norm) return Promise.resolve({ ok: false, message: "Kein Code eingegeben." });
    if (backend && _user) {
      return backend.rpc("claim_access_code", { code: norm }).then(function (r) {
        if (r.error) return { ok: false, message: "Code nicht erkannt." };
        return loadAccountState().then(function () { emit(); return { ok: true }; });
      });
    }
    return tryValidateCode(norm).then(function (valid) {
      if (!valid) return { ok: false, message: "Code nicht erkannt." };
      S.setRaw("course_code", norm); grantLocal(["protocol", "twelve_week"]);
      S.setRaw("account_access_validation", { version: VALIDATION_VERSION, validated: true, validated_at: nowStamp() });
      emit();
      return { ok: true, local: true, message: "Zugang auf diesem Gerät bestätigt." };
    });
  }

  /* ================= DATENRECHTE ================= */
  function exportMyData() {
    // Keine Secrets, keine Tokens, kein Vault-Material — nur Nutzdaten.
    var base = { exported_at: nowStamp(), source: (backend && _user) ? "account" : "device" };
    if (backend && _user) {
      var uid = _user.id;
      return Promise.all([
        backend.select("profiles", { eq: { user_id: uid }, single: true }),
        backend.select("entitlements", { eq: { user_id: uid } }),
        backend.select("score_results", { eq: { user_id: uid } }),
        backend.select("program_cycles", { eq: { user_id: uid } })
      ]).then(function (r) {
        base.profile = r[0].data || null;
        base.entitlements = (r[1].data || []).map(function (e) { return { product_key: e.product_key, status: e.status, granted_at: e.granted_at }; });
        base.score_history = r[2].data || [];
        base.program_cycles = r[3].data || [];
        return base;
      });
    }
    base.score = localScore();
    base.program_state = collectProgramState();
    return Promise.resolve(base);
  }
  function requestAccountDeletion() {
    if (!backend || !_user) return Promise.resolve({ ok: false, code: "not_configured", message: "Kein Cloud-Konto auf diesem Gerät aktiv." });
    if (!backend.deleteAccount) return Promise.resolve({ ok: false, code: "unavailable" });
    return backend.deleteAccount().then(function (r) {
      if (r.error) return { ok: false, message: "Löschung fehlgeschlagen — bitte später erneut versuchen." };
      _user = null; _profile = null; _entitlements = null; _cloudScore = null; _cloudCycle = null; _accessCache = {};
      setState(configured() || window.__MM_TEST_CLOUD ? "signed_out" : "local");
      return { ok: true };
    });
  }
  function clearLocalData() {
    // Bewusste, explizite lokale Bereinigung NACH bestätigter Kontolöschung.
    try {
      var kill = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("mm_") === 0) kill.push(k); }
      kill.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  /* ================= INIT ================= */
  function afterAuth() {
    return loadAccountState().then(function () {
      hydrateFromCloud();
      setState("signed_in");
      scheduleFlush(300);                                                    // Retry-Trigger: auth ready (P1-26)
      return api.snapshot();
    }).catch(function () { setState("signed_in"); return api.snapshot(); });
  }
  function onStoreEvent(e) {
    var key = e && e.detail && e.detail.key; var op = (e && e.detail && e.detail.operation) || "set";
    if (!key) return;
    var isProg = key.indexOf("c2_") === 0 || key === "course_rechecks";
    var isMeta = /^(c2_state_version|c2_synced_version)$/.test(key) || PROG_LOCAL_ONLY.some(function (re) { return re.test(key); });
    if (key === "check_result") { markDirty("score"); return; }
    if (isProg && !isMeta) {
      // Reset-Signatur: Kern-Keys werden ENTFERNT → Cloud-Zyklus muss archiviert werden.
      if (op === "remove" && (key === "c2_goal" || key === "c2_start")) markDirty("program", { resetSeen: true });
      else markDirty("program");
    }
  }

  var api = {
    snapshot: function () { return { state: _state, configured: configured(), user: _user, profile: _profile, entitlements: (_entitlements || localEntitlements()).slice(), sync: getSyncStatus() }; },
    onChange: function (cb) { if (typeof cb === "function") _subs.push(cb); },
    whenReady: function () { return _initPromise || api.init(); },

    init: function () {
      if (_initPromise) return _initPromise;
      document.addEventListener("mm:store", onStoreEvent);
      // Retry-Trigger (P1-26): online, sichtbar, Initialisierung.
      try {
        window.addEventListener("online", function () { scheduleFlush(500); });
        document.addEventListener("visibilitychange", function () { if (!document.hidden) scheduleFlush(1000); });
      } catch (e) {}
      if (window.__MM_TEST_CLOUD) {
        backend = makeTestBackend();
        _initPromise = backend.getSession().then(function (u) {
          _user = u;
          if (_user) return afterAuth();
          setState("signed_out"); return api.snapshot();
        });
        return _initPromise;
      }
      if (!configured()) {
        _initPromise = revalidateStoredCode().then(function () { setState("local"); return api.snapshot(); });
        return _initPromise;
      }
      _initPromise = loadSdk().then(function (SB) {
        var client = SB.createClient(CFG.supabaseUrl, PUBKEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        backend = makeSupabaseBackend(client);
        backend.onAuthChange(function (u) {
          _user = u; _profile = null; _entitlements = null; _cloudScore = null; _cloudCycle = null; _accessCache = {};
          if (_user) afterAuth(); else setState("signed_out");
        });
        return backend.getSession().then(function (u) { _user = u; if (_user) return afterAuth(); setState("signed_out"); return api.snapshot(); });
      }).catch(function () {
        return revalidateStoredCode().then(function () { setState("local"); return api.snapshot(); });
      });
      return _initPromise;
    },

    getCurrentUser: function () { return _user; },
    getProfile: function () { return _profile; },
    getEntitlements: function () { return (_entitlements || localEntitlements()).slice(); },
    hasAccess: function (key) { return (_entitlements || localEntitlements()).indexOf(key) >= 0; },
    canAccess: function (key) { return api.hasAccess(key); },
    resolveProductAccess: resolveProductAccess,
    getLatestScoreResult: function () { var ls = localScore(); if (_cloudScore && ls) return scoreDate(_cloudScore) > scoreDate(ls) ? _cloudScore : ls; return ls || _cloudScore; },
    getActiveProgramCycle: function () { return _cloudCycle; },
    loadAccountState: loadAccountState,
    saveScoreResult: saveScoreResult,
    saveProgramState: saveProgramState,
    importLocalData: importLocalData,
    migrationStatus: migrationStatus,
    migrated: function () { return migrationStatus().state === "complete"; },
    claimAccessCode: claimAccessCode,
    exportMyData: exportMyData,
    requestAccountDeletion: requestAccountDeletion,
    clearLocalData: clearLocalData,
    getSyncStatus: getSyncStatus,
    registerDomain: registerDomain,                                          // Phase-3-Vertrag (tracker/nutrition/stack/…)
    flushNow: function () { return flushDirty(); },

    signIn: function (email) {
      if (!backend) return Promise.resolve({ ok: false, code: "not_configured", message: "Account-Sync ist auf diesem Gerät noch nicht aktiviert." });
      return backend.signIn(email);
    },
    signOut: function () { if (backend && backend.signOut) return backend.signOut().then(function () { _user = null; _entitlements = null; _cloudScore = null; _cloudCycle = null; _profile = null; _accessCache = {}; setState("signed_out"); }); return Promise.resolve(); },

    localInventory: function () {
      return { score: !!localScore(), program: !!(goal() && S.get("c2_start", "")), tracker: false, raw: { hasCode: !!S.get("course_code", "") } };
    },

    getDashboardState: function () {
      var r = api.getLatestScoreResult();
      var prog = programView();
      var name = (_profile && _profile.first_name) || (S.get("unlock_name", "") || "").split(" ")[0] || "";
      var ents = _entitlements || localEntitlements();
      return {
        name: name,
        hasScore: !!(r && r.total != null),
        score: r ? r.total : null,
        mode: prog.mode || (r && r.plan) || "",
        bottleneck: prog.bottleneck || (r && r.bottleneck && r.bottleneck.key) || "",
        bottleneckName: (r && r.bottleneck && r.bottleneck.name) || "",
        program: prog,
        sync: getSyncStatus(),
        access: { protocol: ents.indexOf("protocol") >= 0, twelve_week: ents.indexOf("twelve_week") >= 0, coaching: ents.indexOf("coaching") >= 0, advanced_library: ents.indexOf("advanced_library") >= 0 }
      };
    }
  };

  MM.account = api;
})();
