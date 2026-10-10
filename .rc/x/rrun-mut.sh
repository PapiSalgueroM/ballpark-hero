#!/usr/bin/env bash
# Reviewer's mutation line (Round 1219): apply one mutation, run the two unit files and the keeper harness,
# restore the tree, and say on the last line whether the mutation SURVIVED (exit 0) or was KILLED (exit 1).
n="$1"
node .rc/x/rrun-mut.mjs "$n" || { git checkout -- src scripts; echo "MUT $n: COULD NOT APPLY"; exit 3; }
git diff --stat | tail -2
node_modules/.bin/vitest run src/test/saveKeeper.test.ts src/test/routeErrorRecovery.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$TMPDIR/v.log" 2>&1; v=$?
node scripts/simSaveKeeper.mjs > "$TMPDIR/s.log" 2>&1; s=$?
git checkout -- src scripts
echo "--- vitest (exit $v), failing cases:"
sed 's/\x1b\[[0-9;]*m//g' "$TMPDIR/v.log" | grep -a -E "FAIL|AssertionError|Tests " | head -10
echo "--- simSaveKeeper (exit $s):"
grep -a "FAIL" "$TMPDIR/s.log" | head -4 | cut -c1-300
tail -1 "$TMPDIR/s.log"
if [ "$v" = 0 ] && [ "$s" = 0 ]; then echo "MUT $n: SURVIVED (vitest=0 sim=0)"; exit 0; fi
echo "MUT $n: KILLED (vitest=$v sim=$s)"; exit 1
