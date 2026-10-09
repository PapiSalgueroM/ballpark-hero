#!/usr/bin/env bash
# Reviewer's mutant runner for Round 1146 (never committed). usage: bash .rc/x/rvmut.sh <id> <og|ui|legs>
# Copies the committed tree into a scratch folder, applies ONE mutation there, runs the round's gates for that
# group, and ends with one line: MUTANT <id> KILLED by: <names>   or   MUTANT <id> SURVIVED.
ID="$1"; GROUP="$2"
SRC="$PWD"
W="${TMPDIR:-/tmp}/w-$ID"
mkdir -p "$W"
git archive HEAD | tar -x -C "$W" || { echo "MUTANT $ID SETUP FAILED (archive)"; exit 4; }
ln -s "$SRC/node_modules" "$W/node_modules"
cd "$W" || exit 4
node .rc/x/rvmut.mjs "$ID" || { echo "MUTANT $ID NOT APPLIED"; exit 3; }
V="node_modules/.bin/vitest run --testTimeout=300000 --hookTimeout=120000"
NAMES=(); CMDS=()
add() { NAMES+=("$1"); CMDS+=("$2"); }
case "$GROUP" in
  og)
    add simCmOwnGoals "node scripts/simCmOwnGoals.mjs"
    add simMatchDetail "node scripts/simMatchDetail.mjs"
    add simLiveMatch "node scripts/simLiveMatch.mjs"
    add simLiveSim "node scripts/simLiveSim.mjs"
    add simCmMatchCentre "node scripts/simCmMatchCentre.mjs"
    add simAwardRaces "node scripts/simAwardRaces.mjs"
    add vitest "$V src/test/managerPenaltyMarkers.test.tsx src/test/managerScorerMarks.test.tsx src/test/liveSimMotion.test.tsx"
    ;;
  ui)
    add vitest "$V src/test/managerPenaltyMarkers.test.tsx src/test/managerScorerMarks.test.tsx src/test/liveSimMotion.test.tsx src/test/liveSimCelebration.test.tsx"
    add simCmMatchCentre "node scripts/simCmMatchCentre.mjs"
    add simMatchScreen "node scripts/simMatchScreen.mjs"
    add simLiveSim "node scripts/simLiveSim.mjs"
    add simMatchDetail "node scripts/simMatchDetail.mjs"
    add simCmOwnGoals "node scripts/simCmOwnGoals.mjs"
    ;;
  legs)
    add simCmQuickLegs "node scripts/simCmQuickLegs.mjs"
    add simCmQuickSubs "node scripts/simCmQuickSubs.mjs"
    add simClubManager "node scripts/simClubManager.mjs"
    add vitest "$V src/test/managerQuickSimLegs.test.tsx"
    ;;
  shared)
    add simSoccerOwnGoals "CAREERS=120 SEEDSET=0 node scripts/simSoccerOwnGoals.mjs"
    add simCmOwnGoals "node scripts/simCmOwnGoals.mjs"
    add vitest "$V src/test/seasonCentreOwnGoals.test.tsx src/test/seasonCore.test.ts src/test/managerScorerMarks.test.tsx"
    ;;
  *) echo "MUTANT $ID SETUP FAILED (group $GROUP)"; exit 4 ;;
esac
killed=""
for i in "${!CMDS[@]}"; do
  echo "=== RUN ${NAMES[$i]} :: ${CMDS[$i]}"
  bash -c "${CMDS[$i]}" > "$W/.rv-out.log" 2>&1; rc=$?
  sed 's/\x1b\[[0-9;]*m//g' "$W/.rv-out.log" | grep -v '^\s*$' | grep -i -E 'fail|red|✗|×|not ok|error|expected|AssertionError' | head -n 14 | cut -c1-300
  echo "--- tail"
  sed 's/\x1b\[[0-9;]*m//g' "$W/.rv-out.log" | grep -v '^\s*$' | tail -n 6 | cut -c1-300
  echo "=== EXIT $rc :: ${NAMES[$i]}"
  [ "$rc" -ne 0 ] && killed="$killed ${NAMES[$i]}"
done
if [ -n "$killed" ]; then echo "MUTANT $ID KILLED by:$killed"; else echo "MUTANT $ID SURVIVED"; fi
exit 0
