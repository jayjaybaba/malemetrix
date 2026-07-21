# MaleMetrix Growth OS — Technische Dokumentation

Internes TikTok-Growth-, Content- und Creator-Rewards-System.
Aufruf: **`https://malemetrix.de/admin/growth/`** (noindex, robots-Disallow, Zugangscode).

---

## 1. Architektur

```
Öffentliche Website (GitHub Pages, statisch — unverändert)
        │
        ├── /admin/growth/index.html      Growth-OS-Shell (Zugangs-Gate)
        │     ├── js/growth/growth-data.js    Stammdaten, Regeln, Presets (keine Nutzerdaten)
        │     ├── js/growth/growth-core.js    Storage, CSV-Parser, Export/Import, Log
        │     ├── js/growth/growth-scores.js  Scores, Learning, Analytics, Kalibrierung
        │     └── js/growth/growth-app.js     UI: Dashboard, Videos, Ideen, Suche, …
        │
        └── proxy/tiktok-oauth-worker.js  Cloudflare-Worker-CODE (liegt im Repo,
            proxy/wrangler.toml.example   Deploy erfolgt separat durch Ural, §6)
            proxy/schema.sql              — Tokens nur serverseitig
```

**Grundsatzentscheidung (nach Code-Audit):** Die Website ist eine statische
GitHub-Pages-Seite ohne Backend. Deshalb ist das Growth OS **local-first**
gebaut: Im Auslieferungszustand (vor jedem Cloudflare-Setup) liegen alle
Nutzerdaten (Videos, Kennzahlen, Ideen, Skripte, Einstellungen)
ausschließlich im `localStorage` des Geräts (Prefix `mm_gos_*`) — identisch
zum bewährten Muster von Training-/Kalorien-Tracker. **Nach aktiviertem
D1-Cloud-Sync (§6b) liegen gepushte Backups und Cron-Zeitreihen zusätzlich
serverseitig in der eigenen D1-Datenbank** — das UI zeigt den jeweiligen
Zustand an (§10). Im (öffentlichen) Repository liegen nur App-Code und
Stammdaten, **niemals** Nutzerdaten, Tokens oder Secrets. Die
TikTok-API-Anbindung läuft ausschließlich über einen eigenen Cloudflare
Worker; das Token-Bundle liegt dort in einem Durable Object (`TokenDO`),
Sessions/States/Rate-Limits in Workers KV — alles serverseitig.
Der Worker ist **noch nicht deployt**: Der Code liegt fertig und getestet
im Repo, das reale Deployment (Cloudflare-Konto, TikTok-App) macht Ural
nach §6.

**Warum kein „echtes“ Server-Login?** Auf einer statischen Public-Pages-Seite
gibt es keinen Server, der Sessions prüfen könnte. Das Zugangs-Gate
(SHA-256-Code, Session-basiert) hält zufällige Besucher fern; die eigentliche
Datensicherheit entsteht dadurch, dass **auf dem Server schlicht keine Daten
liegen**. Sensible Serverfunktionen (OAuth, Tokens) sind vollständig in den
Worker ausgelagert und dort durch Passwort-Login mit kurzlebiger Server-Session
(`ADMIN_PASSWORD` nur als Worker-Secret) + Rate-Limits geschützt (Details §6a).

## 2. Feature-Level (ehrliche Ausbaustufen)

| Level | Funktion | Status |
|---|---|---|
| 0 | Manual Mode: Studio-CSV-Import, Eingaben, alle Analysen & Scores | **LIVE** |
| 1 | TikTok-Profil verbunden (OAuth, Profil + Stats) | KONFIGURATION ERFORDERLICH (Worker-Deploy + TikTok-App) |
| 2 | Video-Liste + Basis-Metriken per Display API | KONFIGURATION ERFORDERLICH (Scope `video.list`) |
| 3 | Draft-Upload („An TikTok senden“) | EXTERNE FREIGABE (TikTok-Audit — unauditierte Apps posten nur **privat**) |
| 4 | Direct Post | EXTERNE FREIGABE (TikTok-Audit) |

