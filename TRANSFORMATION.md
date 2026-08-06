# TRANSFORMATION — Flaggschiff: KI-Körperzielvisualisierung + Umsetzungssystem

Stand: 06.08.2026 (Neuausrichtung, Funnel v8) · Seite: `transformation.html` ·
Logik: `js/transformation.js` · Zielengine: `supabase/functions/_shared/transform-goals.mjs`
· Server: `supabase/functions/mm-transform/index.ts`

## Produktrolle

Die Transformation ist der zentrale Hook und Akquisitionshebel von
MaleMetrix — kein Zusatzwerkzeug. Kernversprechen: **Sieh deinen möglichen
Körper. Wähle dein realistisches Ziel. MaleMetrix baut den Weg dorthin.**
Die Startseite (`index.html`) verkauft die Transformation im Hero; der
Score bleibt der sekundäre Einstieg und kalibriert später den Plan.

## Funnel (v8) — minimale Reibung vor dem Wow-Moment

    01 Foto + Pflicht-Einwilligung (4 Checkboxen, keine vorausgewählt)
    02 Ausgangslage: Gewicht, Größe, Taille, grobe Körperform, Richtung
    03 ZWEI berechnete Ziele (vor jedem Konto-Gate sichtbar)
       · Ziel A — realistischer nächster Zustand (~12-16 Wochen)
       · Ziel B — ambitioniertes langfristiges Ziel (mehrphasig)
       · „Eigenes Ziel prüfen" nur sekundär, live validiert
    04 Konto-Gate ERST unmittelbar vor der Generierung (Magic Link,
       Premium-Copy: Zuordnung zum Profil — keine Kosten-Rechtfertigung)
       → beide Zielbilder mit KI-Kennzeichnung + Vorher/Nachher-Regler
    05 EIN Ziel wählen (mm_transform_goal wird System-Zustand)
    06 Erst jetzt Planfragen: Zeitraum, Erfahrung, Trainingstage,
       Equipment, Ernährungsstil, Natural/Enhanced, Alter + Aktivität —
       jede Frage verändert den Plan nachweislich; Alter/Größe sind
       Pflicht OHNE stille Fallbacks
    07 Begrenzte Planvorschau + personalisierter Kauf-CTA

Tiefe Planfragen vor den Bildern gibt es nicht mehr. Bewusst NICHT
abgefragt werden Verletzungen/Einschränkungen: nichts in der kostenlosen
Vorschau würde sich dadurch ändern — das gehört in das Protokoll-/
Coaching-Intake, eine Deko-Frage wäre gelogen.

## Zielengine (`transform-goals.mjs` — EINE Quelle der Wahrheit)

Läuft identisch in der Edge Function (Server-Validierung + Prompts), im
Browser (ES-Modul via `transformation.html`) und in den Node-Tests.

- **Schätzung:** Körperfett als BEREICH (lo-hi) aus WHtR (Taille/Größe)
  gemittelt mit der Körperform-Selbsteinschätzung (5 Stufen: deutlich
  übergewichtig / kräftig / durchschnittlich / athletisch / definiert).
  Nie als Messung kommuniziert.
- **Vorschläge:** `proposeGoals()` — A: ~5 Körperfettpunkte runter,
  mindestens sichtbar relevant (≥3 kg / 4 %), nie unter BMI-20-Nähe.
  B: Richtung 12-14 % Körperfett, hart begrenzt durch BMI 20 und max.
  25 % Gesamtabnahme, als mehrphasig markiert. Aufbau: A ~+3,5 %,
  B ~+8 % (BMI-Deckel 28) — konservativ, da die Erfahrungsfrage erst
  nach der Zielwahl kommt. Schlanke Ausgangslage (BMI < 20,5 oder
  KFA ≤ 14) → KEINE Abnahmevorschläge, stattdessen Rekomposition +
  moderater Aufbau mit erklärendem Hinweis.
- **Einordnung statt Blockade (Produktentscheidung des Betreibers,
  06.08.2026 — Override der ursprünglichen Hard-Block-Vorgabe):**
  `validateTarget` liefert weiterhin vier Verdikte (plausibel ≤10 %
  Abnahme / ≤5 % Aufbau · ambitioniert ≤25 % / ≤10 % · nicht_serioes ·
  blockiert bei BMI < 20, > 35 % Abnahme, Ziel-KFA < 8 %, Aufbau > 15 %
  oder BMI > 32) — aber sie SPERREN NICHTS mehr. Die UI zeigt Badge +
  ehrliche Einordnung + dynamische Alternative (altLo-altHi), der Nutzer
  entscheidet und kann JEDES Zielgewicht generieren. Einzige harte
  Grenzen: 40-300 kg, Ziel ≠ Ist (Client + Server identisch).
