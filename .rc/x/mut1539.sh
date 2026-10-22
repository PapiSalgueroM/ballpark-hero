#!/usr/bin/env bash
# Round 1539 mutation leg (never committed), after Round 1536's mut.sh: on the runner, copy the checked head into its
# own worktree, apply .rc/x/mutAway1539.mjs there, vite build it, serve it on its own port, run the command against it.
# usage: bash .rc/x/mut1539.sh <id> <port> '<command>'
set -u
ID="$1"; PORT="$2"; CMD="$3"
R="$PWD"
C="/tmp/mut-$ID"
git worktree add -q --detach "$C" HEAD || { echo "MUT $ID: worktree failed"; exit 90; }
ln -s "$R/node_modules" "$C/node_modules"
cd "$C" || exit 90
node "$R/.rc/x/mutAway1539.mjs" || exit 92
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
