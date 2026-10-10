#!/usr/bin/env bash
# Round 1301 (runner only, never committed): measuring runs of the Hall harness, one row file a seed,
# the interface the header of scripts/genCareerHallMarks.mjs documents.
# usage: dumps.sh <repo root> <out dir> <sport> <careers> <seed> [<seed> ...]     (seed "base" is the default seed)
set -u
ROOT="$1"; OUT="$2"; SPORT="$3"; N="$4"; shift 4
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
T="/tmp/tmp-$SPORT-$$"; mkdir -p "$T"
cd "$ROOT" || exit 2
t0=$(date +%s)
for seed in "$@"; do
  f="$OUT/rows-$SPORT-$seed.json"
  if [ "$seed" = base ]; then
    TMPDIR="$T" TEMP="$T" TMP="$T" SIM_SKIP_BOARD=1 SIM_DUMP_ROWS="$f" node scripts/simCareerHall.mjs "$SPORT" "$N" > "$OUT/log-$SPORT-$seed.txt" 2>&1
  else
    TMPDIR="$T" TEMP="$T" TMP="$T" SIM_SKIP_BOARD=1 SIM_SEED="$seed" SIM_DUMP_ROWS="$f" node scripts/simCareerHall.mjs "$SPORT" "$N" > "$OUT/log-$SPORT-$seed.txt" 2>&1
  fi
  code=$?
  if [ ! -s "$f" ]; then echo "NO ROWS for $SPORT seed $seed (exit $code)"; tail -8 "$OUT/log-$SPORT-$seed.txt"; exit 1; fi
  echo "$SPORT seed $seed exit $code | $(tail -1 "$OUT/log-$SPORT-$seed.txt" | cut -c1-120)"
done
t1=$(date +%s)
echo "dumps: $(ls "$OUT" | grep -c "rows-$SPORT-") row files of $SPORT in $OUT, $# runs in $((t1 - t0)) s"
