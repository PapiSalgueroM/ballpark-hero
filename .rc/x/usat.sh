#!/usr/bin/env bash
# Release AM fixer pass 2: run the Round 1084 native driver on ANOTHER commit, in a throwaway checkout on the
# runner, to learn whether a red on the head is older than the head.
#   bash .rc/x/usat.sh <label> <commit or ref>
set -u
LABEL="$1"; REF="$2"
HERE="$PWD"
W="$RUNNER_TEMP/wt-$LABEL"
git worktree add -f --detach "$W" "$REF" > "$RUNNER_TEMP/wt-$LABEL.log" 2>&1 || { cat "$RUNNER_TEMP/wt-$LABEL.log"; echo "usat $LABEL: no checkout of $REF"; exit 92; }
ln -s "$HERE/node_modules" "$W/node_modules"

cd "$W" || exit 92
npm run build > "$RUNNER_TEMP/build-$LABEL.log" 2>&1 || { tail -20 "$RUNNER_TEMP/build-$LABEL.log" | cut -c1-400; echo "usat $LABEL: build failed"; exit 93; }
bash "$HERE/.rc/x/usdiag.sh" "$LABEL"
