#!/usr/bin/env bash
# Runs .rc/x/wcProbe.mjs with a 6 GB resident memory watchdog, so it can never take the runner down. Never committed.
node --max-old-space-size=4000 .rc/x/wcProbe.mjs &
P=$!
while kill -0 $P 2>/dev/null; do
  r=$(ps -o rss= -p $P 2>/dev/null | tr -d ' ')
  if [ -n "$r" ] && [ "$r" -gt 6000000 ]; then echo "WATCHDOG: RSS $r KB, killed"; kill -9 $P; fi
  sleep 0.5
done
wait $P
