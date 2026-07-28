/* ==========================================================================
   MALEMETRIX — OPTIMIERUNGSPUNKTE (MM.points)

   Die kleine gemeinsame fachliche Klammer:
     Optimierungsbereich → Engpass → Optimierungspunkt → Maßnahme →
     Umsetzung → Ergebnisprüfung → Abschluss oder persönlicher Standard

   WARUM EIN EIGENER, SCHLANKER SPEICHER (und keine Erweiterung von
   intel_decisions — Befund aus den realen Codepfaden):
     1. Ladekontext: check.html und tracker.html laden die Intelligence-
        Schicht NICHT. Ein Punkt entsteht aber genau dort (Auftrag starten).
        Rohes Schreiben in mm_intel_decisions aus einem zweiten Modul würde
        die ID-Sequenz (intel_seq) und Form von memory.js duplizieren — also
        genau die zweite Schreib-Wahrheit, die vermieden werden soll.
     2. Bedeutung: sechs Konsumenten behandeln JEDEN Ledger-Eintrag als
        Planentscheidung (execution.js-Fassade, app.js-Ledger-Ansicht,
        advisor.js, proof.js, protocol.js-Timeline, activation.js). Ein
        kostenloser Auftrag ist keine Planentscheidung; er würde dort still
        als solche auftauchen.
   Deshalb: EINE kanonische Punkt-Liste (mm_opt_points), die den Ledger
   REFERENZIERT statt ihn zu kopieren. Kein zweiter Speicher für dieselbe
   Information — siehe Source-of-Truth-Tabelle unten.

   SOURCE OF TRUTH (maßgeblich bleibt immer die Ursprungsquelle):
     Auftrag, Fokusphase, tägliche Häkchen,
     Umsetzungs- und Wirkungsprüfung      → mm_focus / mm_focus_history
     Premium-Experimente                   → intel_experiments (nur gelesen)
     Planentscheidungen                    → intel_decisions (nur referenziert)
     Zuordnung, Status, Referenz, Ergebnis-
     Zusammenfassung, persönlicher Standard → HIER (mm_opt_points)

   Der Punkt hält deshalb NIE eine zweite, unabhängig veränderbare Kopie von
   Häkchen, Umsetzung oder Wirkung. Wo eine lebende Quelle existiert, wird
   der sichtbare Status daraus ABGELEITET (deriveStatus) — gespeichert wird
   er nur als letzter bekannter Stand für den Fall, dass die Quelle fehlt.
   ========================================================================== */

