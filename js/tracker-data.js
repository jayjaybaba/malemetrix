/* ==========================================================================
   MaleMetrix Tracker — Übungs-Datenbank & Standard-Pläne
   --------------------------------------------------------------------------
   Jede Übung:
     id     = stabiler Schlüssel (nie ändern — verweist auf gespeicherte Daten)
     muscle = Muskelgruppe (Filter/Insights)
     equip  = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "other"
              (steuert u. a. den Scheiben-Rechner: nur "barbell")
     type   = "weight_reps" (Standard) | "bodyweight_reps" | "time"
     name   = { de, en }
   ========================================================================== */

window.MM_TRK_EXERCISES = [
  /* Brust */
  { id: "bench", muscle: "chest", equip: "barbell", name: { de: "Bankdrücken (Langhantel)", en: "Barbell Bench Press" } },
  { id: "db_bench", muscle: "chest", equip: "dumbbell", name: { de: "Kurzhantel-Bankdrücken", en: "Dumbbell Bench Press" } },
  { id: "incline_bench", muscle: "chest", equip: "barbell", name: { de: "Schrägbankdrücken", en: "Incline Bench Press" } },
  { id: "incline_db", muscle: "chest", equip: "dumbbell", name: { de: "Schräg-Kurzhanteldrücken", en: "Incline Dumbbell Press" } },
  { id: "chest_press", muscle: "chest", equip: "machine", name: { de: "Brustpresse (Maschine)", en: "Machine Chest Press" } },
  { id: "cable_fly", muscle: "chest", equip: "cable", name: { de: "Kabelzug-Fliegende", en: "Cable Fly" } },
  { id: "pec_deck", muscle: "chest", equip: "machine", name: { de: "Butterfly (Maschine)", en: "Pec Deck" } },
  { id: "pushup", muscle: "chest", equip: "bodyweight", type: "bodyweight_reps", name: { de: "Liegestütze", en: "Push-ups" } },
  /* Rücken */
  { id: "deadlift", muscle: "back", equip: "barbell", name: { de: "Kreuzheben", en: "Deadlift" } },
  { id: "pullup", muscle: "back", equip: "bodyweight", type: "bodyweight_reps", name: { de: "Klimmzüge", en: "Pull-ups" } },
  { id: "chinup", muscle: "back", equip: "bodyweight", type: "bodyweight_reps", name: { de: "Klimmzüge (Untergriff)", en: "Chin-ups" } },
  { id: "lat_pulldown", muscle: "back", equip: "cable", name: { de: "Latzug", en: "Lat Pulldown" } },
  { id: "barbell_row", muscle: "back", equip: "barbell", name: { de: "Langhantelrudern", en: "Barbell Row" } },
  { id: "db_row", muscle: "back", equip: "dumbbell", name: { de: "Kurzhantelrudern", en: "Dumbbell Row" } },
  { id: "cable_row", muscle: "back", equip: "cable", name: { de: "Kabelrudern", en: "Seated Cable Row" } },
  { id: "tbar_row", muscle: "back", equip: "barbell", name: { de: "T-Bar-Rudern", en: "T-Bar Row" } },
  { id: "rdl", muscle: "back", equip: "barbell", name: { de: "Rumänisches Kreuzheben", en: "Romanian Deadlift" } },
  { id: "pullover", muscle: "back", equip: "dumbbell", name: { de: "Überzüge", en: "Dumbbell Pullover" } },
  /* Beine */
  { id: "squat", muscle: "legs", equip: "barbell", name: { de: "Kniebeuge (Langhantel)", en: "Barbell Squat" } },
  { id: "front_squat", muscle: "legs", equip: "barbell", name: { de: "Frontkniebeuge", en: "Front Squat" } },
  { id: "leg_press", muscle: "legs", equip: "machine", name: { de: "Beinpresse", en: "Leg Press" } },
  { id: "hack_squat", muscle: "legs", equip: "machine", name: { de: "Hackenschmidt-Kniebeuge", en: "Hack Squat" } },
  { id: "hip_thrust", muscle: "legs", equip: "barbell", name: { de: "Hip Thrust", en: "Hip Thrust" } },
  { id: "lunge", muscle: "legs", equip: "dumbbell", name: { de: "Ausfallschritte", en: "Lunges" } },
  { id: "bulgarian", muscle: "legs", equip: "dumbbell", name: { de: "Bulgarian Split Squat", en: "Bulgarian Split Squat" } },
  { id: "leg_curl", muscle: "legs", equip: "machine", name: { de: "Beinbeuger", en: "Leg Curl" } },
  { id: "leg_ext", muscle: "legs", equip: "machine", name: { de: "Beinstrecker", en: "Leg Extension" } },
  { id: "calf_raise", muscle: "legs", equip: "machine", name: { de: "Wadenheben", en: "Calf Raise" } },
  /* Schultern */
  { id: "ohp", muscle: "shoulders", equip: "barbell", name: { de: "Schulterdrücken (Langhantel)", en: "Overhead Press" } },
  { id: "db_press", muscle: "shoulders", equip: "dumbbell", name: { de: "Kurzhantel-Schulterdrücken", en: "Dumbbell Shoulder Press" } },
  { id: "arnold_press", muscle: "shoulders", equip: "dumbbell", name: { de: "Arnold-Press", en: "Arnold Press" } },
  { id: "lateral_raise", muscle: "shoulders", equip: "dumbbell", name: { de: "Seitheben", en: "Lateral Raise" } },
  { id: "rear_delt_fly", muscle: "shoulders", equip: "dumbbell", name: { de: "Reverse Fliegende", en: "Rear Delt Fly" } },
  { id: "face_pull", muscle: "shoulders", equip: "cable", name: { de: "Face Pull", en: "Face Pull" } },
  { id: "shrug", muscle: "shoulders", equip: "dumbbell", name: { de: "Schulterheben (Shrugs)", en: "Shrugs" } },
  /* Arme */
  { id: "barbell_curl", muscle: "arms", equip: "barbell", name: { de: "Bizeps-Curls (Langhantel)", en: "Barbell Curl" } },
  { id: "db_curl", muscle: "arms", equip: "dumbbell", name: { de: "Bizeps-Curls (Kurzhantel)", en: "Dumbbell Curl" } },
  { id: "hammer_curl", muscle: "arms", equip: "dumbbell", name: { de: "Hammer-Curls", en: "Hammer Curl" } },
  { id: "preacher_curl", muscle: "arms", equip: "machine", name: { de: "Scott-Curls", en: "Preacher Curl" } },
  { id: "cable_curl", muscle: "arms", equip: "cable", name: { de: "Kabel-Curls", en: "Cable Curl" } },
  { id: "tricep_pushdown", muscle: "arms", equip: "cable", name: { de: "Trizeps-Drücken (Kabel)", en: "Tricep Pushdown" } },
  { id: "overhead_tricep", muscle: "arms", equip: "cable", name: { de: "Trizeps über Kopf", en: "Overhead Tricep Ext." } },
  { id: "skullcrusher", muscle: "arms", equip: "barbell", name: { de: "Skull Crusher", en: "Skull Crusher" } },
  { id: "dips", muscle: "arms", equip: "bodyweight", type: "bodyweight_reps", name: { de: "Dips", en: "Dips" } },
  /* Core */
  { id: "plank", muscle: "core", equip: "bodyweight", type: "time", name: { de: "Plank", en: "Plank" } },
  { id: "hanging_leg_raise", muscle: "core", equip: "bodyweight", type: "bodyweight_reps", name: { de: "Hängendes Beinheben", en: "Hanging Leg Raise" } },
  { id: "cable_crunch", muscle: "core", equip: "cable", name: { de: "Kabel-Crunch", en: "Cable Crunch" } },
  { id: "ab_wheel", muscle: "core", equip: "bodyweight", type: "bodyweight_reps", name: { de: "Bauchroller", en: "Ab Wheel" } },
  { id: "russian_twist", muscle: "core", equip: "bodyweight", type: "bodyweight_reps", name: { de: "Russian Twist", en: "Russian Twist" } }
];

