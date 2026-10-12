#!/usr/bin/env bash
# REVIEW-run Round 1306, second pass: one mutation in its own worktree inside the repo, its own temp folder.
# usage: bash .rc/x/mutrun2.sh <mutation name> <base sha> <mode: v | all>
#   v   the two unit files only (the first pass called a vitest path that does not exist in a nested worktree)
#   all the two unit files, the default fleet, the full fleet with the base
set -u
N="$1"; BASESHA="$2"; MODE="${3:-all}"
REPO="$PWD"
W="$REPO/rcw-$N"; B="$REPO/rcb-$N"; T="/tmp/rct-$N"
mkdir -p "$T" "$RC_OUT"
git worktree add -q "$W" HEAD || { echo "MUT $N: no worktree"; exit 9; }
cd "$W" || exit 9
ln -s "$REPO/node_modules" node_modules
node "$REPO/.rc/x/mut2.mjs" "$N" || { echo "MUT $N: NOT APPLIED"; exit 9; }
export TMPDIR="$T"
node_modules/.bin/vitest run src/lib/clubManagerLeagueBook.test.ts src/lib/clubManagerLeagueBoards.test.ts --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/$N-vitest.log" 2>&1; v=$?
echo "vitest tail: $(grep -E 'Tests |Test Files |FAIL|No test files' "$RC_OUT/$N-vitest.log" | head -6 | tr '\n' ' ' | cut -c1-420)"
if [ "$v" != 0 ] && [ "$v" != 1 ]; then echo "MUT $N: vitest did not run (exit $v)"; tail -3 "$RC_OUT/$N-vitest.log" | cut -c1-200; exit 9; fi
if [ "$MODE" = v ]; then
  echo "MUT $N vitest=$v"
  if [ "$v" = 0 ]; then echo "MUT $N: the unit files are GREEN under it"; exit 0; fi
  echo "MUT $N: the unit files are RED under it"; exit 1
fi
git worktree add -q "$B" "$BASESHA" || { echo "MUT $N: no base worktree"; exit 9; }
node scripts/simCmLeagueBook.mjs > "$RC_OUT/$N-default.log" 2>&1; d=$?
BOOK_BASE="$B" BOOK_FLEET=full node scripts/simCmLeagueBook.mjs > "$RC_OUT/$N-full.log" 2>&1; f=$?
echo "default tail: $(tail -1 "$RC_OUT/$N-default.log" | cut -c1-300)"
echo "full tail: $(tail -1 "$RC_OUT/$N-full.log" | cut -c1-300)"
echo "MUT $N vitest=$v default=$d full=$f"
if [ "$v" = 0 ] && [ "$d" = 0 ] && [ "$f" = 0 ]; then echo "MUT $N SURVIVED: every gate green"; exit 0; fi
echo "MUT $N KILLED (vitest=$v default=$d full=$f)"; exit 1
