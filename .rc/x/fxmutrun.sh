#!/usr/bin/env bash
# Round 1105 fixer: apply one mutation, run the named gates, restore. usage: bash .rc/x/fxmutrun.sh <id> <gate>...
# Exits 0 only when EVERY named gate went red under the mutation (that is the proof the gate sees it).
m="$1"; shift
mkdir -p "$RC_OUT"
node .rc/x/fxmut.mjs apply "$m" || { echo "MUT $m: APPLY FAILED"; exit 9; }
res=""
survived=0
for g in "$@"; do
  log="$RC_OUT/mut-$m-$g.log"
  case "$g" in
    search) node_modules/.bin/vitest run src/test/collegeGridSearchMemory.test.ts --testTimeout=300000 --hookTimeout=120000 > "$log.full" 2>&1; rc=$? ;;
    fc) node_modules/.bin/vitest run src/test/collegeGridFailClosed.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$log.full" 2>&1; rc=$? ;;
    engine) node_modules/.bin/vitest run src/test/gridEngineSource.test.ts --testTimeout=300000 --hookTimeout=120000 > "$log.full" 2>&1; rc=$? ;;
    shipped) node scripts/simCollegeGridShipped.mjs > "$log.full" 2>&1; rc=$? ;;
    walk) npm run build > "$log.build" 2>&1; node scripts/playCollegeGridFirstTap.mjs > "$log.full" 2>&1; rc=$?; rm -f "$log.build" ;;
    *) echo "unknown gate $g" > "$log.full"; rc=99 ;;
  esac
  sed 's/\x1b\[[0-9;]*m//g' "$log.full" | grep -v '^\s*$' | grep -E 'FAIL|×|→|red|RED|Tests|fired|expected|Error|memory search|SURNAME|ORDER|RETRY|FAILED LOAD|surname' | cut -c1-300 | head -30 > "$log"
  rm -f "$log.full"
  res="$res $g=$rc"
  if [ "$rc" = "0" ]; then survived=1; fi
done
node .rc/x/fxmut.mjs restore "$m"
echo "dirty tracked files after restore: $(git status --porcelain --untracked-files=no | wc -l)"
if [ "$survived" = "1" ]; then echo "MUT $m:$res SURVIVED A GATE"; exit 1; fi
echo "MUT $m:$res every named gate went red"
