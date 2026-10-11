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
  U="$(git diff --name-only --diff-filter=U | tr '\n' ' ')"
  echo "MERGE $L: CONFLICT in: $U"
  # The Hall harness reads neither the What's New page nor the board's recorded fixtures: for THIS probe only,
  # keep this head's side of those and go on. Any other conflicting file stops the probe.
  for f in $U; do
    case "$f" in
      src/pages/WhatsNew.tsx|scripts/data/usBoardFixture.json|src/test/fixtures/usCareerTruthDigest.json) git checkout --ours -- "$f" && git add "$f" ;;
      *) echo "MERGE $L: $f is not one this probe may set aside, stopping"; exit 3 ;;
    esac
  done
  git -c user.name=review -c user.email=review@example.invalid commit --no-edit -q || { echo "MERGE $L: could not close the merge"; exit 3; }
  echo "MERGE $L: closed for the probe with this head's side of [$U] (the lead resolves them for real at integration)"
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
