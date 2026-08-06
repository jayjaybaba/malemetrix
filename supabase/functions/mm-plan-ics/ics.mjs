/* ==========================================================================
   MaleMetrix Generation 2 — ICS-Generator (PUR; Browser, Deno-Edge und Node)

   Erzeugt den ehrlichen Kalender zum 12-Wochen-Plan. In den Kalender gehören
   NUR echte Zeitblöcke (§21):
     Krafttraining · Einkauf · Meal-Prep · Wochencheck · Fortschrittsfotos ·
     Abschlussmessung
   NICHT: Mahlzeiten, Kalorien, Shakes, Kleinaufgaben, Gesundheitsdaten.
   Titel bewusst neutral ("MaleMetrix · Ganzkörper A") — keine Diagnosen,
   keine sensiblen Begriffe.

   Zeiten sind FLOATING LOCAL (ohne TZID/Z) mit DTEND — identische Ehrlich-
   keitsregel wie der bestehende OS-Kalender. UIDs sind stabil je
   (Plan, Typ, Datum): ein aktualisierter Feed ERSETZT zukünftige Ereignisse,
   statt Duplikate zu erzeugen; vergangene behalten ihre UID und werden nie
   rückwirkend verfälscht (der Generator ist deterministisch aus dem Plan).

   Diese Datei existiert IDENTISCH als supabase/functions/mm-plan-ics/ics.mjs
   (Edge-Bundle-Kopie). Der Test simple-ics.test.js erzwingt Gleichheit.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.MMSimple = root.MMSimple || {}; root.MMSimple.ics = factory(); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function addDaysYmd(ymd, n) {
    var p = ymd.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function weekdayOf(ymd) {
    var p = ymd.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  }
  function icsDate(ymd, hhmm) { return ymd.replace(/-/g, "") + "T" + (hhmm || "00:00").replace(":", "") + "00"; }
  function addMinutes(hhmm, min) {
    var p = hhmm.split(":");
    var t = (+p[0] * 60 + (+p[1] || 0) + min) % 1440;
    return pad(Math.floor(t / 60)) + ":" + pad(t % 60);
  }
  function escText(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  // RFC 5545: Zeilen über 75 Oktette falten. Wir falten konservativ nach Zeichen.
  function fold(line) {
    if (line.length <= 74) return line;
    var out = [];
    var i = 0;
    while (i < line.length) {
      out.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
      i += 74;
    }
    return out.join("\r\n");
  }

  /* Ereignisliste aus dem Plan (deterministisch, keine Vergangenheit-Umschreibung). */
  function planEvents(plan, opts) {
    opts = opts || {};
    var lang = opts.lang === "en" ? "en" : "de";
    var t = function (de, en2) { return lang === "en" ? en2 : de; };
    if (!plan || !plan.startDate || !plan.training) return [];
    var events = [];
    var weeks = (plan.phaseGoal && plan.phaseGoal.durationWeeks) || 12;
    var rp = plan.reminderPreferences || {};
    var n = plan.nutrition || {};
    var sessMin = plan.training.maximumSessionMinutes || 60;

    function sessionName(wd) {
      var i = plan.training.weekdays.indexOf(wd);
      if (i < 0) return null;
      var s = plan.training.sessions[i % plan.training.sessions.length];
      return s ? (lang === "en" ? (s.name.en || s.name.de) : s.name.de) : "Training";
    }

    for (var day = 1; day <= weeks * 7; day++) {
      var ymd = addDaysYmd(plan.startDate, day - 1);
      var wd = weekdayOf(ymd);
      var week = Math.ceil(day / 7);

      if (plan.training.weekdays.indexOf(wd) >= 0) {
        var time = (plan.training.preferredTimes && plan.training.preferredTimes[wd]) || "18:00";
        var deload = (plan.training.deloadWeeks || []).indexOf(week) >= 0;
        events.push({
          uid: "training:" + ymd, date: ymd, start: time, minutes: sessMin,
          title: "MaleMetrix · " + sessionName(wd) + (deload ? t(" (reduziert)", " (deload)") : ""),
          desc: deload ? t("Reduzierte Woche: ein Satz weniger, ~80 % Last.", "Deload week: one set less, ~80% load.") : ""
        });
      }
      if (n.shoppingDay != null && wd === n.shoppingDay) {
        events.push({ uid: "shopping:" + ymd, date: ymd, start: "17:00", minutes: 45,
          title: "MaleMetrix · " + t("Einkauf", "Groceries"), desc: t("Einkaufsliste in der App: Mein Plan → Einkauf.", "Shopping list in the app: My plan → Shopping.") });
      }
      if (n.mealPrepDay != null && wd === n.mealPrepDay) {
        events.push({ uid: "prep:" + ymd, date: ymd, start: "17:00", minutes: 60,
          title: "MaleMetrix · Meal-Prep", desc: "" });
      }
      if (rp.weeklyReviewWeekday != null && wd === rp.weeklyReviewWeekday && week >= 2) {
        events.push({ uid: "review:" + ymd, date: ymd, start: rp.weeklyReviewTime || "18:00", minutes: 20,
          title: "MaleMetrix · " + t("Wochencheck", "Weekly check"), desc: t("Kurzer Check in der App — der Plan passt sich begründet an.", "Quick check in the app — the plan adjusts with reasons.") });
      }
      if ([1, 22, 50, 78].indexOf(day) >= 0) {
        events.push({ uid: "photo:" + ymd, date: ymd, start: (plan.lifestyle && plan.lifestyle.wakeTime) || "07:30", minutes: 10,
          title: "MaleMetrix · " + t("Fortschrittsfoto", "Progress photo"), desc: t("Bleibt auf deinem Gerät.", "Stays on your device.") });
      }
      if (day === weeks * 7) {
        events.push({ uid: "final:" + ymd, date: ymd, start: "09:00", minutes: 20,
          title: "MaleMetrix · " + t("Abschlussmessung", "Final measurement"), desc: "" });
      }
    }
    return events;
  }

  /* Vollständiger VCALENDAR-Text. */
  function build(plan, opts) {
    opts = opts || {};
    var events = planEvents(plan, opts);
    var planId = (plan && plan.id) || "plan";
    var stamp = (opts.now || "2026-01-01T00:00:00.000Z").replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MaleMetrix//Simple Plan v1//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      fold("X-WR-CALNAME:" + escText(opts.lang === "en" ? "MaleMetrix Plan" : "MaleMetrix Plan")),
      "X-WR-CALDESC:" + escText(opts.lang === "en" ? "Your 12-week plan" : "Dein 12-Wochen-Plan")
    ];
    events.forEach(function (ev) {
      lines.push("BEGIN:VEVENT");
      lines.push(fold("UID:" + escText(planId + ":" + ev.uid) + "@malemetrix.com"));
      lines.push("DTSTAMP:" + stamp);
      lines.push("DTSTART:" + icsDate(ev.date, ev.start));
      lines.push("DTEND:" + icsDate(ev.date, addMinutes(ev.start, ev.minutes)));
      lines.push(fold("SUMMARY:" + escText(ev.title)));
      if (ev.desc) lines.push(fold("DESCRIPTION:" + escText(ev.desc)));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }

  return { planEvents: planEvents, build: build, _escText: escText, _fold: fold };
});
