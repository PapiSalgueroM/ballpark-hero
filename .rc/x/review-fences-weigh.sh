#!/usr/bin/env bash
# Reviewer probe (never committed): build one commit in a scratch worktree on the runner and weigh its pages
# with that commit's own scripts/sweepWeight.mjs. usage: bash .rc/x/review-fences-weigh.sh <commit> <port>
set -u
C="$1"; P="$2"
ROOT="$PWD"
W="/tmp/weigh-$P"
git worktree add -f --detach "$W" "$C" > "/tmp/wt-$P.log" 2>&1 || { echo "worktree failed for $C"; tail -3 "/tmp/wt-$P.log"; exit 2; }
cd "$W" || exit 2
ln -s "$ROOT/node_modules" node_modules
npm run build > "/tmp/build-$P.log" 2>&1 || { echo "build failed for $C"; tail -8 "/tmp/build-$P.log"; exit 2; }
node scripts/lib/hostLikeServer.mjs dist "$P" > "/tmp/server-$P.log" 2>&1 &
S=$!
sleep 4
BASE="http://localhost:$P" SWEEP_BASE="http://localhost:$P" SWEEP_OFFLINE=1 ENGINES=chromium node scripts/sweepWeight.mjs > "/tmp/sweep-$P.log" 2>&1
RC=$?
kill "$S" 2> /dev/null
echo "commit $(git rev-parse --short HEAD) ($C) sweep exit=$RC"
grep -E "FAIL|to the tenth" "/tmp/sweep-$P.log"
mkdir -p "$RC_OUT"
{ echo "commit $(git rev-parse --short HEAD) ($C) sweep exit=$RC"; grep -E "FAIL|to the tenth" "/tmp/sweep-$P.log"; } > "$RC_OUT/weigh-$P.txt"
tail -1 "/tmp/sweep-$P.log"
exit 0
