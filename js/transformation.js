/* ==========================================================================
   MaleMetrix — Transformation (transformation.html) · Funnel v8 (Phase 3)
   --------------------------------------------------------------------------
   Grundsatz: MINIMALE Reibung vor dem Wow-Moment, tiefe Planfragen erst
   NACH der Zielwahl. Ablauf:

     01  Foto + Pflicht-Einwilligung (P0: 18+, eigenes Foto, Rechte,
         Verarbeitung — keine Übertragung ohne alle vier Haken)
     02  Ausgangslage: Gewicht, Größe, Taille, grobe Körperform, Richtung
     03  ZWEI berechnete Ziele (Zielengine transform-goals.mjs — dieselbe
         Datei validiert serverseitig): A realistischer nächster Zustand,
         B ambitioniertes langfristiges Ziel. Eigenes Ziel nur sekundär,
         live validiert (plausibel/ambitioniert/nicht seriös/blockiert).
     04  Konto-Gate erst UNMITTELBAR vor der Generierung → beide Zielbilder
         mit KI-Kennzeichnung und Vorher/Nachher-Regler
     05  EIN Ziel wählen → erst jetzt Planfragen (jede verändert den Plan)
     06  Plan + Monetarisierung

   Die Zielengine kommt als ES-Modul (window.MMTransformGoals) — EINE
   Quelle der Wahrheit für Grenzen, Schätzbereiche und Alternativen, im
   Browser wie in der Edge Function. Ohne Engine baut die Seite nicht.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.getElementById("mmTransform");
  if (!root) return;

  function boot(G) {
    root.innerHTML = "";

    var LS_KEY = "mm_transform_v2";

    /* ================= Zustand ================= */
    var state = {
      photo: null,          // Data-URI — nur im Speicher, nie persistiert
      currentKg: null,
      heightCm: null,       // Pflicht — KEIN stiller 180-Fallback (Phase 7)
      waistCm: null,
      shape: null,          // adipoes|kraeftig|durchschnitt|athletisch|definiert
      direction: "cut",     // cut | bulk (Engine kann auf recomp drehen)
      manualB: null,        // freigegebenes eigenes Ziel (ersetzt Ziel B)
      targetA: null, targetB: null,
      kindA: null, kindB: null,
      proposals: null,
      chosen: null, chosenKind: null,
      // Planfragen — erst nach der Zielwahl (Schritt 05):
      months: null, age: null, activity: "moderat",
      exp: "mid", days: 3, equip: "gym", mode: "natural", diet: "misch",
      results: {}           // targetKg -> { url, after } | { error }
    };
    var consent = { age: false, self: false, rights: false, processing: false };
    function consentOk() { return consent.age && consent.self && consent.rights && consent.processing; }

    var PERSIST = ["currentKg", "heightCm", "waistCm", "shape", "direction", "manualB",
      "targetA", "targetB", "kindA", "kindB", "chosen", "chosenKind",
      "months", "age", "activity", "exp", "days", "equip", "mode", "diet"];
    function loadSaved() {
      try {
        var s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
        if (!s) return;
        PERSIST.forEach(function (k) { if (s[k] !== undefined) state[k] = s[k]; });
      } catch (e) {}
    }
    function save() {
      try {
        var out = {};
        PERSIST.forEach(function (k) { out[k] = state[k]; });
        localStorage.setItem(LS_KEY, JSON.stringify(out));
      } catch (e) {}
    }

    /* ================= Helfer ================= */
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
    function track(ev) { try { if (window.MM && MM.track) MM.track(ev); } catch (e) {} }
    function once(flagObj, key, fn) { if (!flagObj[key]) { flagObj[key] = true; fn(); } }
    var seen = {};
    /* Sprache für Texte, die in PIXEL gerendert werden (Canvas: KI-Label,
       Share-Card) — dort greift der i18n-MutationObserver nicht. */
    function isEn() { try { return String(document.documentElement.lang || "de").slice(0, 2) === "en"; } catch (e) { return false; } }

    var FEHLERTEXT = {
      not_signed_in: "Bitte melde dich zuerst an — die Generierung braucht ein Konto.",
      no_cloud: "Account-Sync ist auf diesem Gerät nicht aktiv — ohne Cloud-Konto keine Generierung.",
      rate_limited: "Limit erreicht. Versuch es in einer Stunde wieder.",
      consent_required: "Ohne bestätigte Einwilligung wird nichts generiert — bitte bestätige die vier Punkte unter deinem Foto.",
      free_quota_exhausted: "Dein Gratis-Kontingent ist aufgebraucht. Als PROTOKOLL- oder Coaching-Kunde generierst du weiter.",
      daily_capacity: "Das Tageskontingent der Seite ist erreicht (Kostenschutz) — versuch es morgen wieder.",
      provider_not_configured: "Die Generierung ist serverseitig noch nicht freigeschaltet.",
      provider_balance: "Die Generierung ist vorübergehend nicht verfügbar — versuch es später erneut.",
      provider_auth_failed: "Der Bild-Dienst lehnt unseren Schlüssel ab — wir kümmern uns darum.",
      content_rejected: "Das Bildmodell hat dieses Foto abgelehnt. Oberkörperfrei ist kein Problem — nur komplett nackte Fotos blockiert das Modell. Zieh Shorts oder Unterwäsche an und versuch es erneut.",
      invalid_image: "Das Foto konnte nicht verarbeitet werden. Bitte JPG/PNG verwenden.",
      invalid_height: "Bitte gib deine Größe an — ohne sie sind keine seriösen Ziele berechenbar.",
      payload_too_large: "Das Foto ist zu groß. Bitte ein kleineres Foto wählen.",
      target_blocked: "Dieses Ziel wäre nicht seriös — MaleMetrix generiert keine extremen oder gesundheitlich fragwürdigen Zielkörper.",
      unreachable: "Server nicht erreichbar — Verbindung prüfen und erneut versuchen."
    };
    function fehlertext(code) { return FEHLERTEXT[code] || ("Generierung fehlgeschlagen (" + esc(code || "unbekannt") + "). Bitte erneut versuchen."); }

    /* ================= Foto verkleinern ================= */
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

    loadSaved();
    track("transform_view");

    /* =========================================================
       SCHRITT 01 — FOTO + EINWILLIGUNG
       ========================================================= */
    var s1 = el("section", "trf-step");
    s1.appendChild(secthead("MM / TRANSFORM · 01", "Dein Foto"));
    s1.appendChild(el("p", "trf-hint",
      "<strong>Frontal, gut beleuchtet, mindestens Kopf bis Hüfte</strong> — ideal oberkörperfrei oder in eng anliegender Sportkleidung, mit Shorts oder Unterwäsche. Keine vollständige Nacktheit, keine weiteren Personen im Bild. " +
      "Zur Erstellung der KI-Visualisierung wird dein Foto über unseren Server an unseren Bildverarbeitungsdienst übertragen. MaleMetrix speichert das hochgeladene Foto nicht dauerhaft; Details zur Verarbeitung und Löschung stehen in der <a href=\"datenschutz.html\">Datenschutzerklärung</a>."));

    /* Upload-Fläche: echtes interaktives Element (Phase 8.1) — Tastatur
       (Tab, Enter, Leertaste), sichtbarer Fokus, Screenreader-Text, plus
       Drag-and-drop, Touch und Klick. */
    var drop = el("div", "trf-drop");
    drop.setAttribute("role", "button");
    drop.setAttribute("tabindex", "0");
    drop.setAttribute("aria-label", "Foto auswählen oder hier ablegen — JPG, PNG oder WebP; wird nur zur Generierung übertragen");
    drop.innerHTML =
      '<span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>' +
      '<div class="trf-drop-inner">' +
        '<svg class="trf-drop-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/></svg>' +
        '<span class="trf-drop-text">FOTO HIER ABLEGEN — ODER KLICKEN</span>' +
        '<span class="trf-drop-sub">JPG · PNG · WEBP &nbsp;·&nbsp; NUR ZUR GENERIERUNG ÜBERTRAGEN</span>' +
      '</div>';
    var fileIn = el("input");
    fileIn.type = "file"; fileIn.accept = "image/jpeg,image/png,image/webp"; fileIn.className = "file-hidden";
    fileIn.setAttribute("aria-hidden", "true"); fileIn.tabIndex = -1;
    var photoErr = el("p", "trf-error"); photoErr.style.display = "none"; photoErr.style.marginTop = "10px";
    photoErr.setAttribute("role", "alert");
    drop.addEventListener("click", function () { once(seen, "up_start", function () { track("transform_upload_start"); }); fileIn.click(); });
    drop.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        once(seen, "up_start", function () { track("transform_upload_start"); });
        fileIn.click();
      }
    });
    drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("is-over"); });
    drop.addEventListener("dragleave", function () { drop.classList.remove("is-over"); });
    drop.addEventListener("drop", function (e) {
      e.preventDefault(); drop.classList.remove("is-over");
      once(seen, "up_start", function () { track("transform_upload_start"); });
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fileIn.addEventListener("change", function () { if (fileIn.files && fileIn.files[0]) handleFile(fileIn.files[0]); });
    function handleFile(f) {
      photoErr.style.display = "none";
      downscale(f).then(function (dataUrl) {
        state.photo = dataUrl;
        track("transform_upload_success");
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

    /* Einwilligung (P0): keine Checkbox vorausgewählt, Merkmal nur im
       Sitzungszustand; der Server verlangt zusätzlich consent:true. */
    var consentBox = el("div", "trf-consent");
    consentBox.appendChild(el("span", "trf-k", "Einwilligung — Pflicht vor der Generierung"));
    var CONSENT_ITEMS = [
      ["age", "Ich bin mindestens 18 Jahre alt."],
      ["self", "Das Foto zeigt ausschließlich mich."],
      ["rights", "Ich bin berechtigt, dieses Foto zu verwenden."],
      ["processing", "Ich bin damit einverstanden, dass mein Foto zur Erstellung einer KI-Visualisierung wie in der <a href=\"datenschutz.html\">Datenschutzerklärung</a> beschrieben verarbeitet wird."]
    ];
    CONSENT_ITEMS.forEach(function (item) {
      var lab = el("label", "trf-consent-item");
      var cb = el("input");
      cb.type = "checkbox"; cb.checked = false;
      cb.addEventListener("change", function () {
        consent[item[0]] = cb.checked;
        if (consentOk()) once(seen, "consent", function () { track("transform_consent_confirmed"); });
        renderGate();
      });
      lab.appendChild(cb); lab.appendChild(el("span", null, item[1]));
      consentBox.appendChild(lab);
    });
    s1.appendChild(consentBox);
    root.appendChild(s1);

    /* =========================================================
       SCHRITT 02 — AUSGANGSLAGE (nur das Nötigste, keine Planfragen)
       ========================================================= */
    var s2 = el("section", "trf-step");
    s2.appendChild(secthead("MM / TRANSFORM · 02", "Deine Ausgangslage"));
    s2.appendChild(el("p", "trf-hint",
      "Vier Angaben, damit die Ziele zu DIR passen — nicht zu einem Durchschnittskörper. Der Körperfettanteil wird daraus geschätzt (immer als Bereich, nie als Messung)."));

    var io = el("div", "trf-io");
    function bigInput(labelHtml, value, unit, min, max, step) {
      var cell = el("div", "trf-io-cell");
      cell.appendChild(el("span", "trf-k", labelHtml));
      var wrap = el("div", "trf-bigin");
      var inp = el("input");
      inp.type = "number"; inp.min = String(min); inp.max = String(max); inp.step = step || "1";
      inp.setAttribute("inputmode", "decimal");
      inp.value = value != null ? value : "";
      inp.placeholder = "—";
      wrap.appendChild(inp);
      wrap.appendChild(el("span", "u", unit));
      cell.appendChild(wrap);
      return { cell: cell, input: inp };
    }
    var fKg = bigInput("GEWICHT — aktuell", state.currentKg, "KG", 40, 300, "0.5");
    var fH = bigInput("GRÖSSE", state.heightCm, "CM", 140, 220, "1");
    var fW = bigInput("TAILLE — auf Bauchnabelhöhe", state.waistCm, "CM", 50, 200, "1");
    io.appendChild(fKg.cell); io.appendChild(fH.cell); io.appendChild(fW.cell);
    s2.appendChild(io);

    function chipGroup(label, key, options, onPick) {
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
          if (onPick) onPick(o.v);
        });
        if (state[key] === o.v) b.classList.add("is-on");
        row.appendChild(b);
      });
      cell.appendChild(row);
      return cell;
    }

    var q2 = el("div", "trf-q");
    q2.appendChild(chipGroup("Aktuelle Körperform — ehrlich geschätzt", "shape", [
      { v: "adipoes", label: "DEUTLICH ÜBERGEWICHTIG" },
      { v: "kraeftig", label: "KRÄFTIG, BAUCH" },
      { v: "durchschnitt", label: "DURCHSCHNITT" },
      { v: "athletisch", label: "ATHLETISCH" },
      { v: "definiert", label: "BEREITS DEFINIERT" }
    ], recomputeProposals));
    q2.appendChild(chipGroup("Richtung", "direction", [
      { v: "cut", label: "ABNEHMEN" },
      { v: "bulk", label: "MUSKELAUFBAU" }
    ], recomputeProposals));
    s2.appendChild(q2);
    root.appendChild(s2);

    [fKg, fH, fW].forEach(function (f) {
      f.input.addEventListener("input", function () {
        state.currentKg = num(fKg.input.value);
        state.heightCm = num(fH.input.value);
        state.waistCm = num(fW.input.value);
        save();
        recomputeProposals();
      });
    });

    /* =========================================================
       SCHRITT 03 — ZWEI REALISTISCHE ZIELE (vor jedem Konto-Gate)
       ========================================================= */
    var s3 = el("section", "trf-step");
    s3.appendChild(secthead("MM / TRANSFORM · 03", "Deine zwei Ziele"));
    var goalsHint = el("p", "trf-hint",
      "MaleMetrix rechnet dir zwei ehrliche Vorschläge: <strong>Ziel A</strong> ist dein realistischer nächster Zustand, <strong>Ziel B</strong> das ambitionierte langfristige Ziel. Dein eigenes Wunschgewicht kannst du darunter frei eintragen — MaleMetrix ordnet es ehrlich ein, die Entscheidung liegt bei dir.");
    s3.appendChild(goalsHint);
    var goalsBox = el("div");
    s3.appendChild(goalsBox);

    /* Eigenes Ziel: bewusst sekundär, live validiert. Freigegebene eigene
       Ziele ersetzen Ziel B — Ziel A bleibt der Systemvorschlag. */
    var custom = el("details", "trf-custom");
    var sum = el("summary", null, "EIGENES ZIEL EINGEBEN");
    custom.appendChild(sum);
    var cBody = el("div", "trf-custom-body");
    var cRow = el("div", "trf-bigin");
    var cIn = el("input");
    cIn.type = "number"; cIn.min = "40"; cIn.max = "300"; cIn.step = "0.5"; cIn.placeholder = "—";
    cIn.setAttribute("inputmode", "decimal");
    cIn.setAttribute("aria-label", "Eigenes Zielgewicht in Kilogramm");
    cRow.appendChild(cIn); cRow.appendChild(el("span", "u", "KG"));
    cBody.appendChild(cRow);
    var cVerdict = el("p", "trf-hint"); cVerdict.style.marginTop = "10px";
    cBody.appendChild(cVerdict);
    var cUse = el("button", "btn btn-dark btn-sm", "Als Ziel B verwenden");
    cUse.type = "button"; cUse.disabled = true; cUse.style.marginTop = "6px";
    cBody.appendChild(cUse);
    custom.appendChild(cBody);
    s3.appendChild(custom);
    custom.addEventListener("toggle", function () {
      if (custom.open) once(seen, "custom", function () { track("transform_custom_target_open"); });
    });

    function baseReady() {
      return state.currentKg && state.heightCm && state.waistCm && state.shape;
    }
    /* Einordnung statt Blockade (Produktentscheidung 06.08.2026): Jedes
       Zielgewicht im technischen Rahmen (40-300 kg) ist wählbar. Die
       Zielengine liefert weiterhin die ehrliche Einordnung — als
       Information, nicht als Sperre. Die Entscheidung liegt beim Nutzer. */
    function checkCustom() {
      var t = num(cIn.value);
      cUse.disabled = true;
      if (!baseReady() || !t) { cVerdict.innerHTML = ""; return; }
      if (t < 40 || t > 300 || Math.round(t) === Math.round(state.currentKg)) {
        cVerdict.innerHTML = t < 40 || t > 300
          ? "Bitte ein Zielgewicht zwischen 40 und 300 kg."
          : "Das Ziel ist identisch mit deinem aktuellen Gewicht — das wäre kein Vorher/Nachher.";
        return;
      }
      cUse.disabled = false;
      var v = G.validateTarget({ weightKg: state.currentKg, heightCm: state.heightCm, waistCm: state.waistCm, shape: state.shape, targetKg: t });
      var badge, text;
      if (v.verdict === "plausibel") {
        badge = '<span class="trf-verdict-badge is-ok">PLAUSIBEL</span>';
        text = "Geschätzt " + v.targetBf.lo + "–" + v.targetBf.hi + " % Körperfett am Ziel.";
      } else if (v.verdict === "ambitioniert") {
        badge = '<span class="trf-verdict-badge is-amb">AMBITIONIERT</span>';
        text = "Ein mehrphasiges Langfrist-Ziel" + (v.targetBf ? " — geschätzt " + v.targetBf.lo + "–" + v.targetBf.hi + " % Körperfett am Ziel." : ".");
      } else {
        badge = '<span class="trf-verdict-badge is-no">EINORDNUNG: NICHT SERIÖS</span>';
        text = "MaleMetrix stuft dieses Ziel für deine Größe und Ausgangslage als nicht seriös ein" +
          (v.altLo && v.altHi ? " — plausibel wären ungefähr <strong>" + v.altLo + "–" + v.altHi + " kg</strong>" : "") +
          ". Die Entscheidung liegt bei dir: Generieren ist trotzdem möglich.";
        track("transform_target_blocked");
      }
      cVerdict.innerHTML = badge + " " + text;
    }
    cIn.addEventListener("input", function () {
      once(seen, "custom_changed", function () { track("transform_custom_target_changed"); });
      checkCustom();
    });
    cUse.addEventListener("click", function () {
      var t = num(cIn.value);
      if (!t) return;
      state.manualB = t;
      save();
      recomputeProposals();
    });

    function goalCard(idLabel, title, g) {
      var c = el("div", "trf-goalcard");
      c.appendChild(el("span", "gk", idLabel + " — " + title));
      var kgHtml = g.kind === "recomp"
        ? "~" + g.kg + "<small>KG · REKOMP</small>"
        : g.kg + "<small>KG</small>";
      c.appendChild(el("div", "gkg", kgHtml));
      var meta = "geschätzt " + g.bf.lo + "–" + g.bf.hi + " % Körperfett<br>" +
        (g.kind === "recomp"
          ? "gleiches Gewicht, straffere Komposition"
          : (g.deltaKg > 0 ? (g.kg < state.currentKg ? "−" : "+") + g.deltaKg + " kg · " : "") +
            "etwa " + g.weeks.lo + "–" + g.weeks.hi + " Wochen") +
        (g.phased ? "<br>mehrphasiges Ziel" : "");
      c.appendChild(el("span", "gmeta", meta));
      var why = g.kind === "recomp"
        ? "Rekomposition: Muskeln rauf, Fett runter bei ähnlichem Gewicht — der seriöse Weg für deine Ausgangslage."
        : g.kg < state.currentKg
          ? (g.phased ? "Deutlich stärkeres Ziel mit längerem Zeitraum — in Phasen geplant, nicht als Crash." : "Moderat, sichtbar relevant und in einer ersten Phase plausibel erreichbar.")
          : (g.phased ? "Langfristiger Aufbau über mehrere Phasen — Zunahme enthält ehrlich auch etwas Fett." : "Moderater Aufbau — realistisch für den nächsten Trainingsabschnitt.");
      c.appendChild(el("p", "gwhy", why));
      return c;
    }

    function recomputeProposals() {
      goalsBox.innerHTML = "";
      if (!baseReady()) {
        state.proposals = null; state.targetA = null; state.targetB = null;
        goalsBox.appendChild(el("p", "trf-hint", "Vervollständige oben Gewicht, Größe, Taille und Körperform — dann rechnet MaleMetrix deine zwei Ziele."));
        renderGate();
        return;
      }
      var p = G.proposeGoals({ weightKg: state.currentKg, heightCm: state.heightCm, waistCm: state.waistCm, shape: state.shape, direction: state.direction });
      state.proposals = p;
      // Eigenes Ziel ersetzt B — frei wählbar (nur technische Grenzen und
      // A≠B); die Engine-Einordnung ist Information, keine Sperre.
      if (state.manualB) {
        var mOk = state.manualB >= 40 && state.manualB <= 300 &&
          Math.round(state.manualB) !== Math.round(state.currentKg) &&
          G.validatePair(p.a.kg, state.manualB).ok;
        if (mOk) {
          var v = G.validateTarget({ weightKg: state.currentKg, heightCm: state.heightCm, waistCm: state.waistCm, shape: state.shape, targetKg: state.manualB });
          p.b = {
            kind: state.manualB < state.currentKg ? "cut" : "bulk",
            kg: Math.round(state.manualB),
            deltaKg: Math.round(Math.abs(state.currentKg - state.manualB)),
            bf: (v && v.targetBf) || p.b.bf,
            weeks: p.b.weeks, phased: !!(v && v.phased), manual: true
          };
        } else {
          state.manualB = null; save();
        }
      }
      state.targetA = p.a.kg; state.kindA = p.a.kind;
      state.targetB = p.b.kg; state.kindB = p.b.kind;
      save();
      once(seen, "targets", function () { track("transform_targets_computed"); });

      var estLine = el("p", "trf-hint",
        "Ausgangslage: BMI " + String(p.startBmi).replace(".", ",") + " · geschätzt " + p.est.lo + "–" + p.est.hi + " % Körperfett (Schätzbereich aus Taille, Größe und Form).");
      goalsBox.appendChild(estLine);
      if (p.note) goalsBox.appendChild(el("div", "trf-goalnote", esc(p.note)));
      var grid = el("div", "trf-goals");
      grid.appendChild(goalCard("ZIEL A", "REALISTISCHER NÄCHSTER ZUSTAND", p.a));
      grid.appendChild(goalCard("ZIEL B", p.b.manual ? "DEIN EIGENES ZIEL" : "AMBITIONIERTES LANGFRISTIGES ZIEL", p.b));
      goalsBox.appendChild(grid);
      // Neue Ziele nach einem abgeschlossenen Lauf → der Gesamtlauf wird
      // wieder angeboten (statt nur Einzel-Regeneration).
      if (actionsRow && runBtn.style.display === "none") {
        runBtn.style.display = "";
        runBtn.textContent = "Beide Ziele visualisieren";
        actionsRow.style.display = "none";
      }
      renderGate();
    }
    s3.appendChild(el("p", "trf-hint trf-plan-note",
      "Das Bild zeigt eine mögliche visuelle Richtung, keine garantierte Zukunft. Genetik, Fettverteilung, Muskelmasse, Haut, Alter, Training und Umsetzung beeinflussen das echte Ergebnis — deshalb begrenzt MaleMetrix Ziele auf physiologisch plausible Bereiche."));
    root.appendChild(s3);

    /* =========================================================
       SCHRITT 04 — KONTO-GATE (erst hier) + VISUALISIERUNG
       ========================================================= */
    var s4 = el("section", "trf-step");
    s4.appendChild(secthead("MM / TRANSFORM · 04", "Visualisieren"));
    var gate = el("div", "trf-gate");
    var runBtn = el("button", "btn btn-primary", "Beide Ziele visualisieren");
    runBtn.id = "trfRun";
    var runErr = el("p", "trf-error"); runErr.style.display = "none"; runErr.style.marginTop = "12px";
    var quotaNote = el("span", "trf-quota"); quotaNote.style.display = "none";
    var stage = el("div", "trf-stage");
    s4.appendChild(gate); s4.appendChild(runBtn); s4.appendChild(quotaNote); s4.appendChild(runErr); s4.appendChild(stage);
    root.appendChild(s4);

    function updateQuota(rem) {
      if (rem == null) return;
      quotaNote.style.display = "";
      quotaNote.classList.toggle("is-low", rem <= 1);
      quotaNote.textContent = rem > 0
        ? "NOCH " + rem + " GRATIS-VISUALISIERUNGEN AUF DEINEM KONTO"
        : "GRATIS-KONTINGENT AUFGEBRAUCHT";
    }

    /* Konto-Gate — Premium-Formulierung: die Zuordnung zum Profil ist der
       Grund, nicht unsere Kosten. Magic Link über das bestehende Konto-
       System (MM.account), keine neue Auth. */
    var accountState = "unknown";
    function readyToRun() {
      return !!(state.photo && consentOk() && state.targetA && state.targetB);
    }
    function renderGate() {
      gate.innerHTML = "";
      if (accountState === "signed_in") { runBtn.disabled = !readyToRun(); return; }
      runBtn.disabled = true;
      if (accountState === "local") {
        gate.appendChild(el("p", "trf-hint", "Auf diesem Gerät ist kein Cloud-Konto aktiv — die Generierung läuft über dein My-MaleMetrix-Konto."));
        return;
      }
      if (!readyToRun()) {
        gate.appendChild(el("p", "trf-hint", "Sobald Foto, Einwilligung und deine zwei Ziele stehen, folgt hier der letzte Schritt vor der Visualisierung."));
        return;
      }
      once(seen, "acct_gate", function () { track("transform_account_gate_view"); });
      var g = el("div", "trf-scoregate");
      g.appendChild(el("span", "gk", "MM / ACCOUNT — LETZTER SCHRITT"));
      g.appendChild(el("p", null, "Erstelle dein kostenloses MaleMetrix-Konto, damit deine Visualisierung und Zielauswahl sicher deinem Profil zugeordnet werden können. Magic Link — kein Passwort."));
      var row = el("div", "trf-login");
      var mail = el("input"); mail.type = "email"; mail.placeholder = "deine@email.de"; mail.autocomplete = "email";
      mail.setAttribute("aria-label", "E-Mail-Adresse für den Magic Link");
      var btn = el("button", "btn btn-primary btn-sm", "Magic Link senden");
      var msg = el("p", "trf-hint"); msg.style.display = "none";
      btn.addEventListener("click", function () {
        var v = (mail.value || "").trim();
        if (!/^\S+@\S+\.\S+$/.test(v)) { msg.textContent = "Bitte eine gültige E-Mail-Adresse eingeben."; msg.style.display = ""; return; }
        btn.disabled = true;
        track("transform_magic_link_requested");
        MM.account.signIn(v).then(function (r) {
          msg.textContent = r && r.message ? r.message : (r && r.ok ? "Magic Link gesendet — prüfe dein Postfach." : "Anmeldung fehlgeschlagen.");
          msg.style.display = ""; btn.disabled = false;
        });
      });
      row.appendChild(mail); row.appendChild(btn);
      g.appendChild(row); g.appendChild(msg);
      gate.appendChild(g);
    }
    if (window.MM && MM.account) {
      MM.account.onChange(function (snap) { accountState = snap.state; renderGate(); });
      MM.account.whenReady().then(function (snap) { accountState = snap.state; renderGate(); }).catch(function () { renderGate(); });
    }

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

    /* ================= KI-Kennzeichnung, Wasserzeichen, Teilen ================= */
    var AI_LABEL_DE = "KI-VISUALISIERUNG · KEIN ECHTES ZUKUNFTSFOTO";
    var AI_LABEL_EN = "AI VISUALIZATION · NOT A REAL FUTURE PHOTO";
    // Funktion statt Konstante: die Sprache kann nach dem Laden umgeschaltet
    // werden — jedes Canvas-Rendering fragt den aktuellen Stand ab.
    function AI_LABEL() { return isEn() ? AI_LABEL_EN : AI_LABEL_DE; }
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
    function drawAiLabel(x, cw, fs) {
      x.save();
      x.textBaseline = "alphabetic"; x.textAlign = "left";
      x.font = "600 " + fs + "px 'JetBrains Mono', monospace";
      var tw = x.measureText(AI_LABEL()).width;
      x.fillStyle = "rgba(7,10,15,0.72)";
      x.fillRect(0, 0, Math.min(cw, tw + fs * 1.6), fs * 2.1);
      x.fillStyle = "rgba(240,238,233,0.95)";
      x.fillText(AI_LABEL(), fs * 0.8, fs * 1.45);
      x.restore();
    }
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
        drawAiLabel(x, c.width, Math.max(11, Math.round(c.width * 0.016)));
        return c.toDataURL("image/jpeg", 0.9);
      }).catch(function () { return null; });
    }
    function buildShareCard(beforeSrc, afterSrc, curKg, targetKg) {
      return Promise.all([loadImg(beforeSrc, false), loadImg(afterSrc, /^data:/.test(afterSrc) ? false : true)]).then(function (imgs) {
        var W = 1080, H = 1350;
        var c = document.createElement("canvas");
        c.width = W; c.height = H;
        var x = c.getContext("2d");
        x.fillStyle = "#070A0F"; x.fillRect(0, 0, W, H);
        x.font = "500 26px 'JetBrains Mono', monospace";
        x.fillStyle = "#16C4F4";
        x.fillText("MM / TRANSFORM", 48, 76);
        x.fillStyle = "rgba(255,255,255,0.35)";
        x.fillText(isEn() ? "POSSIBLE TARGET VISUALIZATION" : "MÖGLICHE ZIELVISUALISIERUNG", 48, 112);
        var top = 150, bh = 980, gap = 10, bw = (W - 96 - gap) / 2;
        drawCover(x, imgs[0], 48, top, bw, bh);
        drawCover(x, imgs[1], 48 + bw + gap, top, bw, bh);
        x.strokeStyle = "rgba(255,255,255,0.14)";
        x.strokeRect(48, top, bw, bh); x.strokeRect(48 + bw + gap, top, bw, bh);
        function tag(tx, label) {
          x.font = "500 24px 'JetBrains Mono', monospace";
          var tw = x.measureText(label).width;
          x.fillStyle = "rgba(7,10,15,0.78)";
          x.fillRect(tx, top + 18, tw + 28, 44);
          x.fillStyle = "rgba(240,238,233,0.95)";
          x.fillText(label, tx + 14, top + 48);
        }
        tag(48 + 18, (isEn() ? "BEFORE" : "VORHER") + " · " + curKg + " KG");
        tag(48 + bw + gap + 18, (isEn() ? "POSSIBLE TARGET" : "MÖGLICHES ZIEL") + " · " + targetKg + " KG");
        x.font = "600 24px 'JetBrains Mono', monospace";
        x.fillStyle = "#16C4F4";
        x.fillText(AI_LABEL(), 48, top + bh + 44);
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
        var file = new File([blob], "malemetrix-zielvisualisierung.jpg", { type: "image/jpeg" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share(isEn()
            ? { files: [file], title: "My possible target visualization", text: "My possible target visualization with MaleMetrix (AI visualization) — malemetrix.com/transformation.html" }
            : { files: [file], title: "Meine mögliche Zielvisualisierung", text: "Meine mögliche Zielvisualisierung mit MaleMetrix (KI-Visualisierung) — malemetrix.com/transformation.html" }).catch(function () {});
        }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "malemetrix-zielvisualisierung.jpg";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
      }).catch(function () {
        var url = "https://www.malemetrix.com/transformation.html";
        if (navigator.share) { navigator.share({ title: "MaleMetrix Transformation", url: url }).catch(function () {}); return; }
        try { navigator.clipboard.writeText(url); btn.textContent = "Link kopiert"; } catch (e) {}
      });
    }

    function showCompare(view, beforeSrc, afterSrc) {
      view.innerHTML = "";
      view.classList.add("trf-ba");
      view.style.setProperty("--ba", "50%");
      var b = el("img"); b.src = beforeSrc; b.alt = "Vorher: dein Ausgangsfoto"; b.draggable = false;
      var a = el("img", "after"); a.src = afterSrc; a.alt = "KI-Visualisierung deines möglichen Ziels — kein echtes Zukunftsfoto"; a.draggable = false;
      view.appendChild(b); view.appendChild(a);
      view.appendChild(el("div", "trf-ba-handle"));
      view.appendChild(el("div", "trf-ba-tags", "<span>VORHER</span><span>MÖGLICHES ZIEL</span>"));
      view.appendChild(el("div", "trf-ai-tag", AI_LABEL()));
      function setPct(pct) {
        pct = Math.max(0, Math.min(100, pct));
        view.style.setProperty("--ba", pct.toFixed(1) + "%");
        range.value = String(Math.round(pct));
        range.setAttribute("aria-valuetext", Math.round(pct) + " % — links dein Ausgangsfoto, rechts die KI-Visualisierung des möglichen Ziels");
      }
      function setFrom(e) {
        var r = view.getBoundingClientRect();
        setPct(((e.clientX - r.left) / r.width) * 100);
      }
      view.addEventListener("pointerdown", function (e) {
        if (e.target === range) return;
        view.setPointerCapture(e.pointerId);
        setFrom(e);
      });
      view.addEventListener("pointermove", function (e) {
        if (e.buttons && e.target !== range) setFrom(e);
      });
      /* Echte Range-Steuerung (Phase 8.2): Tastatur + Screenreader. Der
         Regler vergleicht Ausgangsfoto und KI-Visualisierung — genau das
         sagt er auch an. */
      var range = el("input", "trf-ba-range");
      range.type = "range"; range.min = "0"; range.max = "100"; range.step = "1"; range.value = "50";
      range.setAttribute("aria-label", "Vorher-Nachher-Vergleich: dein Foto gegen die KI-Visualisierung des möglichen Ziels (kein echtes Zukunftsfoto)");
      range.addEventListener("input", function () { setPct(Number(range.value)); });
      view.appendChild(range);
      setPct(50);
    }

    /* ================= Generierung =================
       Rekomposition: die Engine kann Ziel A auf "gleiches Gewicht,
       straffer" drehen. Für das BILD braucht der Server ein Zielgewicht
       ungleich Ist — visualisiert wird eine kleine, freigegebene Abnahme
       (~3 %), die Karte sagt das ehrlich dazu. */
    function visualTargetFor(kg, kind) {
      if (kind !== "recomp") return kg;
      var t = Math.round(Math.max(G.weightAtBmi(20, state.heightCm) + 1, state.currentKg * 0.97));
      if (t >= state.currentKg) t = Math.round(state.currentKg) - 1;
      return t;
    }

    function validateRun() {
      if (!state.photo) return "Bitte zuerst ein Foto hochladen.";
      if (!consentOk()) return "Bitte bestätige zuerst alle vier Einwilligungspunkte unter deinem Foto — ohne sie wird nichts übertragen.";
      if (!baseReady()) return "Bitte vervollständige deine Ausgangslage (Gewicht, Größe, Taille, Körperform).";
      if (!state.targetA || !state.targetB) return "Deine Ziele sind noch nicht berechnet.";
      if (!G.validatePair(state.targetA, state.targetB).ok) return "Die beiden Ziele sind identisch — bitte Ausgangslage prüfen.";
      return null;
    }

    var panels = {};
    var running = false;
    var inFlight = 0;   // verhindert doppelte parallele Requests (6.3)

    function generateOne(t, kind, p, done) {
      var visualKg = visualTargetFor(t, kind);
      inFlight++;
      showScan(p.view, t);
      p.foot.innerHTML = "";
      p.foot.appendChild(el("span", "mono-note", "WIRD GENERIERT …"));
      MM.account.invokeFunction("mm-transform", {
        image: state.photo,
        current_kg: state.currentKg,
        target_kg: visualKg,
        height_cm: state.heightCm,
        waist_cm: state.waistCm,
        shape: state.shape,
        consent: true
      }).then(function (r) {
        p.foot.innerHTML = "";
        if (r && r.ok && r.data && r.data.image_url) {
          var raw = r.data.image_url;
          if (r.data.free_remaining != null) updateQuota(r.data.free_remaining);
          track(t === state.targetA ? "transform_image_a_ok" : "transform_image_b_ok");
          return watermark(raw).then(function (wm) {
            var afterSrc = wm || raw;
            state.results[t] = { url: raw, after: afterSrc };
            showCompare(p.view, state.photo, afterSrc);
            var row = el("div", "trf-foot-row");
            var pick = el("button", "btn btn-dark btn-sm", "Dieses Ziel wählen");
            pick.addEventListener("click", function () { chooseGoal(t, kind); });
            var share = el("button", "btn btn-dark btn-sm trf-share", "Teilen");
            share.addEventListener("click", function () { shareResult(t, afterSrc, share); });
            // Einzel-Regeneration (6.2): NUR dieses Ziel neu — nie
            // automatisch ein kompletter Doppellauf.
            var regen = el("button", "btn btn-dark btn-sm trf-share", "↻");
            regen.title = "Dieses Ziel neu generieren";
            regen.setAttribute("aria-label", "Dieses Ziel neu generieren");
            regen.addEventListener("click", function () {
              if (inFlight > 0) return;
              track("transform_regen_single");
              generateOne(t, kind, p, function () {});
            });
            row.appendChild(pick); row.appendChild(share); row.appendChild(regen);
            p.foot.appendChild(row);
          });
        }
        var code = (r && r.code) || "unbekannt";
        state.results[t] = { error: code };
        track("transform_generate_failed");
        showError(p.view, code);
        if (code === "free_quota_exhausted") {
          updateQuota(0);
          track("transform_quota_wall");
          var buy = el("a", "btn btn-primary btn-sm", "DAS PROTOKOLL");
          buy.href = "protokoll.html";
          buy.setAttribute("data-track", "transform_quota_cta");
          p.foot.appendChild(buy);
        } else {
          // Einzel-Retry statt Sackgasse — zählt erst bei Erfolg gegen
          // das Kontingent (Server wertet nur ok=true).
          var retry = el("button", "btn btn-dark btn-sm", "Erneut versuchen");
          retry.addEventListener("click", function () {
            if (inFlight > 0) return;
            track("transform_regen_single");
            generateOne(t, kind, p, function () {});
          });
          p.foot.appendChild(retry);
        }
      }).catch(function () {
        state.results[t] = { error: "unreachable" };
        showError(p.view, "unreachable");
        p.foot.innerHTML = "";
        var retry = el("button", "btn btn-dark btn-sm", "Erneut versuchen");
        retry.addEventListener("click", function () {
          if (inFlight > 0) return;
          generateOne(t, kind, p, function () {});
        });
        p.foot.appendChild(retry);
      }).then(function () { inFlight = Math.max(0, inFlight - 1); if (done) done(); });
    }

    runBtn.addEventListener("click", function () {
      if (running) return;
      runErr.style.display = "none";
      var v = validateRun();
      if (v) { runErr.textContent = v; runErr.style.display = ""; return; }
      running = true;
      runBtn.disabled = true;
      runBtn.textContent = "Wird generiert …";
      track("transform_generate_start");
      state.results = {}; state.chosen = null; state.chosenKind = null;
      save();
      panels = {};
      s5.style.display = "none"; s6.style.display = "none";
      stage.innerHTML = "";

      var today = panel("HEUTE — IST", state.currentKg, false);
      var im = el("img"); im.src = state.photo; im.alt = "Dein Ausgangsfoto";
      today.view.appendChild(im);
      today.foot.appendChild(el("span", "mono-note", "DEIN AUSGANGSPUNKT"));
      stage.appendChild(today.root);

      var jobs = [
        { t: state.targetA, kind: state.kindA, label: "ZIEL A — " + (state.kindA === "recomp" ? "REKOMP" : (state.targetA < state.currentKg ? "−" : "+") + Math.round(Math.abs(state.currentKg - state.targetA)) + " KG") },
        { t: state.targetB, kind: state.kindB, label: "ZIEL B — " + (state.targetB < state.currentKg ? "−" : "+") + Math.round(Math.abs(state.currentKg - state.targetB)) + " KG" }
      ];
      var done = 0;
      jobs.forEach(function (job) {
        var p = panel(job.label, job.t, true);
        panels[job.t] = p;
        stage.appendChild(p.root);
        generateOne(job.t, job.kind, p, function () {
          done++;
          if (done === jobs.length) {
            running = false;
            // Kein globaler „Erneut visualisieren"-Doppellauf mehr (6.2):
            // Neu generieren geht pro Ziel im Panel; hier bleiben die
            // beiden ehrlichen Wege — anderes Foto oder andere Ziele.
            runBtn.style.display = "none";
            actionsRow.style.display = "";
          }
        });
      });
    });

    var actionsRow = el("div", "trf-foot-row");
    actionsRow.style.display = "none";
    actionsRow.style.marginTop = "14px";
    var actPhoto = el("button", "btn btn-dark btn-sm", "Anderes Foto verwenden");
    actPhoto.addEventListener("click", function () {
      try { s1.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
      fileIn.click();
    });
    var actGoals = el("button", "btn btn-dark btn-sm", "Ziele neu berechnen");
    actGoals.addEventListener("click", function () {
      try { s2.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
    });
    actionsRow.appendChild(actPhoto); actionsRow.appendChild(actGoals);
    s4.insertBefore(actionsRow, quotaNote);

    // Neues Foto oder neue Ausgangslage → der Gesamtlauf wird wieder möglich.
    fileIn.addEventListener("change", function () {
      runBtn.style.display = "";
      runBtn.textContent = "Beide Ziele visualisieren";
      actionsRow.style.display = "none";
    });

    /* =========================================================
       SCHRITT 05 — PLANFRAGEN (erst NACH der Zielwahl; jede Frage
       verändert den Plan nachweislich — keine Dekofragen)
       ========================================================= */
    var s5 = el("section", "trf-step");
    s5.id = "trfPlanQ";
    s5.style.display = "none";
    root.appendChild(s5);

    var s6 = el("section", "trf-step");
    s6.id = "trfPlanSec";
    s6.style.display = "none";
    root.appendChild(s6);

    function chooseGoal(targetKg, kind) {
      state.chosen = targetKg;
      state.chosenKind = kind || null;
      save();
      track("transform_goal_selected");
      try {
        MM.store.set("transform_goal", {
          date: new Date().toISOString(),
          current_kg: state.currentKg, target_kg: targetKg,
          height_cm: state.heightCm, waist_cm: state.waistCm, shape: state.shape,
          kind: kind || null, direction: state.direction,
          months: state.months, exp: state.exp, days: state.days,
          mode: state.mode, equip: state.equip
        });
      } catch (e) {}
      Object.keys(panels).forEach(function (k) {
        panels[k].root.classList.toggle("is-chosen", Number(k) === Number(targetKg));
      });
      renderPlanQuestions();
      s5.style.display = "";
      s6.style.display = "none";
      try { s5.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { location.hash = "#trfPlanQ"; }
    }

    function renderPlanQuestions() {
      once(seen, "planq", function () { track("transform_plan_questions_start"); });
      s5.innerHTML = "";
      s5.appendChild(secthead("MM / TRANSFORM · 05", "Dein Weg zu " + state.chosen + " kg"));
      s5.appendChild(el("p", "trf-hint",
        "Sieben Fragen — jede verändert deinen Plan: Zeitraum steuert die Kalorien, Alter und Aktivität den Verbrauch, Erfahrung die Progression, Tage den Split, Equipment die Übungen, Ernährungsstil die Beispiele, Natural/Enhanced die Raten und das Monitoring."));

      var q = el("div", "trf-q");
      q.appendChild(chipGroup("Zeitraum — bis wann?", "months", [
        { v: 3, label: "3 MONATE" }, { v: 6, label: "6 MONATE" }, { v: 12, label: "12 MONATE" }, { v: null, label: "OFFEN" }
      ]));
      q.appendChild(chipGroup("Trainingserfahrung", "exp", [
        { v: "neu", label: "< 1 JAHR" }, { v: "mid", label: "1-4 JAHRE" }, { v: "pro", label: "4+ JAHRE" }
      ]));
      q.appendChild(chipGroup("Trainingstage pro Woche", "days", [
        { v: 2, label: "2" }, { v: 3, label: "3" }, { v: 4, label: "4" }, { v: 5, label: "5" }, { v: 6, label: "6" }
      ]));
      q.appendChild(chipGroup("Equipment", "equip", [
        { v: "gym", label: "GYM" }, { v: "home", label: "ZUHAUSE / KURZHANTELN" }
      ]));
      q.appendChild(chipGroup("Ernährungsstil", "diet", [
        { v: "misch", label: "MISCHKOST" }, { v: "veggie", label: "VEGETARISCH" }
      ]));
      q.appendChild(chipGroup("Status", "mode", [
        { v: "natural", label: "NATURAL" }, { v: "enhanced", label: "ENHANCED" }
      ]));
      s5.appendChild(q);

      // Alter + Aktivität: Pflicht für die Kalorienrechnung — KEIN stiller
      // Fallback (Phase 7). Ohne Alter keine Planberechnung.
      var meta = el("div", "trf-meta");
      var ageWrap = el("label");
      ageWrap.innerHTML = "<span>Alter (Pflicht)</span>";
      var ageIn = el("input");
      ageIn.type = "number"; ageIn.min = "18"; ageIn.max = "90"; ageIn.step = "1";
      ageIn.setAttribute("inputmode", "numeric");
      ageIn.value = state.age != null ? state.age : "";
      ageIn.addEventListener("input", function () { state.age = num(ageIn.value); save(); });
      ageWrap.appendChild(ageIn);
      var actWrap = el("label");
      actWrap.innerHTML = "<span>Alltags-Aktivität</span>";
      var actSel = el("select");
      [["sitzend", "überwiegend sitzend"], ["leicht", "leicht aktiv (1-3× Sport/Woche)"],
       ["moderat", "moderat aktiv (3-5× Sport/Woche)"], ["hoch", "sehr aktiv (6-7× Sport/Woche)"]].forEach(function (o) {
        var opt = el("option"); opt.value = o[0]; opt.textContent = o[1];
        if (state.activity === o[0]) opt.selected = true;
        actSel.appendChild(opt);
      });
      actSel.addEventListener("change", function () { state.activity = actSel.value; save(); });
      actWrap.appendChild(actSel);
      meta.appendChild(ageWrap); meta.appendChild(actWrap);
      s5.appendChild(meta);

      var goErr = el("p", "trf-error"); goErr.style.display = "none"; goErr.style.marginTop = "12px";
      var goBtn = el("button", "btn btn-primary", "Zur Planvorschau");
      goBtn.style.marginTop = "18px";
      goBtn.addEventListener("click", function () {
        goErr.style.display = "none";
        if (!state.age || state.age < 18 || state.age > 90) {
          goErr.textContent = "Bitte gib dein Alter an (18-90) — ohne Alter ist keine seriöse Kalorienrechnung möglich, und wir rechnen nicht mit erfundenen Werten.";
          goErr.style.display = "";
          return;
        }
        renderPlans();
        s6.style.display = "";
        try { s6.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { location.hash = "#trfPlanSec"; }
      });
      s5.appendChild(goBtn);
      s5.appendChild(goErr);
    }

    /* =========================================================
       SCHRITT 06 — PLAN (deterministisch; Mifflin-St-Jeor)
       ========================================================= */
    var ACTIVITY = {
      sitzend: { f: 1.2, label: "überwiegend sitzend" },
      leicht: { f: 1.375, label: "leicht aktiv (1-3× Sport/Woche)" },
      moderat: { f: 1.55, label: "moderat aktiv (3-5× Sport/Woche)" },
      hoch: { f: 1.725, label: "sehr aktiv (6-7× Sport/Woche)" }
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

      /* Phase 7.2: Kleine Ziele über lange Zeiträume werden NICHT mehr in
         einen künstlich aggressiven Dauer-Cut gezwungen (früher: mindestens
         0,25 kg/Woche + 300 kcal Defizit). Ist die nötige Rate sehr niedrig,
         plant das System eine KURZE moderate aktive Phase und danach
         Erhaltung/Stabilisierung bis zum Zieldatum. */
      var verdict, usedRate, wishWeeks = null, neededRate = null, maintWeeks = 0;
      if (st.months) {
        wishWeeks = Math.round(st.months * 4.345);
        neededRate = delta / wishWeeks;
        if (cut && neededRate < 0.15) {
          verdict = "phased_small";
          usedRate = Math.min(maxRate, Math.max(0.3, cur * 0.004));
        } else if (neededRate <= maxRate * 0.85) { verdict = "ok"; usedRate = neededRate; }
        else if (neededRate <= maxRate) { verdict = "tight"; usedRate = neededRate; }
        else { verdict = "unreal"; usedRate = maxRate; }
      } else {
        verdict = "open";
        usedRate = cut ? Math.min(maxRate, Math.max(0.3, cur * 0.006)) : maxRate * 0.8;
      }
      usedRate = Math.max(usedRate, 0.05);   // reiner Divisionsschutz, kein Plan-Minimum

      var kcalDelta = Math.round(usedRate * 7700 / 7);
      var kcal;
      if (cut) {
        // Deckel bleibt (Muskelschutz); ein Zwangs-Minimum gibt es nicht mehr —
        // die aktive Phase rechnet ohnehin mit einer messbaren Rate.
        kcalDelta = Math.min(kcalDelta, enh ? 900 : 700);
        kcal = Math.max(tdee - kcalDelta, 1500);
      } else {
        kcalDelta = Math.min(Math.max(kcalDelta, 150), 500);
        kcal = tdee + kcalDelta;
      }
      var realWeeks = Math.max(1, Math.ceil(delta / usedRate));
      var bestWeeks = Math.max(1, Math.ceil(delta / maxRate));
      if (verdict === "phased_small" && wishWeeks) maintWeeks = Math.max(0, wishWeeks - realWeeks);

      var protein = Math.round((cut ? 2.2 : (enh ? 2.2 : 2.0)) * t);
      var fett = Math.max(60, Math.round(1.0 * t));
      var carbs = Math.max(50, Math.round((kcal - protein * 4 - fett * 9) / 4));
      return {
        cut: cut, delta: delta, enh: enh, bmr: bmr, tdee: tdee,
        kcal: kcal, kcalDelta: kcalDelta, protein: protein, fett: fett, carbs: carbs,
        verdict: verdict, usedRate: usedRate, neededRate: neededRate,
        wishWeeks: wishWeeks, realWeeks: realWeeks, bestWeeks: bestWeeks,
        maintWeeks: maintWeeks
      };
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
      } else if (p.verdict === "phased_small") {
        cls = "is-ok"; label = "KLEINES ZIEL — PHASEN STATT DAUERDEFIZIT";
        text = "<strong>" + p.delta + " kg in " + months + " Monaten</strong> braucht kein monatelanges Defizit. Der Plan fährt eine <strong>kurze aktive Phase von ~" + p.realWeeks + " Wochen</strong> (" + rate + " kg/Woche, moderates Defizit) und danach <strong>~" + p.maintWeeks + " Wochen Erhaltung/Stabilisierung</strong> — das Ziel hält so auch nach dem Zieldatum.";
      } else {
        cls = "is-open"; label = "OHNE DATUM — NACHHALTIG";
        text = "Kein Zieldatum gewählt: Der Plan fährt eine nachhaltige Rate von " + rate + " kg/Woche. Realistischer Zeitrahmen für " + p.delta + " kg: <strong>" + p.realWeeks + " Wochen</strong> (schnellste seriöse Variante: " + p.bestWeeks + ").";
      }
      var v = el("div", "trf-verdict " + cls);
      v.appendChild(el("span", "vk", label));
      v.appendChild(el("span", "vt", text));
      return v;
    }

    /* Sticky-Leiste (Monetarisierung) — nach der Zielwahl, nie für Kunden. */
    var stickyEl = null, stickyDismissed = false;
    function removeSticky() {
      if (stickyEl && stickyEl.parentNode) stickyEl.parentNode.removeChild(stickyEl);
      stickyEl = null;
    }
    function renderSticky(t, p, phase1, price) {
      removeSticky();
      if (stickyDismissed) return;
      stickyEl = el("div", "trf-sticky");
      stickyEl.appendChild(el("span", "sk", (phase1
        ? "PHASE 1: 12 WOCHEN BIS " + phase1.lo + "–" + phase1.hi + " KG"
        : "DEIN ZIEL: " + t + " KG IN ~" + p.realWeeks + " WOCHEN") +
        " — <strong>DAS PROTOKOLL · " + (price || 99) + " €</strong>"));
      var go = el("a", "btn btn-primary btn-sm", "Plan freischalten");
      go.href = "protokoll.html";
      go.setAttribute("data-track", "transform_sticky_cta");
      var x = el("button", "close", "×");
      x.type = "button";
      x.setAttribute("aria-label", "Leiste schließen");
      x.addEventListener("click", function () { stickyDismissed = true; removeSticky(); });
      stickyEl.appendChild(go); stickyEl.appendChild(x);
      document.body.appendChild(stickyEl);
    }

    function renderPlans() {
      once(seen, "preview", function () { track("transform_plan_preview_view"); });
      var t = state.chosen;
      var p = calcPlan(state, t);
      s6.innerHTML = "";
      s6.appendChild(secthead("MM / PROTOCOL · 06", "Dein Plan für " + t + " kg"));
      s6.appendChild(el("p", "trf-hint",
        "Gerechnet aus deinen Antworten: " + state.currentKg + " kg → " + t + " kg · " +
        (state.months ? state.months + " Monate" : "ohne Zieldatum") + " · " + state.days + " Trainingstage · " +
        (state.exp === "neu" ? "unter 1 Jahr Erfahrung" : state.exp === "pro" ? "4+ Jahre Erfahrung" : "1-4 Jahre Erfahrung") + " · " +
        (p.enh ? "enhanced" : "natural") + " · " + (state.equip === "home" ? "zuhause/Kurzhanteln" : "Gym") + " · " +
        state.heightCm + " cm · " + state.age + " Jahre · " + esc((ACTIVITY[state.activity] || ACTIVITY.moderat).label) +
        ". Grundumsatz (Mifflin-St-Jeor): " + p.bmr + " kcal · Erhaltungsbedarf: ca. " + p.tdee + " kcal."));

      s6.appendChild(verdictBlock(p, state.months));

      // Score-Kalibrierung (falls vorhanden — kein Gate, nur Mehrwert).
      var scoreRes = null;
      try {
        scoreRes = (window.MM && MM.account && MM.account.getLatestScoreResult)
          ? MM.account.getLatestScoreResult()
          : (window.MM && MM.store ? MM.store.get("check_result", null) : null);
      } catch (e) {}
      if (scoreRes && scoreRes.bottleneck && scoreRes.bottleneck.name) {
        var sb = el("div", "trf-verdict is-open");
        sb.appendChild(el("span", "vk", "DEIN SCORE" +
          (typeof scoreRes.total === "number" ? " " + scoreRes.total + "/100" : "") +
          " — ENGPASS: " + esc(String(scoreRes.bottleneck.name)).toUpperCase()));
        sb.appendChild(el("span", "vt",
          esc(String(scoreRes.bottleneck.text || "")) +
          " <strong>Dein Plan rechnet diesen Engpass mit ein.</strong>"));
        s6.appendChild(sb);
      }

      /* --- KOSTENLOSE VORSCHAU (Phase 5.1): die Landkarte, nicht das
         Fahrzeug. Zielkalorien, Protein, Frequenz, Schrittziel, drei erste
         Maßnahmen und Woche-1-Skizze sind gratis — kompletter Split,
         Mahlzeitenstruktur, Progressions-/Anpassungslogik und Supplementplan
         gehören in DAS PROTOKOLL bzw. My MaleMetrix. --- */
      var mrow = el("div", "mm-metric-row trf-plan-metrics");
      function metric(v, unit, k, cls) {
        var m = el("div", "mm-metric" + (cls ? " " + cls : ""));
        m.appendChild(el("span", "v", v + (unit ? "<small>&nbsp;" + unit + "</small>" : "")));
        m.appendChild(el("span", "k", k));
        return m;
      }
      var stepsGoal = p.cut ? "8-10K" : "7K+";
      mrow.appendChild(metric(p.kcal, "KCAL", "Zielkalorien pro Tag (" + (p.cut ? "−" : "+") + p.kcalDelta + " zum Erhalt)"));
      mrow.appendChild(metric(p.protein, "G", "Protein — nicht verhandelbar", "is-up"));
      mrow.appendChild(metric(state.days + "×", "", "Kraft pro Woche"));
      mrow.appendChild(metric(stepsGoal, "", "Schritte täglich"));
      mrow.appendChild(metric(p.usedRate.toFixed(2).replace(".", ","), "KG/WO", (p.cut ? "Abnahme" : "Aufbau") + "-Rate"));
      mrow.appendChild(metric(p.realWeeks, "WO", "bis " + t + " kg, ehrlich"));
      s6.appendChild(mrow);

      var veggie = state.diet === "veggie";
      var splitName = state.days <= 3
        ? (state.equip === "home" ? "Ganzkörper A/B mit Kurzhanteln" : "Ganzkörper A/B")
        : state.days === 4 ? "Oberkörper/Unterkörper" : state.days === 5 ? "Push/Pull/Legs + OK/UK" : "Push/Pull/Legs ×2";

      var colM = el("div", "trf-plan-col");
      colM.appendChild(el("h3", null, "Deine ersten 3 Maßnahmen"));
      colM.appendChild(rows([
        ["1 · PROTEIN", "<strong>" + p.protein + " g täglich</strong> ab morgen — " +
          (veggie ? "vegetarisch heißt: je Mahlzeit eine konkrete Quelle (Quark, Eier, Tofu, Tempeh, Whey)" : "verteilt auf 3-4 Mahlzeiten mit je einer klaren Proteinquelle") + "."],
        ["2 · TRAINING", "<strong>" + state.days + "× " + splitName + "</strong> fest in den Kalender — " +
          (state.equip === "home" ? "zuhause mit Kurzhanteln machbar" : "im Gym") + ", Termin wie ein Meeting."],
        ["3 · MESSEN", "Täglich morgens wiegen, " + (p.cut ? "<strong>" + stepsGoal + " Schritte</strong> täglich, " : "") +
          "gewertet wird nur der <strong>Wochenschnitt</strong> — Einzeltage lügen."]
      ]));
      s6.appendChild(colM);

      var colW = el("div", "trf-plan-col");
      colW.appendChild(el("h3", null, "Woche 1 — Vorschau"));
      colW.appendChild(rows([
        ["TAG 1", "Einkauf nach Proteinliste + erstes Training (" + splitName.split(" ")[0] + " A) + Startgewicht notieren"],
        ["TAG 2-6", state.days + " Trainingseinheiten im Wechsel" + (p.cut ? ", täglich " + stepsGoal + " Schritte" : ", Fokus saubere Technik") + ", jeden Morgen wiegen"],
        ["TAG 7", "Wochenschnitt bilden — er ist deine einzige Zahl, die zählt. Ab Woche 2 übernimmt die Progressionslogik."]
      ]));
      s6.appendChild(colW);

      if (p.enh) {
        var enhNote = el("div", "trf-verdict is-tight");
        enhNote.appendChild(el("span", "vk", "ENHANCED — SICHERHEIT ZUERST"));
        enhNote.appendChild(el("span", "vt", "Vor dem Start: <strong>Basis-Blutbild</strong> (großes Blutbild, Lipide, Leberwerte, Hämatokrit, Testosteron/E2) + Blutdruck, danach alle 8-12 Wochen mit ärztlicher Begleitung. Keine Substanz- oder Dosierungsempfehlungen auf dieser Seite — Einordnung liefert die <a href=\"anabole-matrix.html\">Anabole Matrix</a>."));
        s6.appendChild(enhNote);
      }

      /* --- Was DAS PROTOKOLL zusätzlich freischaltet (ehrlich benannt) --- */
      var locked = el("div", "trf-locked");
      locked.appendChild(el("span", "lk", "IM VOLLSTÄNDIGEN PLAN — DAS PROTOKOLL"));
      var lockedList = el("ul", null,
        "<li>Kompletter <strong>Trainingssplit</strong> mit allen Übungen, Sätzen und Wiederholungen</li>" +
        "<li>Vollständige <strong>Mahlzeitenstruktur</strong> für deine " + p.kcal + " kcal / " + p.protein + " g Protein</li>" +
        "<li><strong>Progressionsregeln</strong> Woche für Woche + komplette Wochenplanung</li>" +
        "<li><strong>Supplementplan</strong> mit Dosierung und Timing</li>" +
        "<li>Mehrmonatige <strong>Anpassungslogik</strong>: Plateau-, Diätpausen- und Eskalationsregeln</li>" +
        "<li><strong>Tracker + Wochenreviews</strong> in My MaleMetrix — dein Plan reagiert auf echte Daten</li>");
      locked.appendChild(lockedList);
      s6.appendChild(locked);

      /* --- Phase-1-Logik (5.4): DAS PROTOKOLL ist ein 12-Wochen-System.
         Dauert das Gesamtziel länger, wird ehrlich ein Zwischenziel für
         die ersten 12 Wochen gerechnet — kein „alles in 12 Wochen". --- */
      var phase1 = null;
      if (p.realWeeks > 12) {
        var p1mid = p.cut ? state.currentKg - p.usedRate * 12 : state.currentKg + p.usedRate * 12;
        phase1 = { lo: Math.round(p1mid - 1), hi: Math.round(p1mid + 1) };
        if (p.cut && phase1.lo < t) phase1.lo = t;
        if (!p.cut && phase1.hi > t) phase1.hi = t;
      }
      // Preis aus der bestehenden Quelle der Wahrheit (shop-data), kein
      // zweiter hartcodierter Preis.
      var protoPrice = 99;
      try {
        var prod = (window.MM_PRODUCTS || []).filter(function (x) { return x.id === "protokoll"; })[0];
        if (prod && prod.price) protoPrice = Math.round(prod.price);
      } catch (e) {}

      var access = {};
      try { if (window.MM && MM.account && MM.account.getDashboardState) access = MM.account.getDashboardState().access || {}; } catch (e) {}
      var isCustomer = !!(access.protocol || access.twelve_week || access.coaching);

      if (isCustomer) {
        /* --- Protokoll-Besitzer (5.3): kein erneuter Verkauf — Ziel
           nachvollziehbar in My MaleMetrix übernehmen. Die Roadmap-Ansicht
           (#transform) liest mm_transform_goal und füllt sich vor. --- */
        var cta = el("div", "trf-cta");
        cta.appendChild(el("span", "ck", "MM / NEXT"));
        cta.appendChild(el("h3", "ct", "Dein Ziel gehört ins System."));
        cta.appendChild(el("p", "cp", "Du hast DAS PROTOKOLL. Übernimm dein Ziel <strong>" + t + " kg</strong> (" +
          (state.months ? state.months + " Monate" : "~" + p.realWeeks + " Wochen") + ", " + p.kcal + " kcal, " + p.protein + " g Protein, " + state.days + "× Training) in My MaleMetrix — Roadmap, Tracker und Wochenreviews arbeiten dann genau darauf hin."));
        var adoptMsg = el("p", "cp"); adoptMsg.style.display = "none";
        var goApp = el("a", "btn btn-primary", "Ziel in My MaleMetrix übernehmen");
        goApp.href = "mein-protokoll.html#transform";
        goApp.addEventListener("click", function () {
          track("transform_goal_adopted");
          adoptMsg.innerHTML = "<strong>Ziel übernommen ✓</strong> — die Roadmap in My MaleMetrix ist mit deinen Werten vorbereitet.";
          adoptMsg.style.display = "";
        });
        cta.appendChild(goApp);
        cta.appendChild(adoptMsg);
        s6.appendChild(cta);
        removeSticky();
      } else {
        /* --- Personalisierter Verkaufsblock (5.2): der CTA verkauft DEIN
           Ziel, nicht ein allgemeines Produkt. --- */
        var reco = (p.enh || p.verdict === "unreal") ? "coaching" : "protokoll";
        var intro = el("div", "trf-cta");
        intro.appendChild(el("span", "ck", "MM / NEXT — DEIN ZIEL: " + t + " KG IN ~" + p.realWeeks + " WOCHEN"));
        intro.appendChild(el("h3", "ct", phase1
          ? "Starte Phase 1: deine ersten 12 Wochen."
          : "Starte jetzt: dein 12-Wochen-Plan."));
        intro.appendChild(el("p", "cp",
          (phase1
            ? "Dein Gesamtziel: <strong>" + t + " kg in ehrlich ~" + p.realWeeks + " Wochen</strong>. Phase 1 bringt dich in 12 Wochen auf <strong>" + phase1.lo + "–" + phase1.hi + " kg</strong> — mit vollständigem Trainingsplan, Ernährungssystem, Tracker, Wochenreviews und automatischen Anpassungen. Die nächste Phase baut auf deinem echten Fortschritt auf."
            : "Dein Ziel: <strong>" + t + " kg in ~" + p.realWeeks + " Wochen</strong> — komplett innerhalb eines 12-Wochen-Durchlaufs. Vollständiger Trainingsplan, Ernährungssystem, Tracker, Wochenreviews und automatische Anpassungen.") +
          " <strong>" + protoPrice + " €, einmalig, kein Abo.</strong>"));
        var unlock = el("a", "btn btn-primary", "Meinen 12-Wochen-Plan freischalten");
        unlock.href = "protokoll.html";
        unlock.setAttribute("data-track", "transform_cta_unlock");
        intro.appendChild(unlock);
        var alt = el("a", "btn btn-ghost btn-sm", "DAS PROTOKOLL ansehen");
        alt.href = "protokoll.html";
        alt.style.marginLeft = "10px";
        alt.setAttribute("data-track", "transform_offer_protokoll");
        intro.appendChild(alt);

        /* Sekundäre Wege — Circle und Coaching, ohne den Haupt-CTA zu verwässern. */
        var offers = el("div", "trf-offers");
        function offer(key, name, price, desc, btnLabel, href, trackId) {
          var o = el("div", "trf-offer" + (reco === key ? " is-reco" : ""));
          if (reco === key) o.appendChild(el("span", "badge", "FÜR DEIN ZIEL EMPFOHLEN"));
          o.appendChild(el("h4", "on", name));
          o.appendChild(el("span", "op", price));
          o.appendChild(el("p", "od", desc));
          var b = el("a", "btn btn-dark", btnLabel);
          b.href = href;
          b.setAttribute("data-track", trackId);
          o.appendChild(b);
          return o;
        }
        var circlePrice = 15;
        try { circlePrice = (window.MM_CONFIG && MM_CONFIG.circle && MM_CONFIG.circle.priceMonthly) || circlePrice; } catch (e) {}
        offers.appendChild(offer("circle", "MALEMETRIX CIRCLE", circlePrice + " € / MONAT · JEDERZEIT KÜNDBAR",
          "Accountability schlägt Motivation: Männer mit demselben Ziel, wöchentliche Check-ins, direkte Antworten. <strong>" + p.realWeeks + " Wochen sind lang, wenn niemand hinschaut.</strong>",
          "In den Circle", "circle.html", "transform_offer_circle"));
        offers.appendChild(offer("coaching", "1:1 COACHING", "199 € / MONAT · MONATLICH KÜNDBAR",
          "Der schnellste Weg: <strong>persönliche 1:1-Betreuung</strong> — Plan, Anpassung und Kontrolle jede Woche, bis " + t + " kg erreicht sind." + (p.enh ? " Gerade enhanced gehört Monitoring in erfahrene Hände." : "") + " <strong>Erstgespräch kostenlos.</strong>",
          "Erstgespräch buchen — kostenlos", "coaching.html", "transform_offer_coaching"));
        intro.appendChild(offers);
        s6.appendChild(intro);
        track("transform_offers_view");
        renderSticky(t, p, phase1, protoPrice);
      }

      s6.appendChild(el("p", "trf-hint trf-plan-note",
        "Kein medizinischer Rat: Bei Vorerkrankungen, Medikamenten oder einem Ziel unter BMI 20 zuerst ärztlich abklären. " +
        "Die generierten Bilder sind eine KI-Visualisierung, kein Versprechen — dein echtes Ergebnis entsteht aus " + p.realWeeks + " Wochen Umsetzung."));
    }

    /* ================= Initialzustand ================= */
    recomputeProposals();
    renderGate();
    // Gespeicherte Zielwahl wiederherstellen (ohne Bilder — die leben je Sitzung).
    if (state.chosen && state.currentKg && state.heightCm) {
      renderPlanQuestions();
      s5.style.display = "";
      if (state.age) { renderPlans(); s6.style.display = ""; }
    }
  }

  /* Boot: auf die Zielengine warten (ES-Modul lädt nach klassischen
     Skripten). Ohne Engine gibt es nach 5 s eine ehrliche Meldung statt
     einer halb funktionierenden Seite. */
  function tryBoot() {
    if (window.MMTransformGoals) { boot(window.MMTransformGoals); return true; }
    return false;
  }
  if (!tryBoot()) {
    var booted = false;
    window.addEventListener("mm:goals-ready", function () { if (!booted) { booted = tryBoot(); } }, { once: true });
    setTimeout(function () {
      if (!booted && !window.MMTransformGoals) {
        root.innerHTML = '<p class="trf-error">Die Zielberechnung konnte nicht geladen werden — bitte Seite neu laden oder Browser aktualisieren.</p>';
      } else if (!booted) {
        booted = tryBoot();
      }
    }, 5000);
  }
})();
