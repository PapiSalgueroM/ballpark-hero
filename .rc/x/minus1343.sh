#!/usr/bin/env bash
# Release BI, part two (Round BIH): prints a commit that is this tree WITHOUT Round 1343 (merge 819d9d16, first parent
# dd44adff), for simCmRetire's RETIRE_BASE (fleet, hotseat, loads, oldsave and the four base controls).
# After Round 1344 lands, scripts/lib/treeWithoutMerge.mjs alone refuses: ClubManagerHelp.tsx conflicts, because 1344
# appends its help block right after 1343's. simCmRetire never reads the base's help (the base arm bundles RETIRE_BASE's
# engine, src/lib, and the saves scripts/lib/realSaves.mjs builds there; the help is a page component no engine
# imports), so the ref handed to treeWithoutMerge is HEAD with that ONE file set back to the piece tip's text: the
# three way merge then gives that file dd44adff's text and every other path is HEAD without exactly 1343's own changes.
# Any other conflict still fails closed (treeWithoutMerge exits 2, and so does this). The same recipe as x/minus1335.sh.
set -euo pipefail
F=src/components/club-manager/ClubManagerHelp.tsx
T=$(mktemp -u /tmp/minus1343-index-XXXXXX)
GIT_INDEX_FILE="$T" git read-tree HEAD
GIT_INDEX_FILE="$T" git update-index --cacheinfo "100644,$(git rev-parse "819d9d16:$F"),$F"
TREE=$(GIT_INDEX_FILE="$T" git write-tree)
rm -f "$T"
REF=$(git -c user.name=gate -c user.email=gate@invalid commit-tree "$TREE" -p HEAD -m "HEAD with $F at 819d9d16")
node scripts/lib/treeWithoutMerge.mjs 819d9d16 dd44adff "$REF"
