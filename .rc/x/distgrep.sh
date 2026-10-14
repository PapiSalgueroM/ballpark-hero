#!/usr/bin/env bash
# Round 1332 review: no built js chunk may carry the deck engine's or the GM panel's own strings (no route reaches them).
n=$(ls dist/assets/*.js 2>/dev/null | wc -l)
echo "js chunks in dist/assets: $n"
[ "$n" -gt 100 ] || { echo "distgrep: too few chunks, nothing was tested"; exit 2; }
bad=0
for s in "pack moves" "has not registered" "share the short key" "cannot say who anyone is" "not a declared slot" "a meter the pack never moves" "built in meter" "your assistant deals with one" "dealt with it (" "Nothing new lands until you answer one"; do
  c=$(grep -lF "$s" dist/assets/*.js | wc -l); echo "  \"$s\": $c chunk(s)"; [ "$c" = 0 ] || bad=1
done
c=$(grep -lF "You replied" dist/assets/*.js | wc -l); echo "  control, InboxPanel's own \"You replied\" (must be found): $c chunk(s)"; [ "$c" -gt 0 ] || bad=2
echo "distgrep: $([ $bad = 0 ] && echo 'green, no deck string in any chunk and the control string found' || echo "RED ($bad)")"
exit $bad
