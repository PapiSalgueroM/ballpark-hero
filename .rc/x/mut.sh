#!/usr/bin/env bash
# Review of Round 1536. On the runner: copy the checked head into its own worktree, apply mutations there,
# vite build it, serve it on its own port, run the given command with BASE pointing at it.
# usage: bash .rc/x/mut.sh <id> <port> <mutations, comma list; "revert" puts the four dialog files back to 889e1b38; "-" none> '<command>'
set -u
ID="$1"; PORT="$2"; MUTS="$3"; CMD="$4"
R="$PWD"
C="/tmp/mut-$ID"
git worktree add -q --detach "$C" HEAD || { echo "MUT $ID: worktree failed"; exit 90; }
ln -s "$R/node_modules" "$C/node_modules"
cd "$C" || exit 90
for m in ${MUTS//,/ }; do
  if [ "$m" = "revert" ]; then
    git checkout 889e1b38 -- src/pages/IdleArena.tsx src/pages/StadiumTycoon.tsx src/components/tycoon/AcademyPanel.tsx src/pages/HallOfChampions.tsx || { echo "MUT $ID: revert failed"; exit 91; }
    echo "MUTATION revert applied (four dialog files at 889e1b38)"
  elif [ "$m" != "-" ]; then
    node .rc/x/apply.mjs "$m" || exit 92
  fi
done
git diff --stat | tail -6
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
