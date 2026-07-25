# SCORE V2 — KALIBRIERUNGS-FREEZE

Stand: 24. Juli 2026 · gilt ab sofort · ergänzt `SCORE_V2_LOGIC.md`

---

```
==================================================
SCORE V2 CALIBRATION FREEZE
==================================================
```

Score V2 ist live, getestet und in allen fünf Statuspfaden verifiziert. Ab
hier gilt: **keine neuen Fragen, keine neuen Gewichte, keine neue Logik.**

Der nächste Fortschritt kommt nicht aus mehr Komplexität, sondern aus
Belegen darüber, wie echte Männer den Score tatsächlich benutzen.

## Was eingefroren ist

* die 87 Fragen (Wortlaut, Reihenfolge, Optionen)
* die Bedingungen, wann eine Frage erscheint
* die Domain-Gewichte und Normalisierung
* die Schwellen der Bänder (Kontrolle, Confidence, Bottleneck-Vorrang)
* die Entscheidungslogik CUT / RECOMP / BUILD / PERFORM / HEALTH FIRST
* die Data-Gap-Definitionen und Schweregrade

## Wann Änderungen erlaubt sind

Genau zwei Gründe:

**A) Ein reproduzierbarer technischer oder medizinischer Logikfehler.**
Reproduzierbar heißt: als Testfall schreibbar.

**B) Belege aus echter Nutzung.**
Zum Beispiel: „In `cardiometabolic` brechen 34 % ab" oder „bei
`primary_bottleneck_id = hormonal` sagen 61 % *NEIN* zur Trefferfrage".

Ein Bauchgefühl, eine einzelne Rückmeldung oder eine schöne Idee sind
**kein** Grund.

## Pflichtformular für jede spätere Score-Änderung

Ohne diese sechs Punkte wird nichts geändert:

| Feld | Inhalt |
|---|---|
| **Beobachtetes Problem** | Was ist konkret falsch oder auffällig? Mit Zahl oder Reproduktionsschritten. |
| **Betroffener Pfad** | Status, Abschnitt, Domain, Modus — so eng wie möglich. |
| **Erwartetes Ergebnis** | Was hätte herauskommen müssen? |
| **Aktuelles Ergebnis** | Was kommt heute heraus? |
| **Vorgeschlagene Korrektur** | Die kleinstmögliche Änderung, die das behebt. |
| **Regressionstest** | Der Test, der den Fehler festnagelt — vor der Korrektur rot. |

Der Test kommt in `tools-dev/tests/score-v2.test.js` (oder eine neue Datei im
selben Stil) und bleibt dauerhaft bestehen.

## Was stattdessen passiert ist (Phase 12)

Statt den Score zu erweitern, wurde die Fähigkeit gebaut, **aus ihm zu lernen**:

* opt-in Funnel-Telemetrie ohne eine einzige Antwort (`js/score-telemetry.js`)
* Ergebnis-Feedback „Trifft dieses Ergebnis auf dich zu?" (ja / teilweise / nein
  plus strukturierte Gründe, kein Pflicht-Freitext)
* interner Kalibrierungsbericht (`tools-dev/score-calibration.mjs`)

Score-Logik-Änderungen in Phase 12: **0**. Neue Fragen: **0**.

## Woran der Freeze gemessen wird

Diese Fragen beantwortet der Kalibrierungsbericht:

| Frage | Kennzahl |
|---|---|
| Ist der Score zu lang? | Abschlussquote nach `route_length_bucket`, Median-Dauer |
| Wo bricht es ab? | Abbruch je Abschnitt |
| Trifft das Ergebnis? | `feedback_rating` gesamt und je Engpass/Modus |
| Was stimmt nicht? | häufigste `feedback_reason_codes` |
| Führt das Ergebnis irgendwohin? | CTA-Verteilung |

## Erste Auswertung

Sinnvoll ab **≥ 100 abgeschlossenen Score-Versuchen** oder **≥ 30
Feedback-Antworten** — vorher ist jede Ableitung Rauschen. Bis dahin bleibt
der Freeze unangetastet.

## Nicht eingefroren

* Fehlerbehebungen außerhalb der Score-Logik (Rendering, Zugänglichkeit,
  Performance, Telemetrie, Feedback, Dokumentation)
* Textkorrekturen, die eine Aussage **wahrer** machen (z. B. Einwilligungstexte)
* alles, was den Score nicht bewertet
