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
  var WIRKUNG = ["erkennbar", "teilweise", "nicht_erkennbar", "offen", "unklar", "nicht_geprueft"];
  var WIRKUNG_LABEL = {
    erkennbar: "Wirkung erkennbar",
    teilweise: "teilweise Wirkung erkennbar",
    nicht_erkennbar: "keine erkennbare Wirkung",
    offen: "Wirkung noch offen",
    unklar: "Datenlage reicht nicht für ein Urteil",
    nicht_geprueft: "bewusst nicht weiter geprüft"
  };
  /* „offen" ist eine Vertagung, kein Ergebnis: der Vorgang bleibt sichtbar.
     Erst ein echtes Urteil oder die bewusste Entscheidung, nicht weiter zu
     prüfen, schließt die Wirkungsprüfung ab. */
  function istAbschluss(v) { return !!v && v !== "offen"; }

  /* ================== MESSDATENBRÜCKE (Paket 5) ==========================
     Vorhandene Mess- und Trackingdaten sollen einen Auftrag unterstützen —
     ohne eine zweite Datenwahrheit zu bauen.

     Verbindlich:
     · mm_focus speichert NUR den abgeleiteten Tagesstatus samt knapper
       Herkunft. Der vollständige Messdatensatz bleibt in seiner Quelle.
     · Eine ausdrückliche manuelle Entscheidung gewinnt IMMER und wird nie
       von einem späteren Messdatenlauf überschrieben.
     · Fehlende Daten gelten weder als umgesetzt noch als nicht umgesetzt.
     · Nur Stufe A wertet automatisch. Stufe B schlägt vor. Stufe C bleibt
       vollständig manuell.
     ====================================================================== */

  /* Tagesstatus im Speicher:
       true                      — Alt-Bestand: manuell umgesetzt (bleibt lesbar)
       {v,s,q,src,val,ziel,at}   — s: "ja" | "nein" | "offen"
                                   q: manuell | bestaetigt | korrigiert |
                                      auto | auto_revidiert
     Herkunft `q` entscheidet die Priorität, nicht ein zusätzliches Flag. */
  var MANUELLE_HERKUNFT = { manuell: 1, bestaetigt: 1, korrigiert: 1 };

  function eintragVon(v) {
    if (v === true) return { v: 1, s: "ja", q: "manuell" };   // Alt-Bestand
    return (v && typeof v === "object" && v.s) ? v : null;
  }
  function istUmgesetzt(v) { var e = eintragVon(v); return !!e && e.s === "ja"; }
  /* Eine ausdrückliche Entscheidung des Nutzers — auch ein „nicht umgesetzt". */
  function istManuell(v) { var e = eintragVon(v); return !!e && !!MANUELLE_HERKUNFT[e.q]; }

  /* Quellenmatrix — NUR diese Bereiche werden überhaupt aus Messdaten
     unterstützt; alles andere bleibt Stufe C. Schlüssel ist die stabile
     Domain-ID des Auftrags, nie sein sichtbarer Text. */
  var SIGNALE = {
    /* „30 Minuten Bewegung am Tag" — objektive Minuten, klarer Schwellenwert. */
    cardiovascular: { stufe: "A", metrik: "bewegung_min", ziel: 30, einheit: "min" },
    /* „Proteinziel heute erreicht" — Ziel und Schwelle aus der bestehenden
       Adhärenz-Definition (Protein-Tag ab 90 % des Ziels). */
    nutrition: { stufe: "A", metrik: "protein_g", einheit: "g" },
    /* „Gewicht heute notiert" — reine Existenzprüfung, keine Bewertung. */
    bodyComposition: { stufe: "A", metrik: "gewicht_notiert" },
    /* „Jeden Tag genau einen Wert eintragen" — Existenz irgendeines Werts. */
    dataQuality: { stufe: "A", metrik: "wert_notiert" },
    /* Training ist erfasst, der Auftrag verlangt aber zusätzlich Planbarkeit
       („trainiert ODER geplanter Ruhetag") — das beweist kein Log. */
    training: { stufe: "B", metrik: "training_erfasst" },
    /* Der Auftrag zählt SCHRITTE. MaleMetrix erfasst nirgends Schritte —
       Bewegungsminuten sind ein verwandter, aber nicht deckungsgleicher Wert.
       Als Anhaltspunkt gilt das bereits vorhandene Tagesbewegungsziel des
       Nutzers aus dem Tracker-Plan (`trk_plan.dailyMin`) — kein neuer,
       eigens erfundener Grenzwert. */
    movement: { stufe: "B", metrik: "bewegung_min", zielAusPlan: true, einheit: "min", nichtDeckend: "Schritte" },
    /* Schlaf ist erfasst, der Auftrag betrifft aber die Uhrzeit des Zubettgehens. */
    sleep: { stufe: "B", metrik: "schlaf_erfasst" }
  };

  function signalFor(domain) { return SIGNALE[domain] || null; }
  function stufeFor(domain) { var s = signalFor(domain); return s ? s.stufe : "C"; }

  /* --------------------------------------------------------- QUELLENLESER */

  function liste(k) { var v = S.get(k, []); return Array.isArray(v) ? v : []; }
  function obj(k) { var v = S.get(k, null); return (v && typeof v === "object" && !Array.isArray(v)) ? v : null; }
  function zahl(x) { var n = parseFloat(x); return isFinite(n) && n >= 0 ? n : 0; }

  /* Lokaler Kalendertag eines Datumsfeldes. „YYYY-MM-DD" ist bereits lokal;
     ein ISO-Zeitstempel wird über dieselbe lokale ymd()-Regel umgerechnet wie
     überall sonst — nie über UTC-Felder, sonst landet ein Eintrag um 23:30
     Ortszeit auf dem Folgetag. Ungültige Werte liefern "" und werden ignoriert. */
  function tagVon(x) {
    if (typeof x !== "string" || !x) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
    var d = new Date(x);
    return isNaN(d.getTime()) ? "" : ymd(d);
  }

  /* Bewegungsminuten — ausschließlich aus dem freien Tracker. Die drei Logs
     sind getrennte Aktivitäten DESSELBEN Systems und werden dort seit jeher
     so zusammengezählt; über Systemgrenzen hinweg wird NIE addiert.
     Das OS führt keine Minuten, nur Sessions — deshalb dort kein Stufe-A-Wert. */
  function bewegungMin(tag) {
    var min = 0, teile = [], n = 0;
    liste("trk_daily").forEach(function (d) {
      if (!d || tagVon(d.date) !== tag) return;
      var m = zahl(d.min); if (!m) return;
      min += m; n++;
    });
    if (n) teile.push("Alltagsbewegung");
    var c = 0;
    liste("trk_cardio").forEach(function (x) {
      if (!x || tagVon(x.date) !== tag) return;
      var m = zahl(x.durationMin); if (!m) return;
      min += m; c++;
    });
    if (c) teile.push("Cardio");
    var g = 0;
    liste("trk_sessions").forEach(function (s) {
      if (!s || tagVon(s.date) !== tag) return;
      var m = zahl(s.duration); if (!m) return;
      min += m; g++;
    });
    if (g) teile.push("Training");
    if (!teile.length) {
      /* Kein freier Wert — aber vielleicht eine OS-Einheit ohne Minutenangabe. */
      return osSession(tag) ? { wert: null, quelle: "OS-Trainingslog", unvollstaendig: true } : null;
    }
    return { wert: Math.round(min), quelle: teile.join(" + "), einheit: "min" };
  }

  function osSession(tag) {
    var logs = obj("os_workout_logs");
    var s = (logs && Array.isArray(logs._sessions)) ? logs._sessions : [];
    return s.some(function (x) { return x && tagVon(x.date) === tag; });
  }
  function freeSession(tag) {
    return liste("trk_sessions").some(function (x) { return x && tagVon(x.date) === tag; });
  }

  /* Protein — zwei getrennte Welten. OS-Nutzer (mit Ernährungsplan) lesen das
     OS-Log, freie Nutzer das Ernährungstagebuch. NIE addieren, nie mischen.
     Schwelle: die bestehende Adhärenz-Definition (Protein-Tag ab 90 % Ziel). */
  function proteinTag(tag) {
    var plan = obj("os_nutrition_plan");
    var osZiel = plan ? zahl(plan.protein) : 0;
    var log = obj("os_nutrition_log");
    var osEintraege = (log && Array.isArray(log[tag])) ? log[tag] : null;
    var osWert = osEintraege ? osEintraege.reduce(function (a, e) { return a + zahl(e && e.p); }, 0) : null;

    var ziele = obj("goals");
    var freeZiel = ziele ? zahl(ziele.p) : 0;
    var diary = obj("diary_" + tag);
    var freeWert = null;
    if (diary) {
      var summe = 0, hat = false;
      ["fruehstueck", "mittag", "abend", "snacks"].forEach(function (m) {
        if (!Array.isArray(diary[m])) return;
        diary[m].forEach(function (e) { summe += zahl(e && e.p); hat = true; });
      });
      if (hat) freeWert = summe;
    }

    var osOk = osZiel > 0 && osWert !== null;
    var freeOk = freeZiel > 0 && freeWert !== null;
    if (!osOk && !freeOk) return null;

    var erreicht = function (w, z) { return w >= Math.round(z * 0.9); };
    /* Konflikt heißt nicht „beide haben Daten", sondern: beide haben Daten
       und kommen zu UNTERSCHIEDLICHEN Ergebnissen. Nur dann ist die Lage
       unsicher — und dann wird nichts automatisch erfüllt. */
    if (osOk && freeOk && erreicht(osWert, osZiel) !== erreicht(freeWert, freeZiel)) {
      return {
        wert: osWert, ziel: Math.round(osZiel * 0.9), quelle: "OS-Ernährungslog",
        einheit: "g", konflikt: "Ernährungstagebuch und OS-Log kommen für diesen Tag zu unterschiedlichen Ergebnissen."
      };
    }
    if (osOk) return { wert: Math.round(osWert), ziel: Math.round(osZiel * 0.9), quelle: "OS-Ernährungslog", einheit: "g" };
    return { wert: Math.round(freeWert), ziel: Math.round(freeZiel * 0.9), quelle: "Ernährungstagebuch", einheit: "g" };
  }

  /* Existenzprüfungen — ein Wert ist da oder nicht. Hier kann nichts doppelt
     gezählt werden, deshalb ist die ODER-Verknüpfung beider Welten sicher. */
  function gewichtNotiert(tag) {
    var free = liste("trk_body").some(function (b) { return b && tagVon(b.date) === tag && zahl(b.weightKg) > 0; });
    if (free) return { quelle: "Körperdaten im Tracker" };
    var os = liste("os_metrics").some(function (m) { return m && m.type === "weight" && tagVon(m.date) === tag && zahl(m.value) > 0; });
    return os ? { quelle: "Gewicht im OS" } : null;
  }

  function schlafNotiert(tag) {
    /* Bestehende MaleMetrix-Konvention: das Datumsfeld ist die „Nacht auf"
       diesen Tag — also der Aufwachtag. Nicht neu erfinden. */
    var free = liste("trk_sleep").some(function (s) { return s && tagVon(s.date) === tag && zahl(s.dur) > 0; });
    if (free) return { quelle: "Schlaf-Log im Tracker" };
    var os = liste("os_metrics").some(function (m) { return m && m.type === "sleep" && tagVon(m.date) === tag && zahl(m.value) > 0; });
    return os ? { quelle: "Schlaf im OS" } : null;
  }

  function wertNotiert(tag) {
    var g = gewichtNotiert(tag); if (g) return g;
    var s = schlafNotiert(tag); if (s) return s;
    var b = bewegungMin(tag); if (b && b.wert) return { quelle: b.quelle };
    if (freeSession(tag) || osSession(tag)) return { quelle: "Trainingslog" };
    var p = proteinTag(tag); if (p && p.wert !== null) return { quelle: p.quelle };
    var taille = liste("trk_body").some(function (b2) { return b2 && tagVon(b2.date) === tag && zahl(b2.waistCm) > 0; });
    if (taille) return { quelle: "Körperdaten im Tracker" };
    var osM = liste("os_metrics").some(function (m) { return m && tagVon(m.date) === tag && isFinite(parseFloat(m.value)); });
    return osM ? { quelle: "Messwert im OS" } : null;
  }

  function trainingErfasst(tag) {
    /* Bewusst ODER statt Summe: eine Einheit ist erfasst oder nicht — so kann
       dieselbe Einheit nie aus zwei Logs doppelt zählen. */
    if (freeSession(tag)) return { quelle: "Trainingslog im Tracker" };
    return osSession(tag) ? { quelle: "OS-Trainingslog" } : null;
  }

  var METRIKEN = {
    bewegung_min: bewegungMin,
    protein_g: proteinTag,
    gewicht_notiert: gewichtNotiert,
    wert_notiert: wertNotiert,
    schlaf_erfasst: schlafNotiert,
    training_erfasst: trainingErfasst
  };

  /* ------------------------------------------------------ AUSWERTUNG (rein)
     Liefert für EINEN Tag, was die Messdaten hergeben — ohne zu schreiben.
       stufe   A | B | C
       treffer true, wenn das objektive Kriterium erfüllt ist (nur A/B)
       wert/ziel/quelle/konflikt für die sichtbare Herkunft                */
  function evaluateDay(f, datum) {
    f = f || current();
    if (!f) return null;
    var tag = datum || ymd();
    var sig = signalFor(f.domain);
    var out = { tag: tag, stufe: sig ? sig.stufe : "C", treffer: false, wert: null, ziel: null, quelle: null, konflikt: null, nichtDeckend: (sig && sig.nichtDeckend) || null };
    if (!sig) return out;
    /* Zukunft wird nie bewertet, und nur Tage der eigenen Fokusphase. */
    if (tag > ymd()) return out;
    if (f.started && tag < f.started) return out;
    if (f.until && tag >= f.until) return out;

    var fn = METRIKEN[sig.metrik];
    var r = null;
    try { r = fn ? fn(tag) : null; } catch (e) { r = null; }
    if (!r) return out;

    out.quelle = r.quelle || null;
    out.konflikt = r.konflikt || null;
    if (r.unvollstaendig) { out.stufe = "B"; return out; }

    if (sig.metrik === "bewegung_min") {
      /* Schwellenwert: entweder der im Auftrag genannte (30 min) oder — wo der
         Auftrag selbst keine Minuten nennt — das bereits konfigurierte
         Tagesbewegungsziel des Nutzers. Kein erfundener Grenzwert. */
      var schwelle = sig.ziel;
      if (sig.zielAusPlan) {
        var plan = obj("trk_plan");
        schwelle = (plan && zahl(plan.dailyMin)) || 25;
      }
      out.wert = r.wert; out.ziel = schwelle;
      out.einheit = "min";
      out.treffer = r.wert !== null && schwelle > 0 && r.wert >= schwelle;
    } else if (sig.metrik === "protein_g") {
      out.wert = r.wert; out.ziel = r.ziel; out.einheit = "g";
      out.treffer = r.wert !== null && r.ziel > 0 && r.wert >= r.ziel;
    } else {
      out.treffer = true;                       // reine Existenzprüfung
    }
    /* Ein Konflikt kippt nie automatisch — er wird höchstens vorgeschlagen. */
    if (out.konflikt) out.stufe = "B";
    return out;
  }

  /* Sichtbarer Tagesstatus: gespeicherter Eintrag + was die Messdaten sagen. */
  function tagStatus(f, datum) {
    f = f || current();
    if (!f) return null;
    var tag = datum || ymd();
    var e = eintragVon(f.done[tag]);
    var ev = evaluateDay(f, tag);
    return {
      tag: tag,
      status: e ? e.s : null,
      herkunft: e ? e.q : null,
      manuell: istManuell(f.done[tag]),
      umgesetzt: istUmgesetzt(f.done[tag]),
      wert: e && e.val != null ? e.val : (ev ? ev.wert : null),
      ziel: e && e.ziel != null ? e.ziel : (ev ? ev.ziel : null),
      quelle: (e && e.src) || (ev ? ev.quelle : null),
      einheit: (ev && ev.einheit) || null,
      stufe: ev ? ev.stufe : "C",
      treffer: ev ? ev.treffer : false,
      konflikt: ev ? ev.konflikt : null,
      nichtDeckend: ev ? ev.nichtDeckend : null,
      /* Eine automatische Bewertung, die nach einer Messwertkorrektur nicht
         mehr trägt — sie verschwindet nicht still, sondern wird benannt. */
      revidiert: !!(e && e.q === "auto_revidiert")
    };
  }

  /* AUTOMATISCHE AUSWERTUNG — ausschließlich Stufe A, ausschließlich für die
     LAUFENDE Fokusphase, ausschließlich für Tage ohne manuelle Entscheidung.
     Idempotent: gleiche Datenlage ⇒ identisches Ergebnis, kein zweiter
     Schreibvorgang, keine Duplikate nach einem Reload. */
  function autoSync(f) {
    f = f || current();
    if (!f || stufeFor(f.domain) !== "A") return 0;
    var heute = ymd();
    var n = 0, geaendert = false;
    var tag = f.started;
    for (var i = 0; i < (f.days || 28); i++) {
      if (tag > heute) break;
      if (f.until && tag >= f.until) break;
      (function (t) {
        if (istManuell(f.done[t])) return;                 // manuelle Entscheidung gewinnt
        var ev = evaluateDay(f, t);
        if (!ev || ev.stufe !== "A") return;
        var alt = eintragVon(f.done[t]);
        if (ev.treffer) {
          if (alt && alt.s === "ja" && alt.q === "auto" && alt.val === ev.wert) return;  // unverändert
          f.done[t] = { v: 1, s: "ja", q: "auto", src: ev.quelle || "", val: ev.wert, ziel: ev.ziel, at: new Date().toISOString() };
          geaendert = true; n++;
        } else if (alt && alt.q === "auto") {
          /* Der zugrunde liegende Messwert trägt die frühere automatische
             Bewertung nicht mehr. Sie wird zurückgenommen — aber nicht in ein
             automatisches „nicht umgesetzt" verwandelt. */
          f.done[t] = { v: 1, s: "offen", q: "auto_revidiert", src: ev.quelle || alt.src || "", val: ev.wert, ziel: ev.ziel, at: new Date().toISOString() };
          geaendert = true; n++;
        }
      })(tag);
      tag = addDays(tag, 1);
    }
    if (geaendert) { f.updated_at = new Date().toISOString(); S.set(KEY, f); }
    return n;
  }

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
    /* Umgesetzt zählt NUR, was auch als umgesetzt gespeichert ist: `true`
       (Alt-Bestand) oder ein Eintrag mit s === "ja". Ein ausdrückliches
       „nicht umgesetzt" ist ein Eintrag, aber kein Erfolg. */
    var erledigt = Object.keys(f.done).filter(function (d) { return istUmgesetzt(f.done[d]); }).length;
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
      heuteErledigt: istUmgesetzt(f.done[heute]),
      prozent: Math.min(100, Math.round((erledigt / Math.max(1, f.target)) * 100)),
      /* Umsetzungsquote über die bereits vergangenen Tage. */
      quote: vergangen > 0 ? Math.round((erledigt / vergangen) * 100) : 0,
      /* Tage ohne Häkchen: ehrlich als „nicht erfasst oder nicht
         umgesetzt" — sie zählen nie als Erfolg, aber auch nicht
         automatisch als bewusstes Scheitern. */
      ohneEintrag: Math.max(0, vergangen - erledigt),
      /* `until` IST der Prüfungstag — der letzte Tag, an dem noch abgehakt
         wird, liegt einen Tag davor. Beides getrennt ausweisen, damit die
         Anzeige keinen Umsetzungstag zu viel behauptet. */
      letzterTag: addDays(f.until, -1),
      pruefungAm: f.until
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
    /* EINE Umsetzungsquote — automatisch erkannte und manuell erfasste Tage
       zählen gleich. `ausTracking` ist nur eine Zusatzangabe zur Herkunft,
       niemals eine zweite Quote. */
    var ausTracking = 0, manuellNein = 0;
    Object.keys(f.done).forEach(function (d) {
      var e = eintragVon(f.done[d]);
      if (!e) return;
      if (e.s === "ja" && (e.q === "auto" || e.q === "bestaetigt")) ausTracking++;
      if (e.s === "nein") manuellNein++;
    });
    return {
      verdict: verdict,
      /* Getrennt: tatsächlich umgesetzte Tage (erledigt von tage),
         Mindestziel (ziel) und Zielstatus (zielErreicht). Niemals das
         Ziel als Nenner der Umsetzung darstellen. */
      erledigt: p.erledigt, tage: f.days, ziel: f.target,
      zielErreicht: p.erledigt >= f.target,
      quote: p.quote, ohneEintrag: p.ohneEintrag,
      ausTracking: ausTracking, ausdruecklichNein: manuellNein,
      letzterTag: p.letzterTag,
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
      abgeschlossen: istAbschluss(f.wirkung && f.wirkung.verdict),
      verdict: (f.wirkung && f.wirkung.verdict) || "offen",
      label: WIRKUNG_LABEL[(f.wirkung && f.wirkung.verdict) || "offen"],
      faelligAm: f.wirkungBis || f.until,
      spaeterAlsUmsetzung: (f.wirkungBis || f.until) > f.until,
      beurteilbar: beurteilbar,
      /* Ohne ausreichende Umsetzung ist ein Wirkungs-Urteil nicht belastbar. */
      belastbar: u ? u.verdict !== "nicht_ausreichend" : false
    };
  }

  /* OFFENE WIRKUNGSPRÜFUNG — bleibt auffindbar, auch wenn der Auftrag
     bereits archiviert wurde. Ein Vorgang gilt als offen, wenn seine
     Fokusphase vorbei ist und die Wirkung weder beurteilt noch bewusst
     abgewählt wurde. Nur Vorgänge mit `wirkungBis` zählen — Alt-Einträge
     von vor der Fokusphasen-Logik tauchen dadurch nie nachträglich auf. */
  /* Stabile Referenz eines Auftrags — ohne neuen Datenkey: Bereich + Start.
     Ein zweiter Auftrag derselben Domäne am selben Tag kann nicht existieren
     (start() archiviert den laufenden), damit ist der Schlüssel eindeutig. */
  function wirkungRef(e) { return (e && e.domain ? e.domain : "") + ":" + (e && e.started ? e.started : ""); }

  /* ALLE offenen Wirkungsprüfungen — nicht nur die zuletzt archivierte.
     Sonst verschwindet Vorgang A, sobald Vorgang B ebenfalls offen ist.
     Sortiert nach Fälligkeit: der dringendste zuerst. */
  function wirkungOffeneListe() {
    function offenAus(e, quelle) {
      if (!e || !e.wirkungBis) return null;
      var v = e.wirkung && e.wirkung.verdict;
      if (istAbschluss(v)) return null;
      var p = quelle === "aktiv" ? (progress(e) || {}) : null;
      return {
        quelle: quelle, ref: wirkungRef(e),
        titel: e.title || "", domain: e.domain || "",
        days: e.days || 28,
        erledigt: quelle === "aktiv" ? p.erledigt : (e.erledigt || 0),
        ziel: quelle === "aktiv" ? e.target : (e.ziel || 0),
        letzterTag: quelle === "aktiv" ? p.letzterTag : addDays(e.until, -1),
        faelligAm: e.wirkungBis,
        beurteilbar: ymd() >= e.wirkungBis,
        vertagt: v === "offen"
      };
    }
    var out = [];
    var f = current();
    if (f) { var p = progress(f); if (p && p.abgelaufen) { var a = offenAus(f, "aktiv"); if (a) out.push(a); } }
    var h = S.get(KEY_DONE, []);
    if (Array.isArray(h)) h.forEach(function (e) { var o = offenAus(e, "historie"); if (o) out.push(o); });
    out.sort(function (x, y) { return x.faelligAm < y.faelligAm ? -1 : x.faelligAm > y.faelligAm ? 1 : 0; });
    return out;
  }
  /* Die nächste fällige offene Wirkungsprüfung (für die prominente Karte). */
  function wirkungOffen() { return wirkungOffeneListe()[0] || null; }

  /* Wirkungs-Urteil erfassen — am laufenden/abgelaufenen Auftrag, sonst am
     zuletzt archivierten (additiv, ohne bestehende Felder umzuschreiben). */
  /* `ref` (Bereich:Start) adressiert einen BESTIMMTEN Vorgang — nötig, sobald
     mehrere Wirkungsprüfungen offen sind. Ohne ref gilt wie bisher: laufender
     Auftrag, sonst der zuletzt archivierte. */
  function setWirkung(verdict, note, ref) {
    if (WIRKUNG.indexOf(verdict) < 0) return false;
    var rec = { verdict: verdict, date: ymd() };
    if (note) rec.note = String(note).slice(0, 200);
    var f = current();
    if (f && (!ref || wirkungRef(f) === ref)) { f.wirkung = rec; S.set(KEY, f); return true; }
    var h = S.get(KEY_DONE, []);
    if (!Array.isArray(h) || !h.length) return false;
    var i = -1;
    if (ref) { for (var k = h.length - 1; k >= 0; k--) { if (wirkungRef(h[k]) === ref) { i = k; break; } } }
    else i = h.length - 1;
    if (i < 0) return false;
    h[i].wirkung = rec; S.set(KEY_DONE, h); return true;
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

  /* EIN Schreibweg für den Tagesstatus. `status`:
       "ja"   — umgesetzt
       "nein" — ausdrücklich nicht umgesetzt (hält die automatische
                Auswertung dauerhaft von diesem Tag fern)
       null   — Eintrag entfernen (zurück auf „nicht erfasst")
     `herkunft` ist manuell | bestaetigt | korrigiert; alles andere wird auf
     manuell normalisiert, damit über diesen Weg nie ein automatischer
     Eintrag entsteht. Zukünftige Tage werden nicht bewertet. */
  function setDay(datum, status, herkunft, evidenz) {
    var f = current();
    if (!f) return null;
    var d = datum || ymd();
    if (d > ymd()) return progress(f);
    if (status === null || status === undefined) delete f.done[d];
    else if (status === "ja" || status === "nein") {
      var e = { v: 1, s: status, q: MANUELLE_HERKUNFT[herkunft] ? herkunft : "manuell", at: new Date().toISOString() };
      if (evidenz) {
        if (evidenz.quelle) e.src = evidenz.quelle;
        if (evidenz.wert != null) e.val = evidenz.wert;
        if (evidenz.ziel != null) e.ziel = evidenz.ziel;
      }
      f.done[d] = e;
    } else return progress(f);
    f.updated_at = new Date().toISOString();
    S.set(KEY, f);
    return progress(f);
  }

  /* Bestehendes Verhalten der Tages-Checkbox bleibt erhalten: an ⇄ aus.
     Neu ist nur, dass das Abwählen einer AUTOMATISCH erkannten Erfüllung als
     ausdrückliche Korrektur gespeichert wird — sonst würde der nächste
     Messdatenlauf das Häkchen sofort wieder setzen. */
  function toggleDay(datum) {
    var f = current();
    if (!f) return null;
    var d = datum || ymd();
    var alt = eintragVon(f.done[d]);
    if (istUmgesetzt(f.done[d])) {
      if (alt && !MANUELLE_HERKUNFT[alt.q]) return setDay(d, "nein", "korrigiert");
      return setDay(d, null);
    }
    return setDay(d, "ja", alt && alt.q === "auto_revidiert" ? "korrigiert" : "manuell");
  }

  function archive(f) {
    f = f || current();
    if (!f) return;
    var h = S.get(KEY_DONE, []);
    if (!Array.isArray(h)) h = [];
    var p = progress(f) || {};
    var u = umsetzung(f) || {};
    h.push({
      domain: f.domain, title: f.title, started: f.started, until: f.until,
      erledigt: p.erledigt || 0, ziel: f.target, geschafft: !!p.geschafft,
      scoreAtStart: f.scoreAtStart || null,
      /* Additive Felder (Paket 2) — alte Einträge bleiben unverändert lesbar. */
      days: f.days || 28, quote: p.quote || 0,
      wirkung: f.wirkung || null, wirkungBis: f.wirkungBis || null,
      /* Paket 5: die Bilanz wird als historischer Stand EINGEFROREN. In die
         Historie wandert nur das Ergebnis, nie die Tagesliste — eine spätere
         Änderung an Tracker- oder OS-Daten kann sie damit nicht mehr
         rückwirkend verschieben. */
      ausTracking: u.ausTracking || 0
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
    /* Messdatenbrücke (Paket 5) — lesend auswerten, ausdrücklich entscheiden. */
    setDay: setDay,
    tagStatus: tagStatus,
    evaluateDay: evaluateDay,
    autoSync: autoSync,
    stufe: stufeFor,
    signale: function () { return SIGNALE; },
    clear: clear,
    archive: archive,
    lastOutcome: lastOutcome,
    umsetzung: umsetzung,
    wirkung: wirkung,
    wirkungOffen: wirkungOffen,
    wirkungOffeneListe: wirkungOffeneListe,
    ref: wirkungRef,
    setWirkung: setWirkung,
    wirkungLabel: function (v) { return WIRKUNG_LABEL[v] || v; },
    history: function () { var h = S.get(KEY_DONE, []); return Array.isArray(h) ? h : []; },
    today: ymd,
    addDays: addDays
  };
})();
