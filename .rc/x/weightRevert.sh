#!/usr/bin/env bash
# Fixer probe, never committed. Runs on the GitHub runner only.
# The checked out head with Round 1083's product change taken back out: the Stadium Tycoon page and its hook as
# they were at e55a20c4 (the commit just before the 1083 merge; main did not touch either file since). Builds that
# scratch tree and measures /stadium-tycoon, the way sweepWeight does and in bytes.
# usage: bash weightRevert.sh <port> <label>
set -u
PORT="$1"; LABEL="$2"
PRE=e55a20c4cb5b76fd168dd34cda3f27bea05c1a7a
HERE="$PWD"
D="/tmp/w-$LABEL"
git worktree add --detach "$D" HEAD > /dev/null 2>&1 || { echo "worktree add failed"; exit 3; }
ln -s "$HERE/node_modules" "$D/node_modules"
cd "$D" || exit 3
git checkout "$PRE" -- src/pages/StadiumTycoon.tsx src/hooks/useStadiumTycoon.ts || { echo "restore failed"; exit 3; }
echo "restored from $PRE:"; git status --short | head -5
grep -c "TycoonSaleReview" src/pages/StadiumTycoon.tsx
npm run build > build.log 2>&1 || { echo "build failed"; tail -20 build.log; exit 3; }
node scripts/lib/hostLikeServer.mjs dist "$PORT" > server.log 2>&1 &
SP=$!
sleep 4
BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT" node scripts/sweepWeight.mjs 2>&1 | grep -E "stadium-tycoon|sweepWeight:|FAIL" | cut -c1-200
node "$HERE/.rc/x/weightOne2.mjs" "http://localhost:$PORT" "$D/dist" "$LABEL" "$D"
rc=$?
kill "$SP" 2> /dev/null
exit $rc
