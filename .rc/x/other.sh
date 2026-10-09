#!/usr/bin/env bash
# other.sh (fixer scratch, Round 1103, never committed). Runs on the GitHub runner from the repo root.
# Runs one command on ANOTHER branch's own head, in a separate checkout, so a red can be shown to be that
# branch's own and not this round's.
#   usage: bash .rc/x/other.sh <branch> '<command>'
set -u
BRANCH="$1"; CMD="$2"
REPO="$PWD"
D="$(mktemp -d)"
git fetch -q origin "$BRANCH" || { echo "fetch of $BRANCH failed"; exit 2; }
SHA="$(git rev-parse FETCH_HEAD)"
git worktree add --detach "$D/tree" "$SHA" > /dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$REPO/node_modules" "$D/tree/node_modules"
cd "$D/tree" || exit 2
echo "on $BRANCH at $SHA"
export TMPDIR="$D/tmp" TEMP="$D/tmp" TMP="$D/tmp"; mkdir -p "$D/tmp"
bash -c "$CMD"
CODE=$?
echo "on $BRANCH at $SHA: exit $CODE"
exit $CODE
