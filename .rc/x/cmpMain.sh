#!/usr/bin/env bash
# Round 1509: run one harness on this tree and on main as Release BJ left it (BASE_REF, default 77556430), print both
# exits and last lines. Green when this tree's run is green, or red exactly as main is (the same exit and last line).
set -uo pipefail
B=${BASE_REF:-77556430}
T=$(mktemp -d /tmp/cmpmain-XXXXXX)
git worktree add -q --detach "$T/base" "$B" || exit 2
ln -s "$PWD/node_modules" "$T/base/node_modules"
"$@" > "$T/h.log" 2>&1; eh=$?
(cd "$T/base" && "$@" > "$T/b.log" 2>&1); eb=$?
lh=$(tail -1 "$T/h.log" | cut -c1-220); lb=$(tail -1 "$T/b.log" | cut -c1-220)
echo "head exit $eh: $lh"
echo "main exit $eb: $lb"
grep -E "FAIL|RED|not ok" "$T/h.log" | head -8 | cut -c1-220
[ "$eh" -eq 0 ] || { [ "$eh" -eq "$eb" ] && [ "$lh" = "$lb" ]; }
