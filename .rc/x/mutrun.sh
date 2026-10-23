#!/usr/bin/env bash
# usage: bash .rc/x/mutrun.sh <mutation>   (run after mut.mjs applied it; the request line restores the tree)
set -u
m="$1"; out="${RC_OUT:-/tmp}"; mkdir -p "$out"
git diff --stat -- src | tail -1
node scripts/simNbaGmDesk.mjs > "$out/mut-$m-desk.txt" 2>&1; ed=$?
node .rc/x/hbprobe.mjs 300 > "$out/mut-$m-probe.txt" 2>&1; ep=$?
echo "desk last: $(tail -1 "$out/mut-$m-desk.txt")"
grep -E "^ *FAIL|FAIL " "$out/mut-$m-desk.txt" | head -5
echo "probe:"; tail -8 "$out/mut-$m-probe.txt"
echo "MUT $m: simNbaGmDesk exit $ed | hbprobe exit $ep"
exit $ed
