# SCORE V2 — STABILISIERUNG & KALIBRIERUNG · FINAL REPORT

**Stand:** 24./25. Juli 2026
**Branch:** `claude/malemetrix-score-v2-vhket0`
**Umfang:** Branch-Kanonisierung · Touch-Target · Opt-in-Telemetrie ·
Ergebnis-Feedback · Kalibrierungsbericht · Freeze · Deploy · Live-Verifikation

---

## 1. KANONISCHER PRODUKTIONSBRANCH

```
PRODUKTION = main   ·   GitHub Pages Quelle = main / root
master = Kompatibilitäts-Spiegel, deployt NICHTS, wird NICHT gelöscht
```

Verbindlich dokumentiert in **`DEPLOYMENT.md`** (neu), inklusive
Deploy-Ablauf, Verifikationsschritten und der ausdrücklichen Warnung, dass
ein Push auf `master` nichts veröffentlicht. Nachgezogen:
`CONTINUATION_STATE.md` (Agent-Handoff: Dual-Push-Modell ersetzt durch
`git push origin HEAD:main`) und `README.md`.

| Punkt | Vorher | Nachher |
|---|---|---|
| **Default-Branch** | `master` | **weiterhin `master`** — siehe Blocker |
| **Pages-Quelle** | `main / root` | `main / root` (unverändert, verifiziert) |
| **Deploy-Modell** | Dual-Push `HEAD:master HEAD:main` | Push auf `main`; `master` nur Spiegel |
| **master gelöscht?** | — | **Nein**, bewusst erhalten |
| **Force-Push / History-Rewrite** | — | keiner, ausschließlich Fast-Forward |

### Technischer Blocker: Default-Branch

Die Umstellung ist aus der Agent-Umgebung **nicht möglich**:

```
PATCH https://api.github.com/repos/jayjaybaba/malemetrix  {"default_branch":"main"}
→ HTTP 403  "Repository settings writes are not permitted through this proxy."
```

Dasselbe gilt für die Pages-API (`GET/POST /repos/.../pages*` → 403).
**Der Default-Branch wurde also NICHT geändert** — die Umstellung muss der
Owner einmalig unter *Settings → Branches → Default branch* vornehmen.
Auf die Produktion hat das keine Auswirkung: Pages hängt bereits an `main`,
und genau das ist verifiziert (der Push auf `main` löste den Build aus,
der frühere Push auf `master` nicht).

### Hardcodierte `master`-Verweise

Durchsucht wurden `*.md`, `*.yml/yaml`, `*.json`, `*.js`, `*.sh`, `*.toml`.
Steuernde Verweise gab es genau zwei — beide in `CONTINUATION_STATE.md`
(Deploy-Anweisung für Folge-Sessions), beide korrigiert. Die übrigen
Treffer sind historische Berichte oder das Wort „Master" in Produktnamen
(`master-ebook.html`, `PROTOCOL_MASTER_ARCHITECTURE.md`) und wurden
bewusst nicht angefasst. Es existieren keine Workflows in `.github/`.

---

## 2. SHAs

| Rolle | SHA |
|---|---|
| **Fix-/Feature-Commit** | `2280625` |
| **main** | `2280625` |
| **master** (Spiegel) | `2280625` |
| **Arbeitsbranch** | `2280625` |
| **Deployed (Pages)** | `2280625` — Build ~60 s nach dem Push |
| Vorgänger (Score V2 live) | `97e0a17` |

Pages-Build: Workflow `pages build and deployment`, ausgelöst durch den
Push auf `main`. Nachweis nicht über den Push, sondern über den
ausgelieferten Inhalt (siehe Abschnitt 10).

---

## 3. BUTTON-FIX („Ergebnis senden")

**Befund: der gemeldete Defekt existiert nicht.** Nachgemessen im echten
Browser bei geöffnetem Formular: **48–49 px** — bereits über dem Standard.

Die frühere Meldung stammt aus meiner eigenen QA im vorherigen Durchgang und
war ein **Messfehler**: Das E-Mail-Formular ist `display:none`, bis man es
öffnet; `getBoundingClientRect().height` lieferte deshalb `0`, was der
Filter „< 40 px" als winziges Touch-Target zählte. Das ist hiermit korrigiert.

Umgesetzt wurde statt eines Umbaus eine **Regressionssicherung**:

