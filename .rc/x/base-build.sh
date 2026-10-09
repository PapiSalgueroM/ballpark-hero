#!/usr/bin/env bash
# Round 1147 scratch (never committed): build a second ref beside the checked out head on the runner and
# list what /nfl-my-career downloads there, so the two lists can be compared file by file.
#   bash .rc/x/base-build.sh <ref> <tag> <port>
set -eu
REF="$1"; TAG="$2"; PORT="$3"
HERE="$PWD"
DIR="$RUNNER_TEMP/tree-$TAG"
git worktree add -f --detach "$DIR" "$REF" > /dev/null 2>&1
ln -s "$HERE/node_modules" "$DIR/node_modules"
cd "$DIR"
echo "building $TAG at $(git rev-parse --short HEAD)"
npm run build > "$RUNNER_TEMP/build-$TAG.log" 2>&1 || { tail -30 "$RUNNER_TEMP/build-$TAG.log"; exit 3; }
node scripts/lib/hostLikeServer.mjs dist "$PORT" > "$RUNNER_TEMP/server-$TAG.log" 2>&1 &
SERVER=$!
sleep 4
BASE="http://localhost:$PORT" DIST="$DIR/dist" TAG="$TAG" PW_ROOT="$HERE" node "$HERE/.rc/x/weight-probe.mjs"
RC=$?
kill "$SERVER" 2>/dev/null || true
exit "$RC"