- Die Verdikte formen weiter die VORSCHLÄGE (A/B bleiben realistisch
  gerechnet, nie unter BMI-20-Nähe) und die ehrliche Kommunikation —
  Beispiel: 70 kg/175 cm, Wunsch 50 kg → Badge „EINORDNUNG: NICHT
  SERIÖS … plausibel wären ~61-63 kg. Die Entscheidung liegt bei dir." 

## Bild-Prompts (dramatisch UND körperfettgestuft)

Produktentscheidung 06.08.2026 nach zwei Live-Testläufen des Betreibers:
Die erste realistische Prompt-Fassung war zu subtil („Unterschied nicht
groß genug"). Jeder Prompt beginnt jetzt mit einer EMPHASIS-Anweisung
(„immediately OBVIOUS and dramatic … never subtle") — der Unterschied
muss auf den ersten Blick unübersehbar sein. Die Stufung nach
geschätztem ZIEL-Körperfett bleibt: ≥30 % „dramatisch schlanker, aber
noch kein Sixpack" · 22-30 % „dramatisch schlanker, erste Ab-Umrisse" ·
17-22 % „beeindruckend athletisch, sichtbare Ab-Umrisse" · 12-17 %
„klar sichtbares Sixpack, V-Taille" (+ „Definition steigt mit dem
Verlust"-Anweisung) · <12 % „extrem lean, tiefe Separation, sichtbare
Venen". Aufbau: sichtbar kräftigere/deutlich muskulösere Statur.
`IDENTITY_FRAGMENT` bleibt strikt: gleiche Person, Gesicht ohne
Verschönerung, Frisur, Hautfarbe, Tattoos, Pose, Perspektive,
Hintergrund, Beleuchtung, Kleidung. Rekompositions-Ziele werden als
kleine Abnahme (~3 %) visualisiert und ehrlich beschriftet.

## Datenfluss & Datenschutz (P0)

- **Ehrliche Kommunikation:** Die Seite sagt VOR dem Upload, dass das
  Foto über unseren Server an fal.ai (USA) übertragen wird — keine
  „bleibt auf deinem Gerät"-Behauptungen. Datenschutzerklärung Abschnitt
  „5. Transformation (KI-Körpervisualisierung)", Stand August 2026.
- **Einwilligung:** 4 nicht vorausgewählte Checkboxen (18+, eigenes
  Foto, Nutzungsrecht, Verarbeitung). Client blockiert ohne sie, Server
  erzwingt `consent:true` (`consent_required`, 400). Merkmal nur im
  Sitzungszustand, nicht persistiert.
- **Datensparsamkeit bei fal.ai (Code-Fakt):** `x-fal-store-io: 0`
  (keine Payload-Speicherung; Standard wären 30 Tage) und
  `x-fal-object-lifecycle-preference: {"expiration_duration_seconds":3600}`
  (CDN-Bilder verfallen nach 1 h statt ≥7 Tagen) — gemäß fal-Doku
  „Data Retention"/„Media Expiration". **Offener Punkt:** die
  tatsächliche Löschung liegt beim Anbieter und ist von uns nicht
  messbar; so dokumentiert, nicht behauptet.
- **Bei MaleMetrix gespeichert:** `mm_transform_v2` (Ausgangslage,
  Ziele, Planantworten) und `mm_transform_goal` (gewähltes Ziel) im
  localStorage; `ai_request_log` serverseitig nur task/model/ok/ip_hash.
  NIE gespeichert: Foto, Bild-URLs, Einwilligungsdetails.
- **KI-Kennzeichnung:** „KI-VISUALISIERUNG · KEIN ECHTES ZUKUNFTSFOTO"
  als DOM-Badge auf jedem Ergebnis, ins Pixelmaterial gerendert (auch
  Downloads) und auf der Share-Card („Mögliche Zielvisualisierung",
  Tags VORHER / MÖGLICHES ZIEL). Englische Fassungen fest verdrahtet.

## Kontingent & Missbrauchsschutz (deployt: Plattform-Version 9, 06.08.2026)

- **Modell:** Erstlauf = 2 Gratis-Zielbilder + begrenzte
  Einzel-Regenerationen — insgesamt `FREE_LIFETIME_IMAGES = 4`
  erfolgreiche Bilder pro Konto (Fehlschläge zählen nicht). Danach
  `free_quota_exhausted` → Produktzugang. Kunden (aktives Entitlement
  oder Owner-Rolle) sind vom Freikontingent ausgenommen. Antwort liefert
  `free_remaining` für den sichtbaren Zähler.
- **Atomare Prüfung:** Vor den Zählungen wird eine Reservierungszeile
  (`ok=null`) geschrieben; alle Limits zählen sie mit. Parallele
  Race-Anfragen sehen einander → im Grenzfall beide abgelehnt, nie
  überzogen. Erfolg löst ein (`ok=true`), jeder Fehlerpfad gibt frei
  (`ok=false`).
- **Weitere Schichten:** 12 Bilder/h/Nutzer · 24/h/IP über alle Konten
  (SHA-256-`ip_hash` mit Server-Schlüssel, nie die rohe IP; Migration
  `20260805000016`) · globaler Tages-Deckel 400 Bilder (~16 €
  Worst-Case). Serverseitig gelten dieselben technischen
  Zielgrenzen wie im Client (40-300 kg, Ziel ≠ Ist).
- **Client:** „Erneut visualisieren" erzeugt nie automatisch beide
  Bilder neu — Regeneration pro Ziel (↻), Fehler-Retry pro Panel,
  danach „Anderes Foto verwenden" / „Ziele neu berechnen".
  inFlight-Guard gegen parallele Doppel-Requests.

## Kostenlos vs. DAS PROTOKOLL (Phase 5)

**Kostenlos sichtbar:** gewähltes Ziel, Ausgangs-/Zielgewicht,
Machbarkeitsurteil (inkl. „Kleines Ziel — Phasen statt Dauerdefizit"),
Zielkalorien, Protein, Trainingsfrequenz, Schrittziel, Abnahme-/
Aufbaurate, ehrliche Wochen, die drei wichtigsten ersten Maßnahmen,
Woche-1-Skizze, Enhanced-Sicherheitszeile (Blutbild/Monitoring —
Sicherheit wird nicht paywalled), Score-Engpass-Kalibrierung falls
vorhanden.

**Nur in DAS PROTOKOLL / My MaleMetrix** (sichtbar als `.trf-locked`
markiert): kompletter Trainingssplit mit Übungen/Sätzen/Wiederholungen,
vollständige Mahlzeitenstruktur, Progressionsregeln + Wochenplanung,
Supplementplan mit Dosierung/Timing, mehrmonatige Anpassungs-/Plateau-
Logik, Tracker + Wochenreviews.

**Personalisierter CTA:** „Dein Ziel: X kg in ~W Wochen" mit
Phase-1-Logik — dauert das Ziel länger als 12 Wochen, rechnet die Seite
ein ehrliches Zwischenziel („Phase 1 bringt dich auf Y-Z kg"). Primär:
„Meinen 12-Wochen-Plan freischalten" (Preis aus `MM_PRODUCTS`,
shop-data als Quelle der Wahrheit). Sekundär: Protokoll-Link, Circle
(Preis aus `MM_CONFIG`), Coaching. Sticky-Leiste mit Phase-1-Ziel,
wegklickbar, nie für Kunden.

**Protokoll-Besitzer:** kein Verkauf — „Ziel in My MaleMetrix
übernehmen" mit sichtbarer Bestätigung; die Roadmap
(`mein-protokoll.html#transform`, `js/os/app.js` vTransform) liest
`mm_transform_goal` und füllt Zielgewicht/Ausgangsgewicht/Zeitraum
sichtbar vor. Bilddaten werden nie übernommen.

## Planengine (Phase 7)

Mifflin-St-Jeor mit PFLICHT-Größe (Ausgangslage) und PFLICHT-Alter
(Planfragen) — keine stillen 180-cm-/35-Jahre-Fallbacks, ohne Angaben
keine Berechnung. Keine Zwangs-Minimums mehr (früher 0,25 kg/Woche +
300 kcal): sehr kleine Ziele bekommen eine kurze moderate aktive Phase
plus ausgewiesene Erhaltungs-/Stabilisierungswochen. Enhanced ohne
Pauschalgarantien (keine „+20-30 % Volumen"-Aussage) — dafür
Monitoring-Pflichtzeile; Substanz-/Dosierungsempfehlungen gibt es
weiterhin bewusst nicht (Einordnung: Anabole Matrix).

## Analytics-Funnel (anonym, feste Event-Namen, keine sensiblen Werte)

`home_transform_cta` (Startseite) · `transform_view` ·
`transform_upload_start` · `transform_upload_success` ·
`transform_consent_confirmed` · `transform_targets_computed` ·
`transform_custom_target_open` · `transform_custom_target_changed` ·
`transform_target_blocked` · `transform_account_gate_view` ·
`transform_magic_link_requested` · `transform_generate_start` ·
`transform_image_a_ok` / `transform_image_b_ok` ·
`transform_generate_failed` · `transform_regen_single` ·
`transform_quota_wall` / `transform_quota_cta` ·
`transform_goal_selected` · `transform_plan_questions_start` ·
`transform_plan_preview_view` · `transform_cta_unlock` ·
`transform_offer_protokoll` / `_circle` / `_coaching` ·
`transform_sticky_cta` · `transform_cta_mymm` ·
`transform_goal_adopted` · `transform_share` ·
`score_to_transform_click` (Score-Ergebnisseite).
Übertragen wird NIE: Foto, Bild-URL, Gewicht, Größe, Taille,
Körperform, Zielgewicht, Gesundheitsangaben, E-Mail.

## Fehlercodes (Function → UI-Klartext)

`auth_missing/auth_invalid_token` 401 · `consent_required` 400 ·
`invalid_current_kg/invalid_height/invalid_image` 400 ·
`invalid_target_kg` 400 ·
`free_quota_exhausted` 403 · `rate_limited` 429 (Nutzer ODER IP) ·
`daily_capacity` 503 · `payload_too_large` 413 ·
`provider_not_configured` 503 · `provider_balance` 503 ·
`content_rejected` 422 · `provider_auth_failed`/`provider_error` 502.

## Tests & Verifikation

- `tools-dev/tests/transform-goals.test.js` (18 Tests): Abnahmekriterien
  1-11 + 13, Prompt-Plausibilität, Server-Invarianten (Engine-Import,
  Consent, Datenschutz-Header, Reservierungsmuster), Planengine-
  Invarianten. Gesamtsuite über `node --test tools-dev/tests/*.test.js`.
- Browser-verifiziert (Playwright/Chromium): Funnel-Aufbau, Zielkarten
  nach Ausgangslage (95 kg/180/104/kräftig → A 89 kg, B 78 kg), 49-kg-
  Blockade mit Alternative, gesperrter Generieren-Button, begrenzte
  Planvorschau ohne Vollplan-Leck, Phase-1-Zwischenziel (98→82 kg ⇒
  „90-92 kg nach 12 Wochen"), Responsive 320/360/390/768/1440 ohne
  Überlauf, Tastatur-Upload (Tab+Enter → Dateidialog).
- Live-Messung: `bash tools-dev/check-functions.sh` (mm-transform in der
  Messliste); Deploy-Stand siehe EDGE_FUNCTIONS.md.

## Offene Punkte / externe Prüfungen

1. **fal.ai-Löschung:** Header-Versand ist implementiert; die
   tatsächliche Lösch-Ausführung liegt beim Anbieter (extern nicht
   messbar). Bei Gelegenheit im fal-Dashboard stichprobenartig prüfen.
2. **Rechtliche Bewertung** von Einwilligungstexten und
   Datenschutzerklärung (Art. 9 DSGVO, Drittlandübermittlung) ist
   fachjuristisch nicht geprüft — die technischen Aussagen entsprechen
   dem Code, mehr wird nicht behauptet.
3. **Bildqualität der neuen Prompts** (Ziel-KFA-Stufen) ist mit echten
   Generierungen zu kalibrieren, sobald Traffic da ist — die alte
   Live-Erkenntnis „Definition skaliert mit dem Defizit" ist jetzt über
   die KFA-Stufen abgebildet, nicht mehr über Prozent-Heuristik.
4. **Frontend-/Server-Kopplung:** Function v10 verlangt consent +
   height_cm — der neue Client sendet beides. Bis Branch-Merge + Pages-
   Deploy antwortet die Live-Seite (alter Client) mit
   `consent_required`; Generierung ist so lange effektiv gesperrt
   (Credits geschützt). Nach dem Merge ist der Zustand konsistent.
