#!/usr/bin/env bash
# Probe (never committed): which NAMED_BASE_SEED from 782003 on draws a first cup tie the harness can read on this tree.
F=scripts/simCmShootoutOrder.mjs
grep -c 'const NAMED_BASE_SEED = 782_002;' "$F" || exit 2
for s in 782003 782004 782005 782006 782007 782008 782009 782010 782011 782012; do
  sed -i "s/const NAMED_BASE_SEED = 782_002;/const NAMED_BASE_SEED = $s;/" "$F"
  out=$(node "$F" 2>&1 | grep -E "drew|all sections passed|FAIL|section 1|shootouts" | head -6 | cut -c1-200)
  echo "== seed $s"; echo "$out"
  git checkout -- "$F"
done
