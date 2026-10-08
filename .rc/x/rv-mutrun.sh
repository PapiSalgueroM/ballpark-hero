#!/usr/bin/env bash
# rv-mutrun.sh (review scratch, never committed). On the runner: apply one mutation, run the named checks side by
# side on the mutated tree, print "check exit=N | last line" for each, restore the tree.
#   bash .rc/x/rv-mutrun.sh <id> <check>...      checks: sense vitest career awards
set -u
ID="$1"; shift
node .rc/x/rv-mut.mjs "$ID" || { echo "mutation $ID refused"; exit 2; }
OUT="${RC_OUT:-/tmp}"
pids=()
for c in "$@"; do
  T="${RUNNER_TEMP:-/tmp}/mut-$ID-$c"; mkdir -p "$T"
  case "$c" in
    sense) cmd="SENSE_OTHERS=20 node scripts/simNbaAwardsSense.mjs" ;;
    vitest) cmd="node_modules/.bin/vitest run src/test/nbaAwardDecisionLift.test.ts src/test/nbaOldSaveLines.test.ts src/test/nbaStatLineColumns.test.ts --testTimeout=300000 --hookTimeout=120000" ;;
    career) cmd="node scripts/simNbaCareer.mjs" ;;
    awards) cmd="node scripts/simAwards.mjs" ;;
    *) echo "unknown check $c"; continue ;;
  esac
  ( export TMPDIR="$T" TEMP="$T" TMP="$T"; bash -c "$cmd" > "$OUT/mut$ID-$c.full" 2>&1; echo $? > "$OUT/mut$ID-$c.code" ) &
  pids+=("$!")
done
for p in "${pids[@]}"; do wait "$p"; done
node .rc/x/rv-mut.mjs restore
worst=0
for c in "$@"; do
  code=$(cat "$OUT/mut$ID-$c.code" 2>/dev/null || echo 99)
  last=$(sed 's/\x1b\[[0-9;]*m//g' "$OUT/mut$ID-$c.full" | grep -v '^\s*$' | tail -1 | cut -c1-200)
  echo "mut$ID $c exit=$code | $last"
  if [ "$c" = "sense" ]; then grep -E '^red sections|FAIL' "$OUT/mut$ID-$c.full" | cut -c1-330 | head -12; fi
  if [ "$c" = "vitest" ]; then sed 's/\x1b\[[0-9;]*m//g' "$OUT/mut$ID-$c.full" | grep -E 'Test Files|Tests |FAIL|AssertionError' | cut -c1-240 | head -12; fi
  tail -c 60000 "$OUT/mut$ID-$c.full" > "$OUT/mut$ID-$c.log"; rm -f "$OUT/mut$ID-$c.full" "$OUT/mut$ID-$c.code"
  [ "$code" != "0" ] && worst=1
done
git status --short -- src scripts | head -5
echo "mutation $ID: $([ $worst = 1 ] && echo CAUGHT || echo SURVIVED) (a check went red: $worst)"
exit $worst
