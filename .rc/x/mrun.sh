#!/usr/bin/env bash
# Reviewer (pools): one mutation, the five test files and the two harnesses, then the source put back.
# Prints one line: which tests failed and how each harness ended. Full logs go to $RC_OUT.
id="$1"
if [ "$id" != "base" ]; then
  node .rc/x/mut.mjs "$id" || { echo "MUTATION $id COULD NOT RUN"; git checkout -- src scripts; exit 2; }
fi
node_modules/.bin/vitest run src/test/dartDraftPool.test.ts src/test/dartDraftPools.test.ts src/test/statDetectiveMotion.test.tsx src/test/statDetectiveScope.test.tsx src/test/statDetectiveSpans.test.tsx --reporter=verbose --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/m-$id-vitest.log" 2>&1
v=$?
node scripts/simDartDraftPool.mjs > "$RC_OUT/m-$id-simDart.log" 2>&1
d=$?
git checkout -- src scripts
failed=$(grep -cE "^ +(×|✗|FAIL) " "$RC_OUT/m-$id-vitest.log")
grep -E "^ +× |^ FAIL " "$RC_OUT/m-$id-vitest.log" | cut -c1-170 | sort -u | head -30 > "$RC_OUT/m-$id-failed.txt"
tests=$(grep -E "^ +Tests " "$RC_OUT/m-$id-vitest.log" | tr -s ' ' | head -1)
simline=$(tail -1 "$RC_OUT/m-$id-simDart.log" | cut -c1-90)
simfails=$(grep -c "FAIL:" "$RC_OUT/m-$id-simDart.log")
simother=$(grep "FAIL:" "$RC_OUT/m-$id-simDart.log" | grep -vc "wildcard at\|wonderkids at")
echo "$id | vitest exit=$v$tests | failed lines $failed | simDart exit=$d FAIL lines $simfails (not wildcard or wonderkid: $simother) | $simline"
exit 0
