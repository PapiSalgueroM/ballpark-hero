#!/usr/bin/env bash
# Round 1308 review (run lens): one mutation, the round's gates, the tree restored. Last line says CAUGHT or NOT CAUGHT.
id="$1"
node .rc/x/mut.mjs "$id" || { git checkout -- src scripts; echo "MUT $id ABORTED (string not found exactly once)"; exit 2; }
git diff --stat | tail -2
node_modules/.bin/vitest run src/lib/gmPostseason.test.ts src/lib/frontOfficePostseason.test.ts src/lib/gmBracketView.test.ts src/components/front-office-shared/GmBracketCard.test.tsx src/test/gmBracketLedger.test.ts --testTimeout=300000 > "/tmp/v-$id.log" 2>&1
v=$?
grep -E "FAIL |Tests  |Test Files  " "/tmp/v-$id.log" | head -12
node scripts/simGmGameDay.mjs > "/tmp/s-$id.log" 2>&1
s=$?
grep -E "^ *(FAIL|RED)|failed" "/tmp/s-$id.log" | head -8
tail -2 "/tmp/s-$id.log"
git checkout -- src scripts
if [ -n "$(git status --porcelain src scripts)" ]; then echo "MUT $id: TREE NOT RESTORED"; exit 3; fi
if [ $v -ne 0 ] || [ $s -ne 0 ]; then echo "MUT $id CAUGHT: vitest exit $v, simGmGameDay exit $s"; exit 1; fi
echo "MUT $id NOT CAUGHT: vitest exit $v, simGmGameDay exit $s"
exit 0
