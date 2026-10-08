#!/usr/bin/env bash
# Reviewer's integration probe for Round 1115 (never committed): the branch merged into origin/release-am-int in a
# scratch worktree on the runner, then the type gate, a build, simClubSquads, the squad vitest and the page walk.
set -u
HERE="$PWD"
git fetch -q origin release-am-int || { echo "fetch failed"; exit 2; }
AM=$(git rev-parse FETCH_HEAD)
git worktree add -q --detach /tmp/am "$AM" || { echo "worktree failed"; exit 2; }
cd /tmp/am || exit 2
ln -s "$HERE/node_modules" node_modules
echo "release-am-int at $AM; merging the round's head $(git -C "$HERE" rev-parse HEAD^)"
if ! git -c user.email=review@local -c user.name=review merge -q --no-edit "$(git -C "$HERE" rev-parse HEAD^)" > /tmp/am-merge.log 2>&1; then
  echo "conflicts: $(git diff --name-only --diff-filter=U | tr '\n' ' ')"
  for f in $(git diff --name-only --diff-filter=U); do
    if [ "$f" = "docs/WORKBOARD.md" ]; then git checkout --ours -- "$f" && git add "$f"; else echo "REAL CONFLICT in $f"; fi
  done
  git -c user.email=review@local -c user.name=review commit -q --no-edit || { echo "could not finish the merge"; tail -5 /tmp/am-merge.log; exit 3; }
fi
echo "merged tree: $(git rev-parse HEAD)"
grep -c "<SquadTile career={career} />" src/pages/SoccerCareer.tsx
node_modules/.bin/tsc --noEmit -p tsconfig.app.json > /tmp/am-tsc.log 2>&1; T=$?
npm run build > /tmp/am-build.log 2>&1; B=$?
node scripts/simClubSquads.mjs > /tmp/am-club.log 2>&1; C=$?
node_modules/.bin/vitest run src/lib/soccerClubSquad.test.ts --testTimeout=300000 --hookTimeout=120000 > /tmp/am-vitest.log 2>&1; V=$?
ENGINES=chromium REQUIRE_PAGE=1 PORT=5410 SHOTS=/tmp/am-shots node scripts/playCareerSquad.mjs > /tmp/am-play.log 2>&1; P=$?
node scripts/simFlagshipWeight.mjs > /tmp/am-weight.log 2>&1; W=$?
echo "--- tsc"; tail -5 /tmp/am-tsc.log | cut -c1-200
echo "--- build"; tail -2 /tmp/am-build.log | cut -c1-200
echo "--- simClubSquads"; tail -1 /tmp/am-club.log | cut -c1-200
echo "--- play"; grep -E "^FAIL" /tmp/am-play.log | cut -c1-220 | head -8; tail -1 /tmp/am-play.log | cut -c1-200
echo "--- weight"; tail -3 /tmp/am-weight.log | cut -c1-200
echo "AM MERGE tsc=$T build=$B simClubSquads=$C vitest=$V playCareerSquad=$P simFlagshipWeight=$W"
