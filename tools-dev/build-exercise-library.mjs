#!/usr/bin/env node
/* ==========================================================================
   MaleMetrix — Übungsbibliothek bauen
   --------------------------------------------------------------------------
   Quelle: free-exercise-db (yuhonas), Lizenz "Unlicense" = Public Domain.
   873 Übungen mit Muskelzuordnung, Ausführungsschritten und je zwei Fotos.

   Erzeugt zwei Dateien, beide werden im Tracker NACHGELADEN (nicht im
   <head>), damit die Seite so schnell startet wie vorher:

     js/tracker-library.js  — Metadaten (Name, Muskeln, Gerät, Level, Bild-Slug)
     js/tracker-guide.js    — Ausführungsschritte, nur beim Öffnen eines Details

   Warum getrennt: die Schritte sind ~570 KB, die Metadaten ~200 KB. Wer nur
   eine Übung sucht, soll nicht die Anleitungen aller 873 laden.

   Aufruf:  node tools-dev/build-exercise-library.mjs
            node tools-dev/build-exercise-library.mjs --input /pfad/exercises.json

   WICHTIG — Übungs-IDs sind Fremdschlüssel auf gespeicherte Trainingsdaten.
   Sie dürfen sich NIE ändern. Bibliotheks-IDs tragen das Präfix "fx_",
   kuratierte (js/tracker-data.js) haben keins, eigene "cx…".
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

/* ==========================================================================
   1. MUSKELN — feingranular (17 aus der Quelle) + Zuordnung auf die sechs
   groben Gruppen, die der Tracker seit jeher benutzt (Filter, Insights).
   ========================================================================== */
const MUSCLE_GROUP = {
  chest: "chest",
  lats: "back", "middle back": "back", "lower back": "back", traps: "back",
  shoulders: "shoulders",
  biceps: "arms", triceps: "arms", forearms: "arms",
  quadriceps: "legs", hamstrings: "legs", glutes: "legs", calves: "legs",
  adductors: "legs", abductors: "legs",
  abdominals: "core",
  neck: "other"
};

/* ==========================================================================
   2. GERÄTE — Quelle auf unsere Werte. "equip" steuert u. a. den
   Scheiben-Rechner (nur barbell), deshalb ist die SZ-Curlstange barbell.
   ========================================================================== */
const EQUIP_MAP = {
  barbell: "barbell",
  "e-z curl bar": "barbell",
  dumbbell: "dumbbell",
  kettlebells: "kettlebell",
  cable: "cable",
  machine: "machine",
  "body only": "bodyweight",
  bands: "bands",
  "exercise ball": "other",
  "medicine ball": "other",
  "foam roll": "other",
  other: "other"
};

/* ==========================================================================
   3. DEUTSCHE NAMEN
   --------------------------------------------------------------------------
   Bewusste Entscheidung: KEINE maschinelle Volltext-Übersetzung. Falsche
   Übungsnamen sind schlimmer als englische — im deutschen Gym heißt es
   ohnehin "Lat Pulldown", "Hip Thrust", "Face Pull". Deshalb:

     · Was der Katalog kennt, wird sauber übersetzt.
     · Was er nicht kennt, BLEIBT ENGLISCH. Kein Rateversuch.

   Der Katalog deckt die Übungen ab, die tatsächlich trainiert werden;
   die Ausreißer (Strongman, Dehnvarianten) tragen ihren englischen Namen.
   ========================================================================== */

