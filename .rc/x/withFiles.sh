#!/usr/bin/env bash
# Release BK kit: prints a commit that is <commit> with each named path taken from <source> (for a proof tree only, for
# example PR331's own saved /club-manager page in place of the stale one the release redraws), parent <commit>, fixed
# author and date. Fails closed when a path is missing at <source> or nothing changes.
# usage: C2=$(bash .rc/x/withFiles.sh <commit> <source> <path>...) || exit 2
set -euo pipefail
B=$(git rev-parse "$1^{commit}"); S=$(git rev-parse "$2^{commit}"); shift 2
IDX=$(mktemp /tmp/withfiles-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$B"
for f in "$@"; do
  line=$(git ls-tree "$S" -- "$f"); test -n "$line" || { echo "withFiles: $f is not in $S" >&2; exit 2; }
  mode=$(echo "$line" | cut -d' ' -f1); blob=$(echo "$line" | cut -d' ' -f3 | cut -f1)
  git update-index --add --cacheinfo "$mode,$blob,$f"
done
TREE=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test -n "$(git diff --name-only "$B" "$TREE")" || { echo "withFiles: nothing changed" >&2; exit 2; }
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-18T00:00:00Z' GIT_COMMITTER_DATE='2026-10-18T00:00:00Z'
git commit-tree "$TREE" -p "$B" -m "release BK proof tree: ${B:0:12} with $# path(s) from ${S:0:12}"
