# TRANSFORMATION — Körper-Visualisierung + Zielpläne

Stand: 05.08.2026 · Seite: `transformation.html` · Logik: `js/transformation.js`
· Server: `supabase/functions/mm-transform/index.ts`

## Was das Feature tut

1. Der Nutzer lädt ein Foto von sich hoch — oberkörperfrei ist ideal
   (frontal, gut beleuchtet, Shorts/Unterwäsche): Je mehr Körper sichtbar,
   desto realistischer die Transformation.
2. Er wählt die **Richtung** (ABNEHMEN oder MUSKELAUFBAU — eigener Toggle,
   Stand 05.08. v6), dann aktuelles Gewicht und ZWEI Zielgewichte
   (Richtungs-Chips: −10/−20/−30 % beim Abnehmen, +5/+10/+15 % beim Aufbau —
   frei überschreibbar, aber beide Ziele müssen zur Richtung passen) und
   beantwortet den **Transformations-Fragebogen**. Jede Antwort verändert
   etwas, keine Deko-Fragen:
   · **Zeitraum** (3/6/12 Monate/offen) → Kalorien zielen auf den Zeitrahmen;
     die Seite urteilt ehrlich (machbar / knapp / NICHT seriös machbar — dann
     rechnet der Plan mit der schnellsten seriösen Rate und sagt das).
   · **Wunsch-Look** → fließt als validierter Enum in den Bild-Prompt ein.
     Richtungsabhängig: beim Abnehmen definiert/athletisch, beim Aufbau
     zusätzlich massiv — „massiv + abnehmen" war ein Widerspruch und ist
     seit v6 nicht mehr wählbar (Umschalten auf Abnehmen setzt einen
     gewählten Massiv-Look auf athletisch zurück).
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

## Funnel & Monetarisierung (Kundengewinnungs-Maschine, Stand v7)

Die Transformation ist KEIN freies Spielzeug, sondern der zentrale
Akquise-Funnel — und seit v7 fester System-Bestandteil:
**Konto → Bilder (der Haken) → Zielwahl → SCORE → maßgeschneidertes
Paket → Angebot.**

- **Paket-Gate statt Score-Gate (v7):** Die Bilder kommen ZUERST (auf
  4 Gratis-Bilder gedeckelt — der emotionale Haken darf nicht hinter einem
  Fragebogen verhungern). Nach der Zielwahl verlangt das PAKET den Score:
  `renderPlans()` zeigt ohne Score das Gate `.trf-scoregate` („Dein Score
  schnürt das Paket") mit CTA zu `check.html` (Events
  `transform_package_gate_view/_click`). Kommt der Score an — auch aus
  einem anderen Tab (mm:store/storage-Listener) — ersetzt das Paket sein
  Gate automatisch. Kunden (Entitlement) überspringen das Gate.
- **Ziel als System-Zustand:** Die Zielwahl schreibt `mm_transform_goal`
  (MM.store: Ziel-kg, Richtung, Zeitraum, Look, Erfahrung, Tage,
  natural/enhanced, Equipment). Die Score-Ergebnisseite (`js/check.js`)
  liest es und rendert direkt unter dem Score-Hero die Brücke „Dein Paket
  für X kg ist jetzt freigeschaltet" → `transformation.html#trfPlanSec`
  (Event `score_to_transform_click`). Die Schleife Bild → Score → Paket
  ist damit in beide Richtungen geschlossen.
- **Maßgeschneidertes Paket:** Mit Score rendert der Plan zusätzlich den
  Kalibrierungs-Block „DEIN SCORE X/100 — ENGPASS: …" (Name + Text des
  primären Engpasses aus dem Score-Ergebnis) über den Spalten. Enhanced
  bekommt eine EIGENE vierte Spalte „Enhanced — Stack-Rahmen & Monitoring"
  (Basis-Blutbild, 8-12-Wochen-Messplan, Wochen-Warnsignale). Haus-Regel
  unverändert: KEINE Substanz-/Dosierungsempfehlungen — die Einordnung
  liefert die Anabole Matrix.
- **Gratis-Kontingent:** Nicht-Kunden haben LIFETIME 4 erfolgreiche Bilder
  (= 2 komplette Läufe). Die Antwort liefert `free_remaining`, die Seite
  zeigt den Zähler unter dem Button (`.trf-quota`). Danach `free_quota_
  exhausted` → Panel zeigt direkt den Protokoll-CTA (`transform_quota_wall`,
  `transform_quota_cta`). Kunden generieren mit Stundenlimit weiter.
