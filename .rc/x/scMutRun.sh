#!/usr/bin/env bash
# Release AU review, lens sc-engine. One mutation, PR216's unit files, then its engine proof with the base pointed at
# the tree before its merge. The checkout is restored before the verdict line. usage: bash .rc/x/scMutRun.sh <name|none>
n="$1"
if [ "$n" != none ]; then
  node .rc/x/scMut.mjs "$n" || { git checkout HEAD -- src scripts; echo "MUT $n: ABORTED, nothing was tested"; exit 3; }
fi
node_modules/.bin/vitest run src/lib/soccerCareerProgramme.test.ts src/test/soccerCareerProgrammeUi.test.tsx > "$RC_OUT/$n-unit.log" 2>&1; u=$?
node .rc/x/pointProgrammeBase.mjs 2f1919478db9e3a0f13b8f8b34373756944459c1 > /dev/null 2>&1
SIM_NETWORK=offline TZ=UTC NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/simCareerProgramme.mjs > "$RC_OUT/$n-sim.log" 2>&1; s=$?
git checkout HEAD -- src scripts
uf=$(grep -m1 -E "FAIL|AssertionError" "$RC_OUT/$n-unit.log" | cut -c1-110)
sf=$(grep -m1 -E "AssertionError|Error:" "$RC_OUT/$n-sim.log" | cut -c1-130)
left=$(git status --short -- src scripts | wc -l)
if [ "$n" = none ]; then echo "MUT none: unit exit $u; sim exit $s; $(tail -1 "$RC_OUT/$n-sim.log" | cut -c1-100); src and scripts differ from the head in $left file(s)"; [ $u -eq 0 ] && [ $s -eq 0 ]; exit $?; fi
if [ $u -eq 0 ] && [ $s -eq 0 ]; then echo "MUT $n: SURVIVED (unit exit 0, sim exit 0); src and scripts differ from the head in $left file(s)"; exit 0; fi
echo "MUT $n: caught. unit exit $u ($uf); sim exit $s ($sf); src and scripts differ from the head in $left file(s)"; exit 1
