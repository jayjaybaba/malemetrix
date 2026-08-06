// ============================================================================
// MaleMetrix — Zielengine der Transformation (EINE Quelle der Wahrheit).
// Reines ESM ohne Deno-/Browser-Globals: läuft in der Edge Function
// (Server-Validierung + Prompt-Bausteine), im Browser (transformation.html
// lädt sie als Modul) und in Node-Tests (tools-dev/tests).
//
// Grundsätze (Phase 2 der Neuausrichtung, 05.08.2026):
// · KEINE pauschalen Prozentziele. Zwei kontextabhängige Vorschläge:
//   A = realistischer nächster Zustand, B = ambitioniertes langfristiges
//   Ziel — beide aus Gewicht, Größe, Taille und grober Körperform gerechnet.
// · Körperfett ist immer ein SCHÄTZBEREICH (lo–hi), nie eine Messung.
// · Harte Grenzen: Ziel-BMI < 20 wird niemals angeboten und immer blockiert;
//   extreme Abnahmen/Aufbauten werden blockiert; blockierte Ziele bekommen
//   eine dynamisch berechnete realistische Alternative statt nur „nein".
// · Der Server validiert mit DENSELBEN Funktionen wie der Client — direkt
//   manipulierte API-Aufrufe kommen an denselben Grenzen an.
// ============================================================================

export const BMI_FLOOR = 20;            // konservative harte Untergrenze (Abnahme)
export const BMI_CEILING_BULK = 32;     // Aufbauziel-Deckel
export const MAX_LOSS_FRACTION = 0.35;  // mehr ist keine glaubwürdige Ein-Bild-Transformation
export const MAX_GAIN_FRACTION = 0.15;

// Grobe Ausgangsform → geschätzter Körperfett-Mittelwert (Männer).
// Bewusst wenige, sprachlich eindeutige Stufen — keine Scheingenauigkeit.
export const SHAPES = {
  adipoes:      { bf: 36, label: "deutlich übergewichtig" },
  kraeftig:     { bf: 30, label: "kräftig mit ausgeprägtem Bauch" },
  durchschnitt: { bf: 24, label: "durchschnittlich" },
  athletisch:   { bf: 17, label: "athletisch" },
  definiert:    { bf: 12, label: "bereits definiert" },
};

