#!/usr/bin/env bash
# Round BII kit (Release BI, part three): prints a commit that is <ref> (default HEAD) with exactly PR284's
# TransferScreen change taken out (git diff a758fcec 7c483867 -- TransferScreen.tsx, applied in reverse) and nothing
# else, so PR284's whole original component control on the joined tree removes only PR284 and keeps PR296's note
# placement (which joined after it) and anything later. PR284's workflow hardcodes a758fcec as the original; on a tree
# where TransferScreen is a758fcec plus PR284 alone the two are byte equal (checked by the m9 line), so this is the
# same control, made exact for a tree with later TransferScreen work. Fails closed when the reverse patch does not
# apply once. Built without a worktree, with fixed names and dates, so the same ref always gives the same sha.
# usage: R=$(bash .rc/x/minus284.sh [ref]) || exit 2
set -euo pipefail
R=$(git rev-parse "${1:-HEAD}^{commit}")
F=src/components/club-manager/TransferScreen.tsx
IDX=$(mktemp /tmp/minus284-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff a758fcec4392c57c639aa54cda840810c8e44663 7c4838670253f2ca95af2adf14c2397d66b4f7c9 -- "$F" | git apply --cached -R
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test "$(git diff --name-only "$R" "$T")" = "$F"
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$R without PR284's TransferScreen change (a758fcec..7c483867, TransferScreen.tsx only)" | git commit-tree "$T" -p "$R"
