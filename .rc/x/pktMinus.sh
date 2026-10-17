#!/usr/bin/env bash
# Round BJG kit (Release BJ): prints a commit that is <ref> (default the branch head a remote check names) with exactly
# ONE urgent packet's product lines reversed and nothing else, the full tree original reference the packets' recipe
# asks for (2026-10-16/URGENT-305-306-INTEGRATION-RECIPE.md, "Rebind proof to the actual joined tree"):
#   305: PR305's four CreationScreen spans in src/pages/SoccerCareer.tsx (18234788..27a39d32)
#   306: PR306's two busy lines in src/hooks/useLineupBuilder.ts (cb750990..439a23dd)
# Everything else (the other packet, the release's rounds, the engine) stays as the joined tree has it. Fails closed
# when the reverse patch does not apply once or touches anything but that one file. Fixed names and dates, so the same
# input gives the same sha.
# usage: B=$(bash .rc/x/pktMinus.sh 305 [ref]) || exit 2
set -euo pipefail
case "$1" in
  305) A=1823478805186fcd037d5f6b3145513a273aa4fb; Z=27a39d322a586c228efade30e26232b05eb4f127; F=src/pages/SoccerCareer.tsx ;;
  306) A=cb7509907ca84af9bf85f99f10e67990805edb4c; Z=439a23dd445f5dd24d096f5e967c4caab257c816; F=src/hooks/useLineupBuilder.ts ;;
  *) echo "pktMinus: packet 305 or 306" >&2; exit 2 ;;
esac
DEF=HEAD; SUBJ=$(git log -1 --format=%s HEAD)
case "$SUBJ" in "rc request "*" for "*) DEF=${SUBJ##* for } ;; esac
R=$(git rev-parse "${2:-$DEF}^{commit}")
test "$(git diff --name-only "$A" "$Z" -- src)" = "$F" || { echo "pktMinus: PR$1's product diff is not $F alone" >&2; exit 2; }
IDX=$(mktemp /tmp/pktminus-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff "$A" "$Z" -- "$F" | git apply --cached -R || { echo "pktMinus: PR$1's product lines do not reverse once on $R" >&2; rm -f "$IDX"; exit 2; }
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test "$(git diff --name-only "$R" "$T")" = "$F"
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-17T00:00:00Z' GIT_COMMITTER_DATE='2026-10-17T00:00:00Z'
echo "$R without PR$1's product lines (${A:0:8}..${Z:0:8}, $F only)" | git commit-tree "$T" -p "$R"
