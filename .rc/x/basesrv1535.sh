#!/usr/bin/env bash
# Round 1535 fixer, runner only. Build an older commit in /tmp/wt-<sha> and serve its dist on a port, so a walk can
# compare this tree with it. Usage: bash .rc/x/basesrv.sh <sha> <port>. Prints the dist path on its last line.
set -u
SHA="$1"; P="$2"; W="/tmp/wt-$SHA"
if [ ! -d "$W" ]; then
  git worktree add -q --detach "$W" "$SHA" || { echo "worktree add failed"; exit 2; }
  ln -s "$PWD/node_modules" "$W/node_modules"
  (cd "$W" && npm run build > "/tmp/build-$SHA.log" 2>&1) || { tail -20 "/tmp/build-$SHA.log"; exit 2; }
  nohup node scripts/lib/hostLikeServer.mjs "$W/dist" "$P" > "/tmp/server-$SHA.log" 2>&1 &
  for i in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$P/" && break; sleep 1; done
fi
curl -s -o /dev/null -w "served $SHA on $P: %{http_code}\n" "http://localhost:$P/"
echo "$W/dist"
