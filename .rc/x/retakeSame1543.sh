#!/usr/bin/env bash
# Round 1543 fixer, runner only, from the repo root: take the recording again from the pushed head
# with the note it already carries, and prove the file comes back byte for byte.
set -e
R="$PWD"
git worktree add /tmp/rw1543 HEAD
ln -s "$R/node_modules" /tmp/rw1543/node_modules
cd /tmp/rw1543
NOTE="$(node -p "JSON.parse(require('fs').readFileSync('scripts/data/allPlayersValueBaseline.json','utf8')).casesRetaken")"
node scripts/retakeTycoonHistories.mjs --write --note "$NOTE"
git diff --stat -- scripts/data/allPlayersValueBaseline.json
git diff --quiet -- scripts/data/allPlayersValueBaseline.json
echo "RETAKE BYTE IDENTICAL: the recording taken again from the pushed head equals the committed file"
