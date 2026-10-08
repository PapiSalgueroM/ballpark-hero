#!/usr/bin/env bash
# Round 1115, probe only: the hostile saves on the BASE build (origin/release-al-gate, no Squad tile),
# to tell a page that was already fragile from a page the round broke.
set -u
HERE="$PWD"
git fetch -q --depth=1 origin release-al-gate || { echo "fetch failed"; exit 2; }
git worktree add -q --detach /tmp/base-h FETCH_HEAD || { echo "worktree failed"; exit 2; }
cd /tmp/base-h || exit 2
echo "base tree: $(git rev-parse HEAD)"
ln -s "$HERE/node_modules" node_modules
npm run build > /tmp/base-h-build.log 2>&1 || { echo "base build failed"; tail -30 /tmp/base-h-build.log; exit 3; }
cd "$HERE" || exit 2
DIST_DIR=/tmp/base-h/dist PORT=4921 TAG=base ENGINES=chromium node .rc/x/hostileSaves.mjs
