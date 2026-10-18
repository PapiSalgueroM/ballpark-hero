#!/usr/bin/env bash
# Round 1509, step 7: run harnesses on this tree, and every one that is not green on main as Release BJ left it
# (BASE_REF, default 77556430) too, so a red is read as the round's or main's. One line a harness:
#   name: head exit N | main exit M (only when head is red) | MINE when the head is red and main is not, or both
#   are red with another last line.
# Usage: bash .rc/x/readers.sh simA simB ...   (from the repo root; each harness gets 25 minutes)
set -uo pipefail
B=${BASE_REF:-77556430}
T=$(mktemp -d /tmp/readers-XXXXXX)
base_ready=0
mine=0
for h in "$@"; do
  timeout 1500 node "scripts/$h.mjs" > "$T/$h.head.log" 2>&1; eh=$?
  lh=$(grep -v '^\s*$' "$T/$h.head.log" | tail -1 | cut -c1-160)
  if [ "$eh" -eq 0 ]; then echo "$h: head exit 0 | $lh"; continue; fi
  if [ "$base_ready" -eq 0 ]; then git worktree add -q --detach "$T/base" "$B" && ln -s "$PWD/node_modules" "$T/base/node_modules" && base_ready=1; fi
  (cd "$T/base" && timeout 1500 node "scripts/$h.mjs" > "$T/$h.base.log" 2>&1); eb=$?
  lb=$(grep -v '^\s*$' "$T/$h.base.log" | tail -1 | cut -c1-160)
  verdict=main
  if [ "$eb" -eq 0 ] || [ "$lh" != "$lb" ]; then verdict=MINE; mine=$((mine + 1)); fi
  echo "$h: head exit $eh | main exit $eb | $verdict | head: $lh | main: $lb"
  [ -n "${RC_OUT:-}" ] && cp "$T/$h.head.log" "$RC_OUT/$h.head.log" 2>/dev/null && cp "$T/$h.base.log" "$RC_OUT/$h.base.log" 2>/dev/null
done
echo "readers: $# run, $mine red on this tree and not as on main"
[ "$mine" -eq 0 ]
