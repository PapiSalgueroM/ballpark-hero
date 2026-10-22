#!/usr/bin/env bash
# Release BJ (Round BJG), from Round BIK's contCmp1508.sh: usage bash contCmpBJ.sh <piece tip> <first parent> <label>.
# Release BI, part five (Round BIK): simManagerWorldContinuity on this tree and on this tree WITHOUT Round 1508 (merge
# f1e54e17, first parent 67ec9956), and the two logs compared once the checkout path and the stack's line numbers are
# normalised (x/contNorm1508.mjs). The harness is red on main in two groups (inactive, constructors), so its exit code
# cannot be the check; Round 1508's check is that its log equals its base's line for line (finish-1508.md, r1508-g8),
# which holds only while cmNoAdoption1508 takes the adoption out of the current arm. Exit 0 when the two logs are equal
# and the two exit codes agree, 1 when they differ, 2 when the base cannot be formed. Both logs go to $RC_OUT.
# Needs x/contNorm1508.mjs beside it. Run from the repo root.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
TIP=${1:?piece tip}; BEFORE=${2:?first parent}; L=${3:-piece}
B=$(node scripts/lib/treeWithoutMerge.mjs "$TIP" "$BEFORE") || exit 2
D=$(mktemp -d /tmp/cont$L-XXXXXX)
git worktree add -q --detach "$D/base" "$B" || exit 2
ln -s "$PWD/node_modules" "$D/base/node_modules"
O=${RC_OUT:-$D}
MANAGER_WORLD_CONTINUITY_ARTIFACTS="$D/a-head" node scripts/simManagerWorldContinuity.mjs > "$O/cont$L-head.log" 2>&1; eh=$?
(cd "$D/base" && MANAGER_WORLD_CONTINUITY_ARTIFACTS="$D/a-base" node scripts/simManagerWorldContinuity.mjs > "$O/cont$L-base.log" 2>&1); eb=$?
node "$HERE/contNorm1508.mjs" "$O/cont$L-head.log" > "$D/h.txt"
node "$HERE/contNorm1508.mjs" "$O/cont$L-base.log" > "$D/b.txt"
n=$(diff "$D/h.txt" "$D/b.txt" | grep -c '^[<>]')
echo "contCmp $L: base $B (the tree without $L); head exit $eh, base exit $eb; $(wc -l < "$D/h.txt") and $(wc -l < "$D/b.txt") lines; $n differ"
grep -E '^FAIL' "$D/h.txt" | cut -c1-160 | head -6
if [ "$n" -ne 0 ] || [ "$eh" -ne "$eb" ]; then diff "$D/h.txt" "$D/b.txt" | head -30 | cut -c1-200; echo "contCmp $L: RED, the log differs from the tree without $L"; exit 1; fi
echo "contCmp $L: green, the log equals the tree without $L line for line"
