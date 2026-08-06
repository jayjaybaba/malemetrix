# GEN2_FINAL_REPORT — Abschlussdokumentation der Umstellung (06.08.2026)

Auftrag: MaleMetrix zu einem wesentlich einfacheren, täglich nutzbaren
12-Wochen-Begleiter umbauen — vollständig nicht-destruktiv, versioniert,
rückholbar, mit getestetem Rollback. Arbeitsbranch:
`claude/malemetrix-simple-12week-mgvoag` (9 Phasen-Commits, gepusht).

## 1–7 · Archivierung & Wiederherstellung

1. **Produktiver Ausgangscommit:** `d5cd0ce4b66771cc697d86d4d9a482a61f180a62`
   (main, GitHub Pages; Tree-identisch zu master@`89bc382`).
2. **Archiv-Tag:** `malemetrix-os-v1-final` — lokal erzeugt; Tag-Push ist im
   Remote-Git-Proxy gesperrt (403, nur Arbeitsbranch). Nachholung ist
   automatisiert: Workflow `.github/workflows/archive-os-v1.yml`
   (workflow_dispatch, idempotent, festgepinnter Commit) erzeugt Tag **und**
   Release nach dem Merge per Klick.
3. **Archiv-Branch:** `archive/malemetrix-os-v1` auf origin, Tree-identisch
   zum Produktionsstand (verifiziert; der Workflow prüft das erneut).
4. **GitHub-Release:** wird vom selben Workflow erzeugt (Quellcode-Archiv
   generiert GitHub aus dem Tag). Bis dahin ist der Branch das Archiv.
5. **Backups:** Schema = 16 Repo-Migrationen + Remote-only-Capture
   (`supabase/schema-capture/remote_only_20260806.sql` — koerper_leads,
   rls_auto_enable, translation_budget/report, aus der Live-DB eingefroren).
   Nutzdaten (5 Profile, 3 Entitlements, 1 Order, 2 Zyklen, 27 os_state u. a.,
   Bestandszahlen dokumentiert) liegen NICHT im Repo (Datenschutz) —
   Quellen: Supabase-Backups + dokumentierter pg_dump-Weg (LEGACY_RESTORE §3.1).
6. **Restore-Test:** `tools-dev/legacy-restore-test.sh` — am 06.08.2026 in
   einem lokalen PostgreSQL-16-Wegwerfcluster ausgeführt und bestanden:
   16 Migrationen, 21 Tabellen, RLS überall, anon 42501 (wie Prod),
   Cross-User-Isolation, Auth-Trigger legt Profile an, Entitlements/Programme
   lesbar. Ohne Prod-Zugriff, ohne Nutzerdaten, ohne ausgehenden Traffic.
7. **Wiederherstellungsanleitung:** `LEGACY_RESTORE.md` (Commit/Tag, Env-
   Variablen, DB, Edge Functions, Legacy-Deployment, Entitlement-Prüfung,
   Schutz vor Testsystem-Kontakt, Modul-Reaktivierung, Voll-Rollback).

## 8–11 · Systeme

8. **Weiterverwendet (unverändert):** Auth/Magic Link, Profile, Entitlements,
   Käufe/Checkout (PayPal/Stripe/mm-commerce), Score V2, Transformation,
   os_state-Sync, Tracker-Historie, PWA/Service Worker, i18n, Analytics,
   alle 11 Edge Functions. Kein Parallelsystem gebaut.
9. **Intern weiterlaufend (Klasse C):** Execution/Reminder/Overlays,
   Intelligence-Core/Decision Engine, Optimierungspunkte, Baseline/Pathway.
10. **Ausgeblendet, technisch erhalten (Klasse D):** Digital Twin, Simulator,
    Experimente, Memory/Timeline, Performance Map, Stack Builder, Protocol
    Builder, Grants/Usage, Labs — alle Routen unter
    `mein-protokoll.html?legacy=1#…` erreichbar.
11. **Reaktivierbar:** je Modul Dateien/Daten/Routen/Flags/Schritte in
    `LEGACY_MODULES.md`.

