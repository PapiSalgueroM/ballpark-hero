#!/usr/bin/env bash
# Release BS triage: run playCareerTrophyRuns (and its setup simCareerTrophyRuns) on another commit's
# tree, built on its own, and bring back the restoration receipts. Run from the runner's repo root after the fonts line.
#   bash .rc/x/trophyAt.sh <sha> <name>
set -u
SHA="$1"; NAME="$2"; R="$PWD"; W="/tmp/tr-$NAME"
git worktree add -q --detach "$W" "$SHA" || exit 2
ln -s "$R/node_modules" "$W/node_modules"
cd "$W" || exit 2
NODE_OPTIONS="--require=$W/scripts/lib/offlineTransport.cjs" node scripts/simCareerTrophyRuns.mjs > "/tmp/tr-$NAME-sim.log" 2>&1 || { tail -5 "/tmp/tr-$NAME-sim.log"; echo "setup simCareerTrophyRuns red at $SHA"; exit 2; }
node_modules/.bin/vite build > "/tmp/tr-$NAME-build.log" 2>&1 || { tail -20 "/tmp/tr-$NAME-build.log"; echo "build failed at $SHA"; exit 2; }
FREE_KICK_FONT_CACHE="$R/.tmp-fx/font-cache" NODE_OPTIONS="--require=$W/scripts/lib/offlineTransport.cjs" node scripts/playCareerTrophyRuns.mjs > "/tmp/tr-$NAME.log" 2>&1
s=$?
mkdir -p "$RC_OUT/trophy-$NAME"
cp .tmp-fx/career-trophy-runs/native/*restoration*.json "$RC_OUT/trophy-$NAME/" 2>/dev/null
grep "^FAIL" "/tmp/tr-$NAME.log" | grep -v AssertionError | sed 's/^FAIL [^:]*: //' | sort | uniq -c | head -8
grep "^Trophy Cabinet native" "/tmp/tr-$NAME.log" | cut -c1-120
echo "trophyAt $NAME ($SHA): exit $s"
exit $s
