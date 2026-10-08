#!/usr/bin/env bash
# Release AM fixer pass 2: the Round 1084 native driver on the branch head, in a throwaway checkout on the
# runner, with the scratch probe uspatch.mjs applied to the driver copy there (nothing is committed).
#   bash .rc/x/uspatched.sh <label> <measure|throttle>
set -u
LABEL="$1"; MODE="$2"
HERE="$PWD"
W="$RUNNER_TEMP/wt-$LABEL"
git worktree add -f --detach "$W" HEAD^ > "$RUNNER_TEMP/wt-$LABEL.log" 2>&1 || { cat "$RUNNER_TEMP/wt-$LABEL.log"; echo "uspatched $LABEL: no checkout"; exit 92; }
ln -s "$HERE/node_modules" "$W/node_modules"
cp -r "$HERE/dist" "$W/dist"
cd "$W" || exit 92
node "$HERE/.rc/x/uspatch.mjs" "$MODE" scripts/qa/usCareerSaveRecovery1084.mjs || { echo "uspatched $LABEL: the probe did not apply"; exit 94; }
bash "$HERE/.rc/x/usdiag.sh" "$LABEL"
