#!/usr/bin/env bash
# Round 1226, fix pass 2 (runner only, never committed): the six measuring runs of the Hall harness
# for the NHL in one tree, one row file each, as the header of scripts/genCareerHallMarks.mjs says.
# usage: dumps.sh <repo root> <out dir>
set -u
ROOT="$1"; OUT="$2"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
cd "$ROOT" || exit 2
for seed in base 1 2 3 4 5; do
  if [ "$seed" = base ]; then
    SIM_SKIP_BOARD=1 SIM_DUMP_ROWS="$OUT/rows-nhl-$seed.json" node scripts/simCareerHall.mjs nhl 2000 > "$OUT/log-$seed.txt" 2>&1
  else
    SIM_SKIP_BOARD=1 SIM_SEED="$seed" SIM_DUMP_ROWS="$OUT/rows-nhl-$seed.json" node scripts/simCareerHall.mjs nhl 2000 > "$OUT/log-$seed.txt" 2>&1
  fi
  code=$?
  echo "seed $seed exit $code | $(grep '17 (a) marks' "$OUT/log-$seed.txt" | cut -c1-230)"
  echo "   $(tail -1 "$OUT/log-$seed.txt" | cut -c1-160)"
  if [ ! -s "$OUT/rows-nhl-$seed.json" ]; then echo "NO ROWS for seed $seed"; tail -8 "$OUT/log-$seed.txt"; exit 1; fi
done
echo "dumps: $(ls "$OUT" | grep -c rows-nhl-) row files in $OUT"
