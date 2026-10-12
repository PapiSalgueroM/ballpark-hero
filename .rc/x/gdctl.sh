#!/usr/bin/env bash
# Run simGmGameDay once a control, for the controls named as arguments. A control that fired exits 1 and says
# RED AT THE NAMED CHECK; anything else (exit 0, exit 2, or a different last line) is a control that did not fire.
fired=0; bad=""
for c in "$@"; do
  out=$(GM_GAMEDAY_CONTROL=$c node scripts/simGmGameDay.mjs 2>&1); code=$?
  last=$(printf '%s\n' "$out" | grep -E "^control $c:" | tail -1)
  echo "$c exit=$code | ${last:-$(printf '%s\n' "$out" | tail -1)}"
  if [ "$code" = "1" ] && printf '%s' "$last" | grep -q "RED AT THE NAMED CHECK"; then fired=$((fired+1)); else bad="$bad $c"; fi
done
echo "gdctl: $fired of $# controls fired.${bad:+ NOT FIRED:$bad}"
[ -z "$bad" ]
