#!/usr/bin/env bash
# weight.sh (fixer scratch, Round 1103, never committed). Runs on the GitHub runner from the repo root, under
# "#!serve" (this head's build is on http://localhost:4173). Measures /nba-my-career on this head, then builds
# release-ap-int in its own checkout, serves it on 4174 and measures the same route, so the report has the size
# and what this round adds to it.
set -u
REPO="$PWD"
ROUTE="${1:-/nba-my-career}"
node .rc/x/weightRoute.mjs "$REPO/dist" http://localhost:4173 "$ROUTE" "this head"; A=$?
D="$(mktemp -d)"
git fetch -q origin release-ap-int || { echo "fetch failed"; exit 2; }
SHA="$(git rev-parse FETCH_HEAD)"
git worktree add --detach "$D/tree" "$SHA" > /dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$REPO/node_modules" "$D/tree/node_modules"
( cd "$D/tree" && node_modules/.bin/vite build > "$D/build.log" 2>&1 ) || { tail -8 "$D/build.log"; echo "build of release-ap-int failed"; exit 2; }
node "$D/tree/scripts/lib/hostLikeServer.mjs" "$D/tree/dist" 4174 > "$D/serve.log" 2>&1 &
SRV=$!
sleep 4
node .rc/x/weightRoute.mjs "$D/tree/dist" http://localhost:4174 "$ROUTE" "release-ap-int ${SHA:0:8}"; B=$?
kill $SRV 2> /dev/null
exit $(( A | B ))
