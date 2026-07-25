#!/usr/bin/env bash
# ============================================================================
# MaleMetrix — Live-Status der Edge Functions messen statt dokumentieren.
#
# Warum: EDGE_FUNCTIONS.md hat monatelang „Deploy nötig" behauptet, obwohl der
# Code längst ausgerollt war. Eine Doku, die den Produktionsstand falsch
# beschreibt, kostet irgendwann eine Stunde Panik oder einen unnötigen Redeploy.
# Dieses Skript fragt die Produktion, statt sich zu erinnern.
#
# Erkennungsmerkmal: Der P10-Standard (_shared/edge.mjs) antwortet auf einen
# OPTIONS-Preflight mit der Header-Allowlist "authorization, apikey,
# x-client-info, content-type". Fehlt sie, läuft ein älterer Stand.
# Nicht deployte Functions liefern beim POST 404 NOT_FOUND.
#
# Aufruf:  bash tools-dev/check-functions.sh
# ============================================================================
set -uo pipefail

BASE="${SUPABASE_FUNCTIONS_URL:-https://vczhfyxltiyvtvppfodt.supabase.co/functions/v1}"
ORIGIN="https://www.malemetrix.com"
FUNCS="mm-commerce resolve-product-access mm-ai delete-account score-telemetry send-brief"

printf "MaleMetrix — Edge Functions, live gemessen (%s)\n" "$(date -u +%Y-%m-%dT%H:%MZ)"
printf "%-26s %-10s %s\n" "FUNCTION" "STATUS" "BEFUND"
printf -- "------------------------------------------------------------------------\n"

fail=0
for f in $FUNCS; do
  hdrs="$(curl -s -i -m 20 -X OPTIONS "$BASE/$f" \
      -H "origin: $ORIGIN" \
      -H "access-control-request-method: POST" \
      -H "access-control-request-headers: authorization,apikey,content-type" 2>/dev/null)"
  allow="$(printf '%s' "$hdrs" | grep -i '^access-control-allow-headers' | tr -d '\r' | cut -d: -f2-)"
  acao="$(printf '%s' "$hdrs" | grep -i '^access-control-allow-origin' | tr -d '\r ' | cut -d: -f2-)"

  # POST ohne Body: 404 = Function existiert nicht, alles andere = vorhanden
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 20 -X POST "$BASE/$f" \
      -H "content-type: application/json" -H "origin: $ORIGIN" --data '{}' 2>/dev/null)"

  if [ "$code" = "404" ]; then
    printf "%-26s %-10s %s\n" "$f" "FEHLT" "nicht deployt (POST → 404)"
    fail=1
  elif [ "$f" = "send-brief" ]; then
    # Scheduler-Function: wird server→server mit x-scheduler-secret aufgerufen.
    # Sie hat bewusst KEINE Browser-CORS-Header — das ist kein Mangel.
    printf "%-26s %-10s %s\n" "$f" "AKTIV" "Scheduler-Function, CORS bewusst nicht vorgesehen"
  elif printf '%s' "$allow" | grep -qi "x-client-info" && [ "$acao" = "$ORIGIN" ]; then
    printf "%-26s %-10s %s\n" "$f" "AKTUELL" "P10-Allowlist + Origin-Spiegelung aktiv"
  else
    printf "%-26s %-10s %s\n" "$f" "ALT?" "deployt, aber ohne P10-Header (allow:${allow:- keine})"
    fail=1
  fi
done

printf -- "------------------------------------------------------------------------\n"
if [ "$fail" = "0" ]; then
  echo "Alles auf aktuellem Stand."
else
  echo "Mindestens eine Function braucht Aufmerksamkeit — siehe EDGE_FUNCTIONS.md."
fi
# Exit 0 auch bei Befunden: das hier ist ein Bericht, kein CI-Gate.
exit 0
