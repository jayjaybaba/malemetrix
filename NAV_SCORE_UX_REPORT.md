# NAVIGATION & SCORE UX CLEANUP — FINAL REPORT

**Stand:** 25. Juli 2026 · **Deployed SHA:** `c904931` · **main = master = c904931**
**Pages-Quelle:** `main / root` · Build bestätigt (Service Worker `mm-v131` live)

---

## ERGEBNIS IN KURZFORM

| Punkt | Ergebnis |
|---|---|
| SYSTEM REMOVED FROM DESKTOP | **YES** |
| SYSTEM REMOVED FROM MOBILE | **YES** (dieselbe `.main-nav`, im Drawer wiederverwendet) |
| SYSTEM REMOVED FROM FOOTER | **YES** — es gab dort nie einen Link (Details unten) |
| SCORE ENTRY WALL REMOVED | **YES** |
| MANDATORY CHECKBOXES BEFORE SCORE | **0** |
| MEDICAL NOTE | **ONE NON-BLOCKING SENTENCE** |
| ANALYTICS DEFAULT | **OFF** |
| ANALYTICS MOVED TO | **RESULT** (Ende der Ergebnisseite) |
| TELEMETRY BEFORE OPT-IN | **0** |
| RAW SCORE ANSWERS TRANSMITTED | **NO** |
| SCORE QUESTIONS CHANGED | **0** |
| SCORING LOGIC CHANGED | **0** |
| MY PROTOCOL BOTTOM NAV UPDATED | **YES** |
| BOTTOM NAV ACTIVE STATE | **PASS** |
| BOTTOM NAV SAFE AREA | **PASS** |
| BOTTOM NAV CONTENT OVERLAP | **NONE** |
| BOTTOM NAV TOUCH TARGETS | **PASS** (56 px mobil, 65 px Desktop) |
| TESTS | **PASS** — 1280 Assertions, 0 Fehler |
| MOBILE QA | **PASS** — 390 / 430 / 768 / 1440 |
| LIVE VERIFIED | **YES** |

**FINAL STATUS: LIVE CLEAN**

---

## A · „SYSTEM" ENTFERNT

Der Eintrag zeigte auf `index.html#system` — einen Abschnittsanker der
Startseite, kein eigenes Ziel. Entfernt aus **29 HTML-Dateien** (Desktop-Header
und mobiles Menü teilen sich dieselbe `.main-nav`, dazu die abweichenden
Ebook-Header) plus der verwaisten Übersetzung `nav.system` in `js/i18n.js`.

Live geprüft: **0 Treffer** für `index.html#system` auf allen 29 Seiten.

**Bewusst NICHT angefasst — mit Begründung:**

* Der Abschnitt `#system` auf der Startseite selbst bleibt, ebenso der
  seiteninterne Link „So funktioniert MaleMetrix ↓". Der führt an eine echte
  Stelle derselben Seite und ist kein Navigationseintrag.
* Die Footer-Spalte trägt die Überschrift „System" — das ist eine
  **Gruppenüberschrift ohne `href`**, kein Navigationsziel und kein toter Link.
  Sie gruppiert Score, Coaching, Protokoll und Blutwerte. Ein Löschen hätte
  eine kopflose Spalte hinterlassen. Falls die Überschrift trotzdem stören
  sollte, ist das eine Umbenennung — sag Bescheid, dann mache ich das
  getrennt.

Verbleibende Hauptnavigation (alle Ziele live mit HTTP 200 geprüft):
Score · Das Protokoll · 1:1 Coaching · Über (Library, Über MaleMetrix, FAQ,
Kontakt) · My MaleMetrix. **Keine toten oder leeren `href`.**

---

## B · SCORE-EINSTIEG OHNE WAND

**Vorher:** Intro → eigener Einwilligungsschirm mit vier Pflicht-Checkboxen,
einem Erklärabsatz, einer optionalen Statistik-Checkbox mit langem
technischem Text, einem Hinweiskasten und einem gesperrten Button.

**Jetzt:** Titel, ein Satz, ein Button.

```
KOSTENLOS · CA. 7 MINUTEN · SOFORTIGES ERGEBNIS

Finde deinen größten Engpass.

Der MaleMetrix Score analysiert Training, Körperkomposition,
Schlaf, Stoffwechsel und deinen individuellen Kontext.

[ SCORE STARTEN → ]

Der Score dient der Orientierung und ersetzt keine medizinische
Diagnose oder ärztliche Beratung.
```

