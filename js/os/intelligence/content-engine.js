/* ==========================================================================
   MALEMETRIX — CONTENT-TO-PRODUCT FLYWHEEL · FOUNDATION  (MM.content)
   --------------------------------------------------------------------------
   EIN Wissensobjekt → viele Output-Strukturen (§114/§232). Deterministisch
   aus dem Knowledge Graph — KEINE Halluzination, KEINE Nutzerdaten (§118).
   Liefert STRUKTUR (Hook, Claim, Action, CTA, Plattform-Varianten), die der
   Creator redaktionell veredelt. Qualitäts-Gate bleibt menschlich (§124).
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var CTA = {
    apob_lipids: { label: "Check deinen Lipid-Kontext", link: "labor.html" },
    creatine: { label: "Stack-Check in MaleMetrix", link: "mein-protokoll.html#plan" },
    recovery_sleep: { label: "Starte das Schlaf-Experiment", link: "mein-protokoll.html#experiments" },
    protein_target: { label: "Berechne dein Proteinziel", link: "mein-protokoll.html#plan" }
  };
  function assets(topicId) {
    var I = MM.intelligence; if (!I || !I.knowledge) return null;
    var o = I.knowledge.byId(topicId); if (!o) return null;
    var c0 = (o.claims && o.claims[0]) || {};
    var counter = (o.claims || []).filter(function (c) { return /nicht|kein|ohne|unterschätzt|überschätzt/i.test(c.statement); })[0] || o.claims[1] || c0;
    var obj = {
      topic: o.id, title: o.title,
      hook: "Was die meisten über " + o.title.split(" ")[0] + " falsch verstehen",
      coreClaim: c0.statement || o.summary,
      whyItMatters: o.summary,
      evidence: (o.claims || []).map(function (c) { return { s: c.statement, level: c.evidence_type }; }),
      counterintuitivePoint: counter.statement || "",
      action: "Eine Sache umsetzen — nicht fünf.",
      visualIdea: "Koordinaten-Look: EIN Messwert, EIN Trendpfeil, EIN Satz.",
      relatedFeature: CTA[o.id] ? CTA[o.id].link : "mein-protokoll.html",
      cta: CTA[o.id] ? CTA[o.id].label : "Im MaleMetrix-System ansehen",
      platformVariants: {
        article: { angle: "Reality Check: " + o.title, sections: ["Was die Evidenz zeigt", "Was Praxis zeigt", "Was unklar bleibt", "Was du tust"] },
        tiktok: { seconds: 45, beats: ["Hook (These in 1 Satz)", "Der Denkfehler", "Der eine Datenpunkt", "CTA"] },
        carousel: { slides: 6, arc: ["Hook", "Mythos", "Evidenz (" + (c0.evidence_type || "—") + ")", "Kontext", "Aktion", "CTA"] },
        short: { seconds: 60, script: "Hook → Kernclaim → Gegenintuition → eine Handlung → CTA" },
        newsletter: { subject: o.title + ": was zählt, was nicht" }
      },
      qualityGate: ["Evidenz-Level sichtbar?", "Kein unsafe Claim?", "MaleMetrix-Stimme (direkt, erwachsen)?", "Führt zu echtem Produkt-Nutzen?"]
    };
    return obj;
  }
  function topics() { var I = MM.intelligence; return (I && I.knowledge) ? I.knowledge.all().map(function (o) { return { id: o.id, title: o.title, domain: o.domain }; }) : []; }
  MM.content = { assets: assets, topics: topics };
})();
