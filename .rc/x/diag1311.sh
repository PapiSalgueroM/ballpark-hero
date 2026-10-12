#!/usr/bin/env bash
# Reviewer facts-screens-weight, Release AZ. Never committed. On a runner: a throwaway worktree of HEAD takes
# Round 1311's change to scripts/simClubManagerSlots.mjs (its BUDGET line and comment, origin/r1311-cm-league-boards
# against origin/main), commits it locally (never pushed), and runs scripts/qa/managerWorldSizeDiagnostic.mjs,
# the serial gate line this leg adds and the body of manager-world-size-diagnostic.yml.
set -u
ROOT=$PWD
git worktree add -f /tmp/wd HEAD > /dev/null 2>&1 || { echo "ABORT worktree"; exit 2; }
ln -s "$ROOT/node_modules" /tmp/wd/node_modules
cd /tmp/wd
git apply "$ROOT/.rc/x/r1311-slots.patch" || { echo "ABORT the Round 1311 patch does not apply"; exit 2; }
grep -n "const BUDGET = " scripts/simClubManagerSlots.mjs
git -c user.name=reviewer -c user.email=reviewer@example.invalid commit -qam "trial: Round 1311 Slots budget on Release AZ" || { echo "ABORT commit"; exit 2; }
timeout 900 node scripts/qa/managerWorldSizeDiagnostic.mjs > /tmp/diag.log 2>&1
s=$?
grep -n "AssertionError\|Error\|assert" /tmp/diag.log | head -8
tail -6 /tmp/diag.log
echo "managerWorldSizeDiagnostic with Round 1311's Slots budget: exit $s"
exit $s
