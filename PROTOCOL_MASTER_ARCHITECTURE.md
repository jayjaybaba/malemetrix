# PROTOCOL MASTER ARCHITECTURE — Phase 16/B (DAS PROTOKOLL 2.0)

Ein Kauf. Ein System. Positionierung unverändert: **DAS PROTOKOLL ERKLÄRT.
DAS 12-WOCHEN-PROGRAMM FÜHRT.** Leitmotiv des Werks: *Optimiere zuerst das
System, bevor du ein Signal von außen ersetzt.*

## Architektur-Entscheidung (aus der Inventur begründet)

Der Premium-Kern (230 KB protoVault + 208 KB stackVault) ist im Repo nur
verschlüsselt → das Flaggschiff wird als **Modul-System** gebaut, nicht als
eine Monolith-Seite:

- **Protokoll-Index (Produkt- & Systemseite):** protokoll.html wird der
  Hub — 14 Module, jeder Eintrag zeigt Status (FREE PREVIEW / PREMIUM) und
  führt in die jeweilige Kapitelseite. Progressive Disclosure statt
  800-Seiten-HTML (Teil 11/30).
- **Premium-Ziele:** ebooks/protokoll.html (Kern-Erklärwerk) und
  ebooks/ultimate-stack.html (Kapitel 08) bleiben die vault-gated
  Leseumgebungen — Entitlement `protocol` unverändert (Teil 18).
- **Klartext-Kapitel:** die 13 freien Werke werden als Kapitel des Systems
  gerahmt (einheitlicher Protokoll-Kopf „MM / PROTOCOL · KAPITEL NN",
  Crosslinks, CTA). Ihre URLs bleiben = SEO-Discovery (Teil 13 C/32).
- **Neue Kapitel** (müssen geschrieben werden): 00, 11, 12, 13-Synthese.

## Die 14 Module (Reader Journey: MEASURE → UNDERSTAND → PRIORITIZE → ACT → REASSESS)

| # | Modul | Quelle(n) | Zugang | Status |
|---|---|---|---|---|
| 00 | START HERE — wie dieses System funktioniert | NEU | FREE (Funnel) | NOT STARTED |
| 01 | DAS FUNDAMENT | blueprint.html (+ masterguide-Merge) | FREE Preview → Premium-Tiefe im Kern | Quelle vorhanden |
| 02 | KÖRPERKOMPOSITION & STOFFWECHSEL | fettabbau + protein-system (+ blueprint-Teile) | FREE Preview | Quellen vorhanden |
| 03 | JEDEN TAG TRAINIEREN | taeglich-trainieren + training-system | FREE Preview | Quellen vorhanden |
| 04 | SCHLAF | schlaf-energie + schlaf-stack | FREE Preview | Quellen vorhanden |
| 05 | BLUTWERTE ALS SYSTEM | blutwerte-guide + labs-data.js-Systematik | FREE Preview | Quellen vorhanden |
| 06 | HORMONE & TESTOSTERON — inkl. BEFORE TRT | testosteron.html + NEUE BEFORE-TRT-Sektion | FREE Preview | Basis vorhanden, Vertiefung offen |
| 07 | GLP-1 & METABOLIC MEDICINE | glp1-agonisten.html (+ Evidenz-Update) | FREE Preview | Quelle vorhanden |
| 08 | DER ULTIMATIVE STACK | ultimate-stack.html (Vault) | **PREMIUM** | live, bleibt |
| 09 | SUPPLEMENTE MIT EVIDENZ (Nachschlagewerk) | supplements.html + MM.engines.SUPPS | FREE Preview | Quellen vorhanden |
| 10 | SEXUELLE GESUNDHEIT | sexuelle-gesundheit.html | FREE Preview | Quelle vorhanden |
| 11 | INJEKTIONEN — Angst raus, Präzision rein | NEU (Gauge/Länge/Routen/Sicherheit, Body-Comp-Crosslink) | FREE (Angstabbau = Funnel; Rolle bewusst) | NOT STARTED |
| 12 | LONGEVITY & RISK MANAGEMENT | NEU (Teile aus blueprint/blutwerte) | FREE Preview | NOT STARTED |
| 13 | DAS SYSTEM ZUSAMMENSETZEN | NEU + gewohnheiten.html | Premium-Rahmen | NOT STARTED |
| ★ | DER PREMIUM-KERN (Gesamt-Erklärwerk) | ebooks/protokoll.html (Vault) | **PREMIUM** | live, bleibt |

Zugangs-Logik ehrlich: FREE-Preview-Kapitel sind vollwertige Inhalte (waren
schon frei — Rückzug hinter Paywall würde SEO + Vertrauen kosten). Der Kauf
liefert: Premium-Kern + Ultimate Stack + 12-Wochen-Programm + kommende
Premium-Vertiefungen. Kein Pseudo-Paywalling von Bestandstexten.

## Crosslink-Matrix (sparsam, Teil 23)

02→06 (Warum Körperfett für Testosteron relevant wird) · 04→02/07 (Schlaf ↔
Glukose) · 05→12 (ApoB → Risiko entsteht nicht isoliert) · 06→02/04
(BEFORE TRT) · 07→02/03 (Muskelschutz unter GLP-1) · 11→06/07/02 (Routen,
Gewebetiefe) · alle → 13.

## Editorial-Standards (für Phasen D/E — verbindlich)

Eine Stimme (bestehende bp-*-Werke sind bereits nah dran); Abschnitts-
Rhythmus HOOK→WARUM→MECHANISMUS→IRRTUM→EVIDENZ→PRAXIS→SYSTEM; Safety als
`MM / SAFETY`-Note statt Disclaimer-Wand; Evidenz-Stufen KNOWN/LIKELY/
PLAUSIBLE/UNCERTAIN/EXPERIMENTAL; Aromatase/Adipositas nur mechanistisch
korrekt (mehrere Pfade, keine „Fett=Estradiol"-Verkürzung); Injektionen ohne
Universalregeln („richtige Nadel erreicht zuverlässig das Zielgewebe" —
abhängig von Präparat/Route/Stelle/Anatomie), keine Dosier-Individualisierung.

## Was bewusst NICHT passiert

Kein Entschlüsseln/Concatenieren; kein Löschen alter URLs; keine zweite
Commerce-Logik (protocol-Entitlement + twelve_week bleiben wie live
verifiziert); Library-Seite (ebooks.html) bleibt als Discovery-Fläche
bestehen, verschwindet aber aus der Hauptnavigation (→ „Über"-Dropdown).
