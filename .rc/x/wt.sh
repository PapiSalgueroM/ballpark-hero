#!/usr/bin/env bash
# Release BC join, runner only. bash wt.sh <ref> <port>: sweepWeight (SWEEP_OFFLINE=1) on a plain served build of <ref>,
# run inside that ref's own worktree so dist/assets and the served build are the same files.
set -u
REF="$1"; P="$2"
bash .rc/x/srv.sh "$REF" "$P" || exit 2
cd "/tmp/wt-$P" || exit 2
BASE="http://localhost:$P" SWEEP_BASE="http://localhost:$P" SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs > "/tmp/wt-$P.log" 2>&1; s=$?
echo "weight at $(git rev-parse --short HEAD): exit $s"
grep -E "^   /" "/tmp/wt-$P.log" | cut -c1-120
tail -1 "/tmp/wt-$P.log" | cut -c1-200
exit $s