```css
#emailForm .btn,
#emailForm input { min-height: 44px; }
```

Ein Boden, kein neues Maß — die Optik ist unverändert (der Button ist
ohnehin höher). Damit kann eine spätere Padding- oder Schriftgrößenänderung
den Touch-Standard nicht unbemerkt unterschreiten. Zusätzlich hält der neue
Feedback-Button dieselbe Grenze ein. Kein globales Button-Redesign, keine
Änderung an der Versandlogik, Lade-/Deaktiviert-/Fokus-Zustände unberührt.

Gemessen bei 390 / 430 / 768 / 1440: **kein sichtbares interaktives Element
unter 44 px**, kein horizontaler Überlauf.

---

## 4. TELEMETRIE-ARCHITEKTUR

```
Browser (js/score-telemetry.js)
  └─ Einwilligung? ─ nein ─→ ENDE (nichts wird erzeugt, nichts gepuffert)
        │ ja
        ├─ Allowlist-Filter (Client)      ← Whitelist, kein Freitextfeld
        ├─ gedeckelte Warteschlange (40)  ← localStorage, max. 3 Zustellversuche
        └─ fetch(keepalive) / sendBeacon
              └─ Edge Function `score-telemetry`  (verify_jwt=false, Origin-Allowlist)
                    ├─ validate.mjs — Allowlist-Zweitprüfung (verbindliche Grenze)
                    └─ upsert on event_id (idempotent)
                          └─ Tabelle score_events (RLS an, KEINE Policy,
                             CHECK-Constraints = dritte Allowlist)
```

Kein Drittanbieter. Kein neues Analytics-SDK. Plausible bleibt unverändert
(und weiterhin ohne konfigurierte Domain). Der bestehende lokale Funnel
(`MM.funnel()`) bleibt, wie er war — er verlässt das Gerät nie.

**Drei unabhängige Allowlists** (Client, Function, Datenbankschema). Eine
Antwort aus dem Score kann keine davon passieren, weil an keiner Stelle ein
Feld existiert, das sie aufnehmen könnte.

---

## 5. CONSENT-VERHALTEN

* Eigene, **optionale** Checkbox auf dem Score-Einwilligungsschirm —
  **nicht vorangehakt**, **nicht Pflicht**. Ohne Häkchen läuft der Score
  identisch, nur ohne Statistik.
* Der Text benennt ausdrücklich, was **nicht** übertragen wird: keine
  Antworten, keine Blutwerte, keine Substanzen, kein Status, kein Name,
  keine E-Mail.
* Widerruf: Häkchen entfernen → Einwilligung aus, Warteschlange sofort
  gelöscht, weitere Erfassung unterbleibt.
* Die bestehenden Datenschutz-Zusagen auf der Seite wurden **wahrheitsgemäß
  nachgezogen**: aus „Nichts wird automatisch an uns übertragen" wurde
  „Deine Antworten … werden nicht an uns übertragen", plus Hinweis auf die
  optionale, antwortfreie Statistik. Das ist die einzige Copy-Änderung —
  sie macht eine bestehende Aussage präziser, statt sie zu verwässern.
* Live nachgewiesen: **ohne Einwilligung 0 Netzwerkanfragen** über alle fünf
  Statuspfade.

---

## 6. IMPLEMENTIERTE EVENTS

| Event | Auslöser | Dedup |
|---|---|---|
| `score_started` | Wizardstart nach Einwilligung | einmal je Versuch |
| `score_resumed` | Fortsetzen eines Entwurfs | einmal je Versuch |
| `score_section_entered` | Wechsel in einen Abschnitt | einmal je Abschnitt |
| `score_section_completed` | Verlassen eines Abschnitts | einmal je Abschnitt |
| `score_progress_checkpoint` | 25 / 50 / 75 % | einmal je Marke |
| `score_completed` | Ergebnisberechnung | **genau einmal** |
| `score_result_viewed` | Ergebnisseite gerendert | einmal je Versuch |
| `score_result_feedback_submitted` | Feedback abgeschickt | pro Absenden |
| `score_cta_clicked` | Klick auf ein `data-track`-Element im Ergebnis | pro Klick |
| `score_email_result_opened` | E-Mail-Formular geöffnet | einmal je Versuch |
| `score_email_result_submitted` | E-Mail-Ergebnis abgeschickt | pro Absenden |

