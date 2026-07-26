#!/usr/bin/env bash
# =============================================================================
# MaleMetrix — Premium-Klartext und Alt-Schlüssel aus der Git-History entfernen
# -----------------------------------------------------------------------------
# WARUM: BUILD.md hält seit Längerem fest, dass frühere Commits den Klartext der
# bezahlten Inhalte enthalten. Das wurde in dieser Sitzung praktisch bestätigt —
# `git show <alter-commit>:_src/ultimate-stack-content.html` liefert ihn aus.
# Solange das Repository öffentlich ist, nützt der beste Vault nichts.
#
# DIESES SKRIPT LÄUFT NICHT AUTOMATISCH. Es schreibt die geteilte History um und
# erfordert einen Force-Push — beides bewusste Entscheidungen des Eigentümers.
#
# VORAUSSETZUNGEN
#   * git-filter-repo installiert   (pip install git-filter-repo)
#   * ein frisches, vollständiges Klon (KEIN shallow clone)
#   * niemand arbeitet parallel auf main/master
#   * ein Backup des Repos
#
# NACH DEM LAUF ZWINGEND: Zugangscode rotieren (siehe Schritt 5). Die alte
# History bleibt in Forks, Klonen und im GitHub-Cache erhalten — der alte Code
# muss deshalb als kompromittiert gelten.
# =============================================================================
set -euo pipefail

echo "==> 0/5  Sicherheitsabfrage"
read -r -p "History unwiderruflich umschreiben und force-pushen? (tippe: JA) " a
[ "$a" = "JA" ] || { echo "abgebrochen."; exit 1; }

echo "==> 1/5  Vollständige History sicherstellen"
git fetch --unshallow 2>/dev/null || git fetch --all --tags

echo "==> 2/5  Backup-Branch anlegen"
git branch "backup/pre-purge-$(date +%Y%m%d-%H%M%S)" || true

echo "==> 3/5  Premium-Klartexte aus der gesamten History entfernen"
git filter-repo --force \
  --path _src --invert-paths \
  --path OPTIMIERUNGEN.md --invert-paths

echo "==> 4/5  Alt-Schlüssel aus allen Blobs streichen"
# Ersetzt die historisch ausgelieferten Client-Schlüssel durch einen Platzhalter.
cat > /tmp/mm-secrets.txt <<'SECRETS'
MMD-A3DFF4F6159A8C288578F44B==>[ENTFERNT]
SECRETS
git filter-repo --force --replace-text /tmp/mm-secrets.txt
rm -f /tmp/mm-secrets.txt

echo "==> 5/5  Nächste Schritte (MANUELL, nicht automatisierbar)"
cat <<'NEXT'
  a) Remote neu setzen (filter-repo entfernt ihn absichtlich):
       git remote add origin <REPO-URL>
  b) Force-Push auf BEIDE Branches:
       git push --force origin main
       git push --force origin master
  c) Zugangscode rotieren — der alte gilt ab jetzt als kompromittiert:
       node tools-dev/vault.mjs encrypt _src/protokoll-content.html <NEUER-CODE>
       node tools-dev/vault.mjs encrypt _src/course-data.js        <NEUER-CODE>
     Payloads in ebooks/protokoll.html bzw. kurs-programm.html einsetzen.
  d) Neuen Code an bestehende Käufer ausliefern, BEVOR der alte abgeschaltet
     wird (Reihenfolge schützt Alt-Kunden — siehe SECURITY.md).
  e) Im GitHub-UI: Repository auf privat stellen ODER prüfen, ob Forks
     existieren. Forks behalten die alte History.
NEXT
echo "fertig."
