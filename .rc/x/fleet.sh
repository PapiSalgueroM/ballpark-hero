#!/usr/bin/env bash
# Round 1307 review (lens RUN): the fleet. One tree, the src swapped between the base (origin/main) and the head.
set -u
BASE_SHA=b6eb78e799b12c851e4e8e583e9e926aed117f1c
T=src/components/front-office/ZzFleet.test.tsx
D=/tmp/fleet
mkdir -p "$D/dump" "$RC_OUT"
git cat-file -e "$BASE_SHA^{commit}" 2>/dev/null || git fetch -q origin main
git cat-file -e "$BASE_SHA^{commit}" || { echo "FLEET: the base commit is not here"; exit 2; }
bad=0
run() { # mode name dumpwrite
  FLEET_MODE=$1 FLEET_DUMP=$D/dump FLEET_DUMP_WRITE=$3 FLEET_OUT=$D/$2.txt node_modules/.bin/vitest run $T --testTimeout=1500000 --hookTimeout=120000 > "$D/$2.log" 2>&1
  local rc=$?
  echo "vitest $2 exit=$rc, $(grep -c '^FLEET|' "$D/$2.txt" 2>/dev/null) FLEET lines"
  [ "$rc" -ne 0 ] && { bad=1; tail -25 "$D/$2.log"; }
  cp "$D/$2.txt" "$RC_OUT/fleet-$2.txt" 2>/dev/null
}
git checkout -q "$BASE_SHA" -- src && cp .rc/x/zzFleet.test.tsx $T
echo "base board lines holding the tile: $(grep -c 'NflGameDay' src/components/front-office/FrontOfficeBoard.tsx)"
run play base-play 1
run load base-load 0
git checkout -q HEAD -- src && cp .rc/x/zzFleet.test.tsx $T
echo "head board lines holding the tile: $(grep -c 'NflGameDay' src/components/front-office/FrontOfficeBoard.tsx)"
run play head-play 0
run watch head-watch 0
run load head-load 0
rm -f $T
cmp2() { # label fileA fileB fields
  local a b n
  a=$(grep '^FLEET|' "$2" | cut -d'|' -f"$4"); b=$(grep '^FLEET|' "$3" | cut -d'|' -f"$4")
  n=$(printf '%s\n' "$a" | grep -c .)
  if [ "$n" -gt 0 ] && [ "$a" = "$b" ]; then echo "EQUAL  $1: $n lines"; else echo "DIFFER $1: $n lines against $(printf '%s\n' "$b" | grep -c .)"; diff <(printf '%s\n' "$a") <(printf '%s\n' "$b") | head -8; bad=1; fi
}
cmp2 "Play alone, base against head (save and draw count, every press)" $D/base-play.txt $D/head-play.txt 1-7
cmp2 "a base save of week 8 loaded and played on, base against head (save and draw count)" $D/base-load.txt $D/head-load.txt 1-7
cmp2 "head: every week WATCHED against every week PLAYED (the save after each week)" $D/head-play.txt $D/head-watch.txt 1-6
echo "watch lines: $(grep -c '^WATCH|' $D/head-watch.txt), held yes: $(grep -c 'held yes' $D/head-watch.txt), held NO: $(grep -c 'held NO' $D/head-watch.txt), saved SOMETHING: $(grep -c 'saved at full time SOMETHING' $D/head-watch.txt), face watch: $(grep -c 'face watch' $D/head-watch.txt)"
echo "late draws: base $(grep -c '^LATE|' $D/base-play.txt), head $(grep -c '^LATE|' $D/head-play.txt)"
grep '^END|' $D/head-play.txt | head -3
grep '^WATCH|' $D/head-watch.txt | grep -v 'draws in the watch 0|' | head -3
grep 'NO PLAY BUTTON\|NO DUMP' $D/*.txt | head -5
echo "FLEET DONE bad=$bad"
exit $bad