/* Geräte/Zusätze — wandern in die Klammer hinter den Namen. */
const EQUIP_WORDS = {
  "barbell": "Langhantel",
  "dumbbell": "Kurzhantel",
  "cable": "Kabelzug",
  "cables": "Kabelzug",
  "machine": "Maschine",
  "kettlebell": "Kettlebell",
  "kettlebells": "Kettlebell",
  "band": "Band",
  "bands": "Bänder",
  "smith machine": "Smith-Maschine",
  "smith": "Smith-Maschine",
  "ez-bar": "SZ-Stange",
  "e-z bar": "SZ-Stange",
  "ez bar": "SZ-Stange",
  "ez": "SZ-Stange",
  "v-bar": "V-Griff",
  "bar": "Stange",
  "lever": "Maschine",
  "leverage": "Maschine",
  "plate": "Hantelscheibe",
  "sled": "Schlitten",
  "rope": "Seil",
  "chains": "Ketten",
  "weighted": "mit Zusatzgewicht",
  "bodyweight": "Körpergewicht",
  "suspended": "Schlingentrainer",
  "pulley": "Kabelzug",
  "medicine ball": "Medizinball",
  "exercise ball": "Gymnastikball",
  "stability ball": "Gymnastikball",
  "foam roll": "Faszienrolle",
  "roller": "Rolle"
};

/* Bewegungen — längste Übereinstimmung gewinnt. Reihenfolge egal, der
   Matcher probiert von lang nach kurz. */
