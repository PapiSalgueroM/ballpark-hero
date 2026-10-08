#!/usr/bin/env bash
# Reviewer probe, never committed. Runs on the GitHub runner only.
# Build one commit of the train in a scratch worktree and measure /stadium-tycoon there.
# usage: bash weightAt.sh <sha> <port> <label>
set -u
SHA="$1"; PORT="$2"; LABEL="$3"
HERE="$PWD"
D="/tmp/w-$LABEL"
git worktree add --detach "$D" "$SHA" > /dev/null 2>&1 || { echo "worktree add failed for $SHA"; exit 3; }
ln -s "$HERE/node_modules" "$D/node_modules"
cd "$D" || exit 3
npm run build > build.log 2>&1 || { echo "build failed at $SHA"; tail -20 build.log; exit 3; }
node scripts/lib/hostLikeServer.mjs dist "$PORT" > server.log 2>&1 &
SP=$!
sleep 4
BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT" node scripts/sweepWeight.mjs 2>&1 | grep -E "stadium-tycoon|sweepWeight:|FAIL" | cut -c1-200
node "$HERE/.rc/x/weightOne.mjs" "http://localhost:$PORT" "$D" "$LABEL"
rc=$?
kill "$SP" 2> /dev/null
exit $rc
