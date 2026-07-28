/* ==========================================================================
   MALEMETRIX — DER EINE AUFTRAG (MM.focus)

   Die Brücke zwischen erstem Score, Tracker und zweitem Score.

   Warum es das gibt: Der Score diagnostiziert gut, aber er endete bisher
   im Nichts. Wer nach vier Wochen wiederkommt, hat nichts getan, was der
   zweite Durchlauf zeigen könnte — der Vergleich misst dann Zufall.
   Dieser Speicher hält GENAU EINEN Auftrag: abgeleitet aus dem Engpass,
   für eine Fokusphase von 7, 14 oder 28 Tagen, täglich mit Ja/Nein zu
   beantworten. Bestandsaufträge ohne gespeicherte Dauer gelten weiter als
   28 Tage (Abwärtskompatibilität, nichts wird umgeschrieben).

   Getrennt geprüft wird am Ende (Ergebnisprüfung als Oberbegriff):
   · Umsetzungsprüfung — wurde der Auftrag ausreichend umgesetzt?
   · Wirkungsprüfung — hat er erkennbar geholfen? Sie darf später liegen
     (wirkungBis) und bleibt bis dahin ehrlich „offen".

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
  /* Kalendertage addieren (setDate-Semantik): kein Off-by-one an
     Zeitumstellungen oder lokalen Tagesgrenzen. */
  function addDays(s, n) { var d = parse(s); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }

  /* Zulässige Wirkungs-Urteile (Wirkungsprüfung, getrennt von der
     Umsetzung): erkennbar · teilweise · nicht_erkennbar · offen · unklar
     („unklar" = Datenlage reicht nicht für ein Urteil). */
  var WIRKUNG = ["erkennbar", "teilweise", "nicht_erkennbar", "offen", "unklar"];
  var WIRKUNG_LABEL = {
    erkennbar: "Wirkung erkennbar",
    teilweise: "teilweise Wirkung erkennbar",
    nicht_erkennbar: "keine erkennbare Wirkung",
    offen: "Wirkung noch offen",
    unklar: "Datenlage reicht nicht für ein Urteil"
  };

  /* ----------------------------------------------------------------- LESEN */

  function current() {
    var f = S.get(KEY, null);
    if (!f || typeof f !== "object" || !f.title) return null;
    if (!f.done || typeof f.done !== "object") f.done = {};
    /* Abwärtskompatibilität — NUR im Speicherabbild normalisieren, nie
       zurückschreiben: Alt-Aufträge ohne Dauer bleiben 28-Tage-Aufträge. */
    if (!f.days) f.days = 28;
    if (!f.target) f.target = 20;
    if (!f.until && f.started) f.until = addDays(f.started, f.days);
    if (!f.wirkfrist) f.wirkfrist = f.days;
    if (!f.wirkungBis && f.started) f.wirkungBis = addDays(f.started, Math.max(f.days, f.wirkfrist));
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
      prozent: Math.min(100, Math.round((erledigt / Math.max(1, f.target)) * 100)),
      /* Umsetzungsquote über die bereits vergangenen Tage. */
      quote: vergangen > 0 ? Math.round((erledigt / vergangen) * 100) : 0,
      /* Tage ohne Häkchen: ehrlich als „nicht erfasst oder nicht
         umgesetzt" — sie zählen nie als Erfolg, aber auch nicht
         automatisch als bewusstes Scheitern. */
      ohneEintrag: Math.max(0, vergangen - erledigt)
    };
  }

  /* ------------------------------------------------ ERGEBNISPRÜFUNG ------ */

  /* UMSETZUNGSPRÜFUNG am Ende der Fokusphase. Urteil aus den erfassten
     Tagen (dokumentierte Regel, kein willkürlicher Grenzwert):
       ausreichend      erledigt ≥ Ziel   (Ziel = Toleranzprinzip 5–6/7)
       teilweise        erledigt ≥ Ziel/2 (mindestens die halbe Zielquote)
       nicht_ausreichend darunter
     Fehlende Einträge gelten dabei NIE als umgesetzt. */
  function umsetzung(f) {
    f = f || current();
    if (!f) return null;
    var p = progress(f);
    var verdict = p.erledigt >= f.target ? "ausreichend"
      : p.erledigt >= Math.ceil(f.target / 2) ? "teilweise"
      : "nicht_ausreichend";
    return {
      verdict: verdict,
      erledigt: p.erledigt, ziel: f.target, tage: f.days,
      quote: p.quote, ohneEintrag: p.ohneEintrag,
      faelligAm: f.until, faellig: p.abgelaufen
    };
  }

  /* WIRKUNGSPRÜFUNG — getrennt von der Umsetzung. Vor `wirkungBis` und
     ohne erfasstes Urteil ist die Wirkung ehrlich „offen"; eine schlechte
     Umsetzung macht die Wirkung nicht bewertbar (unklar), nie „gescheitert". */
  function wirkung(f) {
    f = f || current();
    if (!f) return null;
    var heute = ymd();
    var beurteilbar = heute >= (f.wirkungBis || f.until);
    var u = umsetzung(f);
    return {
      erfasst: f.wirkung || null,
      verdict: (f.wirkung && f.wirkung.verdict) || "offen",
      label: WIRKUNG_LABEL[(f.wirkung && f.wirkung.verdict) || "offen"],
      faelligAm: f.wirkungBis || f.until,
      spaeterAlsUmsetzung: (f.wirkungBis || f.until) > f.until,
      beurteilbar: beurteilbar,
      /* Ohne ausreichende Umsetzung ist ein Wirkungs-Urteil nicht belastbar. */
      belastbar: u ? u.verdict !== "nicht_ausreichend" : false
    };
  }

  /* Wirkungs-Urteil erfassen — am laufenden/abgelaufenen Auftrag, sonst am
     zuletzt archivierten (additiv, ohne bestehende Felder umzuschreiben). */
  function setWirkung(verdict, note) {
    if (WIRKUNG.indexOf(verdict) < 0) return false;
    var rec = { verdict: verdict, date: ymd() };
    if (note) rec.note = String(note).slice(0, 200);
    var f = current();
    if (f) { f.wirkung = rec; S.set(KEY, f); return true; }
    var h = S.get(KEY_DONE, []);
    if (Array.isArray(h) && h.length) { h[h.length - 1].wirkung = rec; S.set(KEY_DONE, h); return true; }
    return false;
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
      scoreAtStart: f.scoreAtStart || null,
      /* Additive Felder (Paket 2) — alte Einträge bleiben unverändert lesbar. */
      days: f.days || 28, quote: p.quote || 0,
      wirkung: f.wirkung || null, wirkungBis: f.wirkungBis || null
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
               offen: p.offen, scoreAtStart: f.scoreAtStart,
               days: f.days || 28, wirkung: f.wirkung || null, wirkungBis: f.wirkungBis || null };
    }
    var h = S.get(KEY_DONE, []);
    if (!Array.isArray(h) || !h.length) return null;
    var l = h[h.length - 1];
    return { laufend: false, domain: l.domain, title: l.title, erledigt: l.erledigt,
             ziel: l.ziel, geschafft: l.geschafft, offen: 0, scoreAtStart: l.scoreAtStart,
             days: l.days || 28, wirkung: l.wirkung || null, wirkungBis: l.wirkungBis || null };
  }

  MM.focus = {
    current: current,
    progress: progress,
    start: start,
    toggleDay: toggleDay,
    clear: clear,
    archive: archive,
    lastOutcome: lastOutcome,
    umsetzung: umsetzung,
    wirkung: wirkung,
    setWirkung: setWirkung,
    wirkungLabel: function (v) { return WIRKUNG_LABEL[v] || v; },
    history: function () { var h = S.get(KEY_DONE, []); return Array.isArray(h) ? h : []; },
    today: ymd,
    addDays: addDays
  };
})();