const PHRASES = {
  /* Drücken */
  "bench press": "Bankdrücken",
  "incline bench press": "Schrägbankdrücken",
  "decline bench press": "Negativbankdrücken",
  "close-grip bench press": "Bankdrücken (enger Griff)",
  "wide-grip bench press": "Bankdrücken (weiter Griff)",
  "incline press": "Schrägdrücken",
  "decline press": "Negativdrücken",
  "floor press": "Bodendrücken",
  "chest press": "Brustpresse",
  "incline chest press": "Schräg-Brustpresse",
  "shoulder press": "Schulterdrücken",
  "seated shoulder press": "Schulterdrücken sitzend",
  "military press": "Military Press",
  "overhead press": "Überkopfdrücken",
  "push press": "Push Press",
  "arnold press": "Arnold Press",
  "seated press": "Drücken sitzend",
  "leg press": "Beinpresse",
  "press": "Drücken",
  /* Ziehen */
  "deadlift": "Kreuzheben",
  "romanian deadlift": "Rumänisches Kreuzheben",
  "stiff-legged deadlift": "Gestrecktes Kreuzheben",
  "stiff leg deadlift": "Gestrecktes Kreuzheben",
  "sumo deadlift": "Sumo-Kreuzheben",
  "rack pull": "Rack Pull",
  "bent over row": "Vorgebeugtes Rudern",
  "bent-over row": "Vorgebeugtes Rudern",
  "upright row": "Aufrechtes Rudern",
  "seated row": "Rudern sitzend",
  "one-arm row": "Einarmiges Rudern",
  "one-arm upright row": "Einarmiges aufrechtes Rudern",
  "inverted row": "Umgekehrtes Rudern",
  "t-bar row": "T-Bar-Rudern",
  "row": "Rudern",
  "rows": "Rudern",
  "lat pulldown": "Latzug",
  "pulldown": "Latzug",
  "straight-arm pulldown": "Überzüge am Kabel",
  "pullover": "Überzüge",
  "bent-arm pullover": "Überzüge (angewinkelt)",
  "pull-up": "Klimmzüge",
  "pull up": "Klimmzüge",
  "pullup": "Klimmzüge",
  "pullups": "Klimmzüge",
  "chin-up": "Klimmzüge (Untergriff)",
  "chin up": "Klimmzüge (Untergriff)",
  "face pull": "Face Pull",
  "shrug": "Schulterheben",
  "shrugs": "Schulterheben",
  /* Beine */
  "squat": "Kniebeuge",
  "squats": "Kniebeugen",
  "front squat": "Frontkniebeuge",
  "back squat": "Kniebeuge",
  "hack squat": "Hackenschmidt-Kniebeuge",
  "box squat": "Box-Kniebeuge",
  "split squat": "Split Squat",
  "bulgarian split squat": "Bulgarian Split Squat",
  "pistol squat": "Pistol Squat",
  "sumo squat": "Sumo-Kniebeuge",
  "goblet squat": "Goblet Squat",
  "overhead squat": "Überkopfkniebeuge",
  "lunge": "Ausfallschritt",
  "lunges": "Ausfallschritte",
  "walking lunge": "Gehende Ausfallschritte",
  "step ups": "Step-ups",
  "step up": "Step-up",
  "leg extension": "Beinstrecker",
  "leg curl": "Beinbeuger",
  "lying leg curl": "Beinbeuger liegend",
  "seated leg curl": "Beinbeuger sitzend",
  "calf raise": "Wadenheben",
  "seated calf raise": "Wadenheben sitzend",
  "standing calf raise": "Wadenheben stehend",
  "hip thrust": "Hip Thrust",
  "glute bridge": "Glute Bridge",
  "good morning": "Good Morning",
  "good mornings": "Good Mornings",
  "hip extension": "Hüftstrecken",
  "hip adduction": "Adduktoren-Maschine",
  "hip abduction": "Abduktoren-Maschine",
  /* Arme */
  "bicep curl": "Bizeps-Curls",
  "biceps curl": "Bizeps-Curls",
  "curl": "Curls",
  "curls": "Curls",
  "hammer curl": "Hammer-Curls",
  "hammer curls": "Hammer-Curls",
  "preacher curl": "Scott-Curls",
  "concentration curl": "Konzentrationscurls",
  "spider curl": "Spider-Curls",
  "wrist curl": "Handgelenk-Curls",
  "reverse curl": "Reverse Curls",
  "triceps extension": "Trizepsstrecken",
  "tricep extension": "Trizepsstrecken",
  "overhead triceps extension": "Trizepsstrecken über Kopf",
  "incline triceps extension": "Trizepsstrecken schräg",
  "decline triceps extension": "Trizepsstrecken negativ",
  "lying triceps extension": "Trizepsstrecken liegend",
  "triceps pushdown": "Trizepsdrücken am Kabel",
  "pushdown": "Trizepsdrücken am Kabel",
  "kickback": "Kickbacks",
  "kickbacks": "Kickbacks",
  "skullcrusher": "Skull Crusher",
  "dip": "Dips",
  "dips": "Dips",
  "close-grip push-up": "Enge Liegestütze",
  /* Schultern / Brust isoliert */
  "lateral raise": "Seitheben",
  "side lateral raise": "Seitheben",
  "front raise": "Frontheben",
  "rear delt raise": "Reverse Fliegende",
  "rear delt fly": "Reverse Fliegende",
  "reverse fly": "Reverse Fliegende",
  "reverse flyes": "Reverse Fliegende",
  "fly": "Fliegende",
  "flyes": "Fliegende",
  "chest fly": "Fliegende",
  "crossover": "Crossover",
  "shoulder raise": "Schulterheben",
  "external rotation": "Außenrotation",
  "internal rotation": "Innenrotation",
  /* Rumpf */
  "crunch": "Crunch",
  "crunches": "Crunches",
  "reverse crunch": "Reverse Crunch",
  "ab crunch": "Bauch-Crunch",
  "cable crunch": "Kabel-Crunch",
  "sit-up": "Sit-up",
  "sit up": "Sit-up",
  "situp": "Sit-up",
  "leg raise": "Beinheben",
  "hanging leg raise": "Hängendes Beinheben",
  "knee raise": "Knieheben",
  "hanging knee raise": "Hängendes Knieheben",
  "plank": "Plank",
  "side plank": "Seitlicher Plank",
  "russian twist": "Russian Twist",
  "side bend": "Seitbeugen",
  "ab roller": "Bauchroller",
  "wood chop": "Holzhacker",
  "mountain climber": "Mountain Climber",
  "hyperextension": "Hyperextension",
  "back extension": "Rückenstrecken",
  /* Ganzkörper / Olympisch */
  "clean": "Umsetzen",
  "power clean": "Power Clean",
  "hang clean": "Hang Clean",
  "clean and jerk": "Umsetzen und Stoßen",
  "snatch": "Reißen",
  "power snatch": "Power Snatch",
  "jerk": "Stoßen",
  "push jerk": "Push Jerk",
  "thruster": "Thruster",
  "burpee": "Burpee",
  "burpees": "Burpees",
  "push-up": "Liegestütze",
  "push up": "Liegestütze",
  "pushup": "Liegestütze",
  "pushups": "Liegestütze",
  "push-ups": "Liegestütze",
  "farmers walk": "Farmer's Walk",
  "jump": "Sprung",
  "jumps": "Sprünge",
  "box jump": "Box Jump",
  "jumping jack": "Hampelmann",
  "sprint": "Sprint",
  "carry": "Tragen",
  /* Dehnen / Mobilität */
  "stretch": "Dehnung",
  "hamstring stretch": "Beinbeuger-Dehnung",
  "quad stretch": "Quadrizeps-Dehnung",
  "calf stretch": "Waden-Dehnung",
  "chest stretch": "Brust-Dehnung",
  "shoulder stretch": "Schulter-Dehnung",
  "hip flexor stretch": "Hüftbeuger-Dehnung",
  "groin stretch": "Adduktoren-Dehnung",
  "neck stretch": "Nacken-Dehnung",
  "circles": "Kreisen",
  "arm circles": "Armkreisen",
  "rotation": "Rotation",
  "twist": "Drehung"
};

