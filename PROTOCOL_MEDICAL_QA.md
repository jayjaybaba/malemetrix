# PROTOCOL MEDICAL QA — Phase 16/E–F (DAS PROTOKOLL 2.0)

Zweck: dokumentiert die medizinischen Leitplanken der neuen/überarbeiteten
Kapitel, damit jede Aussage nachvollziehbar korrekt und sicher gerahmt ist.
Grundregeln für ALLE Kapitel:

1. **Keine Diagnosen, keine Dosierungen, keine Präparat-Empfehlungen.**
2. **Entscheidungen über Medikamente trifft ein Arzt** — das Werk befähigt,
   auf Augenhöhe zu sprechen, es ersetzt keine Behandlung.
3. **Safety als `MM / SAFETY`-Note** (`.box.clinical`), nicht als Disclaimer-Wand.
4. **Evidenz-Stufen** offen ausweisen: KNOWN / LIKELY / PLAUSIBLE / UNCERTAIN /
   EXPERIMENTAL (`.ev`-Chips).
5. **Leitmotiv:** „Optimiere zuerst das System, bevor du ein Signal von außen
   ersetzt."

---

## Kapitel 11 — INJEKTIONEN (ebooks/11-injektionen.html)

**Auftrag:** Angst abbauen, medizinisch korrekt, KEINE Universalnadel-Regel,
KEINE Dosier-Individualisierung, Body-Comp-Crosslink.

