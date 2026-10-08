#!/usr/bin/env bash
# Reviewer only (runner): build the round's BASE next to the branch build and serve it on 4400.
set -u
B="$RUNNER_TEMP/base"
git fetch -q origin r1140-translate-guard
git worktree add -f --detach "$B" FETCH_HEAD > /dev/null 2>&1
echo "base worktree at $(git -C "$B" rev-parse --short HEAD)"
ln -s "$PWD/node_modules" "$B/node_modules"
( cd "$B" && node_modules/.bin/vite build --outDir "$RUNNER_TEMP/dist-base" --emptyOutDir > "$RUNNER_TEMP/base-build.log" 2>&1 )
echo "base build exit $?"
tail -2 "$RUNNER_TEMP/base-build.log" | cut -c1-160
grep -c "__DUKB_RAW_STORAGE__" "$RUNNER_TEMP"/dist-base/assets/*.js | grep -v ":0" | head -3
echo "(no line above this one naming an asset = the base build does not carry the seam, as expected)"
node scripts/lib/hostLikeServer.mjs "$RUNNER_TEMP/dist-base" 4400 > /dev/null 2>&1 &
sleep 4
OLD=http://localhost:4400 NEW=http://localhost:4173 node .rc/x/saves.mjs
RC=$?
echo "saves script exit $RC"
exit $RC
