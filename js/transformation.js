/* ==========================================================================
   MaleMetrix — Transformation (transformation.html)
   --------------------------------------------------------------------------
   Der Nutzer lädt ein Foto von sich hoch, wählt zwei Zielgewichte und sieht
   fotorealistische Vorschauen seiner selbst mit diesen Gewichten. Danach
   wählt er EIN Ziel — und bekommt dafür Ernährungs-, Trainings- und
   Supplementplan, deterministisch berechnet (keine KI-Zahlen).

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

  function loadSaved() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (!s) return;
      ["currentKg", "targetA", "targetB", "heightCm", "age", "activity", "chosen"].forEach(function (k) {
        if (s[k] != null) state[k] = s[k];
      });
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

  var FEHLERTEXT = {
    not_signed_in: "Bitte melde dich zuerst an — die Bildgenerierung braucht ein Konto.",
    no_cloud: "Account-Sync ist auf diesem Gerät nicht aktiv — ohne Cloud-Konto keine Bildgenerierung.",
    rate_limited: "Stundenlimit erreicht (12 Bilder). Versuch es in einer Stunde wieder.",
    provider_not_configured: "Die Bildgenerierung ist serverseitig noch nicht freigeschaltet (API-Key fehlt).",
    provider_auth_failed: "Der Bild-Dienst lehnt unseren Schlüssel ab — wir kümmern uns darum.",
    content_rejected: "Das Bildmodell hat dieses Foto abgelehnt. Nutz ein Foto in Unterwäsche oder Sportkleidung — vollständig unbekleidete Fotos werden vom Modell blockiert.",
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
  s1.appendChild(el("h2", "h-sub", "1 · Dein Foto"));
  s1.appendChild(el("p", "small trf-hint",
    "Frontal, gut beleuchtet, ganzer Oberkörper oder ganzer Körper. Unterwäsche oder enge Sportkleidung reicht völlig — " +
    "<strong>vollständig unbekleidete Fotos lehnt das Bildmodell ab</strong> und das Ergebnis wäre dasselbe. " +
    "Dein Foto wird <strong>nicht gespeichert</strong>: Es geht einmalig zur Generierung an den Bild-Dienst und bleibt sonst auf deinem Gerät."));
  var drop = el("div", "trf-drop");
  drop.innerHTML = '<span class="trf-drop-text">Foto hierher ziehen oder klicken</span>';
  var fileIn = el("input");
  fileIn.type = "file"; fileIn.accept = "image/jpeg,image/png,image/webp"; fileIn.className = "file-hidden";
  var preview = el("img", "trf-preview"); preview.alt = "Dein hochgeladenes Foto"; preview.style.display = "none";
  var photoErr = el("p", "small trf-error"); photoErr.style.display = "none";
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
      preview.src = dataUrl; preview.style.display = "";
      drop.querySelector(".trf-drop-text").textContent = "Anderes Foto wählen";
      renderGate();
    }).catch(function () {
      photoErr.textContent = "Das Foto konnte nicht gelesen werden — bitte JPG, PNG oder WebP verwenden.";
      photoErr.style.display = "";
    });
  }
  s1.appendChild(drop); s1.appendChild(fileIn); s1.appendChild(preview); s1.appendChild(photoErr);
  root.appendChild(s1);

  /* --- Schritt 2: Gewichte & Rahmendaten --- */
  var s2 = el("section", "trf-step");
  s2.appendChild(el("h2", "h-sub", "2 · Wo du stehst, wo du hinwillst"));
  s2.appendChild(el("p", "small trf-hint", "Zwei Ziele, zwei Vorschauen — damit du vergleichen kannst, bevor du dich festlegst. Größe, Alter und Aktivität brauchen wir nur für die Pläne (Kalorienrechnung), nicht fürs Bild."));
  var form = el("div", "trf-form");
  function field(label, id, value, attrs) {
    var wrap = el("label", "trf-field");
    wrap.innerHTML = '<span>' + label + '</span>';
    var inp = el("input"); inp.id = id; inp.type = "number"; inp.value = value != null ? value : "";
    Object.keys(attrs || {}).forEach(function (k) { inp.setAttribute(k, attrs[k]); });
    wrap.appendChild(inp);
    return { wrap: wrap, input: inp };
  }
  var fCur = field("Aktuelles Gewicht (kg)", "trfCur", state.currentKg, { min: 40, max: 300, step: "0.5", inputmode: "decimal" });
  var fA = field("Ziel A (kg)", "trfA", state.targetA, { min: 40, max: 300, step: "0.5", inputmode: "decimal" });
  var fB = field("Ziel B (kg)", "trfB", state.targetB, { min: 40, max: 300, step: "0.5", inputmode: "decimal" });
  var fH = field("Größe (cm)", "trfH", state.heightCm, { min: 140, max: 220, step: "1", inputmode: "numeric" });
  var fAge = field("Alter", "trfAge", state.age, { min: 18, max: 90, step: "1", inputmode: "numeric" });
  var actWrap = el("label", "trf-field");
  actWrap.innerHTML = "<span>Aktivität</span>";
  var actSel = el("select"); actSel.id = "trfAct";
  Object.keys(ACTIVITY).forEach(function (k) {
    var o = el("option"); o.value = k; o.textContent = ACTIVITY[k].label;
    if (k === state.activity) o.selected = true;
    actSel.appendChild(o);
  });
  actWrap.appendChild(actSel);
  [fCur.wrap, fA.wrap, fB.wrap, fH.wrap, fAge.wrap, actWrap].forEach(function (w) { form.appendChild(w); });
  s2.appendChild(form);

  /* Ziel-Vorschläge: −20 % und −30 % vom aktuellen Gewicht (100 kg → 80/70),
     nur solange der Nutzer die Felder nicht selbst angefasst hat. */
  var touched = { a: state.targetA != null, b: state.targetB != null };
  fA.input.addEventListener("input", function () { touched.a = true; });
  fB.input.addEventListener("input", function () { touched.b = true; });
  fCur.input.addEventListener("input", function () {
    var c = num(fCur.input.value);
    if (!c) return;
    if (!touched.a) fA.input.value = Math.round(c * 0.8);
    if (!touched.b) fB.input.value = Math.round(c * 0.7);
  });
  root.appendChild(s2);

  /* --- Schritt 3: Visualisieren --- */
  var s3 = el("section", "trf-step");
  s3.appendChild(el("h2", "h-sub", "3 · Visualisieren"));
  var gate = el("div", "trf-gate");
  var runBtn = el("button", "btn btn-primary", "Beide Ziele visualisieren");
  runBtn.id = "trfRun";
  var runErr = el("p", "small trf-error"); runErr.style.display = "none";
  var cards = el("div", "trf-cards");
  s3.appendChild(gate); s3.appendChild(runBtn); s3.appendChild(runErr); s3.appendChild(cards);
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
      gate.appendChild(el("p", "small trf-hint", "Auf diesem Gerät ist kein Cloud-Konto aktiv — die Bildgenerierung läuft über dein My-MaleMetrix-Konto."));
      return;
    }
    var p = el("p", "small trf-hint", "Die Bildgenerierung braucht ein kostenloses My-MaleMetrix-Konto (Magic Link, kein Passwort) — sie ist pro Nutzer auf 12 Bilder/Stunde begrenzt, weil jedes Bild echtes Geld kostet.");
    var row = el("div", "trf-login");
    var mail = el("input"); mail.type = "email"; mail.placeholder = "deine@email.de"; mail.autocomplete = "email";
    var btn = el("button", "btn btn-dark btn-sm", "Magic Link senden");
    var msg = el("p", "small trf-hint"); msg.style.display = "none";
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

  function card(title, imgSrc, sub) {
    var c = el("div", "trf-card");
    c.appendChild(el("div", "trf-card-title", title));
    var box = el("div", "trf-card-img");
    if (imgSrc) { var im = el("img"); im.src = imgSrc; im.alt = title; box.appendChild(im); }
    else box.appendChild(el("div", "trf-spinner", ""));
    c.appendChild(box);
    if (sub) c.appendChild(el("div", "small trf-card-sub", sub));
    return c;
  }

  runBtn.addEventListener("click", function () {
    readInputs();
    runErr.style.display = "none";
    var v = validateInputs();
    if (v) { runErr.textContent = v; runErr.style.display = ""; return; }
    runBtn.disabled = true;
    runBtn.textContent = "Wird generiert — dauert je Bild ca. 10-30 Sekunden …";
    state.results = {}; state.chosen = null;
    s4.style.display = "none";
    cards.innerHTML = "";
    cards.appendChild(card("Heute · " + state.currentKg + " kg", state.photo, "Dein Ausgangspunkt"));
    var targets = [state.targetA, state.targetB];
    var slots = targets.map(function (t) {
      var c = card("Ziel · " + t + " kg", null, "wird generiert …");
      cards.appendChild(c);
      return c;
    });
    var done = 0;
    targets.forEach(function (t, i) {
      MM.account.invokeFunction("mm-transform", { image: state.photo, current_kg: state.currentKg, target_kg: t })
        .then(function (r) {
          var slot = slots[i];
          if (r && r.ok && r.data && r.data.image_url) {
            state.results[t] = { url: r.data.image_url };
            var neu = card("Ziel · " + t + " kg", r.data.image_url, "");
            var pick = el("button", "btn btn-dark btn-sm", "Dieses Ziel wählen");
            pick.addEventListener("click", function () { chooseGoal(t); });
            neu.appendChild(pick);
            slot.replaceWith(neu);
          } else {
            var code = (r && r.code) || "unbekannt";
            state.results[t] = { error: code };
            var fail = card("Ziel · " + t + " kg", null, "");
            fail.querySelector(".trf-card-img").innerHTML = '<p class="small trf-error" style="display:block;padding:12px">' + esc(fehlertext(code)) + "</p>";
            slot.replaceWith(fail);
          }
        })
        .catch(function () {
          state.results[t] = { error: "unreachable" };
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
    renderPlans();
    s4.style.display = "";
    try { s4.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { location.hash = "#trfPlanSec"; }
  }

  function planCard(title, rowsHtml) {
    var c = el("div", "trf-plan-card");
    c.appendChild(el("h3", "trf-plan-title", title));
    c.appendChild(el("div", null, rowsHtml));
    return c;
  }

  function renderPlans() {
    var t = state.chosen;
    var p = calcPlan(state.currentKg, t, state.heightCm, state.age, state.activity);
    s4.innerHTML = "";
    s4.appendChild(el("h2", "h-sub", "4 · Dein Plan für " + t + " kg"));
    s4.appendChild(el("p", "small trf-hint",
      "Berechnet aus deinen Angaben (" + state.currentKg + " kg → " + t + " kg, " + state.heightCm + " cm, " + state.age + " Jahre, " +
      esc((ACTIVITY[state.activity] || ACTIVITY.moderat).label) + "). Grundumsatz nach Mifflin-St-Jeor: " + p.bmr + " kcal, Erhaltungsbedarf ca. " + p.tdee + " kcal. " +
      "Realistischer Zeitrahmen für " + p.delta + " kg " + (p.cut ? "Fettabbau" : "Aufbau") + ": <strong>" + p.wochenMin + "-" + p.wochenMax + " Wochen</strong> — alles deutlich Schnellere kostet Muskeln oder ist nicht haltbar."));

    var grid = el("div", "trf-plan-grid");

    /* --- Ernährung --- */
    var meals;
    if (p.cut) {
      meals =
        "<li><strong>Frühstück:</strong> Magerquark/Skyr (300 g) mit Beeren & Haferflocken — ~40 g Protein</li>" +
        "<li><strong>Mittag:</strong> Hähnchen/Rind/Fisch (200 g) + Reis/Kartoffeln + Gemüse</li>" +
        "<li><strong>Abend:</strong> Eier/Fisch/Tofu + großes Gemüse + Olivenöl</li>" +
        "<li><strong>Snack:</strong> Whey-Shake oder Hüttenkäse — schließt die Proteinlücke</li>";
    } else {
      meals =
        "<li><strong>Frühstück:</strong> Haferflocken (100 g) + Whey + Banane + Nüsse</li>" +
        "<li><strong>Mittag:</strong> Fleisch/Fisch (200 g) + große Portion Reis/Nudeln + Gemüse</li>" +
        "<li><strong>Abend:</strong> Eier/Lachs + Kartoffeln + Avocado</li>" +
        "<li><strong>Snacks:</strong> Shake + Obst nach dem Training, Quark vor dem Schlafen</li>";
    }
    grid.appendChild(planCard("Ernährungsplan",
      '<ul class="trf-macros">' +
      "<li><strong>" + p.kcal + " kcal</strong> pro Tag (" + (p.cut ? "−500 zum Erhalt" : "+250 zum Erhalt") + ")</li>" +
      "<li><strong>" + p.protein + " g Protein</strong> (" + (p.cut ? "2,2" : "2,0") + " g/kg Zielgewicht — nicht verhandelbar)</li>" +
      "<li><strong>" + p.fett + " g Fett</strong> · <strong>" + p.carbs + " g Kohlenhydrate</strong></li>" +
      "</ul><p class=\"small\">Beispieltag:</p><ul>" + meals + "</ul>" +
      '<p class="small">Wiegen: täglich morgens, gewertet wird nur der Wochenschnitt. Stagniert der Schnitt 2 Wochen, ' + (p.cut ? "−150 kcal" : "+150 kcal") + ".</p>"));

    /* --- Training --- */
    var training;
    if (p.cut) {
      training =
        "<ul>" +
        "<li><strong>3× Krafttraining/Woche</strong> (Ganzkörper, A/B im Wechsel) — Kraft halten heißt Muskeln halten:</li>" +
        "<li>A: Kniebeuge 3×5-8 · Bankdrücken 3×5-8 · Rudern 3×8-10 · Seitheben 2×12-15 · Plank 3×</li>" +
        "<li>B: Kreuzheben 3×5 · Schulterdrücken 3×6-8 · Klimmzug/Latzug 3×8-10 · Beugercurls 2×10-12</li>" +
        "<li><strong>2× Zone-2-Cardio</strong> 30-40 min (zügig gehen, Rad, Rudern)</li>" +
        "<li><strong>8.000-10.000 Schritte täglich</strong> — der unterschätzte Hebel im Defizit</li>" +
        "</ul><p class=\"small\">Gewichte NICHT reduzieren, nur wenn die Technik bricht. Das Defizit kommt aus der Küche, nicht aus Extra-Cardio.</p>";
    } else {
      training =
        "<ul>" +
        "<li><strong>4× Krafttraining/Woche</strong> (Oberkörper/Unterkörper im Wechsel):</li>" +
        "<li>OK A: Bankdrücken 4×6-8 · Rudern 4×6-8 · Schulterdrücken 3×8-10 · Curls/Trizeps je 3×10-12</li>" +
        "<li>UK A: Kniebeuge 4×6-8 · Rumänisches Kreuzheben 3×8-10 · Ausfallschritte 3×10 · Wadenheben 4×12</li>" +
        "<li>OK B: Schrägbank 4×8-10 · Klimmzüge 4×max · Dips 3×8-12 · Seitheben 3×12-15</li>" +
        "<li>UK B: Kreuzheben 4×5 · Beinpresse 3×10-12 · Beinbeuger 3×10-12 · Bauch 3×</li>" +
        "</ul><p class=\"small\">Progression: jede Woche +1 Wiederholung oder +2,5 kg auf den Hauptübungen. Ohne Progression kein Aufbau — egal wie gut der Plan aussieht.</p>";
    }
    grid.appendChild(planCard("Trainingsplan", training));

    /* --- Supplemente --- */
    grid.appendChild(planCard("Supplementplan",
      "<ul>" +
      "<li><strong>Whey/Casein:</strong> nur um die " + p.protein + " g Protein real zu erreichen — Essen zuerst</li>" +
      "<li><strong>Kreatin-Monohydrat:</strong> 3-5 g täglich, jeden Tag, egal wann</li>" +
      "<li><strong>Vitamin D3:</strong> nach Blutwert dosieren (Ziel 40-60 ng/ml) — erst messen, dann schlucken</li>" +
      "<li><strong>Omega-3:</strong> 1-2 g EPA/DHA täglich</li>" +
      "<li><strong>Magnesium:</strong> 300-400 mg abends</li>" +
      (p.cut ? "<li><strong>Koffein:</strong> vor dem Training — der einzige legale „Fatburner“, der wirkt. Alles andere im Fatburner-Regal ist Dekoration.</li>" : "") +
      "</ul><p class=\"small\">Mehr braucht es nicht. Supplemente sind die letzten 5 % — die ersten 95 % stehen in den beiden Karten links.</p>"));

    s4.appendChild(grid);
    s4.appendChild(el("p", "small trf-hint",
      "Kein medizinischer Rat: Bei Vorerkrankungen, Medikamenten oder einem Ziel unter BMI 20 zuerst ärztlich abklären. " +
      "Die generierten Bilder sind eine Visualisierung, kein Versprechen — dein echtes Ergebnis entsteht aus " + p.wochenMin + "+ Wochen Umsetzung."));
  }

  /* Gespeicherte Wahl wiederherstellen (ohne Bilder — die leben nur je Sitzung) */
  if (state.chosen && state.currentKg) {
    renderPlans();
    s4.style.display = "";
  }
})();
