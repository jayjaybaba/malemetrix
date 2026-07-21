# GROWTH-OS-HANDOFF — Übergabe an Opus 4.8

Stand: 2026-07-21 · nach finalem Principal-Engineer-Audit (Fable 5).
Lies zusätzlich: `GROWTH-OS.md` (Technik/Setup) und `GROWTH-OS-STATUS.md` (Feature-Matrix).

## A. Architektur (Ist-Zustand)

- Öffentliche Website: statisch, GitHub Pages (`main`), Domain malemetrix.de,
  Service Worker `sw.js` (Deploy-Trigger: sw-VERSION-Bump per API-Commit auf
  `main` — Git-Proxy-Pushes triggern KEINEN Pages-Build!). Branches
  `main`/`master`/`claude/glp1-agonists-ebook-dbvs5r` werden identisch gehalten.
- Growth OS: local-first SPA unter `/admin/growth/` (SHA-256-Code-Gate,
  noindex, robots-Disallow). Alle Nutzerdaten in `localStorage` (`mm_gos_*`).
- TikTok-Anbindung: eigener Cloudflare Worker (Code fertig+getestet, NICHT
  deployt). Auth: Passwort-Login (`ADMIN_PASSWORD` nur Worker-Secret) →
  12-h-Server-Session (KV) via Custom-Header `x-session` (CSRF-immun).
  Token-Bundle in Durable Object `TokenDO` (stark konsistente
  Refresh-Serialisierung); KV nur Sessions/States/Rate-Limits/lastSync.
  KV-Lock-Fallback existiert nur für den Fall eines fehlenden DO-Bindings.
- Phase 2 (optional, Code fertig): D1 (`proxy/schema.sql`) für Cloud-Backup
  + Cron-Zeitreihen; Sync-Push/Pull + getrennte Cloud-Löschung im UI.

## B. Wirklich implementiert (Code vorhanden & getestet)

Level-0-Manual-Mode komplett: CSV-Import (Mapping-Bestätigung, DE/EN-Header,
locale-robuster Zahlenparser, Duplikat→Snapshot, Alt-Export-Warnung),
Video-CRUD + partielle Snapshots (Kennzahl = jüngster Snapshot MIT dieser
Kennzahl), KPIs 7/30 T. mit Kohorten-Hinweis, Follower/1k, QV-Quote+Diagnose,
RPM, €/Prod-Minute, Winner-Detector, Breakout-Detektor (Snapshot-Velocity),
What Works/Doesn't (min. n=3), Posting-Zeit (min. n=5), Target Mode,
Ideen-Pipeline (11 Status), Scores mit Stufenmodell 0–4
(wD = min(0.6, n_vergleichbare_Themen-Videos · 0.05), Kalibrierung → +0.15,
Cap 0.75), Do-Not-Produce, Hook Lab (10 Typen + First-5s-Check +
Account-Learning), Script Studio (8 Modi, Retention Map, Risiko-Check),
Pre-Publish-Check (Compliance ≠ Reward-Eligibility), platform_rules mit
Verifikationsdatum + Freshness-Alarm, Search Radar + Bulk-Import + Cluster,
Watchlist, Missionen, Backup-Export/-Import, getrennte Löschung
lokal/Cloud, Audit-Log, Mobile-Quickbar.
Worker: OAuth-Flow, TokenDO, Pagination (Cap 250, Teilfehler gemeldet),
PubMed-Radar, Sync-Endpunkte, Cron. Feedback-Loop: Prognose wird bei
READY/PUBLISHED/Verknüpfung eingefroren (Retro-Verknüpfungen als
`retro:true` markiert und von der Kalibrierung ausgeschlossen).

## C. Wirklich live/deployt

- Live auf GitHub Pages (sw **mm-v51**): die gesamte Website inkl.
  `/admin/growth/` (Level 0 voll funktionsfähig).
- **NICHT deployt:** der Cloudflare Worker (kein Cloudflare-Konto-Zugriff aus
  der Session), keine TikTok-Developer-App, kein D1, kein Cron. Das Frontend
  zeigt deshalb ehrlich Level 0; TikTok-/Sync-/PubMed-Funktionen erscheinen
  erst nach Konfiguration.

## D. Externe Konfiguration nötig (durch Ural)

1. TikTok-Developer-App (Login Kit; Scopes `user.info.basic`,
   `user.info.stats`, `video.list`) → Client Key/Secret.
