#!/usr/bin/env bash
# Round 1304 experiment (extra file, never committed): does a modern Club Manager walk go green when its
# league press targets the league tile? Runs the walk as committed first (the base reading), then a copy
# with the one press changed. Nothing is committed and the original file is put back.
set -u
W="$1"
F="scripts/$W.mjs"
echo "== $W as committed"
ENGINES=chromium node "$F" > "/tmp/$W-base.log" 2>&1; b=$?
grep -E "FAIL|Timeout|waiting for locator" "/tmp/$W-base.log" | head -4 | cut -c1-200
echo "as committed: exit=$b | $(tail -1 "/tmp/$W-base.log" | cut -c1-160)"
cp "$F" "/tmp/$W.orig"
sed -i "s/locator('text=Premier League')/locator('button:has-text(\"Premier League\")')/" "$F"
n=$(grep -c 'button:has-text("Premier League")' "$F")
echo "== $W with the league tile pressed ($n line changed)"
ENGINES=chromium node "$F" > "/tmp/$W-fixed.log" 2>&1; f=$?
cp "/tmp/$W.orig" "$F"
grep -E "FAIL|Timeout|waiting for locator" "/tmp/$W-fixed.log" | head -6 | cut -c1-200
if [ -n "${RC_OUT:-}" ]; then cp "/tmp/$W-base.log" "/tmp/$W-fixed.log" "$RC_OUT/"; fi
echo "TRY $W: as committed exit=$b, tile pressed exit=$f | $(tail -1 "/tmp/$W-fixed.log" | cut -c1-140)"
exit 0
