#!/usr/bin/env bash
# Round BHH (Release BH): prints a commit that is <ref> with PR280's Life caption change applied to
# src/lib/soccerCareerLife.ts and src/lib/soccerCareerLifeConsequences.ts (git diff bd3b6244 99c98a8a, those two files
# only) and nothing else. The life chain's harnesses that hold Life and its captions whole to their packet's parent
# (simSoccerCareerColdContext, simSoccerCareerDocumentaryReview, simSoccerCareerSavedLoan) read them at this ref
# through SC_*_LIFE_REF, so the four honest captions the join merged are on both sides and every byte the packet did
# not change is still held. Built without a worktree, with fixed names and dates, so the same ref always gives the
# same sha. usage: L=$(bash .rc/x/lifeBH.sh <ref>)
set -e
R=$(git rev-parse "$1^{commit}")
IDX=$(mktemp /tmp/lifebh-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff bd3b62443d992b92c22bd303437cb3aa1c5eae5c 99c98a8a895249fee1051f8da60853901198a2d3 -- src/lib/soccerCareerLife.ts src/lib/soccerCareerLifeConsequences.ts | git apply --cached
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$R plus PR280's Life captions (bd3b6244..99c98a8a, soccerCareerLife.ts and soccerCareerLifeConsequences.ts)" | git commit-tree "$T" -p "$R"
