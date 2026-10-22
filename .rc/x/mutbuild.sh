#!/usr/bin/env bash
# Round 1539 review (runner only): copy the checked head into its own worktree, apply one mutrun.mjs mutation there,
# vite build it, serve it on its own port, run the command against it. usage: bash .rc/x/mutbuild.sh <id> <port> '<command>'
set -u
ID="$1"; PORT="$2"; CMD="$3"
R="$PWD"
C="/tmp/rmut-$ID-$PORT"
git worktree add -q --detach "$C" HEAD || { echo "MUT $ID: worktree failed"; exit 90; }
ln -s "$R/node_modules" "$C/node_modules"
mkdir -p "$C/.rc/x" && cp "$R"/.rc/x/* "$C/.rc/x/"
cd "$C" || exit 90
node .rc/x/mutrun.mjs "$ID" || exit 92
git diff --stat | tail -2
node_modules/.bin/vite build > "/tmp/rmut-$ID-$PORT-build.log" 2>&1 || { tail -20 "/tmp/rmut-$ID-$PORT-build.log"; echo "MUT $ID: build failed"; exit 93; }
echo "MUT $ID: built"
node scripts/lib/hostLikeServer.mjs dist "$PORT" > "/tmp/rmut-$ID-$PORT-server.log" 2>&1 &
SP=$!
sleep 3
export BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT"
bash -c "$CMD"
S=$?
kill "$SP" 2>/dev/null
echo "MUT $ID: command exit $S"
exit $S
