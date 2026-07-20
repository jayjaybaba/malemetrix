/* ==========================================================================
   MaleMetrix Report — vollständiger, druckbarer Performance-Report
   Liest das Check-Ergebnis aus dem Browser-Speicher.
   ========================================================================== */

(function () {
  "use strict";

  const C = window.MM_CHECK;
  const r = MM.store.get("check_result", null);
  const paper = document.getElementById("reportPaper");
  if (!paper || !r) return;

  const keys = ["body", "strength", "fuel", "recovery", "blood", "drive", "execution"];
  const date = new Date(r.date);
  const dateStr = date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  function barColor(v) { return v < 40 ? "#e0654f" : v < 70 ? "#e8a33d" : "#2e7cf6"; }

  const moduleText = C.moduleText;

  function radarLight(scores) {
    const cx = 150, cy = 145, R = 100;
    const pt = (i, val) => {
      const ang = (Math.PI * 2 * i / 7) - Math.PI / 2;
      const rr = R * val / 100;
      return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)];
    };
    let svg = '<svg viewBox="0 0 300 290" width="100%" style="max-width:330px">';
    [25, 50, 75, 100].forEach(lvl => {
      const pts = keys.map((_, i) => pt(i, lvl).join(",")).join(" ");
      svg += '<polygon points="' + pts + '" fill="none" stroke="#e3e6eb" stroke-width="1"/>';
    });
    keys.forEach((_, i) => {
      const [x, y] = pt(i, 100);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="#e3e6eb"/>';
    });
    const valPts = keys.map((k, i) => pt(i, Math.max(scores[k], 4)).join(",")).join(" ");
    svg += '<polygon points="' + valPts + '" fill="rgba(46,124,246,0.18)" stroke="#2e7cf6" stroke-width="2"/>';
    keys.forEach((k, i) => {
      const [x, y] = pt(i, Math.max(scores[k], 4));
      svg += '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="#2e7cf6"/>';
    });
    keys.forEach((k, i) => {
      const [x, y] = pt(i, 124);
      svg += '<text x="' + x + '" y="' + y + '" fill="#5b6472" font-size="10" font-family="JetBrains Mono,monospace" text-anchor="middle" dominant-baseline="middle">' + C.nm(k).toUpperCase() + '</text>';
    });
    return svg + '</svg>';
  }

  const a = r.answers || {};
  const firstName = ((a.name || "").trim().split(/\s+/)[0] || "").slice(0, 24);
  const whtrStr = r.whtr ? r.whtr.toFixed(2).replace(".", ",") : "—";
  const stepsArr = C.nextSteps[r.bottleneck.key] || C.nextSteps.execution;

  let html = "";

  /* ---------- Kopf / Deckblatt ---------- */
  html += '<div class="r-head"><div class="r-logo">Male<span>Metrix</span></div>' +
    '<div class="r-meta">PERFORMANCE-REPORT<br>' + dateStr + '<br>malemetrix.de</div></div>';

  html += '<h1 class="r-title">Dein persönlicher MaleMetrix Report</h1>' +
    '<p class="r-sub">Lifestyle-Analyse auf Basis deines MaleMetrix Score — Training, Ernährung, Schlaf, Blutwerte-Struktur und Umsetzung.</p>';

  /* ---------- Score-Banner ---------- */
  html += '<div class="r-score-banner">' +
    '<div><div class="r-score-num">' + r.total + '<small>/100</small></div>' +
    '<div style="font-family:var(--font-mono);font-size:0.72rem;letter-spacing:0.08em;color:#9aa3b2;margin-top:4px">MALEMETRIX SCORE</div></div>' +
    '<div style="flex:1;min-width:220px">' +
    '<div style="font-weight:700;font-size:1.15rem;color:#0d0f13">' + r.level + '</div>' +
    '<p style="margin-top:6px;font-size:0.9rem">' + r.levelText + '</p>' +
    '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:0.82rem">' +
    '<span><strong>Typ:</strong> ' + r.archetype.name + '</span>' +
    '<span><strong>Größter Hebel:</strong> ' + r.bottleneck.name + '</span>' +
    (r.whtr ? '<span><strong>Waist-to-Height:</strong> ' + whtrStr + '</span>' : '') +
    '</div></div></div>';

  /* ---------- Executive Summary ---------- */
  html += '<div class="r-section"><h2>01 — Executive Summary</h2>' +
    '<p>' + (firstName ? firstName + ", du" : "Du") + ' bist nicht undiszipliniert. Deine Antworten zeigen, wo dein System aktuell trägt und wo es bricht. ' +
    'Dein stärkster Bereich ist <strong>' + C.nm(r.strongest) + '</strong> (' + r.scores[r.strongest] + '/100), ' +
    'dein größter Engpass liegt bei <strong>' + r.bottleneck.name + '</strong>. ' + r.bottleneck.text + '</p>' +
    (r.whtr && r.whtr >= 0.5 ? '<p style="margin-top:10px">Dein Bauchumfang ist aktuell ein wichtiger Marker (Waist-to-Height: ' + whtrStr + '). Nicht wegen Optik allein — der Bauchumfang sagt oft mehr über zentrale Körperfettverteilung aus als das Gewicht allein. Orientierung: Taille möglichst unter der Hälfte der Körpergröße halten.</p>' : '') +
    '</div>';

  /* ---------- Deine Startwerte (personalisiert, modusbasiert, als Bereiche) ---------- */
  (function () {
    const tv = C.targetValues(a);
    const age = parseFloat(a.age), h = parseFloat(a.height), w = parseFloat(a.weight), waist = parseFloat(a.waist);
    let rows = '';
    if (tv.hasEnergy) {
      rows += '<tr><td>Geschätzter Erhaltungsbereich</td><td>ca. ' + tv.maintLo + '–' + tv.maintHi + ' kcal</td></tr>' +
        '<tr><td>Zielbereich für Modus ' + tv.modeLabel + '</td><td>ca. ' + tv.targetLo + '–' + tv.targetHi + ' kcal</td></tr>';
    }
    rows += '<tr><td>Protein pro Tag</td><td>' + tv.proteinLo + '–' + tv.proteinHi + ' g</td></tr>' +
      '<tr><td>Tägliches Schritteziel (Start)</td><td>' + tv.stepGoal + ' Schritte</td></tr>';
    if (waist && tv.waistTarget) rows += '<tr><td>Bauchumfang aktuell → Orientierung</td><td>' + waist + ' cm → Richtung ' + tv.waistTarget + ' cm</td></tr>';
    else if (tv.waistTarget) rows += '<tr><td>Bauchumfang-Orientierung</td><td>unter ' + tv.waistTarget + ' cm (halbe Körpergröße)</td></tr>';

    html += '<div class="r-section"><h2>Deine Startwerte für die nächsten 14 Tage</h2>' +
      '<p style="margin-bottom:6px"><strong>Dein Modus: ' + tv.modeLabel + '</strong> — ' + tv.modeDesc + '.</p>' +
      (tv.modeReason ? '<p style="margin-bottom:6px;font-size:0.92rem;color:#8893a7"><strong style="color:inherit">Warum genau dieser Weg?</strong> ' + tv.modeReason + '</p>' : '') +
      '<p style="margin-bottom:12px">Diese Werte sind <strong>Startbereiche</strong>, keine exakten Vorgaben. Formeln schätzen — sie messen deinen Stoffwechsel nicht direkt.</p>' +
      '<table>' + rows + '</table>' +
      '<p style="margin-top:10px">Danach: <strong>14 Tage beobachten</strong> und anhand von Gewichtstrend, Bauchumfang, Training, Hunger und Energie feinjustieren.</p>' +
      '<p style="font-size:0.8rem;color:#8893a7;margin-top:8px">Orientierungswerte nach etablierten Formeln (Mifflin-St-Jeor, WHtR). Keine ärztliche oder ernährungsmedizinische Vorgabe. Bei starkem Übergewicht ist der Proteinwert bewusst auf ein Referenzgewicht bezogen.</p>' +
      '</div>';
  })();

  /* ---------- Red Flags ---------- */
  if (r.flags && r.flags.length) {
    html += '<div class="r-section"><h2>02 — Wichtiger Hinweis</h2><div class="r-disclaimer"><strong>Bitte ärztlich abklären:</strong><ul style="margin-top:8px;padding-left:18px">' +
      r.flags.map(f => '<li style="list-style:disc;font-size:0.8rem;color:#7a6a45">' + f + '</li>').join("") +
      '</ul></div></div>';
  }

  /* ---------- Profil ---------- */
  html += '<div class="r-section"><h2>0' + (r.flags && r.flags.length ? "3" : "2") + ' — Dein Profil im Überblick</h2>' +
    '<div class="r-grid-2"><div style="display:grid;place-items:center">' + radarLight(r.scores) + '</div>' +
    '<div class="r-bars">';
  keys.forEach(k => {
    const v = r.scores[k];
    html += '<div class="r-bar-row"><span class="nm">' + C.nm(k) + '</span>' +
      '<div class="r-bar-track"><div class="r-bar-fill" style="width:' + v + '%;background:' + barColor(v) + '"></div></div>' +
      '<span class="vl">' + v + '/100</span></div>';
  });
  html += '</div></div></div>';

  /* ---------- Einzel-Auswertung ---------- */
  html += '<div class="r-section"><h2>Einzel-Auswertung der 7 Bereiche</h2><div class="r-grid-2">';
  keys.forEach(k => {
    html += '<div class="r-box"><span class="r-tag">' + C.nm(k) + ' · ' + r.scores[k] + '/100</span>' +
      '<p style="font-size:0.86rem">' + moduleText(k, r.scores[k]) + '</p></div>';
  });
  html += '</div></div>';

  /* ---------- Archetyp ---------- */
  html += '<div class="r-section"><h2>Dein Performance-Typ</h2>' +
    '<div class="r-box" style="border-left:4px solid #2e7cf6">' +
    '<h3 style="font-size:1.2rem">' + r.archetype.name + '</h3>' +
    '<p style="font-weight:600;color:#16181d;margin:4px 0 8px">' + r.archetype.tagline + '</p>' +
    '<p>' + r.archetype.text + '</p></div></div>';

  /* ---------- Top 3 Prioritäten ---------- */
  html += '<div class="r-section"><h2>Deine Top-3-Prioritäten</h2><div class="r-grid-2" style="grid-template-columns:1fr">';
  r.weakest.forEach((k, i) => {
    html += '<div class="r-box"><span class="r-tag">Priorität ' + (i + 1) + ' — ' + C.nm(k) + ' (' + r.scores[k] + '/100)</span>' +
      '<p style="font-size:0.88rem">' + moduleText(k, r.scores[k]) + '</p></div>';
  });
  html += '</div></div>';

  /* ---------- Nächste Schritte ---------- */
  html += '<div class="r-section"><h2>Deine nächsten 3 Schritte</h2><ol class="r-steps">' +
    stepsArr.map(s => "<li><span>" + s + "</span></li>").join("") + '</ol></div>';

  /* ---------- 7-Tage-Plan ---------- */
  let planDays;
  try { planDays = C.dynamicPlan(a, r); } catch (e) { planDays = r.plan; }
  if (!planDays || !planDays.length) planDays = r.plan;
  html += '<div class="r-section"><h2>Dein 7-Tage-Plan</h2>' +
    '<p style="margin-bottom:12px">Aus deinen Antworten gebaut (Modus ' + C.targetValues(a).modeLabel + '). Ziel: Baseline schaffen und Momentum aufbauen — nicht Perfektion. Identisch zu deinem Dashboard.</p>';
  planDays.forEach(d => {
    html += '<div class="r-plan-day"><div class="d">' + d.day.toUpperCase() + '</div><ul>' +
      d.items.map(it => "<li>" + it + "</li>").join("") + '</ul></div>';
  });
  html += '</div>';

  /* ---------- 90-Tage-Roadmap ---------- */
  html += '<div class="r-section"><h2>Deine 90-Tage-Roadmap</h2><table>' +
    '<tr><th>Phase</th><th>Wochen</th><th>Fokus</th></tr>' +
    '<tr><td>1 · Baseline</td><td>1–2</td><td>Ausgangslage erfassen: Gewicht, Bauchumfang, Fotos, Kraftwerte, Schlaf, Schritte. Protein-Ziel festlegen, Trainingstage fixieren.</td></tr>' +
    '<tr><td>2 · Structure</td><td>3–4</td><td>Ernährung vereinfachen: Standardmahlzeiten, Wochenendstrategie. 3 feste Krafteinheiten + tägliche Bewegung (Steps/Zone 2) etablieren, Schlafroutine starten.</td></tr>' +
    '<tr><td>3 · Build</td><td>5–8</td><td>Progressive Steigerung im Training, Bauchumfang reduzieren, Kalorien feinjustieren, Erholung kontrollieren.</td></tr>' +
    '<tr><td>4 · Optimize</td><td>9–12</td><td>Plateaus lösen, Re-Check des Scores, Blutwerte optional einordnen, Langzeitplan &amp; Erhaltungsstrategie.</td></tr>' +
    '</table></div>';

  /* ---------- Trainingsempfehlung (Ziel/Erfahrung entscheiden, kein Universal-Plan) ---------- */
  html += '<div class="r-section"><h2>Trainings-Empfehlung: jeden Tag Bewegung, gezielt Kraft</h2>' +
    '<div class="r-callout" style="border-left:3px solid var(--accent);padding:12px 16px;margin-bottom:14px;background:rgba(46,124,246,0.06);border-radius:0 8px 8px 0">' +
    '<strong>Das MaleMetrix-Prinzip:</strong> Bewege und trainiere jeden Tag — aber nicht jeden Tag maximal. ' +
    'Drei Tage davon sind gezieltes Krafttraining, die übrigen Tage bestehen aus Zone 2, Mobility, Spaziergängen/Steps oder aktiver Regeneration. ' +
    'Jeden Tag ein Reiz, damit Bewegung zur Gewohnheit wird — die Belastung steuerst du, nicht das Kalenderblatt.</div>' +
    '<p style="margin-bottom:10px">Für den <strong>Kraft-Anteil</strong> gibt es keinen Plan für jeden. Wähle die Frequenz, die zu Ziel, Erfahrung und Alltag passt — und ziehe sie mit Progression durch:</p>' +
    '<table><tr><th>Variante</th><th>Für wen</th></tr>' +
    '<tr><td style="font-weight:600">2× Ganzkörper</td><td style="font-weight:400">Sehr guter Minimum-Plan für Einsteiger und Vielbeschäftigte — konsequent besser als 4×, die ausfallen. Die restlichen Tage: Steps, Zone 2, Mobility.</td></tr>' +
    '<tr><td style="font-weight:600">3× Ganzkörper</td><td style="font-weight:400">Solider Standard: jede große Muskelgruppe 3× pro Woche, gute Erholung. Dazwischen Bewegungstage statt Nichtstun.</td></tr>' +
    '<tr><td style="font-weight:600">4× Ober-/Unterkörper</td><td style="font-weight:400">Wenn Zeit und Erfahrung da sind und du mehr Volumen sauber verkraftest — mindestens 1 echter Erholungstag mit lockerer Bewegung.</td></tr>' +
    '</table>' +
    '<p style="margin-top:12px;font-size:0.9rem"><strong>Progression:</strong> Gewichte/Wiederholungen notieren, über die Zeit steigern (doppelte Progression). <strong>Deload:</strong> nicht nach Kalender — nur, wenn sich Ermüdung aufstaut (Kraft fällt, Schlaf/Gelenke leiden). Wer top regeneriert, trainiert weiter.</p>' +
    '<p style="margin-top:10px;font-size:0.9rem"><strong>Cardio (eigenes System):</strong> Einsteiger → Gewohnheit + Gehen; Basis → 2–3× 20–40 Min moderat („Zone 2“ = locker, sprechen möglich); Performance → zusätzlich 1× kurze Intervalle, wenn geeignet. Dauer zuerst erhöhen, Intensität später. Ein reproduzierbarer Marker (feste Strecke/Zeit oder Ruhepuls) macht Fortschritt sichtbar.</p></div>';

  /* ---------- Ernährungsempfehlung ---------- */
  const weight = parseFloat(a.weight) || 0;
  const protLow = weight ? Math.round(weight * 1.6) : 130;
  const protHigh = weight ? Math.round(weight * 2.0) : 180;
  html += '<div class="r-section"><h2>Ernährungs-Empfehlung: Das Stufensystem</h2><ol class="r-steps">' +
    '<li><span><strong>Hand-Regeln zuerst:</strong> Jede Mahlzeit Protein, täglich Gemüse/Obst, Flüssigkalorien reduzieren, 2–3 Standardmahlzeiten, Alkohol begrenzen.</span></li>' +
    '<li><span><strong>Protein-Ziel:</strong> ' + protLow + '–' + protHigh + ' g pro Tag' + (weight ? ' (bei ' + weight + ' kg Körpergewicht)' : '') + ' — der wichtigste einzelne Ernährungshebel.</span></li>' +
    '<li><span><strong>Kalorien:</strong> Moderates Defizit bei Fettverlust, Erhaltung bei Recomp, leichter Überschuss bei Muskelaufbau. Kein Crash.</span></li>' +
    '<li><span><strong>Tracking:</strong> 7 Tage tracken, Standardmahlzeiten bauen, Wochenendkalorien sichtbar machen.</span></li>' +
    '</ol></div>';

  /* ---------- Recovery ---------- */
  html += '<div class="r-section"><h2>Recovery-Empfehlung</h2><ol class="r-steps">' +
    '<li><span><strong>Schlaffenster:</strong> Festes 7–8-Stunden-Fenster — gleiche Zeiten, auch am Wochenende (±1 h).</span></li>' +
    '<li><span><strong>Koffein:</strong> Menge und Timing zusammen denken — teste eine frühere Deadline (z.&nbsp;B. 8–10 h vor dem Schlafen) und prüfe, ob dein Schlaf besser wird. Keine starre Uhrzeit für alle.</span></li>' +
    '<li><span><strong>Abendroutine:</strong> Letzte 30 Minuten ohne Bildschirm; Schlafzimmer kühl und dunkel.</span></li>' +
    '<li><span><strong>Stress:</strong> Tägliche 15–20-Minuten-Geheinheit — der unterschätzte Regenerations-Hebel.</span></li>' +
    '</ol></div>';

  /* ---------- Health & Longevity Dashboard (risikobasiert, nicht „alles messen") ---------- */
  (function () {
    const hd = C.healthDashboard(a);
    let cols = '';
    hd.groups.forEach(g => {
      cols += '<div><h3 style="font-size:0.9rem;margin:0 0 8px">' + g.key + ' — ' + g.title + '</h3><ul class="r-check-cols" style="grid-template-columns:1fr">' +
        g.items.map(x => "<li>" + x + "</li>").join("") + '</ul></div>';
    });
    html += '<div class="r-section"><h2>Dein Health &amp; Longevity Dashboard</h2>' +
      '<p style="margin-bottom:6px">Labor ist nur ein Teil. Priorisiere zuerst das, was Entscheidungen verändert: Blutdruck, Bauchumfang, Bewegung/Fitness, Schlaf, Nikotin, Alkohol, Familienanamnese.</p>' +
      '<p style="margin-bottom:12px;font-weight:600">' + hd.note + '</p>' +
      '<div class="r-grid-2">' + cols + '</div>' +
      '<p style="font-size:0.78rem;color:#9aa3b2;margin-top:10px">Welche Werte für dich sinnvoll sind, entscheidet dein Arzt nach Alter, Risiko, Symptomen und Vorgeschichte. Blutdruck &amp; Bauchumfang trackst du im MaleMetrix Tracker.</p></div>';
  })();

  /* ---------- Passendes Angebot (personalisiert — nicht immer Coaching) ---------- */
  (function () {
    const rec = C.productRecommendation(r);
    const color = rec.kind === 'medical' ? '#c0392b' : (rec.kind === 'coaching' ? '#7c5cff' : '#2e7cf6');
    html += '<div class="r-section"><h2>Dein nächster Schritt mit MaleMetrix</h2>' +
      '<div class="r-box" style="border-left:4px solid ' + color + '"><h3>' + rec.title + '</h3>' +
      '<p style="margin-top:6px">' + rec.why + '</p>' +
      (rec.kind === 'medical'
        ? '<p style="margin-top:8px;font-size:0.85rem">Kläre die oben markierten Punkte zuerst ärztlich. Danach unterstützt dich MaleMetrix bei Struktur und Umsetzung.</p>'
        : '<p style="margin-top:8px;font-size:0.9rem"><strong>' + rec.primary.label + '</strong>' + (rec.kind === 'coaching' ? ' — kostenloses Analysegespräch: <strong>malemetrix.de/termin</strong>' : ' — <strong>malemetrix.de/protokoll</strong>') + '</p>') +
      '</div></div>';
  })();

  /* ---------- Disclaimer ---------- */
  html += '<div class="r-section"><div class="r-disclaimer"><strong>Disclaimer:</strong> MaleMetrix bietet Coaching, Lifestyle-Analyse und strukturierte Orientierung zu Training, Ernährung, Schlaf, Körperkomposition und allgemeinen Gesundheitsmarkern. Dieser Report stellt keine medizinische Diagnose dar, ersetzt keine ärztliche Beratung und enthält keine Therapie- oder Medikamentenempfehlungen. Bei gesundheitlichen Beschwerden, auffälligen Laborwerten oder medizinischen Fragen wende dich bitte an einen Arzt.</div></div>';

  html += '<div class="r-footer"><span>MALEMETRIX PERFORMANCE-REPORT</span><span>' + dateStr + ' · SCORE ' + r.total + '/100</span></div>';

  paper.innerHTML = html;
})();
