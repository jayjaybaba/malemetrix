# CONTENT INVENTORY (Content Phase 1, §1)

Auditiert am tatsächlichen Repo-Stand `cdc96d9`. Frühere Berichte nicht vertraut.

## Ebook-Bestand (`ebooks/`)

| Ebook | Wörter | Struktur | Bilder | Zugang | Index | Evidenz-Sektion |
|---|---|---|---|---|---|---|
| blueprint | 6590 | 4 h2 | 1 | frei | index | ✅ (37 Evidenz-Verweise) |
| taeglich-trainieren | 4510 | 18 h2 | 11 | frei | index | ✅ **neu: Schoenfeld 2017** |
| sexuelle-gesundheit | 4401 | 17 h2 | 12 | frei | index | ✅ |
| blutwerte-guide | 4198 | 16 h2 | 12 | frei | index | ✅ **neu: ESC/EAS 2019** |
| glp1-agonisten | 4175 | 15 h2 | 10 | frei | index | ✅ **neu: STEP-1 2021** |
| schlaf-stack | 3943 | 16 h2 | 12 | frei | index | ✅ **neu: Watson 2015** |
| testosteron | 3822 | 15 h2 | 12 | frei | index | ✅ **neu: Bhasin 2018** |
| fettabbau | 3511 | 15 h2 | 2 | frei | noindex¹ | ✅ |
| supplements | 3151 | 11 h2 | 11 | frei | index | ✅ **neu: Kreider 2017 + Morton 2018** |
| gewohnheiten | 3278 | 12 h2 | 1 | frei | noindex¹ | ✅ |
| schlaf-energie | 3190 | 13 h2 | 11 | frei | noindex² | — |
| masterguide | 2932 | 14 h2 | 2 | frei | noindex² | — |
| protein-system | 2577 | 13 h2 | 1 | frei | noindex¹ | ✅ **neu: Morton 2018** |
| training-system | 3995 | 16 h2 | 1 | frei | noindex² | — |
| **protokoll** | (gated) | — | — | AES-Vault | noindex | Premium |
| **master-ebook** | (gated) | — | — | AES-Vault | noindex | Premium |
| **ultimate-stack** | (gated) | — | — | AES-Vault | noindex | Premium |

¹ **noindex bei sonst indexierbarem Inhalt** — zu prüfen (evtl. lead-gated Alt-PDF-Variante).
² **noindex = bewusst (Alt-Version)**: `schlaf-energie`↔`schlaf-stack`, `training-system`↔`taeglich-trainieren`, `masterguide`↔`blueprint` — die neuere, benannte Fassung ist indexiert; die Alt-Fassung bleibt noindex, um Duplicate-Content-Abwertung zu vermeiden. **Nicht blind entfernen.**

## Referenzseite — `anabole-matrix.html`

Freie, indexierte Referenz: **13 Signalwege × 14 Hebel** als Matrix, dazu die
multiplikative Rechnung (Zuwachs = Reiz × Baumaterial × Kapazität × Erholung −
Bremsen), Signalweg-Karte (SVG), Detailraster je Weg und Hebel (Dosis ·
Zeitfenster · Nachweis · häufigster Fehler · Grenze), der Abschnitt „Wege ohne
steuerbaren Hebel“, Trigger-Plan über eine Woche und der ehrliche Vergleich
mit Substanzen.

- **Datengetrieben:** `js/anabole-matrix-data.js` (Inhalt) +
  `js/anabole-matrix.js` (Darstellung). Inhalt wird nur in der Datendatei
  geändert — der Test hält die Trennung fest.
- **Zwei Evidenzachsen:** `evidenz` (STARK/MITTEL/SCHWACH) sagt, wie sicher
  der Beleg ist; `evidenzArt` (HUMAN-LANGZEIT · HUMAN-AKUT · PRÄKLINISCH ·
  LEITLINIE · MECHANISMUS) sagt, welcher Art er ist. Ohne die zweite Achse
  verschwimmt „Mechanismus belegt“ mit „Hebel belegt“.
- **Evidenz:** 18 web-verifizierte Arbeiten mit DOI und kanonischer URL.
  Fünf stehen identisch im Wissensgraph (Morton 2018, Schoenfeld 2017,
  Kreider 2017, Watson 2015, Bhasin 2018), zwölf sind für diese Seite ergänzt
  (West 2012, Morton AR 2018, Leproult 2011, Refalo 2023, Bhasin 1996,
  Bhasin 2001, Stec 2016, Snijders 2017, Damas 2016, Schoenfeld 2016/Pause,
  Lange 2002, Baggish 2017, STEP-1 2021). Wo keine Landmark-Quelle vorliegt (SW05, SW09,
  SW10), steht das als `evidenzNote` an der Aussage — es wird keine erfunden.
