#!/usr/bin/env bash
# reviewer wrapper (runner only): the harness on five seed sets its bands were NOT set from.
# The fixture has no such sets, so section 4's fixture checks must be red; any OTHER red is a band that was a coin toss.
name="$1"
git checkout -q -- src scripts
node .rc/x/mut.mjs "$name" || { echo "SEEDS $name: NOT APPLIED"; git checkout -q -- src scripts; exit 3; }
node scripts/simGmGameDay.mjs > "$RC_OUT/$name-sim.log" 2>&1; a=$?
git checkout -q -- src scripts
grep -E "^set [0-9]+:" "$RC_OUT/$name-sim.log" | cut -c1-330
grep -A 8 "^MEASURED" "$RC_OUT/$name-sim.log" | cut -c1-330
total=$(grep -c "FAIL (section" "$RC_OUT/$name-sim.log")
fixture=$(grep "FAIL (section 4)" "$RC_OUT/$name-sim.log" | grep -c -E "the fixture is of this fleet|is the recorded one|kept seasons are played")
echo "--- reds that are not the fixture's:"
grep "FAIL (section" "$RC_OUT/$name-sim.log" | grep -v -E "the fixture is of this fleet|is the recorded one|kept seasons are played" | cut -c1-260
tail -1 "$RC_OUT/$name-sim.log"
echo "SEEDS $name: harness exit=$a, reds $total, of them the fixture's own $fixture, others $((total - fixture))"
exit 0
