#!/usr/bin/env bash
# The kit's controls, each run on the sections it must turn red (SIM_EVENT_DECK_SECTIONS), printing exit and last line.
#   bash kctl.sh control:sections [control:sections ...]     e.g. fxsilent:11 weightoff:3
bad=0
for pair in "$@"; do
  c=${pair%%:*}; secs=${pair#*:}
  EVENT_DECK_CONTROL=$c SIM_EVENT_DECK_SECTIONS=$secs node scripts/simEventDeck.mjs > /tmp/kctl-$c.txt 2>&1; e=$?
  echo "$c (sections $secs) exit=$e | $(tail -1 /tmp/kctl-$c.txt | cut -c1-200)"
  [ "$e" = 1 ] && tail -1 /tmp/kctl-$c.txt | grep -q "CONTROL=$c fired" || bad=1
done
echo "kctl: $([ $bad = 0 ] && echo "every control exited 1 and fired" || echo "A CONTROL DID NOT FIRE")"
exit $bad
