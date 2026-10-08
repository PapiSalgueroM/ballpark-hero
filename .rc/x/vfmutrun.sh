#!/usr/bin/env bash
# Round 1105 closing check: the reviewer's rvmutrun.sh (rc/r1105-rr4) with ONE added gate, "search", which is the
# vitest file the fix added. The mutations themselves are the reviewer's rvmut.mjs, unchanged.
# usage: bash .rc/x/vfmutrun.sh <id> <gate>...
m="$1"; shift
mkdir -p "$RC_OUT"
node .rc/x/rvmut.mjs apply "$m" || { echo "MUT $m: APPLY FAILED"; exit 9; }
res=""
VT="src/test/gridEngineSource.test.ts src/test/playerSearchLocal.test.ts src/test/collegeGridFailClosed.test.tsx src/test/collegeGridOffline.test.tsx"
for g in "$@"; do
  log="$RC_OUT/mut-$m-$g.log"
  case "$g" in
    vt) node_modules/.bin/vitest run $VT --testTimeout=300000 --hookTimeout=120000 > "$log.full" 2>&1; rc=$? ;;
    search) node_modules/.bin/vitest run src/test/collegeGridSearchMemory.test.ts --testTimeout=300000 --hookTimeout=120000 > "$log.full" 2>&1; rc=$? ;;
    shipped) node scripts/simCollegeGridShipped.mjs > "$log.full" 2>&1; rc=$? ;;
    page) node scripts/simCollegeGridPage.mjs > "$log.full" 2>&1; rc=$? ;;
    walk) npm run build > "$log.build" 2>&1; node scripts/playCollegeGridFirstTap.mjs > "$log.full" 2>&1; rc=$?; rm -f "$log.build" ;;
    *) echo "unknown gate $g" > "$log.full"; rc=99 ;;
  esac
  sed 's/\x1b\[[0-9;]*m//g' "$log.full" | grep -v '^\s*$' | grep -E 'FAIL|×|✓|→|red|green|RED|GREEN|Tests|fired|expected|Error|FINDING|SURNAME|ORDER|RETRY|FAILED LOAD|surname' | cut -c1-320 | head -40 > "$log"
  sed 's/\x1b\[[0-9;]*m//g' "$log.full" | grep -v '^\s*$' | cut -c1-320 | tail -25 > "$log.tail"
  rm -f "$log.full"
  res="$res $g=$rc"
done
node .rc/x/rvmut.mjs restore "$m"
echo "dirty tracked files after restore: $(git status --porcelain --untracked-files=no | wc -l)"
echo "MUT $m:$res"