(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  var KEY = "opt_points";
  var SEQ = "opt_seq";
  var MAX = 60;                       // gekappt wie die übrigen lokalen Historien

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
  function stamp() { return new Date().toISOString(); }
  function uid() { var c = (S.get(SEQ, 0) || 0) + 1; S.set(SEQ, c); return "pt_" + c; }

  /* ----------------------------------------------------------- ZUSTÄNDE ---
     Bewusst nur sieben interne Zustände — je einer pro sichtbarer Gruppe.
     Feinere Varianten (priorisiert, massnahme_festgelegt, umsetzung_geprueft,
     wirkung_erkennbar/teilweise/nicht_wirksam) wurden NICHT übernommen: sie
     wären entweder ohne Handlung, die sie auslöst, oder sie würden ein
     Ergebnis doppeln, das in mm_focus bereits steht. */
  var STATUS = ["erkannt", "in_umsetzung", "pruefung_faellig", "wirkung_offen",
                "abgeschlossen", "pausiert", "weitere_abklaerung"];
  var LABEL = {
    erkannt: "Offen",
    in_umsetzung: "In Umsetzung",
    pruefung_faellig: "Prüfung fällig",
    wirkung_offen: "Wirkung offen",
    abgeschlossen: "Abgeschlossen",
    pausiert: "Pausiert",
    weitere_abklaerung: "Weitere Abklärung"
  };
  /* Manuell gesetzte Zustände gewinnen über die Ableitung — sonst würde die
     Quelle eine bewusste Nutzerentscheidung still überschreiben. */
  var MANUELL = { pausiert: 1, weitere_abklaerung: 1 };

  /* -------------------------------------------------------------- LESEN --- */

  function raw() { var l = S.get(KEY, []); return Array.isArray(l) ? l : []; }
  function save(l) { S.set(KEY, l.slice(-MAX)); }

  function focusRef(e) { return (e && e.domain ? e.domain : "") + ":" + (e && e.started ? e.started : ""); }

  /* Den Auftrag zu einem Punkt finden — laufend oder archiviert. */
  function findFocus(sourceId) {
    var F = MM.focus; if (!F || !sourceId) return null;
    try {
      var cur = F.current();
      if (cur && focusRef(cur) === sourceId) return { rec: cur, live: true };
      var h = F.history() || [];
      for (var i = h.length - 1; i >= 0; i--) { if (focusRef(h[i]) === sourceId) return { rec: h[i], live: false }; }
    } catch (e) {}
    return null;
  }

  /* Status aus der lebenden Quelle ableiten (mm_focus bleibt maßgeblich). */
  function deriveFromFocus(p, hit) {
    var F = MM.focus, rec = hit.rec;
    var v = rec.wirkung && rec.wirkung.verdict;
    if (hit.live) {
      var pr = null;
      try { pr = F.progress(rec); } catch (e) {}
      if (pr && !pr.abgelaufen) return "in_umsetzung";
      if (!v) return "pruefung_faellig";          // Phase vorbei, Umsetzung noch nicht quittiert
    }
    if (!v || v === "offen") return "wirkung_offen";
    /* Keine erkennbare Wirkung UND ärztlicher Vorbehalt im Bereich ⇒ die
       fachliche Grenze ist erreicht; das ist keine Sackgasse, sondern der
       Hinweis auf Abklärung (nie eine Diagnose durch MaleMetrix). */
    if (v === "nicht_erkennbar" && p.arztVorbehalt) return "weitere_abklaerung";
    return "abgeschlossen";
  }

  /* Premium-Experimente werden AUSSCHLIESSLICH referenziert (nur gelesen,
     nie geschrieben). Ohne Intelligence-Schicht bleibt der gespeicherte
     Stand stehen. */
  function deriveFromExperiment(p) {
    try {
      var E = MM.intelligence && MM.intelligence.experiments;
      if (!E || !E.all) return null;
      var all = E.all() || [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].id !== p.source_id) continue;
        var x = all[i];
        if (x.status === "running") return "in_umsetzung";
        if (x.status === "done") return x.result ? "abgeschlossen" : "pruefung_faellig";
        return null;
      }
    } catch (e) {}
    return null;
  }

  function decorate(p) {
    var out = Object.assign({}, p);
    out.storedStatus = p.status;
    var abgeleitet = null;
    if (!MANUELL[p.status]) {
      if (p.source_type === "measure") {
        abgeleitet = deriveFromMeasure(p);
      } else if (p.source_type === "focus") {
        var hit = findFocus(p.source_id);
        if (hit) abgeleitet = deriveFromFocus(p, hit);
      } else if (p.source_type === "experiment") {
        abgeleitet = deriveFromExperiment(p);
      }
    }
    out.status = abgeleitet || p.status;
    /* Im Maßnahmenkontext heißt „In Umsetzung" sichtbar „In Beobachtung" —
       derselbe interne Zustand, nur die passende Sprache (Paket 3 bleibt). */
    out.statusLabel = (p.source_type === "measure" ? MEASURE_LABEL[out.status] : LABEL[out.status]) || out.status;
    out.abgeschlossen = out.status === "abgeschlossen";
    out.standard = p.standard || null;
    out.istMassnahme = isMeasure(p);
    return out;
  }

  function list() { return raw().map(decorate); }
  function active() { return list().filter(function (p) { return !p.abgeschlossen; }); }
  function get(id) { var l = list(); for (var i = 0; i < l.length; i++) { if (l[i].id === id) return l[i]; } return null; }

  /* ==================== MASSNAHMEN (Paket 7) ==============================
     Eine Maßnahmenverknüpfung ist ein EIGENER Eintrag derselben kanonischen
     Liste, der über `optimization_point_id` auf seinen Optimierungspunkt
     zeigt. Warum ein eigener Eintrag und kein Feld am Punkt: An einem Punkt
     dürfen nacheinander (und ausnahmsweise gleichzeitig) mehrere Maßnahmen
     hängen — als Feld ginge die erste beim Start der zweiten verloren.

     Kein neuer Speicher, kein neuer Key, keine neue Statusmaschine: es gelten
     dieselben sieben Zustände aus Paket 3.

     Der Maßnahmenkatalog bleibt dort, wo er ist (Stack: MM.engines.SUPPS,
     Protokoll: MM_CHECK.CHAPTERS). Gespeichert werden nur die stabile
     Referenz und — für lesbare Historie auf Seiten ohne geladenen Katalog —
     ein unveränderlicher Anzeigename. Nie eine Kopie des Katalogeintrags. */

  var MEASURE_SOURCES = { stack: 1, protokoll: 1, experiment: 1, routine: 1 };
  /* Organisatorische Prüfzeiträume — KEINE medizinischen Wirkfristen. */
  var OBS_DAYS = [7, 14, 28];
  var MEASURE_LABEL = {
    erkannt: "Vorgeschlagen",
    in_umsetzung: "In Beobachtung",
    pruefung_faellig: "Prüfung fällig",
    wirkung_offen: "Wirkung offen",
    abgeschlossen: "Abgeschlossen",
    pausiert: "Pausiert",
    weitere_abklaerung: "Weitere Abklärung"
  };

  function isMeasure(p) { return !!(p && p.measure_source && p.measure_id); }
  /* Kalendertage, nicht Millisekunden — wie in Paket 2. */
  function addDays(s, n) {
    var q = String(s || "").split("-");
    var d = new Date(+q[0], (+q[1] || 1) - 1, (+q[2] || 1) + n);
    return ymd(d);
  }

  /* Status einer Maßnahme aus ihrem eigenen Verlauf ableiten. Ein erfasstes
     Ergebnis schließt ab; der erreichte Prüfungstermin macht sie fällig. */
  function deriveFromMeasure(p) {
    /* Erst eine echte Entscheidung schließt ab. Ein Wirkungsurteil allein
       reicht NICHT — „noch nicht beurteilbar" ist ein Zwischenstand, kein
       Ergebnis, und würde die Maßnahme sonst still beenden. */
    if (p.measure_decision) return "abgeschlossen";
    if (p.result_summary === "offen") return "wirkung_offen";
    if (!p.measure_started_at) return "erkannt";
    if (p.review_date && ymd() >= p.review_date) return "pruefung_faellig";
    return "in_umsetzung";
  }

  /* Fachlich identisch heißt: derselbe Punkt, dieselbe Quelle, dieselbe
     stabile ID — und noch nicht abgeschlossen. Ähnliche Namen genügen NIE. */
  function findMeasureIdx(pointId, source, mid) {
    var l = raw();
    for (var i = 0; i < l.length; i++) {
      if (!isMeasure(l[i])) continue;
      if (l[i].optimization_point_id !== pointId) continue;
      if (l[i].measure_source !== source || String(l[i].measure_id) !== String(mid)) continue;
      if (decorate(l[i]).abgeschlossen) continue;
      return i;
    }
    return -1;
  }

  /* Alle Maßnahmen eines Optimierungspunkts (dekoriert). */
  function measuresFor(pointId) {
    return list().filter(function (p) { return isMeasure(p) && p.optimization_point_id === pointId; });
  }
  /* Laufende Maßnahmen — Grundlage für den Hinweis aus §13. */
  function activeMeasures(pointId) {
    return measuresFor(pointId).filter(function (p) { return !p.abgeschlossen && p.measure_started_at; });
  }

  /* MASSNAHME STARTEN — ausschließlich aus einer ausdrücklichen Handlung.
     Keine Empfehlung, kein Bereichswert, kein Engpass, kein Messwert und kein
     Kapitelaufruf ruft das hier auf. */
  function startMeasure(o) {
    o = o || {};
    if (!o.optimization_point_id || !MEASURE_SOURCES[o.measure_source] || !o.measure_id) return null;
    var punkt = get(o.optimization_point_id);
    if (!punkt) return null;
    var tage = OBS_DAYS.indexOf(+o.observation_days) >= 0 ? +o.observation_days : 14;
    var start = o.started_at || ymd();
    var daten = {
      area: punkt.area, areaLabel: punkt.areaLabel,
      /* Anzeigename wird als unveränderlicher Snapshot gehalten, damit die
         Historie auch dort lesbar bleibt, wo der Katalog nicht geladen ist.
         Fachlich maßgeblich bleibt measure_id im Katalog. */
      title: o.measure_label || String(o.measure_id),
      measure_label_snapshot: o.measure_label || String(o.measure_id),
      origin: "massnahme",
      source_type: "measure",
      source_id: o.optimization_point_id + "|" + o.measure_source + ":" + o.measure_id,
      optimization_point_id: o.optimization_point_id,
      measure_source: o.measure_source,
      measure_id: String(o.measure_id),
      measure_started_at: start,
      observation_days: tage,
      review_date: addDays(start, tage),
      criterion_label: o.criterion_label || "",
      criterion_source: o.criterion_source || "",
      baseline_snapshot: o.baseline || null,
      arztVorbehalt: !!o.arztVorbehalt || !!punkt.arztVorbehalt,
      /* Ein bestehender Warn- oder Konflikthinweis wird übernommen, nie
         abgeschwächt — er entscheidet über „Weitere Abklärung". */
      measure_warning: o.warning || "",
      status: o.warning ? "weitere_abklaerung" : "in_umsetzung"
    };
    var l = raw();
    var idx = findMeasureIdx(o.optimization_point_id, o.measure_source, o.measure_id);
    if (idx >= 0) {
      /* Dieselbe aktive Referenz ⇒ aktualisieren, kein zweiter Test. Die
         bereits erfassten Ergebnisfelder bleiben unangetastet. */
      var alt = l[idx];
      l[idx] = Object.assign({}, alt, daten, {
        id: alt.id, created: alt.created,
        measure_started_at: alt.measure_started_at || start,
        result_summary: alt.result_summary, measure_decision: alt.measure_decision,
        standard: alt.standard || null, updated_at: stamp()
      });
      save(l);
      return decorate(l[idx]);
    }
    var neu = Object.assign({
      id: uid(), created: ymd(), result_summary: "", measure_decision: null,
      usability_result: "", standard: null, completed_at: null
    }, daten, { updated_at: stamp() });
    l.push(neu); save(l);
    return decorate(neu);
  }

  /* ERGEBNIS EINER MASSNAHME — Umsetzung, Wirkung und Alltagstauglichkeit
     bleiben getrennt. Aus guter Umsetzung folgt NIE automatisch eine Wirkung,
     und aus einer Wirkung folgt NIE automatisch ein persönlicher Standard. */
  var WIRKUNG = ["erkennbar", "teilweise", "nicht_erkennbar", "unklar", "offen"];
  /* Zulässige Formulierungen — nie „bewiesen wirksam" oder „hat verursacht". */
  var WIRKUNG_LABEL = {
    erkennbar: "Wirkung subjektiv erkennbar", teilweise: "teilweise Verbesserung",
    nicht_erkennbar: "keine erkennbare Veränderung", unklar: "Datenlage unzureichend",
    offen: "noch nicht ausreichend beurteilbar"
  };
  var ALLTAG = ["gut", "maessig", "nicht_vertragen", "unklar"];
  var DECISION = ["beibehalten", "weiter_beobachten", "anpassen", "pausiert",
                  "beendet", "nicht_weiter_geprueft", "weitere_abklaerung"];

  function setMeasureResult(id, r) {
    var p = get(id); if (!p || !isMeasure(p)) return null;
    r = r || {};
    if (r.wirkung && WIRKUNG.indexOf(r.wirkung) < 0) return null;
    if (r.alltag && ALLTAG.indexOf(r.alltag) < 0) return null;
    if (r.decision && DECISION.indexOf(r.decision) < 0) return null;
    var patch = {
      umsetzung_result: r.umsetzung || "",
      result_summary: r.wirkung || "",
      usability_result: r.alltag || "",
      measure_decision: r.decision || null
    };
    /* Der sichtbare Zustand folgt der Entscheidung — nicht umgekehrt. */
    if (r.decision === "pausiert") patch.status = "pausiert";
    else if (r.decision === "weitere_abklaerung" || r.alltag === "nicht_vertragen") patch.status = "weitere_abklaerung";
    else if (r.decision === "weiter_beobachten") {
      patch.status = "in_umsetzung";
      patch.measure_decision = null;                 // bleibt offen, kein Abschluss
      patch.review_date = addDays(ymd(), p.observation_days || 14);
    } else if (r.wirkung === "offen") patch.status = "wirkung_offen";
    else if (r.decision) { patch.status = "abgeschlossen"; patch.completed_at = ymd(); }
    return mutate(id, patch);
  }

  /* §13 — mehrere gleichzeitig gestartete NEUE Maßnahmen an demselben Punkt
     machen die Zuordnung unsicher. Das wird benannt, nicht verhindert und
     nie automatisch negativ gewertet. */
  function measureAmbiguity(pointId) {
    var aktiv = activeMeasures(pointId);
    return aktiv.length > 1
      ? { mehrere: true, anzahl: aktiv.length,
          text: "Mehrere Veränderungen laufen gleichzeitig. Die Wirkung lässt sich dadurch schwerer eindeutig zuordnen." }
      : { mehrere: false, anzahl: aktiv.length, text: "" };
  }

  /* ---------------------------------------------------------- DUPLIKATE ---
     Konservativ, in genau zwei Stufen:
       1. gleiche Quelle (source_type + source_id) ⇒ IMMER derselbe Punkt
       2. sonst: gleiche Quelle-Art + gleicher Bereich + identisch
          normalisierter Titel + Punkt noch nicht abgeschlossen
     Keine Ähnlichkeitssuche — fachlich verschiedene Punkte werden nie
     zusammengelegt. */
  function norm(t) {
    return String(t || "").toLowerCase().replace(/[^\wäöüß ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function findDuplicate(data) {
    var l = raw();
    for (var i = 0; i < l.length; i++) {
      if (l[i].source_type === data.source_type && data.source_id && l[i].source_id === data.source_id) return i;
    }
    if (!data.title) return -1;
    var n = norm(data.title);
    for (var k = 0; k < l.length; k++) {
      var d = decorate(l[k]);
      if (d.abgeschlossen) continue;
      if (l[k].source_type !== data.source_type) continue;
      if (l[k].area !== data.area) continue;
      if (norm(l[k].title) !== n) continue;
      return k;
    }
    return -1;
  }

  /* ---------------------------------------------------------- SCHREIBEN --- */

  /* Erzeugt ODER aktualisiert — nie ein zweiter Punkt für dieselbe Quelle. */
  function upsert(data) {
    if (!data || !data.title || !data.source_type) return null;
    var l = raw();
    var idx = findDuplicate(data);
    if (idx >= 0) {
      var vorher = l[idx];
      l[idx] = Object.assign({}, vorher, data, {
        id: vorher.id, created: vorher.created,
        /* Ein bewusst gesetzter manueller Zustand bleibt bestehen, solange
           die Quelle keinen neuen Vorgang startet. */
        status: data.status || vorher.status,
        standard: vorher.standard || data.standard || null,
        updated_at: stamp()
      });
      save(l);
      return decorate(l[idx]);
    }
    var neu = Object.assign({
      id: uid(), created: ymd(), status: "erkannt",
      area: "", areaLabel: "", title: "", origin: "manuell",
      source_type: "manual", source_id: null,
      measure_summary: "", review_date: null, effect_review_date: null,
      result_summary: "", standard: null, completed_at: null,
      arztVorbehalt: false
    }, data, { updated_at: stamp() });
    l.push(neu); save(l);
    return decorate(neu);
  }

  /* Aus einem bestätigten Auftrag (Nutzer hat ihn ausdrücklich gestartet).
     Das ist der Moment, in dem aus einem angezeigten Engpass ein bearbeiteter
     Optimierungspunkt wird — nicht schon beim Anzeigen des Score-Ergebnisses. */
  function fromFocus(f, opts) {
    if (!f || !f.title) return null;
    opts = opts || {};
    return upsert({
      area: f.domain || "",
      areaLabel: f.bottleneckName || f.domain || "",
      title: f.title,
      origin: opts.origin || "engpass",
      source_type: "focus",
      source_id: focusRef(f),
      measure_summary: f.daily || f.title,
      review_date: f.until || null,
      effect_review_date: f.wirkungBis || f.until || null,
      arztVorbehalt: !!f.arzt,
      status: "in_umsetzung"
    });
  }

  function mutate(id, patch) {
    var l = raw();
    for (var i = 0; i < l.length; i++) {
      if (l[i].id !== id) continue;
      l[i] = Object.assign({}, l[i], patch, { updated_at: stamp() });
      save(l);
      return decorate(l[i]);
    }
    return null;
  }

  /* Nur für Zustände, die keine Handlung ableitet (Pause, Abklärung) bzw.
     für das bewusste Zurücksetzen auf die abgeleitete Wahrheit. */
  function setStatus(id, status) {
    if (STATUS.indexOf(status) < 0) return null;
    return mutate(id, { status: status });
  }
  function resume(id) {
    var p = null; var l = raw();
    for (var i = 0; i < l.length; i++) { if (l[i].id === id) p = l[i]; }
    if (!p) return null;
    return mutate(id, { status: p.source_type === "focus" ? "in_umsetzung" : "erkannt" });
  }

  /* ------------------------------------------------- PERSÖNLICHER STANDARD -
     Entsteht NIE automatisch. Auch eine klar positive Wirkung erzeugt nur
     eine Empfehlung; übernommen wird ausschließlich auf ausdrückliche
     Bestätigung des Nutzers (bestaetigt: true wird hier gesetzt, nicht
     vom Aufrufer geraten). */
  function standardEmpfohlen(p) {
    if (!p || p.standard) return false;
    /* Maßnahmen: ausreichende Umsetzung + nachvollziehbare Wirkung +
       tragfähige Alltagstauglichkeit — und kein offener Warnhinweis. Die
       Empfehlung ist NUR eine Empfehlung; übernommen wird ausschließlich
       per adoptStandard (ausdrückliche Bestätigung). */
    if (p.source_type === "measure") {
      if (p.arztVorbehalt || p.measure_warning) return false;
      if (p.usability_result === "nicht_vertragen" || p.usability_result === "unklar") return false;
      if (p.result_summary !== "erkennbar" && p.result_summary !== "teilweise") return false;
      if (p.umsetzung_result === "kaum" || p.umsetzung_result === "") return false;
      return true;
    }
    if (p.source_type !== "focus") return false;
    var hit = findFocus(p.source_id); if (!hit) return false;
    var rec = hit.rec;
    var v = rec.wirkung && rec.wirkung.verdict;
    if (v !== "erkennbar" && v !== "teilweise") return false;
    /* Ausreichend umgesetzt? Sonst ist die Wirkung nicht belastbar. */
    var erledigt = hit.live ? ((MM.focus.progress(rec) || {}).erledigt || 0) : (rec.erledigt || 0);
    var ziel = hit.live ? rec.target : rec.ziel;
    if (!(erledigt >= ziel)) return false;
    /* Ärztlicher Vorbehalt ⇒ keine Empfehlung zur dauerhaften Übernahme. */
    if (p.arztVorbehalt) return false;
    return true;
  }

  function adoptStandard(id, angaben) {
    var p = get(id); if (!p) return null;
    angaben = angaben || {};
    return mutate(id, {
      standard: {
        bestaetigt: true,                       // ausdrückliche Nutzerbestätigung
        bestaetigtAm: ymd(),
        /* Was dauerhaft gilt, ist die MASSNAHME („Kein Koffein nach 14 Uhr“),
           nicht die tägliche Abhakfrage. */
        was: angaben.was || p.title || p.measure_summary,
        bereich: p.areaLabel || p.area,
        warum: angaben.warum || p.result_summary || "hat in der Ergebnisprüfung geholfen",
        minimal: angaben.minimal || "",
        erneutPruefen: angaben.erneutPruefen || null
      },
      status: "abgeschlossen",
      completed_at: ymd()
    });
  }
  /* Abschluss OHNE Standard — ausdrücklich, ohne ein Ergebnis zu erfinden. */
  function declineStandard(id) {
    var p = get(id); if (!p) return null;
    return mutate(id, { standard: null, status: "abgeschlossen", completed_at: ymd() });
  }
  function standards() {
    return list().filter(function (p) { return p.standard && p.standard.bestaetigt; });
  }

  MM.points = {
    list: list, active: active, get: get,
    upsert: upsert, fromFocus: fromFocus, focusRef: focusRef,
    setStatus: setStatus, resume: resume, mutate: mutate,
    /* Maßnahmenverknüpfung (Paket 7) — lesen, starten, Ergebnis erfassen. */
    startMeasure: startMeasure, setMeasureResult: setMeasureResult,
    measuresFor: measuresFor, activeMeasures: activeMeasures,
    measureAmbiguity: measureAmbiguity, istMassnahme: isMeasure,
    OBS_DAYS: OBS_DAYS, MEASURE_SOURCES: MEASURE_SOURCES,
    MEASURE_LABEL: MEASURE_LABEL, WIRKUNG: WIRKUNG, WIRKUNG_LABEL: WIRKUNG_LABEL, ALLTAG: ALLTAG, DECISION: DECISION,
    standardEmpfohlen: standardEmpfohlen,
    adoptStandard: adoptStandard, declineStandard: declineStandard, standards: standards,
    label: function (st) { return LABEL[st] || st; },
    STATUS: STATUS, LABEL: LABEL
  };

  /* Sync wie jede andere Domäne: append-orientiert über die generische
     os_state-Tabelle (Paket-0-Merge mit updated_at-Konfliktregel). Keine
     neue Tabelle, keine Migration. */
  try {
    if (MM.account && MM.account.registerStateDomain) {
      MM.account.registerStateDomain("optpoints", "opt_points", { append: true });
    }
  } catch (e) {}
})();
