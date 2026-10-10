#!/usr/bin/env bash
# Reviewer's mutation runner for Round 1223 (runner only). usage: bash .rc/x/runmut.sh <name>
# Applies one mutation, runs the round's harness and its two vitest files, restores the tree, prints one verdict line.
n="$1"
node .rc/x/mut2.mjs "$n" || { git checkout -- src scripts; echo "MUT $n: COULD NOT BE APPLIED"; exit 9; }
git diff --stat | tail -2
node scripts/simGmDeskHost.mjs > "/tmp/h-$n.log" 2>&1; h=$?
node_modules/.bin/vitest run src/lib/gmDeskHost.test.ts src/components/front-office-shared/GmCareerDesk.test.tsx --testTimeout=300000 --hookTimeout=120000 > "/tmp/v-$n.log" 2>&1; v=$?
git checkout -- src scripts
left=$(git status --porcelain --untracked-files=no | grep -v "^?? " | grep -c "src/\|scripts/")
echo "--- harness, first failures"
grep -m5 "FAIL \[" "/tmp/h-$n.log" | cut -c1-320
tail -1 "/tmp/h-$n.log" | cut -c1-200
echo "--- vitest"
grep -E "FAIL|AssertionError|Tests |Test Files " "/tmp/v-$n.log" | head -14 | cut -c1-260
if [ -n "$RC_OUT" ]; then mkdir -p "$RC_OUT"; cp "/tmp/h-$n.log" "$RC_OUT/h-$n.log"; cp "/tmp/v-$n.log" "$RC_OUT/v-$n.log"; fi
echo "MUT $n: harness exit=$h vitest exit=$v restored=$([ "$left" = "0" ] && echo yes || echo NO)"
exit 0
