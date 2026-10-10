#!/usr/bin/env bash
# Round 1215 proof: a forced red dumps its save, and LIVE_FIT_SAVE replays that exact half to the same red.
# usage: forced.sh <control> <port>
c="$1"; p="$2"
out="$RC_OUT"
PORT=$p LIVE_FIT_CONTROL=$c node scripts/playLiveMatchFit.mjs > "$out/forced-$c-1.log" 2>&1; a=$?
f="$out/$c-live-fit-save-wide.json"
if [ ! -f "$f" ]; then echo "NO DUMP for control $c (first exit $a)"; tail -8 "$out/forced-$c-1.log"; exit 3; fi
ls -l "$f"
PORT=$p LIVE_FIT_CONTROL=$c LIVE_FIT_SAVE="$f" node scripts/playLiveMatchFit.mjs > "$out/forced-$c-2.log" 2>&1; b=$?
r1=$(grep "RED TO REPLAY" "$out/forced-$c-1.log"); r2=$(grep "RED TO REPLAY" "$out/forced-$c-2.log")
echo "--- first run, exit $a"; grep -E "seed|match |goal watched|FAIL|RED TO REPLAY|its save|playLiveMatchFit:" "$out/forced-$c-1.log" | cut -c1-400
echo "--- replay from the file, exit $b"; grep -E "seed|Starting|match |goal watched|FAIL|ok    the match that opened|RED TO REPLAY|its save|playLiveMatchFit:" "$out/forced-$c-2.log" | cut -c1-400
echo "first : $r1"
echo "replay: $r2"
if [ "$a" = 1 ] && [ "$b" = 1 ] && [ -n "$r1" ] && [ "$r1" = "$r2" ]; then
  echo "FORCED RED REPLAYED: control $c went red twice on one goal of one match (exits $a and $b)"; exit 0
fi
echo "FORCED RED NOT REPLAYED: control $c, exits $a and $b"; exit 4
