#!/usr/bin/env bash
# Round 1306: one browser walk on the served head; if it is red, the same walk on the base's own build, so a
# red comes back with whether the base is red the same way.
# usage (from the runner's repo root, the head served on 4173): bash .rc/x/walkBoth.sh <walk name>
set -u
w="$1"; sha=c9a1f86a; d="/tmp/b-$sha"
node "scripts/$w.mjs"; s=$?
if [ $s -eq 0 ]; then exit 0; fi
echo "=== walkBoth: $w is RED on the head (exit $s). The same walk on the base $sha:"
if [ ! -d "$d" ]; then
  git worktree add -q "$d" "$sha" && ln -s "$PWD/node_modules" "$d/node_modules" && (cd "$d" && npm run build > /tmp/b-build.log 2>&1) || { echo "walkBoth: could not build the base"; exit $s; }
fi
cd "$d" || exit $s
node scripts/lib/hostLikeServer.mjs dist 4190 > /tmp/b-serve.log 2>&1 < /dev/null &
pid=$!
sleep 5
BASE=http://localhost:4190 SWEEP_BASE=http://localhost:4190 DEAL_DESK_PORT=4191 node "scripts/$w.mjs"; b=$?
kill "$pid" 2>/dev/null
echo "=== walkBoth: $w head exit $s, base exit $b"
exit $s
