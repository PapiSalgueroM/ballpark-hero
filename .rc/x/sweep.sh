#!/usr/bin/env bash
# Round 1556: simNbaGmDesk on fresh streams SIM_SEED FROM..TO, one line per stream with its real exit code, its
# closing line and its census and bottom lines; a red stream's FAIL lines are kept under $RC_OUT.
# usage: bash .rc/x/sweep.sh FROM TO
set -u
from="$1"; to="$2"; red=0
out="${RC_OUT:-/tmp}/sweep"; mkdir -p "$out"
for s in $(seq "$from" "$to"); do
  SIM_SEED=$s node scripts/simNbaGmDesk.mjs > "$out/s$s.txt" 2>&1; e=$?
  [ $e -ne 0 ] && red=$((red+1))
  echo "SIM_SEED $s exit $e | $(tail -1 "$out/s$s.txt")"
  grep -E "census of the offer sheet window|at the bottom of a full club" "$out/s$s.txt" | sed 's/^ */    /'
  [ $e -ne 0 ] && grep -E "FAIL" "$out/s$s.txt" | head -6
done
echo "SWEEP $from..$to: $((to-from+1)) streams, $red red"
[ $red -eq 0 ]
