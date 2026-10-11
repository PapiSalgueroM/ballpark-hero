#!/usr/bin/env bash
# Round 1306: the weight rows of ANOTHER commit, measured by that commit's own sweepWeight on its own build.
# usage (from the runner's repo root): bash .rc/x/weightAt.sh <sha> <port>
set -u
sha="$1"; port="$2"; d="/tmp/w-$sha"
git worktree add -q "$d" "$sha" || { echo "weightAt: no worktree for $sha"; exit 2; }
ln -s "$PWD/node_modules" "$d/node_modules"
cd "$d" || exit 2
npm run build > "/tmp/w-$sha-build.log" 2>&1 || { echo "weightAt: the build of $sha failed"; tail -5 "/tmp/w-$sha-build.log"; exit 2; }
node scripts/lib/hostLikeServer.mjs dist "$port" > "/tmp/w-$sha-serve.log" 2>&1 &
pid=$!
sleep 5
SWEEP_OFFLINE=1 BASE="http://localhost:$port" SWEEP_BASE="http://localhost:$port" node scripts/sweepWeight.mjs
s=$?
kill "$pid" 2>/dev/null
echo "weightAt: $sha measured, sweepWeight exit $s"
exit $s
