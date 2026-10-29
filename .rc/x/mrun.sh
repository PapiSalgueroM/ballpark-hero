#!/usr/bin/env bash
# Reviewer mutation runner (Round 1584). bash .rc/x/mrun.sh <mutation id> <0|1 also run the PGlite rehearsal>
# Applies the mutation in a throwaway worktree of HEAD, runs simClubNamesakes (and the rehearsal), restores nothing
# in the main checkout (the worktree is thrown away). Last line: MUT <id> sim=<exit> rehearse=<exit or skip>.
id="$1"; rh="$2"; R="$PWD"; W="/tmp/mut-$id"
git worktree add -q "$W" HEAD || { echo "MUT $id ABORT: worktree"; exit 3; }
ln -s "$R/node_modules" "$W/node_modules"
cd "$W" || exit 3
node "$R/.rc/x/mut.mjs" "$id" || { echo "MUT $id ABORT: anchor"; exit 3; }
git diff --stat | tail -3
node scripts/simClubNamesakes.mjs > "/tmp/mut-$id-sim.log" 2>&1; a=$?
grep -E "FAIL|green|finding|ABORT" "/tmp/mut-$id-sim.log" | head -8
b=skip
if [ "$rh" = "1" ]; then
  npm install --prefix "/tmp/pgl-$id" @electric-sql/pglite >/dev/null 2>&1
  PGLITE_DIR="/tmp/pgl-$id" node scripts/qa/rehearseClubNamesakes1584.mjs > "/tmp/mut-$id-rh.log" 2>&1; b=$?
  grep -E "FAIL|green|finding|ABORT" "/tmp/mut-$id-rh.log" | head -8
fi
echo "MUT $id sim=$a rehearse=$b"
if [ "$a" = "0" ] && { [ "$b" = "0" ] || [ "$b" = "skip" ]; }; then exit 0; fi
exit 1
