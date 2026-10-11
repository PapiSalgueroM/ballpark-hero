#!/usr/bin/env bash
# Review of Round 1301 (runner only): one seed marks readings of the Hall harness on a tree, default era and throwback era, six seeds each.
# usage: tb-old2.sh <root of the tree> <label> <sport> [<sport> ...]     (the tree is restored with git checkout -- src)
set -u
ROOT="$1"; L="$2"; shift 2
R="$PWD"
cd "$ROOT" || exit 2
for s in "$@"; do
  for era in default throwback; do
    if [ "$era" = throwback ]; then node "$R/.rc/x/mut-era.mjs" "$s" || exit 2; fi
    for seed in base 1 2 3 4 5; do
      T="/tmp/tb2-$L-$s-$era-$seed"; mkdir -p "$T"
      if [ "$seed" = base ]; then TMPDIR="$T" SIM_SKIP_BOARD=1 SIM_FLEET_CHILD=1 node scripts/simCareerHall.mjs "$s" 2000 > "$T/log.txt" 2>&1; else TMPDIR="$T" SIM_SKIP_BOARD=1 SIM_FLEET_CHILD=1 SIM_SEED="$seed" node scripts/simCareerHall.mjs "$s" 2000 > "$T/log.txt" 2>&1; fi
      echo "$L $s $era seed $seed: $(grep -E "17 \(a\)" "$T/log.txt" | head -1 | sed 's/^ *//' | sed 's/this run.s one seed (printed, never the check): //' | cut -c1-170)"
    done
    git checkout -- src
  done
done
echo "tb-old2 $L: done"
