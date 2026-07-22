/* ==========================================================================
   MALEMETRIX ACCOUNT ADAPTER — MM.account
   --------------------------------------------------------------------------
   Zentrale Schicht zwischen My MaleMetrix und dem Backend. KEIN Feature ruft
   Supabase direkt — alles läuft über diese API, damit das Backend später
   austauschbar bleibt und die Business-Logik (Score, 12-Week) unangetastet
   bleibt (nur LESENDER Blick auf bestehenden localStorage-State).

   Zustände:
     'loading'    — init läuft
     'local'      — kein Supabase konfiguriert → nur dieses Gerät (voll nutzbar)
     'signed_out' — Supabase konfiguriert, aber keine Session
     'signed_in'  — Supabase-Session aktiv

   SICHERHEIT: hier liegen NUR öffentliche Werte (supabaseUrl + anon key).
   Niemals service_role oder andere Secrets. RLS schützt die Daten serverseitig.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var CFG = window.MM_CONFIG || {};
  var S = {
    get: function (k, d) { try { return (MM.store ? MM.store.get(k, d) : JSON.parse(localStorage.getItem("mm_" + k)) ?? d); } catch (e) { return d; } },
    set: function (k, v) { try { MM.store ? MM.store.set(k, v) : localStorage.setItem("mm_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  var sb = null;              // Supabase-Client (lazy)
  var _user = null;
  var _entitlements = null;   // gecachte Liste product_keys
  var _state = "loading";
  var _subs = [];

  function configured() { return !!(CFG.supabaseUrl && CFG.supabaseAnonKey); }
  function emit() { _subs.forEach(function (cb) { try { cb(api.snapshot()); } catch (e) {} }); }
  function setState(s) { if (s !== _state) { _state = s; emit(); } }

  /* ---------- DST-sichere Programm-Ableitung (nur LESEN, keine Logikänderung) ---------- */
  function parseYmdUTC(s) { var p = String(s || "").split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function diffDays(a, b) { return Math.round((parseYmdUTC(b) - parseYmdUTC(a)) / 86400000); }

  function localScore() {
    var r = S.get("check_result", null);
    if (!r || typeof r !== "object") return null;
    return r;
  }
  function goal() { var g = S.get("c2_goal", ""); return g || ""; }
  function bottleneck() { var b = S.get("c2_bottleneck", ""); return b || ""; }

  function programView() {
    var start = S.get("c2_start", "");
    var g = goal(), b = bottleneck();
    if (!start || !g) return { active: false, mode: g || "", bottleneck: b || "" };
    var paused = S.get("c2_paused_days", 0) || 0;
    var pauseSince = S.get("c2_pause_since", "");
    var ref = pauseSince || todayYmd();
    var notStarted = diffDays(start, todayYmd()) < 0;
    var raw = Math.max(1, diffDays(start, ref) + 1);
    var pd = Math.max(1, raw - paused);
    var over = pd > 84;
    var clamped = Math.min(84, pd);
    var week = Math.min(12, Math.max(1, Math.ceil(clamped / 7)));
    var phase = week <= 3 ? 1 : week <= 6 ? 2 : week <= 9 ? 3 : 4;
    // Consistency (rein lesend, spiegelt course.consistency): aktive Programmtage / elapsed
    var daily = S.get("c2_daily", {}) || {}, active = 0;
    if (!notStarted) { for (var i = 1; i <= clamped; i++) { var rec = daily["d" + i] || {}; if (rec.p || rec.move || rec.recover) active++; } }
    var pct = (!notStarted && clamped) ? Math.round(active / clamped * 100) : 0;
    // Nächstes Review: W4/8/12-Checkpoints
    var nextCp = week < 4 ? 4 : week < 8 ? 8 : week < 12 ? 12 : null;
    var nextReviewDays = nextCp ? Math.max(0, (nextCp * 7) - clamped) : null;
    return {
      active: true, notStarted: notStarted, over: over,
      mode: g, bottleneck: b,
      day: clamped, week: week, phase: phase,
      paused: !!pauseSince, consistency: pct, active_days: active,
      nextReviewDays: nextReviewDays
    };
  }

  /* ---------- Entitlements ---------- */
  // Lokaler Fallback: ein eingelöster Zugangscode (Vault) = Zugriff auf Protokoll + 12-Week.
  function localEntitlements() {
    var ks = [];
    if (S.get("course_code", "")) { ks.push("protocol"); ks.push("twelve_week"); }
    // Zusätzlich manuell/geclaimte Entitlements (Übergangslösung)
    var claimed = S.get("account_entitlements", []);
    if (Array.isArray(claimed)) claimed.forEach(function (k) { if (ks.indexOf(k) < 0) ks.push(k); });
    return ks;
  }

  /* ---------- Supabase (lazy) ---------- */
  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
      s.async = true;
      s.onload = function () { resolve(window.supabase); };
      s.onerror = function () { reject(new Error("sdk_load_failed")); };
      document.head.appendChild(s);
    });
  }

  /* ---------- Public API ---------- */
  var api = {
    snapshot: function () {
      return { state: _state, configured: configured(), user: _user, entitlements: (_entitlements || (configured() ? [] : localEntitlements())).slice() };
    },
    onChange: function (cb) { if (typeof cb === "function") { _subs.push(cb); } },

    init: function () {
      if (!configured()) {
        _entitlements = localEntitlements();
        setState("local");
        return Promise.resolve(api.snapshot());
      }
      return loadSdk().then(function (SB) {
        sb = SB.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        sb.auth.onAuthStateChange(function (_evt, session) {
          _user = session ? session.user : null;
          _entitlements = null;
          if (_user) { api.getEntitlements().then(function () { setState("signed_in"); }); }
          else setState("signed_out");
        });
        return sb.auth.getSession().then(function (res) {
          _user = res && res.data && res.data.session ? res.data.session.user : null;
          if (_user) { return api.getEntitlements().then(function () { setState("signed_in"); return api.snapshot(); }); }
          setState("signed_out"); return api.snapshot();
        });
      }).catch(function () {
        // SDK/Netz nicht verfügbar → sicherer lokaler Fallback, Website bleibt nutzbar
        _entitlements = localEntitlements();
        setState("local");
        return api.snapshot();
      });
    },

    getCurrentUser: function () { return _user; },

    signIn: function (email) {
      if (!configured()) return Promise.resolve({ ok: false, code: "not_configured", message: "Account-Sync ist auf diesem Gerät noch nicht aktiviert." });
      if (!sb) return Promise.resolve({ ok: false, code: "not_ready" });
      var redirect = (CFG.siteUrl || location.origin) + "/mein-protokoll.html";
      return sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect } })
        .then(function (res) { return res.error ? { ok: false, message: res.error.message } : { ok: true, message: "Magic Link gesendet — prüfe dein Postfach." }; })
        .catch(function (e) { return { ok: false, message: String(e && e.message || e) }; });
    },

    signOut: function () {
      if (sb) return sb.auth.signOut().then(function () { _user = null; _entitlements = null; setState("signed_out"); });
      return Promise.resolve();
    },

    getProfile: function () {
      if (!configured() || !sb || !_user) return Promise.resolve(null);
      return sb.from("profiles").select("first_name,language,timezone").eq("user_id", _user.id).maybeSingle()
        .then(function (r) { return r && r.data ? r.data : null; }).catch(function () { return null; });
    },

    getEntitlements: function () {
      if (!configured() || !sb || !_user) { _entitlements = localEntitlements(); return Promise.resolve(_entitlements.slice()); }
      return sb.from("entitlements").select("product_key,status").eq("user_id", _user.id).eq("status", "active")
        .then(function (r) { _entitlements = (r && r.data ? r.data : []).map(function (e) { return e.product_key; }); return _entitlements.slice(); })
        .catch(function () { _entitlements = []; return []; });
    },

    hasAccess: function (key) {
      var list = _entitlements || (configured() ? [] : localEntitlements());
      return list.indexOf(key) >= 0;
    },

    // Rein lesende Sicht für das Dashboard — kombiniert Score + Programm + Access.
    getDashboardState: function () {
      var r = localScore();
      var prog = programView();
      var name = (S.get("unlock_name", "") || "").split(" ")[0] || "";
      var ents = _entitlements || (configured() ? [] : localEntitlements());
      return {
        name: name,
        hasScore: !!(r && (r.total != null)),
        score: r ? r.total : null,
        mode: prog.mode || (r && r.plan) || "",
        bottleneck: prog.bottleneck || (r && r.bottleneck && r.bottleneck.key) || "",
        bottleneckName: (r && r.bottleneck && r.bottleneck.name) || "",
        program: prog,
        access: { protocol: ents.indexOf("protocol") >= 0, twelve_week: ents.indexOf("twelve_week") >= 0, coaching: ents.indexOf("coaching") >= 0, advanced_library: ents.indexOf("advanced_library") >= 0 }
      };
    },

    /* ---------- Lokale Daten: Inventar + Migration (idempotent, non-destruktiv) ---------- */
    localInventory: function () {
      var score = localScore();
      var prog = (goal() && S.get("c2_start", "")) ? programView() : null;
      var tr = null;
      try { tr = S.get("tracker_data", null) || S.get("mm_tracker", null); } catch (e) {}
      var trackerCount = 0;
      try { if (tr && typeof tr === "object") trackerCount = Object.keys(tr).length; } catch (e) {}
      return {
        score: !!(score && score.total != null),
        program: !!(prog && prog.active),
        tracker: trackerCount > 0,
        raw: { hasCode: !!S.get("course_code", "") }
      };
    },

    // Migration: lädt lokale Daten in den Account. Idempotent über migration_version
    // + deterministische Keys. Löscht NICHTS lokal (Fallback bleibt bestehen).
    importLocalData: function () {
      if (!configured() || !sb || !_user) {
        return Promise.resolve({ ok: false, code: "not_configured", message: "Kein Account-Sync aktiv — Daten bleiben lokal auf diesem Gerät." });
      }
      var uid = _user.id;
      var inv = api.localInventory();
      var tasks = [];
      var imported = { score: false, program: false };
      if (inv.score) {
        var r = localScore();
        tasks.push(sb.from("score_results").upsert({
          user_id: uid, source_id: "local:" + (r.date || "latest"),
          score_total: r.total != null ? r.total : null,
          mode: (r.plan || null), bottleneck: (r.bottleneck && r.bottleneck.key) || null,
          result: r
        }, { onConflict: "user_id,source_id" }).then(function (x) { if (!x.error) imported.score = true; }));
      }
      if (inv.program) {
        var prog = programView();
        tasks.push(sb.from("program_cycles").upsert({
          user_id: uid, source_id: "local:" + (S.get("c2_start", "") || "cycle"),
          start_date: S.get("c2_start", "") || null, status: "active",
          mode: prog.mode || null, bottleneck: prog.bottleneck || null,
          current_day: prog.day || 1,
          state: { days: S.get("c2_days", null), daily: S.get("c2_daily", null), pulse: S.get("c2_pulse", null), rechecks: S.get("course_rechecks", null), mode_history: S.get("c2_mode_history", null), bn_history: S.get("c2_bn_history", null), paused_days: S.get("c2_paused_days", 0), lifts: S.get("c2_lifts", null) }
        }, { onConflict: "user_id,source_id" }).then(function (x) { if (!x.error) imported.program = true; }));
      }
      return Promise.all(tasks).then(function () {
        S.set("account_migrated_version", 1);
        return { ok: true, imported: imported };
      }).catch(function (e) { return { ok: false, message: String(e && e.message || e) }; });
    },

    migrated: function () { return (S.get("account_migrated_version", 0) || 0) >= 1; },

    // Übergangslösung: bestehenden Zugangscode dem Account gutschreiben.
    // Lokaler Modus: speichert Entitlement lokal. Cloud: schreibt in entitlements (per RPC, serverseitig validiert).
    claimAccessCode: function (code) {
      var norm = (window.MM && MM.vault) ? MM.vault.norm(code) : String(code || "").trim().toUpperCase();
      if (!norm) return Promise.resolve({ ok: false, message: "Kein Code eingegeben." });
      if (!configured() || !sb || !_user) {
        // lokal: als Zugangscode merken (bestehender Vault-Fallback) + Entitlement lokal
        S.set("course_code", norm);
        var e = S.get("account_entitlements", []); if (!Array.isArray(e)) e = [];
        ["protocol", "twelve_week"].forEach(function (k) { if (e.indexOf(k) < 0) e.push(k); });
        S.set("account_entitlements", e); _entitlements = localEntitlements(); emit();
        return Promise.resolve({ ok: true, local: true, message: "Zugang auf diesem Gerät gespeichert." });
      }
      return sb.rpc("claim_access_code", { code: norm }).then(function (r) {
        if (r.error) return { ok: false, message: r.error.message };
        return api.getEntitlements().then(function () { emit(); return { ok: true }; });
      }).catch(function (e) { return { ok: false, message: String(e && e.message || e) }; });
    }
  };

  MM.account = api;
})();
