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
        └── proxy/tiktok-oauth-worker.js  Cloudflare Worker (NICHT deployt) für
                                          TikTok OAuth + API — Tokens nur serverseitig
```

**Grundsatzentscheidung (nach Code-Audit):** Die Website ist eine statische
GitHub-Pages-Seite ohne Backend. Deshalb ist das Growth OS **local-first**
gebaut: Alle Nutzerdaten (Videos, Kennzahlen, Ideen, Skripte, Einstellungen)
liegen ausschließlich im `localStorage` des Geräts (Prefix `mm_gos_*`) —
identisch zum bewährten Muster von Training-/Kalorien-Tracker. Im (öffentlichen)
Repository liegen nur App-Code und Stammdaten, **niemals** Nutzerdaten, Tokens
oder Secrets. Die TikTok-API-Anbindung läuft ausschließlich über einen eigenen
Cloudflare Worker (Tokens in Workers KV, serverseitig).

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
| 0 | Cold Start | 100 % Selbsteinschätzung (0–10-Faktoren) |
| 1 | ≥ 3 vergleichbare Videos zum Thema | Historie fließt ein |
| 2 | Search-/Trend-Signal an der Idee verknüpft | Signal-Marker |
| 3 | wachsende Datenbasis (≥ 15 Videos gesamt) | Daten-Gewicht bis 60 % |
| 4 | Kalibrierung aktiv (≥ 5 Prognosen mit Ergebnis) | Trefferquote < 50 % ⇒ Daten-Gewicht bis 75 % |

**Blend je Dimension:** `score = (1−wD)·Selbsteinschätzung + wD·Historie`,
`wD = min(0.6, n·0.05)` (+0.15 bei schlechter Kalibrierung, Cap 0.75).
Historie = Themen-Perzentil unter allen eigenen Videos (Viral: Views ·
Growth: Follower/1k · Reward: RPM). Jede Idee zeigt Stage, Gewichte und
Datengrundlage offen an (§85); Confidence NIEDRIG/MITTEL/HOCH nach n.

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
   App-Name z. B. „MaleMetrix Growth OS“. Produkte hinzufügen: **Login Kit**.
   Scopes beantragen: `user.info.basic`, `user.info.stats`, `video.list`.
   → Nach App-Review kopieren: **Client Key** und **Client Secret**.
2. **Cloudflare Worker:** (Konto auf dash.cloudflare.com, kostenloser Plan reicht)
   ```bash
   npm i -g wrangler && wrangler login
   cd proxy
   wrangler kv namespace create TOKENS      # ID in wrangler.toml eintragen
   # wrangler.toml anlegen (Vorlage im Kopf von tiktok-oauth-worker.js)
   wrangler secret put TT_CLIENT_KEY        # Wert: Client Key aus Schritt 1
   wrangler secret put TT_CLIENT_SECRET     # Wert: Client Secret aus Schritt 1
   wrangler secret put ADMIN_PASSWORD       # langes Zufallspasswort — NUR hier, nie im Repo/Frontend
   wrangler deploy
   ```
   → Worker-URL notieren, z. B. `https://mm-tiktok.<name>.workers.dev`.
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
- **Token-Lifecycle:** Ein Bundle in KV, `lastSync` in separatem Key —
  kein Codepfad kann ein veraltetes Bundle zurückschreiben. Paralleler
  Refresh über Lock mit Besitz-Verifikation + Fallback-Re-Read.
- **Rate-Limits:** Login 5/10 Min/IP, gesamt 120/10 Min/IP.
- Optionale Zusatz-Härtung ohne Code: **Cloudflare Access** vor die
  Worker-Route legen (Zero-Trust-Login zusätzlich zur App-Session).

### 6b. Phase 2: zentrale Daten, Auto-Snapshots, Cron (optional)

Gleicher Worker, plus D1 — kein zusätzlicher Anbieter:
```bash
cd proxy
wrangler d1 create mm-growth                       # database_id in wrangler.toml
wrangler d1 execute mm-growth --file=schema.sql    # Migration v1
# in wrangler.toml zusätzlich: [[d1_databases]] binding="DB" … und [triggers] crons=["0 5 * * *"]
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
| Daten weg | Growth-OS-Daten sind gerätegebunden — Backup regelmäßig exportieren (System → Daten) |
| Zugangscode ändern | Hash erzeugen (Kommando in `config.js`-Kommentar) → `growth.accessHash` |

## 10. Datenschutz (§75)

Datenminimierung: keine personenbezogenen Fremddaten; nur eigene Account-
Kennzahlen. Alles lokal; Export (JSON) und vollständige Löschung eingebaut.
TikTok-Verbindung jederzeit widerrufbar (Revoke serverseitig). Der Worker
loggt keine Tokens. Keine Änderung der öffentlichen Datenschutzerklärung
nötig, solange nur Ural selbst das interne Tool nutzt.

## 11. API-Limits & Regeln

TikTok-Regeln sind bewusst **Daten** (System → Plattform-Regeln) mit Quelle +
Verifikationsdatum; das Dashboard warnt ab 90 Tagen ohne Verifikation (§95).
Display-API-Limits: Videoliste max. 20/Aufruf (Cursor-Pagination im Worker
vorbereitet). Access Token 24 h / Refresh 365 d (geprüft 2026-07-20).
