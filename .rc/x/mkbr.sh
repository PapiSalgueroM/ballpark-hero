#!/usr/bin/env bash
# Reviewer (run lens): a detached worktree of the merge base 1027b08c inside the repo, unique per line, retried on a git lock.
B=".claude/worktrees/rvbase-$1"
for i in 1 2 3 4 5 6; do git worktree add -q "$B" ${BASE_SHA:-1027b08c} >/dev/null 2>&1 && { echo "$PWD/$B"; exit 0; }; sleep $((i * 2)); done
echo "could not add the base worktree" >&2; exit 2
