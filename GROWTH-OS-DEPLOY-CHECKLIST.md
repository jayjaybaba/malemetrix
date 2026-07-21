# Growth OS — Deploy-Checkliste (am Computer fortsetzen)

Kurzform für den Rechner. Ausführliche Erklärungen: `GROWTH-OS.md` §6.

## ✅ Schon erledigt (TikTok + Cloudflare-Vorbereitung)

- TikTok-Developer-App **„MaleMetrix"** erstellt (Status: Draft).
- Produkt **Login Kit** hinzugefügt.
- Scopes hinzugefügt: **`user.info.basic`**, **`user.info.stats`**, **`video.list`**
  (kein „needs review“-Blocker).
- Cloudflare: KV-Namespace **`TOKENS`** + leerer Worker **`mm-tiktok`** angelegt
  (über Dashboard). ⚠️ Der **echte Worker-Code ist noch NICHT deployt** —
  das macht `wrangler deploy` unten.
- **Bereithalten:** Client Key + Client Secret aus der TikTok-App.

## 🖥️ Am Computer — der Reihe nach

```bash
git clone https://github.com/jayjaybaba/malemetrix.git
cd malemetrix/proxy
cp wrangler.toml.example wrangler.toml

npm i -g wrangler
wrangler login                       # Browser → Cloudflare-Login

# KV-ID des schon angelegten Namespaces holen:
wrangler kv namespace list           # in der Ausgabe den Eintrag "TOKENS" suchen, dessen id kopieren
# (falls nicht auffindbar: wrangler kv namespace create TOKENS  → gibt neue id)
```

→ In `proxy/wrangler.toml` die Zeile `id = "REPLACE_WITH_KV_NAMESPACE_ID"`
mit der kopierten id ersetzen, speichern. Dann:

```bash
wrangler deploy                      # deployt den echten Code inkl. Durable Object
#  → Ausgabe zeigt die Worker-URL:  https://mm-tiktok.<dein-name>.workers.dev

wrangler secret put TT_CLIENT_KEY    # Client Key einfügen
wrangler secret put TT_CLIENT_SECRET # Client Secret einfügen
wrangler secret put ADMIN_PASSWORD   # selbst gewähltes starkes Passwort = Growth-OS-Login
```

**Health-Check** (muss `{"error":"unauthorized"}` liefern — heißt: Worker lebt,
Auth greift):
```bash
curl -s https://mm-tiktok.<dein-name>.workers.dev/api/status
```

## 🔗 Danach (TikTok-App + Website)

1. **TikTok-App** → Login Kit → **„Configure for Web"** aktivieren →
   Redirect-URI setzen: **`https://mm-tiktok.<dein-name>.workers.dev/auth/callback`**
   → Save.
2. **Sandbox** für die App anlegen/aktivieren und dein **eigenes TikTok-Konto**
   als Target-User hinzufügen (damit Login ohne volle App-Review funktioniert).
3. **`js/config.js`** → `growth.tiktok.apiBase = "https://mm-tiktok.<dein-name>.workers.dev"`
   → committen + live deployen (sw-VERSION bumpen, s. §J im HANDOFF).
4. **Smoke-Test:** `malemetrix.de/admin/growth/` → Tab **System** →
   mit `ADMIN_PASSWORD` anmelden → **„TikTok verbinden"** → nach Login zeigt
   **Status** deine echten Follower/Likes/Videoanzahl → **„API-Snapshot"**
   (Tab Videos) zieht deine Videoliste. Dabei P2 prüfen: liefert
   `/api/videos` echte `view_count/like_count`? Falls Feld-Fehler:
   Felderliste in `ttVideoPage()` anpassen.

## Wenn etwas hakt
Fehlermeldung / Screenshot an Claude → gezielter Fix. Worker-URL ist
unkritisch (darf in den Chat); **Client Secret & ADMIN_PASSWORD niemals**.
