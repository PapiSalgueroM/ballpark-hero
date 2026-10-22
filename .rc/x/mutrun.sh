#!/usr/bin/env bash
# Review of Round 1538 (run lens): apply mutation $1, run the round's own checks against it, restore the tree, and
# print one closing line naming which checks went red. Exit 1 when at least one check caught it, 0 when it escaped
# every check, 2 when the mutation did not apply.
M="$1"; EXTRA="${2:-}"
node .rc/x/mut1538.mjs "$M" || exit 2
git diff --stat | tail -2
L=/tmp/mut-$M; mkdir -p "$L"
node scripts/simUsShopPromises.mjs > "$L/shop.log" 2>&1; shop=$?; echo "shop: $(tail -1 "$L/shop.log" | cut -c1-200)"
grep -E "^ *(RED|red|FAIL)|^   [a-z]+ .* red|^  x " "$L/shop.log" | head -8 | cut -c1-260
node_modules/.bin/vitest run src/lib/usCareerShopPromises.test.ts src/lib/usCareerAnnualBenefits.test.ts src/test/careerDecisionOutcome.test.tsx src/test/usCareerSmallItems1104.test.ts src/test/usCareerShopCap.test.ts --testTimeout=300000 --hookTimeout=120000 > "$L/vitest.log" 2>&1; vit=$?
echo "vitest: $(grep -E "Tests +[0-9]" "$L/vitest.log" | tail -1)"
grep -E "FAIL|AssertionError" "$L/vitest.log" | head -6 | cut -c1-220
node scripts/simUsCareerDeckC.mjs > "$L/deckc.log" 2>&1; deckc=$?; echo "deckc: $(tail -1 "$L/deckc.log" | cut -c1-200)"
node scripts/simUsBoardParity.mjs > "$L/board.log" 2>&1; board=$?; echo "board: $(tail -1 "$L/board.log" | cut -c1-200)"
node scripts/simUsCareerDefects.mjs > "$L/defects.log" 2>&1; defects=$?; echo "defects: $(tail -1 "$L/defects.log" | cut -c1-200)"
summer=skip
if [ "$EXTRA" = "summer" ]; then
  SIM_SECTIONS=1,2,3,3b,4,5,7,8,9,10,11,12 node scripts/simUsCareerSummer.mjs > "$L/summer.log" 2>&1; summer=$?; echo "summer: $(tail -1 "$L/summer.log" | cut -c1-200)"
fi
git checkout -- src scripts
git status --short | head -3
CAUGHT=0
for v in $shop $vit $deckc $board $defects; do [ "$v" != 0 ] && CAUGHT=1; done
[ "$summer" != skip ] && [ "$summer" != 0 ] && CAUGHT=1
echo "MUT $M: shop=$shop vitest=$vit deckc=$deckc board=$board defects=$defects summer=$summer -> $([ $CAUGHT = 1 ] && echo CAUGHT || echo ESCAPED)"
[ $CAUGHT = 1 ] && exit 1 || exit 0
