#!/usr/bin/env bash
# Round 1304 fix pass (extra file, never committed): the same walk on a build of the commit BEFORE the fix pass.
# usage: bash .rc/x/walkBase.sh <commit-ish>
# Builds that commit in its own git worktree, serves its dist on port 4174 and runs .rc/x/walkEraWild.mjs
# against it. The walk is expected to end RED there (today's clubs ring a manager sacked in a past season):
# that is the walk's own negative control, and its pictures come back under files/base/.
set -u
REPO="$PWD"
C="$1"
SHA=$(git rev-parse --short=10 "$C")
W="/tmp/wb-$SHA-$$"
git worktree add -q --detach "$W" "$SHA" || { echo "no worktree for $C"; exit 3; }
ln -s "$REPO/node_modules" "$W/node_modules"
cd "$W"
echo "BASE BUILD at $(git log -1 --format='%h %s' | cut -c1-120)"
npm run build > /tmp/wb-build-$$.log 2>&1; b=$?
tail -3 /tmp/wb-build-$$.log | cut -c1-200
[ "$b" -eq 0 ] && [ -f dist/index.html ] || { echo "the base build failed (exit $b)"; exit 3; }
node scripts/lib/hostLikeServer.mjs dist 4174 > /tmp/wb-server-$$.log 2>&1 &
SERVER=$!
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null "http://localhost:4174/robots.txt" && break
  sleep 1
done
cd "$REPO"
mkdir -p "${RC_OUT:-/tmp}/base"
BASE=http://localhost:4174 SWEEP_BASE=http://localhost:4174 RC_OUT="${RC_OUT:-/tmp}/base" node .rc/x/walkEraWild.mjs; e=$?
kill "$SERVER" 2>/dev/null
echo "walkEraWild on the base build $SHA: exit=$e"
exit $e