Wichtig: Creator-Rewards-Daten (Qualified Views, RPM, Vergütung) liefert die
öffentliche TikTok-API **nicht** — sie kommen dauerhaft per TikTok-Studio-
Import/Eingabe (Level 0), auch wenn Level 1–2 aktiv sind.

## 3. Datenmodell (localStorage, Prefix `mm_gos_`)

| Key | Inhalt |
|---|---|
| `videos` | `[{id, title, url, postAt, lengthSec, topic, cluster, format, hookType, searchTerm, contentClass, promoted, prodMinutes, notes, snapshots[]}]` — `snapshots[] = {ts, source, verified, views, likes, comments, shares, saves, followers, qualifiedViews, rewardEur, watchTimeSec, retention}` (§51: jede Kennzahl mit Quelle+Zeitstempel) |
| `ideas` | `[{id, title, topic, cluster, format, contentClass, status, factors{viral,growth,reward,brand}, competition, differentiation, medRisk, hooks{}, hookChecks{}, script{mode,blocks,visuals,cta,caption,hashtags,searchTerm,sources,riskAnswers}, check{}, videoId}]` |
| `search` | Search-Opportunities `{keyword, cluster, demand, competition, fit, rewardPot, opportunity, source, ts}` |
| `competitors` | Creator-Watchlist `{name, focus, note}` (§19 — manuell, kein Scraping) |
| `missions` | `{ "YYYY-MM-DD": {missionKey: true} }` |
| `rules` | platform_rules `{id, name, value, source, verified}` (§94) |
| `recs` | Recommendation Memory `{date, ideaId, title, composite, preset}` (§86) |
| `settings` | Gewichtungs-Preset/Custom-Weights (versioniert), Monatsziel, Defaults |
| `log` | Audit-Log (max. 300 Einträge, keine Secrets) |

Migrationsprinzip: Neue Felder werden defensiv gelesen (`get(key, fallback)`),
Format-Änderungen erhöhen `version` im Backup-Export.

## 4. Score-System (§9/§10/§93) — Stufenmodell (v2)

Das System hängt mit wachsender Datenmenge immer **weniger** an der
Selbsteinschätzung:

| Stage | Bedingung | Effekt |
|---|---|---|
| 0 | < 3 vergleichbare Videos **zum selben Thema** | 100 % Selbsteinschätzung (0–10-Faktoren) |
| 1 | ≥ 3 vergleichbare Videos zum Thema | Historie fließt ein (wD wächst mit n) |
| 2 | Search-/Trend-Signal an der Idee verknüpft | Signal-Marker |
| 3 | Daten-Gewicht wD ≥ 50 % (≥ 10 vergleichbare Videos zum Thema) | überwiegend datengetrieben |
| 4 | Kalibrierung aktiv (≥ 5 Prognosen mit Ergebnis) | Trefferquote < 50 % ⇒ Daten-Gewicht bis 75 % |

**Blend je Dimension:** `score = (1−wD)·Selbsteinschätzung + wD·Historie`,
`wD = min(0.6, n·0.05)` — **n = vergleichbare Videos desselben Themas**
(nicht die Gesamtzahl aller Videos!). Ein neues Thema startet also immer bei
Stage 0, egal wie groß der Account ist; ab 10 Themen-Videos überwiegt die
Historie (wD ≥ 50 %), Maximum 60 % ab 12 (+0.15 bei schlechter Kalibrierung,
Cap 75 %). Historie = Themen-Perzentil unter allen eigenen Videos (Viral:
Views · Growth: Follower/1k · Reward: RPM). Jede Idee zeigt Stage, Gewichte
und Datengrundlage offen an (§85); Confidence NIEDRIG/MITTEL/HOCH nach n.

