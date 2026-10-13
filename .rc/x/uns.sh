#!/usr/bin/env bash
# Release BC join, runner only. bash uns.sh <ref> <dir> [control]
# simCmUnseededWorld at <ref> in a detached worktree <dir>, its BASE moved from b6eb78e7 (Release AX, the first
# parent of AZ's merge e) to 36cc9ffe (Release BB as published, the first parent of this join's AZ merge m1).
set -u
REF="$1"; D="$2"; C="${3:-}"
git worktree add -q --detach "$D" "$REF" || { echo "worktree add failed"; exit 2; }
ln -s "$PWD/node_modules" "$D/node_modules"
cd "$D" || exit 2
OLD="const BASE = 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';"
NEW="const BASE = '36cc9ffe7e13ed1c1e5f994b6a3998c8e3206e2c';"
n=$(grep -c -F "$OLD" scripts/simCmUnseededWorld.mjs)
[ "$n" = "1" ] || { echo "the BASE line is there $n times, not once"; exit 2; }
sed -i "s/b6eb78e799b12c851e4e8e583e9e926aed117f1c/36cc9ffe7e13ed1c1e5f994b6a3998c8e3206e2c/" scripts/simCmUnseededWorld.mjs
grep -c -F "$NEW" scripts/simCmUnseededWorld.mjs | grep -qx 1 || { echo "the edit did not land"; exit 2; }
L="/tmp/uns-$(basename "$D").log"
CM_UNSEEDED_CONTROL="$C" node scripts/simCmUnseededWorld.mjs > "$L" 2>&1; s=$?
echo "at $(git rev-parse --short HEAD) base 36cc9ffe control '${C}': exit $s, FAIL lines $(grep -c FAIL "$L")"
grep "FAIL" "$L" | head -6 | cut -c1-260
tail -1 "$L" | cut -c1-300
exit $s
