# MaleMetrix — Build & Premium-Quellschutz

## Warum dieses Dokument
Die Premium-Inhalte (DAS PROTOKOLL, 12-Wochen-Programm, weitere bezahlte Ebooks)
werden **verschlüsselt** ausgeliefert: In den Seiten steht nur ein
AES-256-GCM-Vault (`<script type="application/json" id="...Vault">`). Der
Zugangscode ist der Schlüssel (PBKDF2-SHA256, 150k Iterationen) und steht
nirgends im ausgelieferten Code.

Der **Klartext** dieser Inhalte liegt in `_src/`. Dieses Verzeichnis ist
**per `.gitignore` aus dem öffentlichen Repo genommen** und gehört in einen
privaten Build-Kontext (lokal oder privates Repo/Storage).

## Wichtig: was das schützt — und was nicht
- ✅ Die **Live-Site** (GitHub Pages) liefert nur den verschlüsselten Vault aus.
  `_src/` wird von Jekyll ohnehin ignoriert (Verzeichnis mit `_`) und ist jetzt
  zusätzlich nicht mehr getrackt.
- ✅ **Künftige** Änderungen an Premium-Klartext landen nicht mehr im
  öffentlichen Repo.
- ⚠️ **Git-History:** Frühere Commits enthalten den Klartext weiterhin. Ein
  vollständiger Schutz erfordert **eine der beiden** Maßnahmen (bewusste
  Entscheidung, hier nicht eigenmächtig ausgeführt):
  1. **Repository auf privat stellen** (schützt sofort alles inkl. History), oder
  2. **History bereinigen** (z. B. `git filter-repo --path _src --invert-paths`)
     und danach die Zugangscodes rotieren — schreibt die geteilte History um.

## Vault regenerieren (nach inhaltlichen Änderungen in `_src/`)
```bash
# Verschlüsseln (Payload-JSON auf stdout):
node tools-dev/vault.mjs encrypt _src/protokoll-content.html PROTOKOLL-M
# Ausgabe in den passenden <script id="protoVault"> ... </script>-Block einsetzen.

# Prüfen (Klartext zurück):
node tools-dev/vault.mjs decrypt <payload.json> PROTOKOLL-M
```

| Premium-Seite (Vault)        | Quelle in `_src/`              | Vault-Script-ID   |
|------------------------------|-------------------------------|-------------------|
| `ebooks/protokoll.html`      | `protokoll-content.html`      | `protoVault`      |
| `kurs-programm.html`         | `course-data.js`              | `courseVault`     |
| `ebooks/master-ebook.html`   | `master-content.html`         | (siehe Seite)     |
| `ebooks/ultimate-stack.html` | `ultimate-stack-content.html` | (siehe Seite)     |
| `intern.html`                | `intern-content.html`         | (siehe Seite)     |

> Klartext und Vault gehören zusammen: Nach jeder inhaltlichen Änderung
> in `_src/` den zugehörigen Vault neu erzeugen und einsetzen.
