# TRANSFORMATION — Körper-Visualisierung + Zielpläne

Stand: 05.08.2026 · Seite: `transformation.html` · Logik: `js/transformation.js`
· Server: `supabase/functions/mm-transform/index.ts`

## Was das Feature tut

1. Der Nutzer lädt ein Foto von sich hoch — oberkörperfrei ist ideal
   (frontal, gut beleuchtet, Shorts/Unterwäsche): Je mehr Körper sichtbar,
   desto realistischer die Transformation.
2. Er gibt sein aktuelles Gewicht und ZWEI Zielgewichte an (Chips: −10/−20/
   −30 %, also 100 kg → 80 kg und 70 kg — frei änderbar, auch Aufbau) und
   beantwortet den **Transformations-Fragebogen**. Jede Antwort verändert
   etwas, keine Deko-Fragen:
   · **Zeitraum** (3/6/12 Monate/offen) → Kalorien zielen auf den Zeitrahmen;
     die Seite urteilt ehrlich (machbar / knapp / NICHT seriös machbar — dann
     rechnet der Plan mit der schnellsten seriösen Rate und sagt das).
   · **Wunsch-Look** (definiert/athletisch/massiv) → fließt als validierter
     Enum in den Bild-Prompt ein.
   · **Trainingserfahrung** (<1 J / 1-4 J / 4+ J) → Progressionsschema und
     realistische Aufbaurate (0,35/0,25/0,15 kg/Woche natural).
   · **Trainingstage** (2-6) → eigener Split je Frequenz (GK 2× · GK A/B ·
     OK/UK · PPL+OK/UK · PPL×2).
   · **Natural/Enhanced** → Raten (Cut-Limit 0,75 %/1,0 % KG pro Woche),
     Volumenhinweis, Pflicht-Zeile Blutbild-Monitoring. BEWUSST keine
     Substanz-/Dosierungsempfehlungen — Einordnung liefert die Anabole Matrix.
   · **Equipment** (Gym/Zuhause) → Übungsauswahl (Langhantel vs. Kurzhantel).
3. Die Edge Function `mm-transform` lässt das Bild-Editing-Modell
   (`fal-ai/nano-banana/edit`) je Ziel eine fotorealistische Vorschau
   generieren: dieselbe Person, gleiche Pose/Kleidung/Hintergrund, veränderte
   Körperkomposition. Die Ergebnisse liegen als Vorher/Nachher-Regler über
   dem eigenen Foto.
4. Der Nutzer wählt EIN Ziel — dafür rendert die Seite **deterministisch**
   (Mifflin-St-Jeor + feste Regeln, KEINE KI-Zahlen, §9): Zeitrahmen-Urteil,
   Makro-Instrumente (kcal/Protein/Fett/Carbs/Rate/Wochen), Ernährungsplan,
   Trainingsplan nach Tagen+Equipment+Erfahrung, Supplementplan (Whey,
   Kreatin, D3 nach Blutwert, Omega-3, Magnesium — bewusst ohne
   Fatburner-Märchen; enhanced zusätzlich Monitoring-Pflichtzeile).

## Monetarisierung (aktiv)

- **Protokoll-Brücke:** Nach der Zielwahl rendert der Plan einen CTA-Block
  („Das ist die Landkarte. DAS PROTOKOLL ist das Fahrzeug.“) mit
  personalisierten Zahlen (Ziel-kg, ehrliche Wochen). Besitzt der Nutzer das
  Protokoll bereits (server-vergebenes Entitlement), wird stattdessen in die
  App geführt — kein Verkauf an Bestandskäufer.
- **Wasserzeichen + Teilen:** Generierte Bilder tragen ein dezentes
  MALEMETRIX-Wasserzeichen (Canvas, clientseitig). Der Teilen-Button baut ein
  Vorher/Nachher-Composite (1080×1350, Systemlook, malemetrix.com) und nutzt
  die Web-Share-API (Fallback: Download; Composite unmöglich → Link teilen).
- **Funnel-Messung** über die bestehende anonyme Telemetrie: `transform_run`,
  `transform_goal`, `transform_share`, `transform_cta_protokoll`,
  `transform_cta_mymm`.

## Datenfluss & Datenschutz (bewusste Entscheidungen)

- Das Foto wird **nirgends gespeichert**: nicht im localStorage, nicht in
  Supabase. Es geht als Data-URI (clientseitig auf 1280 px JPEG verkleinert)
  durch die Edge Function an fal.ai und existiert bei uns nur im Speicher der
  Anfrage. In `ai_request_log` landen nur `task/model/ok`.
- Generierte Bilder liegen auf dem fal.ai-CDN (deren Aufbewahrung); die Seite
  persistiert nur Gewichte/Ziel/Rahmendaten (`mm_transform_v1`), nie Bild-URLs.
- Der Prompt wird **serverseitig aus validierten Zahlen** gebaut — der Client
  liefert keinen Freitext ans Bildmodell (keine Prompt-Injection-Fläche).
  `look` ist Enum-validiert (lean/athletic/muscular, sonst athletic),
  `enhanced` strikt Boolean; beide mappen auf konstante Prompt-Fragmente.
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

## Aktivierung — Stand 05.08.2026: SCHARF

Beide Voraussetzungen sind erfüllt und live gemessen:

- **FAL_KEY:** liegt verschlüsselt im **Supabase-Vault** (Wert bewusst nicht
  im Repo). Die Function löst den Key auf: Function-Secret `FAL_KEY` (falls
  gesetzt, gewinnt) → sonst Vault über `public.mm_get_fal_key()` — SECURITY
  DEFINER, ausführbar NUR für service_role (Migration
  `20260805000015_mm_transform_vault_fal_key.sql`; verifiziert: service_role
  liest, anon → permission denied). Key-Rotation: neuen Wert per
  `vault.update_secret` setzen ODER Function-Secret `FAL_KEY` anlegen.
- **fal.ai-Guthaben:** Konto war am 05.08. gesperrt („Exhausted balance“),
  ist inzwischen aufgeladen — der Key authentifiziert und das Konto ist
  aktiv (Testaufruf antwortet mit normaler Validierung statt 403). Läuft
  das Guthaben wieder leer, antwortet die Function mit `provider_balance`
  und die Seite zeigt „Kontingent aufgebraucht“ statt eines falschen
  Schlüssel-Fehlers.

```bash
# Live nachmessen statt glauben:
bash tools-dev/check-functions.sh    # mm-transform ist in der Messliste
```

Ohne Secret antwortet die Function ehrlich mit `provider_not_configured` —
die Seite zeigt dann „serverseitig noch nicht freigeschaltet“ an, es gibt
keinen stillen Fake-Modus.

## Fehlercodes (Function → UI-Klartext in js/transformation.js)

`auth_missing/auth_invalid_token` 401 · `rate_limited` 429 ·
`invalid_current_kg/invalid_target_kg/invalid_target_range/invalid_image` 400 ·
`payload_too_large` 413 · `provider_not_configured` 503 ·
`provider_balance` 503 (fal-Guthaben leer) · `content_rejected` 422 ·
`provider_auth_failed`/`provider_error` 502.
