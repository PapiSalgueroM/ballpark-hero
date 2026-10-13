#!/usr/bin/env bash
# Round 1319 closing check: run one control of simCareerPreDraft against a copy of the harness that carries
# the OLD section 12 lines (3.4, 1.6, -2.8, -1.3), to show what the old lines let through. Never committed.
# Usage: bash oldfloors.sh <control>
f=scripts/zzOldFloorsCopy.mjs
sed -e 's/expertMin: { allout: 6.5, steady: 3.0 }/expertMin: { allout: 3.4, steady: 1.6 }/' -e 's/noviceMax: { allout: -5.4, steady: -2.4 }/noviceMax: { allout: -2.8, steady: -1.3 }/' scripts/simCareerPreDraft.mjs > "$f"
n=$(grep -c "expertMin: { allout: 3.4, steady: 1.6 }" "$f"); m=$(grep -c "noviceMax: { allout: -2.8, steady: -1.3 }" "$f")
echo "old lines in the copy: expert $n, novice $m"
if [ "$n" != 1 ] || [ "$m" != 1 ]; then echo "the copy did not take the old lines, refusing"; rm -f "$f"; exit 2; fi
SIM_PRE_DRAFT_CONTROL="$1" node "$f"; s=$?
rm -f "$f"
echo "OLDFLOORS control=$1 exit=$s"
exit $s
