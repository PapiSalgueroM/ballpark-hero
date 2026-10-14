#!/usr/bin/env bash
# Release BE join: playCmHubLanding section C on main (4a5f759a) built and served beside the head, to tell a red the join
# brought from one that was already there. usage: bash .rc/x/hubBase.sh <sha> <port>
set -e
sha="$1"; port="$2"; dir="/tmp/hb-$sha"
git worktree add -q --detach "$dir" "$sha"
ln -s "$PWD/node_modules" "$dir/node_modules"
( cd "$dir" && npx vite build > "/tmp/hb-$sha-build.log" 2>&1 )
( cd "$dir" && node scripts/lib/hostLikeServer.mjs dist "$port" > "/tmp/hb-$sha-server.log" 2>&1 & )
for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf "http://127.0.0.1:$port/" > /dev/null && break; sleep 1; done
cd "$dir" && BASE="http://127.0.0.1:$port" SWEEP_BASE="http://127.0.0.1:$port" HUB_LANDING_SECTIONS=C node scripts/playCmHubLanding.mjs
