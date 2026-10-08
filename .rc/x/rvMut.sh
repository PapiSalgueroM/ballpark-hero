#!/usr/bin/env bash
# Reviewer's mutation run for Round 1115 (never committed): one mutation in its own scratch worktree on the runner,
# then the round's vitest file, simCareerSquad at gate size (controls off) and simClubSquads. Prints the three exit codes.
set -u
NAME="$1"; HERE="$PWD"
W="/tmp/mut-$NAME"
git worktree add -q --detach "$W" HEAD || { echo "worktree failed"; exit 2; }
cd "$W" || exit 2
ln -s "$HERE/node_modules" node_modules
node "$HERE/.rc/x/rvMutate.mjs" "$NAME" || { echo "MUTATION DID NOT APPLY"; exit 3; }
git diff --stat | tail -2
node_modules/.bin/vitest run src/lib/soccerClubSquad.test.ts --testTimeout=300000 --hookTimeout=120000 > "/tmp/mut-$NAME-vitest.log" 2>&1; V=$?
CAREER_SQUAD_NO_CONTROLS=1 node scripts/simCareerSquad.mjs > "/tmp/mut-$NAME-sim.log" 2>&1; S=$?
node scripts/simClubSquads.mjs > "/tmp/mut-$NAME-club.log" 2>&1; C=$?
echo "--- vitest"; sed 's/\x1b\[[0-9;]*m//g' "/tmp/mut-$NAME-vitest.log" | grep -E "FAIL|×|Tests |Test Files|AssertionError|expected" | cut -c1-220 | head -14
echo "--- simCareerSquad"; grep -E "FAIL|checks," "/tmp/mut-$NAME-sim.log" | cut -c1-240 | head -14; tail -2 "/tmp/mut-$NAME-sim.log" | cut -c1-200
echo "--- simClubSquads"; grep -E "FAIL|✗|failed" "/tmp/mut-$NAME-club.log" | cut -c1-200 | head -6; tail -2 "/tmp/mut-$NAME-club.log" | cut -c1-200
echo "MUT $NAME vitest=$V simCareerSquad=$S simClubSquads=$C"