*Zukünftige Architektur (dokumentiert, bewusst noch nicht gebaut):
hierarchisches Lernen mit Shrinkage über Account gesamt → Cluster → Thema →
Format → Hook-Typ → Länge, damit dünn besetzte Ebenen vom Parent erben.
Erst sinnvoll ab deutlich größerer Datenbasis.*

- **Opportunity Score:** gewichtete Summe (Viral/Growth/Reward/Brand),
  Presets MAX GROWTH / MAX REWARD / MAX VIRALITY / BALANCED / AUTHORITY oder
  eigene Gewichte; Gewichte sind Daten, nicht Code (versioniert).
- **Do-Not-Produce (§38):** blockiert bei Fit ≤ 3, Konkurrenz ≥ 8 ohne
  Differenzierung, medizinischem Risiko HIGH, Gesamtscore < 40 oder fehlender
  neuer Erkenntnis — mit Begründung.
- **Geschlossener Feedback-Loop (§86/§87):** Die Prognose wird automatisch
  **eingefroren**, sobald eine Idee auf READY/PUBLISHED geht oder mit einem
  Video verknüpft wird (zusätzlich beim Dashboard-Klick „Skript erzeugen“).
  Ergebnis-Tier (normalisierte Views) vs. Prognose-Tier ergibt die
  Trefferquote; eine schlechte Trefferquote erhöht automatisch das
  Daten-Gewicht künftiger Scores (Stage 4). Kreislauf: Opportunity → Prognose
  → Produktion → Verknüpfung → Snapshots → Ergebnis → Kalibrierung →
  bessere nächste Empfehlung.
- **Breakout-Detektor (§43):** Velocity = ΔViews/Tag zwischen den letzten
  beiden Snapshots je Video; ≥ 3× Account-Median-Velocity ⇒ 🚨-Karte im
  Dashboard mit Folge-Angle-Empfehlung. Funktioniert ab wiederholten
  Importen/API-Snapshots — ohne Datenbasis zeigt die Karte ehrlich den Bedarf.

## 5. Import (§50/§51)

**TikTok Studio → CSV:** TikTok Studio (Desktop) → Analytics → Zeitraum wählen
→ „Daten herunterladen“ (CSV) → im Growth OS unter *Videos → TikTok-Studio-CSV*.
Spalten-Mapping wird automatisch vorgeschlagen (deutsche + englische Header)
und **vor dem Import bestätigt**. Duplikate (gleicher Titel+Datum oder URL)
erhalten einen neuen **Snapshot** statt eines Doppel-Eintrags — so entsteht
der Verlauf für Velocity/Trend. Reward-Zahlen (Qualified Views, Vergütung)
können in derselben CSV oder als manueller Snapshot je Video nachgetragen
werden. Screenshot-Import per Vision-KI ist bewusst **nicht** eingebaut,
solange kein serverseitiger Endpoint existiert (kein API-Key im Browser).

## 6. TikTok-Anbindung (Level 1–2) — exaktes Setup

Der Worker-Code liegt fertig in `proxy/tiktok-oauth-worker.js`
(Endpoints gegen offizielle Doku gebaut, geprüft 2026-07-20:
`/v2/auth/authorize/`, `/v2/oauth/token/`, `/v2/user/info/`, `/v2/video/list/`;
Access Token 24 h, Refresh Token 365 Tage, **Refresh-Rotation atomar
gespeichert** — 35 automatisierte Security-/Lifecycle-Tests, s. §6c).

