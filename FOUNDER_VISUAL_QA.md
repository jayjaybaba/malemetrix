# FOUNDER VISUAL QA — Phase 15 (echter Browser-Pass)

Methode: **BROWSER-verifiziert** (Playwright/Chromium, lokal gegen HEAD) —
390×844 und 1440×900, Screenshots + Konsole + Overflow-Messung für 9
Kernseiten. Tooling wiederverwendbar: `scratchpad/qa.js` (Muster unten in
CONTINUATION_STATE). Seeded Real-Data-State (Score 61, RECOMP, Recovery-
Engpass, aktiver Zyklus Tag 18) via localStorage-Init.

## Harte Messergebnisse

- **Horizontaler Overflow: 0 px auf allen 9 Seiten × beiden Breakpoints.**
- **Konsole:** keine JS-Fehler; nur `ERR_CONNECTION_RESET` auf Seiten mit
  account.js (Supabase extern, von der Sandbox geblockt — erwartbar,
  Seiten degradieren sauber in den Local-State).
- i18n-Auto-Detect real bestätigt: EN-Browser ⇒ englische Homepage.

## Scorecards (aus angesehenen Screenshots — mobile zuerst)

### HOMEPAGE — mobil geprüft ✅
Hierarchy 9 · Brand 9 · Premium 8 · Clarity 8 · Mobile 9 · CTA 9 · Emotion 6 · Coherence 9
- Hero sitzt: Sysline → massive H1 → Lead → EIN CTA → Trustline →
  Diagnose-Instrument. Kein Element konkurriert mit dem Versprechen.
- **Top-Problem (P2): Emotion 6** — rein typografisch/technisch; der im
  Phase-15-Brief geforderte menschliche/cinematische Moment fehlt
  (REQUIRES EXTERNAL GENERATION, Slot: Hero-Hintergrund oder Kapitel 06).
- Beispiel-Kennzeichnung „MM / SYSTEMS · BEISPIEL" vorhanden — Verwechslung
  mit eigenem Score unwahrscheinlich, EN-Variante prüfen (P3).

### SCORE (check.html, mit vorhandenem Ergebnis) — mobil geprüft ✅
Hierarchy 7 · Brand 7 · Premium 7 · Clarity 8 · Mobile 8 · CTA 8 · Emotion 7 · Coherence 7
- **P1-FUND:** Der „Du hast bereits ein Ergebnis"-Banner nutzt ein
  Legacy-Emoji-Icon (📊) und Card-V1-Optik — erste sichtbare Fläche der
  wichtigsten Funnel-Seite spricht nicht VS2. FIX: Icon raus,
  Mono-Systemzeile + .mm-metric-Mini-Readout (61/100 · SOLIDE BASIS).
- Ergebnis-Ansicht selbst (os14-score-hero) im DOM verifiziert, aber der
  Klick-Durchstieg wurde im QA-Lauf nicht gerendert → FULLY VERIFIED
  steht für die Result-View noch aus (qa.js um Klick erweitern).

### MY MALEMETRIX — mobil geprüft ✅ (Score-ohne-Kauf-State)
Hierarchy 6 · Brand 8 · Premium 7 · Clarity 7 · Mobile 8 · CTA 7 · Emotion 7 · Coherence 8
- **P1-FUND (größter der Phase):** Above the fold steht ZUERST die
  PATHWAY-Frage („Was willst du wirklich erreichen?") und erst darunter
  der persönliche Status („Dein Engpass: Schlaf & Erholung"). Reihenfolge
  verletzt P7 (Status/Signal zuerst, Aufgaben danach).
  FIX: In js/os/app.js Render-Reihenfolge tauschen — Engpass-/Greeting-
  Karte vor die Pathway-Karte (nur Blocks umstellen, keine Logik).
- **P2-FUND:** Der „+"-FAB überlappt auf 390px Fließtext knapp über der
  Bottom-Nav — unteres Content-Padding erhöhen (padding-bottom ≥ 96px).
- Bottom-Nav (Today/Plan/Track/Progress/Learn) ist klar und App-artig ✓.
- Aktiver-Zyklus-State (os14-cmd „TAG 18/84") im QA-Lauf nicht erreicht,
  weil der Seed keinen echten Entitlement-Spiegel setzt → qa.js-Seed um
  mm_entitlements-Spiegel erweitern (nur Test-Browser, kein Prod-Pfad).

### TRACKER / LIBRARY / CHECKOUT / LABS / PROGRAM — gerendert, Overflow 0,
Screenshots vorhanden, aber noch nicht im Detail bewertet → Status ehrlich:
BROWSER-RENDERED, Bewertung offen (nächster Schritt).

## Priorisierte Fixliste (P1 zuerst, dann P2)

1. **P1** My MaleMetrix: Status-Karte vor Pathway-Karte (app.js, Reihenfolge).
2. **P1** check.html „bereits ein Ergebnis"-Banner → VS2 (Emoji raus,
   Mini-Readout, Mono-Label).
3. **P2** FAB-Kollision mobil: Content-Padding über Bottom-Nav.
4. **P2** qa.js: Klick-Durchstieg zur Result-View + Entitlement-Seed →
   die zwei wichtigsten States FULLY VERIFIED machen.
5. **P2** Emotion/Cinematic-Slot Homepage (externes Asset nötig —
   REQUIRES EXTERNAL GENERATION, kein Platzhalter einbauen).
6. **P3** EN-Variante der Beispiel-Kennzeichnung, Footer-VS2-Abgleich,
   Tracker-/Labs-/Library-Detailbewertung.

## Ehrliche Statuslabels (P23 des Briefs)

- Homepage: **FULLY VERIFIED (mobil)** / Desktop-Screenshot vorhanden,
  Detailbewertung offen.
- My MaleMetrix (Score-State): **BROWSER VERIFIED mit P1-Befund** —
  nach Fix erneut rendern.
- Score Result View / Programm-Today / Tracker-Flows: **BROWSER-RENDERED,
  Bewertung bzw. Durchstieg offen.**
- Kein einziges Label beruht mehr nur auf Quellcode-Analyse.
