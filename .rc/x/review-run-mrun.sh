#!/usr/bin/env bash
# Reviewer's mutation runner (on the GitHub runner only). usage: bash .rc/x/review-run-mrun.sh <mutation> [lay]
# Applies one mutation, runs the round's harness and its two unit test files (and, with "lay", the lay receipt's
# compare and the Season Centre harness), prints what went red, restores the tree, and ends on one summary line.
m="$1"
node .rc/x/review-run-mut.mjs "$m" || { echo "MUT $m NOT APPLIED"; git checkout -- src scripts; exit 9; }
git diff --stat | tail -2
node scripts/simUsPostseason.mjs > "/tmp/$m-h.log" 2>&1; a=$?
node_modules/.bin/vitest run src/test/usPlayoffs.test.ts src/test/usPostseasonFormat.test.ts --testTimeout=300000 > "/tmp/$m-v.log" 2>&1; b=$?
c=-
d=-
if [ "${2:-}" = "lay" ]; then
  US_SEASON_DIGEST=compare US_SEASON_DIGEST_RECEIPT=lay node scripts/simUsSeasonCentre.mjs > "/tmp/$m-l.log" 2>&1; c=$?
  node scripts/simUsSeasonCentre.mjs > "/tmp/$m-c.log" 2>&1; d=$?
fi
echo "--- harness FAIL lines"
grep -E "^FAIL" "/tmp/$m-h.log" | cut -c1-420 | head -12
echo "--- harness ACCEPTANCE and tail"
grep -E "^ACCEPTANCE|the try taken|repairs a laid out" "/tmp/$m-h.log" | cut -c1-420
tail -3 "/tmp/$m-h.log" | cut -c1-420
echo "--- vitest"
grep -E "FAIL|Tests |Test Files|AssertionError|expected" "/tmp/$m-v.log" | cut -c1-300 | head -30
if [ "$c" != "-" ]; then
  echo "--- lay compare tail"; tail -4 "/tmp/$m-l.log" | cut -c1-420
  echo "--- centre FAIL lines"; grep -E "^FAIL" "/tmp/$m-c.log" | cut -c1-300 | head -6; tail -2 "/tmp/$m-c.log" | cut -c1-300
fi
git checkout -- src scripts
echo "MUT $m harness=$a vitest=$b laycompare=$c centre=$d dirty=$(git status --porcelain --untracked-files=no | wc -l)"
