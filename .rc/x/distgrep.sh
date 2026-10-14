#!/usr/bin/env bash
# Decision 6's dist proof: no chunk of the built site carries a string that only the deck engine or GmInboxPanel holds.
# Control: "You replied" (InboxPanel, on the US career routes) must be found, or the grep proves nothing.
n=$(ls dist/assets/*.js 2>/dev/null | wc -l)
[ "$n" -gt 100 ] || { echo "distgrep: only $n js chunks in dist/assets, no build to read"; exit 2; }
bad=0
for s in "pack moves" "has not registered" "share the short key" "cannot say who anyone is" "not a declared slot" \
         "a meter the pack never moves" "built in meter" "for the staff to settle on" "your assistant deals with one" \
         "dealt with it (" "Nothing new lands until you answer one"; do
  hits=$(grep -lF -- "$s" dist/assets/*.js | wc -l)
  echo "\"$s\": $hits chunks"
  [ "$hits" = 0 ] || bad=1
done
ctl=$(grep -lF -- "You replied" dist/assets/*.js | wc -l)
echo "control \"You replied\": $ctl chunks"
[ "$ctl" -gt 0 ] || { echo "distgrep: the control string is in no chunk, the grep proves nothing"; exit 2; }
echo "distgrep: $n js chunks; $([ $bad = 0 ] && echo 'no deck string in any chunk' || echo 'A DECK STRING IS IN A CHUNK')"
exit $bad
