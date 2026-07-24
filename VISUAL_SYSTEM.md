# MALEMETRIX VISUAL SYSTEM

Art direction: **PERFORMANCE LUXURY × MEDICAL FUTURISM × EDITORIAL.**
Dark-only. Not "premium dark SaaS" — a measured world of human performance.

## Signature motifs (implemented in code)
1. **PERFORMANCE COORDINATE SYSTEM** — reference lines, calibration ticks,
   measurement points. Hero: `.mm-coord` (BODY·ENGINE·RECOVERY·HORMONES·
   EXECUTION axis). App shell: vertical measurement axis + 80px horizontal
   calibration lines (`.os-shell::before`).
2. **Numbered process steps** (`.os-steps`), roadmap timeline (`.os-roadmap`),
   monospace measurement typography for data.
3. Editorial components: REALITY CHECK (`.os-reality`), WHAT NOBODY TELLS YOU
   (`.os-nobody`), Start→Now comparison (`.os-cmp`), evidence badges (`.ev-*`).

## Page environments
| Page | World |
|---|---|
| Home | sculptural darkness, typographic drama ("Build the body. Protect the system."), coordinate axis |
| Score | diagnostic, scanning geometry |
| My MaleMetrix | quiet instrument panel — measurement axis, low ambient |
| Enhanced (Learn) | clinical, controlled, amber-flagged trade-offs — never "steroid bro" |
| Progress | time, comparison, photo pairs |

## Media rules
Black/charcoal, controlled cyan/blue, realistic materials (carbon/titanium),
no neon spam, no stock gym bros, no text inside AI images, posters + reduced-
motion fallbacks for any video, AVIF/WebP, lazy-load.

## AI generation prompts (external tools — ChatGPT Image / Higgsfield / Canva)
See `visual-manifest.json` for per-asset entries. Base style suffix for all:
"ultra-premium dark health-tech, near-black background #07090d, controlled
electric blue (#2e7cf6) and cyan (#00c2ff) accent light, cinematic rim light,
realistic materials, medical-documentary precision, no text, no logos,
16:9 (mobile crop 4:5 safe center)".

Status: all external raster/video assets are **REQUIRES EXTERNAL GENERATION** —
the in-code world (SVG/CSS/typography) ships now; imagery upgrades it later.

---

# VISUAL SYSTEM 2.0 — Addendum (Phase 12)

Zielästhetik: 40 % Automotive HMI · 25 % Medical Lab · 20 % Editorial
Science · 15 % Cinematic Biohacking. Zentrale Bausteine (css/style.css,
Block „VISUAL SYSTEM 2.0" — KEINE Seite erfindet eigene Varianten):

- **Status-Tokens (Farbe = Bedeutung):** `--status-active` (Cyan/Brand),
  `--status-improving` (Grün), `--status-attention` (Amber),
  `--status-flag` (Rot/Medical), `--status-neutral` (Grau).
- **Struktur statt Karten:** `--hairline`/`--surface`, `.mm-plane`, `.mm-hr`,
  `.mm-secthead` (Mono-Systemheader „MM / SCORE").
- **Data as Design:** `.mm-metric` / `.mm-metric-row` — große Werte mit
  tabellarischen Ziffern als Layout-Hauptelement, Hairline-Trenner.
- **Diagnostische Systemsprache:** `.mm-sys` (BODY/ENGINE/RECOVERY/METABOLIC/
  STRENGTH) mit genau EINER `is-primary`-Hervorhebung + `is-flag` (Medical).
- **Empty/Locked:** `.mm-empty`, `.mm-locked` — Premium-Ruhe statt Platzhalter.
- **Access-Moment:** `.mm-access` (ACCESS GRANTED → Produkte → ASSIGNED TO
  YOUR ACCOUNT), Unlock-Animation, reduced-motion-Guard.
- **Angewendet in P12:** Cockpit-Statuszeile (Instrumente statt Boxen, eigene
  Mobile-Hierarchie), Checkout-/Recovery-Erfolg (Access-Moment).

## Visual QA Matrix (STATIC — aus Markup/CSS bewertet, kein Browser-Run)

Skala 1–10 · Kriterien: Hierarchie / Markenkonsistenz / Premium / Dichte /
Mobile / CTA-Klarheit → Gesamturteil (ehrlich, konservativ).

| Seite | Hier. | Brand | Premium | Dichte | Mobile | CTA | Ø | Befund |
|---|---|---|---|---|---|---|---|---|
| Homepage | 8 | 9 | 8 | 8 | 8 | 8 | **8.2** | Flagship-Rollout P9.7 trägt; ok |
| Score (check) | 8 | 8 | 8 | 8 | 8 | 9 | **8.2** | ein Flow, eine CTA; ok |
| Score Result | 7 | 8 | 7 | **6** | 7 | 7 | **7.0** | ⚠ überladen — P2.2-Straffung (5 Blöcke) ist der offene Punkt aus Phase 11 |
| My MaleMetrix | 8 | 9 | 8 | 7 | 8 | 8 | **8.0** | Statuszeile jetzt Instrument-Sprache; Card-Dichte darunter weiter reduzierbar |
| 12-Week | 8 | 8 | 8 | 7 | 8 | 8 | **7.8** | ⚠ knapp — Wochenansicht könnte .mm-sys/.mm-metric adaptieren |
| Tracker | 7 | 7 | **6** | 7 | 8 | 8 | **7.2** | ⚠ ältester Look; Kandidat für Instrumenten-Refit |
| Labs | 8 | 8 | 8 | 8 | 7 | 8 | **7.8** | solide; Trend-Charts noch generisch (Chart-System offen) |
| Protocol (Ebook) | 9 | 9 | 9 | 8 | 8 | 8 | **8.5** | bp-*-Flagship — Referenzniveau |
| Checkout | 8 | 8 | 9 | 8 | 8 | 9 | **8.3** | Access-Moment neu; stark |
| Library (ebooks) | 7 | 8 | 7 | 7 | 8 | 7 | **7.3** | ⚠ Kachel-orientiert; Kontextualisierung (P10/Phase 11) offen |

**Unter 8 (Verbesserungs-Queue, priorisiert):** Score Result (7.0) →
Tracker (7.2) → Library (7.3) → 12-Week/Labs (7.8). Score Result zuerst —
deckt sich mit der Phase-11-Empfehlung (P2.2-Straffung).

**Ehrliche Grenze:** Bewertung ist STATIC (Markup/CSS-Analyse). Ein echter
Mobile-Browser-Pass (iPhone Safari) steht aus und kann Einzelwerte ±1 bewegen.
