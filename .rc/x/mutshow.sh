#!/usr/bin/env bash
# Round 1539 review (runner only). usage: bash .rc/x/mutshow.sh <mutation id> '<command>'
# Applies the mutation, runs the command, prints its full output without the ok lines, restores the tree.
# Exit: the command's exit code; 92 when the mutation could not apply.
set -u
ID="$1"; CMD="$2"
node .rc/x/mutrun.mjs "$ID" || { git checkout -- src scripts; exit 92; }
L="/tmp/show-$ID-$$.log"
bash -c "$CMD" > "$L" 2>&1
E=$?
echo "== $ID command exit=$E ($(wc -l < "$L") lines)"
grep -v -E "^ *ok |^ *✓|passed [0-9]" "$L" | cut -c1-250 | head -70
echo "-- last lines:"
tail -4 "$L" | cut -c1-250
git checkout -- src scripts
exit $E
