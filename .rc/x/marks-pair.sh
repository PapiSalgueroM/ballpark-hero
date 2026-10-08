#!/usr/bin/env bash
# Probe, never committed: derive the Hall marks ledger again on this tree (Round 1104 with Round 1051's head
# merged) by Round 1051's own recipe, into $RC_OUT, without touching the committed ledger. Read only.
set -u
D=/tmp/hall-rows-$$
mkdir -p "$D"
for sport in nfl nba mlb nhl; do
  N=2000
  [ "$sport" = mlb ] && N=2750
  SIM_SKIP_BOARD=1 SIM_DUMP_ROWS="$D/rows-$sport-base.json" node scripts/simCareerHall.mjs "$sport" "$N" > "$D/log-$sport-base.txt" 2>&1
  echo "$sport base exit=$? | $(tail -1 "$D/log-$sport-base.txt" | cut -c1-150)"
  for s in 1 2 3 4 5; do
    SIM_SKIP_BOARD=1 SIM_SEED=$s SIM_DUMP_ROWS="$D/rows-$sport-$s.json" node scripts/simCareerHall.mjs "$sport" "$N" > "$D/log-$sport-$s.txt" 2>&1
    echo "$sport $s exit=$? | $(tail -1 "$D/log-$sport-$s.txt" | cut -c1-150)"
  done
done
echo "--- section 17 (a), every run"
grep -H "17 (a) marks" "$D"/log-*.txt | sed "s#$D/log-##" | cut -c1-260
MARKS_OUT="$RC_OUT/careerHallMarks.pair.json" node scripts/genCareerHallMarks.mjs "$D" > "$RC_OUT/genCareerHallMarks.out.txt" 2>&1
G=$?
cp scripts/data/careerHallMarks.json "$RC_OUT/careerHallMarks.committed.json"
tail -5 "$RC_OUT/genCareerHallMarks.out.txt" | cut -c1-200
echo "genCareerHallMarks exit=$G"
exit $G
