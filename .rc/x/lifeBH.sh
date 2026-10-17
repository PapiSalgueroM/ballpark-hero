#!/usr/bin/env bash
# Round BHH (Release BH): prints a commit that is <ref> with PR280's Life caption change applied to
# src/lib/soccerCareerLife.ts and src/lib/soccerCareerLifeConsequences.ts (git diff bd3b6244 99c98a8a, those two files
# only) and nothing else. The life chain's harnesses that hold Life and its captions whole to their packet's parent
# (simSoccerCareerColdContext, simSoccerCareerDocumentaryReview, simSoccerCareerSavedLoan) read them at this ref
# through SC_*_LIFE_REF, so the four honest captions the join merged are on both sides and every byte the packet did
# not change is still held. Built without a worktree, with fixed names and dates, so the same ref always gives the
# same sha. usage: L=$(bash .rc/x/lifeBH.sh <ref>)
#
# Round BII (Release BI, part three) extends it: the join merged PR286 (eleven queued popularity conditions,
# 44fb1611..320cd845) and PR302 (four queued money conditions, 75abee82..616ddc0b), both in soccerCareerLife.ts only.
# Each of those product patches is ALSO applied to <ref> when, and only when, the checked out tree carries it (its
# reverse applies once to HEAD's soccerCareerLife.ts), so on a tree before those merges this prints exactly what it
# printed in Release BH. A patch HEAD carries that does not apply once to <ref> FAILS CLOSED (no whole old Life file is
# ever substituted). LIFEBH_NO_CAPTIONS=1 leaves PR280's captions out (the base of PR280's own caption control, which
# must keep the guards and remove only the captions). The commit message names every patch applied.
set -euo pipefail
R=$(git rev-parse "$1^{commit}")
LIFE=src/lib/soccerCareerLife.ts
TMPD=$(mktemp -d /tmp/lifebh-XXXXXX)
carried() { # $1 from, $2 to: does HEAD's Life carry this product patch?
  local idx="$TMPD/head-idx"
  rm -f "$idx"
  GIT_INDEX_FILE="$idx" git read-tree "${LIFEBH_HEAD:-HEAD}"
  git diff "$1" "$2" -- "$LIFE" | GIT_INDEX_FILE="$idx" git apply --cached --check -R 2>/dev/null
}
IDX="$TMPD/idx"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
MSG="$R plus"
if [ "${LIFEBH_NO_CAPTIONS:-}" != 1 ]; then
  git diff bd3b62443d992b92c22bd303437cb3aa1c5eae5c 99c98a8a895249fee1051f8da60853901198a2d3 -- src/lib/soccerCareerLife.ts src/lib/soccerCareerLifeConsequences.ts | git apply --cached
  MSG="$MSG PR280's Life captions (bd3b6244..99c98a8a, soccerCareerLife.ts and soccerCareerLifeConsequences.ts)"
fi
for P in "PR286 44fb161111c722d028f0c9e46771d008b74ca742 320cd84554207b840c85543a190eaeaa8c10c2eb" \
         "PR302 75abee825b73c34b4a7a6d6852de1417a20cc8aa 616ddc0b44666799676a60405181fdeb33112fa4"; do
  set -- $P
  if (unset GIT_INDEX_FILE; carried "$2" "$3"); then
    git diff "$2" "$3" -- "$LIFE" | git apply --cached || { echo "lifeBH: $1's Life patch does not apply once to $R" >&2; exit 2; }
    if [ "$MSG" = "$R plus" ]; then MSG="$MSG $1"; else MSG="$MSG, $1"; fi
    MSG="$MSG's Life conditions (${2:0:8}..${3:0:8}, soccerCareerLife.ts)"
  fi
done
T=$(git write-tree)
unset GIT_INDEX_FILE
rm -rf "$TMPD"
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$MSG" | git commit-tree "$T" -p "$R"
