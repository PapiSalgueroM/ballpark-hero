#!/usr/bin/env bash
# Release BV kit: build (once per checkout) a base commit inside the repo and print its sha. Never committed.
#   bash .rc/x/bvbase.sh euro    the join just before Round 1593 (68f7432d6: Release BU plus Round 1603) with Round
#                                1600 ed30d7601 merged into it, -X ours: every engine round of BV but 1593 (brief V2,
#                                recipe B carried past 1600, which V1 merges after 1593)
#   bash .rc/x/bvbase.sh dailies the BASE 19911f815 with Round 1600 ed30d7601 merged into it, -X ours: Release BU
#                                plus 1600 alone, for simCmBoardVerdict --part=dailies (brief V4)
# Prints the sha on stdout; the worktree is .rcbv-<kind> at the repo root (node_modules resolve by walk-up).
set -e
K="$1"
case "$K" in euro) FROM=68f7432d6 ;; dailies) FROM=19911f815 ;; *) echo "unknown base $K" >&2; exit 2 ;; esac
D=".rcbv-$K"
if [ ! -d "$D" ]; then
  git worktree add -q "$D" "$FROM" >&2
  git -C "$D" -c user.email=r@x -c user.name=r merge -q --no-edit -X ours ed30d7601 >&2
fi
git -C "$D" rev-parse HEAD
