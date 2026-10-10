#!/usr/bin/env bash
# Reviewer (run lens), Round 1215: does LIVE_FIT_SAVE replay the half of EVERY context, a second half included?
# usage: rdump.sh <seed> <port>
# Step 1: the walk with one line mutated so every watched goal dumps its save (red or not), then restored.
# Step 2: for each of the three dumps, the unmutated walk from that file. It must be green and must watch,
#         in each of its three contexts, the goal the dump names.
s="$1"; p="$2"; out="$RC_OUT/dump-$s"; mkdir -p "$out"
node .rc/x/rmut.mjs alwaysdump || exit 2
PORT=$p LIVE_FIT_SEED=$s LIVE_FIT_SHOTS="$out" node scripts/playLiveMatchFit.mjs > "$out/first.log" 2>&1; a=$?
git checkout -- scripts src
echo "--- the walk on seed $s with every goal dumped, exit $a"
grep -E "\[match |the goal watched:|RED TO REPLAY|playLiveMatchFit:" "$out/first.log" | cut -c1-300
bad=0
for view in phone calm wide; do
  f="$out/live-fit-save-$view.json"
  if [ ! -f "$f" ]; then echo "NO DUMP for $view"; bad=$((bad + 1)); continue; fi
  want=$(grep -F "RED TO REPLAY: section" "$out/first.log" | grep -F "($view)" | grep -o "the goal watched .*$" | cut -c18-)
  PORT=$p LIVE_FIT_SAVE="$f" LIVE_FIT_SHOTS="$out/re-$view" node scripts/playLiveMatchFit.mjs > "$out/re-$view.log" 2>&1; b=$?
  seen=$(grep -cF "the goal watched: $want;" "$out/re-$view.log")
  echo "--- replay of the $view dump ($want), exit $b, contexts that watched that goal: $seen of 3"
  grep -E "Starting every|Back in|\[match |the goal watched:|the match that opened|FAIL|RED TO REPLAY|playLiveMatchFit:" "$out/re-$view.log" | cut -c1-300
  if [ "$b" != 0 ] || [ "$seen" != 3 ]; then bad=$((bad + 1)); fi
done
rm -f "$out"/*/fit-*.png "$out"/*/panel-*.png "$out"/fit-*.png "$out"/panel-*.png
if [ "$a" = 0 ] && [ "$bad" = 0 ]; then echo "EVERY DUMP REPLAYED: seed $s, three files, each green and each watching its own goal three times"; exit 0; fi
echo "A DUMP DID NOT REPLAY: seed $s, first exit $a, $bad of 3 files failed"; exit 4
