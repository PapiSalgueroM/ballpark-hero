#!/usr/bin/env bash
# Reviewer: is the weight sweep red on main too? Builds origin/main (0054fd81) beside the branch and
# runs MAIN's own scripts/sweepWeight.mjs against MAIN's build.
set -u
ROOT="$PWD"
M=/tmp/rr-main-w
mkdir -p "$M"
git archive 0054fd819320a32884609562e2f4b882f2ecbf38 | tar -x -C "$M" || { echo "archive failed"; exit 2; }
ln -s "$ROOT/node_modules" "$M/node_modules"
( cd "$M" && npm run build > /tmp/rr-main-w-build.log 2>&1 ) || { echo "main build failed"; tail -20 /tmp/rr-main-w-build.log; exit 2; }
grep -E "assets/index-[A-Za-z0-9_-]+\.js" /tmp/rr-main-w-build.log | head -3
( cd "$M" && node scripts/lib/hostLikeServer.mjs dist 4191 > /tmp/rr-main-w-server.log 2>&1 & )
sleep 4
cd "$M" && BASE=http://localhost:4191 SWEEP_OFFLINE=1 ENGINES=chromium node scripts/sweepWeight.mjs
echo "main sweepWeight exit=$?"
