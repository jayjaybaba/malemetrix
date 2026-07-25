#!/usr/bin/env bash
# ============================================================================
# MaleMetrix — Score-Telemetrie ausrollen (ein Befehl).
#
# Was das tut:
#   1. Vorprüfung: liegen Migration, Function und Validierung im Repo?
#   2. Migration einspielen  (Tabelle score_events, RLS ohne Policy)
#   3. Edge Function deployen (score-telemetry, verify_jwt=false via config.toml)
#   4. Nachprüfen: nimmt der Live-Endpunkt ein gültiges Testevent an?
#
# Was du brauchst (beides NUR in deiner Umgebung, niemals im Repo):
#   export SUPABASE_ACCESS_TOKEN=sbp_...        # Account → Access Tokens
#   export SUPABASE_DB_PASSWORD=...             # Projekt → Database → Password
#
# Aufruf:  bash tools-dev/deploy-telemetry.sh
#          bash tools-dev/deploy-telemetry.sh --verify-only
# ============================================================================
set -uo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-vczhfyxltiyvtvppfodt}"
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"
ORIGIN="https://www.malemetrix.com"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUPA="npx --yes supabase@latest"

say() { printf "\n\033[1m%s\033[0m\n" "$*"; }

verify() {
  say "4) Live-Prüfung des Endpunkts"
  local ts payload code body
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  # Ein einziges, synthetisches Event. Enthält bewusst keinerlei Nutzerdaten.
  payload="{\"v\":1,\"events\":[{\"event_id\":\"$(openssl rand -hex 8)\",\"score_session_id\":\"$(openssl rand -hex 8)\",\"event_name\":\"score_started\",\"score_version\":\"v2\",\"client_ts\":\"$ts\",\"device_class\":\"desktop\",\"visible_question_count\":50}]}"
  body="$(curl -s -m 25 -X POST "$BASE/score-telemetry" \
    -H "content-type: application/json" -H "origin: $ORIGIN" --data "$payload")"
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 25 -X POST "$BASE/score-telemetry" \
    -H "content-type: application/json" -H "origin: $ORIGIN" --data "$payload")"

  echo "   HTTP $code — $body"
  case "$code" in
    200) echo "   ✅ Endpunkt nimmt gültige Events an."
         echo "   Hinweis: Beide Testaufrufe nutzen dieselbe event_id — der zweite"
         echo "   wird per Idempotenz verworfen. Genau so soll es sein." ;;
    404) echo "   ❌ Function nicht gefunden — Deploy hat nicht gegriffen." ; return 1 ;;
    400) echo "   ❌ Validierung lehnt das Testevent ab — validate.mjs prüfen." ; return 1 ;;
    *)   echo "   ❌ Unerwartete Antwort." ; return 1 ;;
  esac

  say "Auswertung ab jetzt:"
  echo "   SUPABASE_URL=https://${PROJECT_REF}.supabase.co \\"
  echo "   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \\"
  echo "   node tools-dev/score-calibration.mjs --days 30"
}

if [ "${1:-}" = "--verify-only" ]; then verify; exit $?; fi

say "1) Vorprüfung"
for f in "supabase/migrations/20260725000010_score_telemetry.sql" \
         "supabase/functions/score-telemetry/index.ts" \
         "supabase/functions/score-telemetry/validate.mjs" \
         "supabase/config.toml"; do
  if [ -f "$ROOT/$f" ]; then echo "   ✓ $f"; else echo "   ✗ FEHLT: $f"; exit 1; fi
done
grep -q "functions.score-telemetry" "$ROOT/supabase/config.toml" \
  && echo "   ✓ config.toml: verify_jwt=false gesetzt" \
  || { echo "   ✗ config.toml: Eintrag [functions.score-telemetry] fehlt"; exit 1; }
node "$ROOT/tools-dev/tests/score-telemetry.test.js" >/dev/null 2>&1 \
  && echo "   ✓ Telemetrie-Tests grün" \
  || { echo "   ✗ Telemetrie-Tests rot — erst reparieren, dann deployen"; exit 1; }

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  cat <<'EOF'

   ✗ SUPABASE_ACCESS_TOKEN fehlt.

     Der Token gehört ausschließlich in deine Shell, nie ins Repository:
       export SUPABASE_ACCESS_TOKEN=sbp_...
       export SUPABASE_DB_PASSWORD=...
     Danach dieses Skript erneut starten.
EOF
  exit 1
fi

say "2) Migration einspielen"
cd "$ROOT" || exit 1
$SUPA link --project-ref "$PROJECT_REF" >/dev/null 2>&1 || true
if $SUPA db push; then echo "   ✓ Migration eingespielt"; else
  echo "   ✗ Migration fehlgeschlagen. Alternative: Inhalt von"
  echo "     supabase/migrations/20260725000010_score_telemetry.sql im SQL-Editor ausführen."
  exit 1
fi

say "3) Function deployen"
if $SUPA functions deploy score-telemetry --project-ref "$PROJECT_REF"; then
  echo "   ✓ score-telemetry deployt"
else
  echo "   ✗ Deploy fehlgeschlagen"; exit 1
fi

verify
