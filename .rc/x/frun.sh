#!/usr/bin/env bash
# frun.sh <id> [walk]: apply ONE mutation on the runner's checkout, run the night's two vitest files (and, with
# "walk", a fresh build and the round's browser walk), restore the tree, print one line.
# Exit 1 = some check went red (the mutation is CAUGHT, which is what a fix wants). Exit 0 = it SURVIVED.
# Exit 3 = the mutation was not applied.
id="$1"; mode="${2:-}"
node .rc/x/fmut.mjs "$id" > "$RC_OUT/f-$id-apply.log" 2>&1
if [ $? -ne 0 ]; then cat "$RC_OUT/f-$id-apply.log"; git checkout -- src scripts; exit 3; fi
node_modules/.bin/vitest run src/test/careerDraftNight.test.tsx src/test/usCareerDraftNightBoard.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/f-$id-vitest.log" 2>&1; v=$?
w=skipped; b=skipped; wt=""; wc=""
if [ "$mode" = "walk" ]; then
  node_modules/.bin/vite build > "$RC_OUT/f-$id-build.log" 2>&1; b=$?
  ENGINES=chromium RC_OUT="$RC_OUT/f-$id-walk" node scripts/playDraftNight.mjs > "$RC_OUT/f-$id-walk.log" 2>&1; w=$?
  wt=$(tail -1 "$RC_OUT/f-$id-walk.log")
  wc=$(grep -o "FAIL \[[a-z]*\]" "$RC_OUT/f-$id-walk.log" | sort | uniq -c | tr -s ' ' | tr '\n' ';')
fi
git checkout -- src scripts
vt=$(grep -E "^ +Tests " "$RC_OUT/f-$id-vitest.log" | tr -s ' ' | head -1)
echo "MUT $id vitest=$v build=$b walk=$w |$vt | $wt | $wc"
if [ "$v" -eq 0 ] && { [ "$w" = "skipped" ] || [ "$w" -eq 0 ]; }; then exit 0; fi
exit 1
