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
