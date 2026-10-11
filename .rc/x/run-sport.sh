#!/usr/bin/env bash
# Round 1301 (runner only, never committed): one sport's fleet verdicts on one tree, in one job.
# usage: run-sport.sh <sport> <out dir>
# The check fleet is played once into one folder and the controls reuse it (the harness prints how many).
set -u
S="$1"; OUT="$2"; D="/tmp/fleet-$S"; mkdir -p "$D" "$OUT"
line() { tail -1 "$1" | cut -c1-230; }
SIM_FLEET_DIR="$D" SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs "$S" 2000 > "$OUT/hall-$S.log" 2>&1; echo "$S run exit $? | $(line "$OUT/hall-$S.log")"
grep "17 (a)\|at or over from, pooled\|FAIL" "$OUT/hall-$S.log" | cut -c1-420
for c in markdrift todrift statsup statsdown nostandout oldmarks; do
  SIM_FLEET_DIR="$D" SIM_SKIP_BOARD=1 SIM_CONTROL=$c node scripts/simCareerHall.mjs "$S" 2000 > "$OUT/ctl-$S-$c.log" 2>&1; echo "$S $c exit $? | $(line "$OUT/ctl-$S-$c.log")"
  grep "at or over from, pooled" "$OUT/ctl-$S-$c.log" | cut -c1-200
done
SIM_FLEET_DIR="$D" SIM_FLEET_SEEDS=78-101 SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs "$S" 2000 > "$OUT/confirm-$S.log" 2>&1; echo "$S confirm 78-101 exit $? | $(line "$OUT/confirm-$S.log")"
grep "17 (a) marks, the fleet\|at or over from, pooled\|FAIL" "$OUT/confirm-$S.log" | cut -c1-420
echo "run-sport: $S done"
