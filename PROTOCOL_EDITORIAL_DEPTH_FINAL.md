# PROTOCOL — FINAL EDITORIAL DEPTH PASS (P18) + CONTENT FREEZE V1

Abschluss der zwei bewusst deferrten Editorial-Aufgaben aus P17. Danach:
**PROTOCOL CONTENT FREEZE — V1**. Design-Freeze und Ultimate-Stack-Lock
durchgehend gewahrt. Keine Runway-Generation. Commerce/Vaults unberührt.

---

## AUFGABE A — Kapitel 01 wirklich verschmolzen (DONE)

**Ausgangslage:** `ebooks/blueprint.html` war faktisch ein 15-Teile-Rundumschlag
(„The Human Performance Blueprint") mit Training, Hormonen, Schlaf, Herz,
Blutwerten, Longevity, Supplementen, Medikamenten/Peptiden, Hype-Friedhof,
Decision Engine und 12-Wochen-System — also einer Kopie fast jedes späteren
Kapitels. Der Leser erkannte drei/mehr Quellen und las alles doppelt.

**Umsetzung:** Verschmelzung von START HERE + Fundament + Körperkomposition zu
**einem** kohärenten Kapitel 01 (`01.1–01.8`), das nur noch das **Denkmodell**
liefert:

1. **01.1 Du hast kein Wissensproblem** — Reihenfolge statt Tipp-Stapel.
2. **01.2 Dein Körper ist ein System, keine Liste** — konkrete Kaskade
   (schlechter Schlaf → mehr Hunger → unruhiger Zucker → flacheres Training →
   schlechtere Körperkomposition → zurück auf Schlaf/Hormone).
3. **01.3 Finde den Engpass** — eine Priorität + weiterlaufende Basics; Score kurz.
4. **01.4 Muskel ist mehr als Optik** — Stoffwechsel-Organ, Glukose-Senke,
   Insulinsensitivität (Trainingsdetails ausdrücklich Kapitel 02).
5. **01.5 Fett ist mehr als Energiespeicher** — subkutan vs. viszeral, Taille
   (KEINE „Fett = Aromatase = E2 = weniger T"-Kette).
6. **01.6 Körperkomposition ist ein Multiplikator** — gleiche Waage, zwei Körper.
7. **01.7 Erst das System, dann das Signal** — nicht anti-Medikation; TRT/GLP-1
   nach dem System, mit dem Arzt (MM/SAFETY-Box).
8. **01.8 Die Reihenfolge** — messen → verstehen → priorisieren → umsetzen → neu
   bewerten; Score findet / Protokoll erklärt / Programm führt / Tracker misst /
   My MaleMetrix verbindet. Bottom line + Brücke: *„Das erste System, das du
   aktiv verändern kannst, ist Bewegung."* → Kapitel 02.

**Entfernt aus Ch01** (lebt in den Fachkapiteln, kein Wissen verloren): Training
(→02), Schlaf (→03), Herz/Blutwerte/Longevity (→04), Hormone (→05), GLP-1 (→06),
Supplemente (→08), Meds/Peptide (→05/06/07/10), Hype-Friedhof, Decision Engine,
12-Wochen-Detail. **83 KB → 22,6 KB**, materiell schlanker, ein Fluss, keine
erkennbaren Nähte. Rahmung (protohead/cover/chnav/protocta) und Design erhalten.
Companion `00-start-here.html` bleibt erreichbar (noindex, Library, 5-Min-Einstieg).

---

## AUFGABE B — Longevity physisch in Kapitel 04 integriert (DONE)

**Ausgangslage:** Longevity war nur auf Index-Ebene mit Blutwerten
zusammengeführt; der High-Value-Content lag physisch in `12-longevity-risk.html`,
inklusive des ApoB-MM/MECHANISM-Clips.

**Migrations-Map (je Longevity-Abschnitt):**

| 12-longevity | Klassifikation | Ergebnis |
|---|---|---|
| 04.1 Longevity ehrlich + 04.2 kündigt sich früh an | **MOVE** | neue Ch04-Sektion „Risiko ist Exposition mal Zeit" |
| 04.3 Blutdruck | **DELETE (redundant)** | Ch04 Herz-Kreislauf deckt BP ab |
| 04.4 Lipide & ApoB (Text) | **DELETE (redundant)** | Ch04 ApoB/Lp(a) tiefer |
| 04.4 **ApoB-Motion** | **MOVE** | physisch in Ch04 Herz-Kreislauf (+ Inline-JS) |
| 04.5 Glukose | **DELETE (redundant)** | Ch04 HOMA-IR tiefer |
| 04.6 VO₂max | **MOVE** | neue Ch04-Sektion „Jenseits des Blutbilds" |
| 04.7 Vorsorge/Screening | **MOVE (verdichtet)** | selbe neue Sektion |
| 04.8 System-Loop | **CROSSLINK** | von Ch04 04.15/04.16 abgedeckt |
| Datei gesamt | **KEEP AS LEGACY** | noindex Companion, Motion entfernt, Crosslink auf Ch04 |

**Kapitel 04 jetzt — Arc DATA → RISK → TIME → DECISION (18 Sektionen):**
Dashboard (Daten) → **Risiko ist Exposition mal Zeit** → 8 Blut-Dashboard-Bereiche
(Sauerstoff/Blut inkl. Hämatokrit·TRT → Herz-Kreislauf inkl. **ApoB-Motion**,
Lp(a), Blutdruck → Zucker/HOMA-IR → Leber → Niere/Cystatin C → Entzündung/hs-CRP →
Hormone → PSA) → Biohacking-Marker → **Jenseits des Blutbilds: VO₂max & Vorsorge**
→ Referenz vs. Optimal → Ein-Panel → Testosteron-Hebel → Hormone/Peptide → Arzt-
gespräch → wann zum Arzt (Entscheidung) → Evidenz (+ CRF/VO₂max-Quelle Ross 2016).

**Blutwerte-Tiefe vollständig erhalten und verbessert.** ApoB-Standout erhalten
(jetzt mit Bewegtbild direkt im Herz-Kreislauf-Abschnitt). Keine erfundenen
Grenzwerte, keine Biohacking-Wunschliste. Sektionen sauber 04.1–04.18 neu
nummeriert, TOC aktualisiert, Anker stabil (Nummern-Referenzen im Text durch
sprechende Links ersetzt).

---

## QA (ehrlich)

- **visual-system 138/0** (Motion-Gruppe auf Kapitel 04 Blutwerte umgestellt),
  **launch-readiness 76/0**, **commerce-e2e 85/0**, **i18n 26/0**.
- **Browser-QA** (390/768/1440) blueprint + blutwerte-guide + 12-longevity:
  **0 px horizontaler Overflow, 0 JS-Fehler** auf allen drei Seiten.
- **Motion:** genau **eine** `.bp-mech`-Figur (Kapitel 04), Inline-JS mit
  IntersectionObserver + reduced-motion; **kein Duplikat** mehr in 12-longevity.
  Video/Poster-Assets unverändert (kein Re-Encode, keine Runway-Generation).
- **Design-Freeze:** css/blueprint.css und css/style.css unverändert.
- **Ultimate Stack (07):** nicht gelesen, nicht angefasst (kein Vault-Code in der
  Umgebung; ohnehin ULTRA-LOCKED).
- **Commerce/Vaults/Auth/Recovery/PayPal:** unberührt.
- **SW:** VERSION `mm-v127` → `mm-v128` (blueprint.html liegt im CORE-Precache).

---

## PROTOCOL CONTENT FREEZE — V1

Mit diesem Pass ist die inhaltliche Struktur von DAS PROTOKOLL eingefroren:

- **Exakt 10 nummerierte Kapitel + 1 unnummerierter Abschluss.**
- **Kapitel 01** ist ein verdichtetes Denkmodell-Fundament (keine Kapitel-Doppelung).
- **Kapitel 04** trägt Blutwerte + Risiko + Longevity als ein Kapitel, inkl.
  ApoB-Motion; Longevity ist physisch integriert (nicht nur verlinkt).
- **Protected Chapters** (02/05/06/07/09/10): Prosa unverändert.
- **Ultimate Stack (07):** ULTRA-LOCKED.
- Companions (00-start-here, fettabbau, protein-system, training-system,
  schlaf-stack, 12-longevity-risk, masterguide) bleiben als Vertiefungen
  erreichbar; keine toten Links, keine SEO-Zerstörung (Legacy-Seiten noindex).

**Ab hier keine Content-Struktur-Änderungen mehr ohne neuen, ausdrücklichen
Auftrag.** Nächste Phase (Motion) baut auf diesem eingefrorenen V1 auf.
