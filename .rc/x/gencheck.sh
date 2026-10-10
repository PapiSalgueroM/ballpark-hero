#!/usr/bin/env bash
# Round 1226, fix pass 2 (runner only, never committed): the generator after its MARKS_KEEP mode.
#  1. FULL PATH: the generator of the base and the generator of this head write the same ledger,
#     byte for byte, from the same rows (six runs a sport, all four sports).
#  2. KEEP MODE: MARKS_KEEP=nhl writes the committed ledger byte for byte from the six NHL runs.
#  3. A sport that is not in KEPT is refused (exit 2).
# usage: gencheck.sh <base commit>
set -u
BASE="$1"
D=/tmp/rows-all; mkdir -p "$D"
for sport in nfl nba mlb nhl; do
  n=2000; [ "$sport" = mlb ] && n=2750
  for seed in base 1 2 3 4 5; do
    if [ "$seed" = base ]; then
      SIM_SKIP_BOARD=1 SIM_DUMP_ROWS="$D/rows-$sport-$seed.json" node scripts/simCareerHall.mjs "$sport" "$n" > "$D/log-$sport-$seed.txt" 2>&1
    else
      SIM_SKIP_BOARD=1 SIM_SEED="$seed" SIM_DUMP_ROWS="$D/rows-$sport-$seed.json" node scripts/simCareerHall.mjs "$sport" "$n" > "$D/log-$sport-$seed.txt" 2>&1
    fi
    echo "$sport seed $seed exit $? | $(tail -1 "$D/log-$sport-$seed.txt" | cut -c1-120)"
  done
done
bad=0
git show "$BASE:scripts/genCareerHallMarks.mjs" > scripts/genCareerHallMarksBase.tmp.mjs
MARKS_OUT=/tmp/full-base.json node scripts/genCareerHallMarksBase.tmp.mjs "$D" > /tmp/gen-base.log 2>&1; echo "1. the base's generator, full path: exit $?"
MARKS_OUT=/tmp/full-head.json node scripts/genCareerHallMarks.mjs "$D" > /tmp/gen-head.log 2>&1; echo "1. this head's generator, full path: exit $?"
rm -f scripts/genCareerHallMarksBase.tmp.mjs
if cmp -s /tmp/full-base.json /tmp/full-head.json; then echo "1. FULL PATH EQUAL: both write the same ledger, $(wc -c < /tmp/full-head.json) bytes"; else echo "1. FULL PATH DIFFERS"; bad=1; fi
if diff <(grep -v 'genCareerHallMarks: wrote' /tmp/gen-base.log) <(grep -v 'genCareerHallMarks: wrote' /tmp/gen-head.log) > /dev/null; then echo "1. the printed lines are equal too ($(wc -l < /tmp/gen-head.log) lines)"; else echo "1. THE PRINTED LINES DIFFER"; bad=1; fi
MARKS_KEEP=nhl MARKS_OUT=/tmp/keep.json node scripts/genCareerHallMarks.mjs "$D" | cut -c1-300
if cmp -s /tmp/keep.json scripts/data/careerHallMarks.json; then echo "2. KEEP MODE EQUAL: MARKS_KEEP=nhl writes the committed ledger byte for byte"; else echo "2. KEEP MODE DIFFERS from the committed ledger"; bad=1; fi
MARKS_KEEP=mlb MARKS_OUT=/tmp/refused.json node scripts/genCareerHallMarks.mjs "$D" > /tmp/refused.log 2>&1; code=$?
if [ "$code" = 2 ] && [ ! -e /tmp/refused.json ]; then echo "3. REFUSED: MARKS_KEEP=mlb exits 2 and writes nothing ($(tail -1 /tmp/refused.log | cut -c1-120))"; else echo "3. NOT REFUSED: exit $code"; bad=1; fi
cp /tmp/gen-head.log "$RC_OUT/gen-full-on-head.log" 2>/dev/null
git status --short | head -5
if [ "$bad" = 0 ]; then echo "gencheck: green, 3 of 3"; else echo "gencheck: RED"; fi
exit "$bad"