window.MM_TRK_MUSCLES = {
  chest: { de: "Brust", en: "Chest" },
  back: { de: "Rücken", en: "Back" },
  legs: { de: "Beine", en: "Legs" },
  shoulders: { de: "Schultern", en: "Shoulders" },
  arms: { de: "Arme", en: "Arms" },
  core: { de: "Core", en: "Core" },
  other: { de: "Sonstige", en: "Other" }
};

window.MM_TRK_TEMPLATES = [
  { id: "fullA", name: { de: "Ganzkörper A", en: "Full Body A" }, exIds: ["squat", "bench", "barbell_row", "leg_curl", "lateral_raise", "plank"] },
  { id: "fullB", name: { de: "Ganzkörper B", en: "Full Body B" }, exIds: ["rdl", "ohp", "lat_pulldown", "lunge", "barbell_curl", "hanging_leg_raise"] },
  { id: "fullC", name: { de: "Ganzkörper C", en: "Full Body C" }, exIds: ["leg_press", "incline_bench", "cable_row", "hip_thrust", "tricep_pushdown", "calf_raise"] },
  { id: "push", name: { de: "Push (Drücken)", en: "Push Day" }, exIds: ["bench", "ohp", "incline_bench", "lateral_raise", "tricep_pushdown", "dips"] },
  { id: "pull", name: { de: "Pull (Ziehen)", en: "Pull Day" }, exIds: ["deadlift", "pullup", "barbell_row", "face_pull", "barbell_curl", "hammer_curl"] },
  { id: "legs", name: { de: "Beine", en: "Leg Day" }, exIds: ["squat", "rdl", "leg_press", "leg_curl", "leg_ext", "calf_raise"] },
  { id: "upper", name: { de: "Oberkörper", en: "Upper Body" }, exIds: ["bench", "barbell_row", "ohp", "lat_pulldown", "barbell_curl", "tricep_pushdown"] },
  { id: "lower", name: { de: "Unterkörper", en: "Lower Body" }, exIds: ["squat", "rdl", "hip_thrust", "leg_curl", "calf_raise", "plank"] }
];

/* Scheiben-Rechner: verfügbare Hantelscheiben (kg) und Standard-Stangengewicht.
   Bei imperial rechnet der Tracker die Werte automatisch in lb um. */
window.MM_TRK_PLATES = {
  barKg: 20,
  platesKg: [25, 20, 15, 10, 5, 2.5, 1.25]
};
