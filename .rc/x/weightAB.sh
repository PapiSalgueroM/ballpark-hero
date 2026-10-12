#!/usr/bin/env bash
# Reviewer facts-screens-weight, Release AZ. Never committed. Runs on a runner from the repo root, after the
# request's own served build of HEAD (http://localhost:4173). Builds two more trees and weighs all three with
# scripts/sweepWeight.mjs (SWEEP_OFFLINE=1), HEAD's copy of the harness every time:
#   base  48cb9d4b (origin/main, Release AY recorded: the first parent of everything this branch adds on top)
#   stub  HEAD with the lz-string import of src/lib/clubManagerWorldRoster.ts replaced by two identity functions
# The head minus the stub is what lz-string itself costs each page; the head minus the base is the whole leg.
set -u
ROOT=$PWD
OUTD=${RC_OUT:-/tmp/rcout}; mkdir -p "$OUTD"
git worktree add -f /tmp/wbase 48cb9d4b > /dev/null 2>&1 || { echo "ABORT worktree base"; exit 2; }
git worktree add -f /tmp/wstub HEAD > /dev/null 2>&1 || { echo "ABORT worktree stub"; exit 2; }
ln -s "$ROOT/node_modules" /tmp/wbase/node_modules
ln -s "$ROOT/node_modules" /tmp/wstub/node_modules
node .rc/x/stubLz.mjs /tmp/wstub/src/lib/clubManagerWorldRoster.ts || { echo "ABORT stub edit"; exit 2; }
for t in wbase wstub; do
  (cd /tmp/$t && node_modules/.bin/vite build > "$OUTD/build-$t.log" 2>&1) || { echo "ABORT build $t"; tail -20 "$OUTD/build-$t.log"; exit 2; }
done
echo "clubManager and lz-string chunks (head, base, stub):"
for d in "$ROOT/dist" /tmp/wbase/dist /tmp/wstub/dist; do
  for f in $(ls "$d"/assets/clubManager-*.js; grep -l "compressToUTF16" "$d"/assets/*.js 2>/dev/null); do echo "  $d $(basename "$f") raw $(wc -c < "$f") gz $(gzip -9 -c "$f" | wc -c)"; done
done
node "$ROOT/scripts/lib/hostLikeServer.mjs" /tmp/wbase/dist 4174 > /dev/null 2>&1 &
P1=$!
node "$ROOT/scripts/lib/hostLikeServer.mjs" /tmp/wstub/dist 4175 > /dev/null 2>&1 &
P2=$!
sleep 3
SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs > "$OUTD/weight-head.txt" 2>&1; echo "head sweep exit $?"
BASE=http://localhost:4174 SWEEP_BASE=http://localhost:4174 SWEEP_OFFLINE=1 node /tmp/wbase/scripts/sweepWeight.mjs > "$OUTD/weight-base.txt" 2>&1; echo "base sweep exit $?"
BASE=http://localhost:4175 SWEEP_BASE=http://localhost:4175 SWEEP_OFFLINE=1 node /tmp/wstub/scripts/sweepWeight.mjs > "$OUTD/weight-stub.txt" 2>&1; echo "stub sweep exit $?"
kill $P1 $P2 2> /dev/null
node .rc/x/weightCompare.mjs "$OUTD/weight-base.txt" "$OUTD/weight-head.txt" "$OUTD/weight-stub.txt"