Bewusst **keine** Events pro Antwort. Abbruch wird nicht als Event gemeldet,
sondern im Bericht aus „Start ohne Abschluss" **geschätzt** und auch so
benannt — ein geschlossener Tab meldet sich nun einmal nicht.

Deduplizierung läuft über den im Versuch gespeicherten Zustand, überlebt
also Reload und Zurück-Navigation. Live gemessen: 4 abgeschlossene Versuche
→ **4 `score_completed`-Events mit 4 unterschiedlichen `event_id`**;
Wiederholungssendungen tragen dieselbe `event_id` und werden serverseitig
per `upsert` zusammengeführt.

---

## 7. GESPEICHERTE DATEN

`event_id` · `score_session_id` (zufällig, pro Versuch neu) · `event_name` ·
`score_version` · `client_ts` (plausibilitätsgeprüft) · `received_at` ·
`section_id` · `question_index` · `visible_question_count` ·
`completion_percentage` · `elapsed_seconds` · `device_class` ·
`route_length_bucket` · `result_mode` · `primary_bottleneck_id` ·
`assessment_confidence` · `completion_duration_bucket` · `data_gap_count` ·
`feedback_rating` · `feedback_reason_codes[]` · `cta_id`

`result_mode`, `primary_bottleneck_id` und `assessment_confidence` sind
**Ausgaben der Engine**, keine Nutzerantworten — ohne sie ließe sich nicht
prüfen, ob das Ergebnis trifft. Sie werden nur nach Einwilligung und ohne
jede Kontoverknüpfung gespeichert.

### AUSDRÜCKLICH NICHT GESPEICHERT

Antworten (roh oder abgeleitet) · Natural/TRT/Enhanced-**Status** ·
Laborwerte und Marker · Substanz-/Medikamentenauswahl · Sexual- und
Fertilitätsangaben · Symptome und Red Flags · Körpermaße (Größe, Gewicht,
Taille, Alter) · Freitext jeder Art · Name · E-Mail · `user_id` ·
IP-Adresse · User-Agent · Zugangscodes · Ultimate-Stack-Daten · Cookies.

Live-Nachweis aus den echten übertragenen Payloads (183 Events):

```
gesendete Felder: assessment_confidence, client_ts, completion_duration_bucket,
completion_percentage, data_gap_count, device_class, elapsed_seconds, event_id,
event_name, feedback_rating, feedback_reason_codes, primary_bottleneck_id,
question_index, result_mode, route_length_bucket, score_session_id,
score_version, section_id, visible_question_count
```

Mehr existiert nicht. Die Gerätekasse stammt ausschließlich aus der
Viewport-Breite; `navigator.userAgent` kommt im Modul nicht vor.

---

## 8. FEEDBACK-MODUL

Nach dem Ergebnisinhalt: **„TRIFFT DIESES ERGEBNIS AUF DICH ZU?"** —
JA / TEILWEISE / NEIN. Bei TEILWEISE oder NEIN erscheinen optionale,
strukturierte Gründe (Engpass passt nicht · Modus passt nicht · zu allgemein ·
Kontext fehlt · Begründung unklar · zu lang · andere Ursache).
**Kein Pflicht-Freitext, kein Freitextfeld überhaupt** — es wird bewusst
keine Krankengeschichte gesammelt.

Bestätigung, zurückhaltend und ohne falsches Versprechen:
„Danke. Dein Feedback hilft, den Score präziser zu kalibrieren."

Gespeichert werden `feedback_rating`, `feedback_reason_codes[]` und der
Ergebnis-Kontext (Modus, Engpass, Sicherheit, Dauer-Klasse) — nie der
Antwortsatz.

---

## 9. KALIBRIERUNGSBERICHT

`tools-dev/score-calibration.mjs` — **keine neue öffentliche Route**.
Läuft lokal/serverseitig gegen Supabase, Service-Role-Key **nur** aus der
Umgebung (nie Argument, nie im Repo). Ohne Schlüssel gibt es einen
Trockenlauf mit Anleitung statt erfundener Zahlen.

Beantwortet: Starts · Abschlüsse · Abschlussquote · Median-Dauer · Abbruch je
Abschnitt · Ø sichtbare Fragen · Abschluss nach Routenlänge ·
Feedback ja/teilweise/nein · häufigste Feedback-Gründe · CTA-Verteilung ·
Score-Version. Die Rechenlogik (`buildReport`) ist rein und wird mit
konstruierten Events getestet.

