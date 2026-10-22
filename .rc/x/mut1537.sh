#!/usr/bin/env bash
# Fixer mutation runner for Round 1537: mutate src, run the new vitest on the mutated source, build into a
# private dist, serve it on its own port, walk playFoHub against it, restore src always.
# Usage: bash .rc/x/mut1537.sh <mode> <port>
MODE="$1"; PORT="$2"; D="/tmp/dm-$MODE"
restore() { git checkout -- src; [ -n "${SP:-}" ] && kill "$SP" 2>/dev/null; true; }
trap restore EXIT
node .rc/x/mut1537.mjs "$MODE" || exit 3
git diff --stat -- src | tail -1
echo "=== vitest NbaRosterBoxTipOff on the $MODE source"
node_modules/.bin/vitest run src/components/nba-front-office/NbaRosterBoxTipOff.test.tsx --testTimeout=300000 --hookTimeout=120000 2>&1 | grep -E "✓|×|FAIL|Tests |AssertionError" | head -20
V=${PIPESTATUS[0]}
node_modules/.bin/vite build --outDir "$D" --emptyOutDir > "/tmp/dm-$MODE-build.log" 2>&1 || { echo "mut1537.sh: build failed"; tail -20 "/tmp/dm-$MODE-build.log"; exit 4; }
node scripts/lib/hostLikeServer.mjs "$D" "$PORT" > /dev/null 2>&1 &
SP=$!
sleep 3
echo "=== playFoHub on the $MODE build"
BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT" ENGINES=chromium node scripts/playFoHub.mjs 2>&1 | grep -E "FAIL|NBA: (a short|a roster one|the roster is topped|the roster box|an injury|a fit squad|round 1|one man|after tip off)|playFoHub"
W=${PIPESTATUS[0]}
echo "MUT1537 $MODE: vitest exit=$V, playFoHub exit=$W"
