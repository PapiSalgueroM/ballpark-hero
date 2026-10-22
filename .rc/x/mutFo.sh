#!/usr/bin/env bash
# Reviewer mutation runner for Round 1537: mutate foHub.ts, build into a private dist, serve it on its own port,
# walk playFoHub (and its nofloor control) against it, run simNbaLuxuryTax on the mutated source, restore always.
# Usage: bash .rc/x/mutFo.sh <mode> <port>
MODE="$1"; PORT="$2"; D="/tmp/dm-$MODE"
restore() { git checkout -- src; [ -n "${SP:-}" ] && kill "$SP" 2>/dev/null; true; }
trap restore EXIT
node .rc/x/mutFo.mjs "$MODE" || exit 3
git diff --stat -- src | tail -1
node_modules/.bin/vite build --outDir "$D" --emptyOutDir > "/tmp/dm-$MODE-build.log" 2>&1 || { echo "mutFo.sh: build failed"; tail -20 "/tmp/dm-$MODE-build.log"; exit 4; }
node scripts/lib/hostLikeServer.mjs "$D" "$PORT" > /dev/null 2>&1 &
SP=$!
sleep 3
echo "=== playFoHub on the $MODE build"
BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT" ENGINES=chromium node scripts/playFoHub.mjs 2>&1 | grep -E "FAIL|NBA: (a short|the roster is topped|the roster box|an injury|a fit squad)|playFoHub"
W=${PIPESTATUS[0]}
echo "=== playFoHub nofloor on the $MODE build"
BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT" PLAY_FO_HUB_CONTROL=nofloor ENGINES=chromium node scripts/playFoHub.mjs 2>&1 | grep -E "FAIL|playFoHub"
N=${PIPESTATUS[0]}
echo "=== simNbaLuxuryTax on the $MODE source"
node scripts/simNbaLuxuryTax.mjs 2>&1 | grep -E "FAIL|^ +[0-9]+\. |\[6\]|simNbaLuxuryTax" | head -20
L=${PIPESTATUS[0]}
echo "MUTFO $MODE: playFoHub exit=$W, playFoHub-nofloor exit=$N, simNbaLuxuryTax exit=$L"
