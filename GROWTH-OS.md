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
Worker ausgelagert und dort durch ein Secret (`ADMIN_KEY`) + Rate-Limit geschützt.

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
| `missions` | `{ "YYYY-MM-DD": {missionKey: true} }` |
| `rules` | platform_rules `{id, name, value, source, verified}` (§94) |
| `recs` | Recommendation Memory `{date, ideaId, title, composite, preset}` (§86) |
| `settings` | Gewichtungs-Preset/Custom-Weights (versioniert), Monatsziel, Defaults |
| `log` | Audit-Log (max. 300 Einträge, keine Secrets) |

Migrationsprinzip: Neue Felder werden defensiv gelesen (`get(key, fallback)`),
Format-Änderungen erhöhen `version` im Backup-Export.

## 4. Score-System (§9/§10/§93)

- **Viral / Growth / Reward Score:** Mittel der 0–10-Faktoren × 10, danach
  **±10 Historien-Anpassung** aus echten Account-Daten (Median des Themas vs.
  Account-Median: Views→Viral, Follower/1k→Growth, RPM→Reward). Anpassung nur
  ab ≥ 3 vergleichbaren Videos; Confidence NIEDRIG/MITTEL/HOCH nach Datenlage.
  Jede Zahl zeigt ihre Grundlage an (§85).
- **Opportunity Score:** gewichtete Summe (Viral/Growth/Reward/Brand),
  Presets MAX GROWTH / MAX REWARD / MAX VIRALITY / BALANCED / AUTHORITY oder
  eigene Gewichte; Gewichte sind Daten, nicht Code (versioniert).
- **Do-Not-Produce (§38):** blockiert bei Fit ≤ 3, Konkurrenz ≥ 8 ohne
  Differenzierung, medizinischem Risiko HIGH, Gesamtscore < 40 oder fehlender
  neuer Erkenntnis — mit Begründung.
- **Kalibrierung (§87):** „Skript erzeugen“ aus dem Dashboard merkt sich die
  Empfehlung; sobald ≥ 5 empfohlene Ideen mit verknüpften Video-Ergebnissen
  existieren, zeigt das Dashboard die Trefferquote (prognostiziertes Tier vs.
  tatsächliches Tier aus normalisierten Views).

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
Access Token 24 h, Refresh Token 365 Tage, Refresh-Rotation berücksichtigt).

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
   wrangler secret put ADMIN_KEY            # Wert: langes Zufallspasswort (selbst wählen)
   wrangler deploy
   ```
   → Worker-URL notieren, z. B. `https://mm-tiktok.<name>.workers.dev`.
3. **Redirect-URI** in der TikTok-App eintragen:
   `https://mm-tiktok.<name>.workers.dev/auth/callback`
4. **`js/config.js`** → `growth.tiktok`:
   `apiBase: "https://mm-tiktok.<name>.workers.dev"`, `adminKey: "<ADMIN_KEY>"` → committen.
5. Growth OS → System → **„TikTok verbinden“** → TikTok-Login → fertig.
   Trennen jederzeit über „Trennen“ (Token wird serverseitig widerrufen — DSGVO §75).

**Sicherheit:** Tokens nur in Workers KV; der Browser erhält nie Tokens,
nur aufbereitete Zahlen. CSRF-State (10 Min TTL), Rate-Limit 60 Req/10 Min/IP,
CORS auf `malemetrix.de`. Hinweis: Der `adminKey` in `config.js` ist im
öffentlichen Repo sichtbar — er schützt nur den Lese-Proxy (Profil/Videoliste),
nicht das TikTok-Konto; Schreiben/Posten ist ohne Audit ohnehin nicht möglich.
Wer das nicht möchte, betreibt das Repo privat (s. u.) oder lässt Level 1–2 weg.

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
| „Worker nicht erreichbar“ | Worker nicht deployt oder `apiBase` falsch; `curl <apiBase>/api/status -H "x-admin-key: …"` testen |
| 401 unauthorized | `adminKey` in config.js ≠ Worker-Secret `ADMIN_KEY` |
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
