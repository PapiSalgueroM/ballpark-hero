#!/usr/bin/env bash
# Release BC gate, runner only. bash basesrv.sh <piece tip> <before the piece> <port> [nobuild]
# This head with one piece taken out (scripts/lib/treeWithoutMerge.mjs), as a detached worktree /tmp/wt-<port>
# (node_modules linked), then (unless nobuild) a plain npm run build served by hostLikeServer on <port>.
# Prints the worktree path on its last line.
set -u
TIP="$1"; BEFORE="$2"; P="$3"; MODE="${4:-}"
W="/tmp/wt-$P"
if [ -d "$W" ]; then
  if [ "$MODE" = "nobuild" ] || curl -s -o /dev/null "http://localhost:$P/club-manager"; then echo "already there: $W"; echo "$W"; exit 0; fi
else
  B=$(node scripts/lib/treeWithoutMerge.mjs "$TIP" "$BEFORE") || { echo "no base"; exit 2; }
  git worktree add -q --detach "$W" "$B" || { echo "worktree add failed"; exit 2; }
  ln -s "$PWD/node_modules" "$W/node_modules"
  echo "base $B (this head without $TIP), differs in: $(git diff --name-only "$B" HEAD -- src | tr '\n' ' ' | cut -c1-600)"
fi
if [ "$MODE" != "nobuild" ]; then
  (cd "$W" && npm run build > "/tmp/build-$P.log" 2>&1) || { tail -20 "/tmp/build-$P.log"; exit 2; }
  nohup node scripts/lib/hostLikeServer.mjs "$W/dist" "$P" > "/tmp/server-$P.log" 2>&1 &
  for i in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$P/club-manager" && break; sleep 1; done
  curl -s -o /dev/null -w "served on $P: %{http_code}\n" "http://localhost:$P/club-manager"
fi
echo "$W"