- **Wege ohne Hebel** (`OHNE_HEBEL`, 7 Einträge): YAP/TAZ, MAPK,
  Calcineurin/NFAT, HGF/IL-6/Notch/Wnt, pharmakologische Myostatin-Hemmung,
  β₂-Adrenozeptor, GH/IGF-1/Insulin extern. Sie stehen bewusst außerhalb der
  Matrix — eine Zeile ohne Hebel wäre eine leere Zeile —, aber auf der Seite,
  weil unter genau diesen Namen Präparate verkauft werden.
- **Leitplanken** (`tools-dev/tests/anabole-matrix.test.js`, 169 Prüfungen):
  keine Bremse als „schaltet direkt“, keine Evidenzstufe STARK ohne Quelle,
  kein MECHANISMUS-Eintrag mit Studie, keine unbenutzte oder unvollständige
  Quelle, keine Dosieranweisung für Substanzen, jeder Signalweg gehört zu
  einem Faktor der Rechnung — und die Passagen „Was Substanzen anders machen“
  samt Konvergenz-Argument können nicht still verschwinden. Alle Zahlen im
  Fließtext werden gegen die Daten geprüft.
- **Selbstcheck „Was dein Verhalten aktuell adressiert"** (`#abgleich`):
  14 Fragen — eine je Hebel, Antwortstufen aus dessen dokumentierter Dosis.
  Färbt die Matrix mit den eigenen Angaben ein, benennt den schwächsten der
  fünf Faktoren und **genau einen** nächsten Hebel.

  Rollentrennung, verbindlich: Der **Score** findet den übergeordneten
  Engpass. Der **Selbstcheck** projiziert Trainings- und Regenerations­­-
  verhalten auf die Matrix. Die **Rechner** liefern Zahlen. Die Matrixseite
  erklärt die Biologie. Der Selbstcheck rührt die kalibrierte Score-Engine
  nicht an — er liest `check_draft` nur lesend und füllt daraus 7 der 14
  Fragen vor; die anderen 7 (RIR, Amplitude, Sätze je Muskel, Satzpause,
  Ausdauer, Kreatin, Laborwerte) erfasst der Score gar nicht.

  **Epistemische Leitplanken, testgesichert:** Es wird nirgends behauptet,
  ein Signalweg sei „aktiviert“ oder „getriggert“ — die Aussage lautet
  immer „dein Verhalten adressiert“ (Bremsen: „entlastet“). Vier Zustände
  statt drei: „noch offen“ ist eigenständig, damit eine unbeantwortete
  Frage nie als Versäumnis zählt. Ein Weg gilt nur dann als adressiert,
  wenn **alle** direkt wirkenden Hebel erfüllt sind — sonst stünde
  „Androgenrezeptor adressiert“ bei fünf Stunden Schlaf. Ein
  unbeantworteter Hebel wird nie als nächster Schritt empfohlen. Kein
  Gesamtwert, keine Prozentnote: Die Rechnung ist multiplikativ, ein
  Mittelwert würde sie verwischen.

- **Stack-Abgleich „Was dein Stack nicht abdeckt"** (`#amStack`, nur Enhanced):
  bildet die Substanz-**Kategorien**, die der Score unter `enh_categories`
  ohnehin erfasst, auf die Wege der Matrix ab. Freigeschaltet ausschließlich
  bei `check_result.status === "enhanced"` **und** mindestens einer echten
  Kategorie; `medical_trt`, `former_enhanced`, `uncertain` und
  „Möchte ich nicht angeben" schalten nie frei. Der Abschnitt ist im Markup
  `hidden` und wird nur im Enhanced-Fall gefüllt.

  **Die Richtung ist die Entscheidung:** Eine Ansicht, die je Präparat eine
  neue Spalte aufleuchten lässt, belohnt Eskalation. Diese zeigt zuerst die
  Konvergenz (mehrere Kategorien, dieselbe Achse), dann die Wege, die kein
  Präparat der Liste berührt, dann die Kontrollmarker. Beispiel Testosteron
  + weitere AAS + GH + Stimulanzien + GLP-1: **5 Kategorien → 2 anabole
  Achsen, 1 konvergent, 8 von 13 Wegen unberührt, 12 Marker zu
  kontrollieren.**

  **Kein Planer, testgesichert:** keine Dosis, keine Zykluslänge, kein
  Vergleich einzelner Verbindungen, kein Handelsname. Die Auflösung endet
  bei der Kategorie — dort, wo der Score sie erhebt. Mehr Kategorien dürfen
  die Zahl der unberührten Wege nie erhöhen und die Kontrollmarker nie
  senken; beides prüft der Test.

  **Der Schnitt Stack × Selbstcheck** (`kreuzeStack`, `#amStackKreuz`):
  Beide Ansichten sagen einzeln je die Hälfte — der Stack-Abgleich, was
  keine Substanz der Liste bedient; der Selbstcheck, was das Verhalten
  adressiert. Zusammengelegt beantworten sie die Frage, die ein
  Enhanced-Nutzer wirklich hat: *„Von diesen 8 Wegen adressiert dein
  Verhalten 3 vollständig und 5 teilweise. 1 ist noch offen."* Die Liste
  der unberührten Wege trägt dieselben Zustandsgruppen, dieselben Titel
  und dieselben Farben wie der Selbstcheck — derselbe Zustand desselben
  Weges darf nicht zweimal anders heißen.

  **Geschnitten, nicht neu bewertet:** `kreuzeStack` legt zwei vorhandene
  Mengen übereinander. Die Zustände kommen unverändert aus `bewerteWeg`,
  die unberührten Wege unverändert aus `bewerteStack`; der Test prüft für
  vier Antwortlagen, dass kein Zustand vom Selbstcheck abweicht. „Offen"
  bleibt eigenständig — ohne Antworten steht dort keine Einschätzung,
  sondern der Verweis auf den Selbstcheck. Bei unvollständigem Check steht
  der Teilstand dabei. **Kein zweiter nächster Hebel:** Den benennt der
  Selbstcheck genau einmal für alle dreizehn Wege; der Schnitt verweist
  darauf, statt eine konkurrierende Empfehlung aufzumachen. Die
  Freischaltung bleibt an genau einer Stelle (`renderStack`) — der Schnitt
  liest sie, entscheidet sie nicht neu. Alles testgesichert.

