#!/usr/bin/env bash
# Runner side: run one harness on one commit in a detached worktree; print the pool mentions, the first assertion
# message and the exit code on the last line. Usage: bash .rc/x/attr3.sh <commit|HEAD> <harness name> [env...]
C="$1"; H="$2"; shift 2
ROOT="$PWD"
if [ "$C" = "HEAD" ]; then D="$ROOT"; else D="/tmp/w-$C-$H"; git worktree add -q --detach "$D" "$C" && ln -s "$ROOT/node_modules" "$D/node_modules"; fi
cd "$D" || exit 9
L="$RUNNER_TEMP/attr-$C-$H.log"
env "$@" SIM_NETWORK=offline TZ=UTC NODE_OPTIONS="--require=$D/scripts/lib/offlineTransport.cjs" node "scripts/$H.mjs" > "$L" 2>&1
s=$?
echo "pool mentions: $(grep -c generatedBallonPool "$L")"
grep -m 3 -E "AssertionError|Error:|FAIL|PASS" "$L" | cut -c1-200
tail -2 "$L" | cut -c1-200
echo "attr3 $C $H exit=$s"
exit $s