- **Angebots-Staffel nach der Zielwahl:** Statt eines einzelnen CTA rendert
  der Plan die dreistufige Staffel `.trf-offers` — DAS PROTOKOLL (99 €
  einmalig), MALEMETRIX CIRCLE (15 €/Monat), 1:1 COACHING (199 €/Monat,
  Erstgespräch kostenlos) — mit personalisierten Zahlen (Ziel-kg, ehrliche
  Wochen) und einer Empfehlung aus den eigenen Antworten (enhanced oder
  unrealistischer Zeitwunsch → Coaching, sonst Protokoll). Dazu eine
  Sticky-Leiste (`.trf-sticky`, wegklickbar, nie für Kunden). Bestandskunden
  sehen weiterhin den Weg in die App statt Verkauf.
- **Wasserzeichen + Teilen:** Generierte Bilder tragen ein dezentes
  MALEMETRIX-Wasserzeichen (Canvas, clientseitig). Der Teilen-Button baut ein
  Vorher/Nachher-Composite (1080×1350, Systemlook, malemetrix.com) und nutzt
  die Web-Share-API (Fallback: Download; Composite unmöglich → Link teilen).
- **Funnel-Messung** über die bestehende anonyme Telemetrie: `transform_run`,
  `transform_goal`, `transform_share`, `transform_package_gate_view`,
  `transform_package_gate_click`, `score_to_transform_click` (check.js),
  `transform_offers_view`, `transform_offer_protokoll`,
  `transform_offer_circle`, `transform_offer_coaching`,
  `transform_sticky_cta`, `transform_quota_wall`, `transform_quota_cta`,
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

## Schutz & Kosten (Schichten, Stand v7/Function v9)

- Auth im Handler (P0.6-Standard), CORS-Allowlist (P0.7),
  `verify_jwt = false` in `config.toml` (macht nichts öffentlich).
- Seit v9 bewusst KEINE Score-Pflicht mehr VOR der Generierung — der Score
  sitzt clientseitig vor dem Paket (Funnel-Abschnitt oben). Die
  Kostenbremse übernimmt vollständig das Freikontingent.
- **Schicht 1 — Stundenlimit pro Nutzer:** 12 Bilder/Stunde, gezählt über
  `ai_request_log` task `BODY_TRANSFORM` — getrennt vom mm-ai-Kontingent.
- **Schicht 2 — Lifetime-Freikontingent:** Nicht-Kunden max. 4 erfolgreiche
  Bilder insgesamt (`free_quota_exhausted`, 403). Fehlgeschlagene Bilder
  zählen nicht. „Kunde" = irgendein aktives Entitlement ODER die
  server-vergebene Owner-Rolle (user_roles). Gegenmittel gegen
  Wegwerf-Konten: das Konto ist gratis, aber pro Konto gibt es nur noch
  4 Bilder statt 288/Tag.
- **Schicht 3 — IP-Limit:** 24 Bilder/Stunde pro IP über ALLE Konten
  (Wegwerf-Konten teilen sich die Leitung). Die IP wird NIE roh gespeichert —
  nur SHA-256 mit serverseitigem Schlüssel (`ip_hash` in `ai_request_log`,
  Migration `20260805000016_mm_transform_abuse_guards.sql`).
- **Schicht 4 — Globaler Tages-Deckel:** 400 Bilder/24h über alle Nutzer
  (`daily_capacity`, 503). Kosten-Notbremse: schlimmster Tag ≈ 16 €.
- Bewusst KEINE Gesichtserkennung: unverhältnismäßig (biometrische Daten,
  Art. 9 DSGVO) und leicht umgehbar — die Schichten oben schützen die
  Credits wirksamer und ohne neue Datenschutz-Baustelle.
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

`auth_missing/auth_invalid_token` 401 ·
`free_quota_exhausted` 403 (Gratis-Kontingent aufgebraucht) ·
`rate_limited` 429 (Nutzer- ODER IP-Limit) · `daily_capacity` 503
(globaler Tages-Deckel) ·
`invalid_current_kg/invalid_target_kg/invalid_target_range/invalid_image` 400 ·
`payload_too_large` 413 · `provider_not_configured` 503 ·
`provider_balance` 503 (fal-Guthaben leer) · `content_rejected` 422 ·
`provider_auth_failed`/`provider_error` 502.
