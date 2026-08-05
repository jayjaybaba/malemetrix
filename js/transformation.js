/* ==========================================================================
   MaleMetrix — Transformation (transformation.html)
   --------------------------------------------------------------------------
   Der Nutzer lädt ein Foto von sich hoch, beantwortet die Transformations-
   Fragen (Zeitraum, Wunsch-Look, Erfahrung, Trainingstage, Natural/Enhanced,
   Equipment), wählt zwei Zielgewichte und sieht fotorealistische Vorschauen
   seiner selbst — je Ziel mit Vorher/Nachher-Regler. Danach wählt er EIN
   Ziel und bekommt dafür Ernährungs-, Trainings- und Supplementplan.

   JEDE Antwort verändert etwas — keine Deko-Fragen:
   · Zeitraum        → Kalorien zielen auf den Zeitrahmen; die Seite urteilt
                       ehrlich: machbar / knapp / nicht seriös machbar.
   · Wunsch-Look     → fließt als validierter Enum in den Bild-Prompt ein.
   · Erfahrung       → Progressionsschema + realistische Aufbaurate.
   · Trainingstage   → anderer Split (GK / OK-UK / PPL-Hybrid / PPL×2).
   · Natural/Enhanced→ Raten, Volumenhinweis, Blutbild-Monitoring. BEWUSST
                       keine Substanz-/Dosierungsempfehlungen (Haus-Regel wie
                       überall: Einordnung liefert die Anabole Matrix).
   · Equipment       → Übungsauswahl Gym vs. Kurzhanteln/Zuhause.

   Pläne bleiben deterministisch (Mifflin-St-Jeor + feste Regeln, §9: die KI
   liefert Bilder, nie Zahlen). Foto wird nirgends gespeichert.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.getElementById("mmTransform");
  if (!root) return;

  var LS_KEY = "mm_transform_v1";

  /* ================= Zustand ================= */
  var state = {
    photo: null,            // Data-URI (nur im Speicher — bewusst nie persistiert)
    currentKg: null,
    targetA: null,
    targetB: null,
    heightCm: 180,
    age: 35,
    activity: "moderat",
    months: null,           // Wunsch-Zeitraum in Monaten (3/6/12) oder null=offen
    look: "athletic",       // lean | athletic | muscular (fließt ins Bild)
    exp: "mid",             // neu | mid | pro
    days: 3,                // Trainingstage pro Woche (2-6)
    mode: "natural",        // natural | enhanced
    equip: "gym",           // gym | home
    results: {},            // targetKg -> { url } | { error }
    chosen: null            // gewähltes Zielgewicht
  };
  // Aktive Prozent-Chips je Ziel (A/B). Manuelle Eingabe löst den Chip.
  var activePct = { a: 0.2, b: 0.3 };

  var PERSIST = ["currentKg", "targetA", "targetB", "heightCm", "age", "activity",
    "months", "look", "exp", "days", "mode", "equip", "chosen"];
  function loadSaved() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (!s) return;
      PERSIST.forEach(function (k) { if (s[k] !== undefined) state[k] = s[k]; });
      if (s.targetA != null) activePct.a = null;
      if (s.targetB != null) activePct.b = null;
    } catch (e) {}
  }
  function save() {
    try {
      var out = {};
      PERSIST.forEach(function (k) { out[k] = state[k]; });
      localStorage.setItem(LS_KEY, JSON.stringify(out));
    } catch (e) {}
  }

  /* ================= Foto: verkleinern statt roh hochladen ================= */
  function downscale(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp)/.test(file.type)) return reject(new Error("format"));
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 1280;
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return reject(new Error("leer"));
        var f = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * f); c.height = Math.round(h * f);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("lesen")); };
      img.src = url;
    });
  }

  /* ================= Plan-Engine v2: deterministisch =================
     Zeitraum-Logik: gewünschte Rate = Delta / Wochen. Sichere Obergrenzen:
     · Fettabbau natural ~0,75 % KG/Woche, enhanced ~1,0 % (Muskelschutz).
     · Aufbau natural 0,35/0,25/0,15 kg/Woche (neu/mid/pro), enhanced ×1,5.
     Liegt der Wunsch darüber → ehrliches Urteil statt Wunschkalorien. */
  var ACTIVITY = {
    sitzend: { f: 1.2,   label: "überwiegend sitzend" },
    leicht:  { f: 1.375, label: "leicht aktiv (1-3× Sport/Woche)" },
    moderat: { f: 1.55,  label: "moderat aktiv (3-5× Sport/Woche)" },
    hoch:    { f: 1.725, label: "sehr aktiv (6-7× Sport/Woche)" }
  };
  var BULK_RATE = { neu: 0.35, mid: 0.25, pro: 0.15 };

  function calcPlan(st, targetKg) {
    var cur = st.currentKg, t = targetKg;
    var cut = t < cur;
    var delta = Math.abs(cur - t);
    var enh = st.mode === "enhanced";
    var bmr = Math.round(10 * cur + 6.25 * st.heightCm - 5 * st.age + 5);
    var tdee = Math.round(bmr * (ACTIVITY[st.activity] || ACTIVITY.moderat).f);

    var maxRate = cut
      ? cur * (enh ? 0.010 : 0.0075)
      : (BULK_RATE[st.exp] || 0.25) * (enh ? 1.5 : 1);

    var verdict, usedRate, wishWeeks = null, neededRate = null;
    if (st.months) {
      wishWeeks = Math.round(st.months * 4.345);
      neededRate = delta / wishWeeks;
      if (neededRate <= maxRate * 0.85) verdict = "ok";
      else if (neededRate <= maxRate) verdict = "tight";
      else verdict = "unreal";
      usedRate = Math.min(neededRate, maxRate);
    } else {
      verdict = "open";
      usedRate = cut ? Math.min(maxRate, cur * 0.006) : maxRate * 0.8;
    }
    usedRate = Math.max(usedRate, cut ? 0.25 : 0.1);   // Untergrenze: sonst Placebo-Defizit

    var kcalDelta = Math.round(usedRate * 7700 / 7);   // ~7700 kcal pro kg Fettmasse
    var kcal;
    if (cut) {
      kcalDelta = Math.min(Math.max(kcalDelta, 300), enh ? 900 : 700);
      kcal = Math.max(tdee - kcalDelta, 1500);
    } else {
      kcalDelta = Math.min(Math.max(kcalDelta, 150), 500);
      kcal = tdee + kcalDelta;
    }
    var realWeeks = Math.ceil(delta / usedRate);
    var bestWeeks = Math.ceil(delta / maxRate);        // schnellste seriöse Variante

    var protein = Math.round((cut ? 2.2 : (enh ? 2.2 : 2.0)) * t);
    var fett = Math.max(60, Math.round(1.0 * t));
    var carbs = Math.max(50, Math.round((kcal - protein * 4 - fett * 9) / 4));
    return {
      cut: cut, delta: delta, enh: enh, bmr: bmr, tdee: tdee,
      kcal: kcal, kcalDelta: kcalDelta, protein: protein, fett: fett, carbs: carbs,
      verdict: verdict, usedRate: usedRate, neededRate: neededRate,
      wishWeeks: wishWeeks, realWeeks: realWeeks, bestWeeks: bestWeeks
    };
  }

  /* ================= Trainingspläne nach Tagen & Equipment ================= */
  function trainingRows(st, p) {
    var home = st.equip === "home";
    var d = Math.max(2, Math.min(6, st.days || 3));
    var rows = [];
    rows.push(["FREQUENZ", "<strong>" + d + "× Kraft/Woche</strong>" +
      (p.cut ? " + <strong>2× Zone-2-Cardio</strong> 30-40 min + <strong>8-10k Schritte</strong> täglich" : " — Erholung ist Teil des Plans, nicht seine Abwesenheit")]);

    if (home) {
      // Kurzhantel-/Körpergewichts-Fassung: gleiche Struktur, machbare Übungen.
      if (d <= 3) {
        rows.push(["GK A", "Goblet Squat 3×10-12 · KH-Bankdrücken/Liegestütze 3×8-12 · KH-Rudern 3×10 · KH-Schulterdrücken 3×10 · Plank 3×"]);
        rows.push(["GK B", "Rumänisches Kreuzheben (KH) 3×10 · Ausfallschritte 3×10/Bein · Klimmzüge/Ruder-Variante 3×max · Seitheben 3×12-15"]);
        rows.push(["ROTATION", d === 2 ? "A und B je 1× pro Woche" : "A/B/A, nächste Woche B/A/B"]);
      } else {
        rows.push(["OK", "KH-Bankdrücken 4×8-10 · KH-Rudern 4×8-10 · KH-Schulterdrücken 3×10 · Curls/Trizeps je 3×10-12"]);
        rows.push(["UK", "Goblet Squat 4×10 · RDL (KH) 4×8-10 · Ausfallschritte 3×10/Bein · Wadenheben 4×15"]);
        rows.push(["ROTATION", "OK/UK im Wechsel, " + d + " Einheiten pro Woche"]);
      }
      rows.push(["ZUHAUSE", "Mit verstellbaren Kurzhanteln bis ~30 kg kommst du weit — wird eine Übung zu leicht: Tempo runter, Pause kürzer, Wiederholungen rauf."]);
    } else if (d === 2) {
      rows.push(["GK 1", "Kniebeuge 3×6-8 · Bankdrücken 3×6-8 · Rudern 3×8-10 · Plank 3×"]);
      rows.push(["GK 2", "Kreuzheben 3×5 · Schulterdrücken 3×6-8 · Klimmzug/Latzug 3×8-10 · Seitheben 2×12-15"]);
    } else if (d === 3) {
      rows.push(["GK A", "Kniebeuge 3×5-8 · Bankdrücken 3×5-8 · Rudern 3×8-10 · Seitheben 2×12-15 · Plank 3×"]);
      rows.push(["GK B", "Kreuzheben 3×5 · Schulterdrücken 3×6-8 · Klimmzug/Latzug 3×8-10 · Beugercurls 2×10-12"]);
      rows.push(["ROTATION", "A/B/A, nächste Woche B/A/B"]);
    } else if (d === 4) {
      rows.push(["OK A", "Bankdrücken 4×6-8 · Rudern 4×6-8 · Schulterdrücken 3×8-10 · Curls/Trizeps je 3×10-12"]);
      rows.push(["UK A", "Kniebeuge 4×6-8 · Rumänisches Kreuzheben 3×8-10 · Ausfallschritte 3×10 · Wadenheben 4×12"]);
      rows.push(["OK B", "Schrägbank 4×8-10 · Klimmzüge 4×max · Dips 3×8-12 · Seitheben 3×12-15"]);
      rows.push(["UK B", "Kreuzheben 4×5 · Beinpresse 3×10-12 · Beinbeuger 3×10-12 · Bauch 3×"]);
    } else if (d === 5) {
      rows.push(["PUSH", "Bankdrücken 4×6-8 · Schrägbank-KH 3×8-10 · Schulterdrücken 3×8-10 · Seitheben 3×12-15 · Trizeps 3×10-12"]);
      rows.push(["PULL", "Kreuzheben 3×5 · Klimmzüge 4×max · Rudern 4×8-10 · Face Pulls 3×15 · Curls 3×10-12"]);
      rows.push(["BEINE", "Kniebeuge 4×6-8 · RDL 3×8-10 · Beinpresse 3×10-12 · Beinbeuger 3×10-12 · Waden 4×12"]);
      rows.push(["OK/UK", "Dazu 1× Oberkörper (Schwachstellen) + 1× Unterkörper (leichter, Technik/Volumen)"]);
    } else {
      rows.push(["PPL ×2", "Push/Pull/Legs, zweimal pro Woche — 1. Durchgang schwer (5-8 Wdh), 2. Durchgang Volumen (8-12 Wdh)"]);
      rows.push(["PUSH", "Bankdrücken · Schulterdrücken · Schrägbank · Seitheben · Trizeps"]);
      rows.push(["PULL", "Kreuzheben (1×/Woche) · Klimmzüge · Rudern · Face Pulls · Curls"]);
      rows.push(["LEGS", "Kniebeuge · RDL · Beinpresse · Beinbeuger · Waden"]);
    }

    var progression = {
      neu: "Du bist im besten Fenster deines Lebens: <strong>lineare Progression</strong> — fast jede Einheit +2,5 kg auf den Hauptübungen. Nutz es, es kommt nicht wieder.",
      mid: "<strong>+1 Wiederholung oder +2,5 kg pro Woche</strong> auf den Hauptübungen. Ohne dokumentierte Progression (Tracker!) kein Fortschritt.",
      pro: "<strong>Doppelprogression</strong> (erst Wiederholungen, dann Last) und Volumen in Wellen — PRs planst du, sie passieren nicht."
    };
    rows.push(["PRINZIP", progression[st.exp] || progression.mid]);
    if (p.cut) rows.push(["IM DEFIZIT", "Gewichte <strong>nicht</strong> freiwillig reduzieren — Kraft halten heißt Muskeln halten. Das Defizit kommt aus der Küche."]);
    if (p.enh) rows.push(["VOLUMEN", "Enhanced: Die Erholung erlaubt <strong>+20-30 % Volumen</strong> auf zurückhängende Muskelgruppen — aber erst, wenn die Basisübungen sauber progressieren."]);
    return rows;
  }

  /* ================= Anzeige-Helfer ================= */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v) { var n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; }
  function secthead(sys, title) {
    var h = el("div", "mm-secthead");
    h.appendChild(el("span", "sys", esc(sys)));
    h.appendChild(el("h2", "t", esc(title)));
    return h;
  }

  var FEHLERTEXT = {
    not_signed_in: "Bitte melde dich zuerst an — die Bildgenerierung braucht ein Konto.",
    no_cloud: "Account-Sync ist auf diesem Gerät nicht aktiv — ohne Cloud-Konto keine Bildgenerierung.",
    rate_limited: "Stundenlimit erreicht (12 Bilder). Versuch es in einer Stunde wieder.",
    provider_not_configured: "Die Bildgenerierung ist serverseitig noch nicht freigeschaltet (API-Key fehlt).",
    provider_balance: "Die Bildgenerierung ist vorübergehend nicht verfügbar (Kontingent aufgebraucht) — versuch es später erneut.",
    provider_auth_failed: "Der Bild-Dienst lehnt unseren Schlüssel ab — wir kümmern uns darum.",
    content_rejected: "Das Bildmodell hat dieses Foto abgelehnt. Oberkörperfrei ist kein Problem — nur komplett nackte Fotos (ganz ohne Unterwäsche) blockiert das Modell. Zieh Shorts oder Unterwäsche an und versuch es erneut.",
    invalid_image: "Das Foto konnte nicht verarbeitet werden. Bitte JPG/PNG verwenden.",
    payload_too_large: "Das Foto ist zu groß. Bitte ein kleineres Foto wählen.",
    unreachable: "Server nicht erreichbar — Verbindung prüfen und erneut versuchen."
  };
  function fehlertext(code) { return FEHLERTEXT[code] || ("Generierung fehlgeschlagen (" + esc(code || "unbekannt") + "). Bitte erneut versuchen."); }

  /* ================= UI bauen ================= */
  loadSaved();
  root.innerHTML = "";

  /* --- Schritt 1: Foto --- */
  var s1 = el("section", "trf-step");
  s1.appendChild(secthead("MM / TRANSFORM · 01", "Dein Foto"));
  s1.appendChild(el("p", "trf-hint",
    "<strong>Oberkörperfrei ist ideal</strong> — frontal, gut beleuchtet, in Shorts oder Unterwäsche. So sieht das Modell Bauch, Taille und Brust direkt, und die Transformation wird maximal realistisch. " +
    "Einzige Grenze: komplett nackte Fotos (ganz ohne Unterwäsche) lehnt das Bildmodell ab. " +
    "Dein Foto wird <strong>nicht gespeichert</strong>: Es geht einmalig zur Generierung an den Bild-Dienst und bleibt sonst auf deinem Gerät."));
  var drop = el("div", "trf-drop");
  drop.innerHTML =
    '<span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>' +
    '<div class="trf-drop-inner">' +
      '<svg class="trf-drop-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/></svg>' +
      '<span class="trf-drop-text">FOTO HIER ABLEGEN — ODER KLICKEN</span>' +
      '<span class="trf-drop-sub">JPG · PNG · WEBP &nbsp;·&nbsp; BLEIBT AUF DEINEM GERÄT</span>' +
    '</div>';
  var fileIn = el("input");
  fileIn.type = "file"; fileIn.accept = "image/jpeg,image/png,image/webp"; fileIn.className = "file-hidden";
  var photoErr = el("p", "trf-error"); photoErr.style.display = "none"; photoErr.style.marginTop = "10px";
  drop.addEventListener("click", function () { fileIn.click(); });
  drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("is-over"); });
  drop.addEventListener("dragleave", function () { drop.classList.remove("is-over"); });
  drop.addEventListener("drop", function (e) {
    e.preventDefault(); drop.classList.remove("is-over");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileIn.addEventListener("change", function () { if (fileIn.files && fileIn.files[0]) handleFile(fileIn.files[0]); });
  function handleFile(f) {
    photoErr.style.display = "none";
    downscale(f).then(function (dataUrl) {
      state.photo = dataUrl;
      drop.classList.add("has-photo");
      ["trf-drop-preview", "trf-drop-state", "trf-drop-change"].forEach(function (c) {
        var o = drop.querySelector("." + c); if (o) o.parentNode.removeChild(o);
      });
      var im = el("img", "trf-drop-preview"); im.src = dataUrl; im.alt = "Dein hochgeladenes Foto";
      drop.appendChild(im);
      drop.appendChild(el("span", "trf-drop-state", "INPUT BEREIT"));
      drop.appendChild(el("span", "trf-drop-change", "FOTO ÄNDERN"));
      renderGate();
    }).catch(function () {
      photoErr.textContent = "Das Foto konnte nicht gelesen werden — bitte JPG, PNG oder WebP verwenden.";
      photoErr.style.display = "";
    });
  }
  s1.appendChild(drop); s1.appendChild(fileIn); s1.appendChild(photoErr);
  root.appendChild(s1);

  /* --- Schritt 2: Ziele + Transformations-Fragen --- */
  var s2 = el("section", "trf-step");
  s2.appendChild(secthead("MM / TRANSFORM · 02", "Deine Transformation"));
  s2.appendChild(el("p", "trf-hint", "Zwei Ziele, zwei Vorschauen — die Prozent-Marken rechnen vom aktuellen Gewicht, jedes Feld ist frei überschreibbar (auch nach oben, für Aufbau). Die Fragen darunter sind keine Deko: Jede Antwort verändert deinen Plan — und der Wunsch-Look fließt in die Bilder ein."));

  var io = el("div", "trf-io");
  function bigInput(labelHtml, value) {
    var cell = el("div", "trf-io-cell");
    cell.appendChild(el("span", "trf-k", labelHtml));
    var wrap = el("div", "trf-bigin");
    var inp = el("input");
    inp.type = "number"; inp.min = "40"; inp.max = "300"; inp.step = "0.5";
    inp.setAttribute("inputmode", "decimal");
    inp.value = value != null ? value : "";
    inp.placeholder = "—";
    wrap.appendChild(inp);
    wrap.appendChild(el("span", "u", "KG"));
    cell.appendChild(wrap);
    return { cell: cell, input: inp };
  }
  var fCur = bigInput("IST — aktuelles Gewicht", state.currentKg);
  var fA = bigInput("ZIEL A", state.targetA);
  var fB = bigInput("ZIEL B", state.targetB);

  var PCTS = [0.10, 0.20, 0.30];
  function makeChips(cell, key, input) {
    var row = el("div", "trf-chips");
    PCTS.forEach(function (p) {
      var b = el("button", "trf-chip", "−" + Math.round(p * 100) + " %");
      b.type = "button";
      b.addEventListener("click", function () {
        activePct[key] = p;
        applyPct(key, input);
        syncChips();
      });
      row.appendChild(b);
    });
    input.addEventListener("input", function () { activePct[key] = null; syncChips(); });
    cell.appendChild(row);
    return row;
  }
  function applyPct(key, input) {
    var c = num(fCur.input.value);
    if (!c || !activePct[key]) return;
    input.value = Math.round(c * (1 - activePct[key]));
  }
  var chipsA = makeChips(fA.cell, "a", fA.input);
  var chipsB = makeChips(fB.cell, "b", fB.input);
  function syncChips() {
    [[chipsA, "a"], [chipsB, "b"]].forEach(function (pair) {
      var kids = pair[0].querySelectorAll(".trf-chip");
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.toggle("is-on", activePct[pair[1]] === PCTS[i]);
      }
    });
  }
  fCur.input.addEventListener("input", function () {
    applyPct("a", fA.input);
    applyPct("b", fB.input);
  });
  io.appendChild(fCur.cell); io.appendChild(fA.cell); io.appendChild(fB.cell);
  s2.appendChild(io);
  if (state.currentKg) { applyPct("a", fA.input); applyPct("b", fB.input); }
  syncChips();

  /* Fragebogen: Chip-Gruppen, single-select, jede Antwort wird persistiert. */
  function chipGroup(label, key, options) {
    var cell = el("div", "trf-io-cell trf-q-cell");
    cell.appendChild(el("span", "trf-k", label));
    var row = el("div", "trf-chips");
    options.forEach(function (o) {
      var b = el("button", "trf-chip", o.label);
      b.type = "button";
      b.addEventListener("click", function () {
        state[key] = o.v;
        save();
        var kids = row.querySelectorAll(".trf-chip");
        for (var i = 0; i < kids.length; i++) kids[i].classList.toggle("is-on", options[i].v === o.v);
      });
      if (state[key] === o.v) b.classList.add("is-on");
      row.appendChild(b);
    });
    cell.appendChild(row);
    return cell;
  }
  var q = el("div", "trf-q");
  q.appendChild(chipGroup("Zeitraum — bis wann?", "months", [
    { v: 3, label: "3 MONATE" }, { v: 6, label: "6 MONATE" }, { v: 12, label: "12 MONATE" }, { v: null, label: "OFFEN" }
  ]));
  q.appendChild(chipGroup("Wunsch-Look (fließt ins Bild)", "look", [
    { v: "lean", label: "DEFINIERT" }, { v: "athletic", label: "ATHLETISCH" }, { v: "muscular", label: "MASSIV" }
  ]));
  q.appendChild(chipGroup("Trainingserfahrung", "exp", [
    { v: "neu", label: "< 1 JAHR" }, { v: "mid", label: "1-4 JAHRE" }, { v: "pro", label: "4+ JAHRE" }
  ]));
  q.appendChild(chipGroup("Trainingstage pro Woche", "days", [
    { v: 2, label: "2" }, { v: 3, label: "3" }, { v: 4, label: "4" }, { v: 5, label: "5" }, { v: 6, label: "6" }
  ]));
  q.appendChild(chipGroup("Status", "mode", [
    { v: "natural", label: "NATURAL" }, { v: "enhanced", label: "ENHANCED" }
  ]));
  q.appendChild(chipGroup("Equipment", "equip", [
    { v: "gym", label: "GYM" }, { v: "home", label: "ZUHAUSE / KURZHANTELN" }
  ]));
  s2.appendChild(q);

  // Rahmendaten — nur für die Kalorienrechnung der Pläne, nicht fürs Bild.
  var meta = el("div", "trf-meta");
  function metaField(label, id, value, attrs) {
    var wrap = el("label");
    wrap.innerHTML = "<span>" + label + "</span>";
    var inp = el("input"); inp.id = id; inp.type = "number"; inp.value = value != null ? value : "";
    Object.keys(attrs || {}).forEach(function (k) { inp.setAttribute(k, attrs[k]); });
    wrap.appendChild(inp);
    return { wrap: wrap, input: inp };
  }
  var fH = metaField("Größe (cm)", "trfH", state.heightCm, { min: 140, max: 220, step: "1", inputmode: "numeric" });
  var fAge = metaField("Alter", "trfAge", state.age, { min: 18, max: 90, step: "1", inputmode: "numeric" });
  var actWrap = el("label");
  actWrap.innerHTML = "<span>Alltags-Aktivität</span>";
  var actSel = el("select"); actSel.id = "trfAct";
  Object.keys(ACTIVITY).forEach(function (k) {
    var o = el("option"); o.value = k; o.textContent = ACTIVITY[k].label;
    if (k === state.activity) o.selected = true;
    actSel.appendChild(o);
  });
  actWrap.appendChild(actSel);
  meta.appendChild(fH.wrap); meta.appendChild(fAge.wrap); meta.appendChild(actWrap);
  s2.appendChild(meta);
  root.appendChild(s2);

  /* --- Schritt 3: Visualisieren + Bühne --- */
  var s3 = el("section", "trf-step");
  s3.appendChild(secthead("MM / TRANSFORM · 03", "Visualisieren"));
  var gate = el("div", "trf-gate");
  var runBtn = el("button", "btn btn-primary", "Beide Ziele visualisieren");
  runBtn.id = "trfRun";
  var runErr = el("p", "trf-error"); runErr.style.display = "none"; runErr.style.marginTop = "12px";
  var stage = el("div", "trf-stage");
  s3.appendChild(gate); s3.appendChild(runBtn); s3.appendChild(runErr); s3.appendChild(stage);
  root.appendChild(s3);

  /* --- Schritt 4: Pläne --- */
  var s4 = el("section", "trf-step");
  s4.id = "trfPlanSec";
  s4.style.display = "none";
  root.appendChild(s4);

  /* ================= Login-Gate ================= */
  var accountState = "unknown";
  function renderGate() {
    gate.innerHTML = "";
    if (accountState === "signed_in") { runBtn.disabled = !state.photo; return; }
    runBtn.disabled = true;
    if (accountState === "local") {
      gate.appendChild(el("p", "trf-hint", "Auf diesem Gerät ist kein Cloud-Konto aktiv — die Bildgenerierung läuft über dein My-MaleMetrix-Konto."));
      return;
    }
    var p = el("p", "trf-hint", "Die Bildgenerierung braucht ein kostenloses My-MaleMetrix-Konto (Magic Link, kein Passwort) — sie ist pro Nutzer auf 12 Bilder/Stunde begrenzt, weil jedes Bild echtes Geld kostet.");
    var row = el("div", "trf-login");
    var mail = el("input"); mail.type = "email"; mail.placeholder = "deine@email.de"; mail.autocomplete = "email";
    var btn = el("button", "btn btn-dark btn-sm", "Magic Link senden");
    var msg = el("p", "trf-hint"); msg.style.display = "none";
    btn.addEventListener("click", function () {
      var v = (mail.value || "").trim();
      if (!/^\S+@\S+\.\S+$/.test(v)) { msg.textContent = "Bitte eine gültige E-Mail-Adresse eingeben."; msg.style.display = ""; return; }
      btn.disabled = true;
      MM.account.signIn(v).then(function (r) {
        msg.textContent = r && r.message ? r.message : (r && r.ok ? "Magic Link gesendet — prüfe dein Postfach." : "Anmeldung fehlgeschlagen.");
        msg.style.display = ""; btn.disabled = false;
      });
    });
    row.appendChild(mail); row.appendChild(btn);
    gate.appendChild(p); gate.appendChild(row); gate.appendChild(msg);
  }

  if (window.MM && MM.account) {
    MM.account.onChange(function (snap) { accountState = snap.state; renderGate(); });
    MM.account.whenReady().then(function (snap) { accountState = snap.state; renderGate(); }).catch(function () { renderGate(); });
  }
  renderGate();

  /* ================= Bühnen-Panels ================= */
  function panel(idLabel, kg, isTarget) {
    var p = el("div", "trf-panel" + (isTarget ? " is-target" : ""));
    var head = el("div", "trf-panel-head");
    head.appendChild(el("span", "id", esc(idLabel)));
    head.appendChild(el("span", "kg", kg + "<small>KG</small>"));
    p.appendChild(head);
    var view = el("div", "trf-view");
    p.appendChild(view);
    var foot = el("div", "trf-panel-foot");
    p.appendChild(foot);
    return { root: p, view: view, foot: foot };
  }
  function showScan(view, kg) {
    view.innerHTML = "";
    var sc = el("div", "trf-scan");
    sc.appendChild(el("span", "st", "MODELL ARBEITET"));
    sc.appendChild(el("span", "st2", "ZIEL " + kg + " KG · CA. 10-30 SEK"));
    view.appendChild(sc);
  }
  function showError(view, code) {
    view.innerHTML = "";
    var wrap = el("div", "trf-scan-err");
    wrap.appendChild(el("p", "trf-error", esc(fehlertext(code))));
    view.appendChild(wrap);
  }
  function track(ev) { try { if (window.MM && MM.track) MM.track(ev); } catch (e) {} }

  /* ================= Wasserzeichen & Teilen (Monetarisierung #5) =================
     Jedes generierte Bild trägt ein dezentes MALEMETRIX-Wasserzeichen, und der
     Teilen-Button baut ein Vorher/Nachher-Composite (1080×1350, 4:5) — jede
     geteilte Transformation wirbt für die Seite. Alles clientseitig auf
     Canvas; schlägt der Cross-Origin-Zugriff auf das Bild-CDN fehl, wird
     ehrlich degradiert (Bild ohne Wasserzeichen, Teilen als Link). */
  function loadImg(src, cross) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (cross) img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("img")); };
      img.src = src;
    });
  }
  function drawCover(ctx, img, x, y, w, h) {
    var s = Math.max(w / img.width, h / img.height);
    var dw = img.width * s, dh = img.height * s;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
  }
  function drawBrand(ctx, x, y, size) {
    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 " + size + "px 'Space Grotesk', 'Inter', sans-serif";
    ctx.fillStyle = "rgba(240,238,233,0.92)";
    ctx.fillText("MALEMETRI", x, y);
    var w = ctx.measureText("MALEMETRI").width;
    ctx.fillStyle = "#16C4F4";
    ctx.fillText("X", x + w + size * 0.06, y);
    ctx.restore();
  }
  // Wasserzeichen unten rechts auf das generierte Bild (liefert Data-URL
  // oder null, wenn das CDN kein Cross-Origin-Canvas erlaubt).
  function watermark(url) {
    return loadImg(url, true).then(function (img) {
      var c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      var x = c.getContext("2d");
      x.drawImage(img, 0, 0);
      var fs = Math.max(16, Math.round(c.width * 0.028));
      x.save();
      x.textBaseline = "alphabetic"; x.textAlign = "left";
      x.font = "700 " + fs + "px 'Space Grotesk', 'Inter', sans-serif";
      var tw = x.measureText("MALEMETRIX").width;
      x.fillStyle = "rgba(7,10,15,0.55)";
      x.fillRect(c.width - tw - fs * 1.6, c.height - fs * 2.2, tw + fs * 1.6, fs * 2.2);
      x.restore();
      drawBrand(x, c.width - tw - fs * 0.8, c.height - fs * 0.75, fs);
      return c.toDataURL("image/jpeg", 0.9);
    }).catch(function () { return null; });
  }
  // Vorher/Nachher-Composite fürs Teilen: 1080×1350 (Instagram/TikTok-sicher).
  function buildShareCard(beforeSrc, afterSrc, curKg, targetKg) {
    return Promise.all([loadImg(beforeSrc, false), loadImg(afterSrc, /^data:/.test(afterSrc) ? false : true)]).then(function (imgs) {
      var W = 1080, H = 1350;
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var x = c.getContext("2d");
      x.fillStyle = "#070A0F"; x.fillRect(0, 0, W, H);
      // Kopfzeile im Systemstil
      x.font = "500 26px 'JetBrains Mono', monospace";
      x.fillStyle = "#16C4F4";
      x.fillText("MM / TRANSFORM", 48, 76);
      x.fillStyle = "rgba(255,255,255,0.35)";
      x.fillText("BODY PREVIEW", 48, 112);
      // Zwei Panels
      var top = 150, bh = 1000, gap = 10, bw = (W - 96 - gap) / 2;
      drawCover(x, imgs[0], 48, top, bw, bh);
      drawCover(x, imgs[1], 48 + bw + gap, top, bw, bh);
      x.strokeStyle = "rgba(255,255,255,0.14)";
      x.strokeRect(48, top, bw, bh); x.strokeRect(48 + bw + gap, top, bw, bh);
      // Labels
      function tag(tx, label) {
        x.font = "500 24px 'JetBrains Mono', monospace";
        var tw = x.measureText(label).width;
        x.fillStyle = "rgba(7,10,15,0.78)";
        x.fillRect(tx, top + 18, tw + 28, 44);
        x.fillStyle = "rgba(240,238,233,0.95)";
        x.fillText(label, tx + 14, top + 48);
      }
      tag(48 + 18, "VORHER · " + curKg + " KG");
      tag(48 + bw + gap + 18, "ZIEL · " + targetKg + " KG");
      // Fußzeile: Marke + Domain
      drawBrand(x, 48, H - 84, 44);
      x.font = "500 26px 'JetBrains Mono', monospace";
      x.fillStyle = "rgba(255,255,255,0.45)";
      x.textAlign = "right";
      x.fillText("malemetrix.com", W - 48, H - 92);
      x.textAlign = "left";
      return new Promise(function (resolve) { c.toBlob(resolve, "image/jpeg", 0.9); });
    });
  }
  function shareResult(t, afterSrc, btn) {
    track("transform_share");
    buildShareCard(state.photo, afterSrc, state.currentKg, t).then(function (blob) {
      if (!blob) throw new Error("blob");
      var file = new File([blob], "malemetrix-transformation.jpg", { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: "Meine Transformation", text: "Meine Transformation mit MaleMetrix — malemetrix.com/transformation.html" }).catch(function () {});
      }
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "malemetrix-transformation.jpg";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
    }).catch(function () {
      // Composite nicht möglich (z. B. CORS) → wenigstens den Link teilen.
      var url = "https://www.malemetrix.com/transformation.html";
      if (navigator.share) { navigator.share({ title: "MaleMetrix Transformation", url: url }).catch(function () {}); return; }
      try { navigator.clipboard.writeText(url); btn.textContent = "Link kopiert"; } catch (e) {}
    });
  }

  function showCompare(view, beforeSrc, afterSrc) {
    view.innerHTML = "";
    view.classList.add("trf-ba");
    view.style.setProperty("--ba", "50%");
    var b = el("img"); b.src = beforeSrc; b.alt = "Vorher"; b.draggable = false;
    var a = el("img", "after"); a.src = afterSrc; a.alt = "Nachher"; a.draggable = false;
    view.appendChild(b); view.appendChild(a);
    view.appendChild(el("div", "trf-ba-handle"));
    view.appendChild(el("div", "trf-ba-tags", "<span>VORHER</span><span>NACHHER</span>"));
    function setFrom(e) {
      var r = view.getBoundingClientRect();
      var pct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      view.style.setProperty("--ba", pct.toFixed(1) + "%");
    }
    view.addEventListener("pointerdown", function (e) {
      view.setPointerCapture(e.pointerId);
      setFrom(e);
    });
    view.addEventListener("pointermove", function (e) {
      if (e.buttons) setFrom(e);
    });
  }

  /* ================= Generierung ================= */
  function readInputs() {
    state.currentKg = num(fCur.input.value);
    state.targetA = num(fA.input.value);
    state.targetB = num(fB.input.value);
    state.heightCm = num(fH.input.value) || 180;
    state.age = num(fAge.input.value) || 35;
    state.activity = actSel.value;
    save();
  }
  function validateInputs() {
    if (!state.photo) return "Bitte zuerst ein Foto hochladen.";
    if (!state.currentKg || state.currentKg < 40 || state.currentKg > 300) return "Bitte dein aktuelles Gewicht angeben (40-300 kg).";
    var t = [state.targetA, state.targetB];
    for (var i = 0; i < 2; i++) {
      var z = t[i];
      if (!z || z < 40 || z > 300) return "Bitte beide Zielgewichte angeben (40-300 kg).";
      if (z === state.currentKg) return "Ein Ziel ist identisch mit deinem aktuellen Gewicht — das wäre kein Vorher/Nachher.";
      if (Math.abs(state.currentKg - z) > state.currentKg * 0.6) return "Mehr als 60 % Differenz ergibt kein glaubwürdiges Bild — bitte ein realistischeres Ziel wählen.";
    }
    if (state.targetA === state.targetB) return "Die beiden Ziele sind identisch — wähle zwei unterschiedliche, damit der Vergleich etwas zeigt.";
    return null;
  }

  var panels = {};

  runBtn.addEventListener("click", function () {
    readInputs();
    runErr.style.display = "none";
    var v = validateInputs();
    if (v) { runErr.textContent = v; runErr.style.display = ""; return; }
    runBtn.disabled = true;
    runBtn.textContent = "Wird generiert …";
    track("transform_run");
    state.results = {}; state.chosen = null;
    panels = {};
    s4.style.display = "none";
    stage.innerHTML = "";

    var today = panel("HEUTE — IST", state.currentKg, false);
    var im = el("img"); im.src = state.photo; im.alt = "Dein Ausgangsfoto";
    today.view.appendChild(im);
    today.foot.appendChild(el("span", "mono-note", "DEIN AUSGANGSPUNKT"));
    stage.appendChild(today.root);

    var labels = { 0: "ZIEL A", 1: "ZIEL B" };
    var targets = [state.targetA, state.targetB];
    var done = 0;
    targets.forEach(function (t, i) {
      var p = panel(labels[i] + " — " + (t < state.currentKg ? "−" : "+") + Math.round(Math.abs(state.currentKg - t)) + " KG", t, true);
      panels[t] = p;
      showScan(p.view, t);
      p.foot.appendChild(el("span", "mono-note", "WIRD GENERIERT …"));
      stage.appendChild(p.root);

      MM.account.invokeFunction("mm-transform", {
        image: state.photo, current_kg: state.currentKg, target_kg: t,
        look: state.look, enhanced: state.mode === "enhanced"
      })
        .then(function (r) {
          p.foot.innerHTML = "";
          if (r && r.ok && r.data && r.data.image_url) {
            var raw = r.data.image_url;
            return watermark(raw).then(function (wm) {
              var afterSrc = wm || raw;
              state.results[t] = { url: raw, after: afterSrc };
              showCompare(p.view, state.photo, afterSrc);
              var row = el("div", "trf-foot-row");
              var pick = el("button", "btn btn-dark btn-sm", "Dieses Ziel wählen");
              pick.addEventListener("click", function () { chooseGoal(t); });
              var share = el("button", "btn btn-dark btn-sm trf-share", "Teilen");
              share.addEventListener("click", function () { shareResult(t, afterSrc, share); });
              row.appendChild(pick); row.appendChild(share);
              p.foot.appendChild(row);
            });
          } else {
            var code = (r && r.code) || "unbekannt";
            state.results[t] = { error: code };
            showError(p.view, code);
            p.foot.appendChild(el("span", "mono-note", "FEHLGESCHLAGEN"));
          }
        })
        .catch(function () {
          state.results[t] = { error: "unreachable" };
          showError(p.view, "unreachable");
        })
        .then(function () {
          done++;
          if (done === targets.length) { runBtn.disabled = false; runBtn.textContent = "Erneut visualisieren"; }
        });
    });
  });

  /* ================= Ziel wählen → Pläne ================= */
  function chooseGoal(targetKg) {
    state.chosen = targetKg;
    save();
    track("transform_goal");
    Object.keys(panels).forEach(function (k) {
      panels[k].root.classList.toggle("is-chosen", Number(k) === Number(targetKg));
    });
    renderPlans();
    s4.style.display = "";
    try { s4.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { location.hash = "#trfPlanSec"; }
  }

  function rows(list) {
    var w = el("div", "trf-rows");
    list.forEach(function (r) {
      var d = el("div", "trf-row");
      d.appendChild(el("span", "rk", r[0]));
      d.appendChild(el("span", "rv", r[1]));
      w.appendChild(d);
    });
    return w;
  }

  /* Zeitrahmen-Urteil: ehrlich, mit Zahlen — der wichtigste Block des Plans. */
  function verdictBlock(p, months) {
    var cls, label, text;
    var rate = p.usedRate.toFixed(2).replace(".", ",");
    if (p.verdict === "ok") {
      cls = "is-ok"; label = "ZEITRAHMEN MACHBAR";
      text = "<strong>" + p.delta + " kg in " + months + " Monaten</strong> entspricht " + rate + " kg/Woche — seriös machbar. Der Plan unten ist genau darauf gerechnet.";
    } else if (p.verdict === "tight") {
      cls = "is-tight"; label = "ZEITRAHMEN KNAPP";
      text = "<strong>" + p.delta + " kg in " + months + " Monaten</strong> ist das obere Ende des Seriösen (" + rate + " kg/Woche). Der Plan fährt am Limit — jede schwache Woche verschiebt das Ziel. Puffer: rechne mit " + p.realWeeks + "-" + Math.ceil(p.realWeeks * 1.2) + " Wochen.";
    } else if (p.verdict === "unreal") {
      cls = "is-unreal"; label = "NICHT SERIÖS MACHBAR";
      var needed = p.neededRate.toFixed(2).replace(".", ",");
      text = "<strong>" + p.delta + " kg in " + months + " Monaten</strong> hieße " + needed + " kg/Woche — das kostet " + (p.cut ? "Muskeln und endet im Jojo" : "mehr Fett als Muskeln") + ". Wir rechnen nichts schön: Der Plan unten nutzt die schnellste seriöse Rate (" + rate + " kg/Woche) und braucht dafür <strong>" + p.realWeeks + " Wochen</strong>.";
    } else {
      cls = "is-open"; label = "OHNE DATUM — NACHHALTIG";
      text = "Kein Zieldatum gewählt: Der Plan fährt eine nachhaltige Rate von " + rate + " kg/Woche. Realistischer Zeitrahmen für " + p.delta + " kg: <strong>" + p.realWeeks + " Wochen</strong> (schnellste seriöse Variante: " + p.bestWeeks + ").";
    }
    var v = el("div", "trf-verdict " + cls);
    v.appendChild(el("span", "vk", label));
    v.appendChild(el("span", "vt", text));
    return v;
  }

  function renderPlans() {
    var t = state.chosen;
    var p = calcPlan(state, t);
    var LOOK_LABEL = { lean: "definiert", athletic: "athletisch", muscular: "massiv" };
    s4.innerHTML = "";
    s4.appendChild(secthead("MM / PROTOCOL · 04", "Dein Plan für " + t + " kg"));
    s4.appendChild(el("p", "trf-hint",
      "Gerechnet aus deinen Antworten: " + state.currentKg + " kg → " + t + " kg · Look " + (LOOK_LABEL[state.look] || "athletisch") + " · " +
      (state.months ? state.months + " Monate" : "ohne Zieldatum") + " · " + state.days + " Trainingstage · " +
      (state.exp === "neu" ? "unter 1 Jahr Erfahrung" : state.exp === "pro" ? "4+ Jahre Erfahrung" : "1-4 Jahre Erfahrung") + " · " +
      (p.enh ? "enhanced" : "natural") + " · " + (state.equip === "home" ? "zuhause/Kurzhanteln" : "Gym") + " · " +
      state.heightCm + " cm · " + state.age + " Jahre · " + esc((ACTIVITY[state.activity] || ACTIVITY.moderat).label) +
      ". Grundumsatz (Mifflin-St-Jeor): " + p.bmr + " kcal · Erhaltungsbedarf: ca. " + p.tdee + " kcal."));

    s4.appendChild(verdictBlock(p, state.months));

    var mrow = el("div", "mm-metric-row trf-plan-metrics");
    function metric(v, unit, k, cls) {
      var m = el("div", "mm-metric" + (cls ? " " + cls : ""));
      m.appendChild(el("span", "v", v + (unit ? "<small>&nbsp;" + unit + "</small>" : "")));
      m.appendChild(el("span", "k", k));
      return m;
    }
    mrow.appendChild(metric(p.kcal, "KCAL", "pro Tag (" + (p.cut ? "−" : "+") + p.kcalDelta + " zum Erhalt)"));
    mrow.appendChild(metric(p.protein, "G", "Protein — nicht verhandelbar", "is-up"));
    mrow.appendChild(metric(p.fett, "G", "Fett"));
    mrow.appendChild(metric(p.carbs, "G", "Kohlenhydrate"));
    mrow.appendChild(metric(p.usedRate.toFixed(2).replace(".", ","), "KG/WO", (p.cut ? "Abnahme" : "Aufbau") + "-Rate"));
    mrow.appendChild(metric(p.realWeeks, "WO", "bis " + t + " kg, ehrlich"));
    s4.appendChild(mrow);

    var grid = el("div", "trf-plan-grid");

    /* --- Ernährung --- */
    var colE = el("div", "trf-plan-col");
    colE.appendChild(el("h3", null, "Ernährung"));
    var mealsE;
    if (p.cut) {
      mealsE = [
        ["FRÜH", "<strong>Magerquark/Skyr (300 g)</strong> mit Beeren &amp; Haferflocken — ~40 g Protein"],
        ["MITTAG", "<strong>Hähnchen/Rind/Fisch (200 g)</strong> + Reis/Kartoffeln + Gemüse"],
        ["ABEND", "<strong>Eier/Fisch/Tofu</strong> + großes Gemüse + Olivenöl"],
        ["SNACK", "<strong>Whey-Shake oder Hüttenkäse</strong> — schließt die Proteinlücke"],
        ["REGEL", "Wiegen täglich morgens, gewertet wird nur der <strong>Wochenschnitt</strong>. Liegt er 2 Wochen über der Ziel-Rate: −150 kcal."]
      ];
    } else {
      mealsE = [
        ["FRÜH", "<strong>Haferflocken (100 g)</strong> + Whey + Banane + Nüsse"],
        ["MITTAG", "<strong>Fleisch/Fisch (200 g)</strong> + große Portion Reis/Nudeln + Gemüse"],
        ["ABEND", "<strong>Eier/Lachs</strong> + Kartoffeln + Avocado"],
        ["SNACKS", "Shake + Obst nach dem Training, <strong>Quark vor dem Schlafen</strong>"],
        ["REGEL", "Wiegen täglich morgens, Wochenschnitt zählt. Baut er 2 Wochen nichts auf: +150 kcal."]
      ];
    }
    colE.appendChild(rows(mealsE));
    grid.appendChild(colE);

    /* --- Training --- */
    var colT = el("div", "trf-plan-col");
    colT.appendChild(el("h3", null, "Training"));
    colT.appendChild(rows(trainingRows(state, p)));
    grid.appendChild(colT);

    /* --- Supplemente --- */
    var colS = el("div", "trf-plan-col");
    colS.appendChild(el("h3", null, "Supplemente"));
    var rowsS = [
      ["WHEY", "Nur um die <strong>" + p.protein + " g Protein</strong> real zu erreichen — Essen zuerst"],
      ["KREATIN", "<strong>3-5 g Monohydrat täglich</strong>, jeden Tag, egal wann"],
      ["VITAMIN D3", "Nach <strong>Blutwert</strong> dosieren (Ziel 40-60 ng/ml) — erst messen, dann schlucken"],
      ["OMEGA-3", "1-2 g EPA/DHA täglich"],
      ["MAGNESIUM", "300-400 mg abends"]
    ];
    if (p.cut) rowsS.push(["KOFFEIN", "Vor dem Training — der einzige legale „Fatburner“, der wirkt. Der Rest im Fatburner-Regal ist Dekoration."]);
    if (p.enh) {
      rowsS.push(["MONITORING", "Enhanced ohne Daten ist Blindflug: <strong>großes Blutbild, Lipide, Leberwerte, Hämatokrit, Blutdruck alle 8-12 Wochen</strong> + ärztliche Begleitung. Nicht optional."]);
      rowsS.push(["SUBSTANZEN", "Bewusst <strong>keine</strong> Substanz- oder Dosierungsempfehlungen — die nüchterne Einordnung von Wirkstoffen, Risiken und Mythen liefert die <a href=\"anabole-matrix.html\">Anabole Matrix</a>."]);
    }
    rowsS.push(["EHRLICH", "Supplemente sind die letzten 5 % — die ersten 95 % stehen in den beiden Spalten links."]);
    colS.appendChild(rows(rowsS));
    grid.appendChild(colS);

    s4.appendChild(grid);

    /* --- Die Brücke zum Protokoll (Monetarisierung #1) ---
       Der Moment nach der Zielwahl ist der heißeste Punkt im Funnel. Wer das
       Protokoll schon besitzt, bekommt statt Verkauf den Weg in die App —
       Quelle der Wahrheit sind die server-vergebenen Entitlements. */
    var hasProto = false;
    try { hasProto = !!(window.MM && MM.account && MM.account.hasAccess && MM.account.hasAccess("protocol")); } catch (e) {}
    var cta = el("div", "trf-cta");
    cta.appendChild(el("span", "ck", "MM / NEXT"));
    if (hasProto) {
      cta.appendChild(el("h3", "ct", "Dein Ziel gehört ins System."));
      cta.appendChild(el("p", "cp", "Du hast DAS PROTOKOLL. Trag dein Ziel " + t + " kg in My MaleMetrix ein — Programm, Tracker und Intelligence arbeiten dann " + p.realWeeks + " Wochen lang genau darauf hin, mit Wochen-Reviews statt guter Vorsätze."));
      var goApp = el("a", "btn btn-primary", "Weiter in My MaleMetrix");
      goApp.href = "mein-protokoll.html";
      goApp.setAttribute("data-track", "transform_cta_mymm");
      cta.appendChild(goApp);
    } else {
      cta.appendChild(el("h3", "ct", "Das ist die Landkarte. DAS PROTOKOLL ist das Fahrzeug."));
      cta.appendChild(el("p", "cp", "Der Plan oben sagt, was zu tun ist. Das Protokoll sorgt dafür, dass es " + p.realWeeks + " Wochen lang wirklich passiert: 12-Wochen-Programm, Tracker mit Progression, Wochen-Reviews und Intelligence — auf dein Ziel " + t + " kg. <strong>99 €, einmalig, kein Abo.</strong>"));
      var goProto = el("a", "btn btn-primary", "DAS PROTOKOLL ansehen");
      goProto.href = "protokoll.html";
      goProto.setAttribute("data-track", "transform_cta_protokoll");
      cta.appendChild(goProto);
    }
    s4.appendChild(cta);

    s4.appendChild(el("p", "trf-hint trf-plan-note",
      "Kein medizinischer Rat: Bei Vorerkrankungen, Medikamenten oder einem Ziel unter BMI 20 zuerst ärztlich abklären. " +
      "Die generierten Bilder sind eine Visualisierung, kein Versprechen — dein echtes Ergebnis entsteht aus " + p.realWeeks + " Wochen Umsetzung."));
  }

  /* Gespeicherte Wahl wiederherstellen (ohne Bilder — die leben nur je Sitzung) */
  if (state.chosen && state.currentKg) {
    renderPlans();
    s4.style.display = "";
  }
})();
