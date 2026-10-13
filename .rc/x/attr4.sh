#!/usr/bin/env bash
# Runner side: run one harness on one commit (HEAD or a sha, in a detached worktree), keep the whole log in $RC_OUT,
# print the first assertion with its message and the first lines that name the pool. Usage: bash .rc/x/attr4.sh <commit|HEAD> <harness> [env...]
C="$1"; H="$2"; shift 2
ROOT="$PWD"
if [ "$C" = "HEAD" ]; then D="$ROOT"; else D="/tmp/w4-$C-$H"; git worktree add -q --detach "$D" "$C" && ln -s "$ROOT/node_modules" "$D/node_modules"; fi
cd "$D" || exit 9
mkdir -p "$RUNNER_TEMP/fc-$C"
L="$RC_OUT/attr4-$C-$H.log"
env "$@" SIM_NETWORK=offline TZ=UTC ENGINES=chromium FREE_KICK_FONT_CACHE="$RUNNER_TEMP/fc-$C" NODE_OPTIONS="--require=$D/scripts/lib/offlineTransport.cjs" node "scripts/$H.mjs" > "$L" 2>&1
s=$?
echo "pool mentions: $(grep -c generatedBallonPool "$L")"
grep -n -m 2 -B 2 -A 6 -E "AssertionError" "$L" | cut -c1-240
grep -n -m 4 -E "message:|PASS|FAIL" "$L" | cut -c1-240
grep -n -m 3 -E "^\s+at " "$L" | cut -c1-200
tail -2 "$L" | cut -c1-200
echo "attr4 $C $H exit=$s"
exit $s