Entfernt: Consent-Sektion, alle vier Pflicht-Checkboxen, deren Validierung,
die Disabled-Logik des Start-Buttons, der Hinweiskasten, der lange
Analytics-Text sowie die beiden Feature-Listen des alten Intros. Der
„Check neu starten"-Knopf im Ergebnis springt jetzt ebenfalls direkt in den
Wizard statt auf den entfernten Schirm.

Live geprüft auf 390/430/768/1440: **0 Checkboxen**, Start-Button aktiv,
erste Frage („Was ist dein Hauptziel für die nächsten 12 Wochen?") erscheint
sofort, keine Lücke im Layout, kein Overflow, 0 JS-Fehler.

**Lokale Verarbeitung unverändert:** Zwischenspeichern, Fortsetzen, Berechnen
und Anzeigen laufen ohne gesonderte Einwilligung — sie verlassen das Gerät
nicht. Rohe Antworten werden weiterhin nie übertragen.

---

## C · OPTIONALE NUTZUNGSMESSUNG

Verschoben ans **Ende der Ergebnisseite**, kompakt:

```
MALEMETRIX VERBESSERN
Anonyme Nutzungsmessung erlauben
Hilft uns zu erkennen, wo der Score zu lang ist.
Es werden keine Antworten oder Gesundheitsdaten übertragen.
                                            [ Schalter: AUS ]
```

Standard **AUS** (`aria-checked="false"`), in beide Richtungen umschaltbar,
44 px hoch, `role="switch"`, nicht blockierend, ohne Einfluss auf den Score.
Live geprüft: Schalter startet auf AUS → AN sendet, AUS widerruft und leert
die Warteschlange.

**Bekannte Konsequenz, ehrlich benannt:** Weil vor dem Opt-in nichts erfasst
wird, hat ein Nutzer, der erst im Ergebnis zustimmt, für **diesen** Durchlauf
keine Abschnittsdaten — gemessen werden dann das Ergebnis, das Feedback, die
CTA-Klicks und **jeder weitere Score-Versuch vollständig** (die Einwilligung
bleibt gespeichert). Wer vorher abbricht, taucht gar nicht auf. Das ist der
Preis dafür, den Einstieg frei zu halten; es ist eine bewusste Entscheidung,
kein Fehler.

---

## D · MY-PROTOCOL-BOTTOM-NAVIGATION

**Vorher:** durchscheinender Hintergrund (72 % Deckung), 0.68 rem Labels, ein
4-px-Punkt als einziger Aktiv-Hinweis, ~40 px Touch-Ziele, schwebende Kachel
mit 10 px Rand. Las sich wie Fußnotentext.

**Jetzt** (Today · Plan · Track · Progress · Learn — keine neuen Ziele,
keine Umbenennung):

| Eigenschaft | Wert (live gemessen) |
|---|---|
| Position mobil | `fixed`, volle Breite, bündig am unteren Rand |
| Barhöhe | 69 px (inkl. Safe Area) |
| Touch-Ziel je Punkt | **56 px** mobil, 65 px Desktop |
| Icons | 20 px mobil / 21 px Desktop, Strich-Icons in Systemsprache |
| Hintergrund | `#05070b` deckend |
| Trennkante | 1 px `rgba(255,255,255,0.10)` oben |
| Schatten | `0 -10px 30px rgba(0,0,0,0.55)` |
| Inaktiv | `#aeb8c7` — klar lesbar |
| Aktiv | Electric Cyan **+ Linie über dem Icon + Schriftschnitt 700 + getönter Hintergrund** |
| `aria-current="page"` | gesetzt |
| Tastaturfokus | sichtbar (`:focus-visible`, 2 px Cyan) |
| Safe Area | `env(safe-area-inset-bottom)` in Bar **und** Inhaltsabstand |
| z-index | **110** — über dem Inhalt, unter Sheets (120) und Modals (200) |

**Zum z-index:** Ein höherer Wert hätte die App-Sheets (`.os-sheet`, z-index
120) verdeckt. 110 hält die Bar über allen Inhalten, lässt aber jedes
geöffnete Overlay gewinnen.

**Routing & Aktiv-Zustand:** alle fünf Ziele sind gültige Routen der App
(`VIEWS`), direkter URL-Aufruf funktioniert, Browser-Zurück funktioniert
(`#progress → #plan → zurück` liefert wieder `#progress` mit korrektem
Aktiv-Zustand). Auf Unteransichten (z. B. `#workout`, `#week`, `#settings`)
ist bewusst **kein** Punkt aktiv, statt einen möglicherweise falschen Punkt
zu markieren.

**Inhaltsüberlappung:** an den Anschlag gescrollt, alle fünf Ansichten,
390 und 430 px → **0 verdeckte Elemente**. Der Abstand ist genau einmal
gesetzt (`.os-shell`, mobil `78px + safe-area`).

**Desktop/Tablet:** unverändert im Seitenfluss oben — kein aufgezwungener
Mobile-Bottom-Bar, keine doppelte Navigation.

---

## E · SCORE V2 UNVERÄNDERT

```
FRAGEN HINZUGEFÜGT:   0
FRAGEN ENTFERNT:      0
SCORING-ÄNDERUNGEN:   0
```

87 Fragen, adaptives Routing, alle fünf Statuspfade, 12 Domains,
Kontext-Domains, Gewichte, Modifikatoren, Data-Gap-Engine, Confidence,
Bottleneck-Engine und CUT/RECOMP/BUILD/HEALTH-FIRST-Logik sind unberührt.
Der Kalibrierungs-Freeze gilt weiter. Testgesichert.

---

## F · TESTS

**20 Testdateien · 1280 Assertions · 0 Fehler** (vorher 1227; 53 neue).

Neu abgesichert: kein Checkbox-Einstieg · keine Consent-Sektion · Start-Button
nicht deaktiviert · genau ein Hinweissatz · Messung erst nach dem Ergebnis ·
Schalter startet auf AUS und kippt in beide Richtungen · kein
„System"-Navigationslink in irgendeiner HTML-Datei · keine verwaiste
Übersetzung · jedes Navigationsziel existiert als Datei · alle fünf
Bottom-Nav-Ziele sind gültige Routen · Aktiv-Zustand exakt · 44-px-Ziele ·
deckender Hintergrund · Trennkante · Schatten · Safe Area · z-index unter
Sheets · Aktiv-Zustand nicht nur über Farbe · Inhaltsabstand genau einmal.

Weiterhin grün: Legacy-Score-V1-Ergebnisse laden, alle fünf Score-Pfade
laufen durch, keine Rohantworten in der Telemetrie, Commerce unberührt.

---

## G · LIVE-VERIFIKATION

| Prüfung | Ergebnis |
|---|---|
| Deployte Dateien vs. Repository | ✅ **39/39 byte-identisch** (SHA-256), inkl. `js/os/*`, `css/os.css`, `sw.js` |
| Service Worker | ✅ `mm-v131` |
| „System" auf 29 Live-Seiten | ✅ **0 Treffer** |
| Score-Einstieg live | ✅ 0 Checkboxen, Button aktiv, sofortiger Start |
| Alle vier Breiten | ✅ kein Overflow, 0 JS-Fehler |
| Telemetrie vor Opt-in | ✅ **0 Anfragen** |
| Opt-in nach dem Ergebnis | ✅ vorhanden, Standard AUS, an/aus funktioniert |
| Bottom-Nav mobil | ✅ fixed, 69 px, z 110, Icons, aktiv + `aria-current` |
| Alle fünf Ziele | ✅ **5/5** korrekt geroutet und korrekt aktiv |
| Browser-Zurück | ✅ Hash und Aktiv-Zustand stimmen |
| Inhaltsüberlappung | ✅ keine |
| Hauptnavigations-Ziele | ✅ alle HTTP 200 |

Für die Produktions-QA wurden ausschließlich synthetische Testdaten benutzt.

---

## OFFENE PUNKTE (unverändert aus der Vorphase)

1. **Telemetrie-Endpunkt noch nicht deployt** — `POST /functions/v1/score-telemetry`
   liefert live weiterhin `404`. Migration und Function liegen im Repo;
   Supabase wird in diesem Projekt manuell ausgerollt
   (`supabase db push` + `supabase functions deploy score-telemetry`).
   Der Score ist davon unbeeinträchtigt.
2. **Repository-Default-Branch steht weiterhin auf `master`** — der
   Agent-Proxy verbietet Settings-Writes (403). Ohne Wirkung auf die
   Produktion, `main` deployt.
