#!/usr/bin/env bash
# Reviewer's mutation driver for Round 1227 (GitHub runner only, on its throwaway checkout).
#   bash .rc/x/mutrun.sh <id>      id m0 is the tree as it is (the baseline); m1 to m7 are in .rc/x/mut.mjs
# Applies one mutation, runs the round's own gates three at a time, puts the tree back, and ends with one line:
#   MUT <id>: tsc=0 rival=0 ...     (the real exit code of every gate; 0 everywhere means the mutation SURVIVED)
ID="$1"
OUT="${RC_OUT:-/tmp/rc-out}"
mkdir -p "$OUT"
if [ "$ID" != "m0" ]; then
  node .rc/x/mut.mjs "$ID" || { echo "MUT $ID: NOT APPLIED"; git checkout -- src scripts; exit 2; }
fi
run() {
  local label="$1"; shift
  bash -c "$*" > "/tmp/mut-$ID-$label.full" 2>&1
  echo $? > "/tmp/mut-$ID-$label.exit"
  tail -n 45 "/tmp/mut-$ID-$label.full" | cut -c1-600 > "$OUT/mut-$ID-$label.log"
}
run tsc 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json' &
run rival 'node scripts/simUsRivalSense.mjs' &
run rivalry 'node scripts/simCareerRivalryEvents.mjs' &
wait
run parity 'node scripts/simUsBoardParity.mjs' &
run vitest 'node_modules/.bin/vitest run src/test/usRivalLine.test.ts src/test/usRivalOldSaves.test.ts src/test/usCareerTruthDigest.test.ts src/test/nflTruthRules1104.test.ts --testTimeout=300000 --hookTimeout=120000' &
run nfltruth 'node scripts/simNflTruth.mjs' &
wait
run probe 'node .rc/x/probe1.mjs' &
run others 'node scripts/simNflCareer.mjs && node scripts/simAwards.mjs && node scripts/simCareerRealism.mjs && node scripts/simCareerParity.mjs' &
if [ "${SENSE:-0}" = "1" ]; then run sensec 'SENSE_PROVE_OTHERS=1 node scripts/simNbaAwardsSense.mjs' & else echo skipped > "/tmp/mut-$ID-sensec.exit"; echo skipped > "/tmp/mut-$ID-sensec.full"; fi
wait
git checkout -- src scripts
line="MUT $ID:"
for l in tsc rival rivalry parity vitest nfltruth others sensec probe; do
  echo "--- $l exit=$(cat "/tmp/mut-$ID-$l.exit") | $(tail -n 1 "/tmp/mut-$ID-$l.full" | cut -c1-240)"
  line="$line $l=$(cat "/tmp/mut-$ID-$l.exit")"
done
grep -h "FAIL" "/tmp/mut-$ID-rival.full" | cut -c1-420 | head -8
echo "$line"
exit 0
