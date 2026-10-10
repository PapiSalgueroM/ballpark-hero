#!/usr/bin/env bash
# reviewer wrapper (runner only): apply one mutation, run the harness and the three unit files, restore, say what each did.
name="$1"
git checkout -q -- src scripts
node .rc/x/mut.mjs "$name" || { echo "MUT $name: NOT APPLIED"; git checkout -q -- src scripts; exit 3; }
git diff --stat -- src scripts | tail -1
node scripts/simGmGameDay.mjs > "$RC_OUT/mut-$name-sim.log" 2>&1; a=$?
node_modules/.bin/vitest run src/lib/gmGameScore.test.ts src/lib/gmGameDay.test.ts src/lib/gmBracket.test.ts --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/mut-$name-vitest.log" 2>&1; b=$?
git checkout -q -- src scripts
echo "--- harness reds"; grep -c "FAIL (section" "$RC_OUT/mut-$name-sim.log"; grep "FAIL (section" "$RC_OUT/mut-$name-sim.log" | head -4 | cut -c1-260
tail -1 "$RC_OUT/mut-$name-sim.log"
echo "--- vitest"; grep -E "FAIL|✓|×|Tests " "$RC_OUT/mut-$name-vitest.log" | head -8 | cut -c1-240
test -z "$(git status --porcelain --untracked-files=no -- src scripts)" && echo "tree restored"
echo "MUT $name: harness exit=$a vitest exit=$b"
exit 0