2. Cloudflare: `cd proxy && cp wrangler.toml.example wrangler.toml` (echte
   Datei ist Pflicht — Kommentare im Worker sind KEINE Konfiguration; reale
   IDs nie committen, `.gitignore` deckt `proxy/wrangler.toml` ab),
   KV `TOKENS` anlegen, 3 Secrets setzen, `wrangler deploy`.
3. Redirect-URI `https://<worker>/auth/callback` in der TikTok-App.
4. `js/config.js` → `growth.tiktok.apiBase` (nur URL, kein Secret).
5. Optional: D1 + Cron (GROWTH-OS.md §6b); optional KI (`growth.ai`);
   optional Cloudflare Access vor die Worker-Route.

## E. Offene Punkte (P0–P3)

- P0: keine bekannt.
- P1: keine bekannten offenen (drei im Abschluss-Audit gefundene P1 sind
  gefixt, s. Commit „Abschlussaudit“).
- P2:
  - `view_count/like_count/…` als Felder von `/v2/video/list/` sind aus der
    Feld-Doku übernommen, aber noch nicht gegen die echte API verifiziert —
    beim ersten Production-Call prüfen; bei Fehler Felderliste anpassen.
  - Duplikat-Matching beim CSV-Import: gleicher Titel OHNE Datum ⇒ Merge;
    zwei gleichnamige Videos ohne Datumsspalte würden zusammenfallen.
  - Kohorten-Bias im 7/30-T.-Vergleich ist nur textlich entschärft, nicht
    altersnormalisiert.
  - D1-Sync ist Last-Write-Wins (bewusst); gleichzeitige Pushes von zwei
    Geräten überschreiben sich ohne Merge.
  - platform_rules-Startwerte (Reward-Mindestlänge etc.) sind bewusst
    „unverifiziert“ — Ural bestätigt sie im TikTok Studio.
- P3: Drag&Drop-Kalender, Zeitreihen-Charts aus D1, Screenshot-Vision-Import,
  hierarchisches Lernen (nur dokumentiert, GROWTH-OS.md §4).

## F. Dateien je Systemteil

| Teil | Dateien |
|---|---|
| Shell/Gate | `admin/growth/index.html`, `css/growth.css` |
| Stammdaten/Regeln | `js/growth/growth-data.js` |
| Storage/Parser/Export | `js/growth/growth-core.js` |
| Scores/Learning/Analytics | `js/growth/growth-scores.js` |
| UI/Workflows/TT-Adapter | `js/growth/growth-app.js` |
| Worker (OAuth/API/DO/Sync/Cron) | `proxy/tiktok-oauth-worker.js` |
| Deploy-Vorlage / D1-Schema | `proxy/wrangler.toml.example`, `proxy/schema.sql` |
| Konfiguration (öffentlich, ohne Secrets) | `js/config.js` → `growth` |
| Doku | `GROWTH-OS.md`, `GROWTH-OS-STATUS.md`, diese Datei |

## G. Datenmodell

localStorage `mm_gos_*`: `videos` (mit `snapshots[]` — PARTIELL: Kennzahl gilt
aus dem jüngsten Snapshot, der sie enthält; `source`: studio_csv/manual/api),
`ideas` (factors, hooks, hookChecks, script, check, videoId, searchId),
`search`, `competitors`, `missions`, `rules`, `recs` (`retro:true` ⇒ nicht
kalibrierungsrelevant), `settings`, `log`. Details: GROWTH-OS.md §3.
D1: `kv_backup` (1 Zeile, Voll-Backup), `account_snapshots`,
`video_snapshots` (PK video_id+ts). Worker-KV: `sess:*`, `state:*`, `rl:*`,
`tt:lastSync`, `tt:lastAutoSync` (+ `tt:tokens` NUR im DO-losen Fallback).

## H. Worker-Endpunkte

Öffentlich: `POST /auth/login` (Rate-Limit 5/10 min), `GET /auth/callback`
(State single-use). Session-pflichtig (`x-session`): `POST /auth/logout`,
`POST /auth/start` → `{url}`, `GET /api/status`, `GET /api/videos`
(paginiert, `{videos,count,truncated,partialError}`), `POST /api/disconnect`,
`GET /api/research?q=` (PubMed), `POST /api/sync/push`, `GET /api/sync/pull`,
`POST /api/sync/delete` (`{scope: backup|timeseries|all}`),
`GET /api/sync/timeseries`. Cron: `scheduled()` → D1-Snapshots.
Global 120 Req/10 min/IP; CORS-Allowlist malemetrix.de/www/jayjaybaba.github.io.

