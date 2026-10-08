#!/usr/bin/env bash
# Reviewer scratch (Round 1051, runner lens). Travels as .rc/x/base3.sh, serial only.
# "Is this red mine?": the three harnesses that came back red on the branch, run the same way on the BASE the
# branch last merged (the merge base with origin/release-al-int), built and served beside the branch's build.
set -u
B=$(git merge-base HEAD origin/release-al-int)
echo "base commit $B"
git worktree add -f --detach /tmp/rcbase "$B" > /tmp/wt.log 2>&1 || { cat /tmp/wt.log; echo "BASE3: no base worktree"; exit 2; }
ln -s "$PWD/node_modules" /tmp/rcbase/node_modules
cd /tmp/rcbase || exit 2
node_modules/.bin/vite build > /tmp/build-base.log 2>&1 || { tail -20 /tmp/build-base.log; echo "BASE3: the base build failed"; exit 3; }
node scripts/lib/hostLikeServer.mjs dist 4174 > /tmp/server-base.log 2>&1 &
SP=$!
sleep 4
SUM=""
for h in playCareerPress simWritesAreSent simDailySaveHardening; do
  BASE=http://localhost:4174 SWEEP_BASE=http://localhost:4174 node "scripts/$h.mjs" > "/tmp/base-$h.log" 2>&1; R=$?
  echo "== BASE $h exit=$R"
  grep -a "FAIL" "/tmp/base-$h.log" | cut -c1-240 | head -6
  grep -a -v '^\s*$' "/tmp/base-$h.log" | tail -1 | cut -c1-200
  SUM="$SUM $h=$R"
done
kill "$SP" 2>/dev/null
echo "BASE3 on $B:$SUM"