**Schritt für Schritt (Ural):**
1. **TikTok-Developer-App:** developers.tiktok.com → *Manage apps* → *Connect an app*.
   App-Name z. B. „MaleMetrix Growth OS“. **Zwei Produkte** hinzufügen
   (beide nötig, verifiziert 2026-07-21): **Login Kit** (OAuth + Scope
   `user.info.basic`) **und** **Display API** (Scopes `user.info.stats`
   und `video.list` — nur damit liefert `/api/videos` echte Daten).
   Beim Login Kit als Plattform **Web** wählen und die Redirect-URI setzen
   (Wert steht nach dem Worker-Deploy fest — s. Schritt 3).
   → Aus den App-Einstellungen kopieren: **Client Key** und **Client Secret**
   (Secret geheim halten — nur per `wrangler secret put` setzen, nie ins
   Repo/Frontend/Chat).
2. **Cloudflare Worker:** (Konto auf dash.cloudflare.com, kostenloser Plan reicht)
   ```bash
   npm i -g wrangler && wrangler login
   cd proxy
   cp wrangler.toml.example wrangler.toml   # ECHTE Konfig anlegen — die Vorlage
                                            # allein reicht nicht, wrangler liest
                                            # keine Kommentare aus dem Worker-Code
   wrangler kv namespace create TOKENS      # ausgegebene ID in wrangler.toml
                                            # bei REPLACE_WITH_KV_NAMESPACE_ID eintragen
   # PFLICHT-Prüfung vor Deploy: wrangler.toml enthält KV-Binding TOKENS,
   # DO-Binding TOKENDO UND die [[migrations]] mit new_sqlite_classes=["TokenDO"]
   wrangler secret put TT_CLIENT_KEY        # Wert: Client Key aus Schritt 1
   wrangler secret put TT_CLIENT_SECRET     # Wert: Client Secret aus Schritt 1
   wrangler secret put ADMIN_PASSWORD       # langes Zufallspasswort — NUR hier, nie im Repo/Frontend
   wrangler deploy
   ```
   → Worker-URL aus der Deploy-Ausgabe notieren.
   Hinweis: Die echte `wrangler.toml` (mit realen IDs) nicht ins öffentliche
   Repo committen — nur die `.example`-Vorlage ist versioniert.
3. **Redirect-URI** in der TikTok-App eintragen:
   `https://mm-tiktok.<name>.workers.dev/auth/callback`
4. **`js/config.js`** → `growth.tiktok.apiBase = "https://mm-tiktok.<name>.workers.dev"`
   → committen. (Nur die URL — **kein** Key, kein Passwort.)
5. Growth OS → System → **Admin-Passwort eingeben → „Anmelden“** →
   **„TikTok verbinden“** → TikTok-Login → fertig.
   Trennen jederzeit über „Trennen“ (Token wird serverseitig widerrufen — DSGVO §75).

### 6a. Sicherheitsmodell (v2, nach Security-Audit)

- **Kein Secret im Frontend:** `config.js` enthält nur die Worker-URL. Das
  Admin-Passwort existiert ausschließlich als Worker-Secret. Der Browser
  erhält nach Login eine **kurzlebige Server-Session** (12 h TTL, KV,
  jederzeit widerrufbar), gehalten in `sessionStorage`, gesendet als
  Custom-Header `x-session`.
- **CSRF:** Alle Auth-/API-Routen verlangen den Custom-Header — Cross-Site-
  Formulare/Bilder können keine Custom-Header senden, Cross-Origin-`fetch`
  scheitert an der CORS-Allowlist. Kein `?key=`-Query-Param mehr (v1-Fehler,
  entfernt: keine Secrets in URLs/Server-Logs/Referrern).
- **OAuth-State:** einmalig (Delete-on-use), 10 Min TTL, nur über die
  authentifizierte Route erzeugbar und an die Session gebunden. Replay getestet.