- **Einstiege:** Karte in `blog.html`, Kontextlink in
  `blog/testosteron-natuerlich-steigern.html`, Eintrag in `sitemap.xml`,
  kontextabhängige Karte auf der Score-Ergebnisseite (`js/matrix-cta.js`).

  **Enhanced hat Vorrang, aus einem anderen Grund.** Die Karte wählt ihren
  Anlass sonst aus dem primären Engpass und den gerankten
  `secondaryPriorities`. Für Enhanced-Nutzer geht das an der Sache vorbei:
  Ihr Engpass lautet häufig `movement` — bewusst keinem Kontext zugeordnet —
  und die Sekundärbereiche fielen durch die Schwäche-Bedingung. Genau die
  Gruppe, für die die Seite am meisten hergibt, bekam damit keinen Übergang.
  Deshalb steht `enhanced` als erste Regel vor der Engpass-Zuordnung: Der
  Anlass ist nicht eine Schwäche im Score, sondern die Reichweite der
  Substanzen selbst — und die gilt auch dann, wenn alle Bereiche gut stehen.
  Die Copy nennt bewusst **keine** Wege-Zahl: Wie viele Wege ein Stack
  bedient, hängt an den Kategorien; die rechnet erst die Matrixseite aus.
  `medical_trt` und Enhanced ohne Kategorie fallen weiter auf die normale
  Regel zurück.

## Blog (`blog.html`) — 11 Artikel
Tirzepatid-Kosten · TRT-Telemedizin · Testosteron natürlich · Blutwerte ab 30 ·
Abnehmen ohne Hunger · Schlaf & Testosteron · Ozempic/Wegovy/Mounjaro ·
GLP-1 absetzen · Kreatin-Mythen · Erektionsprobleme · HRV verstehen.

## Knowledge Graph (`js/os/intelligence/knowledge.js`)
18 Objekte, **7 verifizierte Landmark-Quellen** (DOI+URL), Publikations-Gate:
2 PUBLISHED · 16 REVIEWED. Quellen: Morton 2018, Kreider 2017, ESC/EAS 2019,
STEP-1 2021, Bhasin 2018, Schoenfeld 2017, Watson 2015.

## Befunde & Maßnahmen

1. **Evidenz-Inkonsistenz behoben (Content P1):** 7 Flaggschiff-Ebooks trugen
   Evidenz nur in Prosa („laut Studienlage"), ohne formale Zitate. `testosteron`
   hatte gar keine Quellen-Sektion, obwohl Bhasin 2018 verifiziert vorlag. → Eine
   konsistente, verifizierte **„Quellen & Evidenz"-Sektion** wurde eingefügt —
   nur mit den 7 web-verifizierten Quellen und **nur dort, wo die Kernaussage im
   Ebook wirklich vorkommt** (per grep geprüft). Verlinkt auf `trust.html`
   (Evidenz-Standard). Keine erfundenen Zitate.
2. **noindex-Situation:** Die noindex-Alt-Versionen sind bewusst (Duplicate-Content-
   Schutz). Kein blindes Ent-noindexen. Die kanonische (neuere) Fassung ist jeweils
   indexiert.
3. **Nächste Content-Schritte (nicht in dieser Runde):** die 16 REVIEWED-Knowledge-
   Objekte auf PUBLISHED heben (je 1–2 verifizierte Quellen); Blog-Artikel an die
   Evidenz-Sektionen rückverlinken; Alt-Version-Konsolidierung mit Canonical-Tags.

## Marken-Prinzip (§0) — im Content gehalten
Direkt, nicht leichtsinnig · wissenschaftlich, nicht steril · Praxis, nicht
Bro-Science · Warnungen nur, wo sie material zählen (GLP-1/Enhanced tragen die
klaren Hinweise; der Rest wird nicht mit Disclaimern zugepflastert).
