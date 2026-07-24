# PROTOCOL — 10-CHAPTER FINAL CONSOLIDATION (P17)

Ziel: aus der 00–13-Struktur wird **exakt 10 nummerierte Hauptkapitel** + ein
**unnummerierter Abschluss**. Design-Freeze (kein Redesign). Protected Chapters
behalten ihre Tiefe (nur Nummer ändert sich). Ultimate Stack = LOCKED.
Keine Runway-Generation. Commerce/Vaults unverändert.

## P17-A · Architektur-Map (BEFORE → AFTER)

BEFORE (14 nummerierte Einträge 00–13 + Companions):
00 START HERE · 01 Fundament · 02 Körperkomposition · 03 Training · 04 Schlaf ·
05 Blutwerte · 06 Hormone · 07 GLP-1 · 08 Ultimate Stack · 09 Supplemente ·
10 Sexuelle Gesundheit · 11 Injektionen · 12 Longevity · 13 System zusammensetzen.

AFTER — **exakt 10 Kapitel + Abschluss:**

| Neu | Titel | Primärdatei | Herkunft | Regel |
|---|---|---|---|---|
| **01** | DAS FUNDAMENT | blueprint.html | alt 00 + 01 + 02 | Merge/Verdichten des Einstiegs |
| **02** | JEDEN TAG TRAINIEREN | taeglich-trainieren.html | alt 03 | PROTECTED — nur Nummer |
| **03** | SCHLAF & REGENERATION | schlaf-energie.html | alt 04 | konsolidieren |
| **04** | BLUTWERTE, RISIKO & LONGEVITY | blutwerte-guide.html | alt 05 + alt 12 | PROTECTED CORE — Longevity integriert |
| **05** | HORMONE & TESTOSTERON | testosteron.html | alt 06 | PROTECTED — nur Nummer |
| **06** | GLP-1 & METABOLIC MEDICINE | glp1-agonisten.html | alt 07 | PROTECTED — nur Nummer (+ Status Jul 2026) |
| **07** | DER ULTIMATIVE STACK | ultimate-stack.html (enc) | alt 08 | ULTRA-LOCKED — nicht angefasst |
| **08** | SUPPLEMENTE MIT EVIDENZ | supplements.html | alt 09 | Reference; dedup vs. Stack |
| **09** | SEXUELLE GESUNDHEIT | sexuelle-gesundheit.html | alt 10 | PROTECTED — nur Nummer |
| **10** | INJEKTIONEN | 11-injektionen.html | alt 11 | PROTECTED — nur Nummer |
| **—** | ABSCHLUSS · DAS SYSTEM ZUSAMMENSETZEN | gewohnheiten.html | alt 13 | unnummeriert, kurz |

**Companions (erreichbar, NICHT als Kapitel gezählt):** 00-start-here (in 01
verdichtet), fettabbau + protein-system (Deep-Dive zu 01), training-system
(zu 02), schlaf-stack (zu 03), 12-longevity-risk (Deep-Dive/gefaltet in 04),
masterguide (Überblick). Alte URLs bleiben erreichbar (SEO/Kompatibilität).

**PROTECTED (keine Netto-Kürzung):** 02, 04, 05, 06, 07, 09, 10.
**ULTRA-LOCKED:** 07 Ultimate Stack.

## Vault-Status (ehrlich)

Der Ultimate Stack (`ebooks/ultimate-stack.html`) ist AES-256-GCM-verschlüsselt.
Der Brief nennt einen bereitgestellten Zugangscode — in dieser Umgebung ist
**kein** Code als Env-Var/Datei vorhanden (geprüft: nur `CLAUDE_CODE_*`, keine
`.env`). Der Stack wurde daher **nicht gelesen und nicht angefasst** — was der
ULTRA-LOCKED-Vorgabe ohnehin entspricht. Kein Code angefordert, nichts umgangen.

## Status je Paket (wird beim Umsetzen gefüllt)

- P17-Struktur (Renumber 01–10 + Abschluss + Companions): siehe unten.
- Design: unverändert (Freeze). Runway-Generationen: 0.

## Ergebnis (umgesetzt)

