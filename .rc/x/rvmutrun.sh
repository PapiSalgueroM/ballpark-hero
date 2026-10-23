#!/usr/bin/env bash
# Round 1542 review (run lens): one mutation, the round's harness and the round's vitest files, then restore.
# Exit 1 = the mutation was CAUGHT (something went red), 0 = it SURVIVED (everything green), 2 = it did not apply.
K="$1"
O="${RC_OUT:-/tmp}"
mkdir -p "$O"
node .rc/x/rvmut.mjs "$K" || { git checkout -- src scripts; echo "MUT $K: DID NOT APPLY"; exit 2; }
git diff --stat | tail -2
node scripts/simNflSeasonStats.mjs > "$O/mut-$K-sim.txt" 2>&1; S=$?
node_modules/.bin/vitest run src/lib/nflSeasonStats.test.ts src/components/front-office/FrontOfficeSeasonStats.test.tsx src/lib/gmGameDayView.test.ts src/components/front-office-shared/GmGameDayCard.test.tsx src/components/front-office/FrontOfficePostseason.test.tsx src/components/front-office/FrontOfficeGameDay.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$O/mut-$K-vitest.txt" 2>&1; V=$?
git checkout -- src scripts
echo "--- sim reds:"; grep -E "^ *FAIL|FAIL " "$O/mut-$K-sim.txt" | head -8 | cut -c1-220
tail -2 "$O/mut-$K-sim.txt" | cut -c1-220
echo "--- vitest:"; grep -E "FAIL|Tests  " "$O/mut-$K-vitest.txt" | head -8 | cut -c1-220
if [ $S -ne 0 ] || [ $V -ne 0 ]; then echo "MUT $K: CAUGHT (sim exit=$S, vitest exit=$V)"; exit 1; fi
echo "MUT $K: SURVIVED (sim exit=$S, vitest exit=$V)"; exit 0
