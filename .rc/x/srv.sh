#!/usr/bin/env bash
# Release BC join, runner only. bash srv.sh <ref> <port> [minus1328]
# A detached worktree of <ref> at /tmp/wt-<port> (node_modules linked), a plain npm run build, served by
# hostLikeServer on <port>. minus1328 first reverts the m4 seam (f14ec63a) and the m4 merge of Round 1328
# (ca832a29, mainline 1), so the build is <ref> without Round 1328: the base of 1328's section D on that tree.
set -u
REF="$1"; P="$2"; MODE="${3:-}"
if curl -s -o /dev/null "http://localhost:$P/club-manager"; then echo "already served on $P"; exit 0; fi
W="/tmp/wt-$P"
git worktree add -q --detach "$W" "$REF" || { echo "worktree add failed"; exit 2; }
ln -s "$PWD/node_modules" "$W/node_modules"
if [ "$MODE" = "minus1328" ]; then
  (cd "$W" && git -c user.name=t -c user.email=t@invalid revert --no-edit f14ec63ad576e2794f7e8226d2411c4856772abe > /tmp/rev-$P.log 2>&1 \
    && git -c user.name=t -c user.email=t@invalid revert --no-edit -m 1 ca832a29e85d7daa8ea3698e45375f147dd217ad >> /tmp/rev-$P.log 2>&1) \
    || { echo "revert failed"; tail -8 /tmp/rev-$P.log; (cd "$W" && git status --short | head -10); exit 2; }
  (cd "$W" && echo "reverted to $(git rev-parse --short HEAD), files: $(git diff --name-only "$REF" HEAD | tr '\n' ' ')")
fi
(cd "$W" && npm run build > "/tmp/build-$P.log" 2>&1) || { tail -20 "/tmp/build-$P.log"; exit 2; }
nohup node scripts/lib/hostLikeServer.mjs "$W/dist" "$P" > "/tmp/server-$P.log" 2>&1 &
for i in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$P/club-manager" && break; sleep 1; done
curl -s -o /dev/null -w "served $REF $MODE on $P: %{http_code}\n" "http://localhost:$P/club-manager"
