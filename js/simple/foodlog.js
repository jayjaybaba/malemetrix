/* ==========================================================================
   MaleMetrix Generation 2 — Essens-Protokoll (PUR: kein DOM, kein Storage)

   WARUM ES DIESE DATEI GIBT
   Bis hierher war „Ernährung erfüllt" ein Häkchen. Ein Häkchen ist eine
   Meinung, keine Messung — und es floss als 30 % in den Execution Score,
   der wiederum entscheidet, ob der Plan angepasst wird. Damit stand die
   wichtigste Entscheidung des Systems auf dem wackeligsten Datenpunkt.

   Gleichzeitig hatte jeder, der nicht nach den Bausteinen isst, gar keinen
   Weg: Er konnte nur ein Häkchen setzen, das nichts bedeutet, oder nichts.

   WAS DIES HIER AUSDRUECKLICH NICHT IST
   Kein Kalorienzähler mit Datenbank und Barcode. Das wäre eine schlechtere
   Kopie von MyFitnessPal, und es widerspricht dem Grundsatz „weniger
   Tracking mit der Zeit". Es gibt genau drei Wege, etwas einzutragen:

     1. Ein Baustein aus dem eigenen Plan — ein Tipp, Werte stehen schon fest
     2. Eine gespeicherte eigene Mahlzeit — ein Tipp ab dem zweiten Mal
     3. Freie Eingabe von kcal und Protein — für alles andere

   Wer nach Plan isst, tippt dreimal am Tag. Wer auswärts isst, schätzt
   einmal. Beides ist besser als ein Häkchen.

   Alles hier ist deterministisch und rein.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MMSimple = root.MMSimple || {};
    root.MMSimple.foodlog = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Ab wann gilt ein Tag als „getroffen"? Bewusst großzügig: Ernährung ist
     kein Diktat auf die Kilokalorie. Entscheidend ist das Protein (schützt
     Muskeln im Defizit) und dass die Kalorien nicht davonlaufen. */
  var HIT = {
    proteinMinPct: 0.90,     // 90 % des Proteinziels genügen
    kcalOverPct: 1.10,       // bis 10 % über dem Ziel zählt der Tag noch
    kcalUnderPct: 0.80,      // unter 80 % ist kein Erfolg, sondern ein Warnsignal
    minEntriesForDay: 1      // ohne einen einzigen Eintrag gibt es kein Urteil
  };

  function round(v) { return Math.round(v); }
  function num(v) { return typeof v === "number" && isFinite(v) ? v : 0; }

  /** Summiert einen Tag. entries = [{kcal, protein, ...}] */
  function dayTotals(entries) {
    var kcal = 0, protein = 0;
    (entries || []).forEach(function (e) {
      if (!e) return;
      kcal += num(e.kcal);
      protein += num(e.protein);
    });
    return { kcal: round(kcal), protein: round(protein), count: (entries || []).length };
  }

  /**
   * Was fehlt heute noch? Die eine Zahl, die abends wirklich zählt.
   * @param {object} nutrition  plan.nutrition
   * @param {array}  entries    Einträge des Tages
   * @param {number} [kcalTarget] abweichendes Tagesziel (z. B. aus dem Tagesauftrag)
   */
  function remaining(nutrition, entries, kcalTarget) {
    var t = dayTotals(entries);
    var kcalGoal = typeof kcalTarget === "number" ? kcalTarget : nutrition.calorieTarget;
    var proteinGoal = nutrition.proteinTargetGrams;
    return {
      kcal: round(kcalGoal - t.kcal),
      protein: round(proteinGoal - t.protein),
      kcalGoal: kcalGoal, proteinGoal: proteinGoal,
      eaten: t
    };
  }

  /**
   * Hat der Tag getroffen? Liefert null, solange nichts eingetragen ist —
   * ein leerer Tag ist keine Aussage über die Ernährung, sondern über das
   * Protokollieren. Diese Unterscheidung ist wichtig, weil der Execution
   * Score sonst jeden vergessenen Eintrag als Diätfehler wertet.
   */
  function dayHit(nutrition, entries, kcalTarget) {
    var t = dayTotals(entries);
    if (t.count < HIT.minEntriesForDay) return null;
    var kcalGoal = typeof kcalTarget === "number" ? kcalTarget : nutrition.calorieTarget;
    var proteinOk = t.protein >= nutrition.proteinTargetGrams * HIT.proteinMinPct;
    var kcalOk = t.kcal <= kcalGoal * HIT.kcalOverPct && t.kcal >= kcalGoal * HIT.kcalUnderPct;
    return { hit: proteinOk && kcalOk, proteinOk: proteinOk, kcalOk: kcalOk, totals: t };
  }

  /**
   * Erfüllungsquote über einen Zeitraum — genau die Zahl, die der Execution
   * Score statt des Häkchens benutzt, sobald protokolliert wird.
   * @returns {{pct:(number|null), loggedDays:number, hitDays:number}}
   */
  function adherence(nutrition, log, days) {
    var logged = 0, hits = 0;
    (days || []).forEach(function (ymd) {
      var d = (log || {})[ymd];
      var r = dayHit(nutrition, d && d.entries, d && d.kcalTarget);
      if (!r) return;
      logged++;
      if (r.hit) hits++;
    });
    return {
      pct: logged ? Math.round(hits / logged * 100) : null,
      loggedDays: logged, hitDays: hits
    };
  }

  /**
   * „Mir fehlen noch 45 g Protein und 500 kcal" — was passt dazu?
   * Sucht unter den Bausteinen des eigenen Plans, nicht in einer Datenbank.
   * Sortiert nach Abstand zur Lücke, Protein doppelt gewichtet (im Defizit
   * ist Protein die knappere Ressource).
   */
  function suggest(nutrition, rest, limit) {
    if (!rest || (rest.kcal <= 50 && rest.protein <= 5)) return [];
    var out = [];
    (nutrition.meals || []).forEach(function (slot) {
      (slot.options || []).forEach(function (o) {
        // Nichts vorschlagen, was die Kalorienlücke deutlich sprengt.
        if (o.kcal > rest.kcal + 250) return;
        var dK = Math.abs(rest.kcal - o.kcal) / Math.max(200, rest.kcal || 200);
        var dP = Math.abs(rest.protein - o.protein) / Math.max(20, rest.protein || 20);
        out.push({ blockId: o.blockId, name: o.name, slot: o.slot,
                   kcal: o.kcal, protein: o.protein, factor: o.factor,
                   score: dK + 2 * dP });
      });
    });
    out.sort(function (a, b) { return a.score - b.score; });
    // Je Baustein nur einmal — dieselbe Mahlzeit dreimal anzubieten hilft nicht.
    var seen = {}, uniq = [];
    out.forEach(function (o) { if (!seen[o.blockId]) { seen[o.blockId] = 1; uniq.push(o); } });
    return uniq.slice(0, limit || 3);
  }

  /** Neuer Eintrag. Validiert, damit kein Unsinn in die Entscheidung fließt. */
  function makeEntry(input) {
    var kcal = num(input && input.kcal), protein = num(input && input.protein);
    if (kcal < 0 || kcal > 5000) return null;
    if (protein < 0 || protein > 400) return null;
    if (kcal === 0 && protein === 0) return null;
    var label = String((input && input.label) || "").slice(0, 60).trim();
    if (!label) return null;
    return {
      id: "fe:" + (input.at || "") + ":" + Math.abs(hash(label + kcal + protein)).toString(36),
      label: label, kcal: round(kcal), protein: round(protein),
      source: input.source || "frei",          // plan | eigene | frei
      blockId: input.blockId || null,
      at: input.at || null
    };
  }

  /* Kleine, stabile Streuung fuer die Eintrags-ID. Kein Zufall — sonst
     waeren zwei identische Eintraege nicht mehr unterscheidbar reproduzierbar. */
  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return h;
  }

  /**
   * Häufig genutzte eigene Mahlzeiten — die Grundlage für „ein Tipp ab dem
   * zweiten Mal". Zählt über das gesamte Protokoll und liefert die
   * häufigsten zuerst.
   */
  function favourites(log, limit) {
    var counts = {};
    Object.keys(log || {}).forEach(function (ymd) {
      ((log[ymd] && log[ymd].entries) || []).forEach(function (e) {
        if (!e || e.source === "plan") return;    // Planbausteine stehen ohnehin oben
        var key = e.label.toLowerCase() + "|" + e.kcal + "|" + e.protein;
        if (!counts[key]) counts[key] = { label: e.label, kcal: e.kcal, protein: e.protein, n: 0 };
        counts[key].n++;
      });
    });
    return Object.keys(counts).map(function (k) { return counts[k]; })
      .filter(function (f) { return f.n >= 2; })      // einmal ist kein Muster
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, limit || 5);
  }

  return {
    HIT: HIT,
    dayTotals: dayTotals,
    remaining: remaining,
    dayHit: dayHit,
    adherence: adherence,
    suggest: suggest,
    makeEntry: makeEntry,
    favourites: favourites
  };
});
