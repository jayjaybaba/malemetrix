# Growth OS — Deploy-Checkliste (kinderleicht, ohne Wrangler)

Am **Computer im Browser** (nicht am iPhone). Nur Klicks + Kopieren/Einfügen.
Kein Programm installieren, kein „Terminal“, kein Wrangler nötig.

## ✅ Schon erledigt

- TikTok-App **„MaleMetrix"** (Draft), Produkt **Login Kit**, Scopes
  **`user.info.basic`**, **`user.info.stats`**, **`video.list`**.
- Cloudflare: KV-Namespace **`TOKENS`** + Worker **`mm-tiktok`** angelegt.
  → Am Computer mit **demselben Cloudflare-Konto** einloggen, dann sind
  beide schon da.
- **Bereithalten:** Client Key + Client Secret aus der TikTok-App.

Hinweis: Wir lassen den „Durable Object“ weg — der Worker hat dafür einen
eingebauten, getesteten Ersatz. Für einen einzelnen Nutzer (dich) ist das
völlig gleichwertig.

## 🖱️ Teil A — Echten Code in den Worker (Klicks)

1. Browser-Tab öffnen, diese Adresse eingeben (das ist der fertige Code):
   `https://raw.githubusercontent.com/jayjaybaba/malemetrix/main/proxy/tiktok-oauth-worker.js`
2. In den Text klicken → **alles markieren** (Windows: `Strg`+`A`, Mac: `Cmd`+`A`)
   → **kopieren** (`Strg`/`Cmd`+`C`).
3. Auf **dash.cloudflare.com** → **Workers & Pages** → **mm-tiktok** öffnen →
   **„Edit code"**. Den alten Beispiel-Code **komplett löschen**, deinen
   Code **einfügen** (`Strg`/`Cmd`+`V`) → oben rechts **„Deploy"**.

## 🔌 Teil B — KV-Speicher verbinden

4. Im Worker **mm-tiktok** → **„Settings"** → **„Bindings"** →
   **„Add binding"** → **„KV namespace"**:
   - Variable name: **`TOKENS`** (genau so schreiben)
   - KV namespace: **TOKENS** auswählen → **Save**.

## 🔑 Teil C — 3 Passwörter (Secrets) eintragen

5. Gleiche Settings-Seite → **„Variables and Secrets"** → **„Add"** →
   Typ **„Secret"**, dreimal (Namen exakt so, Groß/Klein beachten):
   - `TT_CLIENT_KEY` → dein Client Key
   - `TT_CLIENT_SECRET` → dein Client Secret
   - `ADMIN_PASSWORD` → **selbst ausgedachtes starkes Passwort** — das ist
     dein Login fürs Growth OS, gut merken!
6. Nochmal **„Edit code" → „Deploy"** (damit alles aktiv wird).

## 🌐 Teil D — Worker-URL testen

7. Oben auf der mm-tiktok-Seite steht die **URL**:
   `https://mm-tiktok.<dein-name>.workers.dev`
8. Diese URL + `/api/status` in einem neuen Tab öffnen, also:
   `https://mm-tiktok.<dein-name>.workers.dev/api/status`
   → Es muss **`{"error":"unauthorized"}`** erscheinen. Das ist GUT: heißt,
   der Worker lebt und die Absicherung greift.

➡️ **Jetzt die Worker-URL an Claude schicken.** Claude testet sie, gibt dir
die Redirect-URI und schaltet `apiBase` live.

## 🔗 Teil E — TikTok + Website (danach, teils mit Claude)

9. **TikTok-App** → Login Kit → **„Configure for Web"** an →
   Redirect-URI: **`https://mm-tiktok.<dein-name>.workers.dev/auth/callback`** → Save.
10. **Sandbox** der App aktivieren + dein **eigenes TikTok-Konto** als
    Target-User hinzufügen (dann Login ohne App-Review).
11. **`js/config.js`** → `growth.tiktok.apiBase` = deine Worker-URL →
    committen + live (macht Claude).
12. **Smoke-Test:** `malemetrix.de/admin/growth/` → Tab **System** → mit
    `ADMIN_PASSWORD` anmelden → **„TikTok verbinden"** → **Status** zeigt
    deine echten Zahlen → **„API-Snapshot"** zieht deine Videos.

## Wenn etwas hakt
Screenshot oder Fehlermeldung an Claude. Worker-URL darf in den Chat;
**Client Secret & ADMIN_PASSWORD niemals** teilen.

---

### (Nur falls du es doch per Kommandozeile willst — Alternative für Technische)
`git clone` des Repos → `cd proxy` → `cp wrangler.toml.example wrangler.toml`
→ `npm i -g wrangler` → `wrangler login` → KV-id via `wrangler kv namespace list`
in die toml → `wrangler deploy` → `wrangler secret put` für die 3 Secrets.
Details: `GROWTH-OS.md` §6. Dieser Weg nutzt zusätzlich den Durable Object.
