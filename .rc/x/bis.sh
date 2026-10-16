#!/usr/bin/env bash
# Round 1343 fix pass 3 probe (never committed). Usage from the repo root:
#   bash .rc/x/bis.sh <label> <sha> [frozen]
# Checks out <sha> as a worktree inside the repo (node_modules by walk-up),
# optionally swaps in the Round 1081 frozen decisions desk from the head's
# fixture, and runs simClubManagerDecisions at the default seed and 1 to 4,
# printing the exit, the section 1 line and the FAIL lines of each.
set -u
L=$1; SHA=$2; MODE=${3:-}
ROOTDIR=$PWD
D=$ROOTDIR/.wt-$L
git worktree add -f --detach "$D" "$SHA" >/dev/null 2>&1 || { echo "$L worktree add failed for $SHA"; exit 3; }
if [ "$MODE" = frozen ]; then
  cp "$ROOTDIR/scripts/fixtures/managerAppealIsolation1081/clubManagerDecisions.historical.ts" "$D/src/lib/clubManagerDecisions.ts"
fi
echo "$L at $(git -C "$D" rev-parse --short HEAD) mode=${MODE:-tree} desk=$(sha256sum "$D/src/lib/clubManagerDecisions.ts" | cut -c1-8)"
cd "$D"
bad=0
for s in default 1 2 3 4; do
  O=/tmp/bis-$L-$s.txt
  if [ "$s" = default ]; then
    env -u SIM_SEED -u CM_DECISIONS_CONTROL NODE_OPTIONS="--require=$ROOTDIR/scripts/lib/offlineTransport.cjs" node scripts/simClubManagerDecisions.mjs > "$O" 2>&1
  else
    env -u CM_DECISIONS_CONTROL SIM_SEED=$s NODE_OPTIONS="--require=$ROOTDIR/scripts/lib/offlineTransport.cjs" node scripts/simClubManagerDecisions.mjs > "$O" 2>&1
  fi
  e=$?
  [ $e -ne 0 ] && bad=1
  echo "$L seed=$s exit=$e | $(grep -E '^1\. appeals' "$O" | head -1) | $(grep '^FAIL ' "$O" | head -3 | tr '\n' ';') | $(tail -1 "$O" | cut -c1-120)"
done
exit $bad
