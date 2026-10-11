#!/usr/bin/env bash
# Review of Round 1301 (runner only): the OLD harness (one seed marks line) on a scratch worktree of an old commit,
# with every career started in the 2006-07 era, six seeds; and the same six with the era left alone.
# usage: tb-old.sh <commit> <label>
set -u
SHA="$1"; L="$2"; R="$PWD"; W="/tmp/tbold-$L"
git worktree add -q --detach "$W" "$SHA" || exit 2
ln -s "$R/node_modules" "$W/node_modules"
cd "$W" || exit 2
run() { # $1 = tag
  for seed in base 1 2 3 4 5; do
    T="/tmp/tbold-$L-$1-$seed"; mkdir -p "$T"
    if [ "$seed" = base ]; then TMPDIR="$T" SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs nhl 2000 > "$T/log.txt" 2>&1; else TMPDIR="$T" SIM_SKIP_BOARD=1 SIM_SEED="$seed" node scripts/simCareerHall.mjs nhl 2000 > "$T/log.txt" 2>&1; fi
    echo "$L $1 seed $seed: $(grep -E "17 \(a\)" "$T/log.txt" | head -1 | sed 's/^ *//' | cut -c1-200)"
  done
}
run default-era
node "$R/.rc/x/mut.mjs" ERA || exit 2
run throwback-era
git checkout -- src
echo "tb-old $L: done"
