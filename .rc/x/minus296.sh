#!/usr/bin/env bash
# Round BII kit (Release BI, part three): prints a commit that is <ref> (default HEAD) with exactly PR296's
# TransferScreen change taken out (git diff 7c483867 55237412 -- TransferScreen.tsx, applied in reverse) and nothing
# else. PR296's workflow binds CM_DESK_FEEDBACK_BASE (its own default 7c483867, PR284's head) and its bind step holds
# every src byte but TransferScreen.tsx to that base. At the m10 merge the head before PR296 (f85b1dd5) is that base;
# on a later tree (the final head) this synthetic one is, because later packets change other src files. Fails closed
# when the reverse patch does not apply once. Fixed names and dates, so the same ref always gives the same sha.
# usage: R=$(bash .rc/x/minus296.sh [ref]) || exit 2
set -euo pipefail
# On a remote check HEAD is the throwaway "rc request <name> for <sha>" commit (it adds .rc/ and the runner's
# workflow); the default ref is the branch head it names, so the base never carries those two.
DEF=HEAD; SUBJ=$(git log -1 --format=%s HEAD)
case "$SUBJ" in "rc request "*" for "*) DEF=${SUBJ##* for } ;; esac
R=$(git rev-parse "${1:-$DEF}^{commit}")
F=src/components/club-manager/TransferScreen.tsx
IDX=$(mktemp /tmp/minus296-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff 7c4838670253f2ca95af2adf14c2397d66b4f7c9 55237412159466f35ee1f2cea38e305caeca4a03 -- "$F" | git apply --cached -R
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test "$(git diff --name-only "$R" "$T")" = "$F"
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$R without PR296's TransferScreen change (7c483867..55237412, TransferScreen.tsx only)" | git commit-tree "$T" -p "$R"
