#!/usr/bin/env bash
# Release BL kit: runs a command in a fresh detached worktree /tmp/wt-<label> of <commit>, with the checkout's
# node_modules linked in (ignored by git), and exits with the command's code (no preload: pass env in the command). For attributing a
# red to the merge that brought it (run the same check at a merge and at its first parent, or at a packet's own head).
# usage: bash .rc/x/wt.sh <commit> <label> <command>...
set -uo pipefail
HOME_DIR=$PWD
C=$(git rev-parse "$1^{commit}") || exit 2; LABEL=$2; shift 2
W=/tmp/wt-$LABEL
test ! -e "$W" || { echo "wt: $W exists" >&2; exit 2; }
git worktree add -q --detach "$W" "$C" || exit 2
ln -s "$HOME_DIR/node_modules" "$W/node_modules"
cd "$W"
echo "wt: $LABEL at ${C:0:12} ($(git log -1 --format=%s | cut -c1-80))"
"$@"
