# Round 1544 fixer: run one mutation on the runner. Exit 1 = CAUGHT (a gate went red), 0 = NOT CAUGHT, 2 = could not run.
# usage: bash .rc/x/fix-mutrun.sh NAME [walk]
N="$1"; R="$PWD"; W="/tmp/fx-$N"
git worktree add -q "$W" HEAD || exit 2
ln -s "$R/node_modules" "$W/node_modules"
cd "$W" || exit 2
node "$R/.rc/x/fix-mut.mjs" "$N" || exit 2
node_modules/.bin/vitest run src/test/nbaCareerIntl.test.ts src/lib/careerIntl.test.ts src/test/nbaIntlResultLines.test.tsx --testTimeout=300000 --hookTimeout=120000 > "/tmp/fx-$N-v.log" 2>&1; a=$?
grep -E "FAIL|Tests |AssertionError|expected" "/tmp/fx-$N-v.log" | head -10 | cut -c1-300
c=0
if [ "$2" = "walk" ]; then
  node_modules/.bin/vite build > "/tmp/fx-$N-b.log" 2>&1 || { echo "build failed"; tail -5 "/tmp/fx-$N-b.log"; exit 2; }
  RC_OUT="/tmp/fx-$N-shots" PLAY_INTL_DIST="$W/dist" node scripts/playNbaIntl.mjs > "/tmp/fx-$N-w.log" 2>&1; c=$?
  grep -E "FAIL|fail|format" "/tmp/fx-$N-w.log" | head -6 | cut -c1-300
  tail -2 "/tmp/fx-$N-w.log" | cut -c1-300
fi
if [ $a -ne 0 ] || [ $c -ne 0 ]; then echo "MUTATION $N CAUGHT (vitest=$a walk=$c)"; exit 1; fi
echo "MUTATION $N NOT CAUGHT (vitest=$a walk=$c)"; exit 0
