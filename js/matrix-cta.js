/* ==========================================================================
   MALEMETRIX — ÜBERGANG SCORE → ANABOLE MATRIX
   Eine reine Entscheidungs- und Abbildungsschicht. Sie liest ausschließlich
   bereits berechnete Ergebnisdaten und verändert nichts an ihnen.

   WAS DIESE DATEI NICHT TUT — und was der Test festhält:
   - Sie rechnet keinen Score, keine Domain und keine Rangfolge.
   - Sie schreibt nirgends. Keine Funktion hier hat einen Seiteneffekt.
   - Sie erfindet keine Domain-IDs. Verwendet werden ausschließlich die
     stabilen Schlüssel aus C.domainKeys (js/check-data.js).
   - Sie kopiert keine Antworten in einen zweiten Speicher. Die Vorbelegung
     wird bei Bedarf berechnet, nie persistiert.

   WARUM SIE EIGENSTÄNDIG IST: check.js läuft nur auf check.html,
   anabole-matrix.js nur auf anabole-matrix.html. Beide brauchen dieselbe
   Abbildung Score-Antwort → Matrix-Hebel. Läge sie doppelt vor, würde die
   Ergebnisseite eine Vorbelegung versprechen, die die Matrix nicht einlöst.
   Geprüft von: tools-dev/tests/matrix-cta.test.js
   ========================================================================== */
