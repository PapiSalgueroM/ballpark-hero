#!/usr/bin/env bash
# Round BII kit (Release BI, part three): prints a commit that is <ref> (default HEAD) with exactly PR287's two
# `decisions: undefined` fields taken out of src/lib/clubManagerCalendar.ts (git diff d4f2c6f6 4d4f7095 on that file,
# applied in reverse) and nothing else. simCmHandoverDesk binds CM_HANDOVER_BASE: its whole calendar must equal the
# base's with the two fields removed, and its workflow's bind step holds every other src, scripts and workflow byte to
# the base. At the m14 merge the recorded head before PR287 (5a8acc15) is that base; on a later tree (the final head)
# this synthetic one is, because the packets joined after PR287 change src and scripts the bind step would otherwise
# count against PR287. Rounds 1335 and 1344's calendar lines stay. Fails closed when the reverse patch does not apply
# once or touches anything but the calendar. Fixed names and dates, so the same input gives the same sha.
# usage: B=$(bash .rc/x/minus287.sh [ref]) || exit 2
set -euo pipefail
A=d4f2c6f688d656205722ba52bbdb33f03490966a; Z=4d4f709592921128ed6867c4126adbe864785ad5
# On a remote check HEAD is the throwaway "rc request <name> for <sha>" commit (it adds .rc/ and the runner's
# workflow); the default ref is the branch head it names, so the base never carries those two.
DEF=HEAD; SUBJ=$(git log -1 --format=%s HEAD)
case "$SUBJ" in "rc request "*" for "*) DEF=${SUBJ##* for } ;; esac
R=$(git rev-parse "${1:-$DEF}^{commit}")
F=src/lib/clubManagerCalendar.ts
IDX=$(mktemp /tmp/minus287-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff "$A" "$Z" -- "$F" | git apply --cached -R || { echo "minus287: PR287's calendar patch does not reverse once on $R" >&2; rm -f "$IDX"; exit 2; }
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test "$(git diff --name-only "$R" "$T")" = "$F"
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$R without PR287's two desk clearing fields (d4f2c6f6..4d4f7095, clubManagerCalendar.ts only)" | git commit-tree "$T" -p "$R"
