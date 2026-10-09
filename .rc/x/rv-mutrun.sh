#!/usr/bin/env bash
# Reviewer mutation run (never committed): bash .rc/x/rv-mutrun.sh <id>
# Applies one mutation, runs the round's harness and its vitest files, restores the checkout, prints one verdict line last.
ID="$1"
node .rc/x/rv-mutate.mjs "$ID" || { echo "MUT $ID: NOT APPLIED"; exit 2; }
git diff --stat | tail -2
node scripts/simUsSeasonCentre.mjs > "/tmp/rv-mut-$ID-sim.txt" 2>&1
SIM=$?
grep -E "^FAIL" "/tmp/rv-mut-$ID-sim.txt" | cut -c1-240 | head -8
tail -1 "/tmp/rv-mut-$ID-sim.txt"
node_modules/.bin/vitest run src/test/usSeasonNfl.test.ts src/test/usSeason.test.ts src/test/usSeasonCentre.test.tsx src/test/usSeasonCentreEntry.test.tsx --testTimeout=300000 --hookTimeout=120000 > "/tmp/rv-mut-$ID-vt.txt" 2>&1
VT=$?
grep -E "FAIL|✗|×| failed" "/tmp/rv-mut-$ID-vt.txt" | cut -c1-240 | head -8
git checkout -- src scripts
LEFT=$(git status --porcelain --untracked-files=no | grep -v "^?? " | grep -c -v "\.rc/\|\.github/" || true)
echo "MUT $ID: sim exit=$SIM vitest exit=$VT (left dirty: $LEFT)"
