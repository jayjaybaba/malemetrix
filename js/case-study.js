/* ==========================================================================
   MALEMETRIX — FALLSTUDIEN-ERFASSUNG (Proof Engine)
   --------------------------------------------------------------------------
   Zweck: Aus einem ABGESCHLOSSENEN 12-Wochen-Durchlauf einen strukturierten,
   belastbaren Fallstudien-Entwurf erzeugen — aus Daten, die der Nutzer selbst
   eingetragen hat. Nichts wird erfunden, nichts wird geschätzt, nichts wird
   ohne ausdrückliche Einwilligung übertragen.

   Grundregeln (siehe PROOF_STANDARD.md):
   1. Nur echte, vom Nutzer eingetragene Werte. Fehlt ein Wert, steht dort
      "—" — er wird NIE interpoliert.
   2. Ohne aktive Einwilligung (Checkbox) gibt es keinen Versand und keine
      Freigabe. Der Entwurf bleibt lokal.
   3. Ein Fallstudien-Entwurf ist erst vollständig, wenn auch die Frage
      "Was hat NICHT funktioniert?" beantwortet ist. Erfolgsmeldungen ohne
      Reibung sind kein Proof, sondern Werbung.
   4. Der Versand läuft über den Mail-Client des Nutzers (mailto). MaleMetrix
      überträgt hier keine Gesundheitsdaten still im Hintergrund.

   Datenquellen (alle lokal, alle bereits vorhanden):
     mm_course_rechecks   W0/W4/W8/W12-Messpunkte
     mm_c2_goal           Modus (cut/recomp/build/perform)
     mm_c2_bn_history     Engpass-Verlauf inkl. Wechselgründen
     mm_c2_mode_history   Modus-Verlauf
     mm_c2_days           geplante Krafttage/Woche
     mm_c2_pulse          Weekly Pulse je Woche (Adhärenz-Urteile)
     mm_c2_lifts          Kraftverlauf der Grundübungen
     mm_check_result      Score-Antworten (Alter, Größe, Status)
   ========================================================================== */
