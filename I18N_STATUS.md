# I18N STATUS — DE / EN (Phase 9.8)

**Ehrlicher Stand, nicht Wunschdenken.** Dieses Dokument sagt exakt, was
zweisprachig ist und was nicht. Es ersetzt die frühere „Deutsch-first"-
Interpretation aus Phase 9.7 — das Ziel ist ein vollständig zweisprachiges
Produkt. Dieser Stand ist ein **verifiziertes Fundament + Funnel-Start**,
nicht die Fertigstellung.

## Gesamtverdikt: **PARTIAL**

Die kanonische i18n-Engine ist fertig und getestet. Die Homepage-Kernstruktur
schaltet sauber DE/EN. Der große Rest (tiefe Prosa, weitere öffentliche Seiten,
das eingeloggte Produkt-OS mit ~1000 Strings) ist **noch nicht** lokalisiert
und wird hier ehrlich als offen ausgewiesen.

---

## Kanonische Engine (`js/i18n.js` · `MM.i18n`) — COMPLETE

| Fähigkeit | Status |
|---|---|
| Genau `de`/`en`, ein Owner | ✅ |
| Normalisierung (`de-DE`, `DE`, `german` → `de` etc.) | ✅ |
| Browser-Erkennung beim Erstbesuch | ✅ (neu) |
| Manuelle Wahl gewinnt / Persistenz (`localStorage mm_lang`) | ✅ |
| Laufzeit-Umschaltung + `mm:langchange`-Event | ✅ |
| `data-i18n` / `-html` / `-attr` | ✅ |
| Interpolation `{var}` | ✅ (neu) |
| Pluralisierung `plural(n,{one,other})` | ✅ (neu) |
| Zahlen/Datum via `Intl` (`fmtNum`/`fmtDate`) | ✅ (neu) |
| Fehlender-Key-Fallback + `missing()`-Diagnose | ✅ (neu) |
| `document.documentElement.lang` gesetzt | ✅ |
| Test-Suite (`tools-dev/tests/i18n.test.js`, 26 Assertions) | ✅ |
| Live-/lokaler Leak-Scanner (`tools-dev/i18n-scan.mjs`) | ✅ |

Dictionary: 144 Keys, **100 % DE+EN-Parität** (Test erzwingt es).

---

## Surface-Matrix

Legende: ✅ COMPLETE · 🟡 PARTIAL · ⬜ MISSING (nur Chrome/Nav übersetzt)

### PUBLIC
| Surface | Status | Notiz |
|---|---|---|
| Navigation + Footer (alle Seiten) | ✅ | seit jeher verdrahtet |
| Homepage — Hero + Sektions-Kicker/Headings | ✅ | P9.8 verifiziert (DE/EN) |
| Homepage — tiefe Prosa (Tabellen, Card-Texte, FAQ-Antworten, Free-Sektion) | 🟡 | Scanner findet DE-Reste in EN |
| Score-Landing (`check.html`) | ⬜ | Body deutsch |
| Score-Fragebogen + Ergebnis (JS) | ⬜ | deutsch, **Logik-Invarianz zu wahren** |
| Library (`ebooks.html`) | 🟡 | Landing-Keys existieren (`eb.*`), Body teils deutsch |
| Coaching / Trust / Über / FAQ / Kontakt / Checkout / Shop / Tools / Tracker | ⬜ | Chrome übersetzt, Body deutsch |

### PRODUCT (eingeloggtes OS, JS-gerendert)
| Surface | Status | Notiz |
|---|---|---|
| My MaleMetrix, Onboarding, Today, Performance Map, 12-Week, Training, Nutrition, Progress, Weekly Review, Stack Builder, Labs, Advisor, Settings, Auth, Fehler/Empty/Modals | ⬜ | ~1000 deutsche Strings über 27 JS-Module — **nicht** lokalisiert |

### CONTENT
| Surface | Status | Notiz |
|---|---|---|
| Ebook-Reader-Chrome (Cover/TOC/Quellen/Footer) | ⬜ | deutsch (bp-*-Shell) |
| Ebook-Body | siehe Matrix unten | |

---

## Ebook-Sprach-Matrix (§26/§27)

Alle Ebooks haben **ausschließlich deutschen Body**. Es gibt **keine** englischen
Editionen. Ehrliche Policy: im EN-Modus muss die Reader-Shell englisch sein und
klar sagen „Dieser Guide ist derzeit auf Deutsch verfügbar" — das ist **noch
nicht** umgesetzt (Reader-Shell aktuell deutsch).

