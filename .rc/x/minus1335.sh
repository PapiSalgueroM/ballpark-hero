#!/usr/bin/env bash
# Release BI (Round BIG): prints a commit that is this tree WITHOUT Round 1335 (merge ea937568, first parent 420902cd),
# for simCmBoardVerdict's CM_BOARD_BASE (x/mkbase.sh checks out BASE_SHA).
# scripts/lib/treeWithoutMerge.mjs alone refuses on the joined tree: ClubManagerHelp.tsx conflicts, because Rounds 1342
# and 1343 append their help blocks right after 1335's. simCmBoardVerdict never reads the base's help (it bundles the
# base's engine from BASE/src, and reads the help from the head only: scripts/simCmBoardVerdict.mjs, the ARMS.base line
# and the helpText line of section pure), so the ref handed to treeWithoutMerge is HEAD with that ONE file set back to
# the piece tip's text; the three way merge then gives that file 420902cd's text and every other path is HEAD without
# exactly 1335's own changes. Any other conflict still fails closed (treeWithoutMerge exits 2, and so does this).
set -euo pipefail
F=src/components/club-manager/ClubManagerHelp.tsx
T=$(mktemp -u /tmp/minus1335-index-XXXXXX)
GIT_INDEX_FILE="$T" git read-tree HEAD
GIT_INDEX_FILE="$T" git update-index --cacheinfo "100644,$(git rev-parse "ea937568:$F"),$F"
TREE=$(GIT_INDEX_FILE="$T" git write-tree)
rm -f "$T"
REF=$(git -c user.name=gate -c user.email=gate@invalid commit-tree "$TREE" -p HEAD -m "HEAD with $F at ea937568")
node scripts/lib/treeWithoutMerge.mjs ea937568 420902cd "$REF"
