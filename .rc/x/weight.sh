#!/usr/bin/env bash
# Reviewer scratch (Round 1051, runner lens). Travels as .rc/x/weight.sh. Builds the base the branch last merged
# (the merge base with origin/release-al-int) beside the branch's own build and weighs the four routes on both.
set -u
B=$(git merge-base HEAD origin/release-al-int)
echo "base commit $B ($(git log -1 --format=%s "$B" | cut -c1-80))"
git worktree add -f --detach /tmp/rcbase "$B" > /tmp/wt.log 2>&1 || { cat /tmp/wt.log; echo "WEIGHT: no base worktree"; exit 2; }
ln -s "$PWD/node_modules" /tmp/rcbase/node_modules
( cd /tmp/rcbase && node_modules/.bin/vite build > /tmp/build-base.log 2>&1 ) || { tail -20 /tmp/build-base.log; echo "WEIGHT: the base build failed"; exit 3; }
node scripts/lib/hostLikeServer.mjs /tmp/rcbase/dist 4174 > /tmp/server-base.log 2>&1 &
SP=$!
sleep 4
node .rc/x/weight4.mjs http://localhost:4174 /tmp/rcbase/dist base > /tmp/w-base.log 2>&1; RB=$?
node .rc/x/weight4.mjs http://localhost:4173 dist head > /tmp/w-head.log 2>&1; RH=$?
kill "$SP" 2>/dev/null
cat /tmp/w-base.log /tmp/w-head.log
echo "exit base=$RB head=$RH | $(tail -1 /tmp/w-base.log) || $(tail -1 /tmp/w-head.log)"
