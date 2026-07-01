/* ==========================================================================
   MaleMetrix — Dinner-Planer ("Was geht heute Abend noch?")
   Denkt vorwärts: Tagesbudget − heute gegessen = Rest → konkrete Vorschläge
   in drei Wegen (kochen / liefern / auswärts). Alles clientseitig, pro Tag
   im Browser gespeichert. Nährwerte sind Alltags-Schätzungen.
   ========================================================================== */
(function () {
  "use strict";
  if (!document.getElementById("dpRemain")) return;

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  var LOGKEY = "mm_dp_log_" + todayKey();

  /* ---- Schnell-Presets (Tages-Mahlzeiten, Schätzwerte) ---- */
  var PRESETS = [
    { name: "Haferbrei", kcal: 350, protein: 15 },
    { name: "Rührei + Brot", kcal: 400, protein: 28 },
    { name: "Skyr + Beeren", kcal: 200, protein: 20 },
    { name: "Protein-Shake", kcal: 180, protein: 30 },
    { name: "Kaffee + Croissant", kcal: 300, protein: 6 },
    { name: "Wrap vom Bäcker", kcal: 450, protein: 20 },
    { name: "Hähnchen-Reis-Bowl", kcal: 550, protein: 45 },
    { name: "Salat mit Hähnchen", kcal: 400, protein: 40 },
    { name: "Pasta-Gericht", kcal: 600, protein: 22 },
    { name: "Döner", kcal: 700, protein: 40 },
    { name: "Pizza (halbe)", kcal: 500, protein: 20 },
    { name: "Snack / Riegel", kcal: 250, protein: 10 }
  ];

  /* ---- Dinner-Vorschläge (Abend), drei Wege ---- */
  var DINNERS = [
    // Selbst kochen
    { c: "kochen", name: "Magerquark-Bowl mit Beeren", kcal: 350, protein: 45 },
    { c: "kochen", name: "Putenpfanne mit Gemüse", kcal: 480, protein: 48 },
    { c: "kochen", name: "Thunfisch-Salat", kcal: 380, protein: 40 },
    { c: "kochen", name: "Hähnchen, Reis & Brokkoli", kcal: 550, protein: 50 },
    { c: "kochen", name: "Rührei mit Vollkornbrot", kcal: 420, protein: 32 },
    { c: "kochen", name: "Omelette mit Käse & Salat", kcal: 450, protein: 35 },
    { c: "kochen", name: "Lachs mit Ofenkartoffeln", kcal: 600, protein: 42 },
    { c: "kochen", name: "Chili con Carne", kcal: 620, protein: 40 },
    // Liefern lassen
    { c: "liefern", name: "Poke Bowl (Lachs)", kcal: 520, protein: 38 },
    { c: "liefern", name: "Chicken Pad Thai", kcal: 580, protein: 35 },
    { c: "liefern", name: "Sushi (10 Stück)", kcal: 480, protein: 28 },
    { c: "liefern", name: "Burrito Bowl", kcal: 600, protein: 40 },
    { c: "liefern", name: "Chicken Tikka + Reis", kcal: 650, protein: 45 },
    { c: "liefern", name: "Pizza Margherita (halbe)", kcal: 500, protein: 22 },
    { c: "liefern", name: "Döner-Teller", kcal: 700, protein: 50 },
    // Auswärts essen
    { c: "auswaerts", name: "Caesar Salad mit Hähnchen", kcal: 480, protein: 40 },
    { c: "auswaerts", name: "Asia-Wok Hähnchen & Gemüse", kcal: 500, protein: 42 },
    { c: "auswaerts", name: "Sushi-Menü", kcal: 520, protein: 30 },
    { c: "auswaerts", name: "Steak mit Salat", kcal: 550, protein: 55 },
    { c: "auswaerts", name: "Burger (ohne Pommes)", kcal: 620, protein: 38 },
    { c: "auswaerts", name: "Griechischer Gyros-Teller", kcal: 680, protein: 50 }
  ];
  var CATS = [
    { id: "kochen", icon: "🍳", label: "Selbst kochen" },
    { id: "liefern", icon: "🛵", label: "Liefern lassen" },
    { id: "auswaerts", icon: "📍", label: "Auswärts essen" }
  ];

  var kcalIn = document.getElementById("dpKcal");
  var protIn = document.getElementById("dpProt");
  var addName = document.getElementById("dpName");
  var addKcal = document.getElementById("dpAddKcal");
  var addProt = document.getElementById("dpAddProt");
  var activeCat = "kochen";
  var log = readLog();

  function readLog() { try { return JSON.parse(LS.get(LOGKEY, "[]")) || []; } catch (e) { return []; } }
  function saveLog() { LS.set(LOGKEY, JSON.stringify(log)); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---- Budget-Felder ---- */
  kcalIn.value = LS.get("mm_dp_kcal", "");
  protIn.value = LS.get("mm_dp_prot", "");
  kcalIn.addEventListener("input", function () { LS.set("mm_dp_kcal", kcalIn.value); renderRemain(); });
  protIn.addEventListener("input", function () { LS.set("mm_dp_prot", protIn.value); renderRemain(); });

  /* ---- Presets ---- */
  var presetsBox = document.getElementById("dpPresets");
  presetsBox.innerHTML = PRESETS.map(function (p, i) {
    return '<button class="btn btn-dark btn-sm" data-preset="' + i + '" style="font-weight:500">' +
      esc(p.name) + ' <span style="color:var(--muted-2)">· ' + p.kcal + '</span></button>';
  }).join("");
  presetsBox.querySelectorAll("[data-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      var p = PRESETS[+b.dataset.preset];
      log.push({ name: p.name, kcal: p.kcal, protein: p.protein }); saveLog(); renderAll();
    });
  });

  /* ---- Eigenes Gericht ---- */
  document.getElementById("dpAdd").addEventListener("click", addCustom);
  [addName, addKcal, addProt].forEach(function (el) {
    el.addEventListener("keydown", function (e) { if (e.key === "Enter") addCustom(); });
  });
  function addCustom() {
    var kc = parseInt(addKcal.value, 10);
    if (!kc || kc <= 0) { if (window.MM && MM.toast) MM.toast("Bitte kcal eintragen"); addKcal.focus(); return; }
    log.push({ name: (addName.value || "Eigenes Gericht").trim(), kcal: kc, protein: parseInt(addProt.value, 10) || 0 });
    saveLog();
    addName.value = ""; addKcal.value = ""; addProt.value = "";
    renderAll();
  }

  /* ---- Render: Log-Liste ---- */
  function renderLog() {
    var box = document.getElementById("dpLog");
    if (!log.length) { box.innerHTML = '<p class="small" style="color:var(--muted-2)">Noch nichts eingetragen. Tippe oben auf ein Gericht oder trag dein eigenes ein.</p>'; return; }
    box.innerHTML = '<div style="display:grid;gap:8px">' + log.map(function (m, i) {
      return '<div class="summary-line" style="align-items:center">' +
        '<span>' + esc(m.name) + '</span>' +
        '<span style="display:flex;align-items:center;gap:12px">' +
        '<span class="mono" style="color:var(--muted)">' + m.kcal + ' kcal · ' + (m.protein || 0) + ' g</span>' +
        '<button data-del="' + i + '" aria-label="Entfernen" style="background:none;border:none;color:var(--muted-2);font-size:1.1rem;cursor:pointer;line-height:1">×</button>' +
        '</span></div>';
    }).join("") + '</div>';
    box.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { log.splice(+b.dataset.del, 1); saveLog(); renderAll(); });
    });
  }

  /* ---- Render: Rest-Budget ---- */
  function totals() {
    return log.reduce(function (a, m) { a.kcal += m.kcal; a.prot += (m.protein || 0); return a; }, { kcal: 0, prot: 0 });
  }
  function remainKcal() {
    var t = parseInt(kcalIn.value, 10) || 0; return t - totals().kcal;
  }
  function renderRemain() {
    var box = document.getElementById("dpRemain");
    var target = parseInt(kcalIn.value, 10) || 0;
    var tp = parseInt(protIn.value, 10) || 0;
    var tot = totals();
    if (!target) { box.innerHTML = '<p style="color:var(--muted)">Trag oben dein <strong>Kalorien-Ziel</strong> ein, dann rechne ich dir aus, was heute Abend noch reingeht.</p>'; renderSuggest(); return; }
    var rem = target - tot.kcal;
    var remP = tp ? Math.max(0, tp - tot.prot) : null;
    var color = rem > 300 ? "var(--green)" : rem > 0 ? "var(--amber)" : "var(--red)";
    var head = rem > 0
      ? 'Du hast heute Abend noch <span style="color:' + color + '">' + rem + ' kcal</span> übrig'
      : 'Dein Budget ist für heute aufgebraucht (' + rem + ' kcal)';
    box.innerHTML =
      '<div style="font-size:1.35rem;font-weight:700;font-family:var(--font-display);line-height:1.3;color:var(--text)">' + head + '</div>' +
      '<div class="summary-line" style="margin-top:10px"><span>Ziel</span><span class="mono">' + target + ' kcal' + (tp ? ' · ' + tp + ' g Protein' : '') + '</span></div>' +
      '<div class="summary-line"><span>Heute gegessen</span><span class="mono">' + tot.kcal + ' kcal · ' + tot.prot + ' g</span></div>' +
      '<div class="summary-line" style="font-weight:700;color:var(--text)"><span>Rest fürs Abendessen</span><span class="mono" style="color:' + color + '">' + rem + ' kcal' + (remP != null ? ' · ' + remP + ' g' : '') + '</span></div>';
    renderSuggest();
  }

  /* ---- Render: Tabs + Vorschläge ---- */
  function renderTabs() {
    var box = document.getElementById("dpTabs");
    box.innerHTML = CATS.map(function (c) {
      var on = c.id === activeCat;
      return '<button data-cat="' + c.id + '" class="btn ' + (on ? "btn-primary" : "btn-dark") + ' btn-sm">' + c.icon + " " + c.label + '</button>';
    }).join("");
    box.querySelectorAll("[data-cat]").forEach(function (b) {
      b.addEventListener("click", function () { activeCat = b.dataset.cat; renderTabs(); renderSuggest(); });
    });
  }
  function renderSuggest() {
    var box = document.getElementById("dpSuggest");
    var target = parseInt(kcalIn.value, 10) || 0;
    if (!target) { box.innerHTML = ""; return; }
    var rem = remainKcal();
    if (rem <= 50) {
      box.innerHTML = '<div class="doc-callout warn" style="color:var(--text)"><strong>Heute ist das Budget voll.</strong> Wenn du noch Hunger hast, greif zu etwas sehr Leichtem und Proteinreichem (z. B. Magerquark, Skyr). Morgen ist ein neuer Tag — und mit einem harten Trainingstag steigt dein Budget wieder.</div>';
      return;
    }
    var tol = Math.round(rem * 0.05) + 30; // kleine Toleranz
    var list = DINNERS.filter(function (d) { return d.c === activeCat && d.kcal <= rem + tol; })
      .sort(function (a, b) { return b.protein - a.protein; });
    if (!list.length) {
      box.innerHTML = '<p style="color:var(--muted)">In dieser Kategorie passt bei <strong>' + rem + ' kcal</strong> gerade nichts Größeres. Schau in eine andere Kategorie — oder heb dir das fürs Wochenende auf. 😉</p>';
      return;
    }
    box.innerHTML = '<div style="display:grid;gap:10px;margin-top:6px">' + list.map(function (d) {
      var fits = d.kcal <= rem;
      var puffer = rem - d.kcal;
      var badge = fits
        ? '<span style="color:var(--green);font-size:0.8rem;font-weight:600">✓ passt' + (puffer > 80 ? ' · ' + puffer + ' kcal Puffer' : '') + '</span>'
        : '<span style="color:var(--amber);font-size:0.8rem;font-weight:600">≈ knapp (' + (d.kcal - rem) + ' kcal drüber)</span>';
      return '<div class="card" style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:14px">' +
        '<div><div style="font-weight:600;color:var(--text)">' + esc(d.name) + '</div>' + badge + '</div>' +
        '<div class="mono" style="text-align:right;color:var(--muted);white-space:nowrap;font-size:0.9rem">' + d.kcal + ' kcal<br>' + d.protein + ' g Protein</div>' +
        '</div>';
    }).join("") + '</div>' +
      '<p class="small" style="color:var(--muted-2);margin-top:12px">Sortiert nach Protein — der wichtigste Makro für Sättigung und Muskelschutz. Feinere Steuerung? <a href="tools.html#macros" style="color:#2e7cf6;text-decoration:underline">Makro-Rechner</a>.</p>';
  }

  function renderAll() { renderLog(); renderRemain(); }

  /* ---- Foto-Kalorienschätzung (Claude Vision) ----
     Konfiguration lazy lesen (MM_CONFIG.foodVision): entweder eigener
     Proxy-endpoint (empfohlen) oder apiKey fuer den Direktaufruf aus dem
     Browser. Ohne Konfiguration bleibt der Button unsichtbar. */
  function visionCfg() {
    var c = (window.MM_CONFIG && MM_CONFIG.foodVision) || {};
    return { apiKey: c.apiKey || "", endpoint: c.endpoint || "", model: c.model || "claude-haiku-4-5" };
  }

  var photoWrap = document.getElementById("dpPhotoWrap");
  var photoBtn = document.getElementById("dpPhotoBtn");
  var photoInput = document.getElementById("dpPhotoInput");
  var photoStatus = document.getElementById("dpPhotoStatus");

  function initPhoto() {
    var cfg = visionCfg();
    if (!photoWrap || (!cfg.apiKey && !cfg.endpoint)) return;
    photoWrap.style.display = "block";
    photoBtn.addEventListener("click", function () { photoInput.click(); });
    photoInput.addEventListener("change", function () {
      if (photoInput.files && photoInput.files[0]) analyzePhoto(photoInput.files[0]);
      photoInput.value = "";
    });
  }

  /* Bild clientseitig verkleinern (max 1024px, JPEG) — schneller Upload,
     weniger Bild-Token, deutlich guenstiger. */
  function downscale(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        try {
          var MAX = 1024;
          var scale = Math.min(1, MAX / Math.max(img.width, img.height));
          var canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          var dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          URL.revokeObjectURL(url);
          resolve(dataUrl.split(",")[1]); // reines Base64 ohne Prefix
        } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht gelesen werden")); };
      img.src = url;
    });
  }

  function buildRequestBody(b64, model) {
    return {
      model: model,
      max_tokens: 300,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Kurzer deutscher Name des Gerichts" },
              kcal: { type: "integer", description: "Geschätzte Kalorien der abgebildeten Portion" },
              protein: { type: "integer", description: "Geschätztes Protein in Gramm" }
            },
            required: ["name", "kcal", "protein"],
            additionalProperties: false
          }
        }
      },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
          { type: "text", text: "Das ist ein Foto einer Mahlzeit. Schätze realistisch für die abgebildete Portion: kurzer deutscher Gerichtname, Kalorien (kcal) und Protein (g). Alltags-Schätzung, keine Nachkommastellen." }
        ]
      }]
    };
  }

  async function analyzePhoto(file) {
    var cfg = visionCfg();
    photoBtn.disabled = true;
    photoStatus.textContent = "🔍 Foto wird analysiert …";
    try {
      var b64 = await downscale(file);
      var body = buildRequestBody(b64, cfg.model);
      var url, headers = { "content-type": "application/json" };
      if (cfg.endpoint) {
        url = cfg.endpoint; // eigener Proxy: haelt den API-Schluessel geheim
      } else {
        url = "https://api.anthropic.com/v1/messages";
        headers["x-api-key"] = cfg.apiKey;
        headers["anthropic-version"] = "2023-06-01";
        headers["anthropic-dangerous-direct-browser-access"] = "true";
      }
      var res = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("API-Fehler (" + res.status + ")");
      var data = await res.json();
      var textBlock = (data.content || []).filter(function (b) { return b.type === "text"; })[0];
      if (!textBlock) throw new Error("Keine Auswertung erhalten");
      var meal = JSON.parse(textBlock.text);
      if (!meal.kcal || meal.kcal <= 0) throw new Error("Keine Mahlzeit erkannt");
      log.push({ name: "📸 " + (meal.name || "Foto-Mahlzeit"), kcal: Math.round(meal.kcal), protein: Math.round(meal.protein || 0) });
      saveLog();
      renderAll();
      photoStatus.innerHTML = '✅ <strong style="color:var(--text)">' + esc(meal.name) + "</strong> erkannt: ~" +
        Math.round(meal.kcal) + " kcal · " + Math.round(meal.protein || 0) + " g Protein — eingetragen!";
      if (window.MM && MM.track) MM.track("dinner_photo_analyzed", {});
      var remain = document.getElementById("dpRemain");
      if (remain) remain.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      photoStatus.textContent = "⚠️ Analyse fehlgeschlagen: " + (e && e.message ? e.message : "unbekannter Fehler") + " — trag die Mahlzeit einfach manuell ein.";
    } finally {
      photoBtn.disabled = false;
    }
  }

  initPhoto();
  renderTabs();
  renderAll();
})();
