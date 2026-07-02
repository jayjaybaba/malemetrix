# Foto-Kalorienschätzung aktivieren (5 Minuten, kostenlos)

Der Dinner-Planer kann Essen fotografieren und Kalorien + Protein schätzen
lassen (Claude Vision). Damit dein API-Schlüssel **geheim** bleibt, läuft die
Anfrage über einen kleinen Proxy (Cloudflare Worker, kostenloser Tarif reicht
locker — 100.000 Anfragen/Tag inklusive).

Du brauchst nur zwei Accounts und musst nichts programmieren — alles ist
Copy-Paste.

---

## Schritt 1 — Anthropic-API-Schlüssel erstellen (~2 Min)

1. Gehe auf **https://console.anthropic.com** und melde dich an (bzw. erstelle
   ein Konto und lade ein kleines Guthaben auf, z. B. 5 $).
2. Links unter **API Keys → Create Key** einen Schlüssel erstellen und
   kopieren (beginnt mit `sk-ant-…`). Er wird nur einmal angezeigt.
3. **Wichtig:** Unter **Settings → Limits** ein monatliches Ausgabenlimit
   setzen (z. B. 5 $). Ein Foto kostet ~0,2–0,4 Cent — 5 $ sind also über
   1.000 Fotos.

## Schritt 2 — Cloudflare Worker anlegen (~3 Min)

1. Gehe auf **https://dash.cloudflare.com** (kostenloses Konto reicht).
2. Links **Workers & Pages → Create → Create Worker** → Name z. B.
   `malemetrix-food-vision` → **Deploy** (erst mal mit dem Beispielcode).
3. Auf **Edit code** klicken, den gesamten Beispielcode löschen und den
   kompletten Inhalt von **`proxy/food-vision-worker.js`** aus diesem Repo
   einfügen → **Deploy**.
4. Zurück zur Worker-Übersicht → **Settings → Variables and Secrets →
   Add**:
   - Type: **Secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: dein Schlüssel aus Schritt 1 (`sk-ant-…`)
   - **Deploy/Save**
5. Die Worker-URL kopieren, sie sieht so aus:
   `https://malemetrix-food-vision.DEINNAME.workers.dev`

## Schritt 3 — URL in die Website eintragen (~30 Sek)

In **`js/config.js`** die Worker-URL beim Feld `endpoint` eintragen:

```js
foodVision: {
  apiKey: "",                                                    // leer lassen!
  endpoint: "https://malemetrix-food-vision.DEINNAME.workers.dev",
  model: "claude-haiku-4-5"
},
```

Speichern, committen, pushen — fertig. Auf der Dinner-Planer-Seite erscheint
jetzt der Foto-Button 📸.

---

## Häufige Fragen

**Ist mein Schlüssel jetzt sicher?**
Ja. Er liegt nur als Secret im Cloudflare Worker, nie im Website-Code. Der
Worker akzeptiert zusätzlich nur Anfragen von deiner Domain, nur das günstige
Haiku-Modell und deckelt die Antwortlänge — Missbrauch lohnt sich nicht.
Das Spend-Limit aus Schritt 1 ist die zweite Sicherung.

**Was kostet das?**
Cloudflare: 0 €. Anthropic: ~0,2–0,4 Cent pro Foto (Haiku-Vision).

**Eigene Domain statt workers.dev?**
Optional: Im Worker unter **Settings → Domains & Routes** z. B.
`vision.malemetrix.de` verbinden und diese URL in `config.js` eintragen.

**Andere Domain als malemetrix.de?**
Im Worker-Code oben die Zeile mit `malemetrix\.de` an deine Domain anpassen.
