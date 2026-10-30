#!/usr/bin/env bash
# Runs the command given with a 6 GB resident memory watchdog on its process tree's main process, so a run that
# balloons is killed instead of taking the runner down. Never committed. Usage: bash .rc/x/wd.sh node scripts/x.mjs
"$@" &
P=$!
while kill -0 $P 2>/dev/null; do
  r=$(ps -o rss= -p $P 2>/dev/null | tr -d ' ')
  for c in $(pgrep -P $P 2>/dev/null); do cr=$(ps -o rss= -p $c 2>/dev/null | tr -d ' '); [ -n "$cr" ] && [ "$cr" -gt "${r:-0}" ] && r=$cr; done
  if [ -n "$r" ] && [ "$r" -gt 6000000 ]; then echo "WATCHDOG: RSS $r KB, killed"; pkill -9 -P $P; kill -9 $P; fi
  sleep 0.5
done
wait $P
