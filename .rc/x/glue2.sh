#!/usr/bin/env bash
# Round 1342 fix, runner only: build the page with ONE reviewer mutation of the Dugout glue (m1 a real club, m10 a
# created club: confirmAndReset drops the setup), restore src at once, serve that build on its own port and run
# playCmNoSack against it. Exit 0 when the walk went RED on the mutated build (the walk catches the mutation),
# 1 when it stayed green (not caught), 2 when it could not run.
id="$1"; port="$2"
node .rc/x/mut.mjs "$id" || { git checkout -- src; echo "GLUE $id CANNOT RUN"; exit 2; }
npx vite build --outDir "/tmp/dist-$id" --emptyOutDir > "$TMPDIR/build-$id.log" 2>&1; b=$?
git checkout -- src
if [ "$b" -ne 0 ]; then tail -20 "$TMPDIR/build-$id.log"; echo "GLUE $id build failed"; exit 2; fi
node scripts/lib/hostLikeServer.mjs "/tmp/dist-$id" "$port" > "$TMPDIR/srv-$id.log" 2>&1 &
srv=$!
sleep 4
BASE="http://localhost:$port" SWEEP_BASE="http://localhost:$port" WIDTHS="${WIDTHS:-390}" node scripts/playCmNoSack.mjs > "$TMPDIR/play-$id.log" 2>&1; p=$?
kill "$srv" 2>/dev/null
grep -E "FAIL" "$TMPDIR/play-$id.log" | head -10
tail -3 "$TMPDIR/play-$id.log"
echo "GLUE $id: playCmNoSack exit=$p on the build with the mutation"
if [ "$p" -eq 1 ]; then echo "GLUE $id CAUGHT"; exit 0; fi
echo "GLUE $id NOT CAUGHT"
exit 1
