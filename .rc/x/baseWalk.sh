#!/usr/bin/env bash
# Round 1115, proof only: playSoccerCareer on the BASE tree (origin/release-al-gate, without this round),
# on the same runner. If its one red (console errors from the database host this runner blocks on purpose)
# is there without the round too, the red is the runner's and not the round's.
set -u
HERE="$PWD"
git fetch -q --depth=1 origin release-al-gate || { echo "fetch failed"; exit 2; }
git worktree add -q --detach /tmp/base-walk FETCH_HEAD || { echo "worktree failed"; exit 2; }
cd /tmp/base-walk || exit 2
echo "base tree: $(git rev-parse HEAD)"
ln -s "$HERE/node_modules" node_modules
npm run build > /tmp/base-walk-build.log 2>&1 || { echo "base build failed"; tail -30 /tmp/base-walk-build.log; exit 3; }
unset SWEEP_BASE BASE
PORT=4288 ENGINES=chromium node scripts/playSoccerCareer.mjs 2>&1 | cut -c1-240 | tail -14
echo "base walk exit ${PIPESTATUS[0]}"
echo "BASE WALK DONE"