/* Modifikatoren, die VOR den Namen gehören (Position, Griff, Ausführung).
   Je vollständiger diese Tabelle, desto mehr Übungen bekommen einen sauberen
   deutschen Namen — unvollständig abgedeckte bleiben komplett englisch. */
const MODIFIERS = {
  /* Körperposition */
  "seated": "sitzend",
  "standing": "stehend",
  "lying": "liegend",
  "prone": "in Bauchlage",
  "supine": "in Rückenlage",
  "kneeling": "kniend",
  "half kneeling": "halbkniend",
  "bent-over": "vorgebeugt",
  "bent over": "vorgebeugt",
  "bent": "vorgebeugt",
  "leaning": "angelehnt",
  "seated on floor": "am Boden sitzend",
  "on floor": "am Boden",
  "floor": "am Boden",
  "wall": "an der Wand",
  "chair": "am Stuhl",
  "bench": "an der Bank",
  "incline": "schräg",
  "decline": "negativ",
  "flat": "flach",
  "elevated": "erhöht",
  "deficit": "im Defizit",
  /* Seite / Anzahl */
  "one-arm": "einarmig",
  "one arm": "einarmig",
  "single-arm": "einarmig",
  "single arm": "einarmig",
  "two-arm": "beidarmig",
  "two arm": "beidarmig",
  "double": "beidarmig",
  "single-leg": "einbeinig",
  "single leg": "einbeinig",
  "one-legged": "einbeinig",
  "one leg": "einbeinig",
  "one-leg": "einbeinig",
  "alternating": "alternierend",
  "alternate": "alternierend",
  "unilateral": "einseitig",
  "side": "seitlich",
  "lateral": "seitlich",
  "rear": "rückwärts",
  "front": "vorne",
  "cross": "überkreuz",
  "crossover": "überkreuz",
  /* Griff */
  "close-grip": "enger Griff",
  "close grip": "enger Griff",
  "narrow": "enger Griff",
  "wide-grip": "weiter Griff",
  "wide grip": "weiter Griff",
  "wide": "weiter Griff",
  "medium grip": "mittlerer Griff",
  "neutral-grip": "neutraler Griff",
  "reverse-grip": "Kammgriff",
  "reverse grip": "Kammgriff",
  "palms-up": "Untergriff",
  "palms up": "Untergriff",
  "palms-down": "Obergriff",
  "palms down": "Obergriff",
  "palms in": "neutraler Griff",
  "supinated": "Untergriff",
  "pronated": "Obergriff",
  "clean grip": "Umsetzgriff",
  "snatch grip": "Reißgriff",
  /* Ausführung */
  "overhead": "über Kopf",
  "behind the neck": "hinter dem Nacken",
  "behind-the-neck": "hinter dem Nacken",
  "behind the back": "hinter dem Rücken",
  "reverse": "umgekehrt",
  "isometric": "isometrisch",
  "static": "statisch",
  "explosive": "explosiv",
  "speed": "auf Geschwindigkeit",
  "slow": "langsam",
  "partial": "Teilwiederholungen",
  "full": "voller Bewegungsumfang",
  "full range-of-motion": "voller Bewegungsumfang",
  "assisted": "unterstützt",
  "band assisted": "mit Band unterstützt",
  "high": "hoch",
  "low": "tief",
  "low-pulley": "unteres Kabel",
  "high-pulley": "oberes Kabel",
  "narrow stance": "enger Stand",
  "wide stance": "weiter Stand",
  "sumo stance": "Sumo-Stand",
  "stance": "Stand",
  "walking": "gehend",
  "hang": "aus dem Hang",
  "hanging": "hängend",
  "power": "Power",
  "box": "auf die Box",
  "ball": "am Ball",
  "rings": "an Ringen",
  "ring": "an Ringen",
  /* Fachbegriffe, die im Deutschen englisch bleiben — bewusst so, das sagt
     im Gym jeder. Sie stehen hier, damit sie den Namen nicht blockieren. */
  "split": "Split",
  "clean": "Clean",
  "snatch": "Snatch",
  "preacher": "Scott",
  "concentration": "Konzentrations",
  "plyo": "plyometrisch",
  "upright": "aufrecht",
  "stiff-legged": "gestreckt",
  "stiff leg": "gestreckt",
  "long": "lang",
  "extended": "erweitert",
  "jump": "mit Sprung",
  "tuck": "angehockt",
  "dynamic": "dynamisch"
};

