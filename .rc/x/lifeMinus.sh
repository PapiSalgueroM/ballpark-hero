#!/usr/bin/env bash
# Round BII kit (Release BI, part three): prints a commit that is <ref> (default HEAD) with exactly ONE queued Life
# packet's conditions taken out of src/lib/soccerCareerLife.ts and nothing else, for that packet's original source
# control on a tree where later Life packets joined beside it:
#   286: PR286's eleven popularity conditions (44fb1611..320cd845)   302: PR302's four money conditions (75abee82..616ddc0b)
# Each packet's gate harness takes the original Life from its BASE and holds the engine, save, chance wheel and routine
# events to BASE, so BASE must be the joined tree with only that packet's conditions removed: the 286 control keeps
# PR302's four, the 302 control keeps PR286's eleven, and PR280's captions stay in both. Fails closed when the reverse
# patch does not apply once or touches anything but Life. Fixed names and dates, so the same input gives the same sha.
# usage: B=$(bash .rc/x/lifeMinus.sh 286 [ref]) || exit 2
set -euo pipefail
case "$1" in
  286) A=44fb161111c722d028f0c9e46771d008b74ca742; Z=320cd84554207b840c85543a190eaeaa8c10c2eb ;;
  302) A=75abee825b73c34b4a7a6d6852de1417a20cc8aa; Z=616ddc0b44666799676a60405181fdeb33112fa4 ;;
  *) echo "lifeMinus: packet 286 or 302" >&2; exit 2 ;;
esac
R=$(git rev-parse "${2:-HEAD}^{commit}")
F=src/lib/soccerCareerLife.ts
IDX=$(mktemp /tmp/lifeminus-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$R"
git diff "$A" "$Z" -- "$F" | git apply --cached -R || { echo "lifeMinus: PR$1's Life patch does not reverse once on $R" >&2; rm -f "$IDX"; exit 2; }
T=$(git write-tree)
rm -f "$IDX"
unset GIT_INDEX_FILE
test "$(git diff --name-only "$R" "$T")" = "$F"
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-16T00:00:00Z' GIT_COMMITTER_DATE='2026-10-16T00:00:00Z'
echo "$R without PR$1's Life conditions (${A:0:8}..${Z:0:8}, soccerCareerLife.ts only)" | git commit-tree "$T" -p "$R"
