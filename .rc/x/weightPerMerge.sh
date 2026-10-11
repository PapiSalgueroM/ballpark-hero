#!/usr/bin/env bash
# Reviewer facts-fences, Release AW part one: which merge moved the /soccer-career row of sweepWeight.
# Builds the tree at the base, at each merge commit and at the head, serves each build on its own port and
# prints that tree's own sweepWeight row for /soccer-career. Read only: nothing is committed or pushed.
set -u
ROOT="$PWD"
port=4300
for pair in base:7037e28d a:70d28387 b:22f00fa0 c:9e3d3d9b d:347b4918 e:540c87db f:464a08dc g:a24cb16c h:16eb38f4 head:64d87aed; do
  tag="${pair%%:*}"; sha="${pair##*:}"
  dir="/tmp/w-$tag"
  if ! git worktree add -q --detach "$dir" "$sha" > "/tmp/wt-$tag.log" 2>&1; then echo "$tag $sha | worktree failed"; tail -2 "/tmp/wt-$tag.log"; continue; fi
  ln -s "$ROOT/node_modules" "$dir/node_modules"
  if ! ( cd "$dir" && npm run build > "/tmp/build-$tag.log" 2>&1 ); then echo "$tag $sha | build failed"; tail -3 "/tmp/build-$tag.log"; continue; fi
  port=$((port + 1))
  ( cd "$dir" && exec node scripts/lib/hostLikeServer.mjs dist "$port" > "/tmp/serve-$tag.log" 2>&1 ) &
  pid=$!
  sleep 4
  ( cd "$dir" && BASE="http://localhost:$port" SWEEP_BASE="http://localhost:$port" SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs > "/tmp/sweep-$tag.log" 2>&1 )
  code=$?
  row=$(grep -E "^ +/soccer-career " "/tmp/sweep-$tag.log" | head -1)
  last=$(tail -1 "/tmp/sweep-$tag.log")
  echo "$tag $sha | exit=$code |$row | $last"
  kill "$pid" 2> /dev/null
  wait "$pid" 2> /dev/null
  if [ -n "${RC_OUT:-}" ]; then cp "/tmp/sweep-$tag.log" "$RC_OUT/sweep-$tag.log" 2> /dev/null; fi
done
echo "weightPerMerge: done"
