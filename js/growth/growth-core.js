/* ==========================================================================
   MaleMetrix Growth OS — Core: Storage, CSV-Parser, Helfer, Audit-Log
   --------------------------------------------------------------------------
   Local-first: ALLE Nutzerdaten liegen in localStorage (Prefix mm_gos_*)
   auf Urals Gerät. Nichts davon liegt im Repository oder auf einem Server.
   Jeder Metrik-Datensatz trägt source / timestamp / verified (§51).
   ========================================================================== */

window.GOS = (function () {
  "use strict";

  /* ---------- Storage (eigener Namespace, unabhängig von MM.store) ---------- */
  var P = "mm_gos_";
  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(P + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function set(key, val) {
    try { localStorage.setItem(P + key, JSON.stringify(val)); return true; }
    catch (e) { log("error", "Speichern fehlgeschlagen: " + key); return false; }
  }
  function remove(key) { try { localStorage.removeItem(P + key); } catch (e) {} }

  var S = {
    videos:   function () { return get("videos", []); },
    saveVideos: function (v) { return set("videos", v); },
    ideas:    function () { return get("ideas", []); },
    saveIdeas: function (v) { return set("ideas", v); },
    search:   function () { return get("search", []); },
    saveSearch: function (v) { return set("search", v); },
    competitors: function () { return get("competitors", []); },
    saveCompetitors: function (v) { return set("competitors", v); },
    missions: function () { return get("missions", {}); },
    saveMissions: function (v) { return set("missions", v); },
    rules:    function () {
      var r = get("rules", null);
      return (r && r.length) ? r : JSON.parse(JSON.stringify(GOS_DATA.DEFAULT_RULES));
    },
    saveRules: function (v) { return set("rules", v); },
    recs:     function () { return get("recs", []); },
    saveRecs: function (v) { return set("recs", v); },
    settings: function () {
      return get("settings", {
        presetKey: "balanced",
        weights: null,             // null => Preset verwenden
        weightsVersion: GOS_DATA.WEIGHTS_VERSION,
        target: null,              // {type:'followers'|'reward'|'views', amount, month:'YYYY-MM'}
        prodMinutesDefault: 90
      });
    },
    saveSettings: function (v) { return set("settings", v); },
    log:      function () { return get("log", []); }
  };

  /* ---------- Audit-Log (§76) — keine Secrets, max. 300 Einträge ---------- */
  function log(kind, msg) {
    try {
      var l = get("log", []);
      l.push({ ts: new Date().toISOString(), kind: kind, msg: String(msg).slice(0, 300) });
      if (l.length > 300) l = l.slice(-300);
      set("log", l);
    } catch (e) {}
  }

  /* ---------- Helfer ---------- */
  function uid(prefix) { return (prefix || "x") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function num(x) { var n = parseFloat(String(x == null ? "" : x).replace(/\./g, "").replace(",", ".")); return isFinite(n) ? n : null; }
  function numRaw(x) { var n = parseFloat(x); return isFinite(n) ? n : null; }
  function fmtInt(n) { return n == null ? "—" : Math.round(n).toLocaleString("de-DE"); }
  function fmtEur(n) { return n == null ? "—" : n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
  function fmtDate(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
    catch (e) { return "—"; }
  }
  function daysAgo(iso) { return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null; }
  function median(arr) {
    var a = arr.filter(function (x) { return x != null && isFinite(x); }).slice().sort(function (x, y) { return x - y; });
    if (!a.length) return null;
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  /* ---------- Metrik-Zugriff: letzter Snapshot = aktueller Stand ---------- */
  function lastSnap(video) {
    var s = video.snapshots || [];
    return s.length ? s[s.length - 1] : null;
  }
  function metric(video, key) {
    var s = lastSnap(video);
    return s && s[key] != null ? s[key] : null;
  }
  /* Ableitungen (§30/§31/§32) — Quelle: interne Berechnung aus importierten Daten */
  function followerPer1k(v) {
    var f = metric(v, "followers"), vw = metric(v, "views");
    return (f != null && vw) ? (f / vw) * 1000 : null;
  }
  function qvRatio(v) {
    var q = metric(v, "qualifiedViews"), vw = metric(v, "views");
    return (q != null && vw) ? q / vw : null;
  }
  function rpm(v) {
    var r = metric(v, "rewardEur"), q = metric(v, "qualifiedViews");
    if (r == null) return null;
    if (q) return (r / q) * 1000;
    var vw = metric(v, "views");
    return vw ? (r / vw) * 1000 : null;
  }
  function rewardPerProdMin(v) {
    var r = metric(v, "rewardEur");
    return (r != null && v.prodMinutes) ? r / v.prodMinutes : null;
  }
  function engagementRate(v) {
    var vw = metric(v, "views");
    if (!vw) return null;
    var e = (metric(v, "likes") || 0) + (metric(v, "comments") || 0) + (metric(v, "shares") || 0);
    return e / vw;
  }

  /* ---------- CSV-Parser (quote-fähig) ---------- */
  function parseCSV(text) {
    var rows = [], row = [], cur = "", inQ = false, sep = null;
    // Trennzeichen erkennen: mehr Semikolons als Kommas in Kopfzeile => ';'
    var head = text.split(/\r?\n/)[0] || "";
    sep = (head.split(";").length > head.split(",").length) ? ";" : ",";
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === sep) { row.push(cur); cur = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(cur); cur = "";
          if (row.length > 1 || row[0] !== "") rows.push(row);
          row = [];
        } else cur += c;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  /* Header-Erkennung für TikTok-Studio-/eigene Exporte (deutsch + englisch).
     Nur eine VORBELEGUNG — der Nutzer bestätigt das Mapping vor dem Import (§50). */
  var HEADER_GUESS = [
    { field: "title",          re: /titel|title|name|beschreibung|caption/i },
    { field: "postAt",         re: /datum|date|zeit|time|posted|veröffentlicht/i },
    { field: "views",          re: /aufrufe|views|videoaufrufe|plays/i },
    { field: "likes",          re: /likes|gefällt/i },
    { field: "comments",       re: /kommentar|comment/i },
    { field: "shares",         re: /geteilt|shares|share|weiterleit/i },
    { field: "saves",          re: /gespeichert|saves|favorit/i },
    { field: "followers",      re: /follower|abonn/i },
    { field: "qualifiedViews", re: /qualifi|gültige|valid.*view/i },
    { field: "rewardEur",      re: /reward|vergütung|einnahmen|revenue|belohnung|prämie/i },
    { field: "lengthSec",      re: /dauer|länge|duration|length/i },
    { field: "url",            re: /url|link/i },
    { field: "watchTimeSec",   re: /wiedergabezeit|watch.?time|watchzeit/i },
    { field: "retention",      re: /retention|abschluss|completion|durchschnittlich.*angesehen/i }
  ];
  function guessHeader(h) {
    for (var i = 0; i < HEADER_GUESS.length; i++) {
      if (HEADER_GUESS[i].re.test(h)) return HEADER_GUESS[i].field;
    }
    return "";
  }

  /* ---------- Datenexport / -löschung (DSGVO, §75) ---------- */
  function exportAll() {
    var keys = ["videos", "ideas", "search", "competitors", "missions", "rules", "recs", "settings", "log"];
    var out = { exportedAt: new Date().toISOString(), app: "malemetrix-growth-os", version: 1 };
    keys.forEach(function (k) { out[k] = get(k, null); });
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "growth-os-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    log("export", "Backup exportiert");
  }
  function importAll(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        if (d.app !== "malemetrix-growth-os") throw new Error("Kein Growth-OS-Backup");
        ["videos", "ideas", "search", "competitors", "missions", "rules", "recs", "settings"].forEach(function (k) {
          if (d[k] != null) set(k, d[k]);
        });
        log("import", "Backup importiert");
        cb(null);
      } catch (e) { cb(e.message || "Ungültige Datei"); }
    };
    reader.readAsText(file);
  }
  function deleteAll() {
    ["videos", "ideas", "search", "competitors", "missions", "rules", "recs", "settings", "log"].forEach(remove);
  }

  return {
    S: S, log: log, uid: uid, esc: esc, num: num, numRaw: numRaw,
    fmtInt: fmtInt, fmtEur: fmtEur, fmtDate: fmtDate, daysAgo: daysAgo, median: median,
    lastSnap: lastSnap, metric: metric,
    followerPer1k: followerPer1k, qvRatio: qvRatio, rpm: rpm,
    rewardPerProdMin: rewardPerProdMin, engagementRate: engagementRate,
    parseCSV: parseCSV, guessHeader: guessHeader,
    exportAll: exportAll, importAll: importAll, deleteAll: deleteAll
  };
})();
