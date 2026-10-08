#!/usr/bin/env bash
# Round 1132 scratch (never committed): the same tree WITHOUT this round, built in a second folder, so a red on
# the round's branch can be told from a red its base already had, and a page's growth read as a difference.
# The base is what the round's branch merged: origin/release-al-gate, origin/release-al-int and origin/main.
set -u
B="$RUNNER_TEMP/base-tree"
git worktree add -q --detach "$B" origin/release-al-gate || { echo "cannot check out origin/release-al-gate"; exit 3; }
git -C "$B" -c user.name=rc -c user.email=rc@example.invalid merge -q --no-edit origin/release-al-int origin/main > "$RC_OUT/base-merge.log" 2>&1 || { echo "the base would not merge"; tail -5 "$RC_OUT/base-merge.log"; exit 3; }
ln -s "$PWD/node_modules" "$B/node_modules"
( cd "$B" && npm run build > "$RC_OUT/base-build.log" 2>&1 ) || { tail -20 "$RC_OUT/base-build.log"; exit 4; }
node scripts/lib/hostLikeServer.mjs "$B/dist" 4199 > /dev/null 2>&1 &
S=$!
sleep 3
echo "BASE: release-al-gate + release-al-int + main, without the round ($(git -C "$B" rev-parse --short HEAD))"
( cd "$B" && BASE=http://localhost:4199 SWEEP_BASE=http://localhost:4199 node scripts/sweepWeight.mjs )
echo "base sweepWeight exit=$?"
( cd "$B" && BASE=http://localhost:4199 SWEEP_BASE=http://localhost:4199 ENGINES=chromium node scripts/playIphone.mjs ) | grep -E "FAIL|playIphone:" | cut -c1-240
echo "base playIphone exit=${PIPESTATUS[0]}"
kill $S
for d in "$B/dist" dist; do
  for f in "$d"/assets/index-*.js; do echo "entry chunk $f: $(wc -c < "$f") bytes, $(gzip -9 -c "$f" | wc -c) gzipped"; done
done
exit 0
