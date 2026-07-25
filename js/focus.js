/* ==========================================================================
   MALEMETRIX — DER EINE AUFTRAG (MM.focus)

   Die Brücke zwischen erstem Score, Tracker und zweitem Score.

   Warum es das gibt: Der Score diagnostiziert gut, aber er endete bisher
   im Nichts. Wer nach vier Wochen wiederkommt, hat nichts getan, was der
   zweite Durchlauf zeigen könnte — der Vergleich misst dann Zufall.
   Dieser Speicher hält GENAU EINEN Auftrag: abgeleitet aus dem Engpass,
   28 Tage lang, täglich mit Ja/Nein zu beantworten.

   Alles bleibt lokal (MM.store → localStorage). Kein Konto, keine
   Übertragung, keine Einwilligung nötig — es verlässt das Gerät nicht.
   ========================================================================== */

(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  var KEY = "focus";
  var KEY_DONE = "focus_history";
  var S = {
    get: function (k, d) {
      try {
        if (MM.store) return MM.store.get(k, d);
        var raw = localStorage.getItem("mm_" + k);
        return raw ? JSON.parse(raw) : d;
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try {
        if (MM.store) { MM.store.set(k, v); return; }
        localStorage.setItem("mm_" + k, JSON.stringify(v));
      } catch (e) { /* Speicher voll oder blockiert — kein Grund zu scheitern */ }
    }
  };

  function ymd(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function parse(s) { var p = String(s || "").split("-"); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function dayDiff(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

  /* ----------------------------------------------------------------- LESEN */

  function current() {
    var f = S.get(KEY, null);
    if (!f || typeof f !== "object" || !f.title) return null;
    if (!f.done || typeof f.done !== "object") f.done = {};
    return f;
  }

  /* Wie weit ist der Auftrag? Gibt immer ein vollständiges Objekt zurück,
     auch wenn die Frist längst abgelaufen ist — genau dann ist die Auswertung
     nämlich interessant. */
  function progress(f) {
    f = f || current();
    if (!f) return null;
    var heute = ymd();
    var vergangen = Math.min(f.days, Math.max(0, dayDiff(f.started, heute) + 1));
    var erledigt = Object.keys(f.done).filter(function (d) { return f.done[d]; }).length;
    var offen = Math.max(0, dayDiff(heute, f.until));
    return {
      erledigt: erledigt,
      ziel: f.target,
      tage: f.days,
      vergangen: vergangen,
      offen: offen,
      abgelaufen: offen <= 0,
      /* Geschafft heißt: Ziel erreicht. Nicht: jeden Tag perfekt. */
      geschafft: erledigt >= f.target,
      /* Liegt er auf Kurs? Anteil erledigter Tage an den vergangenen,
         gemessen an der Quote, die das Ziel verlangt. */
      aufKurs: vergangen === 0 || (erledigt / vergangen) >= (f.target / f.days) - 0.15,
      heuteErledigt: !!f.done[heute],
      prozent: Math.min(100, Math.round((erledigt / Math.max(1, f.target)) * 100))
    };
  }

  /* ------------------------------------------------------------- SCHREIBEN */

  function start(f) {
    if (!f || !f.title) return null;
    /* Ein laufender Auftrag wird nicht still überschrieben — er wandert in
       die Historie, damit der Vergleich beim nächsten Score ehrlich bleibt. */
    var alt = current();
    if (alt) archive(alt);
    S.set(KEY, f);
    if (MM.track) MM.track("focus_started", { domain: f.domain });
    return f;
  }

  function toggleDay(datum) {
    var f = current();
    if (!f) return null;
    var d = datum || ymd();
    if (f.done[d]) delete f.done[d]; else f.done[d] = true;
    S.set(KEY, f);
    return progress(f);
  }

  function archive(f) {
    f = f || current();
    if (!f) return;
    var h = S.get(KEY_DONE, []);
    if (!Array.isArray(h)) h = [];
    var p = progress(f) || {};
    h.push({
      domain: f.domain, title: f.title, started: f.started, until: f.until,
      erledigt: p.erledigt || 0, ziel: f.target, geschafft: !!p.geschafft,
      scoreAtStart: f.scoreAtStart || null
    });
    S.set(KEY_DONE, h.slice(-12));
  }

  function clear() {
    var f = current();
    if (f) archive(f);
    S.set(KEY, null);
  }

  /* Für den zweiten Score: was ist aus dem letzten Auftrag geworden?
     Berücksichtigt den laufenden UND den zuletzt archivierten. */
  function lastOutcome() {
    var f = current();
    if (f) {
      var p = progress(f);
      return { laufend: !p.abgelaufen, domain: f.domain, title: f.title,
               erledigt: p.erledigt, ziel: f.target, geschafft: p.geschafft,
               offen: p.offen, scoreAtStart: f.scoreAtStart };
    }
    var h = S.get(KEY_DONE, []);
    if (!Array.isArray(h) || !h.length) return null;
    var l = h[h.length - 1];
    return { laufend: false, domain: l.domain, title: l.title, erledigt: l.erledigt,
             ziel: l.ziel, geschafft: l.geschafft, offen: 0, scoreAtStart: l.scoreAtStart };
  }

  MM.focus = {
    current: current,
    progress: progress,
    start: start,
    toggleDay: toggleDay,
    clear: clear,
    archive: archive,
    lastOutcome: lastOutcome,
    history: function () { var h = S.get(KEY_DONE, []); return Array.isArray(h) ? h : []; },
    today: ymd
  };
})();