(function (root) {
  "use strict";

  /* ---- Score-Domain → CTA-Kontext -------------------------------------
     Nur Domains, deren Bezug zu Muskelaufbau eindeutig ist. Bewusst NICHT
     aufgenommen: movement (Alltagsbewegung), energy (Antrieb als Symptom),
     bodyComposition (Ergebnis, nicht Ursache). Bei Unsicherheit kein CTA. */
  var DOMAIN_CONTEXT = {
    training:  "training",
    nutrition: "nutrition",
    sleep:     "recovery",
    recovery:  "recovery"
  };

  /* Letzter Tie-Breaker aus der Aufgabenstellung. Er greift nur, wenn die
     Engine-Reihenfolge zwei gleichwertige Einträge DESSELBEN Kontexts
     liefert — echte Gleichstände über verschiedene Kontexte hinweg werden
     nach der ausdrücklichen Regel zu „multiple", nicht willkürlich aufgelöst. */
  var CONTEXT_ORDER = ["training", "nutrition", "recovery"];

  /* Ausschnitt aus C.LEGACY_DOMAIN_KEY (js/check-data.js) für genau die vier
     Domains oben — nötig, um eine Sekundärpriorität gegen die bereits
     berechnete Liste `result.weakest` zu prüfen, die in Säulen-Schlüsseln
     geführt wird. Der Test hält diesen Ausschnitt gegen die Engine. */
  var LEGACY_KEY = {
    training: "strength",
    nutrition: "fuel",
    sleep: "recovery",
    recovery: "recovery"
  };

  /* Die 14 Hebel des Selbstchecks. Der Test hält sie gegen
     js/anabole-matrix-data.js — hier stehen sie, weil check.html die
     Matrix-Daten nicht lädt und auch nicht laden soll. */
  var HEBEL_GESAMT = 14;

  function istObjekt(o) { return !!o && typeof o === "object" && !Array.isArray(o); }
  function zahl(v) { return typeof v === "number" && isFinite(v); }

  function domainVon(o) {
    if (!istObjekt(o)) return null;
    return typeof o.domain === "string" && o.domain ? o.domain : null;
  }

  /* ======================================================= SICHTBARKEIT ===
     Liefert null | "training" | "nutrition" | "recovery" | "multiple".
     Deterministisch, ohne Seiteneffekt, fehlertolerant gegen beschädigte
     Daten — im Zweifel null. */
  function context(result) {
    if (!istObjekt(result)) return null;

    /* 1) Bestehender primärer Engpass. Die Engine hat ihn bereits bestimmt;
          hier wird er nur gelesen. */
    var primaer = domainVon(result.primaryBottleneck) || domainVon(result.bottleneck);
    if (primaer && DOMAIN_CONTEXT[primaer]) return DOMAIN_CONTEXT[primaer];

    /* 2) Bestehende Ergebnis-Priorität. secondaryPriorities ist die von der
          Engine gerankte Liste — ihre Reihenfolge wird übernommen, nicht neu
          berechnet.

          Zusätzliche Bedingung, ohne neue Schwelle: Die Liste führt die drei
          nächstwichtigen Bereiche NACH dem Engpass — unabhängig davon, wie
          gut sie stehen. Ein Bereich mit 96/100 kann darin auftauchen, und
          für den „Verbesserungspotenzial" zu behaupten wäre schlicht falsch.
          Deshalb zählt ein Sekundärbereich nur, wenn er zusätzlich in der
          bereits berechneten Liste der schwächsten Säulen (`result.weakest`)
          steht. Beides sind vorhandene Ergebnisdaten; es wird nichts neu
          gewichtet und keine Grenze erfunden. */
    var sek = Array.isArray(result.secondaryPriorities) ? result.secondaryPriorities : [];
    var schwach = Array.isArray(result.weakest) ? result.weakest : null;
    var relevant = sek.filter(function (s) {
      if (!istObjekt(s) || !DOMAIN_CONTEXT[s.domain]) return false;
      if (!schwach) return false;                    // ohne Beleg keine Behauptung
      return schwach.indexOf(LEGACY_KEY[s.domain]) >= 0;
    });
    if (!relevant.length) return null;

    var top = relevant[0];
    var gleichrangig = relevant.filter(function (s) {
      return zahl(s.value) && zahl(top.value) && s.value === top.value;
    });
    var kontexte = [];
    gleichrangig.forEach(function (s) {
      var c = DOMAIN_CONTEXT[s.domain];
      if (kontexte.indexOf(c) < 0) kontexte.push(c);
    });

    /* Echter Gleichstand über verschiedene Kontexte → neutrale Gesamtfassung. */
    if (kontexte.length > 1) return "multiple";
    /* Gleichstand innerhalb eines Kontexts oder klarer Spitzenreiter → dieser. */
    if (kontexte.length === 1) return kontexte[0];
    return DOMAIN_CONTEXT[top.domain] || null;
  }

  /* ==================================================== VORBELEGUNG =======
     Die einzige Abbildung Score-Antwort → Matrix-Hebel im ganzen Projekt.
     Rein: bekommt die Rohantworten, gibt ein neues Objekt zurück.

     Der Score erfasst sieben der vierzehn Hebel in vergleichbarer Auflösung.
     RIR, Bewegungsamplitude, Sätze je Muskel, Satzpause, Ausdauer, Kreatin
     und Laborwerte fragt er nicht ab — die bleiben offen. */
  function prefillFrom(antworten) {
    var v = {};
    if (!istObjekt(antworten)) return v;
    var s;

    if (Array.isArray(antworten.str_exercises)) {
      var n = antworten.str_exercises.filter(function (x) { return x !== "keine" && x !== "core"; }).length;
      v.H01 = n >= 4 ? 2 : (n >= 2 ? 1 : 0);
    }
    if (antworten.str_plan || antworten.str_log) {
      var prog = antworten.str_plan === "progression", log = antworten.str_log === "app";
      v.H05 = (prog && log) ? 2 : ((prog || log) ? 1 : 0);
    }
    s = { tracke: 2, "120to160": 2, gt160: 1, "80to120": 1, lt80: 0, keine_ahnung: 0 };
    if (antworten.fuel_protein in s) v.H06 = s[antworten.fuel_protein];
    s = { tracke: 2, gut: 2, grob: 1, nein: 0 };
    if (antworten.fuel_calories in s) v.H07 = s[antworten.fuel_calories];
    s = { gt8: 2, "7to8": 2, "6to7": 1, "5to6": 0, lt5: 0 };
    if (antworten.rec_duration in s) v.H08 = s[antworten.rec_duration];
    s = { nie: 2, "1x": 1, "2to3": 0 };
    if (antworten.fuel_alcohol in s) v.H09 = s[antworten.fuel_alcohol];

    var w = Number(antworten.waist), h = Number(antworten.height);
    if (w > 0 && h > 0) { var q = w / h; v.H10 = q < 0.5 ? 2 : (q < 0.55 ? 1 : 0); }

    return v;
  }

  /* Rohantworten aus dem, was der Score tatsächlich hinterlässt.
     WICHTIG: js/check.js löscht `check_draft` beim Abschluss (finish()) und
     legt die Antworten in `check_result.answers` ab. Wer nur den Entwurf
     liest, findet nach einem abgeschlossenen Score nichts. */
  function scoreAntworten(result, draft) {
    if (istObjekt(result) && istObjekt(result.answers)) return result.answers;
    if (istObjekt(draft)) return draft;
    return null;
  }

  function prefillAvailable(result, draft) {
    return Object.keys(prefillFrom(scoreAntworten(result, draft))).length > 0;
  }

  /* ================================================ ZUSTAND SELBSTCHECK ===
     Nutzt den bestehenden Speicher des Selbstchecks (mm_anabolic_check).
     Kein zusätzlicher Statusschlüssel, keine Profil-Logik. */
  function checkState(matrixAntworten) {
    var a = istObjekt(matrixAntworten) ? matrixAntworten : {};
    var n = Object.keys(a).filter(function (k) {
      return typeof a[k] === "number" && a[k] >= 0 && a[k] <= 2;
    }).length;
    return { beantwortet: n, gesamt: HEBEL_GESAMT, vollstaendig: n >= HEBEL_GESAMT };
  }

  /* ========================================================= ENTSCHEIDUNG ==
     Eine Antwort auf alles, was die Ergebnisseite wissen muss.
     variant: "card"  — kompakte Vertiefungskarte (Regelfall)
              "quiet" — Selbstcheck schon abgeschlossen: leiser Wiedereinstieg
              null    — kein Bezug, kein CTA */
  function decide(result, draft, matrixAntworten) {
    var ctx = null;
    try { ctx = context(result); } catch (e) { ctx = null; }
    if (!ctx) return { context: null, variant: null, prefill: false, state: checkState(matrixAntworten) };

    var st = checkState(matrixAntworten);
    var pf = false;
    try { pf = prefillAvailable(result, draft); } catch (e) { pf = false; }

    return { context: ctx, variant: st.vollstaendig ? "quiet" : "card", prefill: pf, state: st };
  }

  /* ================================================================ COPY ===
     Sprachgrenze: Der Selbstcheck ordnet Selbstauskunft ein, er misst nichts.
     Deshalb durchgehend „adressiert“ / „unterstützt“ — nie „aktiviert“,
     „getriggert“ oder „gemessen“. Der Test prüft das. */
  var COPY = {
    kicker: "Vertiefung · Muskelaufbau",
    titel: "Welche Aufbau-Mechanismen adressierst du bereits?",
    button: "Anabole Matrix personalisieren",
    ziel: "anabole-matrix.html#abgleich",
    prefillHinweis: "Ein Teil deiner Antworten lässt sich übernehmen.",
    /* Bewusst kurz gehalten: Auf dem Telefon war die Karte mit der langen
       Fassung fast 400 px hoch — zu viel für eine Vertiefung unterhalb des
       eigentlichen Ergebnisses. Zwei knappe Sätze, Bedeutung unverändert. */
    text: {
      training: "Dein Score zeigt Potenzial im Training. Die Matrix ordnet ein, welche Aufbau-Mechanismen dein Training wahrscheinlich adressiert.",
      nutrition: "Dein Score zeigt: Baumaterial oder Energie könnten dich begrenzen. Die Matrix ordnet beides in die Mechanismen des Muskelaufbaus ein.",
      recovery: "Ein Trainingsreiz wirkt nur, wenn dein Körper ihn umsetzt. Die Matrix ordnet ein, welche Rolle Schlaf und Erholung dabei spielen.",
      multiple: "Dein Score zeigt mehrere Faktoren. Die Matrix ordnet Training, Ernährung und Erholung in ein gemeinsames Aufbauprofil ein."
    },
    /* Nach abgeschlossenem Selbstcheck: kein zweites Mal als gleich starke
       Hauptempfehlung, aber der Zugang bleibt. */
    quiet: "Den Selbstcheck der Anabolen Matrix hast du bereits ausgefüllt — dein Stand ist dort hinterlegt und jederzeit änderbar."
  };

  root.MM_MATRIX_CTA = {
    DOMAIN_CONTEXT: DOMAIN_CONTEXT,
    CONTEXT_ORDER: CONTEXT_ORDER,
    HEBEL_GESAMT: HEBEL_GESAMT,
    COPY: COPY,
    context: context,
    prefillFrom: prefillFrom,
    scoreAntworten: scoreAntworten,
    prefillAvailable: prefillAvailable,
    checkState: checkState,
    decide: decide
  };
})(typeof window !== "undefined" ? window : globalThis);
