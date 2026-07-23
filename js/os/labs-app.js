/* ==========================================================================
   MALEMETRIX LABS — UI  (renders into #mmLabs)  · Phase 4
   --------------------------------------------------------------------------
   "Biology over time" — nicht Excel. Kategorie-Dashboard, Top-3-Prioritäten,
   Trend-Sparklines, Insight-Cards, Enhanced-Monitoring, Blood-Test-Builder,
   Recheck-Plan, Import-Review-Scaffold. Keine Diagnose, keine Ampel-Only,
   keine erfundenen Optimal-Ranges. Biomarker gehen NIE an Analytics.
   ========================================================================== */
(function () {
  "use strict";
  var host = document.getElementById("mmLabs");
  if (!host || !window.MM || !MM.labs || !MM.labsData) return;
  var L = MM.labs, LD = MM.labsData;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  var TABS = ["overview", "markers", "monitoring", "builder", "add"];
  function tab() { var h = (location.hash || "#overview").slice(1).split("?")[0]; return TABS.indexOf(h) >= 0 ? h : "overview"; }
  window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });

  var DIR = { up: "↑", down: "↓", stable: "→" };
  function statusLabel(l) {
    return { improving_or_down: "Verbessert/↓", worsening_or_up: "Steigt/↑", outside_lab_range: "Außerhalb Laborbereich", stable: "Stabil" }[l] || l;
  }
  function spark(series) {
    if (!series || series.length < 2) return "";
    var vals = series.map(function (r) { return L.cval(r); });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = (max - min) || 1, w = 90, h = 26;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + "," + (h - 3 - (v - min) / span * (h - 6)).toFixed(1); }).join(" ");
    return '<svg class="lab-spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>';
  }

  function vOverview() {
    var res = L.results();
    if (!res.length) {
      return '<section class="lab-hero"><span class="lab-eyebrow">MALEMETRIX LABS</span><h1>Deine Biologie, über die Zeit.</h1><p class="muted">Werte werden zu Kontext: was sich verändert, was zählt, was zu deinen Zielen passt, was du nachkontrollieren solltest. Kein Diagnose-Tool.</p>' +
        '<a class="btn btn-primary" href="#add">Ersten Laborwert eintragen →</a> <a class="os-ghost" href="#builder">Mein Panel planen</a></section>' +
        '<div class="lab-empty"><p class="small muted">Noch keine Laborwerte. Trage manuell ein oder plane über den Blood-Test-Builder, welche Marker für deinen Pathway sinnvoll sind.</p></div>';
    }
    var prios = L.priorities();
    var cats = L.categorySummary();
    var due = L.rechecksDue();
    var comp = L.completeness();
    var html = '<section class="lab-hero mini"><span class="lab-eyebrow">MALEMETRIX LABS</span><h1>Deine Biologie, über die Zeit.</h1></section>';
    // Top-3 Prioritäten
    if (prios.length) {
      html += '<section class="lab-sec"><h2 class="lab-h2">Top-Prioritäten</h2><div class="lab-prios">' + prios.map(function (p, i) {
        var t = p.status.trend;
        return '<a class="lab-prio" href="#markers?m=' + p.markerId + '"><span class="n">' + (i + 1) + '</span><div><b>' + esc(p.name) + '</b><span>' + (t ? (t.direction === "up" ? "steigt" : t.direction === "down" ? "fällt" : "stabil") + (t.pctChange != null ? " · " + (t.pctChange > 0 ? "+" : "") + t.pctChange + " %" : "") : statusLabel(p.status.label)) + '</span></div>' + spark(L.seriesFor(p.markerId)) + '<i>' + (t ? DIR[t.direction] : "") + '</i></a>';
      }).join("") + '</div></section>';
    }
    // Kategorie-Dashboard
    html += '<section class="lab-sec"><h2 class="lab-h2">Kategorien</h2><div class="lab-cats">' + cats.map(function (c) {
      var bits = [];
      if (c.improving) bits.push(c.improving + " verbessert");
      if (c.worsening) bits.push(c.worsening + " steigend");
      if (c.followup) bits.push(c.followup + " Follow-up");
      if (!bits.length) bits.push("stabil");
      return '<a class="lab-cat' + (c.followup ? " flag" : "") + '" href="#markers?c=' + c.category + '"><b>' + esc(c.label) + '</b><span>' + c.count + ' Marker</span><i>' + esc(bits.join(" · ")) + '</i></a>';
    }).join("") + '</div></section>';
    // Recheck fällig
    if (due.length) html += '<section class="lab-sec"><h2 class="lab-h2">Recheck fällig</h2><div class="lab-due">' + due.map(function (d) { var m = LD.marker(d.markerId); return '<div class="lab-duerow"><b>' + esc(m.name) + '</b><span>' + esc(d.note) + '</span></div>'; }).join("") + '</div></section>';
    // Vollständigkeit
    if (comp.missing.length) html += '<section class="lab-sec"><div class="lab-complete"><span class="tag">DEIN PANEL</span><p>' + comp.haveCount + ' Marker vorhanden · ' + comp.missing.length + ' nützliche Kontextmarker fehlen für deinen Pathway.</p><p class="small muted">Erwägen: ' + comp.missing.slice(0, 5).map(function (m) { return esc(m.name); }).join(" · ") + '. <a href="#builder" style="color:var(--accent)">Panel planen →</a></p></div></section>';
    html += '<p class="lab-nobody"><span class="tag">WHAT NOBODY TELLS YOU</span>Ein Wert kann im Laborbereich liegen und sich trotzdem über Zeit in die falsche Richtung bewegen. Der Trend sagt oft mehr als die einzelne Zahl.</p>';
    return html;
  }

  function vMarkers() {
    var q = new URLSearchParams((location.hash.split("?")[1] || ""));
    var filterCat = q.get("c"), focusM = q.get("m");
    var res = L.results();
    var ids = {}; res.forEach(function (r) { ids[r.markerId] = 1; });
    var list = Object.keys(ids).map(function (id) { return LD.marker(id); }).filter(Boolean);
    if (filterCat) list = list.filter(function (m) { return m.category === filterCat; });
    var html = '<section class="lab-sec"><div class="lab-filters">' +
      '<a class="lab-chip ' + (!filterCat ? "sel" : "") + '" href="#markers">Alle</a>' +
      LD.CATEGORIES.filter(function (c) { return res.some(function (r) { return LD.marker(r.markerId).category === c.id; }); }).map(function (c) { return '<a class="lab-chip ' + (filterCat === c.id ? "sel" : "") + '" href="#markers?c=' + c.id + '">' + esc(c.label) + '</a>'; }).join("") + '</div>';
    if (!list.length) return html + '<p class="small muted">Keine Marker in dieser Kategorie.</p></section>';
    html += list.map(function (m) {
      var ins = L.insight(m.id); var st = ins.status; var l = st.latest; var series = L.seriesFor(m.id);
      var open = focusM === m.id;
      var rangeTxt = l.refText || (l.refLow != null || l.refHigh != null ? ((l.refLow != null ? l.refLow : "") + "–" + (l.refHigh != null ? l.refHigh : "") + " " + l.unit) : "keine Referenz angegeben");
      var rsCls = st.rangeStatus === "within" ? "in" : st.rangeStatus === "no_range" ? "no" : "out";
      return '<details class="lab-marker" ' + (open ? "open" : "") + '><summary><div class="lm-head"><b>' + esc(m.name) + '</b>' + spark(series) + '</div>' +
        '<div class="lm-val"><span class="v">' + L.cval(l) + ' <i>' + esc(L.cunit(l)) + '</i></span>' + (st.trend && st.trend.changed ? '<span class="lm-tr ' + st.trend.direction + '">' + DIR[st.trend.direction] + ' ' + (st.trend.pctChange != null ? (st.trend.pctChange > 0 ? "+" : "") + st.trend.pctChange + "%" : "") + '</span>' : '') + '</div></summary>' +
        '<div class="lm-body">' +
        '<div class="lm-rows"><div class="lm-r"><span>Labor-Referenz</span><b class="rs-' + rsCls + '">' + esc(rangeTxt) + (st.rangeStatus === "above" ? " · über Bereich" : st.rangeStatus === "below" ? " · unter Bereich" : st.rangeStatus === "within" ? " · im Bereich" : "") + '</b></div>' +
        '<div class="lm-r"><span>MaleMetrix-Kontext</span><b>' + esc(ins.what) + '</b></div>' +
        (l.fasted ? '<div class="lm-r"><span>Nüchtern</span><b>ja</b></div>' : '') + '</div>' +
        '<p class="lm-why">' + esc(m.why) + '</p>' +
        (ins.couldExplain.length ? '<div class="lm-explain"><span class="tag">WAS ES ERKLÄREN KÖNNTE</span>' + ins.couldExplain.map(function (e) { return '<p>' + esc(e) + '</p>'; }).join("") + '</div>' : '') +
        (ins.recheck && ins.recheck.weeks ? '<p class="lm-recheck">Recheck-Fenster: ~' + ins.recheck.weeks + ' Wochen' + (ins.recheck.due ? ' — jetzt fällig.' : '.') + '</p>' : '') +
        (ins.discuss ? '<p class="lm-discuss">' + esc(ins.discuss) + '</p>' : '') +
        (m.related && m.related.length ? '<p class="small muted">Zusammen lesen mit: ' + m.related.map(function (r) { var rm = LD.marker(r); return rm ? esc(rm.name) : r; }).join(" · ") + '</p>' : '') +
        '<div class="lm-series">' + series.slice().reverse().map(function (r) { return '<div><span>' + esc(r.date) + '</span><b>' + L.cval(r) + ' ' + esc(L.cunit(r)) + '</b><i>' + esc(r.source) + (r.fasted ? " · nüchtern" : "") + '</i></div>'; }).join("") + '</div>' +
        '</div></details>';
    }).join("") + '</section>';
    return html;
  }

  function vMonitoring() {
    var pw = (window.MM.os && MM.os.pathway) ? MM.os.pathway() : "";
    if (pw !== "enhanced") {
      return '<section class="lab-sec"><h2 class="lab-h2">Enhanced Monitoring</h2><p class="muted">Die Enhanced-Monitoring-Ansicht ist für den Enhanced-Pathway gedacht. Dein Pathway ist ' + esc(pw ? pw.toUpperCase() : "nicht gesetzt") + '.</p><p class="small muted">Du erreichst dieselben Marker jederzeit unter „Marker“. <a href="mein-protokoll.html#pathway" style="color:var(--accent)">Pathway ändern</a></p></section>';
    }
    var groups = L.enhancedMonitoring();
    return '<section class="lab-sec"><h2 class="lab-h2">Enhanced Monitoring</h2><p class="small muted" style="margin-bottom:14px">Latest · Trend · zuletzt geprüft · nächstes Kontext-Fenster. Educational — keine Substanz- oder Dosissteuerung.</p>' +
      groups.map(function (g) {
        return '<div class="lab-mon"><div class="mon-h">' + esc(g.label) + ' <span>' + g.measured + '/' + g.rows.length + '</span></div>' +
          g.rows.map(function (r) {
            if (!r.has) return '<div class="mon-row missing"><b>' + esc(r.name) + '</b><span>—</span><i>nicht gemessen</i></div>';
            return '<div class="mon-row"><b>' + esc(r.name) + '</b><span>' + r.value + ' ' + esc(r.unit) + '</span>' +
              '<i>' + (r.trend && r.trend.changed ? DIR[r.trend.direction] + ' ' : '') + esc(r.date) + (r.recheck && r.recheck.due ? ' · Recheck fällig' : r.recheck && r.recheck.weeks ? ' · ~' + r.recheck.weeks + 'w' : '') + '</i></div>';
          }).join("") + '</div>';
      }).join("") +
      '<div class="lab-mon-note"><span class="tag">DO NOT IGNORE</span><p>Steigender Hämatokrit ist ein echtes kardiovaskuläres Kontextsignal — mit Blutdruck und Hydration lesen und fachlich begleiten lassen. MaleMetrix stellt hier keine Therapie ein.</p></div></section>';
  }

  function vBuilder() {
    var b = L.panelBuilder();
    function grp(title, arr, sub) {
      if (!arr.length) return "";
      return '<details class="lab-bgrp" open><summary><b>' + esc(title) + '</b> <span>' + arr.length + ' Marker</span></summary>' + (sub ? '<p class="small muted">' + esc(sub) + '</p>' : '') +
        arr.map(function (m) { return '<div class="lab-brow"><div><b>' + esc(m.name) + '</b><p>' + esc(m.why) + '</p></div>' + (m.recheck && m.recheck.weeks ? '<span>~' + m.recheck.weeks + 'w</span>' : '') + '</div>'; }).join("") + '</details>';
    }
    return '<section class="lab-sec"><h2 class="lab-h2">Dein Lab-Panel</h2><p class="muted">Zusammengestellt aus deinem Pathway (' + esc(b.pathway.toUpperCase()) + ') und Zielen — nur nützliche Marker, nicht „alles testen“. Besprich Umfang und Timing mit deinem Arzt/Labor.</p>' +
      grp("CORE", b.core, "Fundament für jeden Mann.") +
      grp("ZIEL-SPEZIFISCH", b.goal, "Für deinen Pathway besonders sinnvoll.") +
      grp("ADVANCED", b.advanced) +
      grp("OPTIONAL", b.optional) +
      '<p class="small muted">MaleMetrix erstellt keine Laborüberweisung — das ist eine Orientierung, welche Marker Kontext liefern.</p></section>';
  }

  function vAdd() {
    var opts = LD.MARKERS.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + ' (' + esc(m.unit) + ')</option>'; }).join("");
    return '<section class="lab-sec"><h2 class="lab-h2">Laborwert eintragen</h2>' +
      '<div class="lab-form"><label class="os-field"><span>Marker</span><select id="laMarker">' + opts + '</select></label>' +
      '<div class="os-grid2"><label class="os-field"><span>Wert</span><input id="laVal" type="number" inputmode="decimal" step="any"></label>' +
      '<label class="os-field"><span>Einheit</span><input id="laUnit" type="text" placeholder="mg/dL"></label></div>' +
      '<div class="os-grid2"><label class="os-field"><span>Datum</span><input id="laDate" type="date"></label>' +
      '<label class="os-field"><span>Labor (optional)</span><input id="laLab" type="text" placeholder="z. B. Hausarzt"></label></div>' +
      '<div class="os-grid2"><label class="os-field"><span>Referenz min (optional)</span><input id="laLow" type="number" inputmode="decimal" step="any"></label>' +
      '<label class="os-field"><span>Referenz max (optional)</span><input id="laHigh" type="number" inputmode="decimal" step="any"></label></div>' +
      '<label class="lab-chk"><input type="checkbox" id="laFast"> nüchtern gemessen</label>' +
      '<button id="laSave" class="btn btn-primary" style="margin-top:12px">Wert speichern</button><p id="laMsg" class="small" style="display:none;margin-top:8px"></p></div>' +
      // §7/§63 Import-Scaffold (kein Fake-OCR)
      '<div class="lab-import"><span class="tag">PDF / FOTO IMPORT</span><p class="small muted">Upload → Werte prüfen → bestätigen. Automatische Extraktion wird ehrlich erst aktiv, wenn ein echter Parser angebunden ist — nichts wird ungeprüft gespeichert.</p><label class="lab-upload"><input type="file" id="laFile" accept="application/pdf,image/*" hidden><span>Datei wählen</span></label><div id="laReview"></div></div>' +
      '</section>';
  }

  function render() {
    var pw = (window.MM.os && MM.os.pathway) ? MM.os.pathway() : "";
    var t = tab();
    var nav = '<nav class="lab-nav">' + [["overview", "Übersicht"], ["markers", "Marker"], (pw === "enhanced" ? ["monitoring", "Monitoring"] : null), ["builder", "Panel"], ["add", "Eintragen"]].filter(Boolean).map(function (it) { return '<a href="#' + it[0] + '" class="' + (t === it[0] ? "on" : "") + '">' + it[1] + '</a>'; }).join("") + '</nav>';
    var body = t === "markers" ? vMarkers() : t === "monitoring" ? vMonitoring() : t === "builder" ? vBuilder() : t === "add" ? vAdd() : vOverview();
    host.innerHTML = '<div class="lab-shell">' + nav + '<div class="lab-body">' + body + '</div></div>';
    bindOnce();
  }

  var _bound = false;
  function bindOnce() {
    if (_bound) return; _bound = true;
    host.addEventListener("click", function (e) {
      if (e.target.closest("#laSave")) {
        var g = function (id) { var el = document.getElementById(id); return el ? el.value : ""; };
        var res = L.addResult({ markerId: g("laMarker"), value: g("laVal"), unit: g("laUnit"), date: g("laDate") || undefined, refLow: g("laLow") || null, refHigh: g("laHigh") || null, labName: g("laLab"), fasted: (document.getElementById("laFast") || {}).checked, source: "manual" });
        var msg = document.getElementById("laMsg");
        if (msg) { msg.style.display = "block"; msg.style.color = res.ok ? "var(--green,#3ddc84)" : "var(--amber,#f5a623)"; msg.textContent = res.ok ? (res.duplicate ? "Wert existiert bereits (kein Duplikat angelegt)." : "Gespeichert.") : (res.reason === "unknown_marker" ? "Marker nicht erkannt." : "Ungültiger Wert."); }
        if (res.ok && !res.duplicate) setTimeout(function () { location.hash = "#overview"; }, 700);
        return;
      }
    });
    host.addEventListener("change", function (e) {
      var f = e.target.closest("#laFile");
      if (f && f.files && f.files[0]) {
        // §7 ehrliches Scaffold: kein Fake-Parse. Zeigt Review-Zustand "pending".
        var rev = document.getElementById("laReview");
        if (rev) rev.innerHTML = '<div class="lab-pending"><b>' + esc(f.files[0].name) + '</b><p class="small muted">Automatische Extraktion ist noch nicht angebunden. Trage die Werte oben manuell ein — sie werden dann geprüft gespeichert. So wird nie ein falsch erkannter Wert stillschweigend übernommen.</p></div>';
      }
      // Marker gewählt → Einheit vorbefüllen
      var sel = e.target.closest("#laMarker");
      if (sel) { var m = LD.marker(sel.value); var u = document.getElementById("laUnit"); if (m && u && !u.value) u.value = m.unit; }
    });
  }

  // Pathway kann sich async laden (Account) → auf Bereitschaft warten.
  if (window.MM.account && MM.account.whenReady) MM.account.whenReady().then(render).catch(render);
  else render();
})();
