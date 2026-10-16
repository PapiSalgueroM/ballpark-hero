#!/usr/bin/env bash
# Reviewer mutation m1 on a BUILT page (runner only): confirmAndReset drops the Dugout's setup for a real club.
# Builds a second dist from the mutated tree, restores src at once, serves it on 4180, runs the builder's walk and
# the reviewer's walk (flow A at 390, reduced motion on) against it. Prints one GLUE line with both exit codes.
node .rc/x/mut.mjs m1 || exit 2
npx vite build --outDir /tmp/distG --emptyOutDir > "$TMPDIR/build.log" 2>&1; b=$?
git checkout -- src
if [ "$b" -ne 0 ]; then tail -20 "$TMPDIR/build.log"; echo "GLUE build failed"; exit 2; fi
node scripts/lib/hostLikeServer.mjs /tmp/distG 4180 > "$TMPDIR/srv.log" 2>&1 &
srv=$!
sleep 4
BASE=http://localhost:4180 SWEEP_BASE=http://localhost:4180 node scripts/playCmNoSack.mjs > "$TMPDIR/play.log" 2>&1; p=$?
echo "---- builder walk playCmNoSack on the mutated build: exit $p"
grep -E "FAIL" "$TMPDIR/play.log" | head -8
tail -2 "$TMPDIR/play.log"
BASE=http://localhost:4180 FLOWS=A CFG=390rm node .rc/x/walkNoSack.mjs > "$TMPDIR/walk.log" 2>&1; w=$?
echo "---- reviewer walk flow A at 390 on the mutated build: exit $w"
grep -E "FAIL" "$TMPDIR/walk.log" | head -8
tail -2 "$TMPDIR/walk.log"
kill "$srv" 2>/dev/null
echo "GLUE m1 (confirmAndReset drops setup): builder playCmNoSack exit=$p, reviewer walk exit=$w"
if [ "$p" -eq 0 ] && [ "$w" -ne 0 ]; then exit 0; fi
exit 1
