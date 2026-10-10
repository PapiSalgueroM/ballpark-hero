#!/usr/bin/env bash
# mrun.sh <id> [walk]: apply ONE mutation on the runner's checkout, run the round's harness (seed set a) and its
# vitest files (and, with "walk", a fresh build and the round's own browser walk), restore the tree, print one line.
# Exit 0 = the mutation SURVIVED every check (a finding). Exit 1 = some check went red (caught). Exit 3 = not applied.
id="$1"; mode="${2:-}"
node .rc/x/mut.mjs "$id" > "$RC_OUT/m-$id-apply.log" 2>&1
if [ $? -ne 0 ]; then cat "$RC_OUT/m-$id-apply.log"; git checkout -- src scripts; exit 3; fi
node scripts/simCareerPreDraft.mjs > "$RC_OUT/m-$id-harness.log" 2>&1; h=$?
node_modules/.bin/vitest run src/test/careerDraftNight.test.tsx src/test/usCareerDraftNightBoard.test.tsx src/test/careerPreDraft.test.tsx src/test/usCareerProspect.test.tsx src/components/motion/LotteryReveal.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/m-$id-vitest.log" 2>&1; v=$?
w=skipped; b=skipped
if [ "$mode" = "walk" ]; then
  node_modules/.bin/vite build > "$RC_OUT/m-$id-build.log" 2>&1; b=$?
  ENGINES=chromium RC_OUT="$RC_OUT/m-$id-walk" node scripts/playDraftNight.mjs > "$RC_OUT/m-$id-walk.log" 2>&1; w=$?
fi
git checkout -- src scripts
vt=$(grep -E "Tests " "$RC_OUT/m-$id-vitest.log" | tr -s ' ' | head -1)
wt=""; [ "$mode" = "walk" ] && wt=$(tail -1 "$RC_OUT/m-$id-walk.log")
echo "MUT $id harness=$h vitest=$v build=$b walk=$w | $(tail -1 "$RC_OUT/m-$id-harness.log") | $vt | $wt"
if [ "$h" -eq 0 ] && [ "$v" -eq 0 ] && { [ "$w" = "skipped" ] || [ "$w" -eq 0 ]; }; then exit 0; fi
exit 1
