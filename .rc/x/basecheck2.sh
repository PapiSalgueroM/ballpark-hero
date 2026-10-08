#!/usr/bin/env bash
# Round 1132 scratch (never committed): the merged tree WITHOUT this round's source, built in a second folder,
# so a red on the round's branch can be told from a red the tree already had, and a page's growth read as a
# difference. It is the branch head with the round's edited files put back and its new files removed (the
# What's New line stays: it is text in that page's own chunk).
set -u
B="$RUNNER_TEMP/base-tree"
git worktree add -q --detach "$B" HEAD^ || { echo "cannot check out the branch head"; exit 3; }
git -C "$B" checkout -q origin/release-al-gate -- src/components/game/Footer.tsx src/components/layout/Header.tsx src/components/career/AwardsNightCard.tsx src/lib/freshBuild.ts scripts/playSoccerCareer.mjs || exit 3
for f in src/lib/sound.ts src/lib/soundKit.ts src/hooks/useSoundPlan.ts src/components/game/SoundToggle.tsx src/test/soundToggle.test.tsx src/test/awardsNightSound.test.tsx src/test/freshBuildOptionalChunk.test.ts; do rm "$B/$f"; done
ln -s "$PWD/node_modules" "$B/node_modules"
( cd "$B" && npm run build > "$RC_OUT/base-build.log" 2>&1 ) || { tail -20 "$RC_OUT/base-build.log"; exit 4; }
node scripts/lib/hostLikeServer.mjs "$B/dist" 4199 > /dev/null 2>&1 &
S=$!
sleep 3
echo "BASE: the branch head $(git rev-parse --short HEAD^) without the round's source"
( cd "$B" && BASE=http://localhost:4199 SWEEP_BASE=http://localhost:4199 node scripts/sweepWeight.mjs ) 2>&1 | grep -E "K gz|FAIL|sweepWeight:"
echo "== base playIphone"
( cd "$B" && BASE=http://localhost:4199 SWEEP_BASE=http://localhost:4199 ENGINES=chromium node scripts/playIphone.mjs ) 2>&1 | grep -E "FAIL|playIphone:" | cut -c1-240
echo "== base simWritesAreSent"
( cd "$B" && node scripts/simWritesAreSent.mjs ) 2>&1 | grep -E "FAIL|simWritesAreSent:" | cut -c1-240
kill $S
for d in "$B/dist" dist; do
  for f in "$d"/assets/index-*.js; do echo "entry chunk $f: $(wc -c < "$f") bytes, $(gzip -9 -c "$f" | wc -c) gzipped"; done
done
exit 0
