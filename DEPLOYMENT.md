# DEPLOYMENT — verbindliche Regeln

Stand: 24. Juli 2026

---

## Kanonischer Produktionsbranch

```
==================================================
PRODUKTION = main
GitHub Pages Quelle = main / root
==================================================
```

* **`main`** ist der einzige Branch, der die Produktion verändert.
  Ein Push auf `main` löst den GitHub-Pages-Build aus (`pages build and
  deployment`), die Seite ist danach typischerweise in 1–3 Minuten live.
* **`master`** ist nur noch ein **Kompatibilitäts-Spiegel**. Ein Push auf
  `master` **deployt nichts**. Er wird bis auf Weiteres mitgeführt, damit alte
  Lesezeichen, Klone und Verweise nicht ins Leere laufen — und **nicht**
  gelöscht.
* Der Repository-**Default-Branch ist Stand heute noch `master`** (siehe
  „Offener Punkt" unten). Das ändert nichts an der Deploy-Wahrheit: Pages
  hängt an `main`.

### Warum das hier steht

Am 24. Juli 2026 wurde Score V2 zuerst nur nach `master` gepusht. Der Commit
lag korrekt auf GitHub, es passierte aber **kein Deploy** — Pages baut aus
`main`. Weil beide Branches bis dahin synchron liefen, war der Unterschied
vorher nie sichtbar. Diese Datei existiert, damit dieser Irrtum kein zweites
Mal passiert.

---

## Normaler Deploy-Ablauf

```bash
# 1) Auf dem Arbeitsbranch entwickeln, testen, committen
for f in tools-dev/tests/*.test.js; do node "$f" || break; done

# 2) Fast-Forward nach main — DAS ist der Deploy
git push origin <arbeitsbranch>:main

# 3) Spiegel nachziehen (optional, deployt nichts)
git push origin <arbeitsbranch>:master

# 4) Deploy nachweisen — nicht raten
curl -sI https://www.malemetrix.com/js/check-data.js | grep -i last-modified
```

Regeln:

* **kein `--force`**, kein `reset --hard`, keine History-Umschreibung
* nur Fast-Forward-Pushes
* fremde, gleichzeitige Änderungen auf `main` werden **nicht** überschrieben —
  bei Divergenz erst `git fetch origin main` und sauber aufsetzen
* ein erfolgreicher `git push` ist **kein** Beleg für „live". Erst der
  ausgelieferte Inhalt zählt (Schritt 4).

---

## Deploy verifizieren

| Prüfung | Kommando |
|---|---|
| Pages-Build gelaufen? | `last-modified` der geänderten Datei prüfen (siehe oben) |
| Richtiger Stand ausgeliefert? | `curl -s <url>/js/check-data.js \| sha256sum` gegen die Repo-Datei |
| Neue Datei sichtbar? | HTTP-Status einer erst im neuen Commit angelegten Datei |

Die GitHub-Pages-Builds erscheinen in Actions als Workflow
`pages build and deployment`. Fehlt dort ein Lauf für den eigenen Commit,
wurde **nicht** deployt.

---

## Offener Punkt: Repository-Default-Branch

Der Default-Branch steht weiterhin auf `master` und sollte auf `main`
umgestellt werden (GitHub → Settings → Branches → Default branch).

**Technischer Blocker:** Aus der Agent-Umgebung ist das nicht möglich —
`PATCH /repos/jayjaybaba/malemetrix` wird vom Agent-Proxy abgelehnt:

```
HTTP 403 — "Repository settings writes are not permitted through this proxy."
```

Dasselbe gilt für die Pages-API (`POST /repos/.../pages/builds`,
`GET /repos/.../pages`) — sie ist ebenfalls gesperrt. Die Umstellung muss der
Owner einmalig im GitHub-UI vornehmen. Danach bleibt alles andere gleich:
Pages hängt bereits an `main`.

Nach der Umstellung zusätzlich prüfen:

* Pages-Quelle unverändert `main / root`
* offene Pull Requests zeigen auf `main`
* keine Automatisierung verweist noch auf `master`

---

## Was NICHT deployt

* Push auf `master` — Spiegel ohne Wirkung
* Push auf einen `claude/*`-Arbeitsbranch
* Supabase Edge Functions und Migrationen: die liegen im Repo, werden aber
  **manuell** ausgerollt (`supabase db push`, `supabase functions deploy …`) —
  siehe `EDGE_FUNCTIONS.md`. Ein Pages-Deploy rollt sie nicht mit aus.