(function () {
  "use strict";
  var MM = (window.MM = window.MM || {});
  if (!MM.store) return;

  var S = {
    get: function (k, d) { try { return MM.store.get(k, d); } catch (e) { return d; } },
    set: function (k, v) { try { MM.store.set(k, v); } catch (e) {} }
  };
  function EN() { return !!(MM.i18n && MM.i18n.lang === "en"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function num(v) {
    if (v == null || v === "") return null;
    var n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  }
  function fx(n, d) { return n == null ? "—" : (Math.round(n * 10) / 10).toFixed(d == null ? 1 : d).replace(".", ","); }

  var CONTACT = "coaching@malemetrix.de";
  var MIN_NOT_WORKING = 20;   // Zeichen — erzwingt eine echte Antwort, kein "passt"
  var POINTS = ["w0", "w4", "w8", "w12"];

  /* Metriken: key, Label, lowerIsBetter (zielabhängig für weight) */
  var METRICS = [
    { key: "waist",  de: "Bauchumfang (cm)", en: "Waist (cm)",       lower: true },
    { key: "weight", de: "Gewicht (kg)",     en: "Weight (kg)",      lower: null },
    { key: "strength", de: "Kraft-Marker",   en: "Strength marker",  lower: false },
    { key: "cardio", de: "Cardio-Marker",    en: "Cardio marker",    lower: false },
    { key: "sleep",  de: "Schlaf (h)",       en: "Sleep (h)",        lower: false },
    { key: "energy", de: "Energie (1–10)",   en: "Energy (1–10)",    lower: false },
    { key: "score",  de: "MaleMetrix Score", en: "MaleMetrix Score", lower: false }
  ];

  var MODE_LABEL = { cut: "CUT", recomp: "RECOMP", build: "BUILD", perform: "PERFORM" };
  var BN_LABEL = {
    execution: { de: "Umsetzung", en: "Execution" },
    recovery:  { de: "Regeneration", en: "Recovery" },
    nutrition: { de: "Ernährung", en: "Nutrition" },
    training:  { de: "Training", en: "Training" },
    strength:  { de: "Kraft", en: "Strength" },
    engine:    { de: "Cardio / Motor", en: "Engine" },
    body:      { de: "Körperzusammensetzung", en: "Body composition" },
    metabolic: { de: "Stoffwechsel", en: "Metabolic" },
    medical:   { de: "Medizinische Abklärung", en: "Medical" },
    knowledge: { de: "Wissen", en: "Knowledge" }
  };
  function bnLabel(k) { var e = BN_LABEL[k]; return e ? (EN() ? e.en : e.de) : (k || "—"); }

  /* ---------------------------------------------------------------------
     1 — ERFASSEN (nur echte Werte)
     --------------------------------------------------------------------- */
  function collect() {
    var rc = S.get("course_rechecks", {}) || {};
    var goal = S.get("c2_goal", "") || "";
    var score = S.get("check_result", null);
    var answers = (score && score.answers) || {};
    var days = S.get("c2_days", null);
    var bnHist = S.get("c2_bn_history", []) || [];
    var modeHist = S.get("c2_mode_history", []) || [];
    var pulses = S.get("c2_pulse", {}) || {};
    var saved = S.get("cs_draft", {}) || {};

    /* Adhärenz: bevorzugt die vom Programm berechnete Konstanz, sonst null.
       Kein Ersatzwert — eine geschätzte Adhärenz wäre wertlos. */
    var con = null;
    try { if (window.__C2 && typeof window.__C2.consistency === "function") con = window.__C2.consistency(); } catch (e) {}

    var metrics = METRICS.map(function (m) {
      var row = { key: m.key, label: EN() ? m.en : m.de, points: {}, delta: null, direction: "unknown" };
      POINTS.forEach(function (p) {
        var v = (rc[p] && rc[p][m.key] != null && rc[p][m.key] !== "") ? rc[p][m.key] : null;
        row.points[p] = v;
      });
      var a = num(row.points.w0), b = num(row.points.w12);
      if (a != null && b != null) {
        row.delta = Math.round((b - a) * 10) / 10;
        var lower = m.lower;
        if (lower === null) lower = (goal === "cut" || goal === "recomp"); // Gewicht ist zielabhängig
        if (Math.abs(row.delta) < 0.05) row.direction = "flat";
        else row.direction = (lower ? row.delta < 0 : row.delta > 0) ? "improved" : "worse";
      }
      return row;
    });

    /* Wochen, in denen die Umsetzung erkennbar gerissen ist — das gehört in
       jede ehrliche Fallstudie, nicht nur die guten Wochen. */
    var weakWeeks = [];
    Object.keys(pulses).forEach(function (w) {
      var p = pulses[w];
      if (p && p.verdict && (p.verdict.code === "execution" || p.verdict.code === "execution_first")) weakWeeks.push(Number(w));
    });
    weakWeeks.sort(function (a, b) { return a - b; });

    return {
      version: 1,
      context: {
        age: num(answers.age),
        heightCm: num(answers.height),
        mode: MODE_LABEL[goal] || null,
        strengthDaysPlanned: Array.isArray(days) ? days.length : null,
        nutritionLevel: S.get("c2_nutrition", "") || null,
        start: S.get("c2_start", "") || null,
        status: answers.status || answers.pathway || null   // natural / TRT / enhanced, falls erhoben
      },
      metrics: metrics,
      adherence: con ? { pct: con.pct, activeDays: con.active, elapsedDays: con.elapsed } : null,
      weakWeeks: weakWeeks,
      bottleneckStart: bnHist.length ? bnHist[0].b : (S.get("c2_bottleneck", "") || null),
      bottleneckEnd: bnHist.length ? bnHist[bnHist.length - 1].b : (S.get("c2_bottleneck", "") || null),
      bottleneckChanges: bnHist.slice(1).map(function (h) { return { week: Math.ceil((h.day || 1) / 7), to: h.b, reason: h.reason || "" }; }),
      modeChanges: modeHist.slice(1).map(function (h) { return { week: Math.ceil((h.day || 1) / 7), to: MODE_LABEL[h.mode] || h.mode }; }),
      /* Vom Nutzer selbst geschrieben — nicht generierbar: */
      notWorking: saved.notWorking || "",
      hardestPart: saved.hardestPart || "",
      wouldRepeat: saved.wouldRepeat || "",
      consent: saved.consent || { granted: false, photos: false, firstName: false, date: null }
    };
  }

  /* ---------------------------------------------------------------------
     2 — PRÜFEN (was fehlt für eine belastbare Fallstudie)
     --------------------------------------------------------------------- */
  function validate(cs) {
    var missing = [];
    var L = function (de, en) { return EN() ? en : de; };
    if (cs.context.age == null) missing.push(L("Alter (aus dem Score)", "Age (from the score)"));
    var hasBody = cs.metrics.some(function (m) {
      return (m.key === "waist" || m.key === "weight") && m.points.w0 != null && m.points.w12 != null;
    });
    if (!hasBody) missing.push(L("Start- UND Endwert für Taille oder Gewicht (W0 + W12)", "Start AND end value for waist or weight (W0 + W12)"));
    if (!cs.adherence || cs.adherence.pct == null) missing.push(L("Adhärenz (entsteht durch die täglichen Häkchen)", "Adherence (comes from the daily checkmarks)"));
    if (String(cs.notWorking || "").trim().length < MIN_NOT_WORKING) missing.push(L("Was NICHT funktioniert hat (mind. ein Satz)", "What did NOT work (at least one sentence)"));
    if (!cs.consent || !cs.consent.granted) missing.push(L("Einwilligung zur Veröffentlichung", "Consent to publication"));
    return { ok: missing.length === 0, missing: missing };
  }

  /* ---------------------------------------------------------------------
     3 — VERDICHTEN (die eine Zeile, die ein Käufer versteht)
     --------------------------------------------------------------------- */
  function headline(cs) {
    var parts = [];
    var c = cs.context;
    if (c.age != null) parts.push(Math.round(c.age) + (EN() ? " years" : " Jahre"));
    if (c.strengthDaysPlanned) parts.push(c.strengthDaysPlanned + (EN() ? " sessions/week" : " Trainingseinheiten/Woche"));
    var head = parts.join(", ");

    var res = [];
    function m(key) { return cs.metrics.filter(function (x) { return x.key === key; })[0]; }
    var waist = m("waist"), weight = m("weight"), strength = m("strength");
    if (waist && waist.delta != null) res.push((waist.delta > 0 ? "+" : "−") + fx(Math.abs(waist.delta)) + (EN() ? " cm waist" : " cm Taille"));
    if (weight && weight.delta != null) res.push((weight.delta > 0 ? "+" : "−") + fx(Math.abs(weight.delta)) + (EN() ? " kg weight" : " kg Gewicht"));
    if (strength && strength.delta != null) {
      if (strength.direction === "flat") res.push(EN() ? "strength held" : "Kraft gehalten");
      else res.push((EN() ? "strength " : "Kraft ") + (strength.delta > 0 ? "+" : "") + fx(strength.delta));
    }
    if (cs.adherence && cs.adherence.pct != null) res.push(cs.adherence.pct + (EN() ? " % adherence" : " % Umsetzung"));

    if (!head && !res.length) return EN() ? "Not enough entered values for a headline yet." : "Noch zu wenige eingetragene Werte für eine Kurzfassung.";
    return (head ? head + ": " : "") + (res.length ? res.join(", ") : (EN() ? "no measured values entered" : "keine Messwerte eingetragen"));
  }

  /* ---------------------------------------------------------------------
     4 — ALS TEXT AUSGEBEN (Klartext, kopierbar, prüfbar)
     --------------------------------------------------------------------- */
  function toText(cs) {
    var L = function (de, en) { return EN() ? en : de; };
    var out = [];
    out.push("MALEMETRIX — " + L("FALLSTUDIEN-ENTWURF (12 Wochen)", "CASE STUDY DRAFT (12 weeks)"));
    out.push("=".repeat(58));
    out.push("");
    out.push(L("KURZFASSUNG", "SUMMARY"));
    out.push(headline(cs));
    out.push("");

    out.push(L("AUSGANGSLAGE", "STARTING POINT"));
    out.push("  " + L("Alter", "Age") + ": " + (cs.context.age != null ? Math.round(cs.context.age) : "—"));
    out.push("  " + L("Modus", "Mode") + ": " + (cs.context.mode || "—"));
    out.push("  " + L("Geplante Krafttage/Woche", "Planned strength days/week") + ": " + (cs.context.strengthDaysPlanned || "—"));
    out.push("  " + L("Engpass zu Beginn", "Bottleneck at start") + ": " + bnLabel(cs.bottleneckStart));
    out.push("  " + L("Engpass am Ende", "Bottleneck at end") + ": " + bnLabel(cs.bottleneckEnd));
    out.push("");

    out.push(L("VERLAUF (nur eingetragene Werte)", "PROGRESSION (entered values only)"));
    out.push("  " + pad(L("Wert", "Metric"), 22) + POINTS.map(function (p) { return pad(p.toUpperCase(), 9); }).join("") + L("Δ", "Δ"));
    cs.metrics.forEach(function (m) {
      var any = POINTS.some(function (p) { return m.points[p] != null; });
      if (!any) return;
      out.push("  " + pad(m.label, 22) +
        POINTS.map(function (p) { return pad(m.points[p] == null ? "—" : String(m.points[p]), 9); }).join("") +
        (m.delta == null ? "—" : (m.delta > 0 ? "+" : "") + fx(m.delta)));
    });
    out.push("");

    out.push(L("UMSETZUNG", "ADHERENCE"));
    if (cs.adherence) {
      out.push("  " + cs.adherence.pct + " % (" + cs.adherence.activeDays + "/" + cs.adherence.elapsedDays + " " + L("aktive Tage", "active days") + ")");
    } else {
      out.push("  — " + L("keine Adhärenz-Daten (tägliche Häkchen fehlen)", "no adherence data (daily checkmarks missing)"));
    }
    if (cs.weakWeeks.length) out.push("  " + L("Wochen mit gerissener Umsetzung", "Weeks where execution broke") + ": " + cs.weakWeeks.join(", "));
    out.push("");

    if (cs.bottleneckChanges.length || cs.modeChanges.length) {
      out.push(L("KURSKORREKTUREN", "COURSE CORRECTIONS"));
      cs.bottleneckChanges.forEach(function (c) {
        out.push("  " + L("Woche", "Week") + " " + c.week + ": " + L("Engpass →", "bottleneck →") + " " + bnLabel(c.to) + (c.reason ? " (" + c.reason + ")" : ""));
      });
      cs.modeChanges.forEach(function (c) { out.push("  " + L("Woche", "Week") + " " + c.week + ": " + L("Modus →", "mode →") + " " + c.to); });
      out.push("");
    }

    out.push(L("WAS NICHT FUNKTIONIERT HAT", "WHAT DID NOT WORK"));
    out.push("  " + (cs.notWorking || "—"));
    out.push("");
    if (cs.hardestPart) { out.push(L("SCHWERSTER TEIL", "HARDEST PART")); out.push("  " + cs.hardestPart); out.push(""); }
    if (cs.wouldRepeat) { out.push(L("WÜRDE ICH WIEDER SO MACHEN", "WOULD DO AGAIN")); out.push("  " + cs.wouldRepeat); out.push(""); }

    out.push(L("EINWILLIGUNG", "CONSENT"));
    if (cs.consent && cs.consent.granted) {
      out.push("  " + L("Veröffentlichung anonymisiert: JA", "Anonymised publication: YES") + " (" + (cs.consent.date || "—") + ")");
      out.push("  " + L("Vorher-Nachher-Fotos", "Before/after photos") + ": " + (cs.consent.photos ? L("JA — separat gesendet", "YES — sent separately") : L("NEIN", "NO")));
      out.push("  " + L("Vorname darf genannt werden", "First name may be used") + ": " + (cs.consent.firstName ? L("JA", "YES") : L("NEIN", "NO")));
    } else {
      out.push("  " + L("KEINE Einwilligung erteilt — dieser Entwurf ist nur für dich.", "NO consent granted — this draft is for you only."));
    }
    out.push("");
    out.push("-".repeat(58));
    out.push(L("Alle Werte stammen aus den Eintragungen des Teilnehmers. Nicht eingetragene Werte stehen als „—“. Nichts wurde geschätzt oder ergänzt.",
               "All values come from the participant's own entries. Missing values appear as “—”. Nothing was estimated or filled in."));
    return out.join("\n");
  }
  function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n - 1) + " " : s + " ".repeat(n - s.length); }

  /* ---------------------------------------------------------------------
     5 — UI (nur im Abschlussbericht, Woche 12)
     --------------------------------------------------------------------- */
  function renderCard() {
    var cs = collect();
    var v = validate(cs);
    var L = function (de, en) { return EN() ? en : de; };
    var d = S.get("cs_draft", {}) || {};

    var html = '<div class="c2-card2" id="csCard" style="border-left:3px solid var(--c2-cyan)">' +
      '<span class="k">' + L("FALLSTUDIE — DEIN DURCHLAUF DOKUMENTIEREN", "CASE STUDY — DOCUMENT YOUR CYCLE") + '</span>' +
      '<p class="c2-muted">' + L(
        "MaleMetrix veröffentlicht keine erfundenen Erfolgsgeschichten. Wenn du willst, wird dein Durchlauf zu einer echten, nachvollziehbaren Fallstudie — mit Zahlen, mit Umsetzungsquote und mit dem, was nicht funktioniert hat. Freiwillig, anonymisiert, jederzeit widerrufbar.",
        "MaleMetrix does not publish invented success stories. If you want, your cycle becomes a real, traceable case study — with numbers, adherence and the parts that did not work. Voluntary, anonymised, revocable at any time."
      ) + '</p>' +
      '<div class="c2-card2" style="margin-top:12px;background:rgba(22, 196, 244,.05)"><span class="k">' + L("KURZFASSUNG", "SUMMARY") + '</span><p style="margin:4px 0 0"><b style="color:#fff">' + esc(headline(cs)) + '</b></p></div>';

    html += '<div class="c2-field" style="margin-top:14px"><label for="csNotWorking">' +
      L("Was hat NICHT funktioniert? (Pflichtfeld)", "What did NOT work? (required)") + '</label>' +
      '<textarea id="csNotWorking" rows="3" data-cs-field="notWorking" placeholder="' +
      esc(L("z. B. Wochenenden sind mir dreimal entglitten; die Ernährung habe ich erst ab Woche 5 im Griff gehabt.",
            "e.g. weekends slipped three times; nutrition only came together from week 5.")) +
      '">' + esc(d.notWorking || "") + '</textarea></div>';

    html += '<div class="c2-field"><label for="csHardest">' + L("Was war der schwerste Teil? (optional)", "Hardest part? (optional)") + '</label>' +
      '<textarea id="csHardest" rows="2" data-cs-field="hardestPart">' + esc(d.hardestPart || "") + '</textarea></div>';
    html += '<div class="c2-field"><label for="csRepeat">' + L("Was würdest du wieder genau so machen? (optional)", "What would you do the same again? (optional)") + '</label>' +
      '<textarea id="csRepeat" rows="2" data-cs-field="wouldRepeat">' + esc(d.wouldRepeat || "") + '</textarea></div>';

    var con = cs.consent || {};
    html += '<div class="c2-card2" style="margin-top:12px"><span class="k">' + L("EINWILLIGUNG", "CONSENT") + '</span>' +
      '<div class="c2-field"><label><input type="checkbox" data-cs-consent="granted" style="width:auto;margin-right:8px"' + (con.granted ? " checked" : "") + '>' +
      L("Ich willige ein, dass MaleMetrix diese Werte <b>anonymisiert</b> als Fallstudie veröffentlichen darf.",
        "I consent to MaleMetrix publishing these values <b>anonymised</b> as a case study.") + '</label></div>' +
      '<div class="c2-field"><label><input type="checkbox" data-cs-consent="firstName" style="width:auto;margin-right:8px"' + (con.firstName ? " checked" : "") + '>' +
      L("Mein Vorname darf genannt werden.", "My first name may be used.") + '</label></div>' +
      '<div class="c2-field"><label><input type="checkbox" data-cs-consent="photos" style="width:auto;margin-right:8px"' + (con.photos ? " checked" : "") + '>' +
      L("Ich sende Vorher-Nachher-Fotos separat und willige in deren Veröffentlichung ein.",
        "I will send before/after photos separately and consent to their publication.") + '</label></div>' +
      '<p class="c2-muted" style="margin-top:6px">' + L(
        "Ohne Häkchen passiert nichts. Fotos werden nie automatisch übertragen — du schickst sie bewusst selbst. Widerruf per Mail genügt, die Fallstudie wird dann entfernt.",
        "Nothing happens without a tick. Photos are never transmitted automatically — you send them deliberately. An email is enough to revoke; the case study is then removed."
      ) + '</p></div>';

    html += '<div id="csMissing">' + missingHtml(v) + '</div>';

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' +
      '<button type="button" class="c2-btn ghost" data-cs-copy>' + L("Entwurf kopieren", "Copy draft") + '</button>' +
      '<button type="button" class="c2-btn" data-cs-send' + (v.ok ? "" : " disabled") + '>' + L("An MaleMetrix senden", "Send to MaleMetrix") + '</button></div>' +
      '<p class="c2-muted" style="margin-top:8px">' + L(
        "„Senden“ öffnet dein E-Mail-Programm mit dem fertigen Text. Du siehst vorher genau, was rausgeht — und kannst es ändern oder abbrechen.",
        "“Send” opens your email client with the finished text. You see exactly what goes out — and can edit or cancel."
      ) + '</p></div>';

    return html;
  }

  function missingHtml(v) {
    var L = function (de, en) { return EN() ? en : de; };
    if (v.ok) {
      return '<div class="c2-card2" style="margin-top:12px;border-left:3px solid var(--c2-cyan)"><span class="k">' +
        L("VOLLSTÄNDIG", "COMPLETE") + '</span><p class="c2-muted" style="margin:4px 0 0">' +
        L("Der Entwurf erfüllt den Fallstudien-Standard. Du kannst ihn kopieren oder senden.",
          "The draft meets the case study standard. You can copy or send it.") + '</p></div>';
    }
    return '<div class="c2-card2" style="margin-top:12px;border-left:3px solid var(--c2-line)"><span class="k">' +
      L("NOCH OFFEN", "STILL MISSING") + '</span><ul style="margin:6px 0 0 18px">' +
      v.missing.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul></div>';
  }

  /* Der Entwurf darf sich nicht neu rendern, während der Nutzer tippt — sonst
     springt der Cursor. Deshalb wird nur der Status-Teil nachgezogen. */
  function refreshState() {
    var v = validate(collect());
    var box = document.getElementById("csMissing");
    if (box) box.innerHTML = missingHtml(v);
    var btn = document.querySelector("[data-cs-send]");
    if (btn) { if (v.ok) btn.removeAttribute("disabled"); else btn.setAttribute("disabled", "disabled"); }
  }

  /* Klicks/Eingaben aus der Karte — wird von course.js an die Delegation gehängt. */
  function handleInput(el) {
    if (!el || !el.getAttribute) return false;
    var f = el.getAttribute("data-cs-field");
    if (f) { var d = S.get("cs_draft", {}) || {}; d[f] = el.value; S.set("cs_draft", d); refreshState(); return true; }
    var c = el.getAttribute("data-cs-consent");
    if (c) {
      var dd = S.get("cs_draft", {}) || {};
      dd.consent = dd.consent || { granted: false, photos: false, firstName: false, date: null };
      dd.consent[c] = !!el.checked;
      dd.consent.date = dd.consent.granted ? new Date().toISOString().slice(0, 10) : null;
      S.set("cs_draft", dd);
      refreshState();
      return true;
    }
    return false;
  }

  function copyDraft() {
    var text = toText(collect());
    var done = function () { if (MM.toast) MM.toast(EN() ? "Draft copied." : "Entwurf kopiert."); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); }); }
      else fallbackCopy(text, done);
    } catch (e) { fallbackCopy(text, done); }
  }
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      done();
    } catch (e) { if (MM.toast) MM.toast(EN() ? "Copy failed — select the text manually." : "Kopieren fehlgeschlagen — Text bitte manuell markieren."); }
  }

  function sendDraft() {
    var cs = collect(), v = validate(cs);
    if (!v.ok) {
      if (MM.toast) MM.toast((EN() ? "Still missing: " : "Noch offen: ") + v.missing[0]);
      return;
    }
    var subject = EN() ? "MaleMetrix case study (12 weeks)" : "MaleMetrix Fallstudie (12 Wochen)";
    var body = toText(cs);
    if (MM.track) MM.track("case_study_submitted", { photos: !!cs.consent.photos });
    location.href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function handleClick(el) {
    if (!el || !el.closest) return false;
    if (el.closest("[data-cs-copy]")) { copyDraft(); return true; }
    if (el.closest("[data-cs-send]")) { sendDraft(); return true; }
    return false;
  }

  MM.caseStudy = {
    collect: collect,
    validate: validate,
    headline: headline,
    toText: toText,
    renderCard: renderCard,
    handleClick: handleClick,
    handleInput: handleInput,
    CONTACT: CONTACT,
    MIN_NOT_WORKING: MIN_NOT_WORKING
  };
})();
