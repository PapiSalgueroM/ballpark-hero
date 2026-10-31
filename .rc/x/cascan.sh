#!/usr/bin/env bash
# Release BV probe (never committed): does simCmEuroPlay's carryall control have its event on these play seeds?
# The plain run first; if a job move dropped the Europa League (a move into a Champions League sharing clubs with
# it, the guard the control stands down), the control on the same seeds. Exit 4 when no move dropped it.
S="$1"; T="/tmp/ca-$(echo "$S" | tr , -)"; mkdir -p "$T"; export TMPDIR="$T" TEMP="$T" TMP="$T"
CM_EURO_PLAY_PLAY_SEEDS="$S" node scripts/simCmEuroPlay.mjs > "$T/plain.log" 2>&1; p=$?
grep "2b moves" "$T/plain.log"; echo "plain exit $p: $(tail -1 "$T/plain.log")"
d=$(grep -o "[0-9]* moves dropped it" "$T/plain.log" | grep -o "^[0-9]*")
if [ "${d:-0}" -gt 0 ]; then
  CM_EURO_PLAY_PLAY_SEEDS="$S" CM_EURO_PLAY_CONTROL=carryall node scripts/simCmEuroPlay.mjs
else
  echo "seeds $S: no move dropped the Europa League"; exit 4
fi
