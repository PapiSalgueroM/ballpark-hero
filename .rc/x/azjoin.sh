#!/usr/bin/env bash
# Round 1326 fix pass 2: a trial join of this round with Release AZ for simCmShootoutOrder only.
# The tree is AZ's head with this round's engine words applied as a patch (diff of main 36cc9ffe to this
# head, src/lib/clubManager.ts only) and simCmShootoutOrder.mjs as git merge-tree writes it for this head
# against origin/release-az-int (the file must merge with no conflict). Then the harness runs on that tree.
set -u
HEAD_SHA=$(git rev-parse HEAD)
AZ=$(git rev-parse origin/release-az-int) || { echo "no origin/release-az-int on the runner"; exit 2; }
MAIN=36cc9ffe7e13ed1c1e5f994b6a3998c8e3206e2c
echo "trial join: head $HEAD_SHA, AZ $AZ, main $MAIN"
OUT=$(git merge-tree --write-tree --name-only HEAD "$AZ")
T=$(printf '%s\n' "$OUT" | head -1)
echo "merge-tree $T; conflict files:"; printf '%s\n' "$OUT" | grep CONFLICT
if printf '%s\n' "$OUT" | grep -q 'CONFLICT.*simCmShootoutOrder'; then echo "FAIL: simCmShootoutOrder.mjs still conflicts with AZ"; exit 1; fi
W=/tmp/wt-az
git worktree add --detach "$W" "$AZ" >/dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$PWD/node_modules" "$W/node_modules"
git diff "$MAIN" HEAD -- src/lib/clubManager.ts > /tmp/r1326-engine.patch
git -C "$W" apply /tmp/r1326-engine.patch || { echo "the engine patch did not apply on AZ"; exit 2; }
git show "$T:scripts/simCmShootoutOrder.mjs" > "$W/scripts/simCmShootoutOrder.mjs"
grep -c 'withRound1326WordsBack\|withoutWorldSeed' "$W/scripts/simCmShootoutOrder.mjs"
git -C "$W" diff --stat | tail -3
mkdir -p /tmp/azjoin-tmp && TMPDIR=/tmp/azjoin-tmp node "$W/scripts/simCmShootoutOrder.mjs"
s=$?
echo "trial join simCmShootoutOrder exit=$s"
exit $s
