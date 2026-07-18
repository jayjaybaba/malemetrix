/* ==========================================================================
   MaleMetrix — 12-Wochen-Programm (Inhalt)
   --------------------------------------------------------------------------
   Kompletter, evidenzbasierter Programm. Alles editierbar, ohne Seitencode
   anzufassen — nur diese Datei bearbeiten.

   Pro Woche:
   - focus     : Ein-Satz-Fokus der Woche
   - science   : "Was die Studienlage zeigt" (Aufklärungs-Callout)
   - lesson    : Lerninhalt (Array von Absätzen)
   - todos     : abhakbare Aufgaben (werden zu Häkchen)
   - train/fuel/recovery/behavior/checkin : die 5 Umsetzungs-Bereiche
   - note      : optionaler Hinweis-Kasten

   WICHTIG (medizinische Grenze): keine Diagnosen, keine Therapie-, Hormon-
   oder Medikamenten-Empfehlungen, keine Substanzen/Dosierungen. Aufklärung ja,
   Empfehlung nein. Inneres Zitieren mit „…” (keine geraden Anführungszeichen
   in Strings — sonst bricht das Array).
   ========================================================================== */

window.MM_COURSE = {

  phases: {
    baseline: { name: "Phase 1 · Baseline & Reset", color: "#2e7cf6", weeks: "Woche 1–2" },
    build:    { name: "Phase 2 · Build", color: "#00c2ff", weeks: "Woche 3–6" },
    optimize: { name: "Phase 3 · Optimize", color: "#2dd4a7", weeks: "Woche 7–10" },
    lockin:   { name: "Phase 4 · Lock-in", color: "#f5b54a", weeks: "Woche 11–12" }
  },

  /* ---------- Onboarding / Einleitung ---------- */
  intro: {
    eyebrow: "Bevor du startest",
    title: "Wie dieses Programm funktioniert",
    lead: "Das hier ist kein Crash-Plan und keine Sammlung loser Tipps. Es ist ein zusammenhängendes 12-Wochen-System. Du wählst zu Beginn deinen Modus — CUT, RECOMP, BUILD oder PERFORM — und das System richtet Training, Cardio und Ernährung darauf aus. Ziel: sichtbar stärker und leaner werden, besser schlafen, mehr Energie und gesündere Marker — mit Routinen, die auch nach Woche 12 bleiben.",
    pillars: [
      { icon: "🏋️", name: "Training", text: "Progressives Krafttraining ist der Reiz, der Muskeln aufbaut und im Defizit schützt. 3 Einheiten pro Woche reichen — wenn sie richtig gesteuert sind." },
      { icon: "🍳", name: "Ernährung", text: "Hohes Protein, gesteuerte Energiebilanz, echte Lebensmittel. Kein Dogma, keine Verbote — ein System, das auch am Wochenende hält." },
      { icon: "😴", name: "Regeneration", text: "Schlaf ist dein stärkstes legales Leistungsmittel. Er entscheidet, ob du im Defizit Fett oder Muskel verlierst — und wie du dich fühlst." },
      { icon: "🧠", name: "Verhalten", text: "Ergebnisse halten nur über Gewohnheiten. Jede Woche verankerst du eine neue, bis das System ohne Willenskraft läuft." }
    ],
    science: "Warum gleichzeitig Fett ab- und Muskeln aufbauen realistisch ist: Körperrekomposition gelingt am besten bei Männern, die neu einsteigen, nach Pause zurückkommen oder einen höheren Körperfettanteil haben — also genau der Zielgruppe dieses Programms. Drei Bedingungen müssen stimmen, und auf die ist jede Woche ausgelegt: genug Protein (~1,6–2,2 g/kg), progressives Krafttraining und ausreichend Schlaf.",
    how: [
      "Arbeite die Wochen der Reihe nach durch — jede baut auf der vorigen auf.",
      "Hak Aufgaben ab. Dein Fortschritt wird automatisch auf diesem Gerät gespeichert.",
      "Nutze die eingebauten Tools: Score-Check, Rechner und Tracker sind oben verlinkt.",
      "Lies die Wissens-Bibliothek unten — sie erklärt das Warum hinter dem System.",
      "Bewerte Fortschritt im Wochen-Trend, nie an der Tageswaage."
    ],
    promise: "Ehrlich: Es gibt keine Garantie auf eine bestimmte Kilozahl — alles andere wäre unseriös. Was dieses System leistet, wenn du es umsetzt: ein vollständiges, evidenzbasiertes Vorgehen, messbare Veränderung bei Gewicht, Bauchumfang, Kraft und Energie — und Gewohnheiten, die bleiben."
  },

  /* ---------- Moduswahl: CUT / RECOMP / BUILD / PERFORM ----------
     Der Nutzer wählt oben seinen Modus (gespeichert im Browser). Training,
     Cardio und Ernährung richten sich daran aus. Der Modus ist ein Werkzeug,
     keine Identität — du kannst nach 12 Wochen wechseln. */
  modes: {
    eyebrow: "Schritt 1 · vor Woche 1",
    title: "Wähle deinen Modus",
    lead: "Nicht jeder Mann braucht einen Cut. Leg fest, woran dieses Programm arbeitet — du kannst später wechseln.",
    order: ["cut", "recomp", "build", "perform"],
    "default": "recomp",
    items: {
      cut:     { label: "CUT",     tag: "Fett runter", summary: "Moderates Defizit (~10–20 % unter Bedarf), Protein oben halten, Kraft schützen. Erfolg misst du an: Bauchumfang ↓ und Gewichtstrend ↓ bei möglichst stabiler Kraft." },
      recomp:  { label: "RECOMP",  tag: "Fett runter + Muskel rauf", summary: "Nahe Erhaltung oder kleines Defizit, sauberes Training, viel Protein. Erfolg misst du an: Taille ↓ bei stabiler Waage und steigender Kraft. Gut für Wieder-Einsteiger und höheren Körperfettanteil." },
      build:   { label: "BUILD",   tag: "Muskel & Kraft aufbauen", summary: "Kleiner Überschuss (~5–10 %), konsequente Progression, genug Schlaf. Erfolg misst du an: Kraft ↑ und Maße ↑ bei kontrollierter Taille." },
      perform: { label: "PERFORM", tag: "Halten & leistungsfähiger", summary: "Erhaltung, Training fuelen, Cardio + Recovery priorisieren. Erfolg misst du an: Kraft, Cardio/VO₂, Schlaf, Energie und guten Gesundheitsmarkern." }
    }
  },

  /* ---------- 12 Wochen ---------- */
  weeks: [
    {
      week: 1, phase: "baseline", title: "Safety-Gate & Baseline",
      focus: "Zwei Dinge zuerst: ein kurzer Sicherheits-Check und deine Baseline. Erst klären wir Red Flags, dann baust du die Datenbasis, an der du in 12 Wochen jeden Fortschritt schwarz auf weiß siehst.",
      science: "Selbst-Monitoring (Gewicht, Umfänge, Training) gehört zu den stärksten Einzelprädiktoren für langfristigen Erfolg in der Verhaltensforschung. Allein das ehrliche Messen verändert dein Verhalten — der sogenannte Reaktivitätseffekt.",
      lesson: [
        "Willkommen. Diese Woche trainierst du noch nicht hart. Du erfasst sauber deinen Ist-Zustand, damit Woche 12 dir genau zeigt, was sich verändert hat. Ohne Baseline ist jeder Fortschritt unsichtbar — und unsichtbarer Fortschritt demotiviert.",
        "Miss reproduzierbar: Gewicht morgens nüchtern nach der Toilette, Bauchumfang auf Nabelhöhe im ausgeatmeten Zustand, Fotos bei gleichem Licht und gleicher Tageszeit. Diese Bedingungen hältst du die ganzen 12 Wochen gleich — sonst vergleichst du Äpfel mit Birnen."
      ],
      todos: [
        "MaleMetrix Score-Check machen und Ergebnis notieren",
        "Gewicht (morgens, nüchtern) + Bauchumfang auf Nabelhöhe messen",
        "3 Standardfotos: vorne, seitlich, hinten — gleiches Licht, gleiche Tageszeit",
        "Kraft-Baseline: Liegestütze am Stück, Plank-Zeit, eine Kniebeugen-Variante",
        "Tracker einrichten und alle Startwerte eintragen",
        "Safety-Gate: Red Flags checken (Brustschmerz, Ohnmacht, unklare Atemnot, sehr hoher Blutdruck, akute Beschwerden) — im Zweifel zuerst ärztlich abklären, bevor du hart trainierst"
      ],
      train: "2 lockere Ganzkörper-Einheiten zum Bewegungslernen. Jedes Grundmuster (Knie-, Hüft-, Druck-, Zugbewegung) mit 2 Sätzen bei leichtem Gewicht. Plus 1 lockere Cardio-Einheit (20–30 Min Zone 2, Puste-locker-Tempo) als Ausgangswert. Ziel: Technik filmen, Ausgangskraft dokumentieren — nicht ans Limit gehen.",
      fuel: "Noch nichts umstellen. 3 Tage ganz normal essen und ehrlich mitschreiben. Du sammelst Daten über deinen Ist-Zustand: Kalorien, Protein, Muster, Schwachstellen.",
      recovery: "Schlafzeiten der letzten 7 Tage rekonstruieren (rein/raus). Das ist dein Schlaf-Startwert. Notiere auch nächtliches Aufwachen und wie du morgens aufstehst.",
      behavior: "Such dir EINEN festen Ankerpunkt im Tag (z. B. direkt nach dem Zähneputzen), an den du später neue Gewohnheiten hängst. Verhaltensänderung startet mit Triggern, nicht mit Motivation.",
      checkin: "Score, Gewicht, Bauchumfang, geschätzter Schlafschnitt, Kraft-Baseline festhalten."
    },
    {
      week: 2, phase: "baseline", title: "System bauen & Ziele in Zahlen",
      focus: "Aus deinen Daten wird ein Plan: feste Zeiten, klare Zielzahlen und einfache Regeln, die deinen Alltag überleben.",
      science: "Spezifische, messbare Ziele schlagen vage Vorsätze deutlich (Goal-Setting-Forschung, Locke & Latham). Und wer feste Wenn-dann-Pläne formuliert (Implementierungsintentionen, Gollwitzer), setzt Verhalten zwei- bis dreimal zuverlässiger um als wer nur „will”.",
      lesson: [
        "Aus deinen 3 Track-Tagen kennst du grob deinen Erhaltungsbedarf. Daraus leiten wir dein Protein- und Kalorienziel ab. Protein ist der Hebel Nummer eins für Rekomposition: 1,6–2,2 g pro kg Körpergewicht maximieren Muskelaufbau und schützen Muskulatur im Defizit (Meta-Analysen u. a. von Morton). Wir zielen auf rund 2 g/kg; bei viel Übergewicht rechnest du mit dem Zielgewicht.",
        "Du legst 3 feste Trainingstermine fest — wie Geschäftstermine, nicht verhandelbar. Konstanz schlägt Perfektion. Drei planbare Einheiten pro Woche schlagen fünf, die regelmäßig ausfallen."
      ],
      todos: [
        "3 feste Trainingstermine für die nächsten 12 Wochen in den Kalender eintragen",
        "Protein-Tagesziel berechnen (~2 g/kg) und notieren",
        "2 Standardmahlzeiten definieren, die dein Proteinziel fast allein tragen",
        "Realistisches 12-Wochen-Ziel in Zahlen festlegen (passend zu deinem Modus)",
        "Wenn-dann-Plan für deine häufigste Ausrede aufschreiben",
        "Modus wählen (oben im Programm): CUT, RECOMP, BUILD oder PERFORM"
      ],
      train: "Start des 3-Tage-Ganzkörperplans (A/B/C). Pro Einheit 5–6 Übungen, 2–3 Sätze, 8–12 Wiederholungen, dabei 2–3 Wiederholungen in Reserve (RIR). Gewicht und Wdh. jedes Mal notieren. Dazu 1–2× Zone-2-Cardio (20–30 Min) als Motor-Basis — locker genug, um nebenbei zu reden.",
      fuel: "Protein bei jeder Mahlzeit (30–50 g). Erhaltungskalorien halten — wir kürzen noch nicht. Flüssigkalorien (Säfte, Softdrinks, Alkohol) bewusst reduzieren.",
      recovery: "Feste Schlafenszeit setzen, Ziel 7–8 h. Koffein-Deadline 8–10 h vor dem Schlafen. Letzte 30 Min vor dem Bett ohne hellen Bildschirm.",
      behavior: "Hänge eine neue Mini-Gewohnheit an deinen Anker aus Woche 1 (z. B. „nach dem Kaffee fülle ich die Wasserflasche”). Eine Gewohnheit pro Woche — nicht mehr.",
      checkin: "Trainings erledigt? Protein im Schnitt getroffen? Schlaf-Fenster gehalten?"
    },
    {
      week: 3, phase: "build", title: "Progressive Overload: der Motor",
      focus: "Jetzt beginnt der echte Aufbau. Das Prinzip, das Muskeln wachsen lässt, heißt progressive Überlastung — und du lernst, es zu steuern.",
      science: "Muskelwachstum braucht einen Reiz, der mit der Zeit steigt. Die Forschung (u. a. Schoenfeld) zeigt: rund 10+ harte Sätze pro Muskelgruppe und Woche sind ein guter Richtwert für Hypertrophie, und Training nahe am Muskelversagen (1–3 RIR) ist entscheidend — nicht das absolute Gewicht.",
      lesson: [
        "Doppelte Progression ist dein Werkzeug: Bleib bei einem Gewicht, bis du die obere Wiederholungszahl in allen Sätzen sauber schaffst (z. B. 3×12). Dann erhöhst du das Gewicht und startest wieder unten (3×8). So wächst der Reiz kontrolliert statt zufällig.",
        "Technik vor Ego. Eine saubere Wiederholung über vollen Bewegungsumfang baut mehr Muskel als drei abgefälschte. Du trainierst hart, aber nicht zerstörerisch — 1–3 Wiederholungen in Reserve liefern fast den vollen Wachstumsreiz bei deutlich besserer Erholung."
      ],
      todos: [
        "Alle 3 Trainings durchgezogen und jeden Satz dokumentiert",
        "Für jede Übung eine Ziel-Wiederholungsspanne festgelegt (z. B. 8–12)",
        "Proteinziel an mind. 6 von 7 Tagen getroffen",
        "Mind. 8.000 Schritte an 5 Tagen"
      ],
      train: "Erste echte Progressionswoche. A/B/C-Plan, 3×8–12 pro Übung, 1–3 RIR. Wo du letzte Woche die obere Spanne sauber geschafft hast: Gewicht um die kleinste Stufe erhöhen.",
      fuel: "Weiter Erhaltungskalorien + hohes Protein (Recomp-Phase). Kohlenhydrate vor allem um das Training herum für Leistung. Ballaststoffe (Gemüse, Obst, Vollkorn) für Sättigung und Verdauung.",
      recovery: "Schlaf konsequent. Wer unter 6 h schläft, verliert im Defizit überproportional Muskel statt Fett (Nedeltcheva u. a.) — Schlaf ist hier Trainingsfaktor, kein Luxus.",
      behavior: "Trainingskleidung am Vorabend bereitlegen. Reibung reduzieren ist wirksamer als Disziplin erzwingen.",
      checkin: "Sind Gewichte/Wdh. gestiegen? Protein-Quote? Schritte?"
    },
    {
      week: 4, phase: "build", title: "Recheck #1 & Energiebilanz sichtbar machen",
      focus: "Erster fester Recheck-Punkt. Du vergleichst kurz mit Woche 1 und machst deine Energiebilanz messbar — ohne in Zwang zu verfallen. Recheck heißt: messen, einordnen, ggf. eine Kleinigkeit anpassen — nicht alles umwerfen.",
      science: "Fettabbau folgt der Energiebilanz: weniger rein als raus. Das ist Physik. Studien zeigen aber auch, dass Menschen ihre Kalorienzufuhr im Schnitt um 20–40 % unterschätzen. Kurzes, ehrliches Tracking deckt genau diese Lücke auf.",
      lesson: [
        "Du trackst 7 Tage deine Kalorien — nicht für immer, sondern um ein Gefühl für Portionen und versteckte Kalorien zu bekommen. Danach brauchst du es nur noch phasenweise. Die wichtigste Zahl bleibt Protein, die zweite die Gesamtenergie; den Rest überschätzen die meisten in seiner Bedeutung.",
        "Wochenenden entscheiden Bilanzen. Zwei planlose Tage können das Defizit von fünf Tagen löschen. Deshalb planst du sie aktiv — nicht mit Verboten, sondern mit einer Strategie: ein Limit vorab, eine bewusst eingeplante Genuss-Mahlzeit, danach zurück ins System."
      ],
      todos: [
        "7 Tage Kalorien tracken (so ehrlich wie möglich)",
        "Wochenend-Strategie schriftlich festlegen (Alkohol-/Snack-Limit vorab)",
        "Bauchumfang erneut messen und mit Woche 1 vergleichen",
        "Eine bewusst geplante Genuss-Mahlzeit einbauen statt unkontrolliert zu essen",
        "Recheck #1: Gewichtstrend, Bauch, Kraft und Schlaf kurz gegen Woche 1 halten — passt der Modus noch?"
      ],
      train: "Progression fortsetzen. Wenn eine Übung über 3 Einheiten stockt: Technik und Bewegungsumfang prüfen, ggf. Übung tauschen — nicht mit Schwung kompensieren.",
      fuel: "Aus den 7 Track-Tagen deinen realen Erhaltungsbedarf ableiten (mit dem TDEE-Rechner abgleichen). Das ist die Basis für die Defizit-Entscheidung in Woche 5.",
      recovery: "Alkohol unter der Woche aussetzen. Beobachte Schlafqualität und Morgenenergie — der Effekt ist oft drastisch.",
      behavior: "Identifiziere deinen häufigsten Trigger-Snack-Moment (Stress, Langeweile, Abend) und plane eine konkrete Alternative.",
      checkin: "Durchschnittskalorien, Bauchumfang-Trend, Wochenend-Disziplin, Schlaf."
    },
    {
      week: 5, phase: "build", title: "Richtung setzen — passend zu deinem Modus",
      focus: "Jetzt setzt du die Energierichtung passend zu deinem Modus: Defizit (CUT), nahe Erhaltung (RECOMP), kleiner Überschuss (BUILD) oder Erhaltung (PERFORM). Protein und Krafterhalt bleiben in jedem Modus die Konstante.",
      byMode: {
        cut: "CUT: ~15–20 % unter Bedarf (meist 300–500 kcal). Protein Richtung 2,2 g/kg. Ziel: Bauchumfang und Gewichtstrend runter, Kraft halten.",
        recomp: "RECOMP: nahe Erhaltung oder kleines Defizit. Waage darf stabil bleiben — Taille runter und Kraft rauf sind hier der Erfolg.",
        build: "BUILD: kleiner Überschuss (~5–10 %), langsam zunehmen. Progression im Gym priorisieren, Taille im Blick behalten.",
        perform: "PERFORM: Erhaltung. Training und Cardio fuelen, Schlaf und Recovery schützen — Leistung schlägt hier Waage."
      },
      science: "Für Fettabbau maximiert ein moderates Defizit (~0,5–1 % Körpergewicht pro Woche) den Fettverlust bei minimalem Muskelverlust; aggressive Crash-Defizite verbrennen Muskel und enden fast immer im Jojo (u. a. Helms zur Diät-Periodisierung). Für Aufbau gilt umgekehrt: ein kleiner Überschuss reicht — mehr wird vor allem Fett.",
      lesson: [
        "Setze dein Defizit auf rund 15–20 % unter Erhaltungsbedarf, meist 300–500 kcal. Mehr ist nicht besser — es ist nur schneller kaputt. Protein bleibt am oberen Ende (Richtung 2,2 g/kg): je größer das Defizit, desto wichtiger Protein, um Muskeln zu halten.",
        "Bewerte ausschließlich den Wochenschnitt der Waage. Tagesschwankungen durch Wasser, Salz und Darminhalt sagen nichts über Fett aus. Wer täglich auf die Einzelzahl reagiert, dreht durch — wer den Trend liest, bleibt ruhig und konsequent."
      ],
      todos: [
        "Ziel-Kalorien festlegen (~15–20 % unter Bedarf) und notieren",
        "Protein Richtung oberes Ende (≈2,2 g/kg) anheben",
        "Gewicht 3–7× pro Woche messen, nur den Wochenschnitt bewerten",
        "Sattmacher-Liste erstellen (proteinreich + volumenreich)"
      ],
      train: "Volumen halten, nicht erhöhen. Im Defizit ist Krafterhalt das Ziel — das Signal an den Körper, Muskel zu behalten. Gleiche Gewichte sauber wegdrücken ist hier ein Erfolg.",
      fuel: "Defizit über Volumen-Lebensmittel: mageres Protein, Gemüse, Obst, kartoffel- oder reisbasierte Beilagen. Wenig Flüssigkalorien. Ziel: satt im Defizit.",
      recovery: "Schlaf schützt jetzt Muskeln und Hunger. Zu wenig Schlaf erhöht Ghrelin (Hunger) und senkt Sättigung — die Diät wird unnötig schwer.",
      behavior: "Meal-Prep einführen: 1× pro Woche zwei Mahlzeiten vorbereiten. Entscheidungen im Voraus treffen schlägt Willenskraft im Hunger.",
      checkin: "Sinkt der Wochenschnitt moderat? Bleibt die Kraft stabil? Hunger steuerbar?"
    },
    {
      week: 6, phase: "build", title: "Halbzeit-Review & Anpassung",
      focus: "Halbzeit. Ehrlicher Soll-Ist-Vergleich — und gezieltes Nachjustieren für die zweite Hälfte.",
      science: "Fortschritt verläuft nie linear. Plateaus und Schwankungen sind normal; entscheidend ist der Trend über 2–3 Wochen, nicht der einzelne Tag. Regelmäßige Reviews verhindern, dass aus einer normalen Schwankung eine Panik-Entscheidung wird.",
      lesson: [
        "Vergleiche jetzt alles mit Woche 1: Gewicht, Bauchumfang, Fotos, Kraftwerte, Schlaf, Score. Fotos zeigen oft mehr als die Waage. Steht der Gewichtstrend trotz Defizit, ist fast immer die Zufuhr höher als gedacht (Portionen schleichen hoch) — nicht der „kaputte Stoffwechsel”. 2–3 Tage Nachtracken bringt Klarheit.",
        "Identifiziere die EINE Sache, die in Phase 3 den größten Unterschied macht: Schlaf? Wochenenden? Trainingsintensität? Schritte? Fokus auf einen Hebel schlägt halbherzige Arbeit an fünf."
      ],
      todos: [
        "Score-Check wiederholen und mit Woche 1 vergleichen",
        "Alle Marker gegenüberstellen (Gewicht/Umfang/Fotos/Kraft)",
        "Was funktioniert, was kippt? Schriftlich festhalten",
        "Den größten Hebel für Phase 3 festlegen"
      ],
      train: "Weiter sauber steigern. In Woche 8 kommt der nächste Recheck — und dort entscheidest du nach Signalen, ob eine Deload-Woche sinnvoll ist. Wenn Gelenke oder Schlaf schon jetzt deutlich zwicken, darfst du früher zurückschalten.",
      fuel: "Defizit beibehalten, wenn der Trend stimmt. Wenn 2–3 Wochen nichts passiert: zuerst Zufuhr verifizieren, dann ggf. 150–200 kcal anpassen.",
      recovery: "Stresslevel ehrlich bewerten (1–10). Chronischer Stress hält Cortisol hoch, verschlechtert Schlaf und begünstigt Bauchfett — ein unterschätzter Bremsklotz.",
      behavior: "Feiere messbar Erreichtes mit einer nicht-essbaren Belohnung. Belohnung festigt Gewohnheiten.",
      checkin: "Score-Veränderung, Bauch-Differenz, Kraftzuwachs, gewählter Hebel."
    },
    {
      week: 7, phase: "optimize", title: "Feinjustierung statt Neustart",
      focus: "Phase 3. Du baust nichts Neues — du verfeinerst. Kleine Schrauben, große Wirkung.",
      science: "Sobald die Basics laufen, kommt Fortschritt aus Konsistenz und kleinen Anpassungen, nicht aus radikalen Wechseln. Ständiges Programm-Hopping ist einer der häufigsten Fehler — der Reiz kann nie wirken, wenn man ihn ständig austauscht.",
      lesson: [
        "Justiere Kalorien nur in kleinen Schritten (±150 kcal) und nur, wenn der 2–3-Wochen-Trend es verlangt. Greif die schwächste Grundübung gezielt an: etwas mehr Volumen oder Fokus dort, wo du am meisten zurückliegst.",
        "Erhöhe eher die Alltagsbewegung (Schritte/NEAT), als das Essen weiter zu kürzen. NEAT — alles, was du außerhalb von Sport bewegst — ist ein riesiger, stark unterschätzter Energieposten und lässt sich nach oben drehen, ohne dass du hungerst."
      ],
      todos: [
        "Kalorien bei Bedarf um max. ±150 kcal anpassen",
        "Schwächste Grundübung identifizieren und priorisieren",
        "Protein-Verteilung prüfen: 30–50 g pro Mahlzeit über den Tag",
        "Schritte um ~1.000/Tag erhöhen statt Kalorien zu senken"
      ],
      train: "Intensitätstechniken sparsam einsetzen: bei der letzten Übung einer Muskelgruppe näher ans Versagen (0–1 RIR). Grundübungen bleiben bei 1–2 RIR für Technik und Sicherheit.",
      fuel: "Mahlzeiten-Timing optimieren: Protein gleichmäßig verteilen, Kohlenhydrate um das Training. Das holt die letzten Prozent Leistung und Erholung.",
      recovery: "Erholungssignale lesen: Trainingslust, Ruhepuls, Laune, Schlaf. Mehrere gleichzeitig im Keller sind das Signal, dass beim Recheck nächste Woche eine Deload-Woche fällig sein könnte — bei guter Erholung dagegen steigerst du einfach weiter.",
      behavior: "Gewohnheits-Check: Welche der letzten 6 Wochen laufen automatisch? Welche brauchen noch den bewussten Trigger?",
      checkin: "Reagiert der Trend auf die Anpassung? NEAT/Schritte gestiegen?"
    },
    {
      week: 8, phase: "optimize", title: "Recheck #2 & Deload nur bei Bedarf",
      focus: "Zweiter fester Recheck-Punkt — und die ehrliche Frage: Braucht dein Körper einen Deload, oder läuft es? Ein Deload ist ein Werkzeug gegen aufgestaute Ermüdung, kein Pflichttermin im Kalender.",
      science: "Ermüdung akkumuliert über Wochen — aber nicht bei jedem gleich schnell. Ein Deload (reduziertes Volumen/Intensität) hilft, wenn sich Müdigkeit, Leistungsabfall oder Gelenkstress aufstauen; wer top regeneriert und weiter progressiert, braucht keine künstliche Bremse. Steuere ihn nach Signalen, nicht nach dem Datum.",
      lesson: [
        "Recheck: Stell Gewicht, Bauchumfang, Kraftwerte und Schlaf neben Woche 1 und Woche 4. Entscheide daraus die zweite Hälfte — und ob dein Modus noch passt.",
        "Deload-Entscheidung nach Bedarf: Mehrere dieser Signale gleichzeitig (Kraft fällt über 1–2 Wochen, Dauermüdigkeit, mieser Schlaf, Gelenke zwicken, Trainingslust am Boden)? Dann eine leichtere Woche (Volumen/Last ~30–50 % runter). Läuft alles rund? Dann steigere normal weiter — ein erzwungener Deload wäre hier nur verschenkte Zeit."
      ],
      todos: [
        "Recheck #2: alle Marker gegen Woche 1 und 4 halten (Gewicht/Bauch/Kraft/Schlaf)",
        "Ehrlich prüfen: stauen sich Ermüdungs-Signale? (Kraft ↓, Schlaf schlecht, Gelenke, Lust am Boden)",
        "Nur bei Bedarf: eine Deload-Woche einlegen (Volumen/Last ~30–50 % senken)",
        "Optional bei CUT: 3–5 Tage Diät-Pause auf Erhaltung, Protein hoch"
      ],
      train: "Wenn Deload nötig: leicht und sauber, gleiche Übungen, deutlich weniger Sätze und Last. Wenn nicht: normal weiter progressieren. Cardio-Basis (Zone 2) läuft in beiden Fällen locker weiter.",
      fuel: "Bei Diät-Pause: Kalorien auf Erhaltung, Protein hoch. Sonst deinen Modus normal fortführen.",
      recovery: "Schlaf, Tageslicht am Morgen, Spaziergänge. Wenn du deloadest, ist Erholung diese Woche die eigentliche Leistung — ohne schlechtes Gewissen.",
      behavior: "Reflektiere: Was war in 7 Wochen dein größter mentaler Widerstand? Plane konkret, wie du ihn in Phase 3 entschärfst.",
      checkin: "Recheck gemacht? Deload nötig oder läuft es? Schlaf, Energie, Trainingslust?"
    },
    {
      week: 9, phase: "optimize", title: "Plateaus durchbrechen",
      focus: "Wenn etwas stockt, gehst du eine Checkliste durch — statt alles über den Haufen zu werfen.",
      science: "Ein echtes Plateau zeigt sich erst über 2–3 Wochen ohne Trendbewegung. Häufigste Ursachen sind selten „der Stoffwechsel”, sondern gestiegene Portionen, weniger Alltagsbewegung (adaptive Thermogenese senkt NEAT), zu wenig Schlaf oder zu schwacher Trainingsreiz.",
      lesson: [
        "Erst prüfen, ob es überhaupt ein Plateau ist: nur der 2–3-Wochen-Trend zählt, nicht die Tageswaage. Dann die Reihenfolge einhalten: 1) 2–3 Tage ehrlich tracken (Portionen?), 2) Schritte/NEAT erhöhen, 3) Schlaf und Stress prüfen, 4) erst zuletzt Kalorien leicht senken.",
        "Beim Training reicht oft ein zusätzlicher Satz bei der schwächsten Übung oder 1–2 Wiederholungen mehr als neuer Reiz. Wasser, Salz und Glykogen verschleiern Fettabbau auf der Waage — bei stabilem Protein und Defizit kommt der sichtbare Sprung oft verzögert."
      ],
      todos: [
        "Trend über 2–3 Wochen ehrlich bewerten",
        "3 Tage nachtracken: sind Portionen hochgeschlichen?",
        "Schritte/NEAT erhöhen statt sofort Kalorien zu senken",
        "Schlaf & Stress als Bremsfaktoren prüfen"
      ],
      train: "Reiz erhöhen: +1 Satz bei der schwächsten Muskelgruppe oder kleine Gewichtssteigerung. Nicht das ganze Programm wechseln.",
      fuel: "Defizit halten, Geduld behalten. Der Körper gleicht über Wassereinlagerung kurzfristig aus — der Trend gewinnt, wenn die Bilanz stimmt.",
      recovery: "Oft ist nicht der Plan das Problem, sondern die Erholung. Eine zusätzliche Stunde Schlaf schlägt jede neue „Fatburner”-Idee.",
      behavior: "Umfeld-Check: Welche Lebensmittel liegen sichtbar herum? Gestalte deine Umgebung so, dass die gute Wahl die einfache ist.",
      checkin: "Welcher Hebel hat angeschlagen? Trend wieder in Bewegung?"
    },
    {
      week: 10, phase: "optimize", title: "Blutwerte, Hormone & ehrliche Aufklärung",
      focus: "Diese Woche schaust du unter die Haube: Blutwerte als Datenbasis — plus eine sachliche Aufklärung über Hormone und Peptide, ohne Hype und ohne Empfehlungen.",
      science: "Viele „Männer-ab-30”-Symptome (Müdigkeit, weniger Antrieb, Bauchfett, schlechter Schlaf) werden vorschnell Hormonen zugeschrieben. Die Forschung ist eindeutig, dass Lebensstil — Schlaf, Krafttraining, Körperfettreduktion, Vitamin-D-Status, Alkohol, Stress — Testosteron und Wohlbefinden messbar beeinflusst. Deshalb kommen die natürlichen Hebel immer zuerst.",
      lesson: [
        "Blutwerte sind kein Selbstzweck, sondern eine Datenbasis fürs Arztgespräch. Sinnvolle Marker für Männer (immer ärztlich einordnen): Lipidprofil, Nüchternglukose bzw. HbA1c, Vitamin D, Ferritin, Entzündung (hs-CRP) und — bei Symptomen — Testosteron (mehrfach, morgens gemessen) plus SHBG.",
        "Lies dazu in der Wissens-Bibliothek unten den Abschnitt „Hormone & Peptide”. Wichtig und ehrlich: MaleMetrix stellt keine Diagnosen und gibt keine Therapie-, Hormon- oder Medikamentenempfehlungen. Auffällige Werte gehören in ärztliche Hände."
      ],
      todos: [
        "Optional: Basis-Blutbild beim Arzt anstoßen oder letzte Werte raussuchen",
        "Blutwerte-Checkliste durchgehen und Fragen für den Arzt notieren",
        "Die 5 natürlichen Testosteron-Hebel ehrlich bewerten (Schlaf, Training, Körperfett, Vitamin D, Alkohol/Stress)",
        "Supplement-Stack auf das evidenzbasierte Minimum eindampfen"
      ],
      train: "Konstanz halten wie in Woche 9. Kein neuer Reiz nötig, solange der letzte noch wirkt.",
      fuel: "Keine Wundermittel. Evidenzbasierte Basis: Kreatin-Monohydrat 3–5 g/Tag (eines der bestuntersuchten Supplemente für Kraft und Muskel), Vitamin D bei nachgewiesenem Mangel, ausreichend Protein. Alles andere ist Feinschliff.",
      recovery: "Niedriger Antrieb und schlechter Schlaf? Zuerst Schlaf, Training und Stress optimieren — und bei Verdacht ärztlich abklären. Nicht in Eigenregie mit Substanzen experimentieren.",
      behavior: "Informier dich kritisch: Foren und Influencer verkaufen oft Abkürzungen. Lern, seriöse Quellen von Marketing zu unterscheiden.",
      checkin: "Hast du jetzt eine Datenbasis statt Bauchgefühl? Stack reduziert?",
      note: "Aufklärung, keine Empfehlung: Hormone (z. B. Testosteron-Therapie) und Peptide sind in Deutschland verschreibungspflichtig und gehören ausschließlich in ärztliche Hände. Selbstmedikation und Schwarzmarkt-Präparate sind gesundheitlich gefährlich und rechtlich riskant. Dieses Programm nennt bewusst keine Substanzen, Dosierungen oder Protokolle."
    },
    {
      week: 11, phase: "lockin", title: "Re-Check & Bilanz",
      focus: "Jetzt wird mit Zahlen sichtbar, was 10 Wochen Arbeit gebracht haben — nicht mit Gefühl.",
      science: "Objektive Vorher-Nachher-Daten sind nicht nur Motivation. Sie zeigen dir, welche deiner Hebel am stärksten gewirkt haben — und damit, was du langfristig behältst und was du streichen kannst.",
      lesson: [
        "Vollständiger Re-Check: Score, Gewicht, Bauchumfang, Fotos, Kraftwerte, Schlaf. Stell alles Woche 1 / Woche 6 / heute nebeneinander. Auch kleine Veränderungen zählen — und summieren sich über Monate.",
        "Markiere die 3 Gewohnheiten, die den größten Unterschied gemacht haben. Die werden der Kern deines Dauer-Systems."
      ],
      todos: [
        "Score-Check erneut machen, mit Woche 1 und 6 vergleichen",
        "Alle Marker vollständig gegenüberstellen (inkl. Fotos)",
        "Kraftzuwächse dokumentieren (Vergleich zur Baseline)",
        "Die 3 wirksamsten Gewohnheiten markieren"
      ],
      train: "Letzte progressive Woche. Versuch bei 1–2 Grundübungen einen sauberen neuen Bestwert — als Beweis für deinen Kraftzuwachs.",
      fuel: "Halte, was funktioniert hat. Schreib deine persönlichen Ernährungsregeln auf, die auch ohne Tracking laufen.",
      recovery: "Vergleiche deinen Schlaf mit Woche 1 — für viele der größte, am meisten unterschätzte Gewinn.",
      behavior: "Reflektiere: Wer bist du nach 11 Wochen geworden? Identität („ich bin jemand, der trainiert”) hält Gewohnheiten stabiler als reine Ziele.",
      checkin: "Score-Veränderung, Bauch-Differenz, Kraftzuwachs, Schlafqualität."
    },
    {
      week: 12, phase: "lockin", title: "Final-Recheck, Erhaltung & nächster Schritt",
      focus: "Dritter und letzter fester Recheck (Woche 4 → 8 → 12): Du machst die 12 Wochen mit Zahlen sichtbar. Das Ziel ist kein Ende, sondern ein System, das ohne Plan weiterläuft — und die bewusste Entscheidung, in welchem Modus es weitergeht.",
      science: "Die meisten Programme scheitern nicht an der Diät, sondern am Danach. Ein bewusster Übergang in die Erhaltung — langsames Zurückfahren des Defizits und Gewohnheiten als Identität — ist der Unterschied zwischen kurzem Erfolg und dauerhaftem Ergebnis.",
      lesson: [
        "Reverse-Phase: Kalorien schrittweise (≈100–150 kcal/Woche) Richtung Erhaltung zurückführen und das Gewicht beobachten. So vermeidest du den Jojo-Effekt. Protein bleibt hoch.",
        "Schreib dein Dauer-System in 5 einfachen Regeln auf — so simpel, dass sie auch in einer Stresswoche halten. Und setz dein nächstes 12-Wochen-Ziel: gezielter Muskelaufbau (leichter Überschuss), weiter Richtung Sichtbarkeit (weiteres Defizit) oder Erhalt mit Kraftfokus. Dein Körper ist jetzt bereit für die nächste Stufe."
      ],
      todos: [
        "Erhaltungskalorien festlegen und die Reverse-Phase starten",
        "Dein Dauer-System in 5 Regeln aufschreiben",
        "Nächsten Modus für die kommenden 12 Wochen wählen (CUT/RECOMP/BUILD/PERFORM)",
        "Re-Check-Termin in 4 Wochen in den Kalender setzen",
        "Final-Recheck: alle Marker gegen Woche 1, 4 und 8 stellen"
      ],
      train: "Plan beibehalten oder auf das nächste Ziel ausrichten. Konstanz über Monate baut den Körper — nicht 12 perfekte Wochen.",
      fuel: "Langsames Reverse, Protein bleibt hoch. Gewicht und Energie beobachten, nicht überschießen.",
      recovery: "Schlaf und Schritte bleiben die Basis — auch ohne Programm. Das sind deine nicht-verhandelbaren Anker.",
      behavior: "Du hast bewiesen, dass du es kannst. Die Frage ist jetzt nicht mehr „ob”, sondern „wie weit”. Entscheide bewusst, wie dein nächstes Kapitel aussieht.",
      checkin: "Steht das Erhaltungssystem? Ist das nächste Ziel klar?"
    }
  ],

  /* ---------- Wissens-Bibliothek (Vertiefung) ---------- */
  modules: [
    {
      id: "recomp", icon: "🔄", kicker: "Grundlage",
      title: "Die Wissenschaft hinter „Fett ab + Muskel auf”",
      body: [
        "Lange galt: entweder Muskelaufbau (Überschuss) oder Fettabbau (Defizit) — nicht beides. Für eine bestimmte Gruppe stimmt das nicht: Körperrekomposition funktioniert besonders gut bei Wieder-Einsteigern, Anfängern und Männern mit höherem Körperfettanteil. Der Körper kann gespeichertes Fett als Energie nutzen und gleichzeitig Muskelprotein aufbauen — wenn der Reiz und die Bausteine da sind.",
        "Die drei nicht verhandelbaren Bedingungen: ausreichend Protein (1,6–2,2 g/kg), progressives Krafttraining (steigender Reiz) und genug Schlaf (Reparatur und Hormonbalance). Fehlt eine davon, kippt das System Richtung Fett-Zunahme oder Muskel-Verlust.",
        "Erwartungsmanagement: Recomp ist langsamer als reiner Auf- oder Abbau, dafür nachhaltiger und sichtbarer. Du wirst die Veränderung eher im Spiegel und am Maßband sehen als auf der Waage — deshalb misst du in diesem Programm mehr als nur Gewicht."
      ]
    },
    {
      id: "training", icon: "🏋️", kicker: "Training",
      title: "Krafttraining, das wirklich wirkt",
      body: [
        "Drei Stellschrauben entscheiden über Muskelaufbau: Intensität (nah genug ans Versagen, 0–3 RIR), Volumen (rund 10+ harte Sätze pro Muskel und Woche) und Progression (mehr Gewicht oder Wiederholungen über die Zeit). Frequenz und Übungsauswahl sind Feintuning.",
        "Das 3-Tage-Ganzkörpersystem dieses Programms trifft jede große Muskelgruppe 3× pro Woche mit moderatem Volumen pro Einheit — ideal für Berufstätige, weil es Ausfälle verzeiht und gute Erholung erlaubt. Priorisiere Grundübungen über die großen Bewegungsmuster: Kniebeugen, Hüftstrecken (Kreuzheben/Hip Thrust), Drücken (Bank/Schulter), Ziehen (Rudern/Klimmzug).",
        "Der häufigste Fehler ist nicht zu wenig Gewicht, sondern zu wenig Anstrengung bei gleichzeitig schlechter Technik. Sauber, voller Bewegungsumfang, kontrolliert — und über Wochen messbar stärker werden. Das ist das ganze Geheimnis."
      ]
    },
    {
      id: "nutrition", icon: "🍳", kicker: "Ernährung",
      title: "Ernährung ohne Dogma",
      body: [
        "Keine Diät ist „magisch”. Low Carb, Keto, IF und Co. funktionieren, wenn sie zwei Dinge schaffen: ein Kaloriendefizit und genug Protein. Wähle das Muster, das zu deinem Alltag passt und das du durchhältst — Adhärenz schlägt jede theoretisch optimale Diät.",
        "Die Hierarchie: 1) Energiebilanz (entscheidet über Gewicht), 2) Protein (entscheidet über Muskel und Sättigung), 3) Lebensmittelqualität und Ballaststoffe (entscheiden über Sättigung, Marker und Wohlbefinden), 4) Verteilung und Timing (Feinschliff), 5) Supplemente (das letzte, kleinste Prozent).",
        "Praktisch heißt das: 2–4 proteinzentrierte Mahlzeiten, viel Gemüse und Obst für Volumen, minimal verarbeitete Basis, Flüssigkalorien klein halten. Kein Lebensmittel ist verboten — Menge und Häufigkeit entscheiden."
      ]
    },
    {
      id: "sleep", icon: "😴", kicker: "Regeneration",
      title: "Schlaf: dein stärkstes legales Performance-Mittel",
      body: [
        "Schlaf ist kein Luxus, sondern ein Leistungsfaktor. In Studien verlieren Menschen, die im Defizit zu wenig schlafen (unter ~5–6 h), deutlich mehr Muskel und weniger Fett als ausgeschlafene — bei gleicher Ernährung. Zu wenig Schlaf senkt zudem Testosteron messbar und treibt Hunger über Ghrelin nach oben.",
        "Die wirksamsten Hebel sind unspektakulär: feste Schlaf- und Aufstehzeiten, 7–9 h Fenster, Tageslicht am Morgen, Koffein-Stopp 8–10 h vor dem Schlafen, Alkohol reduzieren (er zerstört Tiefschlaf), kühles dunkles Zimmer, letzte 30–60 Min ohne hellen Bildschirm.",
        "Wenn du in 12 Wochen nur eine Sache wirklich verbesserst und es ist dein Schlaf — du wirst trotzdem deutliche Fortschritte bei Energie, Hunger, Trainingsleistung und Stimmung sehen."
      ]
    },
    {
      id: "blood", icon: "🩸", kicker: "Marker",
      title: "Blutwerte für Männer verstehen",
      body: [
        "Blutwerte machen das Unsichtbare sichtbar und geben dir und deinem Arzt eine Datenbasis statt Bauchgefühl. Eine sinnvolle Basis für Männer (immer ärztlich einordnen): Lipidprofil (Cholesterin/Triglyceride), Nüchternglukose bzw. HbA1c, Vitamin D, Ferritin (Eisenspeicher), hs-CRP (stille Entzündung) und bei Symptomen Testosteron plus SHBG.",
        "Viele dieser Marker reagieren auf genau die Hebel dieses Programms: Körperfett runter, Krafttraining, besserer Schlaf, weniger Alkohol und mehr Ballaststoffe verbessern bei vielen Männern über die Zeit das Stoffwechsel- und Entzündungsbild. Das ist allerdings individuell — die Einordnung gehört zum Arzt.",
        "Wichtig: MaleMetrix gibt keine Diagnosen und keine Therapieempfehlungen. Der Wert dieses Wissens liegt darin, vorbereitet und mit den richtigen Fragen ins Arztgespräch zu gehen."
      ],
      callout: { type: "info", text: "Ein einzelner Wert sagt wenig — Verlauf und Gesamtbild zählen. Auffällige oder grenzwertige Werte immer ärztlich abklären lassen." }
    },
    {
      id: "hormones", icon: "⚕️", kicker: "Aufklärung",
      title: "Hormone & Peptide: ehrliche Aufklärung statt Hype",
      body: [
        "Kaum ein Thema ist online so aufgeladen — und so voll gefährlichem Halbwissen — wie Testosteron, TRT und Peptide. Dieser Abschnitt klärt sachlich auf. Er gibt bewusst keine Empfehlungen, keine Substanzen und keine Dosierungen.",
        "Testosteron sinkt bei Männern ab etwa 30–40 langsam (grob rund 1 % pro Jahr). Aber: Viele Symptome, die man vorschnell „niedrigem T” zuschreibt — Müdigkeit, weniger Antrieb, Bauchfett, schlechter Schlaf — sind unspezifisch und hängen oft viel stärker am Lebensstil als an einem einzelnen Hormonwert. Genau deshalb arbeitet dieses Programm zuerst an den Hebeln, die nachweislich wirken: Krafttraining, Körperfett senken, Schlaf, Vitamin-D-Status, weniger Alkohol, Stressmanagement.",
        "TRT (Testosteron-Ersatztherapie) ist ein medizinisches Verfahren. In Deutschland ist Testosteron verschreibungspflichtig. Eine seriöse Indikation braucht wiederholte, morgens gemessene Werte plus klare Symptome und ärztliche Abklärung — und sie hat reale Nebenwirkungen und Konsequenzen, unter anderem für die Fruchtbarkeit. Das gehört zu einem Arzt (Androloge, Endokrinologe, Urologe), nicht in ein Coaching und nicht in ein Internetforum.",
        "Peptide (etwa Wachstumshormon-Sekretagoga und andere) werden online stark gehyped. Die Realität ist nüchterner: Für viele ist die Studienlage dünn oder uneindeutig, viele sind nicht als Arzneimittel zugelassen, der rechtliche Status ist heikel und Schwarzmarkt-Ware ist häufig verunreinigt oder falsch deklariert. Das Risiko trägt allein der Anwender.",
        "Die ehrliche Botschaft: Das meiste, was Männer suchen, wenn sie über Hormone und Peptide nachdenken — mehr Energie, besserer Körper, mehr Antrieb — erreichen sie über die Grundlagen dieses Programms, sichtbar und nachhaltig. Erst wenn die Basis steht und Werte trotzdem auffällig sind, ist der nächste Schritt ein Arzt mit einer guten Datenbasis."
      ],
      callout: { type: "warn", text: "MaleMetrix nennt bewusst keine Substanzen, Dosierungen oder Protokolle und gibt keine medizinischen Empfehlungen. Hormone und Peptide sind verschreibungspflichtig und gehören in ärztliche Hände. Selbstmedikation ist gesundheitlich gefährlich und rechtlich riskant." },
      coachingTease: "Du willst hier tiefer und individueller einsteigen? Im 1:1-Coaching arbeiten wir mit DEINEN echten Werten: Wir strukturieren deine Blutwerte über die Zeit, holen zuerst das Maximum aus den natürlichen Hebeln heraus und bereiten dein Arztgespräch vor — welche Werte sinnvoll sind, welche Fragen du stellst und wie du Ergebnisse einordnest. So gehst du mit Daten und einem Plan zum Arzt statt mit Forenwissen. (Auch das Coaching ersetzt keinen Arzt und gibt keine Verschreibungen oder Dosierungen.)"
    },
    {
      id: "supplements", icon: "💊", kicker: "Feinschliff",
      title: "Supplemente: was die Evidenz wirklich hergibt",
      body: [
        "95 % der Supplement-Industrie ist Marketing. Die kurze, evidenzbasierte Liste, die für die meisten Männer überhaupt einen Unterschied macht: Kreatin-Monohydrat (3–5 g/Tag) — eines der bestuntersuchten Mittel für Kraft und Muskel; Vitamin D bei nachgewiesenem Mangel; Protein-Pulver als praktische Hilfe, um das Eiweißziel zu treffen; Koffein als Trainings-Booster; bei wenig Fisch ggf. Omega-3.",
        "Alles andere — Test-Booster, Fatburner, exotische Pülverchen — liefert im besten Fall einen vernachlässigbaren Effekt und im schlechtesten Fall nur teuren Urin. Supplemente sind der letzte, kleinste Hebel: Sie kommen NACH Training, Ernährung und Schlaf, nicht davor.",
        "Bei Vitamin D und allem, was über die Basis hinausgeht, gilt: erst Blutwert, dann supplementieren — und im Zweifel ärztlich abklären."
      ]
    }
  ],

  /* ---------- Coaching-Brücke (Upsell, am Ende) ---------- */
  coachingCta: {
    eyebrow: "Wie es weitergeht",
    title: "Du hast das System. Jetzt kommt die Personalisierung.",
    lead: "Dieses Programm hat dir das komplette System gegeben — und du hast bewiesen, dass du es umsetzt. Das 1:1-Coaching ist der nächste Schritt für alle, die schneller, individueller und mit echter Begleitung weitergehen wollen.",
    points: [
      "Dein Plan wird wöchentlich an deine Daten angepasst — kein Standard, sondern dein Programm.",
      "Persönliches Feedback zu Training, Technik und Ernährung (WhatsApp/Telegram, Mo–Fr).",
      "Individuelle Blutwerte-Strategie + Arztgespräch-Vorbereitung für deine Situation.",
      "Fortgeschrittene Periodisierung für die nächste Stufe deiner Entwicklung.",
      "Accountability, die dich dranhält, wenn der Alltag dazwischenkommt."
    ],
    note: "Als Programmteilnehmer hast du den besten Einstieg ins Coaching — frag im kostenlosen Analysegespräch nach deiner Programm-Kondition.",
    ctaPrimary: { label: "Analysegespräch buchen", href: "termin.html" },
    ctaSecondary: { label: "Coaching ansehen", href: "coaching.html" }
  },

  /* ---------- Vertiefung: Ebooks, Rechner & Tracker pro Kapitel ----------
     kind: "ebook" 📕 · "check" 🎯 (Score-Check) · "tool" 🧮 (Rechner, mit #id
     direkt zum Rechner) · "tracker" 📈 · "page" 📄. Frei editierbar. */
  resources: {
    weeks: {
      1: [
        { kind: "check", label: "Score-Check starten", href: "check.html" },
        { kind: "tracker", label: "Tracker einrichten", href: "tracker.html" },
        { kind: "ebook", label: "Ebook: Gewohnheiten, die bleiben", href: "ebooks/gewohnheiten.html" }
      ],
      2: [
        { kind: "tool", label: "Protein-Rechner", href: "tools.html#protein" },
        { kind: "tool", label: "TDEE-Rechner", href: "tools.html#tdee" },
        { kind: "ebook", label: "Ebook: Protein ohne Kochen", href: "ebooks/protein-system.html" }
      ],
      3: [
        { kind: "tracker", label: "Training-Tracker nutzen", href: "tracker.html" },
        { kind: "ebook", label: "Ebook: Das 3-Tage-System", href: "ebooks/training-system.html" }
      ],
      4: [
        { kind: "tool", label: "TDEE-Rechner", href: "tools.html#tdee" },
        { kind: "tool", label: "Makro-Rechner", href: "tools.html#macros" },
        { kind: "ebook", label: "Ebook: Fettabbau ohne Hunger", href: "ebooks/fettabbau.html" }
      ],
      5: [
        { kind: "tool", label: "TDEE-Rechner", href: "tools.html#tdee" },
        { kind: "tool", label: "Protein-Rechner", href: "tools.html#protein" },
        { kind: "ebook", label: "Ebook: Fettabbau ohne Hunger", href: "ebooks/fettabbau.html" }
      ],
      6: [
        { kind: "check", label: "Score-Check wiederholen", href: "check.html" },
        { kind: "tracker", label: "Tracker-Verlauf prüfen", href: "tracker.html" },
        { kind: "ebook", label: "Ebook: Masterguide", href: "ebooks/masterguide.html" }
      ],
      7: [
        { kind: "tool", label: "TDEE-Rechner", href: "tools.html#tdee" },
        { kind: "ebook", label: "Ebook: Fettabbau ohne Hunger", href: "ebooks/fettabbau.html" }
      ],
      8: [
        { kind: "tracker", label: "Schlaf im Tracker", href: "tracker.html" },
        { kind: "ebook", label: "Ebook: Schlaf- & Energie-Reset", href: "ebooks/schlaf-energie.html" },
        { kind: "ebook", label: "PDF: Der Schlaf-Stack", href: "ebooks/files/MaleMetrix_Schlaf-Stack.pdf" }
      ],
      9: [
        { kind: "tracker", label: "Trend im Tracker lesen", href: "tracker.html" },
        { kind: "ebook", label: "Ebook: Fettabbau ohne Hunger", href: "ebooks/fettabbau.html" }
      ],
      10: [
        { kind: "page", label: "Blutwerte-Checkliste", href: "blutwerte.html" },
        { kind: "ebook", label: "Ebook: Blutwerte & Hormone verstehen", href: "ebooks/blutwerte-guide.html" },
        { kind: "ebook", label: "Ebook: Supplemente mit Evidenz", href: "ebooks/supplements.html" }
      ],
      11: [
        { kind: "check", label: "Score-Check (Re-Check)", href: "check.html" },
        { kind: "tool", label: "Körperfett (US-Navy)", href: "tools.html#navy" },
        { kind: "tracker", label: "Vorher/Nachher im Tracker", href: "tracker.html" }
      ],
      12: [
        { kind: "tool", label: "TDEE-Rechner (Erhaltung)", href: "tools.html#tdee" },
        { kind: "ebook", label: "Ebook: Gewohnheiten, die bleiben", href: "ebooks/gewohnheiten.html" }
      ]
    },
    modules: {
      recomp:      { label: "Ganzes Ebook: Masterguide", href: "ebooks/masterguide.html" },
      training:    { label: "Ganzes Ebook: Das 3-Tage-System", href: "ebooks/training-system.html" },
      nutrition:   { label: "Ganzes Ebook: Protein ohne Kochen", href: "ebooks/protein-system.html" },
      sleep:       { label: "Ganzes Ebook: Schlaf- & Energie-Reset", href: "ebooks/schlaf-energie.html" },
      blood:       { label: "Ganzes Ebook: Blutwerte & Hormone verstehen", href: "ebooks/blutwerte-guide.html" },
      hormones:    { label: "Ganzes Ebook: Blutwerte & Hormone verstehen", href: "ebooks/blutwerte-guide.html" },
      supplements: { label: "Ganzes Ebook: Supplemente mit Evidenz", href: "ebooks/supplements.html" }
    }
  }
};
