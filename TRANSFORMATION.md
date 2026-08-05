# TRANSFORMATION — Körper-Visualisierung + Zielpläne

Stand: 05.08.2026 · Seite: `transformation.html` · Logik: `js/transformation.js`
· Server: `supabase/functions/mm-transform/index.ts`

## Was das Feature tut

1. Der Nutzer lädt ein Foto von sich hoch — oberkörperfrei ist ideal
   (frontal, gut beleuchtet, Shorts/Unterwäsche): Je mehr Körper sichtbar,
   desto realistischer die Transformation.
2. Er gibt sein aktuelles Gewicht und ZWEI Zielgewichte an (Vorschlag: −20 %
   und −30 %, also 100 kg → 80 kg und 70 kg — frei änderbar, auch Aufbau).
3. Die Edge Function `mm-transform` lässt das Bild-Editing-Modell
   (`fal-ai/nano-banana/edit`) je Ziel eine fotorealistische Vorschau
   generieren: dieselbe Person, gleiche Pose/Kleidung/Hintergrund, veränderte
   Körperkomposition.
4. Der Nutzer wählt EIN Ziel — dafür rendert die Seite **deterministisch**
   (Mifflin-St-Jeor + feste Regeln, KEINE KI-Zahlen, §9):
   Ernährungsplan (kcal/Makros/Beispieltag), Trainingsplan (Cut: 3×
   Ganzkörper + Cardio + Schritte · Aufbau: 4er OK/UK), Supplementplan
   (Whey, Kreatin, D3 nach Blutwert, Omega-3, Magnesium — bewusst ohne
   Fatburner-Märchen) und einen ehrlichen Zeitrahmen in Wochen.

## Datenfluss & Datenschutz (bewusste Entscheidungen)

- Das Foto wird **nirgends gespeichert**: nicht im localStorage, nicht in
  Supabase. Es geht als Data-URI (clientseitig auf 1280 px JPEG verkleinert)
  durch die Edge Function an fal.ai und existiert bei uns nur im Speicher der
  Anfrage. In `ai_request_log` landen nur `task/model/ok`.
- Generierte Bilder liegen auf dem fal.ai-CDN (deren Aufbewahrung); die Seite
  persistiert nur Gewichte/Ziel/Rahmendaten (`mm_transform_v1`), nie Bild-URLs.
- Der Prompt wird **serverseitig aus validierten Zahlen** gebaut — der Client
  liefert keinen Freitext ans Bildmodell (keine Prompt-Injection-Fläche).
- **Nacktfotos:** Oberkörperfrei ist ausdrücklich erwünscht (bestes
  Ergebnis). Nur KOMPLETT nackte Fotos (ganz ohne Unterwäsche) lehnt das
  Bildmodell ab (Antwort 422 → `content_rejected`, als Klartext im UI) —
  die Seite sagt das VOR dem Upload, nicht erst als Fehlermeldung.

## Schutz & Kosten

- Auth im Handler (P0.6-Standard), CORS-Allowlist (P0.7),
  `verify_jwt = false` in `config.toml` (macht nichts öffentlich).
- Rate-Limit: **12 Bilder/Stunde/Nutzer** (= 6 komplette Läufe à 2 Ziele),
  gezählt über `ai_request_log` mit task `BODY_TRANSFORM` — getrennt vom
  mm-ai-Kontingent. Grund: ~4 Cent pro Bild (nano-banana/edit), ein
  ungebremster Nutzer wäre ein echtes Kostenrisiko.
- Payload-Grenzen: 8 MB Body, Gewichte 40-300 kg, max. 60 % Differenz
  (mehr ergibt kein glaubwürdiges Bild und verbrennt nur Geld).

## Aktivieren (CONFIG REQUIRED — nur noch das Secret)

Die Function ist **deployt und live nachgemessen** (05.08.2026: OPTIONS→204
mit P10-Allowlist, POST ohne Auth→401 `auth_missing`). Es fehlt genau EIN
Schritt:

```bash
# Secret setzen (Key aus dem fal.ai-Dashboard, Format "key_id:key_secret") —
# im Supabase-Dashboard unter Edge Functions → Secrets, oder per CLI:
supabase secrets set FAL_KEY=...

# Danach live nachmessen statt glauben:
bash tools-dev/check-functions.sh    # mm-transform ist in der Messliste
```

**Zweite Voraussetzung — Guthaben bei fal.ai:** Live gemessen am 05.08.2026:
Der vorhandene Key authentifiziert korrekt, aber das fal.ai-Konto war
gesperrt („Exhausted balance“). Ohne Guthaben unter fal.ai → Dashboard →
Billing schlägt jede Generierung mit 403 fehl — unabhängig vom Secret.
Der Key selbst gehört NUR ins Supabase-Secret, nie ins Repo oder den Client.

Ohne Secret antwortet die Function ehrlich mit `provider_not_configured` —
die Seite zeigt dann „serverseitig noch nicht freigeschaltet“ an, es gibt
keinen stillen Fake-Modus.

## Fehlercodes (Function → UI-Klartext in js/transformation.js)

`auth_missing/auth_invalid_token` 401 · `rate_limited` 429 ·
`invalid_current_kg/invalid_target_kg/invalid_target_range/invalid_image` 400 ·
`payload_too_large` 413 · `provider_not_configured` 503 ·
`content_rejected` 422 · `provider_auth_failed`/`provider_error` 502.
