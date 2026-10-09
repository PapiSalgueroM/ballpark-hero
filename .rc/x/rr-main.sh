#!/usr/bin/env bash
# Reviewer: build origin/main (0054fd81, the round's base) beside the branch on the runner and run the
# same two reviewer walks against it, so every number has its "before" from the same script.
set -u
ROOT="$PWD"
M=/tmp/rr-main
mkdir -p "$M" "$RC_OUT/main"
git archive 0054fd819320a32884609562e2f4b882f2ecbf38 | tar -x -C "$M" || { echo "archive failed"; exit 2; }
ln -s "$ROOT/node_modules" "$M/node_modules"
( cd "$M" && npm run build > "$RC_OUT/main/build.log" 2>&1 ) || { echo "main build failed"; tail -20 "$RC_OUT/main/build.log"; exit 2; }
( cd "$M" && node scripts/lib/hostLikeServer.mjs dist 4190 > /tmp/rr-main-server.log 2>&1 & )
sleep 4
echo "== walk2 on main"
BASE=http://localhost:4190 RC_OUT="$RC_OUT/main" node .rc/x/rr-walk2.mjs
echo "== walk1 on main"
BASE=http://localhost:4190 RC_OUT="$RC_OUT/main" node .rc/x/rr-walk.mjs | grep -A 12 '^j1-real-quota-390' | cut -c1-300
echo "rr-main: both walks ran against main"
