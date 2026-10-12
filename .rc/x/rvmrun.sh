#!/usr/bin/env bash
# Round 1318 runner review (never committed; sent as .rc/x/rvmrun.sh).
#   bash .rc/x/rvmrun.sh <ID> fast   in place: mutate, the round's three unit files and simSaveKeeper, restore (use #!serial)
#   bash .rc/x/rvmrun.sh <ID> sag    own worktree: mutate, simSoccerAwardGenerations (M0 = no mutation, the baseline)
# Last line: "MUTATION <ID> CAUGHT by ..." (exit 0), "MUTATION <ID> SURVIVED ..." (exit 3), or ABORTED (exit 2).
ID=$1; MODE=$2; R=$PWD; X=$R/.rc/x; L=${RUNNER_TEMP:-/tmp}/rv-$ID-$MODE; mkdir -p "$L"
if [ "$MODE" = fast ]; then
  node "$X/rvmut.mjs" "$ID" . || { git checkout -- src scripts; echo "MUTATION $ID ABORTED"; exit 2; }
  node_modules/.bin/vitest run src/test/soccerBallonPoolReadAsAbsent.test.tsx src/test/soccerBallonPoolNameClash.test.tsx src/test/soccerCareerAwardGenerations.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$L/vitest.log" 2>&1; v=$?
  grep -E "Test Files |Tests |FAIL |AssertionError|Error:" "$L/vitest.log" | head -14 | cut -c1-220
  node scripts/simSaveKeeper.mjs > "$L/keeper.log" 2>&1; k=$?
  tail -3 "$L/keeper.log" | cut -c1-260
  git checkout -- src scripts
  left=$(git status --short -- src scripts | wc -l)
  echo "restored: $left files left changed under src and scripts"
  by=""; [ $v -ne 0 ] && by="$by vitest(exit $v)"; [ $k -ne 0 ] && by="$by simSaveKeeper(exit $k)"
  if [ -n "$by" ]; then echo "MUTATION $ID CAUGHT by$by"; exit 0; else echo "MUTATION $ID SURVIVED vitest(exit 0) simSaveKeeper(exit 0)"; exit 3; fi
fi
W=/tmp/rvw-$ID
git worktree add -q --detach "$W" HEAD || { echo "MUTATION $ID ABORTED: worktree"; exit 2; }
ln -s "$R/node_modules" "$W/node_modules"
if [ "$ID" != M0 ]; then node "$X/rvmut.mjs" "$ID" "$W" || { echo "MUTATION $ID ABORTED"; exit 2; }; fi
cd "$W" && SOCCER_AWARD_GENERATIONS_OUT="$L/out" node scripts/simSoccerAwardGenerations.mjs > "$L/sag.log" 2>&1; s=$?
grep -v "^ok " "$L/sag.log" | tail -24 | cut -c1-300
if [ "$ID" = M0 ]; then echo "BASELINE M0 simSoccerAwardGenerations exit $s"; exit $s; fi
if [ $s -ne 0 ]; then echo "MUTATION $ID CAUGHT by simSoccerAwardGenerations(exit $s)"; exit 0; else echo "MUTATION $ID SURVIVED simSoccerAwardGenerations(exit 0)"; exit 3; fi
