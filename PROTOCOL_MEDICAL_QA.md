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

## Kapitel 06 — BEFORE TRT / Adipositas ↔ Testosteron (Phase F)

Wird in Phase F ergänzt. Leitplanke bereits fixiert: **Aromatase ist EIN Pfad
neben** Insulinresistenz, systemischer Entzündung, SHBG-Veränderung,
Schlafapnoe und HPG-Achsen-Suppression — **niemals** die Verkürzung
„Fett = hohes Estradiol". Reihenfolge: Body-Comp → Schlaf → Training → Labor →
Reassess → (ärztliche) Diagnose. Kein Pro-/Anti-TRT.
