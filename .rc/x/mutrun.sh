#!/usr/bin/env bash
# Review of Round 1301 (runner only, never committed): one mutation, the round's gates, the tree restored.
# usage: mutrun.sh <mutation> <sport> <fleet dir> [vitest file ...]
# Exit 0 when a gate caught the mutation, 1 when everything stayed green (it escaped), 2 when it did not apply.
set -u
M="$1"; S="$2"; D="$3"; shift 3
L="$RC_OUT/mut-$M"; mkdir -p "$L"
if ! node .rc/x/mut.mjs "$M"; then echo "MUT $M: ABORTED, the mutation did not apply"; git checkout -- src scripts; exit 2; fi
git diff --stat | tail -1
V="not run"; VC=0
if [ "$#" -gt 0 ]; then
  node_modules/.bin/vitest run "$@" --testTimeout=300000 --hookTimeout=120000 > "$L/vitest.log" 2>&1; VC=$?
  V="exit $VC, $(grep -E "^ +Tests " "$L/vitest.log" | tail -1 | tr -s ' ')"
  grep -E "FAIL|AssertionError" "$L/vitest.log" | cut -c1-260 | head -12
fi
SIM_FLEET_DIR="$D" SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs "$S" 2000 > "$L/hall.log" 2>&1; HC=$?
H="$(tail -1 "$L/hall.log" | cut -c1-260)"
grep -E "^  FAIL|17 \(a\) marks, the fleet|at or over from, pooled" "$L/hall.log" | cut -c1-360
git checkout -- src scripts
LEFT="$(git status --short -- src scripts | head -3)"
[ -n "$LEFT" ] && echo "MUT $M: THE TREE WAS NOT RESTORED: $LEFT"
CAUGHT=no
[ "$VC" -ne 0 ] && CAUGHT=yes
echo "$H" | grep -q "red \[" && CAUGHT=yes
echo "MUT $M: caught=$CAUGHT | vitest $V | hall $S exit $HC: $H"
[ "$CAUGHT" = yes ] && exit 0
exit 1
