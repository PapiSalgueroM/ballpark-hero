#!/usr/bin/env bash
# The named harnesses on the head; every one that is not green rerun on FENCE_BASE (a worktree at .base,
# node_modules by walk up) and compared by exit code and last line.
#   bash fences.sh name1 name2 ...
BASE_SHA=${FENCE_BASE:-082fc277}
red=()
for n in "$@"; do
  timeout 1500 node scripts/$n.mjs > /tmp/f-head-$n.txt 2>&1; e=$?
  last=$(grep -v '^\s*$' /tmp/f-head-$n.txt | tail -1 | cut -c1-160)
  echo "$n exit=$e | $last"
  [ "$e" = 0 ] || red+=("$n")
done
mine=0
if [ ${#red[@]} -gt 0 ]; then
  git worktree add -f .base "$BASE_SHA" > /dev/null 2>&1
  for n in "${red[@]}"; do
    (cd .base && timeout 1500 node scripts/$n.mjs > /tmp/f-base-$n.txt 2>&1); be=$?
    hl=$(grep -v '^\s*$' /tmp/f-head-$n.txt | tail -1 | sed 's/[0-9.]* s\b//g; s/[0-9]*ms//g' | cut -c1-160)
    bl=$(grep -v '^\s*$' /tmp/f-base-$n.txt | tail -1 | sed 's/[0-9.]* s\b//g; s/[0-9]*ms//g' | cut -c1-160)
    he=$(grep -c . /tmp/f-head-$n.txt)
    hf=$(grep -m1 -E 'FAIL|Error|error' /tmp/f-head-$n.txt | cut -c1-140)
    bf=$(grep -m1 -E 'FAIL|Error|error' /tmp/f-base-$n.txt | cut -c1-140)
    if [ "$hf" = "$bf" ]; then same=same; else same=DIFFERS; mine=1; fi
    echo "RED $n: base exit=$be, first failing line $same | head: $hf | base: $bf"
  done
fi
echo "fences: ${#red[@]} of $# not green on the head; $([ $mine = 0 ] && echo 'each red has the same first failing line on the base' || echo 'A RED DIFFERS FROM THE BASE')"
exit $mine
