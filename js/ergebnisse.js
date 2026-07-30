/* ==========================================================================
   MALEMETRIX — ERGEBNISSE / FALLSTUDIEN (Renderer)
   Rendert ausschließlich Einträge, die MM.caseStudies.isPublishable() passieren.
   Kein Eintrag → ehrlicher Leerzustand statt Platzhalter-Erfolgsgeschichten.
   ========================================================================== */
(function () {
  "use strict";
  var MM = (window.MM = window.MM || {});
  var list = document.getElementById("csList");
  if (!list) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fx(n) { return (Math.round(n * 10) / 10).toFixed(1).replace(".", ","); }
  function EN() { return !!(MM.i18n && MM.i18n.lang === "en"); }
  function L(de, en) { return EN() ? en : de; }

  var LOWER_BETTER = { waist: true };

  function emptyState() {
    return '<div class="cs-empty">' +
      '<h3>' + L("Noch keine veröffentlichte Fallstudie.", "No published case study yet.") + '</h3>' +
      '<p>' + L(
        "MaleMetrix ist jung. Es gibt bisher keinen abgeschlossenen 12-Wochen-Durchlauf, für den eine schriftliche Einwilligung zur Veröffentlichung vorliegt. Deshalb steht hier nichts — statt erfundener Erfolgsgeschichten, gekaufter Bewertungen oder Stockfoto-Transformationen.",
        "MaleMetrix is young. So far there is no completed 12-week cycle with written consent to publish. That is why this page is empty — instead of invented success stories, bought reviews or stock-photo transformations."
      ) + '</p>' +
      '<p style="margin-top:10px">' + L(
        "Das ist das größte offene Risiko beim Kauf, und es wird hier nicht weggeredet: Du kaufst aktuell eine Methode und ein System, keinen belegten Ergebnis-Durchschnitt. Was du prüfen kannst, steht offen — Methode, Datenlücken, Grenzen:",
        "That is the biggest open risk when buying, and it is not glossed over here: right now you are buying a method and a system, not a proven average result. What you can check is disclosed — method, data gaps, limits:"
      ) + ' <a href="trust.html">' + L("Vertrauen &amp; Methodik", "Trust &amp; method") + '</a> · <a href="ueber.html">' + L("Über den Gründer", "About the founder") + '</a>.</p>' +
      '<p style="margin-top:10px" class="small muted">' + L(
        "Diese Seite füllt sich nur über echte Durchläufe. Der erste Eintrag erscheint frühestens 12 Wochen nach dem Start des ersten Teilnehmers.",
        "This page only fills up through real cycles. The first entry appears at the earliest 12 weeks after the first participant starts."
      ) + '</p></div>';
  }

  function metricRows(cs) {
    var rows = (cs.metrics || []).map(function (m) {
      if (m.w0 == null || m.w12 == null) {
        return "<tr><td>" + esc(m.label) + "</td><td>" + val(m.w0) + "</td><td>" + val(m.w4) + "</td><td>" + val(m.w8) + "</td><td>" + val(m.w12) + "</td><td>—</td></tr>";
      }
      var d = Math.round((m.w12 - m.w0) * 10) / 10;
      var good = LOWER_BETTER[m.key] ? d < 0 : d > 0;
      var cls = Math.abs(d) < 0.05 ? "" : (good ? "d-good" : "d-bad");
      return "<tr><td>" + esc(m.label) + "</td><td>" + val(m.w0) + "</td><td>" + val(m.w4) + "</td><td>" + val(m.w8) + "</td><td>" + val(m.w12) +
        '</td><td class="' + cls + '">' + (Math.abs(d) < 0.05 ? "±0" : (d > 0 ? "+" : "−") + fx(Math.abs(d))) + "</td></tr>";
    }).join("");
    function val(v) { return v == null ? "—" : esc(String(v)); }
    return '<table class="cs-tab"><thead><tr><th>' + L("Wert", "Metric") + "</th><th>W0</th><th>W4</th><th>W8</th><th>W12</th><th>Δ</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }

  function card(cs) {
    var vf = MM.caseStudies.verification[cs.verified] || {};
    var c = cs.context || {};
    var head = [];
    if (c.age != null) head.push(c.age + L(" Jahre", " years"));
    if (c.situation) head.push(c.situation);
    if (c.strengthDaysPerWeek) head.push(c.strengthDaysPerWeek + L("× Training/Woche", "× training/week"));
    if (c.mode) head.push(c.mode);

    return '<article class="cs-card">' +
      '<div class="cs-head"><span class="cs-tag">' + esc(cs.id) + " · " + esc(EN() ? vf.en : vf.de) + '</span>' +
      '<span class="cs-tag">' + esc(cs.adherencePct) + " % " + L("Umsetzung", "adherence") + '</span></div>' +
      "<h3>" + esc(head.join(" · ")) + "</h3>" +
      '<p class="small muted">' + L("Engpass zu Beginn", "Bottleneck at start") + ": <b>" + esc(cs.bottleneck && cs.bottleneck.start || "—") + "</b> → " +
      L("am Ende", "at the end") + ": <b>" + esc(cs.bottleneck && cs.bottleneck.end || "—") + "</b></p>" +
      metricRows(cs) +
      (cs.weakWeeks && cs.weakWeeks.length
        ? '<p class="small muted">' + L("Wochen mit gerissener Umsetzung", "Weeks where execution broke") + ": " + esc(cs.weakWeeks.join(", ")) + "</p>"
        : "") +
      '<div class="cs-honest"><b>' + L("WAS NICHT FUNKTIONIERT HAT", "WHAT DID NOT WORK") + "</b><p>" + esc(cs.notWorking) + "</p></div>" +
      (cs.quote ? '<blockquote style="margin:14px 0 0;color:var(--muted)">„' + esc(cs.quote) + "“</blockquote>" : "") +
      '<p class="small muted" style="margin-top:12px">' + L("Prüftiefe", "Verification") + ": " + esc(EN() ? vf.en : vf.de) +
      (vf.note ? " — " + esc(EN() ? vf.note.en : vf.note.de) : "") +
      (cs.published ? " · " + L("veröffentlicht", "published") + " " + esc(cs.published) : "") + "</p>" +
      "</article>";
  }

  function render() {
    var pub = (MM.caseStudies && MM.caseStudies.published) ? MM.caseStudies.published() : [];
    if (!pub.length) { list.innerHTML = emptyState(); return; }
    list.innerHTML =
      '<p class="small muted" style="margin-bottom:16px">' +
      pub.length + " " + L("dokumentierte Durchläufe", "documented cycles") + ". " +
      L("Nur eingetragene Werte, keine Hochrechnungen.", "Entered values only, no extrapolation.") + "</p>" +
      pub.map(card).join("");
  }

  render();
  document.addEventListener("mm:langchange", render);
})();
