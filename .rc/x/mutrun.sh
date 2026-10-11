#!/usr/bin/env bash
# Release AX review (engine-saves): apply one mutation, run every test and harness that could notice it, print one
# closing line "MUT <name>: <detector>=<exit> ...", restore the tree. Exit 0 always (the closing line is the result);
# exit 9 when the mutation was refused.   usage: bash .rc/x/mutrun.sh <M1|M2|M2b|M3|M4|M5>
m="$1"
export TMPDIR=$(mktemp -d)
node .rc/x/mut.mjs "$m" || { git checkout -- src scripts; echo "MUT $m: REFUSED"; exit 9; }
git diff --stat -- src | tail -1
res=""
run() {
  name="$1"; shift
  "$@" > "/tmp/mut-$m-$name.log" 2>&1; code=$?
  echo "--- $m $name exit=$code"
  grep -aE "FAIL|AssertionError|Error:|failed|red on|✗|×" "/tmp/mut-$m-$name.log" | head -6 | cut -c1-260
  tail -2 "/tmp/mut-$m-$name.log" | cut -c1-260
  res="$res $name=$code"
}
OFF="--require=$PWD/scripts/lib/offlineTransport.cjs"
case "$m" in
  M1|M2|M2b|M3)
    run pressUnits node_modules/.bin/vitest run src/lib/soccerCareerPress.test.ts src/test/soccerPressRoomUi.test.tsx src/test/soccerPressRoomReadAsAbsent.test.tsx --testTimeout=300000 --hookTimeout=120000
    run pmOutcomes env SIM_NETWORK=offline TZ=UTC NODE_OPTIONS="$OFF" node scripts/simCareerPressMarket.mjs
    run engineUnits node_modules/.bin/vitest run src/lib/soccerCareerProgramme.test.ts src/test/soccerSavePartsReadAsAbsent.test.ts --testTimeout=300000 --hookTimeout=120000
    run programme node scripts/simCareerProgramme.mjs
    run keepPlaying node scripts/simCareerKeepPlaying.mjs
    ;;
  M4|M5)
    run marketUnits node_modules/.bin/vitest run src/lib/usCareerMarket.test.ts src/test/usCareerMarketUi.test.tsx src/test/usCareerMarketBoard.test.tsx --testTimeout=300000 --hookTimeout=120000
    run pmOutcomes env SIM_NETWORK=offline TZ=UTC NODE_OPTIONS="$OFF" node scripts/simCareerPressMarket.mjs
    run parity node scripts/simUsBoardParity.mjs
    run saveRetry node scripts/simUsCareerSaveRetry.mjs
    ;;
esac
git checkout -- src scripts
git status --short -- src scripts | head -3
echo "MUT $m:$res"
exit 0
