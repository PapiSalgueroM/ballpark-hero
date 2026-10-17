#!/usr/bin/env bash
# Round BII kit (Release BI, part three): prints a commit that is <ref> (default HEAD) with exactly ONE phone packet's
# change taken out of src/lib/soccerPhone.ts and nothing else, for that packet's original source control on a tree where
# the other phone packet joined beside it:
#   289: PR289's four season budget assignments in ensurePhone (d4f2c6f6..09604883)
#   297: PR297's container copies in ensurePhone (c40ea5d8..1c4d27d6)
# Each packet's harness takes the original phone from its BASE and holds the engine and save to BASE, so after both
# joined, PR289's control must remove only the four budget lines and keep PR297's copies (the packet's own recipe), and
# PR297's keeps the budget lines. Fails closed when the reverse patch does not apply once or touches anything but the
# phone. Fixed names and dates, so the same input gives the same sha.
# usage: B=$(bash .rc/x/phoneMinus.sh 289 [ref]) || exit 2
set -euo pipefail
case "$1" in
  289) A=d4f2c6f688d656205722ba52bbdb33f03490966a; Z=09604883d13b59bb718d0c6a5a8cb8cae85b6894 ;;
  297) A=c40ea5d85734915f7f0d9a5a155615267640eb80; Z=1c4d27d66092091aee0c2086616545d44725e81a ;;
  *) echo "phoneMinus: packet 289 or 297" >&2; exit 2 ;;
esac
# On a remote check HEAD is the throwaway "rc request <name> for <sha>" commit (it adds .rc/ and the runner's
# workflow); the default ref is the branch head it names, so the base never carries those two.
DEF=HEAD; SUBJ=$(git log -1 --format=%s HEAD)
case "$SUBJ" in "rc request "*" for "*) DEF=${SUBJ##* for } ;; esac
R=$(git rev-parse "${2:-$DEF}^{commit}")
F=src/lib/soccerPhone.ts
IDX=$(mktemp /tmp/phoneminus-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff "$A" "$Z" -- "$F" | git apply --cached -R || { echo "phoneMinus: PR$1's phone patch does not reverse once on $R" >&2; rm -f "$IDX"; exit 2; }
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test "$(git diff --name-only "$R" "$T")" = "$F"
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$R without PR$1's phone change (${A:0:8}..${Z:0:8}, soccerPhone.ts only)" | git commit-tree "$T" -p "$R"
