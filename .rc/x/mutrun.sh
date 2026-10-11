#!/usr/bin/env bash
# REVIEW-run Round 1306: one mutation in its own worktree (inside the repo, so node_modules resolves by walk-up),
# its own temp folder, then the round's own gates: the two unit files, the default fleet, the full fleet with the base.
# usage: bash .rc/x/mutrun.sh <mutation name> <base sha>
set -u
N="$1"; BASESHA="$2"
REPO="$PWD"
W="$REPO/rcw-$N"; B="$REPO/rcb-$N"; T="/tmp/rct-$N"
mkdir -p "$T" "$RC_OUT"
git worktree add -q "$W" HEAD || { echo "MUT $N: no worktree"; exit 9; }
git worktree add -q "$B" "$BASESHA" || { echo "MUT $N: no base worktree"; exit 9; }
cd "$W" || exit 9
node "$REPO/.rc/x/mut.mjs" "$N" || { echo "MUT $N: NOT APPLIED"; exit 9; }
git diff --stat | tail -2
export TMPDIR="$T"
node_modules/.bin/vitest run src/lib/clubManagerLeagueBook.test.ts src/lib/clubManagerLeagueBoards.test.ts --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/$N-vitest.log" 2>&1; v=$?
node scripts/simCmLeagueBook.mjs > "$RC_OUT/$N-default.log" 2>&1; d=$?
BOOK_BASE="$B" BOOK_FLEET=full node scripts/simCmLeagueBook.mjs > "$RC_OUT/$N-full.log" 2>&1; f=$?
echo "vitest tail: $(grep -E 'Tests |Test Files ' "$RC_OUT/$N-vitest.log" | tr '\n' ' ' | cut -c1-200)"
echo "default tail: $(tail -1 "$RC_OUT/$N-default.log" | cut -c1-300)"
echo "full tail: $(tail -1 "$RC_OUT/$N-full.log" | cut -c1-300)"
echo "MUT $N vitest=$v default=$d full=$f"
if [ "$v" = 0 ] && [ "$d" = 0 ] && [ "$f" = 0 ]; then echo "MUT $N SURVIVED: every gate green"; exit 0; fi
echo "MUT $N KILLED"; exit 1