- **Token-Lifecycle (v3):** Das Token-Bundle liegt in einem **Durable
  Object** (`TokenDO`, stark konsistent, global genau eine Instanz).
  Alle konkurrierenden Refreshes teilen sich eine In-Flight-Promise —
  zwei gleichzeitige Requests können technisch nicht denselben Refresh
  Token verwenden oder konkurrierende rotierte Bundles speichern.
  (Workers KV ist eventual-consistent und kann das nicht garantieren;
  der frühere KV-Lock bleibt nur als dokumentierter Fallback, falls das
  DO-Binding fehlt.) `lastSync` liegt weiterhin in separatem KV-Key.
  **Wichtig:** Der Kommentarblock im Worker-Dateikopf ist nur eine
  Vorlage — Kommentare werden von `wrangler deploy` NICHT gelesen.
  Vor dem Deploy muss eine echte `proxy/wrangler.toml` existieren
  (Kopie von `proxy/wrangler.toml.example`, eigene IDs eintragen) mit
  KV-Binding `TOKENS`, DO-Binding `TOKENDO` **und** der
  `TokenDO`-Migration. Ohne DO-Binding läuft nur der KV-Fallback ohne
  Serialisierungs-Garantie.
- **Rate-Limits:** Login 5/10 Min/IP, gesamt 120/10 Min/IP.
- Optionale Zusatz-Härtung ohne Code: **Cloudflare Access** vor die
  Worker-Route legen (Zero-Trust-Login zusätzlich zur App-Session).

### 6b. Phase 2: zentrale Daten, Auto-Snapshots, Cron (optional)

Gleicher Worker, plus D1 — kein zusätzlicher Anbieter:
```bash
cd proxy
wrangler d1 create mm-growth                       # ausgegebene database_id notieren
wrangler d1 execute mm-growth --file=schema.sql    # Migration v1
# in der echten wrangler.toml die auskommentierten Blöcke aus der .example
# einkommentieren ([[d1_databases]] + [triggers]) und die database_id eintragen
wrangler deploy
```
Damit aktiv:
- **Cloud-Sync:** System-Tab → „Backup → Cloud“ / „Cloud → dieses Gerät“
  (geräteübergreifend, Last-Write-Wins mit Bestätigung).
- **Tägliche Auto-Snapshots (Cron 05:00 UTC):** Account-Stats + Videoliste
  → D1-Zeitreihen (`account_snapshots`, `video_snapshots`) — Basis für
  Velocity/Breakout auch ohne manuelle Importe. Abruf: `/api/sync/timeseries`.
- Ohne D1 antwortet der Worker ehrlich mit `501 sync_not_configured`;
  das UI zeigt KONFIGURATION ERFORDERLICH.

### 6c. Getestete Szenarien (automatisierte Suite, 35 Tests)

Login falsch/richtig/Rate-Limit · Auth-Pflicht überall · kein `?key=` ·
State-Bindung/Replay/Falsch-State · Erst-Login → Bundle vollständig
(access/refresh/expiresAt/refreshExpiresAt/scope/open_id) · Status ohne
Bundle-Overwrite · Access-Token-Ablauf → Refresh mit **Rotation** (RT1→RT2)
· API-Call direkt nach Refresh · späterer Call ohne Doppel-Refresh ·
zweite Rotation · **parallele Requests → genau ein Refresh** ·
Refresh-Token abgelaufen → ehrlicher Reconnect-Status · Disconnect
(Revoke + Löschung) · Reconnect · CORS-Fremd-Origin · keine Tokens/Secrets
in Antworten oder URLs · PubMed-Adapter · Sync ohne D1 → 501 · Logout.
Zusätzlich ein Browser-Integrationstest (Frontend ↔ echter Worker-Code):
Login-UI, Connect, Callback, Status, API-Snapshot-Merge, Logout.

## 7. KI-Unterstützung (optional)

`js/config.js → growth.ai`: eigener Proxy-`endpoint` (empfohlen, analog
`proxy/food-vision-worker.js`) **oder** `apiKey` (nur mit Spend-Limit — auf
einer statischen Seite öffentlich sichtbar!). Ohne Konfiguration sind die
KI-Buttons nicht vorhanden — es gibt nur die klar gekennzeichnete Status-Zeile.
Alle KI-Ausgaben sind als **KI-VORSCHLAG** markiert und nie als Datenquelle.