**DONE — strukturelle 10-Kapitel-Konsolidierung (Reader zeigt exakt 10 + Abschluss):**
- Renumber aller Kapitelseiten auf 01–10; Companions als „· VERTIEFUNG" gerahmt;
  gewohnheiten → unnummerierter ABSCHLUSS (kein Kapitel 11).
- Sales-Index (#kapitel) = 10 nummerierte Kapitel + Abschluss, editoriale
  Hierarchie (7 kommerzielle Hero-Kapitel: 02/04/05/06/07/09/10), ehrliche
  Frei/Premium-Tags. „14 Kapitel"/„10 Module" vollständig entfernt.
- 04 heißt jetzt „BLUTWERTE, RISIKO & LONGEVITY" — Longevity ist im Index in
  Blutwerte integriert (12-longevity als Vertiefung zu 04 verlinkt).
- Kapitel-Fußnavigation in kanonischer 01–10-Reihenfolge; Abschluss ohne „Next".
- **PROTECTED-Prosa unverändert:** Diff-Prüfung Training/Hormone/GLP-1/Sex.
  Gesundheit/Injektionen = **0 nicht-strukturelle geänderte Zeilen** (nur
  Nummer/Nav/Kick). Ultimate Stack (07): **nicht angefasst, nicht gelesen**
  (kein Code verfügbar; ohnehin ULTRA-LOCKED).
- Word-Count: keine Netto-Kürzung der Protected Chapters (nur Nummerierung).
- Design: unverändert (Freeze). Runway-Generationen: **0**. Commerce/Vaults: **unverändert**.
- Tests grün (visual-system 138/0, launch-readiness 76, i18n 26, commerce-e2e 85);
  Browser-QA 390/1440: 0 px Overflow, keine JS-Fehler.

> **UPDATE (P18):** Die beiden unten als PARTIAL/DEFERRED markierten Punkte sind
> mit dem Final Editorial Depth Pass **abgeschlossen** — Kapitel 01 ist real zu
> einem verdichteten Denkmodell (01.1–01.8) verschmolzen, und der Longevity-Content
> (inkl. ApoB-Motion) ist physisch in Kapitel 04 integriert. Details:
> `PROTOCOL_EDITORIAL_DEPTH_FINAL.md`. Danach: **CONTENT FREEZE V1**.

**PARTIAL / DEFERRED — tiefe redaktionelle Verschmelzung (in P18 abgeschlossen):**
- Die Prosa-**Verdichtung von Kapitel 01** (START HERE + Fundament +
  Körperkomposition zu EINEM verdichteten Fließtext) ist strukturell erreicht
  (ein Index-Eintrag „01 DAS FUNDAMENT" = blueprint; 00-start-here + fettabbau +
  protein-system als Vertiefungen), aber die Quelltexte wurden noch NICHT
  ineinander umgeschrieben. Grund: die „Goldene Regel" (nur ändern, wenn klar
  besser) — ein hastiges Zusammenschreiben des 82-KB-Fundaments würde Qualität
  riskieren. Empfohlen als eigener, fokussierter Editorial-Merge-Pass.
- **Physischer Longevity-Content-Fold** in blutwerte-guide (ApoB-Motion +
  Longevity-Abschnitte tatsächlich in das Blutwerte-Kapitel verschieben) ist
  vorbereitet (04 = „BLUTWERTE, RISIKO & LONGEVITY", 12-longevity als Vertiefung
  zu 04), aber die Inhalte liegen noch physisch in 12-longevity-risk.html.
- **Global Dedup** (Protein/Bauchfett/Magnesium etc. über Kapitel hinweg) ist
  nicht durchgeführt.

**Ehrliche Antwort auf die Kernfragen:**
- „Sind es exakt 10 Kapitel?" — **Ja** (Reader/Index/Nav 01–10 + Abschluss).
- „Sind die 7 Money-Kapitel mindestens so stark wie vorher?" — **Ja**
  (Prosa byte-identisch, nur Nummer geändert).
- „Ist es schon vollständig ineinander verschmolzen/verdichtet?" — **Nein, PARTIAL**
  (Struktur ja; tiefe Prosa-Verdichtung von 01 + physischer Longevity-Fold offen).