/* Körperteile — erscheinen als Bestimmungswort ("Hamstring Stretch"). */
const BODY = {
  "hamstring": "Beinbeuger", "hamstrings": "Beinbeuger",
  "quad": "Quadrizeps", "quads": "Quadrizeps", "quadriceps": "Quadrizeps",
  "glute": "Gesäß", "glutes": "Gesäß",
  "calf": "Waden", "calves": "Waden",
  "chest": "Brust", "shoulder": "Schulter", "shoulders": "Schultern",
  "neck": "Nacken", "hip": "Hüfte", "hips": "Hüfte",
  "hip flexor": "Hüftbeuger", "hip flexors": "Hüftbeuger",
  "groin": "Adduktoren", "adductor": "Adduktoren", "adductors": "Adduktoren",
  "abductor": "Abduktoren", "abductors": "Abduktoren",
  "lat": "Latissimus", "lats": "Latissimus",
  "bicep": "Bizeps", "biceps": "Bizeps",
  "tricep": "Trizeps", "triceps": "Trizeps",
  "forearm": "Unterarm", "forearms": "Unterarme",
  "wrist": "Handgelenk", "wrists": "Handgelenke",
  "ankle": "Sprunggelenk", "knee": "Knie", "knees": "Knie",
  "back": "Rücken", "lower back": "Unterer Rücken", "upper back": "Oberer Rücken",
  "middle back": "Mittlerer Rücken", "abs": "Bauch", "abdominal": "Bauch",
  "oblique": "Seitliche Bauchmuskeln", "obliques": "Seitliche Bauchmuskeln",
  "spine": "Wirbelsäule", "trap": "Trapez", "traps": "Trapez",
  "rear delt": "Hintere Schulter", "rear delts": "Hintere Schulter",
  "front delt": "Vordere Schulter", "side delt": "Seitliche Schulter",
  "it band": "IT-Band", "piriformis": "Piriformis", "tibialis": "Tibialis",
  "arm": "Arm", "arms": "Arme", "leg": "Bein", "legs": "Beine",
  "thigh": "Oberschenkel", "torso": "Rumpf", "core": "Rumpf"
};

/* Wörter ohne Bedeutung für den Namen (Füllwörter, Trennzeichen). */
const DROP = new Set(["the", "a", "an", "with", "and", "to", "on", "of", "in",
                      "from", "for", "or", "-", "–", "—", "your"]);

const MISSING = [];   // Diagnose: Wörter, an denen eine Übersetzung scheitert

