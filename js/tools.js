/* ==========================================================================
   MaleMetrix — 19 kostenlose Rechner (Tools)
   Wissenschaftlich fundierte Formeln, metrisch/imperial, DE/EN.
   Alles client-seitig, keine Daten verlassen das Gerät.
   ========================================================================== */

(function () {
  "use strict";

  const LANG = () => (window.MM && MM.i18n ? MM.i18n.lang : "de");
  const tr = (o) => (o && (o[LANG()] || o.de)) || "";

  /* ---------- Einheiten ---------- */
  let units = "metric";
  try { units = localStorage.getItem("mm_units") || "metric"; } catch (e) {}
  const KG = 2.2046226218, CM = 0.3937007874;
  const toKg = (v) => units === "imperial" ? v / KG : v;
  const toCm = (v) => units === "imperial" ? v / CM : v;
  const fmtKg = (kg, d) => units === "imperial" ? (kg * KG).toFixed(d == null ? 1 : d) + " lb" : kg.toFixed(d == null ? 1 : d) + " kg";
  const fmtCm = (cm) => units === "imperial" ? (cm * CM).toFixed(1) + " in" : cm.toFixed(1) + " cm";
  const massU = () => units === "imperial" ? "lb" : "kg";
  const lenU  = () => units === "imperial" ? "in" : "cm";

  /* ---------- Feld-Definitionen ---------- */
  const FIELDS = {
    sex:    { kind: "select", label: { de: "Geschlecht", en: "Sex" }, options: [["male", { de: "Männlich", en: "Male" }], ["female", { de: "Weiblich", en: "Female" }]], def: "male" },
    age:    { kind: "num", label: { de: "Alter", en: "Age" }, unit: { de: "Jahre", en: "years" }, min: 14, max: 99, ph: "35" },
    height: { kind: "height", label: { de: "Größe", en: "Height" } },
    weight: { kind: "mass", label: { de: "Gewicht", en: "Weight" }, ph: { metric: "82", imperial: "180" } },
    neck:   { kind: "len", label: { de: "Halsumfang", en: "Neck" }, ph: { metric: "39", imperial: "15.5" } },
    waist:  { kind: "len", label: { de: "Bauchumfang (Nabel)", en: "Waist (navel)" }, ph: { metric: "90", imperial: "35" } },
    hip:    { kind: "len", label: { de: "Hüftumfang", en: "Hip" }, ph: { metric: "100", imperial: "39" }, femaleOnly: true },
    wrist:  { kind: "len", label: { de: "Handgelenk-Umfang", en: "Wrist circumference" }, ph: { metric: "17", imperial: "6.7" } },
    ankle:  { kind: "len", label: { de: "Knöchel-Umfang", en: "Ankle circumference" }, ph: { metric: "22", imperial: "8.7" } },
    bodyfat:{ kind: "num", label: { de: "Körperfett", en: "Body fat" }, unit: { de: "%", en: "%" }, min: 3, max: 60, ph: "18" },
    activity:{ kind: "select", label: { de: "Aktivitätslevel", en: "Activity level" }, options: [
      ["1.2", { de: "Sitzend (kaum Sport)", en: "Sedentary (little/no exercise)" }],
      ["1.375", { de: "Leicht aktiv (1–3×/Woche)", en: "Lightly active (1–3×/week)" }],
      ["1.55", { de: "Mäßig aktiv (3–5×/Woche)", en: "Moderately active (3–5×/week)" }],
      ["1.725", { de: "Sehr aktiv (6–7×/Woche)", en: "Very active (6–7×/week)" }],
      ["1.9", { de: "Extrem aktiv (Athlet, körperl. Job)", en: "Extra active (athlete, physical job)" }]
    ], def: "1.55" },
    goal:   { kind: "select", label: { de: "Ziel", en: "Goal" }, options: [
      ["cut", { de: "Fettabbau (Defizit)", en: "Fat loss (deficit)" }],
      ["maintain", { de: "Halten", en: "Maintain" }],
      ["bulk", { de: "Muskelaufbau (Überschuss)", en: "Muscle gain (surplus)" }]
    ], def: "cut" },
    reps:   { kind: "num", label: { de: "Wiederholungen", en: "Reps performed" }, unit: { de: "Wdh.", en: "reps" }, min: 1, max: 20, ph: "5" },
    lift:   { kind: "mass", label: { de: "Verwendetes Gewicht", en: "Weight lifted" }, ph: { metric: "100", imperial: "225" } },
    total:  { kind: "mass", label: { de: "Wettkampf-Total (KB+BD+KH)", en: "Total (SQ+BP+DL)" }, ph: { metric: "500", imperial: "1100" } },
    restHr: { kind: "num", label: { de: "Ruhepuls (optional)", en: "Resting HR (optional)" }, unit: { de: "bpm", en: "bpm" }, min: 35, max: 110, ph: "60", optional: true },
    sf1:    { kind: "num", label: { de: "Bizeps-Falte", en: "Biceps skinfold" }, unit: { de: "mm", en: "mm" }, min: 1, max: 60, ph: "6" },
    sf2:    { kind: "num", label: { de: "Trizeps-Falte", en: "Triceps skinfold" }, unit: { de: "mm", en: "mm" }, min: 1, max: 60, ph: "11" },
    sf3:    { kind: "num", label: { de: "Subscapular-Falte", en: "Subscapular skinfold" }, unit: { de: "mm", en: "mm" }, min: 1, max: 60, ph: "13" },
    sf4:    { kind: "num", label: { de: "Suprailiac-Falte", en: "Suprailiac skinfold" }, unit: { de: "mm", en: "mm" }, min: 1, max: 60, ph: "12" },
    barbell:{ kind: "select", label: { de: "Hantelstange", en: "Barbell" }, options: [
      ["20", { de: "20 kg (Olympia)", en: "20 kg (Olympic)" }], ["15", { de: "15 kg (Damen)", en: "15 kg (women)" }], ["10", { de: "10 kg (Technik)", en: "10 kg (technique)" }]
    ], def: "20", metricOnly: true },
    barbellLb:{ kind: "select", label: { de: "Hantelstange", en: "Barbell" }, options: [
      ["45", { de: "45 lb (Olympia)", en: "45 lb (Olympic)" }], ["35", { de: "35 lb (Damen)", en: "35 lb (women)" }]
    ], def: "45", imperialOnly: true },
    target: { kind: "mass", label: { de: "Ziel-Gesamtgewicht", en: "Target total weight" }, ph: { metric: "100", imperial: "225" } }
  };

  /* ---------- Interpretations-Helfer ---------- */
  function band(val, ranges) {
    // ranges: [[max, {de,en}, color], ...] ; letzte max = Infinity
    for (const r of ranges) if (val <= r[0]) return { text: r[1], color: r[2] };
    return { text: ranges[ranges.length - 1][1], color: ranges[ranges.length - 1][2] };
  }

  /* ==========================================================================
     RECHNER-DEFINITIONEN
     ========================================================================== */

  const CALCS = [
    /* ---------------- BODY ---------------- */
    {
      id: "bmi", cat: "body", icon: "⚖️",
      title: { de: "BMI-Rechner", en: "BMI Calculator" },
      desc: { de: "Body-Mass-Index — ist dein Gewicht im gesunden Bereich für deine Größe?", en: "Body Mass Index — is your weight in a healthy range for your height?" },
      fields: ["height", "weight"],
      compute(M) {
        const h = M.height / 100, bmi = M.weight / (h * h);
        const b = band(bmi, [[18.5, { de: "Untergewicht", en: "Underweight" }, "amber"], [25, { de: "Normalgewicht", en: "Normal weight" }, "green"], [30, { de: "Übergewicht", en: "Overweight" }, "amber"], [99, { de: "Adipositas", en: "Obese" }, "red"]]);
        return {
          primary: { value: bmi.toFixed(1), unit: "kg/m²", label: { de: "Dein BMI", en: "Your BMI" } },
          tag: b,
          gauge: { value: bmi, min: 15, max: 40 },
          subs: [
            { label: { de: "Kategorie", en: "Category" }, value: tr(b.text) },
            { label: { de: "Gesunder Bereich für dich", en: "Healthy range for you" }, value: fmtKg(18.5 * h * h, 0) + " – " + fmtKg(25 * h * h, 0) }
          ],
          interpret: { de: "Der BMI ist ein grober Bevölkerungs-Richtwert und unterscheidet nicht zwischen Muskel und Fett. Muskulöse Männer landen oft fälschlich im „Übergewicht“. Nutze zusätzlich Bauchumfang (WHtR) und Körperfett.", en: "BMI is a rough population estimate and doesn't distinguish muscle from fat. Muscular men often land falsely in 'overweight'. Combine it with waist (WHtR) and body fat." }
        };
      }
    },
    {
      id: "navy", cat: "body", icon: "🎯",
      title: { de: "Körperfett (US Navy)", en: "Body Fat (US Navy)" },
      desc: { de: "Schätzt deinen Körperfettanteil mit der Standard-US-Navy-Umfangformel.", en: "Estimates your body fat using the standard US Navy circumference formula." },
      fields: ["sex", "height", "neck", "waist", "hip"],
      compute(M) {
        const h = M.height, log = Math.log10;
        let bf;
        if (M.sex === "female") bf = 163.205 * log(M.waist + M.hip - M.neck) - 97.684 * log(h) - 78.387;
        else bf = 86.010 * log(M.waist - M.neck) - 70.041 * log(h) + 36.76;
        bf = Math.max(2, Math.min(60, bf));
        const male = M.sex !== "female";
        const b = band(bf, male
          ? [[6, { de: "Essentiell/Wettkampf", en: "Essential/Stage" }, "amber"], [14, { de: "Athletisch", en: "Athletic" }, "green"], [18, { de: "Fitness", en: "Fitness" }, "green"], [25, { de: "Durchschnitt", en: "Average" }, "amber"], [99, { de: "Erhöht", en: "High" }, "red"]]
          : [[14, { de: "Essentiell", en: "Essential" }, "amber"], [21, { de: "Athletisch", en: "Athletic" }, "green"], [25, { de: "Fitness", en: "Fitness" }, "green"], [32, { de: "Durchschnitt", en: "Average" }, "amber"], [99, { de: "Erhöht", en: "High" }, "red"]]);
        const fatKg = M.weight ? M.weight * bf / 100 : null;
        const subs = [{ label: { de: "Einordnung", en: "Classification" }, value: tr(b.text) }];
        if (fatKg) { subs.push({ label: { de: "Fettmasse", en: "Fat mass" }, value: fmtKg(fatKg) }); subs.push({ label: { de: "Fettfreie Masse", en: "Lean mass" }, value: fmtKg(M.weight - fatKg) }); }
        return {
          primary: { value: bf.toFixed(1), unit: "%", label: { de: "Körperfettanteil", en: "Body fat" } },
          tag: b, gauge: { value: bf, min: 5, max: 40 }, subs,
          interpret: { de: "Die Navy-Methode ist auf ±3–4 % genau und braucht nur ein Maßband. Miss morgens, entspannt, ohne den Bauch einzuziehen. Für die Fettmasse gib zusätzlich dein Gewicht an.", en: "The Navy method is accurate to ±3–4% and needs only a tape measure. Measure in the morning, relaxed, without sucking in. Add your weight to also get fat mass." }
        };
      },
      extraFields: ["weight"]
    },
    {
      id: "skinfold", cat: "body", icon: "🤏",
      title: { de: "Caliper-Körperfett (4 Falten)", en: "Skinfold Body Fat (4-site)" },
      desc: { de: "Körperfett über 4 Hautfalten (Durnin/Womersley) — präziser mit Caliper.", en: "Body fat from 4 skinfolds (Durnin/Womersley) — more precise with a caliper." },
      fields: ["sex", "age", "sf1", "sf2", "sf3", "sf4"],
      compute(M) {
        const S = M.sf1 + M.sf2 + M.sf3 + M.sf4, a = M.age, male = M.sex !== "female", log = Math.log10;
        let c, m;
        if (male) {
          if (a < 20) { c = 1.1620; m = 0.0630; } else if (a < 30) { c = 1.1631; m = 0.0632; }
          else if (a < 40) { c = 1.1422; m = 0.0544; } else if (a < 50) { c = 1.1620; m = 0.0700; } else { c = 1.1715; m = 0.0779; }
        } else {
          if (a < 20) { c = 1.1549; m = 0.0678; } else if (a < 30) { c = 1.1599; m = 0.0717; }
          else if (a < 40) { c = 1.1423; m = 0.0632; } else if (a < 50) { c = 1.1333; m = 0.0612; } else { c = 1.1339; m = 0.0645; }
        }
        const density = c - m * log(S);
        let bf = 495 / density - 450; bf = Math.max(2, Math.min(60, bf));
        const b = band(bf, male
          ? [[14, { de: "Athletisch", en: "Athletic" }, "green"], [18, { de: "Fitness", en: "Fitness" }, "green"], [25, { de: "Durchschnitt", en: "Average" }, "amber"], [99, { de: "Erhöht", en: "High" }, "red"]]
          : [[21, { de: "Athletisch", en: "Athletic" }, "green"], [25, { de: "Fitness", en: "Fitness" }, "green"], [32, { de: "Durchschnitt", en: "Average" }, "amber"], [99, { de: "Erhöht", en: "High" }, "red"]]);
        return {
          primary: { value: bf.toFixed(1), unit: "%", label: { de: "Körperfettanteil", en: "Body fat" } },
          tag: b, gauge: { value: bf, min: 5, max: 40 },
          subs: [
            { label: { de: "Summe der Falten", en: "Sum of folds" }, value: S.toFixed(0) + " mm" },
            { label: { de: "Körperdichte", en: "Body density" }, value: density.toFixed(4) + " g/cm³" },
            { label: { de: "Einordnung", en: "Classification" }, value: tr(b.text) }
          ],
          interpret: { de: "Falten an der rechten Körperhälfte messen: Bizeps & Trizeps (vorne/hinten Oberarm, Mitte), Subscapular (unter dem Schulterblatt), Suprailiac (über dem Beckenkamm). 2–3 Messungen mitteln.", en: "Measure on the right side of the body: biceps & triceps (front/back of upper arm, mid), subscapular (below shoulder blade), suprailiac (above hip bone). Average 2–3 readings." }
        };
      }
    },
    {
      id: "berkhan", cat: "body", icon: "🧬",
      title: { de: "Muskel-Limit (Berkhan)", en: "MMP Calculator (Berkhan)" },
      desc: { de: "Dein genetisches Muskel-Maximum nach Martin Berkhan — für natural trainierende Männer.", en: "Your genetic muscle ceiling by Martin Berkhan — for drug-free male athletes." },
      fields: ["height"],
      compute(M) {
        const cm = M.height;
        const stage = cm - 100;            // ~5–6 % KFA (Bühnenform)
        const lean = stage * 1.08;         // ~8–10 % KFA
        const off = stage * 1.15;          // ~12–14 % KFA, sustainable
        return {
          primary: { value: fmtKg(stage, 1).split(" ")[0], unit: massU(), label: { de: "Max. Bühnengewicht (~5 % KFA)", en: "Max stage weight (~5% BF)" } },
          gauge: null,
          subs: [
            { label: { de: "Lean (~8–10 % KFA)", en: "Lean (~8–10% BF)" }, value: fmtKg(lean) },
            { label: { de: "Off-Season (~12–14 % KFA)", en: "Off-season (~12–14% BF)" }, value: fmtKg(off) }
          ],
          interpret: { de: "Faustformel: maximales Wettkampfgewicht in kg ≈ Körpergröße in cm − 100, bei ~5 % Körperfett nach Jahren ernsthaften Trainings. Kleinere/größere Rahmen weichen ab. Ein realistischer Richtwert gegen unrealistische Erwartungen.", en: "Rule of thumb: max contest weight in kg ≈ height in cm − 100, at ~5% body fat after years of serious training. Smaller/larger frames deviate. A realistic anchor against unrealistic expectations." }
        };
      }
    },
    {
      id: "whtr", cat: "body", icon: "📏",
      title: { de: "Taille-zu-Größe (WHtR)", en: "Waist-to-Height (WHtR)" },
      desc: { de: "Bauchumfang im Verhältnis zur Größe — starker Marker für Herz-Kreislauf-Risiko.", en: "Waist relative to height — a strong marker for cardiovascular risk." },
      fields: ["height", "waist"],
      compute(M) {
        const r = M.waist / M.height;
        const b = band(r, [[0.4, { de: "Schlank", en: "Slim" }, "amber"], [0.5, { de: "Gesund", en: "Healthy" }, "green"], [0.6, { de: "Erhöhtes Risiko", en: "Increased risk" }, "amber"], [9, { de: "Hohes Risiko", en: "High risk" }, "red"]]);
        return {
          primary: { value: r.toFixed(2), unit: "", label: { de: "Taille-zu-Größe-Verhältnis", en: "Waist-to-height ratio" } },
          tag: b, gauge: { value: r, min: 0.35, max: 0.7 },
          subs: [
            { label: { de: "Einordnung", en: "Classification" }, value: tr(b.text) },
            { label: { de: "Ziel: Taille unter", en: "Target: waist below" }, value: fmtCm(M.height * 0.5) }
          ],
          interpret: { de: "Leitlinien (u. a. NICE) empfehlen, die Taille unter der Hälfte der Körpergröße zu halten (Verhältnis < 0,5). Das ist oft aussagekräftiger als der BMI. Kein Diagnose-Ersatz.", en: "Guidelines (e.g. NICE) recommend keeping your waist below half your height (ratio < 0.5). Often more telling than BMI. Not a diagnosis." }
        };
      }
    },
    {
      id: "lbm", cat: "body", icon: "💪",
      title: { de: "Fettfreie Masse (LBM)", en: "Lean Body Mass" },
      desc: { de: "Gewicht von allem außer Fett (Muskeln, Knochen, Wasser) — Boer-Formel.", en: "The weight of everything except fat (muscle, bone, water) — Boer formula." },
      fields: ["sex", "height", "weight"],
      compute(M) {
        let lbm;
        if (M.sex === "female") lbm = 0.252 * M.weight + 0.473 * M.height - 48.3;
        else lbm = 0.407 * M.weight + 0.267 * M.height - 19.2;
        const bf = (M.weight - lbm) / M.weight * 100;
        return {
          primary: { value: fmtKg(lbm).split(" ")[0], unit: massU(), label: { de: "Fettfreie Masse", en: "Lean body mass" } },
          subs: [
            { label: { de: "Fettmasse (geschätzt)", en: "Fat mass (est.)" }, value: fmtKg(M.weight - lbm) },
            { label: { de: "Körperfett (geschätzt)", en: "Body fat (est.)" }, value: bf.toFixed(1) + " %" }
          ],
          interpret: { de: "Die Boer-Formel schätzt LBM aus Größe und Gewicht. Für den Muskelaufbau ist LBM die Basis: Sie skaliert Kalorien (Cunningham), Protein und FFMI. Mit gemessenem Körperfett wird es exakter.", en: "The Boer formula estimates LBM from height and weight. LBM is the basis for muscle building: it scales calories (Cunningham), protein and FFMI. Measured body fat makes it more exact." }
        };
      }
    },

    /* ---------------- ENERGY ---------------- */
    {
      id: "cunningham", cat: "energy", icon: "🔥",
      title: { de: "Cunningham (BMR)", en: "Cunningham Calculator" },
      desc: { de: "Der athletische Goldstandard für den Grundumsatz — skaliert über fettfreie Masse.", en: "The athletic gold standard for BMR — scaled by lean body mass." },
      fields: ["sex", "height", "weight", "bodyfat"],
      compute(M) {
        let lbm;
        if (M.bodyfat) lbm = M.weight * (1 - M.bodyfat / 100);
        else lbm = (M.sex === "female") ? 0.252 * M.weight + 0.473 * M.height - 48.3 : 0.407 * M.weight + 0.267 * M.height - 19.2;
        const bmr = 500 + 22 * lbm;
        return {
          primary: { value: Math.round(bmr), unit: "kcal", label: { de: "Grundumsatz (BMR)", en: "Basal metabolic rate" } },
          subs: [
            { label: { de: "Verwendete LBM", en: "LBM used" }, value: fmtKg(lbm) },
            { label: { de: "LBM-Quelle", en: "LBM source" }, value: M.bodyfat ? (LANG() === "de" ? "aus Körperfett" : "from body fat") : (LANG() === "de" ? "Boer-Schätzung" : "Boer estimate") }
          ],
          interpret: { de: "Cunningham (500 + 22 × LBM) ist bei trainierten, muskulösen Menschen genauer als Mifflin, weil es direkt die fettfreie Masse nutzt. Gib dein Körperfett an, sonst wird die LBM geschätzt.", en: "Cunningham (500 + 22 × LBM) is more accurate than Mifflin for trained, muscular people because it uses lean mass directly. Enter your body fat, otherwise LBM is estimated." }
        };
      }
    },
    {
      id: "bmr", cat: "energy", icon: "🌡️",
      title: { de: "BMR-Rechner", en: "BMR Calculator" },
      desc: { de: "Grundumsatz in Ruhe nach Mifflin-St-Jeor — die meistgenutzte Formel.", en: "Resting calories at rest via Mifflin-St Jeor — the most-used formula." },
      fields: ["sex", "age", "height", "weight"],
      compute(M) {
        const base = 10 * M.weight + 6.25 * M.height - 5 * M.age;
        const bmr = base + (M.sex === "female" ? -161 : 5);
        return {
          primary: { value: Math.round(bmr), unit: "kcal", label: { de: "Grundumsatz (BMR)", en: "Basal metabolic rate" } },
          subs: [
            { label: { de: "Sitzend (×1,2)", en: "Sedentary (×1.2)" }, value: Math.round(bmr * 1.2) + " kcal" },
            { label: { de: "Mäßig aktiv (×1,55)", en: "Moderate (×1.55)" }, value: Math.round(bmr * 1.55) + " kcal" }
          ],
          interpret: { de: "Der BMR ist die Energie, die dein Körper in völliger Ruhe verbraucht. Multipliziert mit deinem Aktivitätsfaktor ergibt sich der Tagesbedarf (TDEE). Für die Tagesplanung nutze den TDEE-Rechner.", en: "BMR is the energy your body burns at complete rest. Multiplied by your activity factor it gives total daily needs (TDEE). For planning use the TDEE calculator." }
        };
      }
    },
    {
      id: "tdee", cat: "energy", icon: "⚡",
      title: { de: "TDEE-Rechner", en: "TDEE Calculator" },
      desc: { de: "Dein tatsächlicher Kalorienverbrauch pro Tag inkl. Aktivität — plus Ziel-Kalorien.", en: "Your real daily calorie burn including activity — plus goal calories." },
      fields: ["sex", "age", "height", "weight", "activity"],
      compute(M) {
        const bmr = 10 * M.weight + 6.25 * M.height - 5 * M.age + (M.sex === "female" ? -161 : 5);
        const tdee = bmr * parseFloat(M.activity);
        return {
          primary: { value: Math.round(tdee), unit: "kcal", label: { de: "Tagesbedarf (TDEE)", en: "Daily needs (TDEE)" } },
          subs: [
            { label: { de: "Fettabbau (−20 %)", en: "Fat loss (−20%)" }, value: Math.round(tdee * 0.8) + " kcal" },
            { label: { de: "Halten", en: "Maintain" }, value: Math.round(tdee) + " kcal" },
            { label: { de: "Aufbau (+12 %)", en: "Lean bulk (+12%)" }, value: Math.round(tdee * 1.12) + " kcal" },
            { label: { de: "Grundumsatz", en: "BMR" }, value: Math.round(bmr) + " kcal" }
          ],
          interpret: { de: "Der TDEE ist dein realistischer Tagesverbrauch. Für planbaren Fettabbau ca. 15–20 % darunter essen, für sauberen Aufbau leicht darüber. Nach 2–3 Wochen anhand der Waage nachjustieren.", en: "TDEE is your realistic daily burn. For steady fat loss eat ~15–20% below it, for clean gains slightly above. Re-adjust after 2–3 weeks based on the scale." }
        };
      }
    },
    {
      id: "protein", cat: "energy", icon: "🥩",
      title: { de: "Protein-Rechner", en: "Protein Calculator" },
      desc: { de: "Optimale Eiweißzufuhr nach Körpergewicht und Ziel — der wichtigste Makro.", en: "Optimal protein intake by body weight and goal — the key macro." },
      fields: ["weight", "goal"],
      compute(M) {
        const f = M.goal === "cut" ? [2.0, 2.4] : M.goal === "bulk" ? [1.6, 2.0] : [1.6, 2.2];
        const lo = M.weight * f[0], hi = M.weight * f[1], mid = (lo + hi) / 2;
        return {
          primary: { value: Math.round(lo) + "–" + Math.round(hi), unit: "g", label: { de: "Protein pro Tag", en: "Protein per day" } },
          subs: [
            { label: { de: "Empfehlung", en: "Recommended" }, value: f[0] + "–" + f[1] + " g/kg" },
            { label: { de: "Pro Mahlzeit (4×)", en: "Per meal (4×)" }, value: Math.round(mid / 4) + " g" },
            { label: { de: "≈ Kalorien aus Protein", en: "≈ calories from protein" }, value: Math.round(mid * 4) + " kcal" }
          ],
          interpret: { de: "Im Defizit hilft mehr Protein (2,0–2,4 g/kg), Muskeln zu schützen und satt zu bleiben. Verteile es auf 3–4 Mahlzeiten mit je 30–50 g. Bei hohem Körperfett auf das Zielgewicht beziehen.", en: "In a deficit, higher protein (2.0–2.4 g/kg) helps protect muscle and keep you full. Spread it across 3–4 meals of 30–50 g. If body fat is high, base it on target weight." }
        };
      }
    },
    {
      id: "macros", cat: "energy", icon: "🍽️",
      title: { de: "Makro-Rechner", en: "Macro Calculator" },
      desc: { de: "Teilt deinen Kalorienbedarf in klare Ziele für Protein, Kohlenhydrate und Fett.", en: "Splits your calorie needs into clear protein, carb and fat targets." },
      fields: ["sex", "age", "height", "weight", "activity", "goal"],
      compute(M) {
        const bmr = 10 * M.weight + 6.25 * M.height - 5 * M.age + (M.sex === "female" ? -161 : 5);
        let cal = bmr * parseFloat(M.activity);
        cal = M.goal === "cut" ? cal * 0.8 : M.goal === "bulk" ? cal * 1.12 : cal;
        const protein = M.weight * (M.goal === "cut" ? 2.2 : 2.0);
        const fat = M.weight * 0.9;
        const carbCal = cal - protein * 4 - fat * 9;
        const carbs = Math.max(0, carbCal / 4);
        return {
          primary: { value: Math.round(cal), unit: "kcal", label: { de: "Ziel-Kalorien", en: "Target calories" } },
          subs: [
            { label: { de: "Protein", en: "Protein" }, value: Math.round(protein) + " g · " + Math.round(protein * 4) + " kcal" },
            { label: { de: "Kohlenhydrate", en: "Carbs" }, value: Math.round(carbs) + " g · " + Math.round(carbs * 4) + " kcal" },
            { label: { de: "Fett", en: "Fat" }, value: Math.round(fat) + " g · " + Math.round(fat * 9) + " kcal" }
          ],
          interpret: { de: "Protein und Fett werden zuerst fixiert (Muskelschutz, Hormone), Kohlenhydrate füllen den Rest und treiben dein Training an. Iss Kohlenhydrate bevorzugt rund ums Training.", en: "Protein and fat are set first (muscle protection, hormones); carbs fill the rest and fuel training. Prioritise carbs around your workouts." }
        };
      }
    },
    {
      id: "water", cat: "energy", icon: "💧",
      title: { de: "Wasserbedarf", en: "Water Intake" },
      desc: { de: "Täglicher Flüssigkeitsbedarf nach Gewicht und Aktivität.", en: "Daily hydration needs by weight and activity." },
      fields: ["weight", "activity"],
      compute(M) {
        const base = M.weight * 33;            // ml
        const add = (parseFloat(M.activity) - 1.2) * 700;
        const ml = base + add;
        const fmtV = units === "imperial" ? (ml / 1000 * 33.814).toFixed(0) + " fl oz" : (ml / 1000).toFixed(1) + " L";
        return {
          primary: { value: fmtV.split(" ")[0], unit: fmtV.split(" ")[1], label: { de: "Wasser pro Tag", en: "Water per day" } },
          subs: [
            { label: { de: "Grundbedarf (33 ml/kg)", en: "Base (33 ml/kg)" }, value: (base / 1000).toFixed(1) + " L" },
            { label: { de: "Aktivitäts-Zuschlag", en: "Activity add-on" }, value: "+" + (add / 1000).toFixed(1) + " L" },
            { label: { de: "Gläser (250 ml)", en: "Glasses (250 ml)" }, value: Math.round(ml / 250) + "" }
          ],
          interpret: { de: "Richtwert: ~33 ml pro kg Körpergewicht plus Zuschlag für Training und Hitze. Über den Tag verteilt trinken; Kaffee und Tee zählen mit. Dunkler Urin ist ein Zeichen für zu wenig.", en: "Guide: ~33 ml per kg body weight plus extra for training and heat. Spread over the day; coffee and tea count. Dark urine signals too little." }
        };
      }
    },

    /* ---------------- STRENGTH ---------------- */
    {
      id: "ffmi", cat: "strength", icon: "🏆",
      title: { de: "FFMI-Rechner", en: "FFMI Calculator" },
      desc: { de: "Fettfreie-Masse-Index — bewertet deine Muskelmasse relativ zur Größe.", en: "Fat-Free Mass Index — scores your muscle mass relative to height." },
      fields: ["height", "weight", "bodyfat"],
      compute(M) {
        const h = M.height / 100, lbm = M.weight * (1 - M.bodyfat / 100);
        const ffmi = lbm / (h * h);
        const norm = ffmi + 6.1 * (1.8 - h);
        const b = band(norm, [[18, { de: "Unterdurchschnittlich", en: "Below average" }, "amber"], [20, { de: "Durchschnitt", en: "Average" }, "green"], [22, { de: "Fortgeschritten", en: "Advanced" }, "green"], [25, { de: "Sehr muskulös (Natural-Limit)", en: "Very muscular (natural limit)" }, "green"], [99, { de: "Über Natural-Bereich", en: "Beyond natural range" }, "red"]]);
        return {
          primary: { value: norm.toFixed(1), unit: "", label: { de: "Normalisierter FFMI", en: "Normalized FFMI" } },
          tag: b, gauge: { value: norm, min: 16, max: 28 },
          subs: [
            { label: { de: "Roher FFMI", en: "Raw FFMI" }, value: ffmi.toFixed(1) },
            { label: { de: "Fettfreie Masse", en: "Fat-free mass" }, value: fmtKg(lbm) },
            { label: { de: "Einordnung", en: "Classification" }, value: tr(b.text) }
          ],
          interpret: { de: "Ein normalisierter FFMI um 25 gilt als oberes Limit für natural trainierende Männer (selten 26–27 mit Top-Genetik). Werte über 28 sind ohne Hilfsmittel praktisch nicht erreichbar. Körperfett ehrlich angeben.", en: "A normalized FFMI around 25 is considered the upper limit for drug-free men (rarely 26–27 with elite genetics). Values above 28 are practically unattainable naturally. Be honest about body fat." }
        };
      }
    },
    {
      id: "ideal", cat: "strength", icon: "🎚️",
      title: { de: "Idealgewicht", en: "Ideal Weight" },
      desc: { de: "Vergleicht klassische Formeln für ein realistisches, gesundes Zielgewicht.", en: "Compares classic formulas for a realistic, healthy target weight." },
      fields: ["sex", "height"],
      compute(M) {
        const inchesOver5ft = Math.max(0, (M.height - 152.4) / 2.54);
        const male = M.sex !== "female";
        const devine = (male ? 50 : 45.5) + 2.3 * inchesOver5ft;
        const robinson = (male ? 52 : 49) + 1.9 * inchesOver5ft;
        const miller = (male ? 56.2 : 53.1) + 1.41 * inchesOver5ft;
        const hamwi = (male ? 48 : 45.5) + 2.7 * inchesOver5ft;
        const h = M.height / 100;
        const avg = (devine + robinson + miller + hamwi) / 4;
        return {
          primary: { value: fmtKg(avg).split(" ")[0], unit: massU(), label: { de: "Idealgewicht (Mittel)", en: "Ideal weight (avg)" } },
          subs: [
            { label: { de: "Gesunder BMI-Bereich", en: "Healthy BMI range" }, value: fmtKg(18.5 * h * h, 0) + " – " + fmtKg(24.9 * h * h, 0) },
            { label: { de: "Devine / Robinson", en: "Devine / Robinson" }, value: fmtKg(devine, 0) + " / " + fmtKg(robinson, 0) },
            { label: { de: "Miller / Hamwi", en: "Miller / Hamwi" }, value: fmtKg(miller, 0) + " / " + fmtKg(hamwi, 0) }
          ],
          interpret: { de: "Diese Formeln stammen aus der Medikamenten-Dosierung und ignorieren Muskelmasse — für Kraftsportler oft zu niedrig. Nutze sie als grobe Spanne, nicht als hartes Ziel. Der BMI-Bereich ist meist realistischer.", en: "These formulas come from drug dosing and ignore muscle mass — often too low for strength athletes. Use them as a rough range, not a hard target. The BMI range is usually more realistic." }
        };
      }
    },
    {
      id: "muscle", cat: "strength", icon: "🦴",
      title: { de: "Muskel-Potenzial (Casey Butt)", en: "Muscle Potential (Casey Butt)" },
      desc: { de: "Maximale natürliche Muskelmasse anhand deines Knochenbaus.", en: "Maximum natural muscle mass based on your frame size." },
      fields: ["height", "wrist", "ankle", "bodyfat"],
      compute(M) {
        const Hin = M.height / 2.54, Win = M.wrist / 2.54, Ain = M.ankle / 2.54;
        const bf = M.bodyfat || 10;
        const maxLbmLb = Math.pow(Hin, 1.5) * (Math.sqrt(Win) / 22.6670 + Math.sqrt(Ain) / 17.0104) * (bf / 224 + 1);
        const maxLbmKg = maxLbmLb / KG;
        const maxWeightKg = maxLbmKg / (1 - bf / 100);
        return {
          primary: { value: fmtKg(maxLbmKg).split(" ")[0], unit: massU(), label: { de: "Max. fettfreie Masse", en: "Max lean body mass" } },
          subs: [
            { label: { de: "Max. Gewicht bei " + bf + " % KFA", en: "Max weight at " + bf + "% BF" }, value: fmtKg(maxWeightKg) },
            { label: { de: "Genutzter Rahmen", en: "Frame used" }, value: (LANG() === "de" ? "Handgelenk " : "wrist ") + fmtCm(M.wrist) + ", " + (LANG() === "de" ? "Knöchel " : "ankle ") + fmtCm(M.ankle) }
          ],
          interpret: { de: "Die Casey-Butt-Formel schätzt dein maximales drug-free Muskelpotenzial aus Größe und Knochenbau (Hand-/Knöchelumfang als Proxy für die Rahmengröße). Ein dickerer Rahmen erlaubt mehr Maximalmasse.", en: "The Casey Butt formula estimates your max drug-free muscle potential from height and frame (wrist/ankle as a proxy for bone size). A larger frame allows more maximal mass." }
        };
      }
    },
    {
      id: "onerm", cat: "strength", icon: "🏋️",
      title: { de: "1RM-Rechner", en: "One-Rep Max (1RM)" },
      desc: { de: "Schätzt dein Maximalgewicht und liefert dir die Trainingsprozente.", en: "Estimates your max lift and gives you training percentages." },
      fields: ["lift", "reps"],
      compute(M) {
        const w = M.lift, r = M.reps;
        const epley = w * (1 + r / 30);
        const brzycki = w * 36 / (37 - r);
        const orm = (epley + brzycki) / 2;
        const pct = [[100, 1], [95, 0.95], [90, 0.9], [85, 0.85], [80, 0.8], [75, 0.75], [70, 0.7]];
        return {
          primary: { value: fmtKg(orm).split(" ")[0], unit: massU(), label: { de: "Geschätztes 1RM", en: "Estimated 1RM" } },
          subs: pct.map(p => ({ label: { de: p[0] + " % (≈ " + (p[0] === 100 ? 1 : p[0] >= 90 ? "2–4" : p[0] >= 80 ? "6–8" : "10–12") + " Wdh.)", en: p[0] + "% (≈ " + (p[0] === 100 ? 1 : p[0] >= 90 ? "2–4" : p[0] >= 80 ? "6–8" : "10–12") + " reps)" }, value: fmtKg(orm * p[1]) })),
          interpret: { de: "Mittelwert aus Epley- und Brzycki-Formel. Am genauesten bei ≤ 8 Wiederholungen. Nutze die Prozente, um Trainingsgewichte zu planen, ohne ständig Maximalversuche zu machen.", en: "Average of the Epley and Brzycki formulas. Most accurate at ≤ 8 reps. Use the percentages to plan working weights without constant max attempts." }
        };
      }
    },
    {
      id: "hr", cat: "strength", icon: "❤️",
      title: { de: "Trainings-Herzfrequenz", en: "Target Heart Rate" },
      desc: { de: "Persönliche Puls-Zonen für gezieltes Cardio-Training.", en: "Personal heart-rate zones to guide cardio intensity." },
      fields: ["age", "restHr"],
      compute(M) {
        const hrMax = Math.round(208 - 0.7 * M.age);   // Tanaka
        const rest = M.restHr || null;
        const zone = (loPct, hiPct) => {
          if (rest) return Math.round(rest + (hrMax - rest) * loPct) + "–" + Math.round(rest + (hrMax - rest) * hiPct) + " bpm";
          return Math.round(hrMax * loPct) + "–" + Math.round(hrMax * hiPct) + " bpm";
        };
        return {
          primary: { value: hrMax, unit: "bpm", label: { de: "Maximalpuls (geschätzt)", en: "Max heart rate (est.)" } },
          subs: [
            { label: { de: "Z1 Aufwärmen (50–60 %)", en: "Z1 Warm-up (50–60%)" }, value: zone(0.5, 0.6) },
            { label: { de: "Z2 Grundlage/Fettverbr. (60–70 %)", en: "Z2 Base/Fat burn (60–70%)" }, value: zone(0.6, 0.7) },
            { label: { de: "Z3 Aerob (70–80 %)", en: "Z3 Aerobic (70–80%)" }, value: zone(0.7, 0.8) },
            { label: { de: "Z4 Schwelle (80–90 %)", en: "Z4 Threshold (80–90%)" }, value: zone(0.8, 0.9) },
            { label: { de: "Z5 Maximal (90–100 %)", en: "Z5 Max (90–100%)" }, value: zone(0.9, 1.0) }
          ],
          interpret: { de: rest ? "Mit Ruhepuls werden die Zonen nach Karvonen (Herzfrequenzreserve) berechnet — genauer und individueller. Den größten Teil des Cardios in Z2 verbringen, kurze harte Intervalle in Z4–Z5." : "Maximalpuls nach Tanaka (208 − 0,7 × Alter). Gib deinen Ruhepuls an für genauere Zonen nach Karvonen. Den größten Teil des Cardios in Z2 verbringen.", en: rest ? "With resting HR the zones use the Karvonen method (heart-rate reserve) — more accurate and individual. Spend most cardio in Z2, short hard intervals in Z4–Z5." : "Max HR via Tanaka (208 − 0.7 × age). Add your resting HR for more accurate Karvonen zones. Spend most cardio in Z2." }
        };
      }
    },
    {
      id: "wilks", cat: "strength", icon: "🥇",
      title: { de: "Wilks-Score", en: "Wilks Score" },
      desc: { de: "Vergleicht Kraftleistung über verschiedene Körpergewichte (Wilks-2, 2020).", en: "Compares strength across body weights (Wilks-2, 2020)." },
      fields: ["sex", "weight", "total"],
      compute(M) {
        const bw = M.weight, total = M.total;
        const C = M.sex === "female"
          ? [-125.4255398, 13.71219419, -0.03307250631, -0.001050400051, 9.38773881462799e-6, -2.3334613884954e-8]
          : [47.46178854, 8.472061379, 0.07369410346, -0.001395833811, 7.07665973070743e-6, -1.20804336482315e-8];
        const denom = C[0] + C[1] * bw + C[2] * bw * bw + C[3] * Math.pow(bw, 3) + C[4] * Math.pow(bw, 4) + C[5] * Math.pow(bw, 5);
        const wilks = total * 600 / denom;
        const b = band(wilks, [[200, { de: "Einsteiger", en: "Novice" }, "amber"], [300, { de: "Mittelstufe", en: "Intermediate" }, "green"], [400, { de: "Fortgeschritten", en: "Advanced" }, "green"], [500, { de: "Elite", en: "Elite" }, "green"], [9999, { de: "Weltklasse", en: "World class" }, "green"]]);
        return {
          primary: { value: wilks.toFixed(1), unit: "", label: { de: "Wilks-2-Score", en: "Wilks-2 score" } },
          tag: b, gauge: { value: wilks, min: 100, max: 600 },
          subs: [
            { label: { de: "Total", en: "Total" }, value: fmtKg(total) },
            { label: { de: "Körpergewicht", en: "Body weight" }, value: fmtKg(bw) },
            { label: { de: "Niveau", en: "Level" }, value: tr(b.text) }
          ],
          interpret: { de: "Der Wilks-Score normiert dein Powerlifting-Total (Kniebeuge + Bankdrücken + Kreuzheben) auf dein Körpergewicht, damit leichte und schwere Athleten vergleichbar werden. Hier mit den aktualisierten Wilks-2-Koeffizienten von 2020.", en: "The Wilks score normalizes your powerlifting total (squat + bench + deadlift) to your body weight so light and heavy athletes are comparable. Uses the updated 2020 Wilks-2 coefficients." }
        };
      }
    },
    {
      id: "plates", cat: "strength", icon: "🟢",
      title: { de: "Hantelscheiben-Rechner", en: "Barbell Plate Calculator" },
      desc: { de: "Welche Scheiben pro Seite für dein Zielgewicht? Spart Kopfrechnen im Gym.", en: "Which plates per side for your target weight? No more mental math in the gym." },
      fields: ["barbell", "barbellLb", "target"],
      compute(M) {
        const bar = parseFloat(units === "imperial" ? (M.barbellLb || 45) : (M.barbell || 20));
        const targetDisp = units === "imperial" ? M.target * KG : M.target; // M.target schon in kg
        const total = M.target;            // kg
        const barKg = units === "imperial" ? bar / KG : bar;
        let perSide = (total - barKg) / 2; // kg pro Seite
        if (perSide < 0) return { primary: { value: "—", unit: "", label: { de: "Zu leicht", en: "Too light" } }, subs: [], interpret: { de: "Das Zielgewicht ist leichter als die Stange.", en: "Target is lighter than the bar itself." } };
        const platesKg = [25, 20, 15, 10, 5, 2.5, 1.25];
        const platesLb = [45, 35, 25, 10, 5, 2.5];
        const set = units === "imperial" ? platesLb : platesKg;
        let remain = units === "imperial" ? perSide * KG : perSide;
        const used = [];
        set.forEach(p => { let n = Math.floor(remain / p + 1e-9); if (n > 0) { used.push(n + " × " + p + (units === "imperial" ? " lb" : " kg")); remain -= n * p; } });
        return {
          primary: { value: used.length ? used.join("  ·  ") : "—", unit: "", label: { de: "Scheiben pro Seite", en: "Plates per side" } },
          big: true,
          subs: [
            { label: { de: "Stange", en: "Bar" }, value: fmtKg(barKg, 0) },
            { label: { de: "Pro Seite", en: "Per side" }, value: fmtKg(perSide) },
            { label: { de: "Rest (nicht abbildbar)", en: "Remainder (can't be loaded)" }, value: (units === "imperial" ? remain.toFixed(1) + " lb" : remain.toFixed(2) + " kg") }
          ],
          interpret: { de: "Lege die schweren Scheiben zuerst innen auf. Standard-Olympia-Stange wiegt 20 kg / 45 lb. Der „Rest“ zeigt, ob dein Zielgewicht mit den üblichen Scheiben überhaupt exakt ladbar ist.", en: "Load the heaviest plates innermost first. A standard Olympic bar weighs 20 kg / 45 lb. The 'remainder' shows whether your target is exactly loadable with common plates." }
        };
      }
    }
  ];

  window.MM_CALCS = CALCS;
  window.MM_TOOLS = { FIELDS, units, setUnits(u) { units = u; try { localStorage.setItem("mm_units", u); } catch (e) {} }, getUnits() { return units; }, toKg, toCm };

  /* ==========================================================================
     RENDERING (nur auf tools.html)
     ========================================================================== */

  const grid = document.getElementById("toolsGrid");
  if (!grid) return;

  let activeCat = "all";

  function catLabel(c) {
    return { body: tr({ de: "Körpermaße", en: "Body Measurements" }), energy: tr({ de: "Kalorien & Energie", en: "Calories & Energy" }), strength: tr({ de: "Kraft & Leistung", en: "Strength & Performance" }) }[c];
  }

  function renderGrid() {
    const list = CALCS.filter(c => activeCat === "all" || c.cat === activeCat);
    grid.innerHTML = list.map(c =>
      '<button class="tool-card" data-calc="' + c.id + '">' +
      '<div class="tool-ico">' + c.icon + '</div>' +
      '<h3>' + tr(c.title) + '</h3>' +
      '<p>' + tr(c.desc) + '</p>' +
      '<span class="tool-cat-tag">' + catLabel(c.cat) + '</span>' +
      '</button>'
    ).join("");
    grid.querySelectorAll("[data-calc]").forEach(b => b.addEventListener("click", () => openCalc(b.dataset.calc)));
  }

  /* ---------- Einzel-Rechner ---------- */
  const view = document.getElementById("calcView");
  const listView = document.getElementById("toolsListView");

  function fieldHTML(key) {
    const f = FIELDS[key];
    const u = MM_TOOLS.getUnits();
    if (f.metricOnly && u === "imperial") return "";
    if (f.imperialOnly && u === "metric") return "";
    const lab = tr(f.label) + (f.unit ? ' <span class="muted">(' + tr(f.unit) + ')</span>' : "");
    let inner = "";
    if (f.kind === "select") {
      inner = '<select id="cf_' + key + '" data-fkey="' + key + '">' +
        f.options.map(o => '<option value="' + o[0] + '"' + (o[0] === f.def ? " selected" : "") + '>' + tr(o[1]) + '</option>').join("") + '</select>';
    } else if (f.kind === "height") {
      if (u === "imperial") {
        inner = '<div style="display:flex;gap:10px"><input type="number" id="cf_height_ft" data-fkey="height_ft" placeholder="5" inputmode="numeric" style="flex:1"><span style="align-self:center;color:var(--muted)">ft</span>' +
          '<input type="number" id="cf_height_in" data-fkey="height_in" placeholder="10" inputmode="numeric" style="flex:1"><span style="align-self:center;color:var(--muted)">in</span></div>';
      } else {
        inner = '<input type="number" id="cf_height" data-fkey="height" placeholder="180" inputmode="numeric"><span class="muted small">cm</span>';
      }
    } else {
      const ph = typeof f.ph === "object" ? (f.ph[u] || f.ph.metric) : f.ph;
      const unitLabel = f.kind === "mass" ? massU() : f.kind === "len" ? lenU() : "";
      inner = '<div style="display:flex;gap:8px;align-items:center"><input type="number" id="cf_' + key + '" data-fkey="' + key + '" placeholder="' + (ph || "") + '" inputmode="decimal" style="flex:1">' +
        (unitLabel ? '<span class="muted" style="font-family:var(--font-mono);font-size:0.85rem">' + unitLabel + '</span>' : "") + '</div>';
    }
    return '<div class="field"><label>' + lab + '</label>' + inner + '</div>';
  }

  function openCalc(id) {
    const c = CALCS.find(x => x.id === id);
    if (!c) return;
    listView.style.display = "none";
    view.style.display = "";

    let fields = c.fields.slice();
    if (c.extraFields) fields = fields.concat(c.extraFields);
    // hip nur bei Frauen relevant — trotzdem zeigen, aber kennzeichnen

    view.innerHTML =
      '<button class="btn btn-dark btn-sm" id="calcBack" style="margin-bottom:22px">' + tr({ de: "← Alle Rechner", en: "← All calculators" }) + '</button>' +
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px"><div class="tool-ico">' + c.icon + '</div>' +
      '<h1 class="h-section" style="font-size:clamp(1.5rem,3vw,2rem)">' + tr(c.title) + '</h1></div>' +
      '<p class="lead" style="font-size:1rem;margin-bottom:26px">' + tr(c.desc) + '</p>' +
      '<div class="unit-toggle" id="unitToggle">' +
      '<button data-u="metric"' + (MM_TOOLS.getUnits() === "metric" ? ' class="active"' : "") + '>Metrisch (kg/cm)</button>' +
      '<button data-u="imperial"' + (MM_TOOLS.getUnits() === "imperial" ? ' class="active"' : "") + '>Imperial (lb/in)</button>' +
      '</div>' +
      '<div class="calc-layout"><div><div class="calc-inputs" id="calcInputs">' +
      fields.map(fieldHTML).join("") +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:8px">' +
      '<button class="btn btn-primary" id="calcRun">' + tr({ de: "Berechnen", en: "Calculate" }) + '</button>' +
      '<button class="btn btn-ghost" id="calcReset">' + tr({ de: "Zurücksetzen", en: "Reset" }) + '</button></div>' +
      '<p class="tool-disclaimer">' + tr({ de: "Orientierungswert auf Basis etablierter Formeln — keine ärztliche Diagnostik.", en: "Estimate based on established formulas — not medical diagnostics." }) + '</p>' +
      '</div>' +
      '<div class="calc-result-card" id="calcResult"><p class="muted">' + tr({ de: "Fülle die Felder aus und klicke „Berechnen“.", en: "Fill in the fields and click 'Calculate'." }) + '</p></div>' +
      '</div>';

    view.querySelector("#calcBack").addEventListener("click", closeCalc);
    view.querySelector("#calcRun").addEventListener("click", () => runCalc(c));
    view.querySelector("#calcReset").addEventListener("click", () => openCalc(id));
    view.querySelectorAll("#unitToggle button").forEach(b => b.addEventListener("click", () => {
      MM_TOOLS.setUnits(b.dataset.u);
      openCalc(id);
    }));
    view.querySelectorAll("#calcInputs input").forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter") runCalc(c); }));
    view._calcId = id;
    try { if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id); } catch (e) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeCalc() {
    view.style.display = "none";
    view._calcId = null;
    listView.style.display = "";
    try { if (location.hash) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }

  function gatherMetric(c) {
    const u = MM_TOOLS.getUnits();
    const M = {};
    let missing = false;
    const get = (k) => { const el = document.getElementById("cf_" + k); return el ? el.value.trim() : ""; };

    let fields = c.fields.slice(); if (c.extraFields) fields = fields.concat(c.extraFields);
    fields.forEach(key => {
      const f = FIELDS[key];
      if (f.metricOnly && u === "imperial") return;
      if (f.imperialOnly && u === "metric") return;
      if (f.kind === "select") { M[key] = get(key); return; }
      if (f.kind === "height") {
        if (u === "imperial") {
          const ft = parseFloat(get("height_ft")) || 0, inch = parseFloat(get("height_in")) || 0;
          const cm = (ft * 12 + inch) * 2.54;
          if (!ft && !inch) missing = true; M.height = cm;
        } else { const v = parseFloat(get("height")); if (isNaN(v)) missing = true; M.height = v; }
        return;
      }
      const raw = get(key);
      if (raw === "") { if (!f.optional && !(key === "hip" && M.sex !== "female") && !(c.extraFields && c.extraFields.indexOf(key) >= 0)) missing = true; M[key] = f.optional ? 0 : NaN; return; }
      let v = parseFloat(raw);
      if (f.kind === "mass") v = toKg(v);
      else if (f.kind === "len") v = toCm(v);
      M[key] = v;
    });
    // hip nicht zwingend bei Männern
    if (c.id === "navy" && M.sex !== "female") missing = missing && false;
    return { M, missing };
  }

  function runCalc(c) {
    const { M, missing } = gatherMetric(c);
    const res = document.getElementById("calcResult");
    // Validierung: alle Pflichtfelder vorhanden?
    let bad = false;
    let fields = c.fields.slice(); if (c.extraFields) fields = fields.concat(c.extraFields);
    fields.forEach(k => {
      const f = FIELDS[k];
      if (f.kind === "select" || f.kind === "height" || f.optional) return;
      if (k === "hip" && M.sex !== "female") return;
      if (c.extraFields && c.extraFields.indexOf(k) >= 0 && (isNaN(M[k]) || M[k] === 0)) return; // optionale Extras
      if (isNaN(M[k])) { bad = true; const el = document.getElementById("cf_" + k); if (el) el.classList.add("invalid"); }
    });
    if (isNaN(M.height) && c.fields.indexOf("height") >= 0) bad = true;
    if (bad) { if (window.MM) MM.toast(tr({ de: "Bitte Pflichtfelder ausfüllen", en: "Please fill the required fields" })); return; }

    let out;
    try { out = c.compute(M); } catch (e) { res.innerHTML = '<p class="muted">' + tr({ de: "Eingaben prüfen.", en: "Check your inputs." }) + '</p>'; return; }
    if (window.MM && MM.track) MM.track("calculator_used", { calc: c.id });

    let html = '<div class="calc-result-label">' + tr(out.primary.label) + '</div>' +
      '<div class="calc-big-num"' + (out.big ? ' style="font-size:1.4rem;line-height:1.4"' : "") + '>' + out.primary.value + (out.primary.unit ? ' <small>' + out.primary.unit + '</small>' : "") + '</div>';
    if (out.tag) html += '<div style="margin-top:10px"><span class="chip ' + (out.tag.color === "green" ? "accent" : out.tag.color === "red" ? "warn" : "warn") + '">' + tr(out.tag.text) + '</span></div>';
    if (out.gauge) {
      const pos = Math.max(0, Math.min(100, (out.gauge.value - out.gauge.min) / (out.gauge.max - out.gauge.min) * 100));
      html += '<div class="calc-gauge"><div class="needle" style="left:' + pos + '%"></div></div>' +
        '<div class="calc-gauge-labels"><span>' + out.gauge.min + '</span><span>' + out.gauge.max + '</span></div>';
    }
    if (out.subs && out.subs.length) {
      html += '<div class="calc-sub-rows">' + out.subs.map(s => '<div class="calc-sub-row"><span>' + tr(s.label) + '</span><span class="v">' + s.value + '</span></div>').join("") + '</div>';
    }
    if (out.interpret) html += '<div class="calc-interpret">' + tr(out.interpret) + '</div>';

    // Kontextuelle Brücke zum nächsten Schritt
    const bridge = {
      body: { de: "Du kennst jetzt deine Zahl — aber ist Körperkomposition wirklich dein größter Hebel? Der kostenlose Score-Check zeigt dir in 10 Min, wo du zuerst ansetzen solltest.", en: "Now you know your number — but is body composition really your biggest lever? The free Score Check shows where to start first." },
      energy: { de: "Zahlen allein ändern nichts. Mit dem kostenlosen Score-Check findest du heraus, ob Ernährung dein größter Hebel ist — oder Schlaf, Training oder Umsetzung.", en: "Numbers alone change nothing. The free Score Check reveals whether nutrition is your biggest lever — or sleep, training or execution." },
      strength: { de: "Stark werden ist ein System, kein Zufall. Der kostenlose Score-Check zeigt dir, welcher Bereich dich aktuell am meisten bremst.", en: "Getting strong is a system, not luck. The free Score Check shows which area is holding you back most right now." }
    }[c.cat] || { de: "", en: "" };
    html += '<div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--line)">' +
      '<div style="font-family:var(--font-mono);font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-2);margin-bottom:8px">' + tr({ de: "Dein nächster Schritt", en: "Your next step" }) + '</div>' +
      '<p class="small muted" style="margin-bottom:14px">' + tr(bridge) + '</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<a href="check.html" class="btn btn-primary btn-sm">' + tr({ de: "Kostenlosen Score-Check machen", en: "Take the free Score Check" }) + '</a>' +
      '<a href="coaching.html" class="btn btn-ghost btn-sm">' + tr({ de: "Coaching ansehen", en: "View coaching" }) + '</a>' +
      '</div></div>';

    res.innerHTML = html;
    res.style.animation = "qIn 0.35s ease";
  }

  /* Kategorie-Filter */
  document.querySelectorAll(".tool-cat-nav .filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".tool-cat-nav .filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCat = chip.dataset.cat;
      renderGrid();
    });
  });

  // Bei Sprachwechsel neu rendern
  document.addEventListener("mm:langchange", () => {
    renderGrid();
    if (view._calcId) openCalc(view._calcId);
  });

  /* Deep-Link: tools.html#protein öffnet direkt den passenden Rechner */
  function openFromHash() {
    var id = (location.hash || "").replace(/^#/, "");
    if (id && CALCS.find(function (x) { return x.id === id; })) openCalc(id);
  }
  window.addEventListener("hashchange", openFromHash);

  renderGrid();
  openFromHash();
})();
