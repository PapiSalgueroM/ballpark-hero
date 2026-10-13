#!/usr/bin/env bash
# Round 1320 run-lens review: apply one mutation in a private worktree of the request commit, run the round's
# engine harness and its unit files there, and say whether anything caught it. Never touches the main checkout.
# usage: bash .rc/x/mutrun.sh <letter> <seeds>
set -u
L=$1
SEEDS=${2:-1}
R=$(pwd)
D=/tmp/mut-$L
okw=0
for i in 1 2 3 4 5 6; do
  if git worktree add --detach "$D" HEAD > /dev/null 2>&1; then okw=1; break; fi
  sleep $((i * 3))
done
[ $okw -eq 1 ] || { echo "MUT $L: worktree add failed"; exit 9; }
ln -s "$R/node_modules" "$D/node_modules"
mkdir -p "$D/.rc/x"
cp "$R/.rc/x/mut.mjs" "$D/.rc/x/mut.mjs"
cd "$D" || exit 9
node .rc/x/mut.mjs "$L" || { echo "MUT $L: ANCHOR MISSING, nothing ran"; exit 8; }
git diff --stat | tail -1
export TMPDIR=/tmp/mut-tmp-$L
mkdir -p "$TMPDIR"
SIM_COLLEGE_SEAT_SEEDS=$SEEDS node scripts/simCollegeSeat.mjs > /tmp/mut-$L-sim.log 2>&1
a=$?
grep -iE "fail|red|DID NOT|FIRED" /tmp/mut-$L-sim.log | head -12
echo "--- sim tail:"
tail -2 /tmp/mut-$L-sim.log
node_modules/.bin/vitest run src/lib/collegeSeat.test.ts src/components/college-dynasty --testTimeout=300000 --hookTimeout=120000 > /tmp/mut-$L-vt.log 2>&1
b=$?
grep -E "FAIL|Tests  |Test Files|AssertionError|Expected|Received" /tmp/mut-$L-vt.log | head -14
v="NOT CAUGHT"
if [ $a -ne 0 ] || [ $b -ne 0 ]; then v="CAUGHT"; fi
echo "MUT $L: simCollegeSeat exit=$a vitest exit=$b => $v"
exit 0