## I. TikTok-/Cloudflare-Setup

Exakt in GROWTH-OS.md §6/§6a/§6b. Offizielle Endpunkte zuletzt am
**2026-07-21** gegen developers.tiktok.com verifiziert: Authorize
`www.tiktok.com/v2/auth/authorize/`, Token `open.tiktokapis.com/v2/oauth/token/`
(Access 24 h, Refresh 365 d, **Rotation: neu zurückgegebenes refresh_token
MUSS übernommen werden** — implementiert), UserInfo `/v2/user/info/`,
VideoList `/v2/video/list/` (max_count 20, cursor/has_more — implementiert).
Content Posting: unauditierte Apps posten nur PRIVAT (deshalb Level 3/4 =
EXTERNE FREIGABE). Creator-Rewards-Daten: keine öffentliche API — dauerhaft
Studio-Import.

## J. Testkommandos

```bash
# Worker-Suiten (Node ≥ 20; Mocks inline, kein Setup nötig):
node /tmp/worker-test.mjs      # v2: 35 Tests (KV-Fallback-Pfad, OAuth, Security)
node /tmp/worker-test-v3.mjs   # v3: 17 Tests (echtes TokenDO, Pagination, D1-Delete)
# (Dateien liegen im Session-/tmp — bei neuer Session aus den Commits
#  „Growth OS v2/v3“ rekonstruierbar; Szenarien in GROWTH-OS.md §6c.)

# Frontend-E2E (Playwright, lokaler Server):
python3 -m http.server 8899 &   # im Repo-Root
# Gate/Import/Scores/Works/Settings/Mobile: /tmp/gtest.mjs
# Integrationstest gegen echten Worker-Code via Node-Bridge: /tmp/bridge.mjs + /tmp/gtest3.mjs
node --check js/growth/*.js && (cp proxy/tiktok-oauth-worker.js /tmp/w.mjs && node --check /tmp/w.mjs)

# Deploy-Muster (WICHTIG): nach git push auf alle 3 Branches einen
# API-Commit via GitHub-API auf main machen, der sw.js VERSION bumpt —
# nur das triggert den Pages-Build. Danach master+claude-Branch auf
# origin/main synchronisieren und live pollen (jayjaybaba.github.io/malemetrix).
```

## K. Letzte bekannte grüne Tests (2026-07-21, nach Abschlussaudit-Fixes)

Worker v3 17/17 · Worker v2 35/35 · Parser/metric-Unit 22/22 ·
Frontend-E2E 10/10 · Integrationstest 20/20 (früherer Lauf) ·
Sperren/Datenlöschung 5/5 · Mobile-Regression ✓ · Public-Site 0 JS-Fehler ·
Secret-Scan sauber.

## L. Was Opus NICHT neu bauen soll

- Die Worker-Auth (Session-Modell) und den TokenDO — beides auditiert und
  getestet; kein Cookie-Umbau, kein zweiter Refresh-Pfad.
- Den CSV-Import-Wizard, das Snapshot-Modell (partiell, last-known-per-key)
  und den Zahlenparser — gerade gegen reale Fehlbedienung gehärtet.
- Das Score-Stufenmodell/Kalibrierung — bewusst transparent statt ML; nicht
  durch Black-Box-Modelle ersetzen (§84/§85-Prinzipien).
- Keine Fake-Funktionen, keine Black-Hat-Automatisierung (§98), keine
  TikTok-Regeln hartkodieren (platform_rules verwenden).
- Öffentliche Website nicht anfassen, außer explizit beauftragt.

## M. Nächste 5 sinnvolle Schritte

1. **Reales Deployment durch Ural** (GROWTH-OS.md §6): TikTok-App +
   Worker-Deploy + `apiBase` — danach Production-Smoke-Test: Login,
   Verbinden, Status, `/api/videos` (dabei P2 „Video-Stats-Felder“ prüfen).
2. Erste echte TikTok-Studio-CSV importieren, Themen/Hook-Typen taggen,
   3–5 Ideen bewerten → Dashboard-Empfehlungen validieren.
3. platform_rules im TikTok Studio verifizieren und Datum setzen.
4. Optional D1 + Cron aktivieren (§6b) und nach ~1 Woche Zeitreihen prüfen
   (`/api/sync/timeseries`); dann ggf. P3 „Zeitreihen-Charts“.
5. Nach ≥ 5 abgeschlossenen Prognosen Kalibrierung reviewen; erst bei
   deutlich mehr Daten über hierarchisches Lernen (§4-Fußnote) nachdenken.
