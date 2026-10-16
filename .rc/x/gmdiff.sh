#!/usr/bin/env bash
# simGmInbox at SEED 1, 2, 3 on this head and on FENCE_BASE (082fc277), whole output diffed.
BASE=${FENCE_BASE:-082fc277}
set -u
git worktree add -f .base "$BASE" >/dev/null 2>&1 || { echo "could not add the base worktree"; exit 2; }
bad=0
for s in 1 2 3; do
  SEED=$s node scripts/simGmInbox.mjs > /tmp/gm-head-$s.txt 2>&1; he=$?
  (cd .base && SEED=$s node scripts/simGmInbox.mjs > /tmp/gm-base-$s.txt 2>&1); be=$?
  if diff /tmp/gm-head-$s.txt /tmp/gm-base-$s.txt > /tmp/gm-diff-$s.txt; then
    echo "seed $s: head exit $he, base exit $be, whole output identical ($(wc -l < /tmp/gm-head-$s.txt) lines; last: $(tail -1 /tmp/gm-head-$s.txt))"
  else
    echo "seed $s: head exit $he, base exit $be, OUTPUT DIFFERS:"; head -20 /tmp/gm-diff-$s.txt; bad=1
  fi
  [ "$he" = 0 ] || bad=1
done
[ -n "${RC_OUT:-}" ] && cp /tmp/gm-head-1.txt "$RC_OUT/simGmInbox-seed1-head.txt" 2>/dev/null
echo "gmdiff: $([ $bad = 0 ] && echo 'all three seeds identical to the base and green' || echo 'RED')"
exit $bad
