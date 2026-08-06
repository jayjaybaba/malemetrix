# LEGACY_RESTORE — Wiederherstellung der Produktgeneration „MaleMetrix OS v1"

Dieses Dokument beschreibt, wie die vor der Vereinfachung eingefrorene
Produktgeneration (**MaleMetrix OS v1**) vollständig oder teilweise
wiederhergestellt wird. Es wurde am **06.08.2026** erstellt und gegen das
echte System verifiziert (siehe §4 Restore-Test).

---

## 1. Eingefrorener Stand

| Was | Wert |
|---|---|
| Produktions-Branch | `main` (GitHub Pages, Root; `master` ist Spiegel) |
| Produktions-Commit | `d5cd0ce4b66771cc697d86d4d9a482a61f180a62` |
| Tree-identischer Spiegel | `master` @ `89bc382d44fcb0c7fe415f7a6f5c524940c14d04` (verifiziert: identische Trees) |
| Git-Tag | `malemetrix-os-v1-final` → `d5cd0ce` |
| Archiv-Branch | `archive/malemetrix-os-v1` (auf origin, Tree-identisch zum Produktions-Commit) |
| GitHub-Release | `malemetrix-os-v1-final` (inkl. automatischem Quellcode-Archiv) |
| Service-Worker-Version | `mm-v175` (`sw.js`) |
| Deployment-Workflow | Push auf `main` → GitHub Pages (kein Build-Schritt); Regeln: `DEPLOYMENT.md` |
| Supabase-Projekt | `vczhfyxltiyvtvppfodt` (eu-central-1, PG 17, ACTIVE_HEALTHY) |
| DB-Migrationen (remote angewandt) | 22 (Repo: 16 Dateien + Remote-only-Capture, siehe §3.2) |
| Edge Functions (ACTIVE) | 11: mm-ai v8, mm-commerce v22, send-brief v8, resolve-product-access v9, delete-account v8, score-telemetry v4, mm-admin v5, site-telemetry v4, mm-usage v4, mm-translate v4, mm-transform v11 |
| Entitlement-Logik | `entitlements`-Tabelle (server-granted, Service-Role only) + `MM.entitlements.can(cap)`-Facade; Legacy-Vault (AES) für Alt-Käufer |
| Feature-Flag-Stand v1 | keine zentralen Flags (Konfiguration in `js/config.js`) |

> **Hinweis Tag/Release:** Die Remote-Session konnte Tags nicht direkt pushen
> (Git-Proxy erlaubt nur den Arbeitsbranch). Der Workflow
> `.github/workflows/archive-os-v1.yml` erzeugt Tag + Release idempotent vom
> festgepinnten Commit — einmal über Actions → „archive-os-v1" → Run workflow
> ausführen, sobald diese Datei auf dem Default-Branch liegt.

## 2. Archiv-Branch auschecken

```bash
git fetch origin archive/malemetrix-os-v1 malemetrix-os-v1-final
git checkout archive/malemetrix-os-v1        # oder: git checkout malemetrix-os-v1-final
```

Der Archiv-Branch ist **eingefroren**: keine normale Weiterentwicklung darauf,
kein Force-Push, keine History-Umschreibung. Ein vollständiges Quellcode-Archiv
ist reproduzierbar über:

```bash
git archive --format=tar.gz -o malemetrix-os-v1.tar.gz malemetrix-os-v1-final
```

Es enthält **keine Secrets** (Scan am 06.08.2026: keine API-Keys, keine
Service-Role-Keys, keine privaten Schlüssel im Repo; nur die bewusst
öffentliche Supabase-URL + Publishable Key und die öffentliche
PayPal-Live-Client-ID in `js/config.js`).

## 3. Umgebungsvariablen & Secrets (NICHT im Repo)

| Name | Zweck | Sicherer Ort |
|---|---|---|
| Supabase Service-Role-Key | Edge Functions (Entitlement-Grants, Commerce) | Supabase Dashboard → Project Settings → API |
| `STRIPE_RESTRICTED_KEY` (`rk_live_…`, nur Checkout-Session lesen) | mm-commerce Server-Verifikation | Supabase Edge Function Secrets |
| FAL-Key | mm-transform (KI-Visualisierung) | Supabase **Vault** (`vault.decrypted_secrets`, gelesen via `public.mm_get_fal_key()`) |
| AI-Provider-Key (optional) | mm-ai | Supabase Edge Function Secrets |
| VAPID-Schlüsselpaar (optional, Push) | send-brief | Supabase Edge Function Secrets (Public Key gehört zusätzlich in `js/config.js`) |
| PayPal-Client-ID (öffentlich) | Checkout | steht bewusst in `js/config.js` |

Wiederherstellungsanforderung: Ohne Service-Role-Key und Stripe-Key laufen
Kauf-Verifikation und Entitlement-Grant nicht; die deterministische App läuft
auch ohne alle Secrets (lokal-first).

### 3.1 Datenbank & Schema wiederherstellen

Reihenfolge für eine leere Supabase-Instanz (oder lokales Postgres):

1. Repo-Migrationen in Dateireihenfolge anwenden:
   `supabase/migrations/*.sql` (16 Dateien, idempotent geschrieben).
2. Remote-only-Objekte anwenden:
   `supabase/schema-capture/remote_only_20260806.sql`
   (Tabelle `koerper_leads`, Funktionen `rls_auto_enable`,
   `translation_budget`, `translation_report`; der Event-Trigger für
   `rls_auto_enable` braucht Superuser → auf Supabase per Dashboard).
