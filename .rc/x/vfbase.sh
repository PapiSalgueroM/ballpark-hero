#!/usr/bin/env bash
# Skeptic probe: build main (b20ec6664) beside the PR build and run the same walk on it. Never committed.
set -u
R="$PWD"; D=/tmp/vfbase; SHA=b20ec6664df9d4c58d63ea0596791d33b2a3b8fc; PORT=4175
git worktree add -q --detach "$D" "$SHA" || exit 3
cd "$D" || exit 3
echo "base head: $(git rev-parse HEAD)"
grep -c "Back to career" src/pages/SoccerCareer.tsx | sed 's/^/Back to career lines on base: /'
grep -c "data-season-centre-loading" src/pages/SoccerCareer.tsx | sed 's/^/season centre loading lines on base: /'
ln -s "$R/node_modules" node_modules
node_modules/.bin/vite build > "$D.build.log" 2>&1 || { tail -20 "$D.build.log"; echo "build failed"; exit 5; }
tail -1 "$D.build.log"
node "$R/scripts/lib/hostLikeServer.mjs" dist "$PORT" > "$D.server.log" 2>&1 &
SP=$!
sleep 4
cd "$R"
SWEEP_BASE="http://localhost:$PORT" TAG=main ONLY="${ONLY:-CT}" node .rc/x/vfwalk.mjs
s=$?
kill "$SP" 2>/dev/null
exit $s
