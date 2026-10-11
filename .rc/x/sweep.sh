#!/usr/bin/env bash
# Review of Round 1301 (runner only, never committed): the Hall harness on other seeds, one line a seed.
# usage: sweep.sh <repo root> <sport> <seed> [<seed> ...]
# Each run skips the board sections (exit 3 by design) and prints which checks were red on that seed.
set -u
ROOT="$1"; S="$2"; shift 2
T="/tmp/sweep-tmp-$S-$$"; mkdir -p "$T"
cd "$ROOT" || exit 2
for seed in "$@"; do
  L="$T/log-$seed.txt"
  TMPDIR="$T" TEMP="$T" TMP="$T" SIM_FLEET_DIR="/tmp/sweep-fleet-$S-$$" SIM_SKIP_BOARD=1 SIM_SEED="$seed" node scripts/simCareerHall.mjs "$S" 2000 > "$L" 2>&1
  code=$?
  echo "$S seed $seed exit $code | $(tail -1 "$L" | cut -c1-200)"
  grep -E "^  FAIL" "$L" | grep -v "^  FAIL marks" | cut -c1-300
done
echo "sweep: $S done, $# seeds"
