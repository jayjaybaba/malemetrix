/* ==========================================================================
   MaleMetrix — Kalorien-Tracker ("MealMetrix")
   --------------------------------------------------------------------------
   Vollwertiger Tracker, komplett clientseitig (localStorage):
   - Kalorien- & Makro-Ziele (Protein/KH/Fett) mit Fortschritts-Ringen
   - Durchsuchbare Lebensmittel-Datenbank (js/food-db.js) mit Mengen-Rechnung
   - 4 Mahlzeiten (Frühstück/Mittag/Abend/Snacks)
   - Tages-Navigation + Historie, pro Tag gespeichert
   - Eingebauter Ziel-Rechner (Mifflin-St Jeor)
   - Favoriten / zuletzt genutzt für schnelles Wiederhinzufügen
   - Foto-KI (Claude Vision) + "Was geht heute Abend noch"-Vorschläge
   ========================================================================== */
(function () {
  "use strict";
  var root = document.getElementById("mmTracker");
  if (!root) return;

  var DB = window.MM_FOODDB || [];
  var MEALS = [
    { id: "fruehstueck", label: "Frühstück", icon: "☀️" },
    { id: "mittag", label: "Mittagessen", icon: "🍽️" },
    { id: "abend", label: "Abendessen", icon: "🌙" },
    { id: "snacks", label: "Snacks", icon: "🍎" }
  ];

  /* ---------- Storage ---------- */
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    getJSON: function (k, d) { try { return JSON.parse(LS.get(k, "null")) || d; } catch (e) { return d; } },
    setJSON: function (k, v) { LS.set(k, JSON.stringify(v)); }
  };

  var ymd = MM.ymd;
  var esc = MM.esc;

  /* Aktueller Tag (Date-Objekt, auf Mitternacht) */
  var current = new Date(); current.setHours(0, 0, 0, 0);
  function isToday(d) { var t = new Date(); return ymd(d) === ymd(t); }
  function dayKey(d) { return "mm_diary_" + ymd(d); }

  function loadDay(d) {
    return LS.getJSON(dayKey(d), { fruehstueck: [], mittag: [], abend: [], snacks: [] });
  }
  function saveDay(d, data) { LS.setJSON(dayKey(d), data); }

  var goals = LS.getJSON("mm_goals", { kcal: 0, p: 0, c: 0, f: 0 });
  var favs = LS.getJSON("mm_food_favs", []);       // gemerkte Lebensmittel
  var recents = LS.getJSON("mm_food_recent", []);  // zuletzt genutzt (max 12)

  var diary = loadDay(current);

  /* ---------- Nährwert-Rechnung ---------- */
  // Ein Eintrag im Tagebuch: { n, qty, kcal, p, c, f } — Werte bereits für qty.
  function computeEntry(food, qty) {
    var factor = food.t === "g" ? qty / 100 : qty;
    return {
      n: food.n,
      unit: food.t === "g" ? "g" : (food.unit || "Stück"),
      qty: qty,
      t: food.t,
      kcal: Math.round(food.kcal * factor),
      p: round1(food.p * factor),
      c: round1(food.c * factor),
      f: round1(food.f * factor)
    };
  }
  function round1(x) { return Math.round(x * 10) / 10; }

  function mealTotals(list) {
    return list.reduce(function (a, e) {
      a.kcal += e.kcal; a.p += e.p; a.c += e.c; a.f += e.f; return a;
    }, { kcal: 0, p: 0, c: 0, f: 0 });
  }
  function dayTotals() {
    var t = { kcal: 0, p: 0, c: 0, f: 0 };
    MEALS.forEach(function (m) {
      var mt = mealTotals(diary[m.id] || []);
      t.kcal += mt.kcal; t.p += mt.p; t.c += mt.c; t.f += mt.f;
    });
    t.kcal = Math.round(t.kcal); t.p = Math.round(t.p); t.c = Math.round(t.c); t.f = Math.round(t.f);
    return t;
  }

  /* ---------- Verknüpfung mit dem Gym-Tracker ----------
     Liest die Trainingsdaten des Fitness-Trackers (gleicher Browser) und
     rechnet einen ehrlichen, gedeckelten Trainings-Bonus aufs Tagesbudget:
     Gym-Einheit +250 kcal · Cardio ~7 kcal/min (max 300) ·
     tägliche Bewegung ~5 kcal/min (max 150). Gesamt max +500. */
  function trkStore(key, d) {
    try {
      if (window.MM && MM.store) return MM.store.get(key, d);
      var raw = localStorage.getItem("mm_" + key);
      return raw ? JSON.parse(raw) : d;
    } catch (e) { return d; }
  }
  function trainingBonus(dateObj) {
    var key = ymd(dateObj);
    var out = { kcal: 0, parts: [], gym: false };
    var gym = (trkStore("trk_sessions", []) || []).some(function (s) {
      var x = new Date(s.date); x.setHours(0, 0, 0, 0); return ymd(x) === key;
    });
    if (gym) { out.kcal += 250; out.gym = true; out.parts.push("🏋️ Gym +250"); }
    var cdMin = (trkStore("trk_cardio", []) || []).reduce(function (a, c) {
      return a + (c.date === key ? (c.durationMin || 0) : 0);
    }, 0);
    if (cdMin > 0) {
      var cd = Math.min(300, Math.round(cdMin * 7));
      out.kcal += cd; out.parts.push("🏃 Cardio " + Math.round(cdMin) + " min +" + cd);
    }
    var dyMin = (trkStore("trk_daily", []) || []).reduce(function (a, d) {
      return a + (d.date === key ? (d.min || 0) : 0);
    }, 0);
    if (dyMin > 0) {
      var dy = Math.min(150, Math.round(dyMin * 5));
      out.kcal += dy; out.parts.push("🚶 Bewegung " + Math.round(dyMin) + " min +" + dy);
    }
    out.kcal = Math.min(500, out.kcal);
    return out;
  }

  /* ---------- Rendering ---------- */
  var el = {
    date: document.getElementById("mmDate"),
    prev: document.getElementById("mmPrev"),
    next: document.getElementById("mmNext"),
    ring: document.getElementById("mmRing"),
    macros: document.getElementById("mmMacros"),
    meals: document.getElementById("mmMeals"),
    suggest: document.getElementById("mmSuggestWrap"),
    goalBtn: document.getElementById("mmGoalBtn")
  };

  function renderDateNav() {
    var opts = { weekday: "short", day: "numeric", month: "short" };
    var label = isToday(current) ? "Heute" : current.toLocaleDateString("de-DE", opts);
    el.date.textContent = label;
    // Zukunft erlauben, aber Button leicht ausgrauen wenn > heute
    el.next.style.opacity = isToday(current) ? "0.4" : "1";
  }

  function ringSVG(pct, center) {
    var r = 52, circ = 2 * Math.PI * r;
    var dash = Math.min(pct, 1) * circ;
    var over = pct > 1;
    var color = over ? "var(--red)" : "var(--accent)";
    return '<svg width="130" height="130" viewBox="0 0 130 130">' +
      '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="11"/>' +
      '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="11" stroke-linecap="round" ' +
      'stroke-dasharray="' + dash + ' ' + circ + '" transform="rotate(-90 65 65)"/>' +
      '<text x="65" y="60" text-anchor="middle" font-size="26" font-weight="700" fill="var(--text)" font-family="var(--font-display)">' + center.big + '</text>' +
      '<text x="65" y="80" text-anchor="middle" font-size="11" fill="var(--muted)">' + center.small + '</text>' +
      '</svg>';
  }

  function macroBar(label, val, goal, color) {
    var pct = goal > 0 ? Math.min(1, val / goal) : 0;
    var over = goal > 0 && val > goal;
    return '<div style="margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px">' +
      '<span style="color:var(--muted)">' + label + '</span>' +
      '<span class="mono" style="color:' + (over ? "var(--red)" : "var(--text)") + '">' + Math.round(val) + (goal > 0 ? " / " + goal : "") + ' g</span></div>' +
      '<div style="height:7px;background:var(--line);border-radius:4px;overflow:hidden">' +
      '<div style="height:100%;width:' + (pct * 100) + '%;background:' + color + ';border-radius:4px"></div></div></div>';
  }

  function renderDashboard() {
    var t = dayTotals();
    var baseGoal = goals.kcal || 0;
    var bonus = baseGoal > 0 ? trainingBonus(current) : { kcal: 0, parts: [] };
    var goalK = baseGoal + bonus.kcal;
    var rem = goalK - t.kcal;
    var pct = goalK > 0 ? t.kcal / goalK : 0;
    var center = goalK > 0
      ? { big: (rem >= 0 ? rem : rem), small: rem >= 0 ? "kcal übrig" : "kcal drüber" }
      : { big: t.kcal, small: "kcal" };
    el.ring.innerHTML = ringSVG(pct, center);

    var head = goalK > 0
      ? '<div style="font-size:0.82rem;color:var(--muted)">Ziel ' + baseGoal +
        (bonus.kcal > 0 ? ' <strong style="color:var(--green)">+ ' + bonus.kcal + ' Trainings-Bonus</strong>' : '') +
        ' · gegessen ' + t.kcal + ' kcal</div>'
      : '<div style="font-size:0.82rem;color:var(--muted)">Kein Ziel gesetzt — <button id="mmGoalInline" class="linklike">jetzt berechnen</button></div>';
    var bonusLine = "";
    if (baseGoal > 0) {
      bonusLine = bonus.kcal > 0
        ? '<div style="font-size:0.78rem;color:var(--green);margin-top:10px">' + bonus.parts.join(" · ") + ' <span style="color:var(--muted-2)">(aus deinem <a href="tracker.html" style="color:inherit;text-decoration:underline">Gym-Tracker</a>)</span></div>'
        : '<div style="font-size:0.78rem;color:var(--muted-2);margin-top:10px">Heute noch kein Training — <a href="tracker.html" style="color:var(--accent);text-decoration:underline">Einheit loggen</a> und Kalorien-Bonus holen 🏋️</div>';
    }
    el.macros.innerHTML = head +
      '<div style="margin-top:12px">' +
      macroBar("Protein", t.p, goals.p, "var(--accent)") +
      macroBar("Kohlenhydrate", t.c, goals.c, "#f5b54a") +
      macroBar("Fett", t.f, goals.f, "#e0679b") +
      '</div>' + bonusLine;
    var inl = document.getElementById("mmGoalInline");
    if (inl) inl.addEventListener("click", openGoalModal);
  }

  function renderMeals() {
    el.meals.innerHTML = MEALS.map(function (m) {
      var list = diary[m.id] || [];
      var mt = mealTotals(list);
      var rows = list.map(function (e, i) {
        return '<div class="mm-entry">' +
          '<div class="mm-entry-main">' +
          '<span class="mm-entry-name">' + esc(e.n) + '</span>' +
          '<span class="mm-entry-sub">' + fmtQty(e) + ' · ' + Math.round(e.p) + ' g P · ' + Math.round(e.c) + ' g K · ' + Math.round(e.f) + ' g F</span>' +
          '</div>' +
          '<span class="mm-entry-kcal mono">' + e.kcal + '</span>' +
          '<button class="mm-entry-del" data-meal="' + m.id + '" data-i="' + i + '" aria-label="Entfernen">×</button>' +
          '</div>';
      }).join("");
      return '<div class="mm-meal card">' +
        '<div class="mm-meal-head">' +
        '<span>' + m.icon + ' <strong>' + m.label + '</strong></span>' +
        '<span class="mono" style="color:var(--muted)">' + Math.round(mt.kcal) + ' kcal</span>' +
        '</div>' +
        (rows || '<p class="mm-empty">Noch nichts eingetragen.</p>') +
        '<button class="btn btn-dark btn-sm mm-add" data-meal="' + m.id + '">+ Lebensmittel hinzufügen</button>' +
        '</div>';
    }).join("");

    el.meals.querySelectorAll(".mm-add").forEach(function (b) {
      b.addEventListener("click", function () { openSearch(b.dataset.meal); });
    });
    el.meals.querySelectorAll(".mm-entry-del").forEach(function (b) {
      b.addEventListener("click", function () {
        diary[b.dataset.meal].splice(+b.dataset.i, 1);
        persist(); renderAll();
      });
    });
  }

  function fmtQty(e) {
    if (e.t === "g") return e.qty + " g";
    return (e.qty % 1 === 0 ? e.qty : e.qty) + " " + (e.unit || "Stück");
  }

  function renderAll() { renderDateNav(); renderDashboard(); renderMeals(); renderSuggest(); }

  function persist() { saveDay(current, diary); }

  /* ---------- Eintrag hinzufügen ---------- */
  function addEntry(mealId, entry) {
    if (!diary[mealId]) diary[mealId] = [];
    diary[mealId].push(entry);
    persist();
    pushRecent(entry);
    renderAll();
    if (window.MM && MM.track) MM.track("tracker_add", { meal: mealId });
  }
  function pushRecent(entry) {
    // nur DB-Lebensmittel merken (haben t)
    var key = entry.n;
    recents = recents.filter(function (r) { return r.n !== key; });
    recents.unshift({ n: entry.n });
    recents = recents.slice(0, 12);
    LS.setJSON("mm_food_recent", recents);
  }

  /* ---------- Such-Modal ---------- */
  var modal = document.getElementById("mmModal");
  var searchMeal = null;

  function openSearch(mealId) {
    searchMeal = mealId;
    var mealLabel = (MEALS.filter(function (m) { return m.id === mealId; })[0] || {}).label || "";
    modal.innerHTML =
      '<div class="mm-modal-box">' +
      '<div class="mm-modal-head"><strong>Hinzufügen zu ' + esc(mealLabel) + '</strong>' +
      '<button class="mm-modal-close" id="mmClose">✕</button></div>' +
      '<input type="text" id="mmSearch" placeholder="Lebensmittel suchen (z. B. Hähnchen, Reis, Banane) …" autocomplete="off">' +
      '<div id="mmResults" class="mm-results"></div>' +
      '<div class="mm-modal-foot">' +
      '<button class="btn btn-dark btn-sm" id="mmManual">Eigenes Lebensmittel</button>' +
      (photoAvailable() ? '<button class="btn btn-primary btn-sm" id="mmPhoto">📸 Foto</button>' : '') +
      '</div></div>';
    modal.classList.add("open");
    var input = document.getElementById("mmSearch");
    input.addEventListener("input", function () { renderResults(input.value); });
    document.getElementById("mmClose").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.getElementById("mmManual").addEventListener("click", function () { openManual(); });
    var pb = document.getElementById("mmPhoto");
    if (pb) pb.addEventListener("click", function () { triggerPhoto(); });
    renderResults("");
    setTimeout(function () { input.focus(); }, 50);
  }
  function closeModal() { modal.classList.remove("open"); modal.innerHTML = ""; }

  function renderResults(q) {
    var box = document.getElementById("mmResults");
    if (!box) return;
    q = q.trim().toLowerCase();
    var list;
    if (!q) {
      // ohne Suche: zuletzt genutzt + Favoriten oben
      var quickNames = {};
      var quick = [];
      recents.concat(favs).forEach(function (r) {
        var food = DB.filter(function (f) { return f.n === r.n; })[0];
        if (food && !quickNames[food.n]) { quickNames[food.n] = 1; quick.push(food); }
      });
      if (quick.length) {
        box.innerHTML = '<div class="mm-res-label">Zuletzt & Favoriten</div>' + quick.slice(0, 8).map(resRow).join("");
        bindRows(box); return;
      }
      list = DB.slice(0, 12);
    } else {
      list = DB.filter(function (f) {
        return f.n.toLowerCase().indexOf(q) !== -1 || f.cat.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 30);
    }
    if (!list.length) {
      box.innerHTML = '<p class="mm-empty" style="padding:14px">Nichts gefunden. Nutze „Eigenes Lebensmittel", um es manuell einzutragen.</p>';
      return;
    }
    box.innerHTML = list.map(resRow).join("");
    bindRows(box);
  }
  function resRow(f) {
    var per = f.t === "g" ? "pro 100 g" : "pro " + (f.unit || "Stück");
    return '<button class="mm-res" data-name="' + esc(f.n) + '">' +
      '<span class="mm-res-main"><span class="mm-res-name">' + esc(f.n) + '</span>' +
      '<span class="mm-res-cat">' + esc(f.cat) + ' · ' + per + '</span></span>' +
      '<span class="mm-res-kcal mono">' + f.kcal + '<span>kcal</span></span></button>';
  }
  function bindRows(box) {
    box.querySelectorAll(".mm-res").forEach(function (b) {
      b.addEventListener("click", function () {
        var food = DB.filter(function (f) { return f.n === b.dataset.name; })[0];
        if (food) openPortion(food);
      });
    });
  }

  /* ---------- Portions-Auswahl ---------- */
  function openPortion(food) {
    var isFav = favs.some(function (r) { return r.n === food.n; });
    var box = document.querySelector(".mm-modal-box");
    box.innerHTML =
      '<div class="mm-modal-head"><button class="mm-modal-back" id="mmBack">←</button>' +
      '<strong>' + esc(food.n) + '</strong>' +
      '<button class="mm-modal-close" id="mmClose">✕</button></div>' +
      '<div class="mm-portion">' +
      '<label>Menge (' + (food.t === "g" ? "Gramm" : (food.unit || "Stück")) + ')</label>' +
      '<div class="mm-portion-row">' +
      '<button class="btn btn-dark btn-sm" id="mmMinus">−</button>' +
      '<input type="number" id="mmQty" inputmode="decimal" value="' + food.base + '" step="' + (food.t === "g" ? 10 : 1) + '" min="0">' +
      '<button class="btn btn-dark btn-sm" id="mmPlus">+</button>' +
      '</div>' +
      (food.t === "g" ? '<div class="mm-quick-g" id="mmQuickG"></div>' : '') +
      '<div id="mmPreview" class="mm-preview"></div>' +
      '<div class="mm-portion-actions">' +
      '<button class="btn btn-ghost btn-sm" id="mmFav">' + (isFav ? "★ Favorit" : "☆ Merken") + '</button>' +
      '<button class="btn btn-primary" id="mmAddBtn">Hinzufügen</button>' +
      '</div></div>';

    var qty = document.getElementById("mmQty");
    function preview() {
      var v = parseFloat(qty.value) || 0;
      var e = computeEntry(food, v);
      document.getElementById("mmPreview").innerHTML =
        '<div class="mm-preview-k">' + e.kcal + ' kcal</div>' +
        '<div class="mm-preview-m">' + Math.round(e.p) + ' g Protein · ' + Math.round(e.c) + ' g KH · ' + Math.round(e.f) + ' g Fett</div>';
    }
    qty.addEventListener("input", preview);
    document.getElementById("mmPlus").addEventListener("click", function () {
      qty.value = (parseFloat(qty.value) || 0) + (food.t === "g" ? 10 : 1); preview();
    });
    document.getElementById("mmMinus").addEventListener("click", function () {
      qty.value = Math.max(0, (parseFloat(qty.value) || 0) - (food.t === "g" ? 10 : 1)); preview();
    });
    if (food.t === "g") {
      var quicks = [50, 100, 150, 200];
      document.getElementById("mmQuickG").innerHTML = quicks.map(function (g) {
        return '<button class="btn btn-dark btn-sm" data-g="' + g + '">' + g + ' g</button>';
      }).join("");
      document.querySelectorAll("#mmQuickG [data-g]").forEach(function (b) {
        b.addEventListener("click", function () { qty.value = b.dataset.g; preview(); });
      });
    }
    document.getElementById("mmBack").addEventListener("click", function () { openSearch(searchMeal); });
    document.getElementById("mmClose").addEventListener("click", closeModal);
    document.getElementById("mmFav").addEventListener("click", function () {
      if (favs.some(function (r) { return r.n === food.n; })) {
        favs = favs.filter(function (r) { return r.n !== food.n; });
      } else { favs.unshift({ n: food.n }); }
      LS.setJSON("mm_food_favs", favs);
      this.textContent = favs.some(function (r) { return r.n === food.n; }) ? "★ Favorit" : "☆ Merken";
    });
    document.getElementById("mmAddBtn").addEventListener("click", function () {
      var v = parseFloat(qty.value) || 0;
      if (v <= 0) return;
      addEntry(searchMeal, computeEntry(food, v));
      closeModal();
    });
    preview();
    setTimeout(function () { qty.focus(); qty.select(); }, 50);
  }

  /* ---------- Manuelles Lebensmittel ---------- */
  function openManual() {
    var box = document.querySelector(".mm-modal-box");
    box.innerHTML =
      '<div class="mm-modal-head"><button class="mm-modal-back" id="mmBack">←</button>' +
      '<strong>Eigenes Lebensmittel</strong>' +
      '<button class="mm-modal-close" id="mmClose">✕</button></div>' +
      '<div class="mm-portion">' +
      '<label>Name</label><input type="text" id="mNm" placeholder="z. B. Omas Gulasch">' +
      '<div class="mm-manual-grid">' +
      '<div><label>kcal</label><input type="number" id="mK" inputmode="numeric" placeholder="500"></div>' +
      '<div><label>Protein (g)</label><input type="number" id="mP" inputmode="numeric" placeholder="30"></div>' +
      '<div><label>KH (g)</label><input type="number" id="mC" inputmode="numeric" placeholder="40"></div>' +
      '<div><label>Fett (g)</label><input type="number" id="mF" inputmode="numeric" placeholder="20"></div>' +
      '</div>' +
      '<div class="mm-portion-actions"><span></span><button class="btn btn-primary" id="mmAddBtn">Hinzufügen</button></div>' +
      '</div>';
    document.getElementById("mmBack").addEventListener("click", function () { openSearch(searchMeal); });
    document.getElementById("mmClose").addEventListener("click", closeModal);
    document.getElementById("mmAddBtn").addEventListener("click", function () {
      var kc = parseInt(document.getElementById("mK").value, 10);
      if (!kc || kc <= 0) { if (window.MM && MM.toast) MM.toast("Bitte kcal eintragen"); return; }
      addEntry(searchMeal, {
        n: (document.getElementById("mNm").value || "Eigenes Lebensmittel").trim(),
        unit: "Portion", qty: 1, t: "stk",
        kcal: kc,
        p: parseFloat(document.getElementById("mP").value) || 0,
        c: parseFloat(document.getElementById("mC").value) || 0,
        f: parseFloat(document.getElementById("mF").value) || 0
      });
      closeModal();
    });
    setTimeout(function () { document.getElementById("mNm").focus(); }, 50);
  }

  /* ---------- Ziel-Rechner (Mifflin-St Jeor) ---------- */
  function openGoalModal() {
    modal.innerHTML =
      '<div class="mm-modal-box">' +
      '<div class="mm-modal-head"><strong>Dein Tagesziel berechnen</strong>' +
      '<button class="mm-modal-close" id="mmClose">✕</button></div>' +
      '<div class="mm-portion">' +
      '<div class="mm-manual-grid">' +
      '<div><label>Geschlecht</label><select id="gSex"><option value="m">männlich</option><option value="w">weiblich</option></select></div>' +
      '<div><label>Alter</label><input type="number" id="gAge" inputmode="numeric" placeholder="35"></div>' +
      '<div><label>Größe (cm)</label><input type="number" id="gHt" inputmode="numeric" placeholder="180"></div>' +
      '<div><label>Gewicht (kg)</label><input type="number" id="gWt" inputmode="numeric" placeholder="85"></div>' +
      '</div>' +
      '<label>Aktivität</label><select id="gAct">' +
      '<option value="1.2">Wenig (Bürojob, kaum Sport)</option>' +
      '<option value="1.375">Leicht (1–2× Sport/Woche)</option>' +
      '<option value="1.55" selected>Moderat (3–4× Sport/Woche)</option>' +
      '<option value="1.725">Hoch (5–6× Sport/Woche)</option>' +
      '</select>' +
      '<label>Ziel</label><select id="gGoal">' +
      '<option value="-0.18">Abnehmen (moderat, ~18 % Defizit)</option>' +
      '<option value="0" selected>Gewicht halten</option>' +
      '<option value="0.1">Muskelaufbau (~10 % Überschuss)</option>' +
      '</select>' +
      '<div id="gPreview" class="mm-preview"></div>' +
      '<div class="mm-portion-actions"><span></span><button class="btn btn-primary" id="gSave">Ziel übernehmen</button></div>' +
      '</div></div>';
    modal.classList.add("open");
    document.getElementById("mmClose").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    var g = LS.getJSON("mm_goal_inputs", {});
    if (g.age) document.getElementById("gAge").value = g.age;
    if (g.ht) document.getElementById("gHt").value = g.ht;
    if (g.wt) document.getElementById("gWt").value = g.wt;
    if (g.sex) document.getElementById("gSex").value = g.sex;

    function calc() {
      var sex = document.getElementById("gSex").value;
      var age = parseFloat(document.getElementById("gAge").value) || 0;
      var ht = parseFloat(document.getElementById("gHt").value) || 0;
      var wt = parseFloat(document.getElementById("gWt").value) || 0;
      var act = parseFloat(document.getElementById("gAct").value);
      var adj = parseFloat(document.getElementById("gGoal").value);
      if (!age || !ht || !wt) { document.getElementById("gPreview").innerHTML = '<div class="mm-preview-m">Fülle Alter, Größe und Gewicht aus.</div>'; return null; }
      var bmr = 10 * wt + 6.25 * ht - 5 * age + (sex === "m" ? 5 : -161);
      var tdee = bmr * act;
      var kcal = Math.round((tdee * (1 + adj)) / 10) * 10;
      var p = Math.round(wt * 2);                       // 2 g/kg
      var fat = Math.round((kcal * 0.25) / 9);          // 25 % aus Fett
      var carbs = Math.round((kcal - p * 4 - fat * 9) / 4);
      if (carbs < 0) carbs = 0;
      document.getElementById("gPreview").innerHTML =
        '<div class="mm-preview-k">' + kcal + ' kcal / Tag</div>' +
        '<div class="mm-preview-m">' + p + ' g Protein · ' + carbs + ' g KH · ' + fat + ' g Fett</div>';
      return { kcal: kcal, p: p, c: carbs, f: fat, inputs: { age: age, ht: ht, wt: wt, sex: sex } };
    }
    ["gSex", "gAge", "gHt", "gWt", "gAct", "gGoal"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", calc);
    });
    document.getElementById("gSave").addEventListener("click", function () {
      var r = calc();
      if (!r) { if (window.MM && MM.toast) MM.toast("Bitte alle Felder ausfüllen"); return; }
      goals = { kcal: r.kcal, p: r.p, c: r.c, f: r.f };
      LS.setJSON("mm_goals", goals);
      LS.setJSON("mm_goal_inputs", r.inputs);
      closeModal(); renderAll();
      if (window.MM && MM.toast) MM.toast("Tagesziel gesetzt: " + r.kcal + " kcal");
      if (window.MM && MM.track) MM.track("tracker_goal_set", {});
    });
    calc();
  }

  /* ---------- "Was geht heute Abend noch" ---------- */
  var DINNERS = [
    { c: "kochen", name: "Magerquark-Bowl mit Beeren", kcal: 350, p: 45 },
    { c: "kochen", name: "Putenpfanne mit Gemüse", kcal: 480, p: 48 },
    { c: "kochen", name: "Hähnchen, Reis & Brokkoli", kcal: 550, p: 50 },
    { c: "kochen", name: "Omelette mit Käse & Salat", kcal: 450, p: 35 },
    { c: "kochen", name: "Lachs mit Ofenkartoffeln", kcal: 600, p: 42 },
    { c: "kochen", name: "Thunfisch-Salat", kcal: 380, p: 40 },
    { c: "liefern", name: "Poke Bowl (Lachs)", kcal: 520, p: 38 },
    { c: "liefern", name: "Sushi (10 Stück)", kcal: 480, p: 28 },
    { c: "liefern", name: "Burrito Bowl", kcal: 600, p: 40 },
    { c: "liefern", name: "Chicken Tikka + Reis", kcal: 650, p: 45 },
    { c: "auswaerts", name: "Steak mit Salat", kcal: 550, p: 55 },
    { c: "auswaerts", name: "Caesar Salad mit Hähnchen", kcal: 480, p: 40 },
    { c: "auswaerts", name: "Gyros-Teller", kcal: 680, p: 50 }
  ];
  var CATS = [
    { id: "kochen", icon: "🍳", label: "Kochen" },
    { id: "liefern", icon: "🛵", label: "Liefern" },
    { id: "auswaerts", icon: "📍", label: "Auswärts" }
  ];
  var activeCat = "kochen";

  function renderSuggest() {
    if (!el.suggest) return;
    var baseGoal = goals.kcal || 0;
    if (!baseGoal) { el.suggest.innerHTML = ""; return; }
    var goalK = baseGoal + trainingBonus(current).kcal;
    var t = dayTotals();
    var rem = goalK - t.kcal;
    var tabs = CATS.map(function (c) {
      return '<button data-cat="' + c.id + '" class="btn ' + (c.id === activeCat ? "btn-primary" : "btn-dark") + ' btn-sm">' + c.icon + " " + c.label + '</button>';
    }).join("");
    var body;
    if (rem <= 50) {
      body = '<div class="mm-empty" style="padding:12px">Dein Budget ist für heute voll. Wenn noch Hunger da ist: etwas Leichtes, Proteinreiches (Magerquark, Skyr). Morgen steigt dein Budget wieder.</div>';
    } else {
      var tol = Math.round(rem * 0.05) + 30;
      var list = DINNERS.filter(function (d) { return d.c === activeCat && d.kcal <= rem + tol; }).sort(function (a, b) { return b.p - a.p; });
      if (!list.length) {
        body = '<div class="mm-empty" style="padding:12px">Bei ' + rem + ' kcal passt hier gerade nichts Größeres — schau in eine andere Kategorie.</div>';
      } else {
        body = list.map(function (d) {
          var puffer = rem - d.kcal;
          var badge = d.kcal <= rem
            ? '<span style="color:var(--green);font-size:0.78rem;font-weight:600">✓ passt' + (puffer > 80 ? " · " + puffer + " kcal Puffer" : "") + '</span>'
            : '<span style="color:var(--amber);font-size:0.78rem;font-weight:600">≈ knapp (' + (d.kcal - rem) + ' drüber)</span>';
          return '<div class="mm-sugg-row"><div><div style="font-weight:600;color:var(--text)">' + esc(d.name) + '</div>' + badge + '</div>' +
            '<div class="mono" style="text-align:right;color:var(--muted);font-size:0.85rem;white-space:nowrap">' + d.kcal + ' kcal<br>' + d.p + ' g P</div></div>';
        }).join("");
      }
    }
    el.suggest.innerHTML =
      '<div class="mm-meal card">' +
      '<div class="mm-meal-head"><span>💡 <strong>Was geht heute Abend noch?</strong></span>' +
      '<span class="mono" style="color:' + (rem > 0 ? "var(--green)" : "var(--red)") + '">' + rem + ' kcal übrig</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 12px">' + tabs + '</div>' +
      '<div style="display:grid;gap:8px">' + body + '</div></div>';
    el.suggest.querySelectorAll("[data-cat]").forEach(function (b) {
      b.addEventListener("click", function () { activeCat = b.dataset.cat; renderSuggest(); });
    });
  }

  /* ---------- Foto-KI (Claude Vision) ---------- */
  function visionCfg() {
    var c = (window.MM_CONFIG && MM_CONFIG.foodVision) || {};
    return { apiKey: c.apiKey || "", endpoint: c.endpoint || "", model: c.model || "claude-haiku-4-5" };
  }
  function photoAvailable() { var c = visionCfg(); return !!(c.apiKey || c.endpoint); }

  var hiddenInput;
  function triggerPhoto() {
    if (!hiddenInput) {
      hiddenInput = document.createElement("input");
      hiddenInput.type = "file"; hiddenInput.accept = "image/*"; hiddenInput.capture = "environment";
      hiddenInput.style.display = "none";
      document.body.appendChild(hiddenInput);
      hiddenInput.addEventListener("change", function () {
        if (hiddenInput.files && hiddenInput.files[0]) analyzePhoto(hiddenInput.files[0]);
        hiddenInput.value = "";
      });
    }
    hiddenInput.click();
  }

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
          resolve(dataUrl.split(",")[1]);
        } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht gelesen werden")); };
      img.src = url;
    });
  }
  function buildRequestBody(b64, model) {
    return {
      model: model, max_tokens: 300,
      output_config: { format: { type: "json_schema", schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Kurzer deutscher Name des Gerichts" },
          kcal: { type: "integer" }, protein: { type: "integer" },
          carbs: { type: "integer" }, fat: { type: "integer" }
        },
        required: ["name", "kcal", "protein", "carbs", "fat"], additionalProperties: false
      } } },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
        { type: "text", text: "Foto einer Mahlzeit. Schätze realistisch für die abgebildete Portion: kurzer deutscher Gerichtname, Kalorien (kcal), Protein, Kohlenhydrate und Fett (g). Alltags-Schätzung, ganze Zahlen." }
      ] }]
    };
  }
  async function analyzePhoto(file) {
    var cfg = visionCfg();
    if (window.MM && MM.toast) MM.toast("🔍 Foto wird analysiert …");
    try {
      var b64 = await downscale(file);
      var body = buildRequestBody(b64, cfg.model);
      var url, headers = { "content-type": "application/json" };
      if (cfg.endpoint) { url = cfg.endpoint; }
      else {
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
      addEntry(searchMeal || "snacks", {
        n: "📸 " + (meal.name || "Foto-Mahlzeit"), unit: "Portion", qty: 1, t: "stk",
        kcal: Math.round(meal.kcal), p: Math.round(meal.protein || 0),
        c: Math.round(meal.carbs || 0), f: Math.round(meal.fat || 0)
      });
      closeModal();
      if (window.MM && MM.toast) MM.toast("✅ " + (meal.name || "Mahlzeit") + " eingetragen");
      if (window.MM && MM.track) MM.track("tracker_photo", {});
    } catch (e) {
      if (window.MM && MM.toast) MM.toast("⚠️ Analyse fehlgeschlagen — trag es manuell ein");
    }
  }

  /* ---------- Navigation ---------- */
  el.prev.addEventListener("click", function () {
    current.setDate(current.getDate() - 1); diary = loadDay(current); renderAll();
  });
  el.next.addEventListener("click", function () {
    if (isToday(current)) return;
    current.setDate(current.getDate() + 1); diary = loadDay(current); renderAll();
  });
  if (el.goalBtn) el.goalBtn.addEventListener("click", openGoalModal);

  renderAll();
})();
