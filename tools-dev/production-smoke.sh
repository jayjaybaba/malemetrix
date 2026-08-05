#!/usr/bin/env bash
# ============================================================================
# MaleMetrix — Produktions-Smoke: misst die Live-Seite, statt sich zu erinnern.
#
# Prüft in einem Lauf:
#   1. Kernseiten antworten mit HTTP 200
#   2. Edge Functions auf aktuellem Stand (delegiert an check-functions.sh)
#   3. Anonyme RLS-Oberfläche: KEINE Nutzer-/Geld-Tabelle und kein RPC ist
#      ohne Anmeldung lesbar (erwartet 401) — ein 200 hier ist ein
#      Sicherheitsvorfall und bricht den Lauf sofort.
#   4. Service-Worker-Version live vs. Repo (nur WARNUNG — kurz nach einem
#      Push auf main ist eine Abweichung normal, bis Pages fertig gebaut hat)
#
# Aufruf:  bash tools-dev/production-smoke.sh
# Exit 0 = alles in Ordnung · Exit 1 = mindestens ein harter Fehler.
# Läuft täglich per GitHub Action (.github/workflows/production-smoke.yml);
# ein roter Lauf erzeugt die übliche GitHub-Fehlerbenachrichtigung.
# ============================================================================
set -uo pipefail

BASE="${SMOKE_BASE:-https://www.malemetrix.com}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0

echo "MaleMetrix Produktions-Smoke — $(date -u +%Y-%m-%dT%H:%MZ) — $BASE"
echo

# --- 1. Kernseiten ----------------------------------------------------------
PAGES="index.html check.html tools.html tracker.html protokoll.html ebooks.html \
mein-protokoll.html anabole-matrix.html blog.html trust.html shop.html \
checkout.html faq.html coaching.html sitemap.xml"

echo "── Seiten"
for p in $PAGES; do
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$BASE/$p")"
  if [ "$code" = "200" ]; then
    printf "  OK   %-24s 200\n" "$p"
  else
    printf "  FAIL %-24s %s\n" "$p" "$code"; fail=1
  fi
done
echo

# --- 2. Edge Functions ------------------------------------------------------
echo "── Edge Functions"
if bash "$ROOT/tools-dev/check-functions.sh" >/tmp/mm-smoke-fn.txt 2>&1; then
  echo "  OK   alle Functions auf aktuellem Stand"
else
  echo "  FAIL check-functions.sh meldet Abweichungen:"; cat /tmp/mm-smoke-fn.txt; fail=1
fi
echo

# --- 3. Anonyme RLS-Oberfläche ----------------------------------------------
# Der Publishable Key ist öffentlich (steht in js/config.js, wird an jeden
# Besucher ausgeliefert) — genau mit ihm muss die Tür zu sein.
SUPA_URL="$(grep -o 'supabaseUrl: *"[^"]*"' "$ROOT/js/config.js" | head -1 | sed 's/.*"\(.*\)"/\1/')"
SUPA_KEY="$(grep -o 'supabasePublishableKey: *"[^"]*"' "$ROOT/js/config.js" | head -1 | sed 's/.*"\(.*\)"/\1/')"

echo "── Anonyme RLS-Proben (erwartet: 401 überall)"
if [ -z "$SUPA_URL" ] || [ -z "$SUPA_KEY" ]; then
  echo "  FAIL supabaseUrl/PublishableKey nicht aus js/config.js lesbar"; fail=1
else
  TABLES="profiles entitlements score_results orders subscriptions os_state \
user_roles access_grants translations site_events score_events \
push_subscriptions commerce_events ai_request_log"
  for t in $TABLES; do
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 20 \
      "$SUPA_URL/rest/v1/$t?select=*&limit=1" \
      -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY")"
    if [ "$code" = "401" ]; then
      printf "  OK   %-20s 401 (zu)\n" "$t"
    else
      printf "  FAIL %-20s %s — Tabelle anonym erreichbar!\n" "$t" "$code"; fail=1
    fi
  done
  # Argumente MÜSSEN zur Signatur passen — sonst antwortet PostgREST mit 404
  # (Funktion nicht gefunden) statt mit der eigentlichen Berechtigungsantwort.
  RPCS="claim_access_code:{\"code\":\"smoke-test\"} translation_report:{} is_owner:{\"uid\":\"00000000-0000-0000-0000-000000000000\"}"
  for spec in $RPCS; do
    r="${spec%%:*}"; payload="${spec#*:}"
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 20 -X POST \
      "$SUPA_URL/rest/v1/rpc/$r" \
      -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" \
      -H "Content-Type: application/json" -d "$payload")"
    if [ "$code" = "401" ]; then
      printf "  OK   rpc/%-16s 401 (zu)\n" "$r"
    else
      printf "  FAIL rpc/%-16s %s — RPC anonym aufrufbar!\n" "$r" "$code"; fail=1
    fi
  done
fi
echo

# --- 4. Service-Worker-Version (nur Warnung) --------------------------------
echo "── Service-Worker-Version"
live_v="$(curl -s -m 20 "$BASE/sw.js" | grep -o 'mm-v[0-9]*' | head -1)"
repo_v="$(grep -o 'mm-v[0-9]*' "$ROOT/sw.js" | head -1)"
if [ -n "$live_v" ] && [ "$live_v" = "$repo_v" ]; then
  echo "  OK   live $live_v = Repo $repo_v"
else
  echo "  WARN live '$live_v' ≠ Repo '$repo_v' (nach frischem Push auf main normal; sonst prüfen)"
fi
echo

if [ "$fail" -eq 0 ]; then
  echo "ERGEBNIS: GRÜN — Seiten erreichbar, Functions aktuell, anonyme Tür zu."
else
  echo "ERGEBNIS: ROT — mindestens ein harter Fehler, Details oben."
fi
exit "$fail"