| Ebook | DE-Body | EN-Body | Reader-UI zweisprachig | Status |
|---|---|---|---|---|
| blueprint, testosteron, supplements, blutwerte-guide, taeglich-trainieren, schlaf-stack, glp1-agonisten, sexuelle-gesundheit, fettabbau, gewohnheiten, protein-system, schlaf-energie, masterguide, training-system | ✅ | ❌ | ❌ | DE BODY ONLY |
| ultimate-stack, master-ebook, protokoll (Premium) | ✅ | ❌ | ❌ | DE BODY ONLY |

Kein Ebook wird als „übersetzt" dargestellt — es gibt keine halb-übersetzten
Bücher. Lange wissenschaftliche Editionen werden **nicht** maschinell blind
übersetzt (§26).

---

## Kanonisches Glossar (Konsistenz-Regel, §31)

Marken-invariant (in DE **und** EN identisch):
`MaleMetrix · Score · Performance Map · Today · Stack Builder · Labs ·
Weekly Review · Pathway · Baseline · Enhanced · BODY/ENGINE/RECOVERY/
HORMONES/EXECUTION`

Interne Enums — **nie** übersetzt gespeichert, nur im Render lokalisiert:
`CUT · BUILD · RECOMP · PERFORM` · `BASELINE · CONNECTED · ADAPTIVE ·
CALIBRATED` · `KEEP · OPTIONAL · REMOVE`

Übersetzte Kernbegriffe (kanonisch festlegen, keine Zufalls-Varianten):
| Konzept | DE | EN |
|---|---|---|
| Bottleneck | Engpass | Bottleneck |
| Limiter | Engpass/Limiter | Limiter |
| Build/Cut/Recomp/Perform (Anzeige) | Aufbau/Defizit/Recomp/Leistung | Build/Cut/Recomp/Perform |
| Not now | Noch nicht | Not now |

---

## Roadmap bis „COMPLETE" (verbleibende Pässe)

1. **Homepage-Prosa fertig** (Tabellen, Cards, FAQ, Free-Sektion, Footer-Prosa).
2. **Öffentlicher Funnel**: check, coaching, trust, ueber, faq, kontakt,
   checkout, shop, tools, tracker, ebooks-Body — `data-i18n` + DICT DE/EN.
3. **Score-Engine**: Fragebogen/Ergebnis lokalisieren **mit Logik-Invarianz-
   Tests** (gleiche Antworten → gleicher Score/Limiter/Pathway in DE & EN).
4. **Produkt-OS**: Render-Schicht auf `MM.i18n` umstellen (Today, Map, 12-Week,
   Training, Nutrition, Stack, Labs, Advisor, Weekly Review, Progress, Auth,
   Settings, Fehler/Empty/Modals) — interne Enums bleiben kanonisch.
5. **Ebook-Reader-Shell** zweisprachig + „nur auf Deutsch verfügbar"-Hinweis.
6. **Formatierung** überall auf `fmtNum`/`fmtDate` umstellen (Parsing-Regression
   aus Phase 9.6 wahren: EN `1,234.56` nie als DE fehlinterpretieren).
7. **State-Preservation-Red-Team** (Score/Stack/Workout/Checkout beim Umschalten).
8. Test-Suite je Surface erweitern; Scanner in CI-artigen Lauf über alle Routen.

## Ehrliche Antworten auf die Abnahmefragen

1. DE-Nutzer ohne versehentliches EN durch das **ganze** Kernprodukt? **NEIN** (DE ist Default und weitgehend deutsch, aber die Engine/Formatierung ist erst teilweise verdrahtet).
2. EN-Nutzer ohne versehentliches DE durch das **ganze** Kernprodukt? **NEIN** (nur Homepage-Kern + Chrome sind EN; Rest deutsch).
3. Sprachwechsel bewahrt State/Domänendaten? **TEILWEISE** (Engine schaltet in-place ohne Reload/Logout; noch nicht über alle Flows rot-getestet).
4. DE vs EN identische Score/Plan/Stack-Entscheidungen? **JA per Design** (Übersetzung nur in der Render-Schicht; Engine/Enums unverändert) — für den Score noch mit Paartests zu **beweisen**, sobald er lokalisiert ist.