export function bmi(weightKg, heightCm) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}
export function weightAtBmi(b, heightCm) {
  const h = heightCm / 100;
  return b * h * h;
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// Körperfett-SCHÄTZBEREICH aus Taille/Größe (WHtR) und Ausgangsform.
// WHtR-Heuristik: bf ≈ (WHtR·100 − 50) + 21 (Männer, grob) — gemittelt mit
// dem Formwert, ±3 Punkte Unsicherheitsband. Ohne Taille zählt nur die Form.
export function estimateBf({ weightKg, heightCm, waistCm, shape }) {
  const s = SHAPES[shape] || SHAPES.durchschnitt;
  let mid = s.bf;
  if (waistCm && heightCm) {
    const whtr = waistCm / heightCm;
    const bfW = clamp((whtr * 100 - 50) + 21, 5, 48);
    mid = (bfW + s.bf) / 2;
  }
  mid = clamp(mid, 6, 46);
  return { lo: Math.round(clamp(mid - 3, 5, 50)), mid: Math.round(mid), hi: Math.round(clamp(mid + 3, 5, 50)) };
}

export function leanMass(weightKg, bfMid) {
  return weightKg * (1 - bfMid / 100);
}
export function weightAtBf(leanKg, bfPct) {
  return leanKg / (1 - bfPct / 100);
}
// Geschätzter Körperfettbereich bei einem Zielgewicht (Magermasse ~konstant —
// leicht optimistisch, deshalb immer als Bereich kommuniziert).
export function bfAtWeight(leanKg, targetKg) {
  const mid = (1 - leanKg / targetKg) * 100;
  return { lo: Math.round(clamp(mid - 2, 3, 50)), mid: Math.round(clamp(mid, 3, 50)), hi: Math.round(clamp(mid + 2, 3, 50)) };
}

// Wochenbereich für eine Distanz — konservative Raten, als Spanne.
function weeksRange(deltaKg, ratePerWeek) {
  const midW = deltaKg / ratePerWeek;
  return { lo: Math.max(4, Math.round(midW * 0.85)), hi: Math.max(6, Math.round(midW * 1.3)) };
}

/* ============================================================
   ZWEI ZIELVORSCHLÄGE — A realistisch, B ambitioniert.
   direction: "cut" | "bulk". Rückgabe je Ziel:
   { kind: "cut"|"bulk"|"recomp", kg, deltaKg, bf:{lo,hi}, weeks:{lo,hi},
     phased:boolean } — oder note: "..." wenn die Richtung für die
   Ausgangslage nicht seriös ist (z. B. Abnahme bei niedrigem BMI).
   ============================================================ */
export function proposeGoals({ weightKg, heightCm, waistCm, shape, direction }) {
  const est = estimateBf({ weightKg, heightCm, waistCm, shape });
  const lean = leanMass(weightKg, est.mid);
  const startBmi = bmi(weightKg, heightCm);
  const bmi20w = weightAtBmi(BMI_FLOOR, heightCm);
  const out = { est, startBmi: Math.round(startBmi * 10) / 10, direction };

  if (direction !== "bulk") {
    // Abnahme bei bereits schlanker Ausgangslage ist nicht seriös —
    // stattdessen Rekomposition + moderater Aufbau anbieten (Regel 2.3).
    if (startBmi < 20.5 || est.mid <= 14) {
      out.direction = "recomp";
      out.note = "Bei deiner Ausgangslage ist weitere Abnahme nicht seriös — realistisch sind Rekomposition oder moderater Aufbau.";
      out.a = { kind: "recomp", kg: Math.round(weightKg), deltaKg: 0, bf: { lo: Math.max(5, est.lo - 2), hi: est.hi - 1 }, weeks: { lo: 12, hi: 16 }, phased: false };
      const gain = Math.max(2, Math.round(weightKg * 0.05));
      out.b = { kind: "bulk", kg: Math.round(weightKg + gain), deltaKg: gain, bf: { lo: est.lo, hi: est.hi + 1 }, weeks: weeksRange(gain, 0.25), phased: true };
      return finalize(out, weightKg);
    }
    // Ziel A — realistischer nächster Zustand: ~5 Körperfettpunkte runter,
    // nie unter BMI-20-Nähe, mindestens sichtbar relevant (~4 % / 3 kg).
    let bfA = Math.max(est.mid - 5, 15);
    let wA = weightAtBf(lean, bfA);
    wA = Math.max(wA, bmi20w + 1);
    wA = Math.min(wA, weightKg - Math.max(3, weightKg * 0.04));
    // Ziel B — ambitioniert, langfristig, mehrphasig: Richtung 12-14 %
    // Körperfett, hart begrenzt durch BMI 20 und max. 25 % Gesamtabnahme.
    let bfB = Math.max(Math.min(13, est.mid - 10), 11);
    let wB = weightAtBf(lean, bfB);
    wB = Math.max(wB, bmi20w, weightKg * 0.75);
    let a = Math.round(wA), b = Math.round(wB);
    if (b >= a) b = Math.max(Math.round(bmi20w), a - Math.max(2, Math.round(weightKg * 0.03)));
    const dA = weightKg - a, dB = weightKg - b;
    out.a = { kind: "cut", kg: a, deltaKg: Math.round(dA), bf: bfAtWeight(lean, a), weeks: weeksRange(dA, clamp(weightKg * 0.006, 0.3, 1.0)), phased: false };
    out.b = { kind: "cut", kg: b, deltaKg: Math.round(dB), bf: bfAtWeight(lean, b), weeks: weeksRange(dB, clamp(weightKg * 0.006, 0.3, 1.0)), phased: dB > 12 };
    return finalize(out, weightKg);
  }

  // Aufbau: konservative Vorschläge OHNE Erfahrungsannahme (die Frage kommt
  // erst nach der Zielwahl) — A ~+3,5 %, B ~+8 % mehrphasig, BMI-Deckel.
  if (startBmi >= 28) {
    out.direction = "recomp";
    out.note = "Bei deinem Ausgangs-BMI ist reiner Masseaufbau nicht der seriöse Weg — realistisch ist Rekomposition (Muskeln rauf, Fett runter bei ähnlichem Gewicht).";
    out.a = { kind: "recomp", kg: Math.round(weightKg), deltaKg: 0, bf: { lo: Math.max(5, est.lo - 3), hi: est.hi - 2 }, weeks: { lo: 12, hi: 16 }, phased: false };
    const wRecB = Math.round(Math.max(bmi20w, weightAtBf(lean, Math.max(est.mid - 8, 15))));
    out.b = { kind: "cut", kg: wRecB, deltaKg: Math.round(weightKg - wRecB), bf: bfAtWeight(lean, wRecB), weeks: { lo: 16, hi: 26 }, phased: true };
    return finalize(out, weightKg);
  }
  const gainA = Math.max(2, Math.round(weightKg * 0.035));
  let gainB = Math.max(gainA + 2, Math.round(weightKg * 0.08));
  if (bmi(weightKg + gainB, heightCm) > 28) gainB = Math.max(gainA + 1, Math.round(weightAtBmi(28, heightCm) - weightKg));
  out.a = { kind: "bulk", kg: Math.round(weightKg + gainA), deltaKg: gainA, bf: { lo: est.lo, hi: est.hi + 1 }, weeks: weeksRange(gainA, 0.25), phased: false };
  out.b = { kind: "bulk", kg: Math.round(weightKg + gainB), deltaKg: gainB, bf: { lo: est.lo, hi: est.hi + 2 }, weeks: weeksRange(gainB, 0.22), phased: true };
  return finalize(out, weightKg);
}

function finalize(out, weightKg) {
  // Zwei identische Ziele wären kein Vergleich (Regel 2.3).
  if (out.a && out.b && out.a.kg === out.b.kg) {
    if (out.b.kind === "cut") out.b.kg -= 2;
    else out.b.kg += 2;
    out.b.deltaKg = Math.abs(Math.round(weightKg - out.b.kg));
  }
  return out;
}

/* ============================================================
   ZIELVALIDIERUNG — für manuelle Ziele (Client, live) UND für
   jeden API-Aufruf (Server). Verdikte:
   plausibel | ambitioniert | nicht_serioes | blockiert
   Nur plausibel/ambitioniert sind zur Generierung freigegeben.
   Blockierte/unrealistische Ziele bekommen altLo/altHi — eine
   dynamisch berechnete realistische Spanne.
   ============================================================ */
export function validateTarget({ weightKg, heightCm, waistCm, shape, targetKg }) {
  const w = Number(weightKg), h = Number(heightCm), t = Number(targetKg);
  if (!isFinite(w) || w < 40 || w > 300) return { verdict: "blockiert", code: "invalid_weight" };
  if (!isFinite(h) || h < 140 || h > 220) return { verdict: "blockiert", code: "invalid_height" };
  if (!isFinite(t) || t < 40 || t > 300) return { verdict: "blockiert", code: "invalid_target" };
  if (Math.round(t) === Math.round(w)) return { verdict: "blockiert", code: "same_as_current" };

  const est = estimateBf({ weightKg: w, heightCm: h, waistCm, shape });
  const lean = leanMass(w, est.mid);
  const bmi20w = weightAtBmi(BMI_FLOOR, h);
  const alt = altRange({ w, h, lean, cut: t < w });

  if (t < w) {
    const frac = (w - t) / w;
    if (bmi(t, h) < BMI_FLOOR) return { verdict: "blockiert", code: "bmi_floor", ...alt, targetBf: bfAtWeight(lean, t) };
    if (frac > MAX_LOSS_FRACTION) return { verdict: "blockiert", code: "extreme_loss", ...alt, targetBf: bfAtWeight(lean, t) };
    const tBf = bfAtWeight(lean, t);
    if (tBf.mid < 8) return { verdict: "blockiert", code: "bf_floor", ...alt, targetBf: tBf };
    if (frac <= 0.10) return { verdict: "plausibel", code: "ok", targetBf: tBf };
    // bis 25 % Gesamtabnahme: ambitioniert, mehrphasig — deckungsgleich mit
    // dem Deckel der Vorschlagsengine (weightKg * 0.75), damit jeder eigene
    // Vorschlag auch durch die eigene Validierung kommt.
    if (frac <= 0.25) return { verdict: "ambitioniert", code: "ok_ambitious", targetBf: tBf, phased: true };
    return { verdict: "nicht_serioes", code: "loss_too_large", ...alt, targetBf: tBf };
  }

  const frac = (t - w) / w;
  if (bmi(t, h) > BMI_CEILING_BULK) return { verdict: "blockiert", code: "bmi_ceiling", ...alt };
  if (frac > MAX_GAIN_FRACTION) return { verdict: "blockiert", code: "extreme_gain", ...alt };
  if (frac <= 0.05) return { verdict: "plausibel", code: "ok" };
  if (frac <= 0.10) return { verdict: "ambitioniert", code: "ok_ambitious", phased: true };
  return { verdict: "nicht_serioes", code: "gain_too_large", ...alt };
}

// Dynamische realistische Alternative für blockierte/unrealistische Ziele.
function altRange({ w, h, lean, cut }) {
  if (cut) {
    let lo = Math.max(weightAtBmi(BMI_FLOOR, h), weightAtBf(lean, 12));
    let hi = Math.min(w - 2, weightAtBf(lean, 16));
    if (hi <= lo) { hi = Math.max(lo + 2, w - 2); }
    return { altLo: Math.round(lo), altHi: Math.round(hi) };
  }
  return { altLo: Math.round(w + 2), altHi: Math.round(Math.min(w * 1.10, weightAtBmi(BMI_CEILING_BULK, h))) };
}

export function validatePair(aKg, bKg) {
  if (Math.round(Number(aKg)) === Math.round(Number(bKg))) return { ok: false, code: "duplicate_targets" };
  return { ok: true };
}

/* ============================================================
   BILD-PROMPT-BAUSTEINE — dramatisch UND körperfettgestuft.
   Produktentscheidung des Betreibers (06.08.2026): Die Bilder
   MÜSSEN einen Wow-Effekt haben — der Unterschied muss auf den
   ersten Blick unübersehbar sein. Die Zieloptik bleibt nach
   geschätztem Ziel-Körperfett gestuft (ein 30-%-Ziel bekommt
   kein Sixpack), aber innerhalb jeder Stufe wird die Veränderung
   maximal deutlich gezeichnet. Identität bleibt strikt erhalten.
   ============================================================ */
const EMPHASIS =
  "The transformation must be immediately OBVIOUS and dramatic — a striking, unmistakable " +
  "before/after difference. Do NOT return the photo unchanged or nearly unchanged; the body " +
  "must look clearly different at first glance. ";

// Die bewährte Kernanweisung des allerersten Live-Stands (78→70 kg ergab
// damals ein Sixpack — Betreiber: „Das war TOP"): Definition steigt mit dem
// Verlust, der Bauch wird nie weichgezeichnet.
const CUT_RULE =
  "IMPORTANT: muscle definition INCREASES with the amount of weight lost — at this weight he " +
  "must look MORE defined than at any smaller loss. Never soften or smooth the abdominal area. ";

export function targetLookFragment({ weightKg, heightCm, waistCm, shape, targetKg }) {
  const est = estimateBf({ weightKg, heightCm, waistCm, shape });
  const lean = leanMass(weightKg, est.mid);
  const cut = targetKg < weightKg;
  if (cut) {
    const pct = Math.round(((weightKg - targetKg) / weightKg) * 100);
    const tBf = bfAtWeight(lean, targetKg).mid;
    // Einzige Ehrlichkeits-Kappe: Wer am Ziel geschätzt noch ~28 %+
    // Körperfett hat, bekommt dramatischen Fettverlust, aber kein Sixpack.
    if (tBf >= 28) {
      return EMPHASIS + "He is dramatically slimmer: a much smaller belly, drastically reduced waist, " +
        "visibly slimmer face, chest and arms — a completely changed silhouette. The fat loss is " +
        "massive and unmistakable, though there is NO six-pack at this stage. ";
    }
    // Darunter: die bewährte prozentbasierte Staffel des ersten Live-Stands.
    if (pct >= 15) {
      return EMPHASIS + "At this large loss he is VERY lean (low body fat): a sharply defined six-pack, " +
        "clear muscle separation, visible veins on the arms, tight chest and a leaner, more angular face. " +
        CUT_RULE;
    }
    if (pct >= 8) {
      return EMPHASIS + "He is now lean: a clearly visible six-pack, defined tight waist, defined chest " +
        "and arms, noticeably slimmer face. " + CUT_RULE;
    }
    return EMPHASIS + "He is clearly leaner: visibly flatter stomach with first ab outlines, narrower " +
      "waist, slimmer face. " + CUT_RULE;
  }
  // Aufbau: Der Muskelzuwachs muss UNÜBERSEHBAR sein — „unverändertes Bild"
  // ist der dokumentierte Fehlermodus des Modells bei zu zahmen Prompts.
  const frac = (targetKg - weightKg) / weightKg;
  if (frac <= 0.06) {
    return EMPHASIS + "He is visibly more muscular: clearly fuller and broader chest, wider shoulders, " +
      "noticeably thicker arms, more muscular back — the muscle gain must be clearly visible in the " +
      "photo, not subtle. Waist stays tight. ";
  }
  return EMPHASIS + "He is dramatically more muscular, like after years of dedicated bodybuilding " +
    "training: much bigger chest, much broader shoulders, thick arms with clearly larger biceps and " +
    "triceps, wide muscular back with a powerful V-taper, fuller legs. The muscle mass must be " +
    "strikingly larger than in the original photo. ";
}

// Identitäts-Block: kurz und bewährt. Der ausführliche „same everything"-
// Block vom 06.08. drückte das Modell in die Vorsicht — Ergebnis: kaum
// sichtbare Veränderung (Betreiber-Befund). Kernpunkte bleiben: gleiche
// Person, Gesicht ohne Verschönerung, Frisur/Tattoos, Pose, Hintergrund.
export const IDENTITY_FRAGMENT =
  "Keep the SAME person and identity: identical face (do not beautify it), same hairstyle, " +
  "same skin tone, same tattoos, same pose, same clothing (if any — do NOT add clothing to a " +
  "bare torso), same background, same lighting and camera angle. Photorealistic, natural skin " +
  "texture. Change ONLY his body composition — but change it strongly.";
