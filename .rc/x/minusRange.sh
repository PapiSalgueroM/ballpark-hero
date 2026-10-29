#!/usr/bin/env bash
# Release BK kit: prints a commit whose tree is <at> with the non docs diff <from>..<to> reversed, so one round of a
# packet that came in with another (PR331 carries Round 1400 under 1414, PR329 carries 1407 under 1412, PR332 carries
# 1411 under 1415) can be taken back out of the joined tree and the earlier round proven on its own state. Parent <at>,
# fixed author and date, so the same input gives the same sha. Fails closed when the reverse does not apply once or
# touches anything but the range's own files.
# usage: M=$(bash .rc/x/minusRange.sh <at> <from> <to>) || exit 2
set -euo pipefail
AT=$(git rev-parse "$1^{commit}"); F=$(git rev-parse "$2^{commit}"); T=$(git rev-parse "$3^{commit}")
WANT=$(git diff --name-only "$F" "$T" -- . ':!docs' | sort)
test -n "$WANT" || { echo "minusRange: $F..$T changes nothing outside docs" >&2; exit 2; }
IDX=$(mktemp /tmp/minusrange-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$AT"
git diff --binary "$F" "$T" -- . ':!docs' | git apply --cached -R || { echo "minusRange: $F..$T does not reverse on $AT" >&2; rm -f "$IDX"; exit 2; }
TREE=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
GOT=$(git diff --name-only "$AT" "$TREE" | sort)
test "$GOT" = "$WANT" || { echo "minusRange: the reverse touched other files than the range's" >&2; exit 2; }
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-18T00:00:00Z' GIT_COMMITTER_DATE='2026-10-18T00:00:00Z'
git commit-tree "$TREE" -p "$AT" -m "release BK reference: ${AT:0:12} minus ${F:0:12}..${T:0:12}"
