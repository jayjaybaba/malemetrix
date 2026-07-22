/* ==========================================================================
   MALEMETRIX ACCOUNT ADAPTER — MM.account  (Phase 2.1 hardened)
   --------------------------------------------------------------------------
   Einzige Grenze zwischen My MaleMetrix und dem Backend. Kein Feature (course.js,
   check.js, tracker.js) ruft Supabase direkt. Business-Logik bleibt eingefroren —
   dieser Adapter LIEST/SCHREIBT nur Persistenz (localStorage ↔ Cloud).

   Backend ist austauschbar:
     - 'supabase'  echte Cloud (nur wenn öffentliche Config gesetzt)
     - 'test'      In-Memory-Backend über window.__MM_TEST_CLOUD (nur Tests/E2E)
     - null        lokaler Modus (nur dieses Gerät) — Website voll funktionsfähig

   Zustände: 'loading' | 'local' | 'signed_out' | 'signed_in'
   SICHERHEIT: clientseitig NUR publishable/anon Key. RLS schützt serverseitig.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var CFG = window.MM_CONFIG || {};
  var PUBKEY = CFG.supabasePublishableKey || CFG.supabaseAnonKey || "";
  var S = {
    get: function (k, d) { try { return MM.store ? MM.store.get(k, d) : (JSON.parse(localStorage.getItem("mm_" + k)) ?? d); } catch (e) { return d; } },
    setRaw: function (k, v) { try { localStorage.setItem("mm_" + k, JSON.stringify(v)); } catch (e) {} },   // ohne sync-event
    remove: function (k) { try { MM.store ? MM.store.remove(k) : localStorage.removeItem("mm_" + k); } catch (e) {} }
  };

  var backend = null;         // { kind, ... }
  var _user = null;
  var _profile = null;
  var _entitlements = null;   // gecachte product_keys (Array)
  var _cloudScore = null;     // zuletzt geladenes score_result (roh)
  var _cloudCycle = null;     // aktiver program_cycle (roh)
  var _state = "loading";
  var _subs = [];
  var _localValidated = false;

  function configured() { return !!(CFG.supabaseUrl && PUBKEY); }
  function emit() { var s = api.snapshot(); _subs.forEach(function (cb) { try { cb(s); } catch (e) {} }); }
  function setState(s) { if (s !== _state) { _state = s; emit(); } }

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

  /* ---------- Program-State-Snapshot (für Cloud-Sync) ---------- */
  var PROG_KEYS = ["c2_goal", "c2_bottleneck", "c2_start", "c2_days", "c2_nutrition", "c2_daily", "c2_pulse", "course_rechecks", "c2_mode_history", "c2_bn_history", "c2_paused_days", "c2_pause_since", "c2_dayswap", "c2_lifts", "c2_ver"];
  function collectProgramState() { var o = {}; PROG_KEYS.forEach(function (k) { var v = S.get(k, null); if (v != null) o[k] = v; }); return o; }
  function stateVersion() { return S.get("c2_state_version", 0) || 0; }
  function bumpStateVersion() { var v = stateVersion() + 1; S.setRaw("c2_state_version", v); return v; }

  /* ---------- Validierter lokaler Zugriff (echte Vault-Prüfung) ---------- */
  // Lokal darf Zugriff NUR gelten, wenn der Code den echten AES-GCM-Vault
  // entschlüsselt (kryptografischer Beweis). Ohne Vault-Payload auf der Seite:
  // keine lokale Entitlement-Vergabe.
  function tryValidateCode(code) {
    if (!window.MM || !MM.vault || !document.getElementById("courseVault")) return Promise.resolve(false);
    var c = MM.vault.norm(code);
    if (!c) return Promise.resolve(false);
    return MM.vault.open("courseVault", c).then(function () { return true; }).catch(function () { return false; });
  }
  function localEntitlements() {
    var e = S.get("account_entitlements", []);
    return Array.isArray(e) ? e.slice() : [];
  }
  function grantLocal(keys) {
    var e = localEntitlements();
    keys.forEach(function (k) { if (e.indexOf(k) < 0) e.push(k); });
    S.setRaw("account_entitlements", e); _entitlements = e.slice();
  }
  // Beim Start: falls ein Code gespeichert ist, EINMAL kryptografisch prüfen und
  // erst dann lokale Entitlements setzen (kein „String vorhanden = Zugriff“).
  function revalidateStoredCode() {
    if (_localValidated) return Promise.resolve();
    var code = S.get("course_code", "");
    if (!code) { _localValidated = true; return Promise.resolve(); }
    if (localEntitlements().indexOf("twelve_week") >= 0) { _localValidated = true; return Promise.resolve(); }
    return tryValidateCode(code).then(function (ok) { if (ok) grantLocal(["protocol", "twelve_week"]); _localValidated = true; });
  }

  /* ================= BACKENDS ================= */
  function makeTestBackend() {
    var C = window.__MM_TEST_CLOUD; // { user:{id}, tables:{...}, codes:{...} }
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
        return Promise.resolve({ data: row, error: null });
      },
      rpc: function (name, args) {
        if (name === "claim_access_code") {
          var codes = (C.codes || {}); var rec = codes[(args.code || "").toUpperCase()];
          if (!rec || !rec.active || (rec.max_uses != null && rec.used >= rec.max_uses)) return Promise.resolve({ data: null, error: { message: "invalid_code" } });
          rec.used = (rec.used || 0) + 1;
          (rec.product_keys || ["protocol", "twelve_week"]).forEach(function (k) { rows("entitlements").push({ user_id: C.user.id, product_key: k, status: "active" }); });
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: { message: "unknown_rpc" } });
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
      rpc: function (name, args) { return client.rpc(name, args).then(function (r) { return { data: r.data, error: r.error }; }); }
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

  /* ================= CLOUD READ MODEL ================= */
  function loadAccountState() {
    if (!backend || !_user) return Promise.resolve();
    var uid = _user.id;
    return Promise.all([
      backend.select("profiles", { eq: { user_id: uid }, single: true }).then(function (r) { if (r.error) throw r.error; _profile = r.data || null; }),
      backend.select("entitlements", { eq: { user_id: uid } }).then(function (r) { if (r.error) throw r.error; _entitlements = (r.data || []).filter(function (e) { return e.status === "active"; }).map(function (e) { return e.product_key; }); }),
      backend.select("score_results", { eq: { user_id: uid }, order: "created_at", limit: 1, single: true }).then(function (r) { if (r.error) throw r.error; _cloudScore = r.data ? (r.data.result || r.data) : null; }),
      backend.select("program_cycles", { eq: { user_id: uid, status: "active" }, order: "updated_at", limit: 1, single: true }).then(function (r) { if (r.error) throw r.error; _cloudCycle = r.data || null; })
    ]);
  }

  // Cloud → lokaler Arbeitsstand (nur wenn sicher). Kein stiller Datenverlust.
  function hydrateFromCloud() {
    // Score: local leer, cloud vorhanden → local befüllen
    if (_cloudScore && !localScore()) S.setRaw("check_result", _cloudScore);
    // Program: Fälle A–D
    if (_cloudCycle && _cloudCycle.state) {
      var localHas = !!(S.get("c2_start", "") && goal());
      var cloudVer = _cloudCycle.state_version || 0;
      var localVer = stateVersion();
      var localSynced = S.get("c2_synced_version", -1);
      if (!localHas) {
        writeProgramState(_cloudCycle.state, cloudVer); // A: cloud hydrates
      } else if (cloudVer > localVer && localVer <= localSynced) {
        writeProgramState(_cloudCycle.state, cloudVer); // C/D: cloud strictly newer & local unchanged since sync
      } // sonst: lokaler Stand ist neuer oder divergent-mit-lokalen-Änderungen → local behalten (Upload beim nächsten Sync)
    }
  }
  function writeProgramState(state, version) {
    if (!state || typeof state !== "object") return;
    PROG_KEYS.forEach(function (k) { if (state[k] != null) S.setRaw(k, state[k]); });
    if (version != null) { S.setRaw("c2_state_version", version); S.setRaw("c2_synced_version", version); }
  }

  /* ================= CLOUD WRITE ================= */
  function saveScoreResult(result) {
    if (!backend || !_user) return Promise.resolve({ ok: false, code: "no_cloud" });
    var r = result || localScore(); if (!r) return Promise.resolve({ ok: false, code: "no_score" });
    return backend.upsert("score_results", {
      user_id: _user.id, source_id: "score:" + (r.date || "latest"),
      score_total: (r.total != null ? r.total : null), mode: (r.plan || null),
      bottleneck: (r.bottleneck && r.bottleneck.key) || null, result: r
    }, "user_id,source_id").then(function (x) { return x.error ? { ok: false, message: x.error.message } : { ok: true }; });
  }
  function saveProgramState() {
    if (!backend || !_user) return Promise.resolve({ ok: false, code: "no_cloud" });
    var st = collectProgramState();
    if (!st.c2_start || !st.c2_goal) return Promise.resolve({ ok: false, code: "no_program" });
    var ver = bumpStateVersion(); st.state_version = ver;
    var pv = programView();
    return backend.upsert("program_cycles", {
      user_id: _user.id, source_id: "cycle:" + st.c2_start, start_date: st.c2_start, status: "active",
      mode: st.c2_goal, bottleneck: st.c2_bottleneck || null, current_day: pv.day || 1,
      state: st, state_version: ver, updated_at: new Date(nowStamp())
    }, "user_id,source_id").then(function (x) { if (x.error) return { ok: false, message: x.error.message }; S.setRaw("c2_synced_version", ver); return { ok: true, version: ver }; });
  }
  // new Date() ohne Argument ist im Test-Clock ok; realer Zeitstempel als ISO
  function nowStamp() { try { return new Date().toISOString(); } catch (e) { return ""; } }

  /* ================= MIGRATION (verify-after-write) ================= */
  function migrationStatus() {
    var m = S.get("account_migration", null);
    if (!m || typeof m !== "object") return { state: "none", score: false, program: false };
    return m;
  }
  function importLocalData() {
    if (!backend || !_user) return Promise.resolve({ ok: false, code: "not_configured", message: "Kein Account-Sync aktiv — Daten bleiben lokal auf diesem Gerät." });
    var scope = { score: !!localScore(), program: !!(S.get("c2_start", "") && goal()) };
    var done = { score: !scope.score, program: !scope.program };  // out-of-scope gilt als „nichts zu tun“
    var writes = [];
    if (scope.score) writes.push(saveScoreResult().then(function (r) { return { area: "score", ok: r.ok }; }));
    if (scope.program) writes.push(saveProgramState().then(function (r) { return { area: "program", ok: r.ok }; }));
    return Promise.all(writes).then(function (res) {
      res.forEach(function (r) { if (r.ok) done[r.area] = true; });
      // VERIFY: zurücklesen
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

  /* ================= CLAIM ACCESS ================= */
  function claimAccessCode(code) {
    var norm = (window.MM && MM.vault) ? MM.vault.norm(code) : String(code || "").trim().toUpperCase();
    if (!norm) return Promise.resolve({ ok: false, message: "Kein Code eingegeben." });
    if (backend && _user) {
      // Cloud: serverseitig validierte RPC (Codes nie clientseitig lesbar)
      return backend.rpc("claim_access_code", { code: norm }).then(function (r) {
        if (r.error) return { ok: false, message: "Code nicht erkannt." };  // keine Info-Leaks
        return loadAccountState().then(function () { emit(); return { ok: true }; });
      });
    }
    // Lokal: NUR bei echter kryptografischer Vault-Validierung Entitlement setzen.
    return tryValidateCode(norm).then(function (valid) {
      if (!valid) return { ok: false, message: "Code nicht erkannt." };
      S.setRaw("course_code", norm); grantLocal(["protocol", "twelve_week"]); emit();
      return { ok: true, local: true, message: "Zugang auf diesem Gerät bestätigt." };
    });
  }

  /* ================= INIT ================= */
  function afterAuth() {
    return loadAccountState().then(function () {
      hydrateFromCloud();
      setState("signed_in");
      return api.snapshot();
    }).catch(function () {
      // Cloud-Leseproblem → nicht abstürzen; Session bleibt, lokale Sicht greift
      setState("signed_in");
      return api.snapshot();
    });
  }

  var _syncTimer = null;
  function scheduleSync(key) {
    if (_state !== "signed_in" || !backend) return;
    var isProg = key && (key.indexOf("c2_") === 0 || key === "course_rechecks");
    var isScore = key === "check_result";
    if (!isProg && !isScore) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(function () {
      // local-first: Aktion ist längst lokal gespeichert; Cloud-Sync ist best-effort
      if (isScore) saveScoreResult().catch(function () {});
      if (isProg) saveProgramState().catch(function () {});
    }, 1200);
  }

  var api = {
    snapshot: function () { return { state: _state, configured: configured(), user: _user, profile: _profile, entitlements: (_entitlements || localEntitlements()).slice() }; },
    onChange: function (cb) { if (typeof cb === "function") _subs.push(cb); },

    init: function () {
      document.addEventListener("mm:store", function (e) { scheduleSync(e && e.detail && e.detail.key); });

      // Test-Backend (nur E2E): window.__MM_TEST_CLOUD
      if (window.__MM_TEST_CLOUD) {
        backend = makeTestBackend();
        return backend.getSession().then(function (u) {
          _user = u;
          if (_user) return afterAuth();
          setState("signed_out"); return api.snapshot();
        });
      }
      if (!configured()) {
        return revalidateStoredCode().then(function () { setState("local"); return api.snapshot(); });
      }
      return loadSdk().then(function (SB) {
        var client = SB.createClient(CFG.supabaseUrl, PUBKEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        backend = makeSupabaseBackend(client);
        backend.onAuthChange(function (u) {
          _user = u; _profile = null; _entitlements = null; _cloudScore = null; _cloudCycle = null;
          if (_user) afterAuth(); else setState("signed_out");
        });
        return backend.getSession().then(function (u) { _user = u; if (_user) return afterAuth(); setState("signed_out"); return api.snapshot(); });
      }).catch(function () {
        // SDK/Netz nicht verfügbar → sicherer lokaler Fallback
        return revalidateStoredCode().then(function () { setState("local"); return api.snapshot(); });
      });
    },

    getCurrentUser: function () { return _user; },
    getProfile: function () { return _profile; },
    getEntitlements: function () { return (_entitlements || localEntitlements()).slice(); },
    hasAccess: function (key) { return (_entitlements || localEntitlements()).indexOf(key) >= 0; },
    getLatestScoreResult: function () { return _cloudScore || localScore(); },
    getActiveProgramCycle: function () { return _cloudCycle; },
    loadAccountState: loadAccountState,
    saveScoreResult: saveScoreResult,
    saveProgramState: saveProgramState,
    importLocalData: importLocalData,
    migrationStatus: migrationStatus,
    migrated: function () { return migrationStatus().state === "complete"; },
    claimAccessCode: claimAccessCode,

    signIn: function (email) {
      if (!backend) return Promise.resolve({ ok: false, code: "not_configured", message: "Account-Sync ist auf diesem Gerät noch nicht aktiviert." });
      return backend.signIn(email);
    },
    signOut: function () { if (backend && backend.signOut) return backend.signOut().then(function () { _user = null; _entitlements = null; _cloudScore = null; _cloudCycle = null; _profile = null; setState("signed_out"); }); return Promise.resolve(); },

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
        access: { protocol: ents.indexOf("protocol") >= 0, twelve_week: ents.indexOf("twelve_week") >= 0, coaching: ents.indexOf("coaching") >= 0, advanced_library: ents.indexOf("advanced_library") >= 0 }
      };
    }
  };

  MM.account = api;
})();
