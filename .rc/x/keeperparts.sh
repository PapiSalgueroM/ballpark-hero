#!/usr/bin/env bash
# simSaveKeeper's part controls, one run each: a control that fired exits 1 and its last line says FIRED.
fired=0; bad=""
for c in partrow partrowus partbrief partagent partreturn partfarewell partpress partgamelog partplayoffs; do
  out=$(SIM_SAVE_KEEPER_CONTROL=$c node scripts/simSaveKeeper.mjs 2>&1); code=$?
  last=$(printf '%s\n' "$out" | grep -v '^\s*$' | tail -1 | cut -c1-200)
  echo "$c exit=$code | $last"
  if [ "$code" = "1" ] && printf '%s' "$last" | grep -q "FIRED"; then fired=$((fired+1)); else bad="$bad $c"; fi
done
echo "keeperparts: $fired of 9 part controls fired.${bad:+ NOT FIRED:$bad}"
[ -z "$bad" ]
