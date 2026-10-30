#!/usr/bin/env bash
# Reviewer mutation runner (run lens, 1587), extra file, never committed. usage: bash .rc/x/runmut.sh <K> <regen|plain>
# regen: the generators are rerun after the mutation (as a maintainer would), so only the INDEPENDENT checks can see it.
# plain: the committed artifacts stay, so the byte equality checks see it.
# Exit 0 = CAUGHT by at least one check, 1 = NOT CAUGHT (every check green), 2 = aborted. Restores the tree in all cases.
K=$1; MODE=$2
node .rc/x/mut.mjs "$K" || { echo "MUT $K ABORTED"; exit 2; }
if [ "$MODE" = regen ]; then
  node scripts/qa/genArsenalLedger1587.mjs 2>&1 | tail -2
  node scripts/qa/genClubNamesakes1587.mjs 2>&1 | tail -3
fi
git diff --stat | tail -4
node scripts/simClubNamesakes.mjs > /tmp/m-$K-$MODE.log 2>&1; s=$?
grep -E "FAIL|simClubNamesakes:|ok: R:|ok: the market payload|ok: [0-9]+ tripwire" /tmp/m-$K-$MODE.log | head -8
PGLITE_DIR=/tmp/pglM node scripts/qa/rehearseClubNamesakes1587.mjs > /tmp/r-$K-$MODE.log 2>&1; r=$?
grep -E "FAIL|rehearseClubNamesakes1587:" /tmp/r-$K-$MODE.log | head -4
node scripts/qa/genArsenalLedger1587.mjs --check > /dev/null 2>&1; l=$?
node scripts/qa/genClubNamesakes1587.mjs --check > /dev/null 2>&1; p=$?
git checkout -- scripts supabase src
if [ $s -eq 0 ] && [ $r -eq 0 ] && [ $l -eq 0 ] && [ $p -eq 0 ]; then v="NOT CAUGHT (every check green)"; e=1; else v="CAUGHT"; e=0; fi
echo "MUT $K $MODE: sim exit=$s rehearse exit=$r ledgerCheck exit=$l payloadCheck exit=$p: $v"
exit $e
