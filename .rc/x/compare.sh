#!/usr/bin/env bash
# Round 1226, fix pass 2 (runner only): are the Hall rows of two trees the same careers, byte for byte?
# usage: compare.sh <base rows dir> <mutated head rows dir> <head rows dir>
set -u
BASE="$1"; MUT="$2"; HEAD="$3"
same=0; headsame=0
for seed in base 1 2 3 4 5; do
  b=$(sha256sum "$BASE/rows-nhl-$seed.json" | cut -c1-16)
  m=$(sha256sum "$MUT/rows-nhl-$seed.json" | cut -c1-16)
  h=$(sha256sum "$HEAD/rows-nhl-$seed.json" | cut -c1-16)
  if [ "$b" = "$m" ]; then same=$((same + 1)); r=EQUAL; else r=DIFFER; fi
  if [ "$b" = "$h" ]; then headsame=$((headsame + 1)); fi
  echo "seed $seed: base $b, head with 82 put back $m ($r), head $h"
done
echo "compare: the head with the one number put back equals the base on $same of 6 seeds; the head itself on $headsame of 6"
[ "$same" = 6 ] && [ "$headsame" = 0 ]
