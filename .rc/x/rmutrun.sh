#!/usr/bin/env bash
# Reviewer scratch (Round 1051, runner lens). Travels as .rc/x/rmutrun.sh, runs on the throwaway runner checkout,
# under "#!serial" only. bash .rc/x/rmutrun.sh <mutation> <judge>...   judges: vit, fix, nfl, nba, mlb, nhl
# Exit 0 = at least one judge went red (CAUGHT), 7 = every judge green (SURVIVED), 9 = the mutation refused.
NAME=$1; shift
if ! node .rc/x/rmut.mjs "$NAME"; then echo "MUT $NAME: REFUSED"; exit 9; fi
git diff --stat -- src | tail -1
LINE=""; ANYRED=0
for J in "$@"; do
  L="/tmp/m-$NAME-$J.log"
  case "$J" in
    vit)
      node_modules/.bin/vitest run src/test/usCareerHallBoard.test.tsx src/test/careerHallV1Replay.test.ts src/test/careerHall.test.tsx src/test/usCareerActionConfirm.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$L" 2>&1; R=$?
      T=$(sed 's/\x1b\[[0-9;]*m//g' "$L" | grep -a ' Tests ' | tr -s ' ' | cut -c1-90)
      [ "$R" -ne 0 ] && ANYRED=1
      sed 's/\x1b\[[0-9;]*m//g' "$L" | grep -a -E '^ *(FAIL|×) ' | cut -c1-200 | head -14
      LINE="$LINE vit exit=$R ($T);" ;;
    fix)
      node_modules/.bin/vitest run src/test/usBoardFixture.test.tsx --testTimeout=600000 --hookTimeout=300000 > "$L" 2>&1; R=$?
      T=$(sed 's/\x1b\[[0-9;]*m//g' "$L" | grep -a ' Tests ' | tr -s ' ' | cut -c1-90)
      [ "$R" -ne 0 ] && ANYRED=1
      sed 's/\x1b\[[0-9;]*m//g' "$L" | grep -a -E '^ *(FAIL|×) ' | cut -c1-200 | head -8
      LINE="$LINE fixture exit=$R ($T);" ;;
    nfl|nba|mlb|nhl)
      SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs "$J" > "$L" 2>&1; R=$?
      grep -a 'FAIL' "$L" | cut -c1-260 | head -8
      C=$(tail -1 "$L" | cut -c1-200)
      echo "$C" | grep -q 'are green' || ANYRED=1
      LINE="$LINE sim-$J exit=$R ($C);" ;;
  esac
done
git checkout -q -- src scripts
LEFT=$(git status --porcelain --untracked-files=no -- src scripts | wc -l)
if [ "$NAME" = "none" ]; then echo "MUT none (baseline), $LEFT files left changed:$LINE"; [ "$ANYRED" -eq 0 ] && exit 0 || exit 1; fi
if [ "$ANYRED" -eq 1 ]; then echo "MUT $NAME: CAUGHT, $LEFT files left changed:$LINE"; exit 0; fi
echo "MUT $NAME: SURVIVED EVERYTHING, $LEFT files left changed:$LINE"; exit 7
