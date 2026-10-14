#!/usr/bin/env bash
# Release BE join: sweepWeight on main and on each merge of the join, so every weight row's move has its merge.
# usage (rc runner, repo root, after npm ci and Chromium): bash .rc/x/weighChain.sh label=sha ...
ROOT="$PWD"; PORT=4300
for pair in "$@"; do
  label="${pair%%=*}"; sha="${pair#*=}"; dir="/tmp/wc-$label"; PORT=$((PORT + 1))
  git worktree add -q --detach "$dir" "$sha" || { echo "$label: worktree failed"; continue; }
  ln -s "$ROOT/node_modules" "$dir/node_modules"
  ( cd "$dir" && npx vite build > "/tmp/wc-$label-build.log" 2>&1 ) || { echo "$label: build failed"; tail -5 "/tmp/wc-$label-build.log"; continue; }
  ( cd "$dir" && node scripts/lib/hostLikeServer.mjs dist $PORT > "/tmp/wc-$label-server.log" 2>&1 & echo $! > "/tmp/wc-$label.pid" )
  for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf "http://127.0.0.1:$PORT/" > /dev/null && break; sleep 1; done
  ( cd "$dir" && BASE="http://127.0.0.1:$PORT" SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs > "/tmp/wc-$label.log" 2>&1 )
  echo "== $label $sha"
  grep -E "^ +/" "/tmp/wc-$label.log" | cut -c1-80
  kill "$(cat "/tmp/wc-$label.pid")" 2>/dev/null
done
exit 0
