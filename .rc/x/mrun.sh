#!/usr/bin/env bash
# Reviewer mutation runner: apply one mutation, run the round's harness and its two unit files, restore.
id="$1"
L=/tmp/mut-$id
mkdir -p "$L"
if ! node .rc/x/mut.mjs "$id"; then git checkout -- src scripts; echo "MUT $id: ABORT (anchor missing)"; exit 2; fi
git diff --stat | tail -3
node scripts/simBingoClubCounts.mjs > "$L/sim.log" 2>&1
h=$?
echo "--- harness FAIL lines ($(grep -c 'FAIL:' "$L/sim.log")):"
grep 'FAIL:' "$L/sim.log" | head -6 | cut -c1-240
tail -1 "$L/sim.log"
node_modules/.bin/vitest run src/test/clubCareerAdditions.test.ts src/test/playerBingoClubCounts.test.ts > "$L/vt.log" 2>&1
v=$?
echo "--- vitest:"
grep -E 'Tests |FAIL ' "$L/vt.log" | head -8 | cut -c1-200
git checkout -- src scripts
git status --short src scripts | head -3
if [ "$h" -ne 0 ] || [ "$v" -ne 0 ]; then echo "MUT $id: CAUGHT harness=$h vitest=$v"; exit 1; fi
echo "MUT $id: SURVIVED harness=$h vitest=$v"
exit 0
