#!/bin/sh
# ci_post_clone.sh — Vorbereitung fuer Xcode Cloud.
#
# WARUM ES DIESEN WEG GIBT
# Der Weg ueber GitHub Actions braucht einen App-Store-Connect-API-Schluessel
# (.p8). Dessen Download bei Apple schlaegt manchmal fehl — und er wird nur
# EINMAL angeboten. Xcode Cloud braucht keinen: Apple signiert dort mit der
# eigenen Infrastruktur. Beide Wege bauen dasselbe Ergebnis; welcher benutzt
# wird, entscheidet APP.md.
#
# Xcode Cloud fuehrt dieses Skript direkt nach dem Klonen aus, BEVOR es das
# Xcode-Projekt anfasst. Genau hier muss das Web-Bundle entstehen, sonst
# baut Xcode eine App mit leerem Inhalt.
#
# Ort: Apple sucht "ci_scripts" im Ordner des Xcode-Projekts — also hier
# neben App.xcodeproj, nicht im Wurzelverzeichnis des Repositorys.

set -e

echo "→ Repository: $CI_PRIMARY_REPOSITORY_PATH"
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Die Xcode-Cloud-Images bringen kein Node mit. Homebrew ist vorhanden.
if ! command -v node > /dev/null 2>&1; then
  echo "→ Node wird installiert"
  export HOMEBREW_NO_AUTO_UPDATE=1
  export HOMEBREW_NO_INSTALL_CLEANUP=1
  brew install node
fi
echo "→ Node $(node -v), npm $(npm -v)"

echo "→ Abhaengigkeiten"
npm ci

# Die Fachtests laufen hier mit: ein roter Test soll den Build stoppen,
# bevor Apple Rechenzeit fuer eine kaputte App verbraucht.
echo "→ Fachtests"
node tools-dev/tests/native-app.test.js
node tools-dev/tests/decide.test.js
node tools-dev/tests/health-energy.test.js

echo "→ Web-Bundle bauen und in das Xcode-Projekt syncen"
node scripts/build-app.mjs
npx cap sync ios

echo "→ Fertig. Xcode uebernimmt."