## 12–17 · Neues Produkt

12. **Planmodell:** `js/simple/plan-model.js` — versioniertes Dokument
    (draft/active/paused/completed), harte Grenzen (1500–4500 kcal,
    ≤250 kcal & ≤2000 Schritte je Anpassung, ≤1 % KG/Woche, Protein-Korridor,
    2–4 Trainingstage, fix 12 Wochen), `applyChange` mit Pflicht-Begründung/
    Quelle/Regel, `planAtVersion` für historische Sichten. Serverseitige
    Quelle der Wahrheit: bestehende `os_state`-Tabelle (Domains `simple_*`) —
    bewusst keine neue Plantabelle (PLAN_MODEL.md).
13. **Transformation→Plan:** gewähltes Ziel wird übernommen, nie neu
    erfunden; Gesamtziel („80 kg in ~30 Wochen") strikt getrennt vom
    Phase-1-Korridor („87–89 kg nach Woche 12"); Kontext (Alter, Erfahrung,
    Tage, Equipment, Diät) wird nie doppelt gefragt (TRANSFORMATION_TO_PLAN.md).
14. **Score→Plan:** alle 7 Score-V2-Domänen → deterministische Effekte +
    sichtbarer Konsequenz-Satz (DE/EN); Red Flags erzwingen konservative
    Rate + Arzthinweis; Score ist Input, kein Gate (SCORE_TO_PLAN.md).
15. **Trainings-Engine:** Ganzkörper 2/3 Tage, Ober-/Unterkörper 4 Tage;
    feste Übungen mit Sätzen/Wdh/RIR/Pausen, Ersatzübung je Übung,
    Kurzversion (~25–30 min, zählt voll), Home-/Reise-/Comeback-Regeln,
    doppelte Progression, begründeter Deload (TRAINING_ENGINE.md).
16. **Ernährungs-Engine:** Mifflin-St-Jeor + Leitplanken; Bausteinsystem
    (13 Blöcke, 26 Lebensmittel, veggie/Ausschluss-/Kochzeit-Filter,
    deterministische Portionsskalierung), 9 praktische Alltagsregeln,
    keine Ernährungstherapie (NUTRITION_ENGINE.md).
17. **Einkaufssystem:** 7-Tage-Liste aus der echten Bausteinwahl, dedupe,
    6 Kategorien, Personenanzahl, Vorräte, Auswärts-Reduktion, abhakbar,
    Kopieren/Web-Share/Klartext; Tausch aktualisiert die Liste (getestet).

## 18–21 · App

18. **Today:** Woche/Tag, Gesamtziel + Phasenziel, Status („Du bist auf
    Kurs"), **maximal 3 primäre Aufgaben**, Sekundäres als Chips (Wiegen,
    Einkauf, Prep, Wochencheck, Foto), Workout-Runner (abhaken, Gewicht/Wdh,
    Ersatz, Kurzversion), Tag abschließen. Keine Scores/Systembegriffe.
19. **Navigation:** genau vier Bereiche (HEUTE · MEIN PLAN · FORTSCHRITT ·
    PROFIL) als mobile Bottom-Nav; kein Haupttab für Track/Learn/Twin/
    Simulator/Experimente/Memory/Timeline/Map/Stack/Ledger.
20. **Wochencheck:** 6 Fragen; 12 priorisierte Regeln, Sicherheits-Vorrang
    (krank/Verletzung/zu schnell/Overreach/dünne Daten), „Plan bleibt
    unverändert" als valide Entscheidung, Begründung mit konkreten Zahlen
    (WEEKLY_REVIEW.md).
21. **Planversionierung:** jede Anpassung = neue Version mit prev/next-Wert,
    Grund, Regel, Quelle, Datum, checkinId; Historie append-only und
    kontogesynct; sichtbar im Profil.

## 22–26 · Legacy & Rollback

22. **Legacy-Snapshot-System:** §27.3-Vertrag mit djb2-Checksummen je
    Quelle, Warnungen, ohne Bilddaten; kontogesynct; idempotent.
23. **Migration Bestandsnutzer:** erkennen → validieren → Snapshot →
    Vorbefüllung nur aus zuverlässigen Daten (Unsicheres wird gefragt,
    nie erfunden) → Plan über normalen Ablauf → Status. Originale
    byte-identisch unangetastet (getestet). Woche-6-/Pausiert-Szenarien
    mit Warnung (MIGRATION.md).
24. **Rollback pro Nutzer:** Profil („Klassische Ansicht als Standard" /
    „Migration zurücksetzen") bzw. `MM.flags.setUser("simpleAppDefault",false)`
    + `migration.revert()` — Plan pausiert, nichts gelöscht, synct übers Konto.
25. **Globaler Rollback:** Deploy-Flag `simpleAppDefault/simpleAppEnabled`
    in js/config.js (bzw. git revert des Config-Commits); DB braucht nie
    einen Rollback (alles additiv). ROLLBACK.md, getestet in simple-flags/
    simple-migration-Suiten.
26. **Feature Flags:** 4 Ebenen (Defaults < Deploy < Konto < Gerät),
    inkl. der geforderten Flags; ausdrücklich kein Zugriffsschutz —
    der bleibt server-autoritativ (Entitlements/RLS/Owner-Rolle).

## 27–31 · iPhone

27. **Kalender:** abonnierbarer Feed `mm-plan-ics` (32-Byte-Token, nur
    SHA-256-Hash gespeichert, widerrufbar, 1 aktiv/Nutzer, keine ID/E-Mail
    in der URL) + ICS-Download; nur ehrliche Zeitblöcke, neutrale Titel,
    floating local + DTEND, stabile UIDs (Feed ersetzt, dupliziert nicht).
    Migration `calendar_tokens` (einzige neue Tabelle, additiv) und Function
    v1 sind in Produktion; Live-Proben 400/404/401 bestanden.
28. **PWA & Push:** bestehende PWA weiterverwendet (SW mm-v176 cached die
    Gen-2-Shell, Offline-Fallback für meinplan.html); iOS-Installations-
    führung mit Standalone-Erkennung. Push wird EHRLICH als „nicht aktiv"
    ausgewiesen (Server-Push weiterhin REQUIRES CONFIG) — kein Fake.
29. **Erinnerungen:** ehrlicher Fallback — Übersicht kopieren/teilen +
    manuelle 2-Minuten-Anleitung; ein Kurzbefehl wird erst angeboten, wenn
    er auf einem echten iPhone verifiziert wurde. Keine Schaltfläche
    „Automatisch eingerichtet".
30. **Notizen/Share:** Kurzfassung (Woche, Training kompakt, Mahlzeiten-
    optionen, Unterwegs-Regeln) via Web Share/Kopieren; Beschriftung stellt
    klar, dass erst der Nutzer im Teilen-Dialog speichert.
31. **Grenzen ohne native App:** Tabelle in IPHONE_INTEGRATION.md
    (HealthKit, EventKit, zuverlässige Push nur nativ); Datenverträge sind
    app-neutral — eine spätere native App nutzt dieselben Daten.

## 32–35 · Kommerz, Datenschutz, Analytics, Tests

32. **Entitlements:** unverändert server-autoritativ; Planaktivierung prüft
    `access.protocol|twelve_week|coaching` — Käufer erhalten Gen 2 ohne
    erneuten Kauf, Preise bleiben in der bestehenden Quelle (shop-data).
33. **Datenschutz:** DATENSCHUTZ_GEN2.md (neue Verarbeitungen: Plan im
    Konto, Token-Hashes; Fotos weiterhin nie hochgeladen; öffentliche
    Rechtstexte bewusst Founder-Aufgabe vor Stufe 3/4).
34. **Analytics:** ANALYTICS.md — ~30 anonyme Events über das bestehende
    System, Invariante „keine Gesundheits-/Personendaten" wie gehabt.
35. **Tests:** **45 Suiten, 4006 Assertions, alle grün** (davon 7 neue
    Gen-2-Suiten mit 213 Assertions: plan/flags/input/engine/weekly/ics/
    migration). Regressionen behoben statt umgangen (Nav-Ausnahmeliste mit
    Grund, Hash-Routen, Zählerzeile). Browser-Smokes (Playwright/Chromium):
    kompletter Wizard→Vorschau→Paywall→Aktivierung→Heute→Workout→
    Wochencheck-Fluss, iPhone-Tab inkl. echtem ICS-Download, DE + EN,
    320/360/390/768/1440 px ohne horizontales Scrollen, 0 JS-Fehler.

## 36–40 · Nachweise & Status

36. **Echte iPhone-Tests:** kein physisches iPhone in dieser Umgebung —
    ehrlich offen: PWA-Installation, webcal-Abo, Share-Sheets auf echtem
    Gerät (Founder-Checkliste, IPHONE_INTEGRATION.md §Nicht verifiziert).
37. **Screenshots:** `docs/screenshots-gen2/` (Wizard-Vorschau, Heute,
    Workout, Einkauf, iPhone-Einrichtung, Profil, Responsive 320–1440).
38. **Commits (je Phase, gepusht):** 4cc380d Phase 0 · 509875e Phase 1 ·
    ebdd976 Phase 2 · c7e9b73 Phase 3 · 4ed2306 Phase 4 · 83dd64a Phase 5 ·
    9d0b155 Phase 6 · 9f25aa8 Phase 7 · 94a3ca8 Phase 8 · (+ Phase 9 final).
39. **Deploymentstatus:** Frontend = Branch (Deploy erfolgt mit Merge auf
    `main`; GitHub Pages, kein Build). Backend: Migration `calendar_tokens`
    + Edge Function `mm-plan-ics` v1 bereits in Produktion (additiv,
    ungenutzt bis zum Frontend-Merge — gefahrlos). Rollout steht auf
    **Stufe 1** (Legacy Standard; meinplan.html unverlinkt erreichbar).
40. **Verbleibende Risiken:** (a) Feed-E2E mit echtem Konto noch nicht
    gelaufen (Negativ-Pfade live getestet); (b) echte iOS-Gerätetests offen;
    (c) öffentliche Navigation wird erst in Stufe 3 reduziert (bewusst,
    solange Legacy Standard ist); (d) Tag/Release erst nach Merge per
    Workflow-Klick; (e) Rechtstext-Ergänzung Kalender-Feed vor Stufe 3/4;
    (f) paralleles Arbeiten in beiden Oberflächen ist durch getrennte
    Schreibdomänen konfliktarm, aber Langzeit-Beobachtung in Stufe 2 nötig.

## Selbstprüfung (§36, gegen das echte System)

1–7 ✅ (Archiv, Restore getestet, keine Secrets/Nutzerdaten öffentlich,
nichts gelöscht, Rückschaltung + Modul-Reaktivierung dokumentiert & getestet)
— mit der Transparenz, dass Tag/Release den Workflow-Klick nach Merge
brauchen. 8–17 ✅ (Ablauf in einem Satz erklärbar; Transformation→Score→
Plan verdrahtet; jede Score-Domäne mit Plankonsequenz; echter Trainings-/
Ernährungsplan/Einkaufsliste; Today ≤3 Aufgaben; Gesamtziel ≠ 12-Wochen-Ziel;
Wochencheck regelbasiert mit stabilem „unverändert"). 18–19 ✅ (Kalender-
export getestet; Apple-Integrationen ehrlich bezeichnet). 20–22 ✅ (Käufer
geschützt, Legacy gesichert, Rollback getestet). 23–25 ✅ (390 px sauber,
DE/EN, 45/45 Suiten grün). 26 ✅ — sichtbar ist nur noch: Dein Ziel · Dein
Plan · Dein heutiger Tag · Dein Fortschritt · Deine nächste Anpassung.
Punkte mit Rest-Offenheit sind ausschließlich die unter 40 genannten und
dort ehrlich benannt.
