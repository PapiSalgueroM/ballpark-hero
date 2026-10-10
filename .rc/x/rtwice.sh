#!/usr/bin/env bash
# Reviewer (run lens), Round 1215: is the WHOLE walk the same walk when it is run again on the seed it printed?
# usage: rtwice.sh <seed or the word fresh> <port>
# Run 1 takes the seed as given (fresh draws one), run 2 takes the seed run 1 PRINTED in its first line.
# Compared: every "[match" line and every "the goal watched:" line. Printed but not compared: the clock readings.
s="$1"; p="$2"; out="$RC_OUT"
PORT=$p VERBOSE=1 LIVE_FIT_SEED=$s LIVE_FIT_SHOTS="$out/tw-$s-1" node scripts/playLiveMatchFit.mjs > "$out/tw-$s-1.log" 2>&1; a=$?
seed=$(head -1 "$out/tw-$s-1.log" | grep -o "playLiveMatchFit: seed [0-9]*" | grep -o "[0-9]*$")
if [ -z "$seed" ]; then echo "NO SEED PRINTED FIRST by run 1 (exit $a)"; head -3 "$out/tw-$s-1.log" | cut -c1-300; exit 5; fi
PORT=$p VERBOSE=1 LIVE_FIT_SEED=$seed LIVE_FIT_SHOTS="$out/tw-$s-2" node scripts/playLiveMatchFit.mjs > "$out/tw-$s-2.log" 2>&1; b=$?
pick() { grep -E "\[match |the goal watched:" "$1" | cut -c1-330; }
pick "$out/tw-$s-1.log" > "$out/tw-$s-1.key"
pick "$out/tw-$s-2.log" > "$out/tw-$s-2.key"
echo "--- run 1 (LIVE_FIT_SEED=$s), exit $a"; cat "$out/tw-$s-1.key"
grep -E "a goal is coming|FAIL|playLiveMatchFit:" "$out/tw-$s-1.log" | cut -c1-260
echo "--- run 2 (LIVE_FIT_SEED=$seed), exit $b"; cat "$out/tw-$s-2.key"
grep -E "a goal is coming|FAIL|playLiveMatchFit:" "$out/tw-$s-2.log" | cut -c1-260
n=$(wc -l < "$out/tw-$s-1.key")
if [ "$a" = 0 ] && [ "$b" = 0 ] && [ "$n" -ge 6 ] && cmp -s "$out/tw-$s-1.key" "$out/tw-$s-2.key"; then
  echo "SAME WALK TWICE: seed $seed opened the same three matches and watched the same three goals (exits $a and $b)"; exit 0
fi
echo "--- difference"; diff "$out/tw-$s-1.key" "$out/tw-$s-2.key" | cut -c1-330 | head -20
echo "NOT THE SAME WALK: seed $seed, exits $a and $b, $n key lines in run 1"; exit 4
