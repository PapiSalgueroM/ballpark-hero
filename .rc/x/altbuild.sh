#!/usr/bin/env bash
# Reviewer probe: build another tree (a base sha, or the PR head merged with another sha) and walk it.
# usage: bash .rc/x/altbuild.sh <dir> <base sha> <merge sha or -> <port> <tag> <only>
set -u
R="$PWD"; D="$1"; BASE_SHA="$2"; MERGE_SHA="$3"; PORT="$4"; TAG="$5"; ONLY="$6"
git worktree add -q --detach "$D" "$BASE_SHA" || exit 3
cd "$D" || exit 3
if [ "$MERGE_SHA" != "-" ]; then
  git -c user.email=rv@example.com -c user.name=rv merge -q --no-edit "$MERGE_SHA" || { echo "merge failed"; exit 4; }
  echo "merged tree: $(git rev-parse HEAD^{tree})"
fi
grep -c "Back to career" src/pages/SoccerCareer.tsx | sed 's/^/Back to career lines: /'
grep -c "top-11" src/pages/SoccerCareer.tsx | sed 's/^/1568 toast lines: /'
ln -s "$R/node_modules" node_modules
node_modules/.bin/vite build > "$D.build.log" 2>&1 || { tail -20 "$D.build.log"; echo "build failed"; exit 5; }
tail -1 "$D.build.log"
node "$R/scripts/lib/hostLikeServer.mjs" dist "$PORT" > "$D.server.log" 2>&1 &
SP=$!
sleep 4
cd "$R"
SWEEP_BASE="http://localhost:$PORT" TAG="$TAG" ONLY="$ONLY" node .rc/x/walk421.mjs
s=$?
kill "$SP" 2>/dev/null
exit $s
