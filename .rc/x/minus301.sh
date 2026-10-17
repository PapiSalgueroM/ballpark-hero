#!/usr/bin/env bash
# Round BII kit (Release BI, part three): prints a commit that is <ref> (default HEAD) with exactly PR301's method
# change taken out: scripts/simClubManagerDecisions.mjs and scripts/qa/managerDecisionRegression1081.mjs back to their
# text before PR301 (main e814c2de's, which this branch kept until the m18 merge) and, in the Round 1081 manifest, PR301's
# harness pin 3383d016 put back to the old 5b3ee496 with every other value (the core pins this release retook) kept.
# PR301's workflow binds METHOD_BASE and asserts that the tree's manifest is the base's with only that one pin swapped,
# that src and public equal the base, and that scripts equal it outside its three files; its own default 6f6b81b0 is an
# old Round 1344 commit. At the m18 merge the head before PR301 (57d82b0a) is the honest base; on the final tree, after
# the pin retake, this synthetic one is. Fails closed when the new pin does not stand exactly once or the two scripts
# are not PR301's. Fixed names and dates, so the same input gives the same sha.
# usage: B=$(bash .rc/x/minus301.sh [ref]) || exit 2
set -euo pipefail
# On a remote check HEAD is the throwaway "rc request <name> for <sha>" commit (it adds .rc/ and the runner's
# workflow); the default ref is the branch head it names, so the base never carries those two.
DEF=HEAD; SUBJ=$(git log -1 --format=%s HEAD)
case "$SUBJ" in "rc request "*" for "*) DEF=${SUBJ##* for } ;; esac
R=$(git rev-parse "${1:-$DEF}^{commit}")
OLD=5b3ee496e6e6a0faf3e1a72ad84b3bdc87c477c7874ee2ea4b2eee32236229d8
NEW=3383d016a113028328151586b75eab51e6fe59cd8bb2c466137ffcd269a787ca
M=scripts/fixtures/managerAppealIsolation1081/manifest.json
S1=scripts/simClubManagerDecisions.mjs
S2=scripts/qa/managerDecisionRegression1081.mjs
PRE=e814c2def671e07bd6163462dff8ab1230be2000
test "$(git rev-parse "$R:$S1")" = "$(git rev-parse 4508500ec5a5a9dcf729ab892fdb34aff210a8df:$S1)" || { echo "minus301: $S1 is not PR301's on $R" >&2; exit 2; }
test "$(git rev-parse "$R:$S2")" = "$(git rev-parse 4508500ec5a5a9dcf729ab892fdb34aff210a8df:$S2)" || { echo "minus301: $S2 is not PR301's on $R" >&2; exit 2; }
TEXT=$(git show "$R:$M"; echo x); TEXT=${TEXT%x}
N=$(printf '%s' "$TEXT" | grep -o "$NEW" | wc -l)
[ "$N" = 1 ] || { echo "minus301: the new harness pin stands $N times in $M" >&2; exit 2; }
BLOB=$(printf '%s' "${TEXT/$NEW/$OLD}" | git hash-object -w --stdin)
IDX=$(mktemp /tmp/minus301-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git update-index --cacheinfo "100644,$BLOB,$M"
git update-index --cacheinfo "100644,$(git rev-parse "$PRE:$S1"),$S1"
git update-index --cacheinfo "100644,$(git rev-parse "$PRE:$S2"),$S2"
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test "$(git diff --name-only "$R" "$T" | LC_ALL=C sort | tr '\n' ' ')" = "$M $S2 $S1 "
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$R without PR301's method change (its two scripts at e814c2de, the harness pin back to 5b3ee496)" | git commit-tree "$T" -p "$R"
