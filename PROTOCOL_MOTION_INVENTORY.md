# PROTOCOL_MOTION_INVENTORY — bestehende visuelle Assets (Stand: Motion V1 Start)

Bestandsaufnahme VOR jeder neuen Generierung. Grundlage für die Motion Map und
die Signature-Shortlist. Keine neuen Assets in diesem Dokument — nur, was heute
existiert.

## 1 · Bewegtbild (Video) — was es JETZT gibt

| Asset | Pfad | Format | Kapitel/Platz | Status |
|---|---|---|---|---|
| **ApoB · arterielle Einlagerung** | `assets/protocol/motion/apob-arterial-retention.mp4` (~1,70 MB) + `.jpg` Poster (1280×720) | MP4 H.264, 720p, muted loop | **Kapitel 04** · Herz-Kreislauf-Abschnitt (`#s3`) | LIVE · **KEEP** |

Das ist das **einzige** bestehende Bewegtbild im gesamten Werk. Es ist der
**Referenz-Standard** (Look, Tempo, Poster-Disziplin, MM/MECHANISM-Rahmung) und
wird **nicht** neu generiert, nicht ersetzt, nicht überschrieben.

**Technischer Referenz-Rahmen (aus ApoB abgeleitet):**
- Auflösung: **720p** (Poster 1280×720).
- Codec: H.264/MP4, still/loop-fähig, **muted**, **loop**, **playsinline**, **preload="none"**.
- Dateigröße-Zielkorridor pro Clip: **~1–3 MB** (ApoB ≈ 1,7 MB).
- Poster: JPG, gleicher Basename, funktioniert vollständig **ohne** Playback.
- Component: `figure.bp-mech` (MM / MECHANISM) + Inline-IntersectionObserver-JS
  (Viewport-Autoplay, `prefers-reduced-motion` respektiert). Styles in `css/blueprint.css`.

## 2 · MM/MECHANISM-Component (Motion-Träger)

- Definiert in `css/blueprint.css`: `.bp-mech`, `.bp-mech-head`, `.bp-mech-stage video`, `.bp-mech-cap`.
- Aktuell verbaut in: **`ebooks/blutwerte-guide.html`** (Kapitel 04) — genau eine Instanz (ApoB).
- Inline-JS-Pattern (Viewport-Autoplay + reduced-motion) ist bewährt und wird für
  jeden neuen Clip 1:1 wiederverwendet.

## 3 · Statische Visuals pro Kapitel (raster + SVG)

Zählung `<img>/<figure>/<svg>` je Kapitel-Datei (Design-Freeze: bestehende
Visuals bleiben; Motion ergänzt oder ersetzt gezielt einzelne Stills, wo Bewegung
den Mechanismus klarer macht):

| Kapitel | Datei | img/figure/svg | Charakter |
|---|---|---|---|
| 01 DAS FUNDAMENT | blueprint.html | 2 | schlank (nach P18-Merge); nur Cover + Icon |
| 02 JEDEN TAG TRAINIEREN | taeglich-trainieren.html | 22 | 11 konzeptionelle Stills, keine Mechanismus-Animation |
| 03 SCHLAF & REGENERATION | schlaf-energie.html | 22 | 11 Stills + **1 echtes SVG-Diagramm** (Cortisol/Melatonin 24 h) |
| 04 BLUTWERTE, RISIKO & LONGEVITY | blutwerte-guide.html | 26 | reich bebildert + **ApoB-Motion** + SVG-Dashboard |
| 05 HORMONE & TESTOSTERON | testosteron.html | 24 | reich, statisch |
| 06 GLP-1 & METABOLIC MEDICINE | glp1-agonisten.html | 20 | reich, statisch |
| 07 DER ULTIMATIVE STACK | ultimate-stack.html | (vault) | **verschlüsselt** — Struktur nicht im Klartext |
| 08 SUPPLEMENTE MIT EVIDENZ | supplements.html | 23 | reich, statisch |
| 09 SEXUELLE GESUNDHEIT | sexuelle-gesundheit.html | 24 | reich, statisch |
| 10 INJEKTIONEN | 11-injektionen.html | 1 | **visuell arm** — starker Motion-Bedarf (Zielgewebe) |
| ABSCHLUSS | gewohnheiten.html | 2 | schlank |

**Beobachtungen für die Map:**
- **Kapitel 10 (Injektionen)** ist mit nur 1 Visual am visuell ärmsten — und ist
  ein Money-Chapter mit einem starken, sicheren Signature-Motiv (Zielgewebe-Schnitt).
- **Kapitel 03** besitzt bereits das einzige echte Mechanismus-SVG (circadianer
  Fahrplan) — ideal für eine animierte Aufwertung statt Neuerfindung.
- Alle anderen Kapitel haben viele **statische Konzept-Stills**, aber (außer
  ApoB) **kein einziges** Asset, das einen Mechanismus tatsächlich in Bewegung zeigt.
- **Kapitel 07** ist vault-verschlüsselt: Motion darf nur auf sicher zugänglicher/
  finaler Struktur beruhen, **keine erfundenen Tier-Namen**.

## 4 · Runway / Generierungs-Assets

- **Bestehende Runway-Generationen im Repo: keine** außer dem ApoB-Clip (dessen
  Poster ein freigegebenes Keyvisual ist; der Clip selbst ist die einzige Generation).
- Kein `final-final2`-Wildwuchs, keine verwaisten Varianten im Motion-Ordner.

## 5 · Konsequenz für Motion V1

- **Genau ein** bestehendes Signature-Asset (ApoB) → Serie muss dazu passen.
- Money-Chapters (02/04/05/06/07/09/10) tragen die höchste Motion-Priorität.
- Neue Assets werden **einzeln** produziert, **sofort** an ihrer echten Stelle
  integriert und gegen den ApoB-Referenzstandard geprüft (Style-Consistency-Gate).
