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
# Verschlüsseln (Payload-JSON auf stdout) — <DEIN-CODE> durch den Zugangscode ersetzen:
node tools-dev/vault.mjs encrypt _src/protokoll-content.html <DEIN-CODE>
# Ausgabe in den passenden <script id="protoVault"> ... </script>-Block einsetzen.

# Prüfen (Klartext zurück):
node tools-dev/vault.mjs decrypt <payload.json> <DEIN-CODE>
```

| Premium-Seite (Vault)        | Quelle in `_src/`              | Vault-Script-ID   |
|------------------------------|-------------------------------|-------------------|
| `ebooks/protokoll.html`      | `protokoll-content.html`      | `protoVault`      |
| `kurs-programm.html`         | `course-data.js`              | `courseVault`     |
| `intern.html`                | `intern-content.html`         | (siehe Seite)     |

## EINE Quelle je Kapitel — nicht verhandelbar

`ebooks/protokoll.html` ist der **einzige** Ort, an dem Kapiteltext liegt.
Alle zehn Kapitel plus Abschluss stehen dort im `protoVault`.

Vorher gab es Kapitel 07 zweimal: als eigener Vault in
`ebooks/ultimate-stack.html` **und** im Protokoll. Beide Fassungen liefen
auseinander — Leser bekamen je nach Weg unterschiedliche Texte. Der eigene
Vault ist deshalb entfernt; die Seite ist jetzt eine Vorschau wie die neun
anderen Kapitelseiten.

`tools-dev/tests/visual-system.test.js` hält das fest: Genau eine Datei unter
`ebooks/` darf einen Vault tragen. Ein zweiter Kapitel-Vault lässt die Suite
scheitern. Wer Kapitelinhalt ändert, ändert ihn im Protokoll — nirgendwo sonst.

> Klartext und Vault gehören zusammen: Nach jeder inhaltlichen Änderung
> in `_src/` den zugehörigen Vault neu erzeugen und einsetzen.
