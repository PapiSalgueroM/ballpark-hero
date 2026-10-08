#!/usr/bin/env bash
# Closing check for Round 1046, finding 1: mutation m7 at SOURCE level, in a copy of the tree, rebuilt,
# then part C of the round's browser harness. The copy keeps the checkout itself untouched, so the other
# commands of this request (which run beside this one) never see the mutation.
set -u
ROOT="$PWD"
W=/tmp/vf-m7-$$
mkdir -p "$W"
tar --exclude=./node_modules --exclude=./dist --exclude=./.git -cf - . | tar -xf - -C "$W"
ln -s "$ROOT/node_modules" "$W/node_modules"
cd "$W" || exit 4
node "$ROOT/.rc/x/vfM7mut.mjs" src/components/soccer-career/SoccerSeasonCentre.tsx || exit 3
echo "--- building the mutated copy"
node_modules/.bin/vite build > /tmp/vf-m7-build.log 2>&1
B=$?
tail -3 /tmp/vf-m7-build.log
if [ "$B" != "0" ]; then echo "m7 build failed exit=$B"; exit 5; fi
echo "--- part C on the mutated build"
ONLY=C PORT=4590 SHOTS=/tmp/noshots-m7 ENGINES=chromium node scripts/playSeasonCentreMotion.mjs > /tmp/vf-m7-play.log 2>&1
P=$?
echo "--- every FAIL line of part C under m7:"
grep -n '^FAIL' /tmp/vf-m7-play.log
echo "--- C8 lines:"
grep -n 'C8\.' /tmp/vf-m7-play.log | cut -c1-400
echo "--- tail:"
tail -6 /tmp/vf-m7-play.log | cut -c1-300
echo "m7 source mutation: part C exit=$P"
exit "$P"
