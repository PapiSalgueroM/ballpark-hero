#!/usr/bin/env bash
# Round 1539 fix pass (never committed), mut1539.sh with the mutation script as an argument: on the runner, copy the
# checked head into its own worktree, apply the mutation there, vite build it, serve it on its own port, run the
# command against it. usage: bash .rc/x/mutRun1539.sh <id> <port> <mutation script> '<command>'
set -u
ID="$1"; PORT="$2"; MUT="$3"; CMD="$4"
R="$PWD"
C="/tmp/mut-$ID"
git worktree add -q --detach "$C" HEAD || { echo "MUT $ID: worktree failed"; exit 90; }
ln -s "$R/node_modules" "$C/node_modules"
cd "$C" || exit 90
node "$R/$MUT" || exit 92
git diff --stat | tail -3
node_modules/.bin/vite build > "/tmp/mut-$ID-build.log" 2>&1 || { tail -20 "/tmp/mut-$ID-build.log"; echo "MUT $ID: build failed"; exit 93; }
echo "MUT $ID: built"
node scripts/lib/hostLikeServer.mjs dist "$PORT" > "/tmp/mut-$ID-server.log" 2>&1 &
SP=$!
sleep 3
export BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT"
bash -c "$CMD"
S=$?
kill "$SP" 2>/dev/null
exit $S
