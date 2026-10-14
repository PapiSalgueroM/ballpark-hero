#!/usr/bin/env bash
# Release BD, runner only: bash .rc/x/wt.sh <sha> <port>. A plain build of <sha> served on <port>, then this head's
# sweepWeight against it (this head's budgets); prints the rows of section 1 prefixed with the sha, and its last line.
set -u
S=$1; P=$2; W=/tmp/w-$P
git worktree add -q --detach "$W" "$S" || exit 2
ln -s "$PWD/node_modules" "$W/node_modules"
(cd "$W" && node_modules/.bin/vite build > "/tmp/wb-$P.log" 2>&1) || { tail -5 "/tmp/wb-$P.log"; exit 2; }
node scripts/lib/hostLikeServer.mjs "$W/dist" "$P" > "/tmp/ws-$P.log" 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$P/" && break; sleep 1; done
BASE="http://localhost:$P" SWEEP_BASE="http://localhost:$P" SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs > "/tmp/sw-$P.log" 2>&1
grep -E "^   /" "/tmp/sw-$P.log" | sed "s/^/$S /"
tail -1 "/tmp/sw-$P.log"
exit 0
