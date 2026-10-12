#!/usr/bin/env bash
# Round 1308 review (run lens): one planted import, simGmGameDay's section 6, the tree restored. Last line CAUGHT or NOT CAUGHT.
id="$1"
node .rc/x/plant.mjs "$id" || { git checkout -- src; echo "PLANT $id ABORTED"; exit 2; }
SEEDSET=0 node scripts/simGmGameDay.mjs > "/tmp/p-$id.log" 2>&1
s=$?
grep -E "^ *FAIL" "/tmp/p-$id.log" | cut -c1-260 | head -6
tail -1 "/tmp/p-$id.log"
git checkout -- src
if [ -n "$(git status --porcelain src)" ]; then echo "PLANT $id: TREE NOT RESTORED"; exit 3; fi
if [ $s -ne 0 ]; then echo "PLANT $id CAUGHT: simGmGameDay exit $s"; exit 1; fi
echo "PLANT $id NOT CAUGHT: simGmGameDay exit $s"
exit 0
