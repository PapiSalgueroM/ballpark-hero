#!/usr/bin/env bash
# Reviewer only, runs on the runner (serial). Applies ONE mutated copy, runs the round's checks, restores.
#   mutrun.sh <mutation basename> <dest path> <unit|both> [port] [ONLY] [MODES]
set -u
M=".rc/x/$1"; DEST="$2"; KIND="$3"; PORT="${4:-4301}"; ONLY_R="${5:-/}"; MODES_R="${6:-blocked,full}"
[ -f "$M" ] || { echo "MUT $1 missing file"; exit 9; }
KEEP="$RUNNER_TEMP/orig-$1"
cp "$DEST" "$KEEP"
cp "$M" "$DEST"
echo "== applied $1 to $DEST: $(git diff --shortstat -- "$DEST")"
git diff -- "$DEST" | grep -E '^[+-][^+-]' | cut -c1-200

node_modules/.bin/vitest run src/test/safeStorage.test.ts src/test/supabaseClientBlockedStorage.test.ts src/test/cookieConsentStorage.test.tsx src/test/storageBlockedBoot.test.tsx src/test/freshBuildBlockedStorage.test.ts --testTimeout=300000 --hookTimeout=120000 > "$RUNNER_TEMP/v-$1.log" 2>&1
V=$?
sed 's/\x1b\[[0-9;]*m//g' "$RUNNER_TEMP/v-$1.log" | grep -E "FAIL|✓|×|Tests |Test Files " | head -30 | cut -c1-220
node scripts/simStorageWrites.mjs > "$RUNNER_TEMP/s-$1.log" 2>&1
S=$?
grep -E "FAIL" "$RUNNER_TEMP/s-$1.log" | head -5 | cut -c1-220
node scripts/simStaleChunk.mjs > "$RUNNER_TEMP/c-$1.log" 2>&1
C=$?
grep -E "FAIL|red" "$RUNNER_TEMP/c-$1.log" | head -5 | cut -c1-220

P=skip
if [ "$KIND" = both ]; then
  OUTD="$RUNNER_TEMP/dist-$1"
  if node_modules/.bin/vite build --outDir "$OUTD" --emptyOutDir > "$RUNNER_TEMP/b-$1.log" 2>&1; then
    node scripts/lib/hostLikeServer.mjs "$OUTD" "$PORT" > /dev/null 2>&1 &
    SP=$!
    sleep 4
    BASE="http://localhost:$PORT" SWEEP_BASE="http://localhost:$PORT" ONLY="$ONLY_R" MODES="$MODES_R" PLAY_STORAGE_NATIVE=off \
      node scripts/playStorageBlocked.mjs > "$RUNNER_TEMP/p-$1.log" 2>&1
    P=$?
    grep -E "FAIL|checks," "$RUNNER_TEMP/p-$1.log" | head -40 | cut -c1-260
    kill "$SP" 2>/dev/null
  else
    P=buildfailed
    tail -8 "$RUNNER_TEMP/b-$1.log" | cut -c1-200
  fi
fi
cp "$KEEP" "$DEST"
echo "restored: $(git status --short -- src scripts | wc -l) changed files left"
echo "MUT $1 vitest=$V ssw=$S staleChunk=$C play=$P"
exit 0
