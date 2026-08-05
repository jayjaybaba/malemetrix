/* ==========================================================================
   MaleMetrix — Transformation (transformation.html)
   --------------------------------------------------------------------------
   Der Nutzer lädt ein Foto von sich hoch, wählt zwei Zielgewichte und sieht
   fotorealistische Vorschauen seiner selbst mit diesen Gewichten — je Ziel
   mit Vorher/Nachher-Regler auf dem eigenen Bild. Danach wählt er EIN Ziel
   und bekommt dafür Ernährungs-, Trainings- und Supplementplan,
   deterministisch berechnet (keine KI-Zahlen).

   Gestaltung folgt VISUAL SYSTEM 2.0 (css/style.css): Instrumente statt
   Karten, Hairline-Ebenen, Mono-Systemsprache, Status-Farben. Die
   Seitenklassen (trf-*) liegen im <style> von transformation.html.

   Datenfluss & Ehrlichkeit:
   · Das Foto bleibt im Browser, bis der Nutzer "Visualisieren" klickt. Dann
     geht es an die Edge Function mm-transform → fal.ai und wird NICHT in
     unserer Datenbank gespeichert. Es landet auch NICHT im localStorage.
   · Die Bild-Generierung braucht ein Konto (Magic Link) — sie kostet pro
     Bild echtes Geld und ist deshalb pro Nutzer begrenzt (12 Bilder/Stunde).
   · Die Pläne sind deterministisch (Mifflin-St-Jeor + feste Regeln). Die KI
     liefert die Bilder, nie die Zahlen — dieselbe Grenze wie überall im
     Projekt (§9: Die KI ist nie Quelle der Wahrheit).
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
    results: {},            // targetKg -> { url } | { error }
    chosen: null            // gewähltes Zielgewicht
  };
  // Aktive Prozent-Chips je Ziel (A/B). Manuelle Eingabe löst den Chip.
  var activePct = { a: 0.2, b: 0.3 };

  function loadSaved() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (!s) return;
      ["currentKg", "targetA", "targetB", "heightCm", "age", "activity", "chosen"].forEach(function (k) {
        if (s[k] != null) state[k] = s[k];
      });
      if (s.targetA != null) activePct.a = null;
      if (s.targetB != null) activePct.b = null;
    } catch (e) {}
  }
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        currentKg: state.currentKg, targetA: state.targetA, targetB: state.targetB,
        heightCm: state.heightCm, age: state.age, activity: state.activity, chosen: state.chosen
      }));
    } catch (e) {}
  }

  /* ================= Foto: verkleinern statt roh hochladen =================
     Ein Kamerafoto hat 8-20 MB — als Base64 sprengt das jede sinnvolle
     Anfrage. 1280 px längste Kante, JPEG 0.85 reicht dem Bildmodell völlig. */
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

  /* ================= Pläne: deterministisch ================= */
  var ACTIVITY = {
    sitzend: { f: 1.2,   label: "überwiegend sitzend" },
    leicht:  { f: 1.375, label: "leicht aktiv (1-3× Sport/Woche)" },
    moderat: { f: 1.55,  label: "moderat aktiv (3-5× Sport/Woche)" },
    hoch:    { f: 1.725, label: "sehr aktiv (6-7× Sport/Woche)" }
  };

  function calcPlan(currentKg, targetKg, heightCm, age, activity) {
    var bmr = Math.round(10 * currentKg + 6.25 * heightCm - 5 * age + 5);
    var tdee = Math.round(bmr * (ACTIVITY[activity] || ACTIVITY.moderat).f);
    var cut = targetKg < currentKg;
    var delta = Math.abs(currentKg - targetKg);
    var kcal, wochenMin, wochenMax;
    if (cut) {
      kcal = Math.max(tdee - 500, 1500);
      // 500 kcal/Tag Defizit ≈ 0,45-0,55 kg/Woche. Ehrliche Spanne, kein Datum.
      wochenMin = Math.ceil(delta / 0.75); wochenMax = Math.ceil(delta / 0.45);
    } else {
      kcal = tdee + 250;
      // Muskelaufbau ist langsam: ~0,25 kg/Woche sind für Fortgeschrittene viel.
      wochenMin = Math.ceil(delta / 0.35); wochenMax = Math.ceil(delta / 0.2);
    }
    var protein = Math.round((cut ? 2.2 : 2.0) * targetKg);
    var fett = Math.max(60, Math.round(1.0 * targetKg));
    var carbs = Math.max(50, Math.round((kcal - protein * 4 - fett * 9) / 4));
    return { cut: cut, delta: delta, bmr: bmr, tdee: tdee, kcal: kcal, protein: protein, fett: fett, carbs: carbs, wochenMin: wochenMin, wochenMax: wochenMax };
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
      var old = drop.querySelector(".trf-drop-preview"); if (old) old.parentNode.removeChild(old);
      var oldS = drop.querySelector(".trf-drop-state"); if (oldS) oldS.parentNode.removeChild(oldS);
      var oldC = drop.querySelector(".trf-drop-change"); if (oldC) oldC.parentNode.removeChild(oldC);
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

  /* --- Schritt 2: Gewichte als Instrumente --- */
  var s2 = el("section", "trf-step");
  s2.appendChild(secthead("MM / TRANSFORM · 02", "Wo du stehst, wo du hinwillst"));
  s2.appendChild(el("p", "trf-hint", "Zwei Ziele, zwei Vorschauen — damit du vergleichst, bevor du dich festlegst. Die Prozent-Marken rechnen vom aktuellen Gewicht; jedes Feld ist frei überschreibbar (auch nach oben, für Aufbau)."));

  var io = el("div", "trf-io");
  function bigInput(labelHtml, value, step) {
    var cell = el("div", "trf-io-cell");
    cell.appendChild(el("span", "trf-k", labelHtml));
    var wrap = el("div", "trf-bigin");
    var inp = el("input");
    inp.type = "number"; inp.min = "40"; inp.max = "300"; inp.step = step || "0.5";
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

  // Prozent-Chips: setzen das Ziel relativ zum IST-Gewicht.
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
  // Startwerte: Chips anwenden, falls Ist-Gewicht gespeichert war.
  if (state.currentKg) { applyPct("a", fA.input); applyPct("b", fB.input); }
  syncChips();

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
  actWrap.innerHTML = "<span>Aktivität</span>";
  var actSel = el("select"); actSel.id = "trfAct";
  Object.keys(ACTIVITY).forEach(function (k) {
    var o = el("option"); o.value = k; o.textContent = ACTIVITY[k].label;
    if (k === state.activity) o.selected = true;
    actSel.appendChild(o);
  });
  actWrap.appendChild(actSel);
  meta.appendChild(fH.wrap); meta.appendChild(fAge.wrap); meta.appendChild(actWrap);
  s2.appendChild(meta);
  s2.appendChild(el("p", "trf-hint", "Größe, Alter und Aktivität fließen NUR in die Kalorienrechnung der Pläne ein — nicht in die Bilder."));
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

  /* ================= Login-Gate =================
     Die Edge Function verlangt einen eingeloggten Nutzer. Ohne Konto zeigen
     wir das ehrlich VOR dem Klick — nicht erst als Fehlermeldung danach. */
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

  /* Vorher/Nachher-Regler: Original unten, Ergebnis oben mit clip-path.
     Ziehen (Pointer Events) verschiebt die Trennlinie. */
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

  var panels = {};   // targetKg -> panel refs (für Auswahl-Markierung)

  runBtn.addEventListener("click", function () {
    readInputs();
    runErr.style.display = "none";
    var v = validateInputs();
    if (v) { runErr.textContent = v; runErr.style.display = ""; return; }
    runBtn.disabled = true;
    runBtn.textContent = "Wird generiert …";
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

      MM.account.invokeFunction("mm-transform", { image: state.photo, current_kg: state.currentKg, target_kg: t })
        .then(function (r) {
          p.foot.innerHTML = "";
          if (r && r.ok && r.data && r.data.image_url) {
            state.results[t] = { url: r.data.image_url };
            showCompare(p.view, state.photo, r.data.image_url);
            var pick = el("button", "btn btn-dark btn-sm", "Dieses Ziel wählen");
            pick.addEventListener("click", function () { chooseGoal(t); });
            p.foot.appendChild(pick);
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

  function renderPlans() {
    var t = state.chosen;
    var p = calcPlan(state.currentKg, t, state.heightCm, state.age, state.activity);
    s4.innerHTML = "";
    s4.appendChild(secthead("MM / PROTOCOL · 04", "Dein Plan für " + t + " kg"));
    s4.appendChild(el("p", "trf-hint",
      "Berechnet aus deinen Angaben (" + state.currentKg + " kg → " + t + " kg, " + state.heightCm + " cm, " + state.age + " Jahre, " +
      esc((ACTIVITY[state.activity] || ACTIVITY.moderat).label) + "). Grundumsatz nach Mifflin-St-Jeor: " + p.bmr + " kcal, Erhaltungsbedarf ca. " + p.tdee + " kcal. Alles deutlich Schnellere als der Zeitrahmen unten kostet Muskeln oder ist nicht haltbar."));

    // Makro-Instrumente: die fünf Zahlen, die den Plan tragen.
    var mrow = el("div", "mm-metric-row trf-plan-metrics");
    function metric(v, unit, k, cls) {
      var m = el("div", "mm-metric" + (cls ? " " + cls : ""));
      m.appendChild(el("span", "v", v + (unit ? "<small>&nbsp;" + unit + "</small>" : "")));
      m.appendChild(el("span", "k", k));
      return m;
    }
    mrow.appendChild(metric(p.kcal, "KCAL", "pro Tag (" + (p.cut ? "−500" : "+250") + " zum Erhalt)"));
    mrow.appendChild(metric(p.protein, "G", "Protein — nicht verhandelbar", "is-up"));
    mrow.appendChild(metric(p.fett, "G", "Fett"));
    mrow.appendChild(metric(p.carbs, "G", "Kohlenhydrate"));
    mrow.appendChild(metric(p.wochenMin + "-" + p.wochenMax, "WO", p.delta + " kg " + (p.cut ? "Fettabbau" : "Aufbau") + ", realistisch"));
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
        ["REGEL", "Wiegen täglich morgens, gewertet wird nur der <strong>Wochenschnitt</strong>. Stagniert er 2 Wochen: −150 kcal."]
      ];
    } else {
      mealsE = [
        ["FRÜH", "<strong>Haferflocken (100 g)</strong> + Whey + Banane + Nüsse"],
        ["MITTAG", "<strong>Fleisch/Fisch (200 g)</strong> + große Portion Reis/Nudeln + Gemüse"],
        ["ABEND", "<strong>Eier/Lachs</strong> + Kartoffeln + Avocado"],
        ["SNACKS", "Shake + Obst nach dem Training, <strong>Quark vor dem Schlafen</strong>"],
        ["REGEL", "Wiegen täglich morgens, Wochenschnitt zählt. Stagniert er 2 Wochen: +150 kcal."]
      ];
    }
    colE.appendChild(rows(mealsE));
    grid.appendChild(colE);

    /* --- Training --- */
    var colT = el("div", "trf-plan-col");
    colT.appendChild(el("h3", null, "Training"));
    var rowsT;
    if (p.cut) {
      rowsT = [
        ["FREQUENZ", "<strong>3× Kraft/Woche</strong> (Ganzkörper A/B im Wechsel) + <strong>2× Zone-2-Cardio</strong> 30-40 min + <strong>8-10k Schritte</strong> täglich"],
        ["TAG A", "Kniebeuge 3×5-8 · Bankdrücken 3×5-8 · Rudern 3×8-10 · Seitheben 2×12-15 · Plank 3×"],
        ["TAG B", "Kreuzheben 3×5 · Schulterdrücken 3×6-8 · Klimmzug/Latzug 3×8-10 · Beugercurls 2×10-12"],
        ["PRINZIP", "Gewichte <strong>nicht</strong> reduzieren — Kraft halten heißt Muskeln halten. Das Defizit kommt aus der Küche, nicht aus Extra-Cardio."]
      ];
    } else {
      rowsT = [
        ["FREQUENZ", "<strong>4× Kraft/Woche</strong> — Oberkörper/Unterkörper im Wechsel"],
        ["OK A", "Bankdrücken 4×6-8 · Rudern 4×6-8 · Schulterdrücken 3×8-10 · Curls/Trizeps je 3×10-12"],
        ["UK A", "Kniebeuge 4×6-8 · Rumänisches Kreuzheben 3×8-10 · Ausfallschritte 3×10 · Wadenheben 4×12"],
        ["OK B", "Schrägbank 4×8-10 · Klimmzüge 4×max · Dips 3×8-12 · Seitheben 3×12-15"],
        ["UK B", "Kreuzheben 4×5 · Beinpresse 3×10-12 · Beinbeuger 3×10-12 · Bauch 3×"],
        ["PRINZIP", "Jede Woche <strong>+1 Wiederholung oder +2,5 kg</strong> auf den Hauptübungen. Ohne Progression kein Aufbau."]
      ];
    }
    colT.appendChild(rows(rowsT));
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
    rowsS.push(["EHRLICH", "Supplemente sind die letzten 5 % — die ersten 95 % stehen in den beiden Spalten links."]);
    colS.appendChild(rows(rowsS));
    grid.appendChild(colS);

    s4.appendChild(grid);
    s4.appendChild(el("p", "trf-hint trf-plan-note",
      "Kein medizinischer Rat: Bei Vorerkrankungen, Medikamenten oder einem Ziel unter BMI 20 zuerst ärztlich abklären. " +
      "Die generierten Bilder sind eine Visualisierung, kein Versprechen — dein echtes Ergebnis entsteht aus " + p.wochenMin + "+ Wochen Umsetzung."));
  }

  /* Gespeicherte Wahl wiederherstellen (ohne Bilder — die leben nur je Sitzung) */
  if (state.chosen && state.currentKg) {
    renderPlans();
    s4.style.display = "";
  }
})();
