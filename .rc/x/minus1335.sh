#!/usr/bin/env bash
# Release BI (Round BIG): prints a commit that is this tree WITHOUT Round 1335 (merge ea937568, first parent 420902cd),
# for simCmBoardVerdict's CM_BOARD_BASE (x/mkbase.sh checks out BASE_SHA).
# scripts/lib/treeWithoutMerge.mjs alone refuses on the joined tree: ClubManagerHelp.tsx conflicts, because Rounds 1342
# and 1343 append their help blocks right after 1335's. simCmBoardVerdict never reads the base's help (it bundles the
# base's engine from BASE/src, and reads the help from the head only: scripts/simCmBoardVerdict.mjs, the ARMS.base line
# and the helpText line of section pure), so the ref handed to treeWithoutMerge is HEAD with that ONE file set back to
# the piece tip's text; the three way merge then gives that file 420902cd's text and every other path is HEAD without
# exactly 1335's own changes. Any other conflict still fails closed (treeWithoutMerge exits 2, and so does this).
# Round BIH (part two): Round 1344 put SAVE_CAPS on the end of the calendar's startCareer import line, right above
# 1335's two import lines (legacySeason), and the adjacent edits refused. When HEAD carries that line, the ref also
# gets the calendar with SAVE_CAPS moved onto its own line above (x/calImport1344.mjs, same import, fails closed unless
# its anchor stands once), so 1335's lines come out and 1344's import stays. Needs x/calImport1344.mjs beside it.
set -euo pipefail
F=src/components/club-manager/ClubManagerHelp.tsx
C=src/lib/clubManagerCalendar.ts
HERE=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -u /tmp/minus1335-index-XXXXXX)
GIT_INDEX_FILE="$T" git read-tree HEAD
GIT_INDEX_FILE="$T" git update-index --cacheinfo "100644,$(git rev-parse "ea937568:$F"),$F"
if git show "HEAD:$C" | grep -qF 'customExitUclField, SAVE_CAPS,'; then
  BLOB=$(git show "HEAD:$C" | node "$HERE/calImport1344.mjs" | git hash-object -w --stdin)
  GIT_INDEX_FILE="$T" git update-index --cacheinfo "100644,$BLOB,$C"
fi
TREE=$(GIT_INDEX_FILE="$T" git write-tree)
rm -f "$T"
REF=$(git -c user.name=gate -c user.email=gate@invalid commit-tree "$TREE" -p HEAD -m "HEAD with $F at ea937568 (and $C's 1344 import on its own line)")
node scripts/lib/treeWithoutMerge.mjs ea937568 420902cd "$REF"