Zugriff bleibt geschützt, weil `score_events` RLS ohne Policy hat: weder
anonyme noch eingeloggte Clients können lesen — nur Service Role.

---

## 10. TESTERGEBNISSE

**Gesamt: 20 Testdateien · 1227 Assertions · 0 Fehler.**
Die bestehenden **1100** sind unverändert grün; **127** sind neu
(`tools-dev/tests/score-telemetry.test.js`).

| Geforderter Nachweis | Ergebnis |
|---|---|
| 1 · keine Telemetrie vor Einwilligung | ✅ `track()` liefert `false`, Warteschlange leer, 0 Anfragen |
| 2 · Score bleibt nutzbar bei defektem Endpunkt | ✅ offline / 500 / kein Endpunkt / voller Speicher — kein Fehler dringt durch |
| 3 · keine Doppel-Events bei Zurück-Navigation | ✅ zweiter und dritter Eintritt zählen nicht, auch nach Reload |
| 4 · Abschluss feuert genau einmal | ✅ im Test und live (4 Versuche → 4 eindeutige Events) |
| 5 · Feedback funktioniert | ✅ Bewertung, Gründe, Bestätigung — im Browser verifiziert |
| 6 · Feedback-Gründe bleiben erhalten | ✅ nur bekannte Codes, ohne Dubletten |
| 7 · keine Rohantworten in der Telemetrie | ✅ Client, Function und Schema getrennt geprüft |
| 8 · keine Laborwerte | ✅ kein Feld existiert |
| 9 · keine Substanzauswahl | ✅ kein Feld existiert |
| 10 · Legacy-V1-Ergebnis lädt | ✅ auch auf den deployten Bytes, 0 JS-Fehler |
| 11 · alle fünf Statuspfade funktionieren | ✅ live verifiziert |
| 12 · Bauchfett + unbekannte Taille ≠ BUILD | ✅ unverändert RECOMP |
| 13 · Enhanced ohne Statusmalus | ✅ unverändert |
| 14 · TRT-Ansprechen ≠ TRT-Kontrolle | ✅ unverändert |
| 15 · „Ergebnis senden" ≥ 44 px | ✅ 48–49 px gemessen + CSS-Garantie + Test |

---

## 11. MOBILE / BROWSER-QA

Echte Chromium-Durchläufe, zweimal komplett: einmal gegen das Repository,
einmal gegen die **deployten Bytes** von `www.malemetrix.com`.

| Prüfung | 390 | 430 | 768 | 1440 |
|---|---|---|---|---|
| Score startet, Fortschritt, bedingte Fragen | ✅ | ✅ | ✅ | ✅ |
| Zurück-Navigation, Antwort-Persistenz | ✅ | ✅ | ✅ | ✅ |
| Abschluss + Ergebnisseite | ✅ | ✅ | ✅ | ✅ |
| Kontext-Panel je Status korrekt | ✅ | ✅ | ✅ | ✅ |
| Feedback-Modul rendert und sendet | ✅ | ✅ | ✅ | ✅ |
| CTA-Tracking bricht keine Links | ✅ | ✅ | ✅ | ✅ |
| E-Mail-Formular, Button 48 px | ✅ | ✅ | ✅ | ✅ |
| kein horizontaler Überlauf | ✅ | ✅ | ✅ | ✅ |
| keine JS-Fehler | ✅ | ✅ | ✅ | ✅ |
| Telemetriefehler ohne UX-Wirkung | ✅ | ✅ | ✅ | ✅ |

Statuspfade je einmal vollständig durchgeklickt: Natural (57 Fragen),
Früher Enhanced (61), Medizinische TRT (61), Enhanced (62), Unsicher (58).

---

## 12. LIVE-VERIFIKATION

