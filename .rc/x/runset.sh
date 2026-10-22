#!/usr/bin/env bash
# Round 1539 review (runner only). usage: bash .rc/x/runset.sh <mutation id> <check>...
# Applies the mutation, runs each named check, prints its exit and closing lines, restores the tree.
# Exit: the number of checks that stayed GREEN (exit 0) under the mutation; 90+ when the mutation could not apply.
set -u
ID="$1"; shift
node .rc/x/mutrun.mjs "$ID" || { git checkout -- src scripts; exit 92; }
git diff --stat | tail -2
GREEN=0
for C in "$@"; do
  L="/tmp/mut-$ID-$C.log"
  case "$C" in
    away) node scripts/simTycoonAwayMatchdays.mjs > "$L" 2>&1 ;;
    help) node scripts/simTycoonHelp.mjs > "$L" 2>&1 ;;
    headings) node scripts/simGuideHeadings.mjs > "$L" 2>&1 ;;
    search) node scripts/simSiteSearch.mjs > "$L" 2>&1 ;;
    vaway) node_modules/.bin/vitest run src/test/tycoonAway.test.tsx --testTimeout=300000 > "$L" 2>&1 ;;
    vhelp) node_modules/.bin/vitest run src/test/tycoonHelp.test.tsx --testTimeout=300000 > "$L" 2>&1 ;;
    plant) ONLY=/stadium-tycoon BASE=http://localhost:9 node scripts/playFirstVisitDialogs.mjs > "$L" 2>&1 ;;
    *) echo "unknown check $C"; continue ;;
  esac
  E=$?
  [ "$E" = 0 ] && GREEN=$((GREEN + 1))
  echo "== $ID $C exit=$E"
  grep -E "RED S|FAIL|ABORTED|red|×|✗|Tests |did not|no longer|differs|stale" "$L" | grep -v "^ *ok " | head -6 | cut -c1-260
  tail -2 "$L" | cut -c1-260
done
git checkout -- src scripts
git status --short | head -3
echo "MUTATION $ID: $GREEN of $# checks stayed green"
exit $GREEN
