#!/usr/bin/env bash
# Reviewer's old save probe for Round 1115 (never committed): saves made by origin/main's engine, read on the branch.
set -u
HERE="$PWD"
git fetch -q --depth=1 origin main || { echo "fetch failed"; exit 2; }
git worktree add -q --detach /tmp/base-main FETCH_HEAD || { echo "worktree failed"; exit 2; }
echo "base main tree: $(git -C /tmp/base-main rev-parse HEAD)"
node .rc/x/rvOldSave.mjs /tmp/base-main
