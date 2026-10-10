#!/usr/bin/env bash
# Round 1225 fixer: the three engine rows of scripts/sweepWeight.mjs on four builds, one input changed at a time.
# sweepWeight weighs the files under the repo's own dist/, so every build goes there. Run from the repo root on a runner, in a #!serial request: it edits src in place and puts it back.
set -u
BASE_SHA=46e4231cc82b6c047da6e0b4bdb5dfae5628a928
rows() { grep -E "^ +/(club-manager|manager-hot-seat|deadline-day) " "$1" | sed -E 's/ +/ /g' | cut -c1-90 | tr '\n' '|'; }
measure() {
  node_modules/.bin/vite build > "/tmp/w-$1.build.log" 2>&1 || { echo "$1: BUILD FAILED $(tail -3 "/tmp/w-$1.build.log" | tr '\n' ' ' | cut -c1-300)"; return 9; }
  node scripts/lib/hostLikeServer.mjs dist "$2" > "/tmp/w-$1.serve.log" 2>&1 &
  local p=$!
  sleep 3
  SWEEP_BASE="http://localhost:$2" BASE="http://localhost:$2" SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs > "$RC_OUT/weight-$1.log" 2>&1
  kill $p
  echo "$1: $(rows "$RC_OUT/weight-$1.log")"
}
bad=0
# 1. the head as committed
measure head 4321 || bad=1
# 2. the registry without its nine lazy lines (the Premier League's line stays)
node .rc/x/mutSrc.mjs . noninelines && { measure nonine 4322 || bad=1; }
# 3. and with the hook and the page as the base has them
git checkout -q "$BASE_SHA" -- src/hooks/useClubManager.ts src/pages/ClubManager.tsx && { measure nonine-basehook 4323 || bad=1; }
git checkout -q HEAD -- src
# 4. the base's whole src tree: the build the lead's rows were last measured against
git checkout -q "$BASE_SHA" -- src && { measure base 4324 || bad=1; }
git checkout -q HEAD -- src
left=$(git status --porcelain -- src | wc -l)
echo "src restored: $left file(s) differ from the head"
[ "$left" -eq 0 ] || bad=1
exit $bad
