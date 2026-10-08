#!/usr/bin/env bash
# Round 1105 review: apply one mutation, run the named gates, restore. usage: bash .rc/x/rvmutrun.sh <id> <gate>...
m="$1"; shift
mkdir -p "$RC_OUT"
node .rc/x/rvmut.mjs apply "$m" || { echo "MUT $m: APPLY FAILED"; exit 9; }
res=""
VT="src/test/gridEngineSource.test.ts src/test/playerSearchLocal.test.ts src/test/collegeGridFailClosed.test.tsx src/test/collegeGridOffline.test.tsx"
for g in "$@"; do
  log="$RC_OUT/mut-$m-$g.log"
  case "$g" in
    vt) node_modules/.bin/vitest run $VT --testTimeout=300000 --hookTimeout=120000 > "$log.full" 2>&1; rc=$? ;;
    shipped) node scripts/simCollegeGridShipped.mjs > "$log.full" 2>&1; rc=$? ;;
    page) node scripts/simCollegeGridPage.mjs > "$log.full" 2>&1; rc=$? ;;
    compact) node scripts/genCollegeGridData.mjs --compact --check > "$log.full" 2>&1; rc=$? ;;
    tables) SIM_COLLEGE_TABLES_LIVE=off node scripts/simCollegeTables.mjs > "$log.full" 2>&1; rc=$? ;;
    walk) npm run build > "$log.build" 2>&1; node scripts/playCollegeGridFirstTap.mjs > "$log.full" 2>&1; rc=$?; rm -f "$log.build" ;;
    tsc) node_modules/.bin/tsc --noEmit -p tsconfig.app.json > "$log.full" 2>&1; rc=$? ;;
    *) echo "unknown gate $g" > "$log.full"; rc=99 ;;
  esac
  sed 's/\x1b\[[0-9;]*m//g' "$log.full" | grep -v '^\s*$' | grep -E 'FAIL|×|✓|→|red|green|RED|GREEN|Tests|fired|expected|Error|FINDING' | cut -c1-300 | head -40 > "$log"
  rm -f "$log.full"
  res="$res $g=$rc"
done
node .rc/x/rvmut.mjs restore "$m"
echo "dirty tracked files after restore: $(git status --porcelain --untracked-files=no | wc -l)"
echo "MUT $m:$res"