| Aussage im Kapitel | Status | Begründung / Leitplanke |
|---|---|---|
| Injektionen sind medizinischer Alltag (Insulin, Fertilität, B12, GLP-1) | KNOWN | Angstabbau über Einordnung, nicht über Verharmlosung. |
| SC vs. IM zielen auf verschiedene Gewebe; Route gehört zum Präparat, ist nicht frei wählbar | KNOWN | Route = Eigenschaft von Formulierung/Zulassung (wässrig vs. ölig), steht in der Fachinfo. Bewusst als Irrtum entlarvt: „SC oder IM ist Geschmackssache." |
| **Es gibt KEINE Universalnadel** — Gauge & Länge hängen von Präparat + Route + Stelle + Anatomie ab | KNOWN | Kernauftrag. Pauschalregeln (z. B. „eine Länge trifft immer die Schulter") explizit als falsch markiert. Nadelwahl = ärztlich/Apotheke, nicht Forum. |
| Weniger subkutanes Fett ⇒ Zielgewebe tendenziell oberflächlicher; mehr Fett ⇒ tiefer | LIKELY | Als *Erklärung, warum Pauschalregeln scheitern* — ausdrücklich KEINE Selbst-Ausrechen-Formel. `.box.datatrap`: „weniger Fett = oberflächlicher" ⇏ „also kürzere Nadel". |
| Gute Technik = Hygiene, Einmalmaterial, Stellen rotieren, sichere Entsorgung, Lagerung nach Fachinfo | KNOWN | Prinzipien (Schadensminimierung), keine Schritt-für-Schritt-Selbststart-Anleitung. Aspiration/Winkel/Hautfalte bewusst NICHT bebildert → „wird individuell eingewiesen". Lipohypertrophie bei Insulin als Rotations-Beleg. |
| Nadelphobie ist verbreitet & behandelbar; Piks meist geringer als erwartet | KNOWN/LIKELY | Angst rational einordnen. |
| Normal vs. ärztlich abklären (Rötung/Schwellung/Fieber) + Notfallzeichen (Anaphylaxie → 112) | KNOWN | Sicherheits-Trennung, damit Angst nicht Warnzeichen überdeckt. |

**Bewusst NICHT enthalten:** konkrete Nadelgrößen/-längen als Empfehlung,
Dosierungen, „so ziehst du auf", Präparat-Namen mit Anwendungsschema,
Selbststart-Ermutigung. Der erste Vorgang gehört ärztlich eingewiesen.

---

## Kapitel 12 — LONGEVITY & RISK (ebooks/12-longevity-risk.html)

**Auftrag:** ApoB / Blutdruck / VO₂max / Screening; KEINE erfundenen Ranges.

| Aussage im Kapitel | Status | Begründung / Leitplanke |
|---|---|---|
| Longevity = Risiken früh erkennen, nicht NAD-Hype | — | Ehrliche Reframe; NAD/exotische Pillen als EXPERIMENTAL markiert. |
| Herz-Kreislauf, Stoffwechsel, Krebs kündigen sich über Jahre in messbaren Zahlen an | LIKELY/KNOWN | Motiviert Früh-Messung; keine konkreten Inzidenzzahlen erfunden. |
| Bluthochdruck ist stiller Top-Risikofaktor, gut beeinflussbar; Trend statt Einzelwert | KNOWN | **Kein Zielwert genannt** — „was ein guter Zielbereich ist, legt dein Arzt anhand Leitlinien fest". |
| ApoB bildet Risiko präziser ab als LDL allein (Partikelzahl); Lp(a) einmal im Leben | LIKELY | Mechanistisch korrekt (Partikelzahl vs. Cholesterinmenge). **Keine mg/dL-Grenzwerte**; Einordnung ärztlich/gesamtrisiko-abhängig. |
| Insulinresistenz schleicht; Nüchternzucker (Momentaufnahme) + HbA1c (Wochen-Trend) | KNOWN | **Keine Grenzwerte**; Hebel liegen bei Körperfett/Kraft/Schlaf (Crosslinks). |
| VO₂max / kardiorespiratorische Fitness eng mit Mortalität assoziiert, trainierbar | KNOWN | Als „stärkste einzelne Kennzahl" belegt; **kein konkreter ml/kg/min-Zielwert**; Trend über Monate. |
| Vorsorge/Screening rettet Leben; Intervalle alters-/risiko-/leitlinienabhängig | KNOWN | **Keine festen Alter/Intervalle erfunden** — „richtet sich nach Vorsorge-Leitlinien, sprich es aktiv an". Familiengeschichte als Modifikator. |
| System: wenige Dinge messen → mit Arzt einordnen → größter Hebel → neu bewerten | — | Verbindet Kapitel mit der Reader-Journey; Dashboard/Arztgespräch-Checkliste = 12-Wochen-Programm. |

**Kein einziger numerischer „Optimal"-Zielwert** wird als universelle Wahrheit
behauptet. Marker werden erklärt (Bedeutung, Richtung, Trend), Zielbereiche
konsequent an Arzt + Leitlinie delegiert.

---

## Kapitel 00 — START HERE (ebooks/00-start-here.html)

Kein medizinischer Anspruch außer der Rahmung „erst System, dann Signal" und
einer `MM / SAFETY`-Note: Medikamenten-Entscheidungen (inkl. TRT/GLP-1) beim
Arzt. Produkt-Rollen sauber getrennt (Score findet · Protokoll erklärt ·
Programm führt · Tracker misst · My MaleMetrix verbindet).

---

## Kapitel 06 — BEFORE TRT / Adipositas ↔ Testosteron (ebooks/testosteron.html, Phase F)

**Auftrag:** Adipositas↔T mehrpfadig korrekt (Aromatase als EIN Pfad),
Reihenfolge Body-Comp → Sleep → Training → Labs → Reassess → Diagnose, kein
Pro-/Anti-TRT. Umsetzung: neue Sektion `#before-trt` VOR der TRT-Red-Zone (s12)
+ TOC-Eintrag; zusätzlich zwei bestehende Stellen entschärft, die Aromatase als
alleinige Mechanik darstellten (s6-Tabelle, s8-Schluss).

| Pfad Adipositas → niedriges T | Status | Korrektheit |
|---|---|---|
| Aromatase (T → Östradiol im Fettgewebe) | KNOWN | Real, aber ausdrücklich **nur einer** von mehreren Pfaden. |
| Insulinresistenz dämpft HPG/Hodenfunktion | LIKELY | Metabolische Störung wirkt zentral + peripher. |
| Niedriggradige Entzündung (Adipokine/Zytokine) | LIKELY | Stört HPG-Achse und Leydig-Zellen. |
| SHBG-Verschiebung (oft niedrig bei Adipositas/IR) | KNOWN | Drückt v. a. **Gesamt**-T → teils Messphänomen → freies T zählt. |
| Obstruktive Schlafapnoe senkt T unabhängig | LIKELY/KNOWN | Fragmentierter Schlaf + Hypoxie; bei Bauchfett häufig. |
| Zentrale HPG-Dämpfung (funktioneller Hypogonadismus) | LIKELY | Adipositas-assoziierter Hypogonadismus meist zentralen Ursprungs. |

**Explizit als Irrtum markiert:** „Fett = hohes Östradiol" — zu einfach; erklärt
u. a. warum manche adipösen Männer niedriges T UND normales Östradiol haben.
**Kein Numerik-Grenzwert** für T/E2/SHBG behauptet; Messung + Interpretation an
den Arzt delegiert (morgens, nüchtern, mehrfach, Gesamt + frei).

**Reihenfolge** als `.p2chain` fixiert: 1 Körper · 2 Schlaf · 3 Training ·
4 Labor · 5 Reassess · 6 Diagnose. TRT-Rahmung in `.box.clinical`:
„weder Werbung für noch gegen TRT" — legitime ärztliche Therapie für einen
echten, diagnostizierten Mangel, die am **Ende** der Reihenfolge steht, mit
ehrlichem Hinweis auf Konsequenzen (u. a. Fruchtbarkeit). Kein Pro-/Anti-Stance.
