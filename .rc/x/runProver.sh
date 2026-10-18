#!/usr/bin/env bash
# Release BK kit: runs one packet's own prover (or any command) in a fresh detached worktree of <commit> (a bindAt.sh
# commit), with the offline preload and the environment its workflow gives it: CI=1, SIM_NETWORK=offline, TZ=UTC,
# GITHUB_SHA=<commit>, NODE_OPTIONS=--require=<worktree>/scripts/lib/offlineTransport.cjs, <OUT variable> set to a
# fresh folder outside the worktree, and each KEY=VALUE given (a workflow's baseline raw sha). node_modules is the
# checkout's, linked in (ignored by git). Prints the last lines of the command's output and exits with its code.
# Files named after --keep (paths inside the OUT folder) are copied to $RC_OUT/<label>-<path with / as _> when RC_OUT
# is set.
# usage: bash .rc/x/runProver.sh <commit> <label> <OUT variable> [KEY=VALUE]... [--keep <path in OUT>]... -- <command>...
set -uo pipefail
HOME_DIR=$PWD
C=$(git rev-parse "$1^{commit}") || exit 2; LABEL=$2; OV=$3; shift 3
envs=(); keeps=()
while [ "$#" -gt 0 ] && [ "$1" != "--" ]; do
  if [ "$1" = "--keep" ]; then keeps+=("$2"); shift 2; else envs+=("$1"); shift; fi
done
[ "${1:-}" = "--" ] || { echo "runProver: no -- before the command" >&2; exit 2; }
shift
W=/tmp/rp-wt-$LABEL; O=/tmp/rp-out-$LABEL
test ! -e "$W" && test ! -e "$O" || { echo "runProver: $W or $O exists" >&2; exit 2; }
git worktree add -q --detach "$W" "$C" || exit 2
ln -s "$HOME_DIR/node_modules" "$W/node_modules"
mkdir -p "$O"
cd "$W"
echo "runProver: $LABEL at $C ($(git log -1 --format=%s | cut -c1-90))"
env "$OV=$O" CI=1 SIM_NETWORK=offline TZ=UTC GITHUB_SHA="$C" NODE_OPTIONS="--require=$W/scripts/lib/offlineTransport.cjs" "${envs[@]}" "$@" > "$O/run.log" 2>&1
s=$?
tail -n 25 "$O/run.log" | cut -c1-400
if [ -n "${RC_OUT:-}" ]; then for k in "${keeps[@]}"; do [ -f "$O/$k" ] && cp "$O/$k" "$RC_OUT/$LABEL-${k//\//_}"; done; fi
echo "runProver: $LABEL exit $s"
exit $s
