#!/usr/bin/env bash
# Round 1319: the two pre draft steps of .github/workflows/prospect-journey.yml, copied as written
# (lines 71 to 91), timed. Run from the repo root on a runner. Prints one TIMING line per step and
# a closing PJLOOP line with the status of each step.
set -u
A="${RC_OUT:-/tmp}/pj"
mkdir -p "$A"
t0=$(date +%s)
s1=0
if ! node scripts/simUsCareerProspect.mjs > "$A/prospect.log" 2>&1; then s1=1; fi
tail -1 "$A/prospect.log"
for control in before save restore handoff duplicate choice invalid showcase undrafted archive corrupt back rules historical outcome; do
  if ! US_CAREER_PROSPECT_CONTROL="$control" node scripts/simUsCareerProspect.mjs > "$A/prospect-$control.log" 2>&1; then s1=1; fi
  echo "prospect $control: $(tail -1 "$A/prospect-$control.log" | cut -c1-150)"
done
t1=$(date +%s)
echo "TIMING prospect step $((t1 - t0))s status $s1"
s2=0
(
  set -eo pipefail
  node_modules/.bin/vitest run src/test/careerPreDraft.test.tsx --maxWorkers=1 --no-file-parallelism 2>&1 | tee "$A/predraft-components.log" | tail -5
  ta=$(date +%s)
  node scripts/simCareerPreDraft.mjs 2>&1 | tee "$A/predraft.log" | tail -2
  tb=$(date +%s)
  echo "TIMING default run $((tb - ta))s"
  for control in randomteam flatstock flatlottery mathrandom cardwords showcasewords erarule ceiling ladderskip undraftedtop squeeze laterlottery flatlater loadershallow; do
    set +e
    tc=$(date +%s)
    SIM_PRE_DRAFT_CONTROL="$control" node scripts/simCareerPreDraft.mjs 2>&1 | tee "$A/predraft-$control.log" > /dev/null
    code=${PIPESTATUS[0]}
    set -e
    echo "control $control exit=$code $(( $(date +%s) - tc ))s | $(tail -1 "$A/predraft-$control.log" | cut -c1-120)"
    test "$code" -eq 1
    grep -F "control $control: mutated" "$A/predraft-$control.log" > /dev/null
    grep -E "simCareerPreDraft .*FAILURE\(S\)" "$A/predraft-$control.log" > /dev/null
  done
) || s2=1
t2=$(date +%s)
echo "TIMING predraft step $((t2 - t1))s status $s2"
echo "PJLOOP prospect=$s1 predraft=$s2 total $((t2 - t0))s"
[ "$s1" -eq 0 ] && [ "$s2" -eq 0 ]
