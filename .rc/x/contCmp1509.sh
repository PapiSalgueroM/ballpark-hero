#!/usr/bin/env bash
# Round 1509: simManagerWorldContinuity on this tree and on main as Release BJ left it (77556430), the two logs
# compared once normalised (contNorm1508.mjs). The harness is red on main in its own groups, so its exit code cannot
# be the check: the round's check is that its log equals main's line for line. Exit 0 equal, 1 differ, 2 no base.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
B=${1:-77556430}
D=$(mktemp -d /tmp/cont1509-XXXXXX)
git worktree add -q --detach "$D/base" "$B" || exit 2
ln -s "$PWD/node_modules" "$D/base/node_modules"
O=${RC_OUT:-$D}
MANAGER_WORLD_CONTINUITY_ARTIFACTS="$D/a-head" node scripts/simManagerWorldContinuity.mjs > "$O/cont1509-head.log" 2>&1; eh=$?
(cd "$D/base" && MANAGER_WORLD_CONTINUITY_ARTIFACTS="$D/a-base" node scripts/simManagerWorldContinuity.mjs > "$O/cont1509-base.log" 2>&1); eb=$?
node "$HERE/contNorm1508.mjs" "$O/cont1509-head.log" > "$D/h.txt"
node "$HERE/contNorm1508.mjs" "$O/cont1509-base.log" > "$D/b.txt"
n=$(diff "$D/h.txt" "$D/b.txt" | grep -c '^[<>]')
echo "contCmp1509: base $B; head exit $eh, base exit $eb; $(wc -l < "$D/h.txt") and $(wc -l < "$D/b.txt") lines; $n differ"
grep -E '^FAIL' "$D/h.txt" | cut -c1-160 | head -6
if [ "$n" -ne 0 ] || [ "$eh" -ne "$eb" ]; then diff "$D/h.txt" "$D/b.txt" | head -30 | cut -c1-200; echo "contCmp1509: RED, the log differs from main"; exit 1; fi
echo "contCmp1509: green, the log equals main line for line"
