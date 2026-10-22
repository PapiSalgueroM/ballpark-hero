#!/usr/bin/env bash
# Reviewer fleet comparison (runner only): three engine fleet harnesses on the branch head and on origin/main,
# outputs diffed after removing timings. Logs are copied into $RC_OUT/fleet/.
set -u
ROOTDIR="$PWD"
mkdir -p "$RC_OUT/fleet"
git worktree add -f /tmp/base origin/main >/dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$ROOTDIR/node_modules" /tmp/base/node_modules
echo "base $(git -C /tmp/base rev-parse --short HEAD) branch $(git rev-parse --short HEAD)"
norm() { sed -E 's/[0-9]+(\.[0-9]+)? ?(ms|s)\b/T/g; s#/tmp/[A-Za-z0-9._-]+#TMP#g' "$1"; }
for h in simWonderkid simStadiumTycoon simTycoonLeague simTycoonSetPiece; do
  NODE_OPTIONS="--require=$ROOTDIR/scripts/lib/offlineTransport.cjs" node "scripts/$h.mjs" > "$RC_OUT/fleet/branch-$h.txt" 2>&1; a=$?
  ( cd /tmp/base && NODE_OPTIONS="--require=/tmp/base/scripts/lib/offlineTransport.cjs" node "scripts/$h.mjs" > "$RC_OUT/fleet/main-$h.txt" 2>&1 ); b=$?
  d=$(diff <(norm "$RC_OUT/fleet/branch-$h.txt") <(norm "$RC_OUT/fleet/main-$h.txt") | grep -c '^[<>]')
  echo "FLEET $h branch_exit=$a main_exit=$b differing_lines=$d"
  diff <(norm "$RC_OUT/fleet/branch-$h.txt") <(norm "$RC_OUT/fleet/main-$h.txt") | head -8
done
echo "FLEETDIFF DONE"
