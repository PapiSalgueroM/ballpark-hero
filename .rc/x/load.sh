#!/usr/bin/env bash
# Reviewer only, on the runner: the plain walk while every core is kept busy twice over, as a stand in for a slow
# PC with a release gate running beside it. A red here on healthy code is a timing sensitivity, not a defect in the guard.
N=$(nproc)
pids=""
for i in $(seq 1 $((N * 2))); do
  node -e "const e=Date.now()+1500000; while(Date.now()<e){}" &
  pids="$pids $!"
done
s=$(date +%s)
ENGINES=chromium node scripts/playTranslatedPage.mjs > "$RC_OUT/loaded-plain.log" 2>&1
rc=$?
kill $pids 2>/dev/null
grep -E 'FAIL|stuck at|checks,' "$RC_OUT/loaded-plain.log" | cut -c1-260 | head -40
echo "LOADED nproc=$N hogs=$((N * 2)) plain exit=$rc seconds=$(( $(date +%s) - s ))"
