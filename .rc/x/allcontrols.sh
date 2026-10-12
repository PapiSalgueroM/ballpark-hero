#!/usr/bin/env bash
# Round 1312 (never committed): every control of scripts/simUsSeasonLedger.mjs, one after another.
# A control passes here only when it exits 1 AND its last line says FIRED. Prints one line a control.
set -u
list=$(US_LEDGER_CONTROL=list node scripts/simUsSeasonLedger.mjs)
fired=0; bad=0; n=0
for c in $list; do
  n=$((n+1))
  out=$(US_LEDGER_CONTROL=$c node scripts/simUsSeasonLedger.mjs 2>&1); code=$?
  last=$(printf '%s\n' "$out" | tail -1)
  if [ "$code" = 1 ] && printf '%s' "$last" | grep -q 'FIRED'; then fired=$((fired+1)); echo "ok   $c exit=$code | $last"; else bad=$((bad+1)); echo "BAD  $c exit=$code | $last"; fi
done
echo "allcontrols: $fired of $n controls fired at their named checks, $bad did not"
[ "$bad" = 0 ]
