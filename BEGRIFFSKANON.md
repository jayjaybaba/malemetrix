# MaleMetrix — Begriffskanon (verbindlich ab Paket 1)

Zweck: EIN Wörterbuch für sichtbare Nutzerbegriffe. Konkurrierende Begriffe
werden hier entschieden — nicht einzeln über das Repository verteilt.
Technische Keys, Datenfelder, URLs und Kommentare sind davon ausgenommen und
werden nicht allein aus sprachlichen Gründen umbenannt.

## Die Hierarchie

Optimierungsbereich → Engpass → Optimierungspunkt → Ein Auftrag →
Fokusphase → Ergebnisprüfung → Persönlicher Standard

Nie die ganze Kette auf einmal zeigen — je Kontext nur die Begriffe, die der
Nutzer dort braucht.

| # | Kanonischer Begriff | Bedeutung | Ersetzt sichtbar (wenn dasselbe gemeint ist) |
|---|---|---|---|
| 1 | **Optimierungsbereich** (kompakt: „Bereich“) | Übergeordnetes Themengebiet; basiert auf den bestehenden 12 Score-Domains | System(e), Modul, Domain, Pillar |
| 2 | **Engpass** | Der aktuell wichtigste begrenzende Faktor (Diagnose-Begriff, bleibt) | Limiter, Bottleneck (sichtbar) |
| 3 | **Optimierungspunkt** | Das konkrete Thema, das aus einem Engpass abgeleitet und aktiv bearbeitet wird | — (neu; noch kein Datenobjekt, erst Paket 3) |
| 4 | **Fokusphase** | Ausschließlich der zeitlich begrenzte Bearbeitungszeitraum | Sprint-/Zyklus-artige Zeitbegriffe im Fokus-Kontext |
| 5 | **Ein Auftrag** | Die zentrale konkrete Aufgabe innerhalb einer Fokusphase (bestehendes Konzept, bleibt) | „Aufgabe“ (im Fokus-Kontext) |
| 6 | **Ergebnisprüfung** | Der Zeitpunkt, an dem getrennt geprüft wird: umgesetzt? geholfen? | Review, Recheck, Check-in, Weekly Pulse, Reassessment (sichtbar) |
| 7 | **Bereichswert** | Sichtbare 1–10-Darstellung eines Domain-Scores (Anzeige erst Paket 4); intern/persistiert bleibt alles 0–100, Gesamtscore bleibt /100 | — |
| 8 | **Persönlicher Standard** | Bewährte Maßnahme/Routine, dauerhaft übernommen | „MY PROTOCOL“ (Ansichtstitel) |

## Kontextregeln (nicht mechanisch ersetzen)

- **Engpass bleibt.** „Optimierungspunkt“ ersetzt ihn nicht, sondern ist das
  Arbeitsobjekt darunter.
- **„Experiment“** bleibt im Premium-Experiment-Modul zulässig, wo tatsächlich
  ein kontrollierter Test gemeint ist.
- **„Entscheidung“** bleibt im Decision Ledger zulässig.
- **„Review“** darf intern/technisch bestehen bleiben (Code, Keys, Kommentare);
  auch sichtbar dort, wo es NICHT die Ergebnisprüfung meint (z. B. „Human
  Review“ = Eskalation an einen Menschen).
- **„validiert“/„verifiziert“** sind nicht grundsätzlich verboten.
- **„System“** bleibt als Produkt-/Markenbegriff („Das Performance-System für
  Männer“, „das MaleMetrix System“). Nur wenn die 12 Bereiche gemeint sind,
  gilt Optimierungsbereich/Bereich.
- **„Hebel“** bleibt als Metapher für Wirkung/Ansatz zulässig; wo konkret der
  Engpass gemeint ist, steht Engpass.
- **„Programm“ / „Durchlauf“**: Das 12-Wochen-Programm ist KEINE Fokusphase.
  Ein abgeschlossener 12-Wochen-Lauf heißt sichtbar „Durchlauf“, nicht
  „Zyklus“ (Nähe zur Steroid-Sprache, siehe focus.test.js-Leitplanke).

## Wo die Labels technisch leben

- App-Chrome/Marketing: `js/i18n.js` (DICT)
- OS-App: Label-Maps in `js/os/app.js` (VIEW_LABEL, MODE, BN, PHASE, DEC_LABEL)
- 12-Wochen-Programm: `T_DICT` in `js/course.js`
- Score/Ergebnisseite: Render-Strings in `js/check.js` (Engine-Texte in
  `js/check-data.js` sind kalibriert — nur sichtbare Rahmentexte anfassen)
- PWA: `manifest.webmanifest` (nur Labels; URLs/Hashes niemals ändern)

## Noch offen (spätere Pakete)

- Statusliste der Optimierungspunkte (Paket 3) — bis dahin bleiben die
  bestehenden Verdict-Labels (KEEP/LIKELY HELPED …) unverändert.
- Fokusphasen-Dauern 7/14/28 (Paket 2).
- Bereichswert-Anzeige 1–10 (Paket 4).
- Englische OS-Navigation (Today/Plan/Track/Progress/Learn) und Modul-Namen
  (NBA, Foresight, Digital Twin …) — bewusst nicht Teil der fünf Familien.
