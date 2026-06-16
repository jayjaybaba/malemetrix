/* ==========================================================================
   MaleMetrix Tracker — Übungs-Datenbank & Standard-Pläne
   ========================================================================== */

window.MM_TRK_EXERCISES = [
  /* Brust */
  { id: "bench", muscle: "chest", name: { de: "Bankdrücken (Langhantel)", en: "Barbell Bench Press" } },
  { id: "db_bench", muscle: "chest", name: { de: "Kurzhantel-Bankdrücken", en: "Dumbbell Bench Press" } },
  { id: "incline_bench", muscle: "chest", name: { de: "Schrägbankdrücken", en: "Incline Bench Press" } },
  { id: "chest_press", muscle: "chest", name: { de: "Brustpresse (Maschine)", en: "Machine Chest Press" } },
  { id: "cable_fly", muscle: "chest", name: { de: "Kabelzug-Fliegende", en: "Cable Fly" } },
  { id: "pushup", muscle: "chest", name: { de: "Liegestütze", en: "Push-ups" } },
  /* Rücken */
  { id: "deadlift", muscle: "back", name: { de: "Kreuzheben", en: "Deadlift" } },
  { id: "pullup", muscle: "back", name: { de: "Klimmzüge", en: "Pull-ups" } },
  { id: "lat_pulldown", muscle: "back", name: { de: "Latzug", en: "Lat Pulldown" } },
  { id: "barbell_row", muscle: "back", name: { de: "Langhantelrudern", en: "Barbell Row" } },
  { id: "db_row", muscle: "back", name: { de: "Kurzhantelrudern", en: "Dumbbell Row" } },
  { id: "cable_row", muscle: "back", name: { de: "Kabelrudern", en: "Seated Cable Row" } },
  { id: "rdl", muscle: "back", name: { de: "Rumänisches Kreuzheben", en: "Romanian Deadlift" } },
  /* Beine */
  { id: "squat", muscle: "legs", name: { de: "Kniebeuge (Langhantel)", en: "Barbell Squat" } },
  { id: "leg_press", muscle: "legs", name: { de: "Beinpresse", en: "Leg Press" } },
  { id: "hip_thrust", muscle: "legs", name: { de: "Hip Thrust", en: "Hip Thrust" } },
  { id: "lunge", muscle: "legs", name: { de: "Ausfallschritte", en: "Lunges" } },
  { id: "leg_curl", muscle: "legs", name: { de: "Beinbeuger", en: "Leg Curl" } },
  { id: "leg_ext", muscle: "legs", name: { de: "Beinstrecker", en: "Leg Extension" } },
  { id: "calf_raise", muscle: "legs", name: { de: "Wadenheben", en: "Calf Raise" } },
  /* Schultern */
  { id: "ohp", muscle: "shoulders", name: { de: "Schulterdrücken (Langhantel)", en: "Overhead Press" } },
  { id: "db_press", muscle: "shoulders", name: { de: "Kurzhantel-Schulterdrücken", en: "Dumbbell Shoulder Press" } },
  { id: "lateral_raise", muscle: "shoulders", name: { de: "Seitheben", en: "Lateral Raise" } },
  { id: "face_pull", muscle: "shoulders", name: { de: "Face Pull", en: "Face Pull" } },
  /* Arme */
  { id: "barbell_curl", muscle: "arms", name: { de: "Bizeps-Curls (Langhantel)", en: "Barbell Curl" } },
  { id: "db_curl", muscle: "arms", name: { de: "Bizeps-Curls (Kurzhantel)", en: "Dumbbell Curl" } },
  { id: "hammer_curl", muscle: "arms", name: { de: "Hammer-Curls", en: "Hammer Curl" } },
  { id: "tricep_pushdown", muscle: "arms", name: { de: "Trizeps-Drücken (Kabel)", en: "Tricep Pushdown" } },
  { id: "skullcrusher", muscle: "arms", name: { de: "Skull Crusher", en: "Skull Crusher" } },
  { id: "dips", muscle: "arms", name: { de: "Dips", en: "Dips" } },
  /* Core */
  { id: "plank", muscle: "core", name: { de: "Plank", en: "Plank" } },
  { id: "hanging_leg_raise", muscle: "core", name: { de: "Hängendes Beinheben", en: "Hanging Leg Raise" } },
  { id: "cable_crunch", muscle: "core", name: { de: "Kabel-Crunch", en: "Cable Crunch" } },
  { id: "ab_wheel", muscle: "core", name: { de: "Bauchroller", en: "Ab Wheel" } }
];

window.MM_TRK_MUSCLES = {
  chest: { de: "Brust", en: "Chest" },
  back: { de: "Rücken", en: "Back" },
  legs: { de: "Beine", en: "Legs" },
  shoulders: { de: "Schultern", en: "Shoulders" },
  arms: { de: "Arme", en: "Arms" },
  core: { de: "Core", en: "Core" }
};

window.MM_TRK_TEMPLATES = [
  { id: "fullA", name: { de: "Ganzkörper A", en: "Full Body A" }, exIds: ["squat", "bench", "barbell_row", "leg_curl", "lateral_raise", "plank"] },
  { id: "fullB", name: { de: "Ganzkörper B", en: "Full Body B" }, exIds: ["rdl", "ohp", "lat_pulldown", "lunge", "barbell_curl", "hanging_leg_raise"] },
  { id: "fullC", name: { de: "Ganzkörper C", en: "Full Body C" }, exIds: ["leg_press", "incline_bench", "cable_row", "hip_thrust", "tricep_pushdown", "calf_raise"] },
  { id: "push", name: { de: "Push (Drücken)", en: "Push Day" }, exIds: ["bench", "ohp", "incline_bench", "lateral_raise", "tricep_pushdown", "dips"] },
  { id: "pull", name: { de: "Pull (Ziehen)", en: "Pull Day" }, exIds: ["deadlift", "pullup", "barbell_row", "face_pull", "barbell_curl", "hammer_curl"] },
  { id: "legs", name: { de: "Beine", en: "Leg Day" }, exIds: ["squat", "rdl", "leg_press", "leg_curl", "leg_ext", "calf_raise"] }
];
