#!/usr/bin/env bash
# Reviewer's mutation runner (Round 1228, the run lens). Runs on the GitHub runner only, one at a time.
#   bash .rc/x/rmutrun.sh <mutation>            apply, run the round's own gates and the reviewer's probe, restore
#   bash .rc/x/rmutrun.sh <variation> only <n>  apply a harness variation, run section <n> alone, restore
# Mutation mode: exit 0 when the ROUND'S OWN gates (its harness or its two vitest files) caught it,
# 1 when it survived both, 2 when it could not be applied or the tree was not restored.
set -u
m=$1
mode=${2:-full}
node .rc/x/rmut.mjs "$m" > "$RC_OUT/m-$m.txt" 2>&1 || { cat "$RC_OUT/m-$m.txt"; git checkout -- src scripts; exit 2; }
if [ "$mode" = only ]; then
  CM_LEAGUE_PHASE_ONLY=$3 node scripts/simCmLeaguePhase.mjs > "$RC_OUT/v-$m.txt" 2>&1; a=$?
  git checkout -- src scripts
  git diff --quiet -- src scripts || { echo "NOT RESTORED"; exit 2; }
  grep -E "THE MEASUREMENT|counting floor|most clubs|set [0-9]+:|FAIL" "$RC_OUT/v-$m.txt" | cut -c1-260
  echo "$m: section $3 exit=$a | $(tail -1 "$RC_OUT/v-$m.txt" | cut -c1-110)"
  exit $a
fi
node scripts/simCmLeaguePhase.mjs > "$RC_OUT/m-$m-sim.txt" 2>&1; a=$?
node_modules/.bin/vitest run src/lib/leagueSlate.test.ts src/lib/uclLeaguePhase.test.ts --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/m-$m-vitest.txt" 2>&1; b=$?
node .rc/x/rprobe.mjs 0.25 > "$RC_OUT/m-$m-probe.txt" 2>&1; c=$?
git checkout -- src scripts
git diff --quiet -- src scripts || { echo "NOT RESTORED"; exit 2; }
{
  echo "harness exit=$a: $(tail -1 "$RC_OUT/m-$m-sim.txt")"
  grep -m3 '^  FAIL' "$RC_OUT/m-$m-sim.txt" | cut -c1-200
  echo "vitest exit=$b: $(sed 's/\x1b\[[0-9;]*m//g' "$RC_OUT/m-$m-vitest.txt" | grep -E 'Tests|FAIL|AssertionError' | head -4 | tr '\n' ' ' | cut -c1-300)"
  echo "reviewer's probe exit=$c: $(tail -1 "$RC_OUT/m-$m-probe.txt")"
  grep -m2 '^  FAULT' "$RC_OUT/m-$m-probe.txt" | cut -c1-240
} >> "$RC_OUT/m-$m.txt"
if [ $a -ne 0 ] || [ $b -ne 0 ]; then verdict=CAUGHT; else verdict=SURVIVED; fi
echo "$m: harness=$a vitest=$b probe=$c => $verdict by the round's own gates"
[ "$verdict" = CAUGHT ]
