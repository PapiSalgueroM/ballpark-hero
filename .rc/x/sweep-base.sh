#!/usr/bin/env bash
# Round 1216, a one time reading: the weight sweep of the BASE (origin/release-at-gate 46e4231c), built and served
# beside the round's own build, so the round's own share of each row can be told from what the base already weighs.
BASE_SHA=46e4231cc82b6c047da6e0b4bdb5dfae5628a928
ROOT=$(pwd)
git worktree add --detach /tmp/r1216-base "$BASE_SHA" > /dev/null 2>&1 || { echo "sweep-base: the base worktree could not be added"; exit 2; }
cd /tmp/r1216-base || exit 2
ln -s "$ROOT/node_modules" node_modules
npm run build > /tmp/r1216-base-build.log 2>&1 || { echo "sweep-base: the base did not build"; tail -5 /tmp/r1216-base-build.log; exit 2; }
node scripts/lib/hostLikeServer.mjs dist 4199 > /dev/null 2>&1 &
SERVER=$!
sleep 3
SWEEP_OFFLINE=1 SWEEP_BASE=http://localhost:4199 BASE=http://localhost:4199 node scripts/sweepWeight.mjs
STATUS=$?
kill $SERVER 2> /dev/null
echo "sweep-base: the sweep of the base 46e4231c exited $STATUS (rows over budget there are the base's, not Round 1216's)"
exit 0
