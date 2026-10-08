#!/usr/bin/env bash
# Reviewer scratch (Round 1051, runner lens). Travels as .rc/x/natrun.sh, serial only, throwaway checkout.
# Does the REAL board stamp a career that a played season ends (a farewell season, the same site as the hard stop)?
# Step 1 adds the question to the round's own farewell case and runs it on the branch's code (want exit 0).
# Step 2 is the probe's negative control: the stamp taken off the season end sites (want exit 1).
V="node_modules/.bin/vitest run src/test/usCareerHallBoard.test.tsx -t farewell --testTimeout=300000 --hookTimeout=120000"
strip() { sed 's/\x1b\[[0-9;]*m//g' "$1"; }
node .rc/x/rmut.mjs nattest || { echo "NATURAL: the probe line could not be added"; exit 9; }
$V > /tmp/nat1.log 2>&1; R1=$?
strip /tmp/nat1.log | grep -a -E ' Tests |RUNNER PROBE|^ *(FAIL|×) ' | cut -c1-220 | head -12
node .rc/x/rmut.mjs stampnotseason || { echo "NATURAL: the control could not be applied"; git checkout -q -- src; exit 9; }
$V > /tmp/nat2.log 2>&1; R2=$?
strip /tmp/nat2.log | grep -a -E ' Tests |RUNNER PROBE|^ *(FAIL|×) ' | cut -c1-220 | head -12
git checkout -q -- src
T1=$(strip /tmp/nat1.log | grep -a ' Tests ' | tr -s ' ' | tr -d '\n' | cut -c1-70)
T2=$(strip /tmp/nat2.log | grep -a ' Tests ' | tr -s ' ' | tr -d '\n' | cut -c1-70)
echo "NATURAL: branch code exit=$R1 ($T1) want 0; stamp off the season end sites exit=$R2 ($T2) want 1; $(git status --porcelain --untracked-files=no -- src | wc -l) files left changed"
[ "$R1" -eq 0 ] && [ "$R2" -ne 0 ] && exit 0
exit 1
