#!/usr/bin/env bash
# Reviewer driver for Round 1519 mutations. Usage: bash .rc/x/rvgates1519.sh <mutation id> <gate> [gate...]
# Applies the mutation, runs each gate, restores src and scripts, prints one closing line:
#   MUT <id>: gate=exit ... => CAUGHT (exit 1) | ESCAPED (exit 0) | ABORT (exit 2)
id="$1"; shift
node .rc/x/rvmut1519.mjs "$id"; m=$?
if [ $m -ne 0 ]; then git checkout -- src scripts; echo "MUT $id: ABORT (target not found once)"; exit 2; fi
res=""; caught=0
for g in "$@"; do
  case "$g" in
    endings) cmd="node scripts/simSoccerCareerEndings.mjs" ;;
    v1519) cmd="node_modules/.bin/vitest run src/test/soccerCareerRetirement1519.test.tsx --testTimeout=300000 --hookTimeout=120000" ;;
    vrecov) cmd="node_modules/.bin/vitest run src/test/soccerCareerSaveRecovery.test.tsx --testTimeout=300000 --hookTimeout=120000" ;;
    vfarewell) cmd="node_modules/.bin/vitest run src/test/soccerFarewellPage.test.tsx --testTimeout=300000 --hookTimeout=120000" ;;
    *) cmd="node scripts/$g.mjs" ;;
  esac
  out=$(eval "$cmd" 2>&1); e=$?
  echo "=== $g exit=$e"
  echo "$out" | grep -E "FAIL|✗|×|failed|Tests " | head -20
  echo "$out" | grep -v '^[[:space:]]*$' | tail -3
  res="$res $g=$e"
  if [ $e -ne 0 ]; then caught=1; fi
done
git checkout -- src scripts
if [ $caught -eq 1 ]; then echo "MUT $id:$res => CAUGHT"; else echo "MUT $id:$res => ESCAPED"; fi
exit $caught
