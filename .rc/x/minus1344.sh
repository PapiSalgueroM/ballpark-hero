#!/usr/bin/env bash
# Release BI, part five (Round BIK): prints a commit that is this tree WITHOUT Round 1344 (merge 54100f6e, first parent
# b31c9894), for simCmWorldMoves' CM_WORLD_MOVES_BASE and the other 1344 lines of rc-BIh.txt and rc-BIh2.txt.
# Since Round 1508 (merge f1e54e17, first parent 67ec9956) stands on 1344 and edits 1344's own lines (the writers'
# guards, the join carry, the bridge anchors), `treeWithoutMerge 54100f6e b31c9894` alone refuses on the joined tree
# ("conflicts in ClubManagerHelp.tsx, clubManager.ts, clubManagerCalendar.ts ..."). 1508 cannot stand without 1344, so
# the honest base is the tree without both: first 1508 out (its merge is the last of the release, so that is the first
# parent's tree), then 1344 out of that. Locally on f1e54e17 the result's tree equals `treeWithoutMerge 54100f6e b31c9894
# 67ec9956` (the base part four's kit used), and its src differs from HEAD in exactly the union of the two rounds' src
# files. Either step fails closed (treeWithoutMerge exits 2, and so does this). On a tree without f1e54e17 (before part
# five) it falls back to the one step form, exactly as before.
set -euo pipefail
if git merge-base --is-ancestor f1e54e17 HEAD 2>/dev/null; then
  R=$(node scripts/lib/treeWithoutMerge.mjs f1e54e17 67ec9956) || exit 2
  node scripts/lib/treeWithoutMerge.mjs 54100f6e b31c9894 "$R" || exit 2
else
  node scripts/lib/treeWithoutMerge.mjs 54100f6e b31c9894 || exit 2
fi
