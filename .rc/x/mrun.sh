#!/usr/bin/env bash
# Reviewer mutation runner: bash .rc/x/mrun.sh <ID> "<cmd>" ["<cmd>" ...]
# Applies mutation <ID> (mut.mjs), runs each command, prints each one's exit and last lines, restores src and scripts.
# Exit 0 means the mutation SURVIVED every command (all green), 1 means at least one command went red, 2 an abort.
ID="$1"; shift
node .rc/x/mut.mjs "$ID" || { git checkout -- src scripts; exit 2; }
codes=""; red=0; i=0
for cmd in "$@"; do
  i=$((i+1))
  bash -c "$cmd" > "/tmp/mut-$ID-$i.log" 2>&1; e=$?
  echo "---- [$ID.$i] exit=$e: $cmd"
  grep -E "FAIL|ABORT|Tests |Test Files|green|RED" "/tmp/mut-$ID-$i.log" | head -8
  tail -2 "/tmp/mut-$ID-$i.log"
  [ $e -ne 0 ] && red=1
  codes="$codes $i=$e"
done
git checkout -- src scripts
if [ $red -eq 0 ]; then echo "MUTATION $ID SURVIVED (all green):$codes"; exit 0; fi
echo "MUTATION $ID CAUGHT:$codes"; exit 1
