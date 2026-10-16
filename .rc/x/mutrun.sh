#!/usr/bin/env bash
# Review of Round 1508 (run lens): apply one mutation, run the harnesses that hold adopted careers, restore.
# Exit 0 = the mutation SURVIVED (every harness green), 1 = CAUGHT, 2 = the mutation could not be applied.
M=$1
node .rc/x/mut.mjs "$M" || { git checkout -- src scripts; echo "MUT $M: ABORTED (anchor not found)"; exit 2; }
git diff --stat | tail -2
B=$(bash .rc/x/baseDeck.sh)
CM_UNSEEDED_BASE=$B node scripts/simCmUnseededWorld.mjs > /tmp/mu-$M.log 2>&1; a=$?
tail -4 /tmp/mu-$M.log | cut -c1-400
node scripts/simCmOldCareersWorld.mjs > /tmp/mo-$M.log 2>&1; b=$?
tail -4 /tmp/mo-$M.log | cut -c1-400
node_modules/.bin/vitest run src/lib/clubManagerWorldMoves.test.ts src/lib/clubManagerWorldRoster.test.ts --testTimeout=300000 --hookTimeout=120000 > /tmp/mv-$M.log 2>&1; c=$?
grep -E "Tests |FAIL" /tmp/mv-$M.log | head -8 | cut -c1-300
git checkout -- src scripts
if [ $a -eq 0 ] && [ $b -eq 0 ] && [ $c -eq 0 ]; then echo "MUT $M: SURVIVED, every harness green (unseeded=$a oldworld=$b vitest=$c)"; exit 0; fi
echo "MUT $M: CAUGHT (unseeded=$a oldworld=$b vitest=$c)"; exit 1
