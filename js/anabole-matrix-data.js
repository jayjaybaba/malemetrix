/* ==========================================================================
   MALEMETRIX — DIE ANABOLE MATRIX (Datenmodell)
   Elf anabole und katabole Signalwege, zwölf steuerbare Hebel und die
   Zuordnung dazwischen. Reine Daten, keine Darstellung, kein Zustand.

   REGELN FÜR DIESE DATEI (nicht verhandelbar, vgl. PROOF_STANDARD.md §0):
   - Jede Quelle ist real und web-verifiziert und trägt DOI + URL.
     Es gibt keine „unresolved"-Platzhalter, die wie Belege aussehen.
   - Wo für eine Aussage keine Landmark-Quelle vorliegt, steht das
     ausdrücklich im Feld `evidenzNote` — es wird keine erfunden.
   - Keine Einnahme-, Dosierungs- oder Therapieempfehlung für Substanzen.
     Trainings-, Protein- und Schlafmengen sind Ernährungs-/Trainingslehre
     und stehen mit Quelle; alles Pharmakologische bleibt beim Arzt.
   Geprüft von: tools-dev/tests/anabole-matrix.test.js
   ========================================================================== */
(function (root) {
  "use strict";

  var GEPRUEFT = "2026-08-01";

  /* ======================= QUELLEN-REGISTER =================================
     Die ersten fünf stehen bereits im Wissensgraph (js/os/intelligence/
     knowledge.js) und sind hier identisch übernommen — eine Quelle, eine
     Fassung. Die letzten sechs sind für diese Seite ergänzt und ebenso
     verifiziert (Titel, Journal, Band/Seiten, DOI, kanonische URL). */
  var QUELLEN = {
    morton_2018: {
      kurz: "Morton 2018 · Protein",
      titel: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults",
      autoren: "Morton RW, et al.", jahr: 2018,
      venue: "Br J Sports Med 52(6):376–384",
      doi: "10.1136/bjsports-2017-097608",
      url: "https://bjsm.bmj.com/content/52/6/376",
      art: "META-ANALYSE",
      aussage: "Die Dosis-Wirkung von Protein plateauisiert nahe 1,62 g/kg/Tag (49 RCTs, 1863 Teilnehmer)."
    },
    schoenfeld_2017: {
      kurz: "Schoenfeld 2017",
      titel: "Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis",
      autoren: "Schoenfeld BJ, Ogborn D, Krieger JW", jahr: 2017,
      venue: "J Sports Sci 35(11):1073–1082",
      doi: "10.1080/02640414.2016.1210197",
      url: "https://www.tandfonline.com/doi/full/10.1080/02640414.2016.1210197",
      art: "META-ANALYSE",
      aussage: "Hypertrophie steigt gestuft mit dem Wochenvolumen; ~10 harte Sätze je Muskel und Woche liefern nahezu maximale Wirkung."
    },
    kreider_2017: {
      kurz: "Kreider 2017",
      titel: "ISSN position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine",
      autoren: "Kreider RB, et al.", jahr: 2017,
      venue: "J Int Soc Sports Nutr 14:18",
      doi: "10.1186/s12970-017-0173-z",
      url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z",
      art: "POSITIONSPAPIER",
      aussage: "Kreatin-Monohydrat ist das am besten belegte Supplement für Kraft und Trainingsleistung; eine Ladephase ist nicht nötig."
    },
    watson_2015: {
      kurz: "Watson 2015",
      titel: "Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the AASM and Sleep Research Society",
      autoren: "Watson NF, et al.", jahr: 2015,
      venue: "J Clin Sleep Med 11(6):591–592",
      doi: "10.5664/jcsm.4758",
      url: "https://jcsm.aasm.org/doi/10.5664/jcsm.4758",
      art: "KONSENS",
      aussage: "Mindestens 7 Stunden Schlaf pro Nacht sind für Erwachsene nötig; 6 Stunden und weniger reichen nicht."
    },
    bhasin_2018: {
      kurz: "Bhasin 2018 · Leitlinie",
      titel: "Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline",
      autoren: "Bhasin S, et al.", jahr: 2018,
      venue: "J Clin Endocrinol Metab 103(5):1715–1744",
      doi: "10.1210/jc.2018-00229",
      url: "https://academic.oup.com/jcem/article/103/5/1715/4939465",
      art: "LEITLINIE",
      aussage: "Die Diagnose eines Testosteronmangels verlangt Symptome plus zwei morgendliche, nüchterne Messungen — nicht einen Einzelwert."
    },
    west_2012: {
      kurz: "West 2012",
      titel: "Associations of exercise-induced hormone profiles and gains in strength and hypertrophy in a large cohort after weight training",
      autoren: "West DWD, Phillips SM", jahr: 2012,
      venue: "Eur J Appl Physiol 112(7):2693–2702",
      doi: "10.1007/s00421-011-2246-z",
      url: "https://link.springer.com/article/10.1007/s00421-011-2246-z",
      art: "KOHORTE",
      aussage: "Die akuten Anstiege von Wachstumshormon, freiem Testosteron und IGF-1 nach dem Training korrelierten nicht mit dem Zuwachs an Magermasse oder Kraft (n = 56)."
    },
    morton_ar_2018: {
      kurz: "Morton 2018 · AR",
      titel: "Muscle Androgen Receptor Content but Not Systemic Hormones Is Associated With Resistance Training-Induced Skeletal Muscle Hypertrophy in Healthy, Young Men",
      autoren: "Morton RW, Sato K, Gallaugher MPB, Oikawa SY, McNicholas PD, Fujita S, Phillips SM", jahr: 2018,
      venue: "Front Physiol 9:1373",
      doi: "10.3389/fphys.2018.01373",
      url: "https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.01373/full",
      art: "SEKUNDÄRANALYSE",
      aussage: "Der Androgenrezeptor-Gehalt im Muskel hing mit der Hypertrophie zusammen — die zirkulierenden Hormone nicht (n = 49)."
    },
    leproult_2011: {
      kurz: "Leproult 2011",
      titel: "Effect of 1 Week of Sleep Restriction on Testosterone Levels in Young Healthy Men",
      autoren: "Leproult R, Van Cauter E", jahr: 2011,
      venue: "JAMA 305(21):2173–2174",
      doi: "10.1001/jama.2011.710",
      url: "https://jamanetwork.com/journals/jama/fullarticle/1029127",
      art: "EXPERIMENTELLE STUDIE",
      aussage: "Eine Woche mit weniger als fünf Stunden Schlaf senkte das Tagestestosteron junger gesunder Männer deutlich."
    },
    refalo_2023: {
      kurz: "Refalo 2023",
      titel: "Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis",
      autoren: "Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ", jahr: 2023,
      venue: "Sports Med 53(3):649–665",
      doi: "10.1007/s40279-022-01784-y",
      url: "https://link.springer.com/article/10.1007/s40279-022-01784-y",
      art: "META-ANALYSE",
      aussage: "Sätze näher am Muskelversagen bringen einen kleinen Hypertrophie-Vorteil (Effektstärke rund 0,15–0,21) — kein großer, aber ein konsistenter."
    },
    bhasin_1996: {
      kurz: "Bhasin 1996",
      titel: "The Effects of Supraphysiologic Doses of Testosterone on Muscle Size and Strength in Normal Men",
      autoren: "Bhasin S, Storer TW, Berman N, et al.", jahr: 1996,
      venue: "N Engl J Med 335(1):1–7",
      doi: "10.1056/NEJM199607043350101",
      url: "https://www.nejm.org/doi/full/10.1056/NEJM199607043350101",
      art: "RCT",
      aussage: "600 mg Testosteron-Enanthat pro Woche über 10 Wochen erhöhten fettfreie Masse, Muskelquerschnitt und Kraft — auch ohne jedes Training."
    },
    bhasin_2001: {
      kurz: "Bhasin 2001",
      titel: "Testosterone dose-response relationships in healthy young men",
      autoren: "Bhasin S, et al.", jahr: 2001,
      venue: "Am J Physiol Endocrinol Metab 281(6):E1172–E1181",
      doi: "10.1152/ajpendo.2001.281.6.E1172",
      url: "https://journals.physiology.org/doi/full/10.1152/ajpendo.2001.281.6.E1172",
      art: "RCT",
      aussage: "Der Zuwachs an fettfreier Masse und Kraft skaliert mit der Testosteron-Dosis — weit über den physiologischen Bereich hinaus."
    },
    stec_2016: {
      kurz: "Stec 2016",
      titel: "Ribosome biogenesis may augment resistance training-induced myofiber hypertrophy and is required for myotube growth in vitro",
      autoren: "Stec MJ, Kelly NA, Many GM, Windham ST, Tuggle SC, Bamman MM", jahr: 2016,
      venue: "Am J Physiol Endocrinol Metab 310(8):E652–E661",
      doi: "10.1152/ajpendo.00486.2015",
      url: "https://journals.physiology.org/doi/10.1152/ajpendo.00486.2015",
      art: "HUMANSTUDIE",
      aussage: "Die Zunahme der ribosomalen Kapazität ging mit dem Ausmaß der Faserhypertrophie einher (n = 42) — die Zahl der Maschinen begrenzt, was das mTORC1-Signal überhaupt umsetzen kann."
    },
    snijders_2017: {
      kurz: "Snijders 2017",
      titel: "Muscle fibre capillarization is a critical factor in muscle fibre hypertrophy during resistance exercise training in older men",
      autoren: "Snijders T, Nederveen JP, Joanisse S, Leenders M, Verdijk LB, van Loon LJC, Parise G", jahr: 2017,
      venue: "J Cachexia Sarcopenia Muscle 8(2):267–276",
      doi: "10.1002/jcsm.12137",
      url: "https://onlinelibrary.wiley.com/doi/10.1002/jcsm.12137",
      art: "HUMANSTUDIE",
      aussage: "Die Kapillarisierung der Typ-II-Fasern zu Beginn sagte voraus, ob über 24 Wochen Krafttraining überhaupt Faserhypertrophie zustande kam."
    },
    damas_2016: {
      kurz: "Damas 2016",
      titel: "Resistance training-induced changes in integrated myofibrillar protein synthesis are related to hypertrophy only after attenuation of muscle damage",
      autoren: "Damas F, Phillips SM, Libardi CA, et al.", jahr: 2016,
      venue: "J Physiol 594(18):5209–5222",
      doi: "10.1113/JP272472",
      url: "https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP272472",
      art: "HUMANSTUDIE",
      aussage: "In Woche 1 war die Proteinsynthese am höchsten und hing NICHT mit dem späteren Zuwachs zusammen — sie floss in die Reparatur. Erst ab Woche 3 sagte sie Hypertrophie voraus."
    },
    schoenfeld_rest_2016: {
      kurz: "Schoenfeld 2016 · Pause",
      titel: "Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men",
      autoren: "Schoenfeld BJ, Pope ZK, Benik FM, et al.", jahr: 2016,
      venue: "J Strength Cond Res 30(7):1805–1812",
      doi: "10.1519/JSC.0000000000001272",
      url: "https://journals.lww.com/nsca-jscr/fulltext/2016/07000/longer_interset_rest_periods_enhance_muscle.3.aspx",
      art: "RCT",
      aussage: "Drei Minuten Satzpause erzeugten bei trainierten Männern mehr Kraft und Muskeldicke als eine Minute — die längere Pause erhält die Leistung, aus der der Reiz entsteht."
    },
    lange_2002: {
      kurz: "Lange 2002",
      titel: "GH Administration Changes Myosin Heavy Chain Isoforms in Skeletal Muscle But Does Not Augment Muscle Strength or Hypertrophy, Either Alone or Combined with Resistance Exercise Training in Healthy Elderly Men",
      autoren: "Lange KHW, Andersen JL, Beyer N, et al.", jahr: 2002,
      venue: "J Clin Endocrinol Metab 87(2):513–523",
      doi: "10.1210/jcem.87.2.8206",
      url: "https://academic.oup.com/jcem/article/87/2/513/2846630",
      art: "RCT",
      aussage: "Wachstumshormon steigerte weder Kraft noch Muskelmasse — weder allein noch zusätzlich zum Krafttraining. Mehr fettfreie Masse ist nicht dasselbe wie mehr kontraktiler Muskel."
    },
    baggish_2017: {
      kurz: "Baggish 2017",
      titel: "Cardiovascular Toxicity of Illicit Anabolic-Androgenic Steroid Use",
      autoren: "Baggish AL, Weiner RB, Kanayama G, et al.", jahr: 2017,
      venue: "Circulation 135(21):1991–2002",
      doi: "10.1161/CIRCULATIONAHA.116.026945",
      url: "https://www.ahajournals.org/doi/10.1161/CIRCULATIONAHA.116.026945",
      art: "KOHORTE",
      aussage: "Bei 140 Kraftsportlern hatten die Anwender eine deutlich schlechtere linksventrikuläre Pumpfunktion (52 % gegenüber 63 %) und mehr koronare Plaque als die Nichtanwender."
    }
  };

  /* ======================= DIE ELF SIGNALWEGE ===============================
     rolle: "gas"        — anaboler Weg, wird aktiv angeschaltet
            "kapazitaet" — bestimmt die Obergrenze, lässt sich nicht hetzen
            "bremse"     — kataboler/hemmender Weg, wird gelöst statt getriggert
     evidenz: STARK | MITTEL | SCHWACH — bezieht sich immer auf den
     STEUERBAREN Hebel, nicht auf die Existenz des Mechanismus. */
  var SIGNALWEGE = [
    {
      id: "SW01",
      name: "Mechanotransduktion",
      kurz: "Mechanotransduktion",
      unter: "Costamere · Integrin/FAK · Titin · Piezo1",
      rolle: "gas",
      was: "Die Muskelfaser misst Zug. Kraft an Costameren, Integrinen und dem Titin-Filament wird in ein chemisches Signal übersetzt. Das ist der einzige Reiz im ganzen System, den kein Nährstoff und kein Hormon ersetzt.",
      schalter: "Hohe mechanische Spannung an der einzelnen Faser — durch schwere Last oder durch Sätze, die nah ans Muskelversagen gehen. Nah am Versagen rekrutiert der Körper auch bei moderater Last die hohen Schwellen mit.",
      fenster: "Signal in Minuten, Anpassung über 24–72 Stunden. Der Reiz muss über Wochen größer werden, sonst verpufft er.",
      nachweis: "Trainingslogbuch: Steigen Last oder Wiederholungen bei gleichem RIR über 4–6 Wochen?",
      fehler: "Sätze bei RIR 4–6 abbrechen, halbe Bewegungsamplitude, alle zwei Wochen das Programm wechseln.",
      grenze: "Über dem individuellen Erholungslimit bringt mehr Volumen nichts mehr — die Dosis-Wirkungs-Kurve flacht ab.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["schoenfeld_2017", "refalo_2023"]
    },
    {
      id: "SW02",
      name: "mTORC1",
      kurz: "mTORC1",
      unter: "p70S6K · 4E-BP1 · Muskelproteinsynthese",
      rolle: "gas",
      was: "Der zentrale Schalter der Muskelproteinsynthese. mTORC1 verrechnet vier Eingänge: mechanischen Reiz, Aminosäuren (vor allem Leucin), Energiestatus und Insulin/IGF-1. Fehlt einer, läuft der Rest ins Leere.",
      schalter: "Leucin über der Schwelle je Mahlzeit plus mechanischer Reiz. Beides zusammen wirkt stärker als jedes für sich.",
      fenster: "Auf eine Mahlzeit 1–3 Stunden. Auf eine Trainingseinheit 24–48 Stunden bei Trainierten, bis 72 Stunden bei Anfängern.",
      nachweis: "Proteinmenge pro Tag UND Verteilung auf 3–5 Mahlzeiten — beides im Log, nicht im Gefühl.",
      fehler: "Tagesmenge stimmt, aber zwei Drittel davon liegen abends. Oder: dem „anabolen Fenster“ hinterherjagen, während die Tagesmenge zu niedrig ist. Und der subtilste: die akute Signalstärke für den Zuwachs halten — in der ersten Trainingswoche war die Proteinsynthese am höchsten und sagte den späteren Zuwachs trotzdem NICHT voraus, weil sie in die Reparatur floss. Erst ab Woche drei hing sie mit Hypertrophie zusammen.",
      grenze: "Über rund 1,6–2,2 g Protein/kg/Tag addiert mehr nichts mehr. mTORC1 ist ein Schalter, kein Regler mit offenem Ende. Und ein starkes Signal auf zu wenig Ribosomen (SW12) bleibt trotzdem folgenlos.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["morton_2018", "damas_2016"]
    },
    {
      id: "SW03",
      name: "IGF-1 / PI3K / Akt",
      kurz: "IGF-1 / Akt",
      unter: "Akt → mTORC1 an, FoxO aus",
      rolle: "gas",
      was: "Der Wachstumsfaktor-Arm. Akt schaltet mTORC1 an und FoxO ab — Aufbau hoch, Abbau runter, in einer Bewegung. Was zählt, ist das lokal im Muskel gebildete IGF-1, nicht die Spitze im Blut.",
      schalter: "Der mechanische Reiz selbst, ausreichende Energie und Schlaf: Die größten Wachstumshormon-Pulse liegen im Tiefschlaf der ersten Nachthälfte.",
      fenster: "Lokal Stunden bis Tage. Systemisch jede Nacht neu — und jede Nacht neu verspielbar.",
      nachweis: "Schlafdauer und Einschlaffenster; Kraftverlauf, wenn du im Defizit bist.",
      fehler: "Auf den Hormonanstieg nach dem Training setzen. In einer Kohorte von 56 Männern korrelierten die akuten Anstiege von Wachstumshormon, freiem Testosteron und IGF-1 nicht mit dem Zuwachs an Magermasse oder Kraft.",
      grenze: "Systemisches IGF-1 lässt sich über Training kaum sinnvoll steuern. Steuerbar sind Schlaf und Energie — sonst nichts.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "MITTEL",
      quellen: ["west_2012", "watson_2015"]
    },
    {
      id: "SW04",
      name: "Androgenrezeptor",
      kurz: "Androgenrezeptor",
      unter: "AR-Dichte im Muskel, nicht der Blutwert",
      rolle: "gas",
      was: "Testosteron wirkt nur dort, wo ein Rezeptor es bindet. Entscheidend ist deshalb weniger der Spiegel im Blut als die Rezeptordichte im Muskel — genau die hing in einer Sekundäranalyse mit der Hypertrophie zusammen, während die zirkulierenden Hormone es nicht taten.",
      schalter: "Krafttraining hebt den Rezeptorgehalt im Muskel über Tage. Körperfett im Korridor hält die Aromatisierung niedrig. Schlaf und wenig Alkohol schützen die eigene Produktion.",
      fenster: "Rezeptorantwort auf einen Reiz 48–72 Stunden. Lebensstil-Effekte auf den Hormonstatus: Wochen bis Monate.",
      nachweis: "Blutbild beim Arzt — Gesamt-Testosteron, freies T oder SHBG, LH. Morgens, nüchtern, zweimal gemessen. Ein Einzelwert ist keine Diagnose.",
      fehler: "„Test-Booster“ aus dem Regal kaufen. Oder aus einem einzigen Messwert eine Diagnose bauen.",
      grenze: "Der ehrlichste Punkt dieser Seite: Lebensstil bringt dich in deinen physiologischen Bereich zurück. Er hebt dich nicht darüber hinaus. Genau da liegt der Unterschied zu Substanzen — nicht in der Technik, sondern in der Größenordnung.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "MITTEL",
      evidenzNote: "Bewusst MITTEL und nicht STARK: Der Zusammenhang zwischen Rezeptorgehalt und Hypertrophie stammt aus einer Sekundäranalyse an 49 Männern, und nicht alle späteren Arbeiten haben ihn reproduziert. Die praktischen Hebel (Training, Schlaf, Körperfett) stehen auf sicherem Boden — die Rezeptor-Erklärung dahinter ist die plausibelste, nicht die bewiesene.",
      quellen: ["morton_ar_2018", "leproult_2011", "bhasin_2018"]
    },
    {
      id: "SW05",
      name: "Satellitenzellen & Myonuklei",
      kurz: "Satellitenzellen",
      unter: "Pax7 · MyoD · myonukleäre Domäne",
      rolle: "kapazitaet",
      was: "Eine Faser kann pro Zellkern nur eine begrenzte Proteinmenge verwalten. Soll sie weiter wachsen, braucht sie neue Kerne — die liefern Satellitenzellen. Das ist der Grund, warum Aufbau langsam ist und warum er nach einer Pause schneller zurückkommt.",
      schalter: "Wiederholter mechanischer Reiz über Monate, dazu Protein, Energie und Schlaf. Es gibt keinen Nährstoff, der das kurzfristig anschaltet.",
      fenster: "Monate bis Jahre. Hier wird in Quartalen gedacht, nicht in Wochen.",
      nachweis: "Umfänge und Fotos im Quartalsabstand, Körpergewicht als 7-Tage-Schnitt.",
      fehler: "„Muscle Memory“ als Ausrede fürs Pausieren. Den Effekt gibt es — er ist ein Trostpreis, keine Strategie.",
      grenze: "Diese Kapazität ist die eigentliche natürliche Obergrenze. Sie lässt sich nicht beschleunigen, nur konsequent ausschöpfen.",
      evidenzArt: "MECHANISMUS",
      evidenz: "MITTEL",
      evidenzNote: "Der Mechanismus ist gut beschrieben, aber in dieser Übersicht ohne eigene Landmark-Quelle geführt. Die praktische Ableitung stützt sich auf die Trainings-, Protein- und Schlafquellen — es wird hier keine Quelle behauptet, die nicht geprüft ist.",
      quellen: []
    },
    {
      id: "SW06",
      name: "Energie- & Nährstoffsensor",
      kurz: "Energie & Insulin",
      unter: "Insulin · Glykogen · Substratverfügbarkeit",
      rolle: "gas",
      was: "Insulin ist kein Wachstumsknopf, sondern eine Erlaubnis: Es dämpft den Abbau und schleust Substrate ein. Bei ausreichend Protein addiert mehr Insulin nichts mehr.",
      schalter: "Kalorien mindestens auf Erhalt, im Aufbau leicht darüber. Kohlenhydrate rund um die Einheit füllen Glykogen und tragen die Leistung, aus der der Reiz überhaupt entsteht.",
      fenster: "Stunden (Mahlzeit) bis Tage (Glykogenspeicher).",
      nachweis: "7-Tage-Schnitt des Körpergewichts, Leistung im Log. Im Aufbau sind rund 0,25–0,5 % Körpergewicht pro Woche ein realistisches Tempo.",
      fehler: "Gleichzeitig hart trainieren und aggressiv defizitär essen — und sich wundern, dass nichts wächst.",
      grenze: "Erlaubend, nicht additiv. Mehr Insulin baut keinen zusätzlichen Muskel.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["morton_2018"]
    },
    {
      id: "SW07",
      name: "Metabolischer Stress & Zellschwellung",
      kurz: "Metabolischer Stress",
      unter: "Metaboliten · Okklusion · BFR",
      rolle: "gas",
      was: "Anhaltende Spannung unter eingeschränkter Durchblutung erzeugt Metaboliten und Zellschwellung — ein zusätzlicher, schwächerer Hypertrophie-Reiz. Wichtig vor allem dann, wenn schwere Last nicht geht: nach Verletzung, bei belasteten Gelenken, im höheren Alter.",
      schalter: "Hohe Wiederholungszahlen nah am Versagen, kurze Pausen, isolierte Arbeit mit Dauerspannung.",
      fenster: "Akut in der Einheit.",
      nachweis: "Nur über Umfänge und Leistung im Verlauf. Der Pump selbst ist kein Nachweis von irgendetwas.",
      fehler: "Pump mit Wachstum verwechseln und die schwere Arbeit deshalb weglassen.",
      grenze: "Zusatzreiz, kein Ersatz für mechanische Spannung. Training mit Blutflussrestriktion gehört angeleitet, nicht improvisiert.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "MITTEL",
      quellen: ["refalo_2023"]
    },
    {
      id: "SW08",
      name: "Phosphagen-System",
      kurz: "Phosphagen",
      unter: "Kreatinphosphat · Arbeit pro Satz",
      rolle: "kapazitaet",
      was: "Mehr Kreatinphosphat heißt mehr Arbeit pro Satz. Der Muskel wächst dann nicht wegen des Supplements, sondern wegen der Arbeit, die es möglich macht — der Weg führt zurück auf SW01.",
      schalter: "Kreatin-Monohydrat täglich, dauerhaft, unabhängig vom Zeitpunkt.",
      fenster: "Sättigung in rund drei bis vier Wochen, auch ohne Ladephase.",
      nachweis: "Wiederholungen bei gleicher Last nach vier Wochen.",
      fehler: "Zyklisieren, teure Sonderformen kaufen, eine Ladephase für nötig halten.",
      grenze: "Der einzige Hebel aus dem Regal mit harter Evidenz — und trotzdem eine kleine Zahl. Er ersetzt weder Reiz noch Protein noch Schlaf.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["kreider_2017"]
    },
    {
      id: "SW09",
      name: "AMPK / Energiemangel",
      kurz: "AMPK",
      unter: "hemmt mTORC1 über TSC2 und Raptor",
      rolle: "bremse",
      was: "Der Energiesensor der Zelle. Bei Energiemangel drosselt AMPK mTORC1 direkt. Das ist der eigentliche Interferenz-Effekt zwischen Ausdauer und Kraft — kein Mythos, aber auch keine Katastrophe.",
      schalter: "Unerwünscht angeschaltet durch großes Kaloriendefizit und durch langes oder hartes Ausdauervolumen direkt um die Krafteinheit.",
      loesen: "Kraft und langes Ausdauertraining zeitlich trennen — anderer Tag oder mehrere Stunden Abstand. Rad und Ergometer belasten die Beine weniger exzentrisch als Laufen. Energieverfügbarkeit hochhalten.",
      fenster: "Stunden.",
      nachweis: "Kraftverlauf im Log über vier Wochen, nachdem Ausdauer dazugekommen ist.",
      fehler: "Ausdauer ganz streichen. AMPK baut Mitochondrien — Herz-Kreislauf-Gesundheit ist kein Nebenschauplatz, sondern der Grund, warum das ganze System überhaupt Sinn hat.",
      grenze: "Der Interferenz-Effekt ist real, aber moderat und planbar. Er ist kein Argument gegen Cardio, sondern eines für Reihenfolge.",
      evidenzArt: "MECHANISMUS",
      evidenz: "MITTEL",
      evidenzNote: "Mechanismus und Interferenz sind gut beschrieben; für die konkrete Abstandsregel gibt es in dieser Übersicht keine eigene Landmark-Quelle. Sie steht hier als Praxis-Leitplanke, nicht als belegte Schwelle.",
      quellen: []
    },
    {
      id: "SW10",
      name: "Myostatin / Smad2/3",
      kurz: "Myostatin",
      unter: "ActRIIB · die eingebaute Wachstumsbremse",
      rolle: "bremse",
      was: "Myostatin bindet an ActRIIB, aktiviert Smad2/3 und dämpft darüber die Akt-Achse. Diese Bremse existiert, damit Muskel nicht unbegrenzt wächst — sie ist kein Defekt, sondern Regulation.",
      schalter: "Krafttraining senkt die Myostatin-Expression akut. Das ist der einzige Hebel, bei dem sich beim gesunden Menschen zuverlässig überhaupt etwas bewegt.",
      loesen: "Trainieren. Mehr gibt es an dieser Stelle ehrlicherweise nicht zu holen.",
      fenster: "Stunden bis Tage nach dem Reiz.",
      nachweis: "Im Alltag nicht sinnvoll messbar.",
      fehler: "Follistatin-Präparate, „Myostatin-Blocker“ oder Eier-Extrakte kaufen. Die Evidenz beim gesunden, trainierenden Menschen ist schwach bis nicht vorhanden.",
      grenze: "Pharmakologische Myostatin-Hemmung ist Forschung und Medizin. Kein Regalprodukt, keine Empfehlung, kein Hebel für diese Seite.",
      evidenzArt: "MECHANISMUS",
      evidenz: "SCHWACH",
      evidenzNote: "Bewusst als SCHWACH geführt: Der Mechanismus ist gut belegt, ein verlässlich steuerbarer Hebel jenseits von Training ist es nicht. Diese Zeile steht hier, damit sie niemand anderswo als Verkaufsargument findet.",
      quellen: []
    },
    {
      id: "SW11",
      name: "Kortisol / FoxO / Ubiquitin-Proteasom",
      kurz: "Kortisol / FoxO",
      unter: "MuRF1 · MAFbx · der Abbauarm",
      rolle: "bremse",
      was: "Über den Glukokortikoid-Rezeptor werden die Atrogene MuRF1 und MAFbx hochgefahren, Muskelprotein wird markiert und abgebaut. Zuwachs ist immer Aufbau MINUS Abbau — dieser Weg entscheidet über die zweite Hälfte der Rechnung.",
      schalter: "Unerwünscht angeschaltet durch Schlafmangel, chronischen Stress, Alkohol, sehr großes Defizit und hohes Volumen über Wochen ohne Entlastung.",
      loesen: "7–9 Stunden Schlaf in einem festen Fenster, Deload alle vier bis acht Wochen, Alkohol runter.",
      fenster: "Täglich. Ein schlechter Monat kostet mehr, als ein guter Monat bringt.",
      nachweis: "Schlafdauer, Ruhepuls- und HRV-Trend, Kraft im Log, Appetit und Antrieb.",
      fehler: "Erholung als das behandeln, was übrig bleibt, wenn Arbeit und Training fertig sind.",
      grenze: "Kortisol ist nicht der Feind — es ist ein Tagesrhythmus. Nur die chronische Erhöhung kostet Substanz.",
      evidenzArt: "HUMAN-AKUT",
      evidenz: "STARK",
      quellen: ["watson_2015", "leproult_2011"]
    },
    {
      id: "SW12",
      name: "Ribosomenbiogenese",
      kurz: "Ribosomen",
      unter: "rRNA-Synthese · translationale Kapazität",
      rolle: "kapazitaet",
      was: "mTORC1 bestimmt, wie schnell die Proteinfabriken laufen. Die Ribosomenzahl bestimmt, wie viele Fabriken überhaupt da sind. Ein starkes Signal auf zu wenig Maschinen läuft ins Leere — das ist der Unterschied zwischen Effizienz und Kapazität.",
      schalter: "Wiederholtes Trainingsvolumen über Monate, getragen von Protein und Energie. Der Aufbau neuer Ribosomen ist eine langsame Anpassung, keine Reaktion auf eine Einheit.",
      fenster: "Effizienz in Stunden bis Tagen, Kapazität in Wochen bis Monaten. Deshalb schlägt Kontinuität jede einzelne perfekte Einheit.",
      nachweis: "Nicht direkt messbar. Sichtbar wird sie indirekt: Bleibt die Progression über Monate möglich, ohne dass das Volumen ständig steigen muss?",
      fehler: "Alle sechs Wochen das Programm wechseln. Jeder Neustart kostet genau die Anpassung, die am längsten braucht.",
      grenze: "Sie lässt sich nicht kaufen und nicht beschleunigen — nur durch ununterbrochene Monate aufbauen. Das ist der Weg, der Anfänger von Fortgeschrittenen trennt.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "MITTEL",
      evidenzNote: "Der Zusammenhang ist in Humanstudien gezeigt, aber korrelativ: Wer mehr ribosomale Kapazität aufbaute, wuchs stärker. Dass sich die Kapazität gezielt und unabhängig vom Trainingsvolumen steuern ließe, ist damit nicht belegt.",
      quellen: ["stec_2016"]
    },
    {
      id: "SW13",
      name: "Kapillarisierung & Versorgung",
      kurz: "Kapillaren",
      unter: "VEGF · Sauerstoff- und Substratzufuhr",
      rolle: "kapazitaet",
      was: "Die Faser kann nur wachsen, was ihre Versorgung trägt. Kapillaren liefern Sauerstoff, Glukose, Aminosäuren und Hormone und tragen Stoffwechselprodukte ab. Bei älteren Männern sagte die Kapillarisierung der Typ-II-Fasern zu Beginn voraus, ob über 24 Wochen überhaupt Faserhypertrophie zustande kam.",
      schalter: "Krafttraining selbst, dazu eine moderate aerobe Grundlage und tägliche Bewegung. Blutdruck- und Glukosekontrolle halten die Gefäße funktionsfähig — das ist der Punkt, an dem Gesundheit und Muskelaufbau dieselbe Sache sind.",
      fenster: "Wochen bis Monate. Verlust geht schneller als Aufbau.",
      nachweis: "Indirekt über Ruhepuls, Erholung zwischen Sätzen und Ausdauerleistung; medizinisch über Blutdruck und Blutzuckerwerte beim Arzt.",
      fehler: "Ausdauer als Feind des Muskelaufbaus behandeln. Genau hier baut sie die Infrastruktur, die den Aufbau erst trägt.",
      grenze: "Kein Wachstumsschalter, sondern die Versorgung der Fabrik. Sie erzeugt keinen Reiz — aber ohne sie verpufft er.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "MITTEL",
      evidenzNote: "Die vorliegende Humanstudie betrifft ältere Männer (71 Jahre). Dass die Kapillarisierung bei jungen, gut trainierten Männern ebenso begrenzend wirkt, ist plausibel, aber hier nicht belegt — die Stufe bleibt deshalb MITTEL.",
      quellen: ["snijders_2017"]
    }
  ];

  /* ======================= DIE HEBEL ========================================
     Alles, was in der Matrix als Wirkung auftaucht, muss hier als konkrete,
     dosierte und überprüfbare Handlung stehen. Ein Hebel ohne Dosis und
     ohne Nachweis ist ein Ratschlag, kein Hebel. */
  var HEBEL = [
    {
      id: "H01",
      name: "Schwere Grundübungen",
      kurz: "LAST",
      dosis: "Mehrgelenkübungen bei etwa 60–85 % des 1RM als Rückgrat jeder Einheit — Kniebeuge, Kreuzheben, Drücken, Ziehen, Rudern.",
      warum: "Der breiteste Hebel im ganzen System: Er schaltet Mechanotransduktion, mTORC1, den lokalen Wachstumsfaktor-Arm, den Androgenrezeptor und die Satellitenzellen gleichzeitig an.",
      nachweis: "Arbeitsgewichte im Log, alle vier Wochen verglichen.",
      fehler: "Die schweren Übungen zuletzt machen, wenn nichts mehr geht.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["schoenfeld_2017"]
    },
    {
      id: "H02",
      name: "Nah ans Muskelversagen",
      kurz: "RIR 0–3",
      dosis: "Die Arbeitssätze so beenden, dass noch null bis drei Wiederholungen möglich gewesen wären. Nicht jeder Satz bis zum Anschlag — aber auch keiner mit fünf in Reserve.",
      warum: "Erst nah am Versagen kommen die hohen Rekrutierungsschwellen dran. Das ist der Unterschied zwischen Training und Bewegung.",
      nachweis: "RIR mitschreiben. Wer ihn nicht notiert, überschätzt sich zuverlässig.",
      fehler: "RIR schätzen statt schreiben — und dabei über Monate immer weiter weg vom Versagen landen.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["refalo_2023"]
    },
    {
      id: "H03",
      name: "Volle Amplitude, gedehnte Position betont",
      kurz: "ROM",
      dosis: "Jede Wiederholung über die volle Bewegungsbahn, mit Kontrolle in der gedehnten Position statt Schwung am Umkehrpunkt.",
      warum: "Die mechanische Spannung ist in der gedehnten Position am höchsten. Halbe Wiederholungen kosten genau dort den Reiz.",
      nachweis: "Video von der Seite, einmal im Monat, bei der letzten Arbeitsserie.",
      fehler: "Mehr Gewicht auflegen und dafür die halbe Bewegung verschenken.",
      evidenzArt: "MECHANISMUS",
      evidenz: "MITTEL",
      quellen: []
    },
    {
      id: "H04",
      name: "Volumen: 10–20 harte Sätze",
      kurz: "VOLUMEN",
      dosis: "Je Muskelgruppe und Woche rund 10–20 harte Arbeitssätze, verteilt auf zwei bis drei Einheiten. Unten anfangen, nicht oben.",
      warum: "Die Dosis-Wirkung ist gestuft: Rund zehn harte Sätze pro Muskel und Woche liefern bereits nahezu maximale Hypertrophie, darüber wird die Kurve flach.",
      nachweis: "Sätze je Muskelgruppe pro Woche zählen — nicht Übungen, nicht Minuten.",
      fehler: "Mit zwanzig Sätzen anfangen und keine Reserve nach oben haben, wenn es stockt.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["schoenfeld_2017"]
    },
    {
      id: "H05",
      name: "Progression, dokumentiert",
      kurz: "PROGRESSION",
      dosis: "Über vier bis sechs Wochen messbar mehr Last oder mehr Wiederholungen bei gleichem RIR. Geplant, nicht gehofft.",
      warum: "Ohne Steigerung wiederholst du einen Reiz, an den der Körper sich längst angepasst hat. Das ist der häufigste Grund für Jahre ohne Veränderung.",
      nachweis: "Der Trainingstracker vergleicht die Einheit mit dem letzten Mal — dafür ist er da.",
      fehler: "Das Programm wechseln, bevor die Progression überhaupt eine Chance hatte.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["schoenfeld_2017"]
    },
    {
      id: "H06",
      name: "Protein 1,6–2,2 g/kg, verteilt",
      kurz: "PROTEIN",
      dosis: "1,6–2,2 g je kg Körpergewicht und Tag, aufgeteilt auf drei bis fünf Mahlzeiten mit jeweils rund 0,4 g/kg.",
      warum: "Die Meta-Analyse über 49 kontrollierte Studien zeigt das Plateau nahe 1,62 g/kg/Tag. Die Verteilung entscheidet, wie oft mTORC1 am Tag überhaupt anspringt.",
      nachweis: "Drei typische Tage im Kalorien- und Proteintagebuch — danach weißt du, ob du bei 1,2 oder bei 1,9 liegst.",
      fehler: "Tagesmenge trifft, Verteilung nicht: kaum Protein bis zum Abend, dann alles auf einmal.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["morton_2018"]
    },
    {
      id: "H07",
      name: "Energie & Kohlenhydrate",
      kurz: "ENERGIE",
      dosis: "Im Aufbau leicht über dem Erhalt (rund 0,25–0,5 % Körpergewicht Zunahme pro Woche). Kohlenhydrate um die Einheit herum, statt sie prinzipiell zu meiden.",
      warum: "Energiemangel schaltet AMPK an und AMPK drosselt mTORC1. Wer gleichzeitig hart trainiert und aggressiv defizitär isst, arbeitet gegen sich selbst.",
      nachweis: "7-Tage-Schnitt des Körpergewichts, nicht der Wert von heute Morgen.",
      fehler: "Dauerdefizit als Normalzustand — „ich bin ja immer irgendwie am Definieren“.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["morton_2018"]
    },
    {
      id: "H08",
      name: "Schlaf 7–9 Stunden",
      kurz: "SCHLAF",
      dosis: "Mindestens sieben Stunden, in einem festen Fenster mit gleicher Aufstehzeit — auch am Wochenende.",
      warum: "Der stärkste Einzelhebel außerhalb des Trainings: Die großen Wachstumshormon-Pulse liegen im Tiefschlaf, und schon eine Woche mit unter fünf Stunden senkte bei jungen gesunden Männern das Tagestestosteron deutlich.",
      nachweis: "Schlafdauer und Bettzeit im Tracker. Sieben Nächte reichen für ein ehrliches Bild.",
      fehler: "Schlaf als das behandeln, was übrig bleibt. Kein Supplement kompensiert das.",
      evidenzArt: "HUMAN-AKUT",
      evidenz: "STARK",
      quellen: ["watson_2015", "leproult_2011"]
    },
    {
      id: "H09",
      name: "Erholung steuern",
      kurz: "DELOAD",
      dosis: "Alle vier bis acht Wochen eine Entlastungswoche mit reduziertem Volumen. Alkohol runter, Stressspitzen nicht auch noch mit Rekordversuchen im Training beantworten.",
      warum: "Der Abbauarm läuft täglich mit. Ein Monat mit schlechtem Schlaf, viel Alkohol und ungebremstem Volumen kostet mehr, als ein guter Monat bringt.",
      nachweis: "Ruhepuls- und HRV-Trend, Kraftverlauf, Schlafqualität — drei Signale, nicht ein Gefühl.",
      fehler: "Deload erst machen, wenn schon etwas wehtut.",
      evidenzArt: "HUMAN-AKUT",
      evidenz: "MITTEL",
      quellen: ["watson_2015"]
    },
    {
      id: "H10",
      name: "Körperfett im Korridor",
      kurz: "KÖRPERFETT",
      dosis: "Beim Mann grob im Bereich zehn bis achtzehn Prozent bleiben, statt zwischen sehr schlank und deutlich übergewichtig zu pendeln.",
      warum: "Mehr Bauchfett heißt mehr Aromatisierung und schlechtere Insulinsensitivität — beides arbeitet gegen den Androgenrezeptor-Weg und gegen den Nährstoffsensor.",
      nachweis: "Bauchumfang auf Nabelhöhe, monatlich, morgens. Deutlich zuverlässiger als jede Körperfettwaage.",
      fehler: "Extreme Aufbauphasen mit großem Fettzuwachs — die Rechnung kommt in der nächsten Diät.",
      evidenzArt: "MECHANISMUS",
      evidenz: "MITTEL",
      quellen: []
    },
    {
      id: "H11",
      name: "Kreatin-Monohydrat 3–5 g",
      kurz: "KREATIN",
      dosis: "3–5 g Monohydrat täglich, dauerhaft, Zeitpunkt egal. Keine Ladephase nötig, keine teure Sonderform nötig.",
      warum: "Das am besten belegte Supplement für Kraft und Trainingsleistung. Es baut keinen Muskel — es erlaubt die Arbeit, aus der Muskel entsteht.",
      nachweis: "Wiederholungen bei gleicher Last nach vier Wochen.",
      fehler: "Zyklisieren oder absetzen, sobald „nichts mehr passiert“.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "STARK",
      quellen: ["kreider_2017"]
    },
    {
      id: "H12",
      name: "Mängel messen und schließen",
      kurz: "MÄNGEL",
      dosis: "Vitamin D, Ferritin, B12 und Schilddrüsenwerte über den Arzt bestimmen lassen — und nur schließen, was tatsächlich fehlt.",
      warum: "Ein Mangel begrenzt das System, die Korrektur stellt es wieder her. Ein Überschuss darüber hinaus bringt nichts — das ist der Unterschied zwischen Auffüllen und Hochdosieren.",
      nachweis: "Laborwerte im Verlauf, nicht ein Einzelwert.",
      fehler: "Blind hochdosieren, ohne je gemessen zu haben.",
      evidenzArt: "LEITLINIE",
      evidenz: "MITTEL",
      quellen: ["bhasin_2018"]
    },
    {
      id: "H13",
      name: "Satzpause lang genug",
      kurz: "PAUSE",
      dosis: "Bei schweren Mehrgelenkübungen zwei bis drei Minuten. Kurze Pausen nur dort, wo bewusst mit Metaboliten gearbeitet wird — nicht bei der Kniebeuge.",
      warum: "Drei Minuten Pause erzeugten bei trainierten Männern mehr Kraft und mehr Muskeldicke als eine Minute. Die Pause selbst baut nichts auf; sie erhält die Leistung, aus der der Reiz entsteht.",
      nachweis: "Wiederholungen im letzten Arbeitssatz gegenüber dem ersten. Brechen sie stark ein, war die Pause zu kurz.",
      fehler: "Pausen kürzen, um „intensiver“ zu trainieren — und damit Last und Wiederholungen verlieren, also genau den Reiz.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "MITTEL",
      quellen: ["schoenfeld_rest_2016"]
    },
    {
      id: "H14",
      name: "Aerobe Grundlage",
      kurz: "AEROB",
      dosis: "Zwei bis drei moderate Ausdauereinheiten pro Woche, 30–45 Minuten, plus tägliche Bewegung. Getrennt von der Krafteinheit — anderer Tag oder mehrere Stunden Abstand.",
      warum: "Der Hebel, den fast jeder im Aufbau streicht. Er baut die Versorgung — Kapillaren, Herz-Kreislauf, Insulinsensitivität —, die dem Muskel Substrate liefert und die Erholung zwischen den Einheiten trägt.",
      nachweis: "Ruhepuls im Wochenschnitt, Erholung zwischen den Sätzen, Blutdruck.",
      fehler: "Ausdauer ganz weglassen aus Angst vor dem Interferenz-Effekt — oder sie direkt vor die schwere Beineinheit legen.",
      evidenzArt: "HUMAN-LANGZEIT",
      evidenz: "MITTEL",
      evidenzNote: "Die Kapillar-Evidenz stammt aus einer Studie an älteren Männern. Die konkrete Dosis „zwei bis drei Einheiten“ ist eine Praxis-Leitplanke, keine belegte Schwelle.",
      quellen: ["snijders_2017"]
    }
  ];

  /* ======================= DIE MATRIX =======================================
     Wirkungscodes:
       2  = schaltet den Weg direkt
       1  = erlaubend / indirekt (ohne ihn geht es nicht, allein löst er nichts)
      -1  = löst eine Bremse (senkt einen hemmenden Weg)
       0  = keine belastbare Wirkung — bewusst leer, nicht „vielleicht“
     Nur eingetragen, was sich aus dem Mechanismus und den Quellen oben
     vertreten lässt. Eine leere Zelle ist eine Aussage. */
  var MATRIX = {
    H01: { SW01: 2, SW02: 2, SW03: 2, SW04: 2, SW05: 2, SW06: 1, SW07: 1, SW10: -1, SW12: 1, SW13: 1 },
    H02: { SW01: 2, SW02: 1, SW05: 1, SW07: 2, SW10: -1 },
    H03: { SW01: 2, SW05: 1, SW07: 1 },
    H04: { SW01: 2, SW02: 2, SW05: 2, SW07: 1, SW12: 2 },
    H05: { SW01: 2, SW05: 1, SW12: 2 },
    H06: { SW02: 2, SW03: 1, SW05: 1, SW06: 1, SW11: -1, SW12: 1 },
    H07: { SW02: 1, SW03: 1, SW04: 1, SW05: 1, SW06: 2, SW09: -1, SW11: -1, SW12: 1 },
    H08: { SW02: 1, SW03: 2, SW04: 2, SW05: 1, SW11: -1 },
    H09: { SW01: 1, SW04: 1, SW05: 1, SW11: -1 },
    H10: { SW02: 1, SW04: 2, SW06: 2, SW13: 1 },
    H11: { SW01: 1, SW07: 1, SW08: 2 },
    H12: { SW03: 1, SW04: 1, SW06: 1, SW13: 1 },
    /* Lange Pause und kurze Pause ziehen in verschiedene Richtungen: Sie
       erhält die mechanische Spannung (SW01) und lässt Kreatinphosphat
       nachladen (SW08), kostet dafür metabolischen Stress (SW07). Deshalb
       steht hier kein Eintrag auf SW07 — nicht, weil es keinen Effekt gäbe,
       sondern weil er in die andere Richtung zeigt. */
    H13: { SW01: 2, SW08: 1 },
    /* Ausdauer erscheint bewusst NICHT als „löst die AMPK-Bremse". Sie
       aktiviert AMPK eher, als sie es löst — gelöst wird diese Bremse über
       Energie (H07). Was die aerobe Grundlage leistet, ist die Versorgung. */
    H14: { SW06: 1, SW13: 2 }
  };

  var WIRKUNG = {
    "2":  { zeichen: "●", name: "schaltet direkt", klasse: "is-direkt" },
    "1":  { zeichen: "○", name: "erlaubend", klasse: "is-indirekt" },
    "-1": { zeichen: "⊣", name: "löst die Bremse", klasse: "is-bremse" },
    "0":  { zeichen: "·", name: "keine belastbare Wirkung", klasse: "is-leer" }
  };

  /* ======================= DIE MULTIPLIKATIVE LOGIK =========================
     Der Grund, warum diese Seite eine Matrix ist und keine Rangliste: Die
     Faktoren werden multipliziert, nicht addiert. Ein Faktor nahe null
     entwertet alle anderen — und genau das ist die Begründung für den
     Engpass-Gedanken, auf dem der MaleMetrix Score steht.
     `wege` verweist auf die Signalwege, die dieser Faktor trägt. */
  var FORMEL = {
    satz: "Zuwachs = Reiz × Baumaterial × Kapazität × Erholung − Bremsen",
    kern: "Multipliziert, nicht addiert. Ein Faktor nahe null entwertet die anderen — deshalb bringt es nichts, den stärksten Hebel noch stärker zu ziehen, wenn ein anderer bei null steht.",
    faktoren: [
      { name: "Reiz", frage: "Wird der Muskel überhaupt zur Anpassung gezwungen?", wege: ["SW01", "SW07"], leer: "Trainingsvolumen ohne Progression, Sätze weit vom Versagen, halbe Amplitude." },
      { name: "Baumaterial", frage: "Ist genug da, um zu bauen?", wege: ["SW02", "SW06"], leer: "Unter 1,6 g Protein/kg, oder Dauerdefizit als Normalzustand." },
      { name: "Kapazität", frage: "Kann der Körper den Reiz umsetzen?", wege: ["SW05", "SW08", "SW12", "SW13"], leer: "Alle sechs Wochen ein neues Programm, keine aerobe Grundlage, ständige Pausen." },
      { name: "Erholung", frage: "Bleibt Zeit, das Gebaute zu behalten?", wege: ["SW03", "SW04"], leer: "Sechs Stunden Schlaf, kein Deload, Alkohol als Wochenroutine." },
      { name: "Bremsen", frage: "Was zieht gerade dagegen?", wege: ["SW09", "SW10", "SW11"], leer: "Chronischer Stress, großes Defizit und hohes Volumen gleichzeitig." }
    ],
    folgerung: "Deshalb ist die richtige Frage nicht „welchen Weg kann ich noch anschalten?“, sondern „welcher meiner Faktoren steht gerade am tiefsten?“. Genau das ist der Engpass — und genau danach sucht der MaleMetrix Score."
  };

  /* ======================= WEGE OHNE STEUERBAREN HEBEL ======================
     Sie stehen bewusst NICHT in der Matrix: Eine Zeile ohne Hebel wäre eine
     leere Zeile. Sie hier wegzulassen wäre aber unehrlich — es sind genau
     die Namen, unter denen Präparate verkauft werden. Wer sie sucht, soll
     hier finden, warum sie kein Hebel sind. */
  var OHNE_HEBEL = [
    {
      id: "OH1",
      name: "YAP / TAZ (Hippo-System)",
      was: "Mechanosensitive Transkriptionsregulatoren. Präklinisch konnte YAP Muskelwachstum teilweise sogar unabhängig von mTORC1 auslösen.",
      warum: "Beim Menschen zeigt sich nach Krafttraining kein einheitliches Muster. Ein Mitspieler der Mechanotransduktion, kein getrennt bedienbarer Schalter — wer SW01 bedient, bedient ihn mit.",
      art: "PRÄKLINISCH"
    },
    {
      id: "OH2",
      name: "MAPK — ERK, p38, JNK",
      was: "Stress- und Umbausignale, die auf Kraftentwicklung, Dehnung und Entzündung reagieren und Transkription, Differenzierung und Ribosomenbiogenese mitregulieren.",
      warum: "Wird durch anspruchsvolles Training bereits vollständig bedient. Es gibt nichts, was man zusätzlich und gezielt dagegen tun könnte.",
      art: "MECHANISMUS"
    },
    {
      id: "OH3",
      name: "Calcium — Calcineurin / NFAT",
      was: "Kontraktionen erzeugen Calciumtransienten, die über Calcineurin und NFAT Fasertyp, mitochondriale Programme und Differenzierung beeinflussen.",
      warum: "Steuert eher den Fasertyp als die Fasergröße. Für Muskelmasse ist die Akt/mTOR-Achse fundamentaler.",
      art: "PRÄKLINISCH"
    },
    {
      id: "OH4",
      name: "Reparatursignale — HGF, IL-6, Notch, Wnt",
      was: "Sie steuern, ob Satellitenzellen sich teilen, sich erneuern oder mit der Faser verschmelzen. Kurzfristig freigesetztes IL-6 unterstützt diese Proliferation.",
      warum: "Ort, Dauer und Höhe entscheiden über die Wirkung — dieselbe Substanz wirkt lokal und kurz anabol, chronisch und systemisch katabol. Es gibt keinen Weg, das von außen sinnvoll zu dosieren. Lokale Reparaturentzündung ist notwendig, chronische Entzündung ist keine Aufbaustrategie.",
      art: "MECHANISMUS"
    },
    {
      id: "OH5",
      name: "Pharmakologische Myostatin- und Activin-Hemmung",
      was: "Die Bremse aus SW10 lässt sich pharmakologisch blockieren. Genetische Daten legen nahe, dass funktionsmindernde Varianten mit mehr Muskelmasse einhergehen.",
      warum: "In Medikamentenstudien führte mehr Magermasse nicht regelmäßig zu proportional mehr Kraft oder Funktion. Rezeptfreie „Myostatin-Blocker“ und Follistatin-Präparate haben beim gesunden Trainierenden keine belastbare Wirkung — das ist der am häufigsten falsch verkaufte Punkt dieser ganzen Seite.",
      art: "EXPERIMENTELL"
    },
    {
      id: "OH6",
      name: "β₂-Adrenozeptor (cAMP / PKA)",
      was: "Systemische β₂-Stimulation kann Proteinumsatz und Faserphänotyp verändern und Muskelwachstum auch ohne mechanische Belastung auslösen.",
      warum: "Derselbe Rezeptor sitzt am Herzen. Muskel- und Herzwirkung lassen sich nicht trennen — das ist keine risikoarme Ergänzung, sondern ein Eingriff mit kardialen Folgen.",
      art: "EXPERIMENTELL"
    },
    {
      id: "OH7",
      name: "GH, IGF-1 und Insulin von außen",
      was: "Alle drei sind reale Wachstumsachsen und werden als „Multipathway“-Ergänzung zum Testosteron verkauft.",
      warum: "Sie laufen auf dieselben Knoten zu wie alles andere — Akt, mTORC1, Translation. Wachstumshormon steigerte in einer kontrollierten Studie an gesunden älteren Männern weder Kraft noch Muskelmasse, weder allein noch zusätzlich zum Krafttraining. Ein Teil der Zunahme fettfreier Masse ist Flüssigkeit, kein kontraktiles Gewebe.",
      art: "HUMAN-LANGZEIT"
    }
  ];

  /* ======================= DER TRIGGER-PLAN =================================
     Eine gewöhnliche Woche, in der jeder Weg wenigstens einmal bedient
     wird. Kein Idealbild — vier Einheiten, ein Alltag. */
  var WOCHE = [
    { tag: "MO", einheit: "Kraft · Unterkörper schwer", inhalt: "Kniebeuge oder Beinpresse schwer, danach Beinbeuger und Wade. 6–8 harte Sätze, RIR 1–2.", wege: ["SW01", "SW02", "SW04", "SW05", "SW10"] },
    { tag: "DI", einheit: "Ausdauer locker · getrennt", inhalt: "30–45 Minuten Rad oder zügiges Gehen. Bewusst am kraftfreien Tag — nicht direkt vor oder nach der Krafteinheit. Das ist der Tag, an dem die Versorgung gebaut wird, nicht der verschenkte Tag.", wege: ["SW06", "SW09", "SW13"] },
    { tag: "MI", einheit: "Kraft · Oberkörper Druck", inhalt: "Bankdrücken oder Schulterdrücken schwer, dann Trizeps und Seitheben mit voller Amplitude.", wege: ["SW01", "SW02", "SW07"] },
    { tag: "DO", einheit: "Erholung", inhalt: "Kein Training. Protein und Schlaf laufen weiter — das ist der Tag, an dem gebaut wird, nicht der verlorene Tag.", wege: ["SW03", "SW05", "SW11"] },
    { tag: "FR", einheit: "Kraft · Oberkörper Zug", inhalt: "Rudern und Klimmzug schwer, dann Bizeps und hintere Schulter. Gedehnte Position betont.", wege: ["SW01", "SW02", "SW04"] },
    { tag: "SA", einheit: "Kraft · Ganzkörper leichter", inhalt: "Kreuzheben-Variante moderat, plus Schwachstellenarbeit mit hohen Wiederholungen nah am Versagen.", wege: ["SW01", "SW07", "SW08"] },
    { tag: "SO", einheit: "Erholung · Woche planen", inhalt: "Gewichtsschnitt und Sätze der Woche ansehen. Steht die Progression? Wenn nicht: eine Sache ändern, nicht vier. Und das Programm nicht wechseln — Kapazität entsteht nur durch ununterbrochene Monate.", wege: ["SW05", "SW11", "SW12"] }
  ];

  /* ======================= DER EHRLICHE VERGLEICH ===========================
     Ohne diesen Block wäre die Seite Werbung. Er steht bewusst als Daten
     hier und nicht als Fließtext in der Seite, damit er nicht „aus Versehen"
     beim nächsten Redesign verschwindet. Der Test prüft, dass er da ist. */
  var VERGLEICH = {
    frage: "Und wie viel davon ersetzt das, was früher gespritzt wurde?",
    kern: "Nichts davon ersetzt es. Das ist die ehrliche Antwort, und sie steht hier oben statt versteckt am Ende.",
    punkte: [
      {
        titel: "Die Größenordnung, die niemand gern nennt",
        text: "In der klassischen kontrollierten Studie dazu erhielten Männer über zehn Wochen 600 mg Testosteron-Enanthat pro Woche. Die Gruppe, die nur die Substanz bekam und nicht trainierte, gewann mehr fettfreie Masse als die Gruppe, die trainierte und Placebo bekam. Wer behauptet, natürliche Signalsteuerung sei dasselbe in grün, hat diese Zahl nicht gelesen.",
        quellen: ["bhasin_1996"]
      },
      {
        titel: "Warum Lebensstil die Lücke nicht schließen kann",
        text: "Der Zuwachs skaliert mit der Dosis, weit über den physiologischen Bereich hinaus. Genau dorthin kommt kein Lebensstil-Hebel: Dein Körper reguliert die eigene Produktion und hält sie in einem Korridor. Training, Schlaf und Körperfett bringen dich in diesem Korridor nach oben — sie öffnen ihn nicht.",
        quellen: ["bhasin_2001"]
      },
      {
        titel: "Was die Matrix dafür wirklich leistet",
        text: "Sie holt die Differenz zwischen „trainiert irgendwie“ und „trainiert an der eigenen Obergrenze“. Bei den meisten Männern ist diese Differenz größer, als sie glauben — weil selten der Reiz fehlt, sondern meistens Schlaf, Protein, Progression und Erholung gleichzeitig zu dünn sind. Und weil die Rechnung multiplikativ ist, kostet ein Faktor bei null mehr, als der stärkste Hebel je einbringt.",
        quellen: []
      },
      {
        titel: "„Dann eben von allem ein bisschen“ — der Denkfehler dahinter",
        text: "Die naheliegende Schlussfolgerung lautet: Statt einer hohen Dosis lieber mehrere Achsen gleichzeitig leicht bedienen — etwas Testosteron, etwas Wachstumshormon, etwas IGF-1, dazu Insulin und ein β₂-Agonist. Das klingt nach Ingenieurskunst und ist der am schlechtesten belegte Ansatz von allen. Der Grund steht in dieser Matrix: Verschiedene Rezeptoren, aber dieselben Knoten. Alles läuft wieder auf Akt, mTORC1 und die Translationskapazität zu. Die Wirkungen sind deshalb nicht additiv — die Nebenwirkungen dagegen schon: Sie verteilen sich auf Herz, Blutdruck, Blutbild, Glukosestoffwechsel und Flüssigkeitshaushalt und summieren sich dort. Mehr Substanzen heißt nicht mehr Wege. Es heißt mehr gleichzeitig geöffnete Risikosysteme.",
        quellen: ["baggish_2017"]
      },
      {
        titel: "Und Masse ist nicht dasselbe wie Muskel",
        text: "Selbst dort, wo eine Substanz die fettfreie Masse messbar erhöht, ist ein Teil davon Flüssigkeit und Bindegewebe, nicht kontraktiles Gewebe. In einer kontrollierten Studie an gesunden älteren Männern steigerte Wachstumshormon weder Kraft noch Muskelmasse — weder allein noch zusätzlich zum Krafttraining. Die Waage und der Spiegel messen etwas anderes als die Muskelfaser.",
        quellen: ["lange_2002"]
      },
      {
        titel: "Wo diese Seite aufhört",
        text: "Substanzen sind hier kein Thema — keine Dosierung, keine Anleitung, kein Vergleich von Präparaten. Ein Verdacht auf Testosteronmangel wird ärztlich abgeklärt: Symptome plus zwei morgendliche, nüchterne Messungen, nicht ein Einzelwert aus dem Internet. Das ist keine Vorsichtsfloskel, das ist die Leitlinie.",
        quellen: ["bhasin_2018"]
      }
    ]
  };

  /* ======================= ABGELEITETE KENNZAHLEN ===========================
     Werden aus der Matrix gerechnet, nie von Hand gepflegt: Wenn eine Zelle
     sich ändert, ändern sich die Zahlen mit. */
  function deckung(hebelId) {
    var z = MATRIX[hebelId] || {};
    return Object.keys(z).filter(function (k) { return z[k] !== 0; }).length;
  }

  function hebelFuer(wegId) {
    return HEBEL.filter(function (h) {
      var z = MATRIX[h.id] || {};
      return !!z[wegId];
    }).map(function (h) { return h.id; });
  }

  function offeneWege() {
    return SIGNALWEGE.filter(function (w) { return hebelFuer(w.id).length === 0; })
      .map(function (w) { return w.id; });
  }

  function quelle(id) { return QUELLEN[id] || null; }

  /* Rollenverteilung — die Zahlen im Vorspann der Seite werden dagegen
     geprüft, statt von Hand fortgeschrieben zu werden. */
  function rollen() {
    return SIGNALWEGE.reduce(function (a, w) { a[w.rolle] = (a[w.rolle] || 0) + 1; return a; }, {});
  }

  root.MM_ANABOLIC = {
    version: "1.1",
    geprueft: GEPRUEFT,
    quellen: QUELLEN,
    signalwege: SIGNALWEGE,
    hebel: HEBEL,
    matrix: MATRIX,
    wirkung: WIRKUNG,
    formel: FORMEL,
    ohneHebel: OHNE_HEBEL,
    woche: WOCHE,
    vergleich: VERGLEICH,
    deckung: deckung,
    hebelFuer: hebelFuer,
    offeneWege: offeneWege,
    rollen: rollen,
    quelle: quelle
  };
})(typeof window !== "undefined" ? window : globalThis);
