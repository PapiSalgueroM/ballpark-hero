#!/usr/bin/env bash
# Round 1115, measurement only: the weight of /soccer-career WITHOUT the round, on the same runner and
# with the same two instruments (simFlagshipWeight section 3 and sweepWeight) as the lines that measure it
# with the round. The base is origin/release-al-gate, the tree this round was merged onto.
set -u
HERE="$PWD"
git fetch -q --depth=1 origin release-al-gate || { echo "fetch failed"; exit 2; }
git worktree add -q --detach /tmp/base-al FETCH_HEAD || { echo "worktree failed"; exit 2; }
cd /tmp/base-al || exit 2
echo "base tree: $(git rev-parse HEAD)"
ln -s "$HERE/node_modules" node_modules
npm run build > /tmp/base-build.log 2>&1 || { echo "base build failed"; tail -30 /tmp/base-build.log; exit 3; }
echo "== simFlagshipWeight on the base =="
node scripts/simFlagshipWeight.mjs 2>&1 | tail -6
node scripts/lib/hostLikeServer.mjs dist 4174 > /tmp/base-server.log 2>&1 &
SRV=$!
sleep 4
echo "== sweepWeight on the base (its own exit code is not this line's) =="
BASE=http://localhost:4174 SWEEP_BASE=http://localhost:4174 ENGINES=chromium node scripts/sweepWeight.mjs > /tmp/base-sweep.log 2>&1
echo "sweep exit $?"
grep -n 'soccer-career\|FAIL\|sweepWeight' /tmp/base-sweep.log | cut -c1-200 | head -20
kill "$SRV" 2>/dev/null
echo "BASE WEIGHT DONE"
