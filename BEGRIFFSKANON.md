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
| 3 | **Optimierungspunkt** | Das konkrete Thema, das aus einem Engpass abgeleitet und aktiv bearbeitet wird | — (Arbeitsobjekt in `mm_opt_points`, siehe unten) |
| 4 | **Fokusphase** | Ausschließlich der zeitlich begrenzte Bearbeitungszeitraum | Sprint-/Zyklus-artige Zeitbegriffe im Fokus-Kontext |
| 5 | **Ein Auftrag** | Die zentrale konkrete Aufgabe innerhalb einer Fokusphase (bestehendes Konzept, bleibt) | „Aufgabe“ (im Fokus-Kontext) |
| 6 | **Ergebnisprüfung** | Oberbegriff für Umsetzungs- und Wirkungsprüfung | Review, Recheck, Check-in, Weekly Pulse, Reassessment (sichtbar) |
| 6a | **Umsetzungsprüfung** | Wurde der Auftrag ausreichend umgesetzt? (aus den täglichen Häkchen) | — |
| 6b | **Wirkungsprüfung** | Hat die Maßnahme erkennbar geholfen? Darf später liegen als die Umsetzungsprüfung und bleibt bis dahin ehrlich „offen“ | — |
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

## Fokusphasen-Regeln (Paket 2, umgesetzt)

- Dauern: **7 · 14 · 28 Tage**; MaleMetrix empfiehlt je Auftrag eine Dauer
  (`FOCUS[domain].dauer`), der Nutzer bestätigt oder wählt um.
  Leitplanken: 7 = kurzer Einstieg / klar überprüfbare Verhaltensänderung ·
  14 = Standard für Routinen · 28 = längere Eingewöhnung / langsame Trends.
  Produktleitplanken, keine medizinischen Wirksamkeitsfristen.
- **Ziel-Regel (Toleranzprinzip):** Ziel(d) = round(d × Ziel28 / 28),
  begrenzt auf 1 … d−1. 20/28 → 5/7 → 10/14 („5 von 7 Tagen pro Woche“);
  24/28 → 6/7 → 12/14. Perfektion (d von d) wird nie verlangt.
- **Umsetzungs-Urteil:** ausreichend = Ziel erreicht · teilweise = mindestens
  halbes Ziel · nicht ausreichend = darunter. Tage ohne Häkchen zählen nie
  als umgesetzt, gelten aber als „nicht erfasst oder nicht umgesetzt“, nicht
  als bewusstes Scheitern.
- **Wirkungs-Urteile:** erkennbar · teilweise · nicht erkennbar · offen ·
  unklar (Datenlage reicht nicht) · nicht weiter geprüft (bewusste
  Entscheidung). Wirkungsprüfung nie vor Phasenende; `wirkfrist` kann sie
  nach hinten legen (z. B. Training: Umsetzung nach 14 Tagen, Wirkung
  sinnvoll ab 28).
- **„Offen“ ist kein Abschluss.** Eine Vertagung hält den Vorgang aktiv:
  Die offene Wirkungsprüfung bleibt im Tracker sichtbar und bearbeitbar,
  auch nachdem der Auftrag archiviert wurde. Abgeschlossen ist sie erst
  mit einem echten Ergebnis oder der bewussten Entscheidung, nicht weiter
  zu prüfen. (Alt-Aufträge von vor Paket 2 tauchen dabei nie nachträglich
  als offen auf — Marker ist das Feld `wirkungBis`.)
- **Fokusphase ≠ vollständiger Score:** Das Phasenende löst nur die
  Prüfungen aus; der vollständige Score behält seinen eigenen Rhythmus
  (~4 Wochen) und wird nie automatisch erzwungen.
- **Abwärtskompatibilität:** Aufträge ohne gespeicherte Dauer gelten als
  28 Tage; Historie wird nie umgeschrieben, neue Felder sind additiv.

## Anzeigeregeln (verbindlich)

- **Umsetzung, Ziel und Zielstatus sind drei getrennte Angaben.** Das
  Mindestziel ist nie der Nenner der Umsetzung: „5 von 7 Tagen umgesetzt ·
  Ziel: 5 Tage — erreicht · Quote 71 %“, niemals „5 von 5“.
