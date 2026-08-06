# IPHONE_INTEGRATION — Pragmatisches MVP (Generation 2, Phase 6)

Code: `js/simple/iphone.js` (UI), `js/simple/ics.js` (Generator, identische
Kopie im Edge-Bundle), `supabase/functions/mm-plan-ics/` (Feed),
Migration `20260806000017_calendar_tokens.sql` (additiv).
Tests: `tools-dev/tests/simple-ics.test.js` (17 Assertions) + Live-Proben.

MaleMetrix bleibt die Quelle der Wahrheit; Apple-Apps sind Ausgabekanäle.
Nichts wird ungefragt eingerichtet, nichts wird behauptet, was nur ein
Dialog ist.

## 1 · Apple Kalender

**Inhalt (ehrlich, §21):** nur echte Zeitblöcke — Krafttraining (mit
bevorzugter Uhrzeit, Deload-Kennzeichnung), Einkauf, Meal-Prep, Wochencheck
(ab Woche 2), Fortschrittsfotos (Start/W4/W8/W12), Abschlussmessung.
**Nicht enthalten:** Mahlzeiten, Kalorien, Shakes, Kleinaufgaben,
Gesundheitsdaten. Titel neutral („MaleMetrix · Ganzkörper A").
36 Trainingsblöcke statt 84 Tageseinträge (getestet).

**Weg A — abonnierbarer Feed (empfohlen, Konto nötig):**
- `POST mm-plan-ics {action:"create"}` (Bearer-JWT, Auth im Handler nach
  P0.6) erzeugt einen 32-Byte-Zufallstoken; gespeichert wird **nur der
  SHA-256-Hash** (`calendar_tokens`, RLS an, keine Policies → Service-Role
  only). Antwort enthält `webcal://`- und HTTPS-URL; der Klartext-Token
  existiert genau einmal.
- `GET mm-plan-ics?t=<token>` liefert `text/calendar` aus der EINEN
  Planquelle (`os_state`-Domain `simple_plan`). Zukünftige Änderungen
  übernimmt Apple beim periodischen Poll; UIDs sind stabil je
  (Plan, Typ, Datum) — Aktualisierung ersetzt, dupliziert nicht,
  Vergangenheit wird nie verfälscht.
- Widerruf: `{action:"revoke"}` macht die URL sofort ungültig; danach ist
  Neu-Abonnieren mit frischem Token möglich. Keine E-Mail/User-ID in der URL.

**Weg B — ICS-Download (ohne Konto):** identischer Generator im Browser,
als Datei; ehrlich als „einmaliger Schnappschuss" beschriftet.

**Verifiziert am 06.08.2026 (live):** Function v1 ACTIVE; `GET` ohne Token →
400, mit unbekanntem Token → 404 (kein Informationsleck), `POST` ohne
Auth → 401. ICS-Inhalt: 17 Unit-Assertions (RFC-Faltung, floating local,
UID-Stabilität, keine Gesundheitsdaten).

## 2 · PWA-Installation (iOS)

Erkennung: iOS (User-Agent), Standalone (`display-mode: standalone` /
`navigator.standalone`). Anleitung: Safari → Teilen → „Zum Home-Bildschirm"
→ Hinzufügen. Bereits installierte App wird als „✓ läuft als App" erkannt.
Bestehende PWA/Service-Worker-Infrastruktur unverändert weiterverwendet.

## 3 · Benachrichtigungen — EHRLICH

Server-Push ist in Produktion **nicht konfiguriert** (PRODUCTION_TRUTH:
`REQUIRES CONFIG`, kein VAPID-Key im Client). Die App zeigt deshalb keinen
Push-Schalter, sondern sagt es offen: Erinnerungen kommen über den Kalender.
Kein „Push aktiv"-Theater, solange die Zustellung nicht nachweislich läuft.

## 4 · Einkaufsliste

Abhaken in der App (Mein Plan → Einkauf); Kopieren als sauberer Klartext;
Web Share, wo verfügbar.

## 5 · Apple Erinnerungen — ehrlicher Fallback

Eine Website kann keine Einträge in die Erinnerungen-App schreiben; ein
Apple-Kurzbefehl wird erst angeboten, wenn er auf einem echten iPhone
verifiziert wurde (liegt in dieser Umgebung nicht vor — dokumentierte
Grenze). Stattdessen: kompakte Erinnerungs-Übersicht (Trainingstage/-zeit,
Wiege-Tage, Wochencheck, Einkauf, Prep, Foto-Checkpoints) zum
Kopieren/Teilen + kurze manuelle Anleitung. Es gibt bewusst KEINE
Schaltfläche „Automatisch eingerichtet".

## 6 · Apple Notizen

Kurzfassung des Plans (Wochenstruktur, kompaktes Training, Mahlzeiten-
optionen, Unterwegs-Regeln) via Web Share/Kopieren. Beschriftung stellt
klar: Gespeichert wird erst, wenn der Nutzer im Teilen-Dialog bestätigt.

## Grenzen ohne native App (dokumentiert, §25)

| Fähigkeit | PWA heute | Kurzbefehl | native App nötig |
|---|---|---|---|
| Kalender (Feed/ICS) | ✅ | — | — |
| Home-Screen-App, offline | ✅ | — | — |
| Zuverlässige Push-Reminder | ⚠️ nur mit Server-Push-Konfig (iOS ≥16.4, installierte PWA) | — | ✅ voll |
| Erinnerungen-App schreiben | ❌ (Text + Anleitung) | ⚠️ möglich, ungeprüft | ✅ (EventKit) |
| HealthKit (Schritte automatisch) | ❌ | ❌ | ✅ |

Backend-Verträge (Plan in `os_state`, Checkins, Tokens) sind app-neutral —
eine spätere native App nutzt dieselben Daten, keine zweite Planlogik.

## Nicht real verifiziert (ehrlich)

Kein physisches iPhone in dieser Umgebung. Offen bleiben (Founder/Testkonto,
Rollout Stufe 1): Abo-Feed-Anlage über die UI mit echtem Login inkl.
webcal-Öffnung, PWA-Installation auf echtem Gerät, Web-Share-Sheets in
iOS-Safari. Alles Server-/Format-Seitige ist getestet (siehe oben).
