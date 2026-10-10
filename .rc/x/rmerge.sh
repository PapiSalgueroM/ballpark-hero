#!/usr/bin/env bash
# Reviewer's merge forward check (Round 1228, the run lens). Runs on the GitHub runner only.
#   bash .rc/x/rmerge.sh <remote branch> <tag> <check> [<check> ...]
# Merges origin/<branch> into a scratch worktree of the round's head (HEAD^ of the request commit) and runs
# the named checks there, one after another. Exit 0 all green, 1 a check red, 2 could not merge.
set -u
R=$PWD
B=$1; TAG=$2; shift 2
D=/tmp/rm-$TAG
for k in 1 2 3 4 5 6; do git fetch -q origin "+refs/heads/$B:refs/remotes/origin/$B" && break; sleep 4; done
git rev-parse -q --verify "origin/$B" > /dev/null || { echo "origin/$B is not there"; exit 2; }
for k in 1 2 3 4 5 6; do git worktree add -q --detach "$D" HEAD^ && break; sleep 4; done
[ -d "$D/src" ] || { echo "no worktree"; exit 2; }
cd "$D" || exit 2
if ! git -c user.name=reviewer -c user.email=reviewer@example.invalid merge -q --no-edit "origin/$B" > "$RC_OUT/$TAG-merge.txt" 2>&1; then
  echo "MERGE CONFLICT with $B: $(git status --short | grep -E '^(UU|AA|DU|UD)' | tr '\n' ' ' | cut -c1-300)"
  exit 2
fi
ln -s "$R/node_modules" node_modules
echo "merged: round head $(git rev-parse --short HEAD^1) with origin/$B $(git rev-parse --short HEAD^2)"
rc=0
for check in "$@"; do
  case "$check" in
    sim) cmd="node scripts/simCmLeaguePhase.mjs" ;;
    tsc) cmd="node_modules/.bin/tsc --noEmit -p tsconfig.app.json" ;;
    vitest) cmd="node_modules/.bin/vitest run src/lib/leagueSlate.test.ts src/lib/uclLeaguePhase.test.ts --testTimeout=300000 --hookTimeout=120000" ;;
    anchors) cmd="node scripts/simHarnessAnchors.mjs" ;;
    rivals) cmd="node scripts/simNoRivalNames.mjs" ;;
    scores) cmd="node scripts/simLiveScores.mjs" ;;
    dailies) cmd="node scripts/simDailyDeals.mjs" ;;
    quotes) cmd="node scripts/simNoInventedQuotes.mjs" ;;
    theirs) cmd="node scripts/simManagerUclLeague.mjs" ;;
    *) echo "unknown check $check"; rc=1; continue ;;
  esac
  s=$(date +%s)
  $cmd > "$RC_OUT/$TAG-$check.txt" 2>&1
  e=$?
  echo "$TAG $check exit=$e $(( $(date +%s) - s ))s | $(sed 's/\x1b\[[0-9;]*m//g' "$RC_OUT/$TAG-$check.txt" | grep -v '^\s*$' | tail -1 | cut -c1-200)"
  [ $e -ne 0 ] && rc=1
done
echo "$TAG: $([ $rc -eq 0 ] && echo ALL GREEN || echo A CHECK IS RED)"
exit $rc
