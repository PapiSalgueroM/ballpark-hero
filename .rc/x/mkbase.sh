#!/usr/bin/env bash
# Make a detached worktree of the base inside the repo (unique per line), retrying on a git lock. Prints its path.
B=".claude/worktrees/base-$1"
for i in 1 2 3 4 5; do git worktree add -q "$B" d4f2c6f6 >/dev/null 2>&1 && { echo "$PWD/$B"; exit 0; }; sleep $((i * 2)); done
echo "could not add the base worktree" >&2; exit 2