- **Letzter Umsetzungstag ≠ Prüfungstag.** Technisch ist `until` der
  Prüfungstag; der letzte Tag zum Abhaken liegt einen Tag davor. Sichtbar
  daher immer getrennt: „Fokusphase 14 Tage: 28.07.–10.08. ·
  Umsetzungsprüfung am 11.08.“

## Optimierungspunkte (Paket 3, umgesetzt)

**Kanonische Struktur:** `mm_opt_points` (`js/points.js`, Sync-Domäne
`optpoints`, append-orientiert). Sie speichert ausschließlich Zuordnung,
Status, Referenzen und zusammenfassende Ergebnisse — nie eine zweite Kopie
der Umsetzung. Keine neue Tabelle, keine Migration.

**Source of Truth je Information:**

| Information | Maßgebliche Quelle |
|---|---|
| Auftrag, Fokusphase, tägliche Häkchen, Umsetzungs- und Wirkungsprüfung | `mm_focus` / `mm_focus_history` |
| Premium-Experimente | `intel_experiments` (nur gelesen) |
| Planentscheidungen | `intel_decisions` (nur referenziert) |
| Zuordnung, Status, Referenz, Ergebnis-Zusammenfassung, persönlicher Standard | `mm_opt_points` |

**Statusmodell** — sieben interne Zustände, je einer pro sichtbarer Gruppe:

| Bestehender Zustand (Quelle) | Interner Zustand | Sichtbarer Status |
|---|---|---|
| Auftrag gestartet, Fokusphase läuft | `in_umsetzung` | In Umsetzung |
| Punkt gespeichert, noch nicht bearbeitet | `erkannt` | Offen |
| Fokusphase vorbei, Umsetzung nicht quittiert | `pruefung_faellig` | Prüfung fällig |
| Wirkung vertagt (`wirkung.verdict = offen`) oder Vorgang archiviert ohne Urteil | `wirkung_offen` | Wirkung offen |
| Wirkungsurteil erkennbar / teilweise / unklar / nicht weiter geprüft | `abgeschlossen` | Abgeschlossen |
| Bewusst pausiert (manuell) | `pausiert` | Pausiert |
| Manuell gesetzt **oder** ausreichend umgesetzt + keine Wirkung + ärztlicher Vorbehalt | `weitere_abklaerung` | Weitere Abklärung |

Manuelle Zustände (`pausiert`, `weitere_abklaerung`) gewinnen über die
Ableitung; sonst gewinnt immer die Quelle. Übergänge entstehen aus
bestehenden Handlungen — der Nutzer wählt nie einen Status aus.

**Entstehung:** Ein Punkt entsteht ausschließlich aus einer bestätigten
Handlung — heute: dem Start eines Auftrags. Ein angezeigter Score-Engpass
erzeugt nichts; wiederholte Scores sammeln keine unbestätigten Punkte an.

**Duplikatregel (konservativ, zweistufig):** gleiche `source_type` +
`source_id` ⇒ immer derselbe Punkt (Aktualisierung). Sonst: gleiche
Quellart + gleicher Bereich + identisch normalisierter Titel + noch nicht
abgeschlossen ⇒ Aktualisierung. Keine Ähnlichkeitssuche — fachlich
verschiedene Punkte werden nie zusammengelegt.

**Persönlicher Standard:** entsteht nie automatisch. Eine gute Umsetzung
plus erkennbare Wirkung erzeugt nur eine *Empfehlung*; übernommen wird
ausschließlich per ausdrücklicher Bestätigung (`standard.bestaetigt`).
Ärztlicher Vorbehalt im Bereich unterdrückt die Empfehlung. Der Standard
lebt im Punkt selbst — keine zweite Standardbibliothek.

## Noch offen (spätere Pakete)

- Bereichswert-Anzeige 1–10 (Paket 4).
- Englische OS-Navigation (Today/Plan/Track/Progress/Learn) und Modul-Namen
  (NBA, Foresight, Digital Twin …) — bewusst nicht Teil der fünf Familien.
