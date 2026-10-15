#!/usr/bin/env bash
# Round BFH: prints a commit that is <ref> with Release BE's merge of main applied (git diff 4ae7a534 08923969, docs
# aside): main's Round 1368 save codec and its lazy career story. The life chain's sims hold the app files their own
# packet did not change to a core ref, the tree without that packet (its merge's first parent on this branch, the
# join's SC_*_CORE_REF bindings). This branch took Release BE's merge of main after every chain packet, so the tree
# without a packet is now that first parent PLUS that merge: soccerCareerSave.ts and SoccerCareer.tsx moved for a reason
# that is not the packet. The commit is built without a worktree and with fixed names and dates, so the same ref always
# gives the same sha, and two lines building it at once agree. usage: C=$(bash .rc/x/coreBE.sh <ref>)
# Round BGG (Release BG): the tree without a chain packet now also carries everything this branch added to src after
# Release BF as published (c7b9a95a, main with BF's record): the BG join's merges (PR241, PR273, PR274, PR277, PR279)
# and its What's New lines. So that diff (git diff c7b9a95a HEAD -- src) is applied after BE's. The lines that call
# this file are unchanged; on Release BF itself the added diff is empty and the result is the old commit.
set -e
R=$(git rev-parse "$1^{commit}")
IDX=$(mktemp /tmp/corebe-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff 4ae7a534 08923969 -- . ':(exclude)docs' | git apply --cached
if ! git diff --quiet c7b9a95a HEAD -- src; then git diff c7b9a95a HEAD -- src | git apply --cached; fi
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-14T00:00:00Z' GIT_COMMITTER_DATE='2026-10-14T00:00:00Z'
echo "$R plus Release BE's merge of main (4ae7a534..08923969) plus Release BG's src after c7b9a95a" | git commit-tree "$T" -p "$R"