3. **Daten**: Nutzerdaten liegen NICHT im Repo (Datenschutz). Quellen:
   - Supabase-eigene Backups (Dashboard → Database → Backups; PITR falls aktiv),
   - manueller Dump durch den Founder:
     `pg_dump "$SUPABASE_DB_URL" --schema=public --data-only > data-backup.sql`
     (sicher ablegen, niemals ins Repo committen).
   - Kritische Tabellen zuerst prüfen: `profiles`, `entitlements`, `orders`,
     `commerce_events`, `score_results`, `program_cycles`, `os_state`,
     `subscriptions`, `user_roles` (Bestandszahlen vom 06.08.2026: 5 Profile,
     3 Entitlements, 1 Order, 1 Commerce-Event, 3 Score-Ergebnisse,
     2 Programmzyklen, 27 os_state-Zeilen, 1 Owner-Rolle).
4. Auth-Konfiguration: Magic Link aktiv; Redirect-URLs auf
   `https://www.malemetrix.com/*` (Dashboard → Auth → URL Configuration).
   Auth-User selbst sind nur über Supabase-Backups wiederherstellbar.

### 3.2 Bekannte Abweichung Repo ↔ Remote-Migrationshistorie

Remote sind 22 Migrationen registriert, das Repo führt 16 Dateien. Ursachen:
abweichende Versionsnummern (gleicher Inhalt, z. B. `score_telemetry`) und
6 nur remote angelegte Migrationen. Deren Objekte sind vollständig in
`supabase/schema-capture/remote_only_20260806.sql` eingefroren —
Repo-Migrationen + Capture-Datei ergeben das vollständige Prod-Schema
(verifiziert, §4).

## 4. Restore-Test (durchgeführt & bestanden am 06.08.2026)

`tools-dev/legacy-restore-test.sh` stellt das Schema in einem
Wegwerf-PostgreSQL-16-Cluster wieder her (ohne Prod-Zugriff, ohne Nutzerdaten,
ohne ausgehenden Traffic — es kann also nie ein echter Nutzer kontaktiert
werden) und prüft:

- alle 16 Repo-Migrationen laufen fehlerfrei durch,
- 21 Tabellen in `public`, **RLS auf allen Tabellen aktiv**,
- 14 Policies, RPCs vorhanden,
- `on_auth_user_created`-Trigger legt Profile automatisch an,
- Entitlements/Programme sind nach Restore lesbar,
- anonyme Rolle: `permission denied` (42501) auf Nutzertabellen — wie in Prod,
- authentifizierter Fremd-User sieht 0 fremde Zeilen (RLS-Isolation).

Ausführen: `bash tools-dev/legacy-restore-test.sh` (als unprivilegierter
Nutzer; benötigt PostgreSQL-16-Binaries). Erwartete letzte Zeile:
`RESTORE_TEST_OK`.

Der Test simuliert Supabase-Interna über Shims (`auth.uid()`, `extensions.digest`,
`vault.decrypted_secrets`) — dokumentiert im Script selbst.

## 5. Edge Functions bereitstellen

Quellcode: `supabase/functions/<name>/index.ts` (12 Verzeichnisse im Repo,
11 remote ACTIVE — Details `EDGE_FUNCTIONS.md`). Deployment:

```bash
supabase functions deploy <name> --project-ref vczhfyxltiyvtvppfodt
```

Secrets vorher setzen (§3). Verifikation: `tools-dev/check-functions.sh`
bzw. `tools-dev/production-smoke.sh`.

## 6. Legacy-Deployment erzeugen

Die v1-Oberfläche ist eine statische Site ohne Build:

1. `git checkout malemetrix-os-v1-final`
2. Ordner komplett zu einem beliebigen Static-Host (GitHub Pages, Netlify, …).
3. `js/config.js` prüfen (Supabase-URL/Publishable Key, PayPal-Client-ID).
4. Smoke: `bash tools-dev/production-smoke.sh` gegen die Deployment-URL.

**Testsysteme dürfen keine echten Nutzer kontaktieren:** In Testumgebungen
keine echten Supabase-Prod-Credentials eintragen; der Restore-Test (§4) läuft
vollständig offline; `send-brief` (Push) und E-Mail-Versand nur mit
Test-Secrets bzw. gar nicht deployen.

## 7. Entitlements prüfen

Nach einem Restore:

```sql
select product_key, status, count(*) from public.entitlements group by 1,2;
select count(*) from public.orders;    -- Käufe
select * from public.user_roles;       -- Owner-Rolle vorhanden?
```

In der App: einloggen → `await MM.productionStatus()` in der Konsole;
Kauf-Zugriff über `MM.entitlements.can('protocol')`.

## 8. Einzelne alte Module in die neue Version zurückholen

Siehe `LEGACY_MODULES.md` — pro Modul: Dateien, Datenabhängigkeiten, Routen,
Flags, Konflikte, Reaktivierungsschritte. Kurzform: Alle v1-Module sind im
Repo **erhalten** (nicht gelöscht); Reaktivierung = Route/Navigation wieder
verlinken + ggf. Feature-Flag setzen (`js/flags.js` ab Generation 2).

## 9. Gesamte alte Produktgeneration reaktivieren (globaler Rollback)

Weg A — **Flag-Rollback ohne Deployment** (ab Generation 2, siehe
`ROLLBACK.md`): `simpleAppEnabled=false` / `legacyAppEnabled=true` setzen —
die Legacy-App ist wieder Standard, ohne Codeänderung.

Weg B — **Code-Rollback**: `main` per regulärem Merge/Revert auf den Stand
von `malemetrix-os-v1-final` zurückführen (kein Force-Push auf main;
GitHub Pages deployt automatisch). Die Datenbank braucht dabei KEINEN
Rollback: alle Änderungen der Generation 2 sind additiv (neue Tabellen/
Spalten), die v1-App liest sie schlicht nicht.