function normKey(s) { return s.toLowerCase().replace(/\s+/g, " ").trim(); }

/* Zerlegt einen Namen in Tokens; Bindestriche bleiben erhalten, weil sie
   Teil von Fachbegriffen sind ("close-grip", "e-z"). */
function tokenize(name) {
  return name.replace(/[(),]/g, " ").split(/\s+/).filter(Boolean);
}

/* Sucht ab Position i die längste passende Phrase in einer Tabelle.
   Gibt [treffer, verbrauchteTokens] oder null. */
function longestMatch(tokens, i, table) {
  for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
    const key = normKey(tokens.slice(i, i + len).join(" "));
    if (Object.prototype.hasOwnProperty.call(table, key)) return [table[key], len];
  }
  return null;
}

/* --------------------------------------------------------------------------
   Übersetzt einen Übungsnamen — oder gibt null zurück, dann bleibt er englisch.

   Verfahren: KOPF-ERKENNUNG. Der Name endet fast immer auf der Bewegung
   ("… Bench Press", "… Row", "… Stretch"). Wird dieser Kopf erkannt, ist die
   Übung benannt; alles davor sind Gerät, Position und Zusätze.

   Übersetzt wird nur, wenn der Kopf UND jedes Wort davor im Katalog stehen.
   Sobald ein Wort fehlt, bleibt der ganze Name englisch.

   Das ist bewusst streng. Die lockere Variante (Unbekanntes englisch
   durchreichen) erzeugte Sprach-Mischmasch — "Prone Curls schräg",
   "High Rudern kniend". Ein sauberer englischer Name ist besser als ein
   halbdeutscher; "Lat Pulldown" und "Hip Thrust" sagt im deutschen Gym
   ohnehin jeder.
   -------------------------------------------------------------------------- */
function toGerman(name) {
  const tokens = tokenize(name).filter(t => !DROP.has(normKey(t)));
  if (!tokens.length) return null;

  /* 1. Kopf suchen: die längste Phrase, die am Ende des Namens endet. */
  let head = null, headStart = -1;
  for (let i = 0; i < tokens.length; i++) {
    const hit = longestMatch(tokens, i, PHRASES);
    if (hit && i + hit[1] === tokens.length) { head = hit[0]; headStart = i; break; }
  }

  /* 1b. Sonderfälle, die kein PHRASES-Eintrag sein können, weil das
         Bestimmungswort beliebig ist. */
  const last = normKey(tokens[tokens.length - 1]);
  if (!head && (last === "stretch" || last === "stretches")) { head = "Dehnung"; headStart = tokens.length - 1; }
  if (!head && /-smr$/.test(last)) {
    const bare = tokens.slice(0, -1).concat(tokens[tokens.length - 1].replace(/-SMR$/i, ""));
    const parts = bare.map(t => BODY[normKey(t)]);
    if (parts.some(p => !p)) return null;
    return parts.join("-") + " — Faszienrolle";
  }
  if (!head) return null;

  /* 2. Alles vor dem Kopf einsortieren — jedes Wort muss bekannt sein. */
  const equip = [], mods = [], body = [];
  let i = 0;
  while (i < headStart) {
    let hit = longestMatch(tokens, i, EQUIP_WORDS);
    if (hit && i + hit[1] <= headStart) { if (!equip.includes(hit[0])) equip.push(hit[0]); i += hit[1]; continue; }

    hit = longestMatch(tokens, i, MODIFIERS);
    if (hit && i + hit[1] <= headStart) { if (!mods.includes(hit[0])) mods.push(hit[0]); i += hit[1]; continue; }

    hit = longestMatch(tokens, i, BODY);
    if (hit && i + hit[1] <= headStart) { body.push(hit[0]); i += hit[1]; continue; }

    MISSING.push(normKey(tokens[i]));  // Diagnose für --report
    return null;                       // unbekanntes Wort → Name bleibt englisch
  }

  /* 3. Zusammensetzen: [Körperteil-]Bewegung [Position] (Griff, Gerät)

     Trägt der Kopf schon eine Klammer ("Bankdrücken (enger Griff)"), wird
     deren Inhalt übernommen, statt eine zweite Klammer anzuhängen. */
  let head2 = head, headParen = [];
  const pm = head.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (pm) { head2 = pm[1]; headParen = pm[2].split(",").map(s => s.trim()).filter(Boolean); }

  let out = body.length ? body.join("-") + "-" + head2 : head2;
  const posMods = mods.filter(m => !m.includes("Griff"));
  const gripMods = mods.filter(m => m.includes("Griff"));
  if (posMods.length) out += " " + posMods.join(" ");
  const paren = [];
  headParen.concat(gripMods, equip).forEach(x => { if (!paren.includes(x)) paren.push(x); });
  if (paren.length) out += " (" + paren.join(", ") + ")";

  out = out.replace(/\s+/g, " ").trim();
  /* Wenn nichts wirklich übersetzt wurde, ist der "deutsche" Name nur der
     englische mit Klammern — dann lieber ehrlich englisch lassen. */
  return normKey(out) === normKey(name) ? null : out;
}

