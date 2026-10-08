#!/usr/bin/env bash
# Probe, never committed: section 17 (a) of simCareerHall on seeds the marks were NOT derived from.
# The ledger's bands come from the default seed and SIM_SEED 1 to 5, the same careers the marks were cut from.
# Seeds 6 to 17 are fresh samples of the same engine: how often does an unchanged engine leave its own band?
set -u
D=/tmp/hall-fresh-$$
mkdir -p "$D"
for sport in nfl nba nhl mlb; do
  red=0; n=0
  for s in 6 7 8 9 10 11 12 13 14 15 16 17; do
    SIM_SKIP_BOARD=1 SIM_SEED=$s node scripts/simCareerHall.mjs "$sport" > "$D/log-$sport-$s.txt" 2>&1
    last=$(tail -1 "$D/log-$sport-$s.txt" | cut -c1-120)
    line=$(grep "17 (a) marks" "$D/log-$sport-$s.txt" | sed 's/^ *17 (a) marks: //' | cut -c1-200)
    n=$((n + 1))
    case "$last" in *marks*) red=$((red + 1)) ;; esac
    echo "$sport seed $s | $line | $last"
  done
  echo "== $sport: $red of $n fresh seeds red on [marks]"
done
