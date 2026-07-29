/* ==========================================================================
   MALEMETRIX — VERÖFFENTLICHTE FALLSTUDIEN (Datenquelle für ergebnisse.html)
   --------------------------------------------------------------------------
   HARTE REGEL: In diese Datei kommt AUSSCHLIESSLICH ein real abgeschlossener
   12-Wochen-Durchlauf eines echten Teilnehmers, der schriftlich eingewilligt
   hat. Keine Beispiele, keine Platzhalter, keine „so könnte es aussehen“-
   Einträge, keine geglätteten Zahlen. Der Standard steht in PROOF_STANDARD.md
   und wird von tools-dev/tests/proof-standard.test.js geprüft.

   Wenn es noch keine Fallstudie gibt, bleibt das Array LEER. Ein leeres Array
   ist die ehrliche Antwort — nicht ein Grund, etwas zu erfinden.

   SCHEMA je Eintrag:
   {
     id:          "cs-0001"           eindeutig, fortlaufend
     consentId:   "2026-03-14-JB"     Referenz auf die schriftliche Einwilligung (Ablage beim Betreiber)
     verified:    "self-reported" | "founder-verified" | "photo-verified"
                  self-reported   = Werte vom Teilnehmer eingetragen, unkontrolliert
                  founder-verified= Screenshots des Programms lagen dem Betreiber vor
                  photo-verified  = zusätzlich Vorher-Nachher-Fotos mit Datum
     published:   "2026-03-20"        Datum der Veröffentlichung
     context: { age, strengthDaysPerWeek, mode, situation, status }
                  situation = kurze, anonymisierte Lebenslage ("zwei Kinder, Schichtdienst")
                  status    = "natural" | "trt" | "enhanced" | null (nur wenn freigegeben)
     bottleneck:  { start: "nutrition", end: "strength" }
     metrics: [ { key, label, w0, w4, w8, w12, unit } ]   w4/w8 dürfen null sein, w0 und w12 nicht
     adherencePct: 82                  aus dem Programm, nicht geschätzt
     weakWeeks:   [5, 6]               Wochen mit gerissener Umsetzung
     notWorking:  "…"                  Pflichtfeld — was NICHT funktioniert hat
     quote:       "…" | null           optional, wörtlich, ungekürzt sinnentstellt
     photos:      false                nur true, wenn Fotos freigegeben UND hinterlegt sind
   }
   ========================================================================== */
(function () {
  "use strict";
  var MM = (window.MM = window.MM || {});

  /* Stand: noch keine abgeschlossene, eingewilligte Fallstudie veröffentlicht. */
  var CASE_STUDIES = [];

  var VERIFICATION = {
    "self-reported":   { de: "Selbst berichtet", en: "Self-reported", rank: 1, note: { de: "Werte vom Teilnehmer im Programm eingetragen, nicht gegengeprüft.", en: "Values entered by the participant, not cross-checked." } },
    "founder-verified":{ de: "Vom Betreiber geprüft", en: "Operator-verified", rank: 2, note: { de: "Programm-Screenshots der Messpunkte lagen vor.", en: "Program screenshots of the checkpoints were provided." } },
    "photo-verified":  { de: "Mit Fotobeleg", en: "Photo-verified", rank: 3, note: { de: "Zusätzlich datierte Vorher-Nachher-Fotos.", en: "Additionally dated before/after photos." } }
  };

  /* Ein Eintrag wird nur angezeigt, wenn er den Standard erfüllt. Ein
     unvollständiger Eintrag verschwindet lieber, als halb dazustehen. */
  function isPublishable(cs) {
    if (!cs || typeof cs !== "object") return false;
    if (!cs.id || !cs.consentId) return false;
    if (!VERIFICATION[cs.verified]) return false;
    if (!cs.context || cs.context.age == null) return false;
    if (cs.adherencePct == null) return false;
    if (String(cs.notWorking || "").trim().length < 20) return false;
    var m = Array.isArray(cs.metrics) ? cs.metrics : [];
    var hasBody = m.some(function (x) {
      return (x.key === "waist" || x.key === "weight") && x.w0 != null && x.w12 != null;
    });
    return hasBody;
  }

  MM.caseStudies = {
    all: CASE_STUDIES,
    verification: VERIFICATION,
    isPublishable: isPublishable,
    published: function () { return CASE_STUDIES.filter(isPublishable); }
  };
})();
