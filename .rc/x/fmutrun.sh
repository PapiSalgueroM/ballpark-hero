#!/usr/bin/env bash
# The fixer's mutation runner (Round 1228). Runs on the GitHub runner only, one at a time (#!serial).
#   bash .rc/x/fmutrun.sh <mutation>   apply, run the round's harness and its two vitest files, restore
# Exit 0 when the ROUND'S OWN gates caught it (and says which), 1 when it survived both, 2 when it could not be
# applied or the tree was not restored. "clean" applies nothing and must be green on both (exit 0 then too).
set -u
m=$1
if [ "$m" != clean ]; then
  node .rc/x/fmut.mjs "$m" > "$RC_OUT/m-$m.txt" 2>&1 || { cat "$RC_OUT/m-$m.txt"; git checkout -- src scripts; exit 2; }
fi
node scripts/simCmLeaguePhase.mjs > "$RC_OUT/m-$m-sim.txt" 2>&1; a=$?
node_modules/.bin/vitest run src/lib/leagueSlate.test.ts src/lib/uclLeaguePhase.test.ts --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/m-$m-vitest.txt" 2>&1; b=$?
git checkout -- src scripts
git diff --quiet -- src scripts || { echo "NOT RESTORED"; exit 2; }
{
  echo "harness exit=$a: $(tail -1 "$RC_OUT/m-$m-sim.txt")"
  grep -m3 '^  FAIL' "$RC_OUT/m-$m-sim.txt" | cut -c1-220
  echo "vitest exit=$b: $(sed 's/\x1b\[[0-9;]*m//g' "$RC_OUT/m-$m-vitest.txt" | grep -E 'Tests|FAIL|AssertionError' | head -5 | tr '\n' ' ' | cut -c1-400)"
} >> "$RC_OUT/m-$m.txt"
first=$(grep -m1 '^  FAIL' "$RC_OUT/m-$m-sim.txt" | cut -c1-150)
if [ "$m" = clean ]; then
  echo "clean: harness=$a vitest=$b | $(tail -1 "$RC_OUT/m-$m-sim.txt" | cut -c1-90)"
  [ $a -eq 0 ] && [ $b -eq 0 ]; exit $?
fi
if [ $a -ne 0 ] || [ $b -ne 0 ]; then verdict=CAUGHT; else verdict=SURVIVED; fi
echo "$m: harness=$a vitest=$b => $verdict |$first"
[ "$verdict" = CAUGHT ]
