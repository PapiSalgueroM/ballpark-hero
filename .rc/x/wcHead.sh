#!/usr/bin/env bash
# Runs simManagerWorldContinuity on one commit with its output in a capped file, then prints the size, the head and
# the tail of that output. Never committed (sent as an extra file).
R=$PWD
git worktree add "/tmp/wc-$1" "$1" >/dev/null 2>&1 || { echo "worktree add failed"; exit 3; }
cd "/tmp/wc-$1" && ln -s "$R/node_modules" node_modules
L="$RUNNER_TEMP/wc-$1.log"
( ulimit -f 512000; timeout 1500 node --max-old-space-size=4000 scripts/simManagerWorldContinuity.mjs > "$L" 2>&1 ); s=$?
echo "exit $s, log bytes $(stat -c %s "$L"), lines $(wc -l < "$L")"
head -c 12000 "$L" | cut -c1-300 | head -60
echo "..."
tail -c 12000 "$L" | cut -c1-300 | tail -50
df -m /tmp | tail -1
exit $s
