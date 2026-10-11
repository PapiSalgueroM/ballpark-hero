#!/usr/bin/env bash
# Round 1304 fix pass (extra file, never committed): is a walk's red the head's, or the walk's own dice?
# usage: bash .rc/x/baseRun.sh <commit-ish> <times> <walk script under scripts/>
# Builds that commit in its own git worktree, serves its dist on port 4174, and runs the walk <times> times
# against it, printing each run's ending lines and exit code. Always exits 0: the lines are the result.
set -u
REPO="$PWD"
C="$1"; N="$2"; WALK="$3"
SHA=$(git rev-parse --short=10 "$C")
W="/tmp/wr-$SHA-$$"
git worktree add -q --detach "$W" "$SHA" || { echo "no worktree for $C"; exit 3; }
ln -s "$REPO/node_modules" "$W/node_modules"
cd "$W"
echo "BASE BUILD at $(git log -1 --format='%h %s' | cut -c1-120)"
npm run build > /tmp/wr-build-$$.log 2>&1; b=$?
[ "$b" -eq 0 ] && [ -f dist/index.html ] || { tail -5 /tmp/wr-build-$$.log; echo "the base build failed (exit $b)"; exit 3; }
node scripts/lib/hostLikeServer.mjs dist 4174 > /tmp/wr-server-$$.log 2>&1 &
SERVER=$!
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null "http://localhost:4174/robots.txt" && break
  sleep 1
done
cd "$REPO"
for i in $(seq 1 "$N"); do
  L="/tmp/wr-run-$i-$$.log"
  BASE=http://localhost:4174 SWEEP_BASE=http://localhost:4174 ENGINES=chromium node "scripts/$WALK" > "$L" 2>&1; e=$?
  echo "== base $SHA run $i exit=$e"
  grep -E "half times|ending:|SHALLOW|BROKEN|findings" "$L" | cut -c1-220
done
kill "$SERVER" 2>/dev/null
echo "DONE base $SHA x$N"
exit 0
