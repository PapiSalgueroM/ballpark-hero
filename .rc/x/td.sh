#!/usr/bin/env bash
# Release BQ second step: run the Round 1104 US career truth digest (src/test/usCareerTruthDigest.test.ts) in its own
# worktree of <sha>, so lines never share a checkout. Never committed.
#   bash .rc/x/td.sh <label> <sha> <allow> [revert]
# allow: DIGEST_ALLOW for a DIGEST_RECORD=1 run (none = report every moved key and fail on any). revert: put Round
# 1538's nine src/lib inputs back to Round 1534's closed head 1c7205d0 first (the attribution: with them back, nothing
# should move). A passing record run copies the fixture it wrote to $RC_OUT/usCareerTruthDigest-<label>.json.
label=$1; sha=$2; allow=$3; rev=$4
W=/tmp/td-$label
git worktree add "$W" "$sha" >/dev/null 2>&1 || { echo "td $label: worktree failed"; exit 3; }
ln -s "$PWD/node_modules" "$W/node_modules"
cd "$W" || exit 3
if [ "$rev" = "revert" ]; then
  git checkout 1c7205d0 -- src/lib/nbaMyCareer.ts src/lib/nflMyCareer.ts src/lib/mlbMyCareer.ts src/lib/nhlMyCareer.ts \
    src/lib/nbaCareerCorruption.ts src/lib/nflCareerCorruption.ts src/lib/mlbCareerCorruption.ts src/lib/nhlCareerCorruption.ts \
    src/lib/usCareerAnnualBenefits.ts || { echo "td $label: revert failed"; exit 3; }
  echo "td $label: reverted $(git diff --cached --name-only | wc -l) files to 1c7205d0"
fi
before=$(git hash-object src/test/fixtures/usCareerTruthDigest.json)
DIGEST_RECORD=1 DIGEST_ALLOW="$allow" node_modules/.bin/vitest run src/test/usCareerTruthDigest.test.ts --testTimeout=1800000 --hookTimeout=120000 > /tmp/td-$label.log 2>&1
s=$?
grep -E "digest|Tests  |Test Files|outside|Error" /tmp/td-$label.log | head -30 | cut -c1-900
after=$(git hash-object src/test/fixtures/usCareerTruthDigest.json)
echo "td $label: fixture before $before after $after"
if [ $s = 0 ] && [ -n "$RC_OUT" ]; then cp src/test/fixtures/usCareerTruthDigest.json "$RC_OUT/usCareerTruthDigest-$label.json"; fi
echo "td $label: exit $s"
exit $s