| Prüfung | Ergebnis |
|---|---|
| Richtiges Bundle deployt | ✅ 13/13 Dateien byte-identisch (SHA-256) mit dem Repository |
| Service Worker | ✅ `mm-v130` live |
| Einwilligungs-Checkbox | ✅ auf `check.html` vorhanden |
| 44-px-Garantie im CSS | ✅ ausgeliefert |
| Alle fünf Pfade auf deployten Bytes | ✅ vollständig durchlaufen, 0 JS-Fehler |
| Ohne Einwilligung | ✅ **0 Telemetrie-Anfragen** |
| Mit Einwilligung | ✅ Events werden gesendet; 183/183 bestehen die serverseitige Allowlist |
| Keine Rohantworten im Netzwerkverkehr | ✅ Feldliste geprüft (siehe Abschnitt 7) |
| Feedback absendbar | ✅ inkl. Gründen und Bestätigung |
| Altes gespeichertes Ergebnis | ✅ lädt, rendert, Status „unbekannt" |
| Deep Links / CTA | ✅ funktionieren unverändert |

Für die Produktions-QA wurden ausschließlich **synthetische** Testdaten
verwendet (Vorname „QA", erfundene Werte). Keine echten Gesundheitsdaten.

---

## 13. SCORE-LOGIK-ÄNDERUNGEN

```
==================================================
SCORE-LOGIK-ÄNDERUNGEN:  0
NEUE FRAGEN:             0
GEÄNDERTE GEWICHTE:      0
GEÄNDERTE SCHWELLEN:     0
==================================================
```

Testgesichert: 87 Fragen, 12 Kern-Domains, unveränderte Domain-Gewichte,
genau zwei Kontextmodifikatoren — und `check-data.js` enthält keinerlei
Telemetrie-Bezug (keine Vermischung von Engine und Messung).
Der Freeze inklusive Pflichtformular für spätere Änderungen steht in
**`SCORE_V2_CALIBRATION.md`**; `SCORE_V2_LOGIC.md` verweist darauf.

---

## 14. BEKANNTE EINSCHRÄNKUNGEN

1. **Der Telemetrie-Endpunkt ist noch nicht deployt.** Live geprüft:
   `POST /functions/v1/score-telemetry` → `404 NOT_FOUND`. Migration und
   Function liegen im Repository, werden aber wie alle Supabase-Teile
   **manuell** ausgerollt (`supabase db push` + `supabase functions deploy
   score-telemetry`, siehe `EDGE_FUNCTIONS.md`). Bis dahin sammelt der
   Client bei erteilter Einwilligung still, versucht die Zustellung
   höchstens dreimal und verwirft dann — **der Score ist davon in keiner
   Weise betroffen** (live verifiziert). Es fließen also noch keine
   Kalibrierungsdaten.
2. **Der Repository-Default-Branch steht weiterhin auf `master`** — der
   Agent-Proxy verbietet Settings-Writes (403). Ohne Wirkung auf die
   Produktion, aber ein offener Aufräumpunkt für den Owner.
3. **Abbruch bleibt eine Schätzung.** Ein geschlossener Tab meldet sich
   nicht; der Bericht weist „inferred_dropoff" ausdrücklich als abgeleitet aus.
4. **`sendBeacon`-Zustellung ist nicht garantiert** (Browser dürfen sie beim
   Schließen verwerfen). Die letzten Events einer abgebrochenen Sitzung
   können fehlen.
5. **Kein Consent-Widerruf außerhalb des Score-Einstiegs.** Das Häkchen ist
   auf dem Einwilligungsschirm änderbar; eine zentrale
   Datenschutz-Einstellungsseite existiert (noch) nicht.
6. Der Browser der QA-Umgebung erreicht das öffentliche Internet nicht;
   die Live-Prüfung lief deshalb gegen die **heruntergeladenen deployten
   Bytes** plus direkte HTTP-Prüfungen der echten Domain.

---

## FINAL STATUS

```
==================================================
FRONTEND:  LIVE VERIFIED  (main = 2280625, Pages-Build bestätigt)
BACKEND:   PARTIAL — Edge Function + Migration warten auf den
           manuellen Supabase-Deploy durch den Owner
==================================================
```

**Kann MaleMetrix jetzt aus echter Score-Nutzung lernen, ohne den Score
komplexer zu machen oder unnötige sensible Daten zu sammeln?**

**Ja — sobald die zwei Supabase-Befehle gelaufen sind.** Der Score hat
keine einzige Frage mehr, keine geänderte Logik und kein neues
Tracking-SDK. Was hinzugekommen ist: eine freiwillige, antwortfreie
Messung des Trichters, eine ehrliche Trefferfrage zum Ergebnis und ein
interner Bericht, der beides zusammenführt.
