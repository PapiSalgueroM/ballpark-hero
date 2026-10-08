#!/usr/bin/env bash
# Fixer probe, never committed. Runs on the GitHub runner only.
# The checked out head with ONE input taken back out: the named files as they were at <sha>. Builds that scratch
# tree and measures the named routes the way sweepWeight does, in bytes.
# usage: bash weightRevert2.sh <port> <label> <sha> <routes, comma list without slashes, home for /> <file> [<file> ...]
set -u
PORT="$1"; LABEL="$2"; PRE="$3"; ROUTES_IN="$4"; shift 4
HERE="$PWD"
D="/tmp/w-$LABEL"
git worktree add --detach "$D" HEAD > /dev/null 2>&1 || { echo "worktree add failed"; exit 3; }
ln -s "$HERE/node_modules" "$D/node_modules"
cd "$D" || exit 3
git checkout "$PRE" -- "$@" || { echo "restore failed"; exit 3; }
echo "restored from $PRE:"; git status --short | head -8
npm run build > build.log 2>&1 || { echo "build failed"; tail -20 build.log; exit 3; }
node scripts/lib/hostLikeServer.mjs dist "$PORT" > server.log 2>&1 &
SP=$!
sleep 4
BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT" node scripts/sweepWeight.mjs 2>&1 | grep -E "K gz|sweepWeight:|FAIL" | cut -c1-200
ROUTES="$ROUTES_IN" node "$HERE/.rc/x/weightOne2.mjs" "http://localhost:$PORT" "$D/dist" "$LABEL" "$D"
rc=$?
kill "$SP" 2> /dev/null
exit $rc
