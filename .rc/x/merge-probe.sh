#!/usr/bin/env bash
# Review of Round 1301 (runner only, never committed, never pushed): another round in flight merged onto this
# round's head in a scratch worktree, then the Hall harness of the sports named, board sections skipped.
# usage: merge-probe.sh <commit to merge> <label> <sport> [<sport> ...]
# It answers one question for the lead: does [marks] (the fleet band this round recorded) stay green with that round on top.
set -u
SHA="$1"; L="$2"; shift 2
R="$PWD"; W="/tmp/mp-$L"
git worktree add -q --detach "$W" HEAD || { echo "MERGE $L: could not add the worktree"; exit 2; }
ln -s "$R/node_modules" "$W/node_modules"
cd "$W" || exit 2
git cat-file -e "$SHA^{commit}" 2>/dev/null || git fetch -q origin "$SHA"
if ! git -c user.name=review -c user.email=review@example.invalid merge --no-edit -q "$SHA" > "/tmp/mp-$L.merge.log" 2>&1; then
  echo "MERGE $L: CONFLICT in: $(git diff --name-only --diff-filter=U | tr '\n' ' ')"
  tail -5 "/tmp/mp-$L.merge.log" | cut -c1-200
  exit 3
fi
echo "MERGE $L: clean. Engine files it brings: $(git diff --name-only HEAD^1 HEAD -- src/lib src/data | grep -E "MyCareer|CareerLoop|careerRival|usCareer|usSeasonShape|CareerLife" | tr '\n' ' ')"
worst=0
for s in "$@"; do
  T="/tmp/mp-$L-tmp-$s"; mkdir -p "$T"
  TMPDIR="$T" TEMP="$T" TMP="$T" SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs "$s" 2000 > "/tmp/mp-$L-$s.log" 2>&1
  code=$?
  last="$(tail -1 "/tmp/mp-$L-$s.log" | cut -c1-220)"
  echo "$L $s exit $code | $last"
  grep -E "17 \(a\) marks, the fleet|at or over from, pooled .*band|^  FAIL" "/tmp/mp-$L-$s.log" | cut -c1-300
  echo "$last" | grep -q "red \[" && worst=1
done
echo "merge-probe $L: $([ $worst -eq 1 ] && echo 'SOMETHING RED with that round on top' || echo 'every sport named stays green with that round on top')"
exit $worst
