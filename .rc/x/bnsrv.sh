#!/usr/bin/env bash
# Round 1535, runner only. Build origin/main before Round 1442 (c3309e67, Release BN) in /tmp/wt-bn with this head's
# copies of the named files (the walks under test and scripts/lib/answerConsent.mjs) laid over it, and serve its dist
# on 4174. A walk then runs from /tmp/wt-bn with BASE=http://localhost:4174, so it reads BN's src and plays BN's build
# with exactly the walk this round ships. Prints the worktree on its last line.
set -u
W=/tmp/wt-bn; P=4174
if [ ! -d "$W" ]; then
  git worktree add -q --detach "$W" c3309e67 || { echo "worktree add failed"; exit 2; }
  ln -s "$PWD/node_modules" "$W/node_modules"
  for f in "$@"; do mkdir -p "$W/$(dirname "$f")"; cp "$f" "$W/$f"; done
  echo "BN tree c3309e67 with this head's: $*"
  (cd "$W" && npm run build > /tmp/build-bn.log 2>&1) || { tail -20 /tmp/build-bn.log; exit 2; }
  nohup node scripts/lib/hostLikeServer.mjs "$W/dist" "$P" > /tmp/server-bn.log 2>&1 &
  for i in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$P/" && break; sleep 1; done
fi
curl -s -o /dev/null -w "served BN on $P: %{http_code}\n" "http://localhost:$P/"
echo "$W"