## 8. Privates Repository (§4)

Aktuell: öffentliches Repo, GitHub Pages auf `main`, Custom Domain
`malemetrix.de`. **GitHub Pages aus privaten Repos erfordert GitHub Pro** —
nicht blind umstellen. Sicherer Migrationspfad, falls gewünscht:
1. GitHub Pro aktivieren ODER Deployment auf Cloudflare Pages umziehen
   (Build aus privatem Repo, DNS-CNAME umstellen — Ausfallfrei, da DNS-TTL).
2. Erst danach Repo auf privat stellen und Pages-Deployment verifizieren.
Bis dahin gilt: keine Secrets/Nutzerdaten im Repo (ist bereits erfüllt),
`_src/` bleibt un-versioniert.

## 9. Troubleshooting

| Problem | Ursache/Lösung |
|---|---|
| „Worker nicht erreichbar“ | Worker nicht deployt oder `apiBase` falsch; `curl -X POST <apiBase>/auth/login -d '{"password":"…"}' -H "content-type: application/json"` testen |
| 401 unauthorized | Session abgelaufen (12 h) — im System-Tab neu anmelden; oder ADMIN_PASSWORD falsch |
| „Ungültiger State“ | OAuth-Fenster > 10 Min offen — neu verbinden |
| Token abgelaufen | Worker refresht automatisch; nach 365 Tagen Refresh-Ablauf neu verbinden |
| CSV wird falsch gemappt | Mapping im Wizard manuell korrigieren (Dropdown je Spalte) |
| Zahlen mit Punkt/Komma | Parser versteht `1.234` und `92,50` (deutsches Format) |
| Daten weg | Ohne D1-Sync sind Growth-OS-Daten gerätegebunden — Backup regelmäßig exportieren; mit D1-Sync: „Cloud → dieses Gerät“ (System → Daten) |
| Zugangscode ändern | Hash erzeugen (Kommando in `config.js`-Kommentar) → `growth.accessHash` |

## 10. Datenschutz (§75)

Datenminimierung: keine personenbezogenen Fremddaten; nur eigene Account-
Kennzahlen. **Speicherorte ehrlich benannt:**
- **Ohne D1 (Standard): Local-only** — alle Growth-OS-Daten ausschließlich
  im Browser dieses Geräts.
- **Mit aktivem D1-Sync:** zusätzlich serverseitig in der eigenen
  Cloudflare-D1-Datenbank: `kv_backup` (gepushter Growth-OS-Datenbestand)
  sowie `account_snapshots`/`video_snapshots` (per Cron erfasste
  TikTok-Zeitreihen). Das UI (System → Daten) zeigt das an.

**Getrennte Löschung** (System → Daten):
- „Nur lokale Daten löschen“ — localStorage dieses Geräts.
- „Cloud-Daten löschen“ — löscht `kv_backup`; auf Nachfrage zusätzlich die
  TikTok-Snapshot-Zeitreihen (beides über `/api/sync/delete`, Scopes
  `backup`/`timeseries`/`all`).
- „Alle Daten überall löschen“ — Cloud komplett + lokal.

TikTok-Verbindung jederzeit widerrufbar (Revoke serverseitig; Token-Bundle
wird im Durable Object gelöscht). Der Worker loggt keine Tokens. Keine
Änderung der öffentlichen Datenschutzerklärung nötig, solange nur Ural
selbst das interne Tool nutzt.

## 11. API-Limits & Regeln

TikTok-Regeln sind bewusst **Daten** (System → Plattform-Regeln) mit Quelle +
Verifikationsdatum; das Dashboard warnt ab 90 Tagen ohne Verifikation (§95).
Display-API-Limits: Videoliste max. 20/Aufruf (Cursor-Pagination im Worker
vorbereitet). Access Token 24 h / Refresh 365 d (geprüft 2026-07-20).