/* ==========================================================================
   4. TYP — der Tracker unterscheidet Gewicht×Wdh., Körpergewicht×Wdh. und Zeit.
   ========================================================================== */
function inferType(ex) {
  if (ex.category === "stretching") return "time";
  const eq = ex.equipment || "";
  if (eq === "body only") {
    if (ex.force === "static") return "time";
    return "bodyweight_reps";
  }
  return "weight_reps";
}

/* ==========================================================================
   5. ID — stabil, kollisionsfrei, aus dem Quell-Slug abgeleitet.
   ========================================================================== */
function toId(srcId) {
  return "fx_" + srcId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/* ==========================================================================
   BAUEN
   ========================================================================== */
async function loadSource() {
  const argIdx = process.argv.indexOf("--input");
  if (argIdx > -1 && process.argv[argIdx + 1]) {
    return JSON.parse(fs.readFileSync(process.argv[argIdx + 1], "utf8"));
  }
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error("Quelle nicht erreichbar: HTTP " + res.status);
  return res.json();
}

/* Kuratierte Übungen aus js/tracker-data.js lesen — deren Namen gewinnen,
   und ihre Dubletten fliegen aus der Bibliothek. Die Zuordnung steht in
   tools-dev/exercise-curated-map.json (kuratierte ID → Quell-Slug). */
function loadCuratedMap() {
  const p = path.join(ROOT, "tools-dev", "exercise-curated-map.json");
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const src = await loadSource();
const curatedMap = loadCuratedMap();
const claimedSlugs = new Set(
  Object.entries(curatedMap)
    .filter(([k, v]) => !k.startsWith("_") && typeof v === "string")
    .map(([, v]) => v)
);

const library = [];
const guide = {};
let translated = 0;

for (const ex of src) {
  if (claimedSlugs.has(ex.id)) continue;           // Dublette einer kuratierten Übung

  const de = toGerman(ex.name);
  if (de) translated++;

  const primary = (ex.primaryMuscles || []).filter(m => MUSCLE_GROUP[m]);
  const secondary = (ex.secondaryMuscles || []).filter(m => MUSCLE_GROUP[m]);
  const groupOf = primary[0] || secondary[0] || "other";

  const entry = {
    id: toId(ex.id),
    src: ex.id,                                     // Bildpfad + Herkunftsnachweis
    muscle: MUSCLE_GROUP[groupOf] || "other",       // grobe Gruppe (Alt-Filter)
    m1: primary,                                    // feine Muskeln, primär
    m2: secondary,                                  // feine Muskeln, sekundär
    equip: EQUIP_MAP[ex.equipment] || "other",
    type: inferType(ex),
    cat: ex.category,
    lvl: ex.level,
    name: { de: de || ex.name, en: ex.name }
  };
  if (ex.mechanic) entry.mech = ex.mechanic;
  if (ex.force) entry.force = ex.force;

  library.push(entry);
  if (ex.instructions && ex.instructions.length) guide[entry.id] = ex.instructions;
}

library.sort((a, b) => a.name.en.localeCompare(b.name.en));

/* --------------------------------------------------------------------------
   Kuratierte Übungen anreichern: Fotos und feine Muskeln aus der Quelle
   erben. js/tracker-data.js bleibt handgepflegt (Namen, Reihenfolge,
   Gerätewahl); nur die Zusatzdaten kommen von hier.
   -------------------------------------------------------------------------- */
const byslug = new Map(src.map(e => [e.id, e]));

/* Ohne Zuordnung in der Quelle — feine Muskeln von Hand, damit die Heatmap
   auch diese Übungen kennt. */
const CURATED_OVERRIDES = {
  bulgarian: { m1: ["quadriceps"], m2: ["glutes", "hamstrings"] }
};

const curatedMeta = {};
for (const [cid, slug] of Object.entries(curatedMap)) {
  if (cid.startsWith("_")) continue;
  const o = CURATED_OVERRIDES[cid];
  if (typeof slug === "string" && byslug.has(slug)) {
    const e = byslug.get(slug);
    curatedMeta[cid] = {
      src: slug,
      m1: (e.primaryMuscles || []).filter(m => MUSCLE_GROUP[m]),
      m2: (e.secondaryMuscles || []).filter(m => MUSCLE_GROUP[m])
    };
    if (e.instructions && e.instructions.length) guide[cid] = e.instructions;
  } else if (o) {
    curatedMeta[cid] = { src: null, m1: o.m1, m2: o.m2 };
  }
}

fs.writeFileSync(
  path.join(ROOT, "js", "tracker-curated.js"),
  header("MaleMetrix Tracker — Zusatzdaten der kuratierten Übungen") +
  "window.MM_TRK_CURATED_META = " + JSON.stringify(curatedMeta, null, 1) + ";\n"
);

function header(title) { return `/* ==========================================================================
   ${title}
   --------------------------------------------------------------------------
   ERZEUGT — nicht von Hand bearbeiten.
   Bauen mit: node tools-dev/build-exercise-library.mjs

   Quelle: free-exercise-db (github.com/yuhonas/free-exercise-db)
   Lizenz: Unlicense — gemeinfrei, freie Verwendung inkl. kommerziell.
   ========================================================================== */
`; }

fs.writeFileSync(
  path.join(ROOT, "js", "tracker-library.js"),
  header("MaleMetrix Tracker — Übungsbibliothek (Metadaten)") +
  "window.MM_TRK_LIBRARY = " + JSON.stringify(library) + ";\n"
);

fs.writeFileSync(
  path.join(ROOT, "js", "tracker-guide.js"),
  header("MaleMetrix Tracker — Ausführungsschritte (Originaltext, Englisch)") +
  "window.MM_TRK_GUIDE = " + JSON.stringify(guide) + ";\n"
);

const libKB = Math.round(fs.statSync(path.join(ROOT, "js", "tracker-library.js")).size / 1024);
const guideKB = Math.round(fs.statSync(path.join(ROOT, "js", "tracker-guide.js")).size / 1024);

console.log("Quelle          : " + src.length + " Übungen");
console.log("Dubletten raus  : " + claimedSlugs.size + " (bereits kuratiert)");
console.log("Bibliothek      : " + library.length + " Übungen  (" + libKB + " KB)");
console.log("Kuratiert       : " + Object.keys(curatedMeta).length + " angereichert (Fotos + feine Muskeln)");
console.log("Anleitungen     : " + Object.keys(guide).length + "  (" + guideKB + " KB)");
if (process.argv.includes("--report")) {
  const c = {};
  MISSING.forEach(w => { c[w] = (c[w] || 0) + 1; });
  console.log("\nFEHLENDE WOERTER (blockieren die Uebersetzung):");
  console.log(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 60)
    .map(([w, n]) => n + "x " + w).join(", "));
}

console.log("Deutscher Name  : " + translated + " / " + library.length +
            "  (" + Math.round(translated / library.length * 100) + " %, Rest bleibt englisch)");
