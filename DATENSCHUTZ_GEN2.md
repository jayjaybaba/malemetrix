# DATENSCHUTZ — Änderungen durch Generation 2 (interne Dokumentation)

Diese Datei dokumentiert die datenschutzrelevanten Änderungen der
Generation 2 für die anwaltliche Prüfung bzw. die Aktualisierung von
`datenschutz.html` (öffentliche Rechtstexte werden bewusst nicht
automatisiert geändert — Founder-Aufgabe vor Rollout-Stufe 3/4).

## Neue Datenverarbeitungen

1. **12-Wochen-Plan im Konto** (`os_state`, Domains `simple_*`,
   `legacy_snapshot`, `transform_goal`, `flags_user`): Planziele,
   Trainings-/Ernährungspräferenzen, Tagesprotokoll, Wochencheck-Antworten,
   Migrations-Snapshot der bisherigen lokalen Daten. Rechtsgrundlage wie
   bisheriger Konto-Sync (Vertragserfüllung); local-first, Sync nur mit
   Konto; RLS trennt Nutzer; Löschung über bestehenden
   delete-account-Prozess (os_state-Zeilen hängen am Konto, cascade).
2. **Kalender-Feed-Tokens** (`calendar_tokens`): nur SHA-256-Hash eines
   Zufallstokens + Zeitstempel. Kein Klartext-Token, keine E-Mail/ID in
   der Feed-URL. Widerruf jederzeit in der App; Zeilen cascaden mit dem
   Konto. Der Feed selbst enthält nur Termin-Zeitblöcke mit neutralen
   Titeln — keine Gewichte, Kalorien oder Diagnosen.
3. **Fortschrittsfotos**: unverändert NICHT hochgeladen. Gen 2 speichert
   nur ein Häkchen „Foto gemacht"; die Bilder bleiben in der Kamera/
   Fotos-App des Geräts. Migrationssnapshots kopieren keine Bilddaten.
4. **Analytics**: unverändert lokal (Plausible nicht konfiguriert);
   Gen-2-Events ohne Gesundheitswerte (ANALYTICS.md).

## Unverändert

Auth (Magic Link), Entitlements/Käufe, Checkout (PayPal/Stripe),
Score-/Programm-Sync, Übersetzungs-Cache, Telemetrie. Keine bestehende
Tabelle wurde geändert oder gelöscht; einzige neue Tabelle:
`calendar_tokens` (additiv).

## Offene Founder-Punkte vor Stufe 3/4

- `datenschutz.html`: Absatz zu Kalender-Feed (Zweck, Widerruf) und zum
  kontogebundenen Planmodell ergänzen (anwaltlich prüfen).
- Auftragsverarbeitung Supabase: unverändert, deckt die neue Tabelle mit ab.
