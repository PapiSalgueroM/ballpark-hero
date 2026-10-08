#!/usr/bin/env bash
# Reviewer only, runs on the GitHub runner: one guard mutation, then the unit tests and the harness against it.
# usage: bash .rc/x/mut.sh <name>      (the mutated file is .rc/x/guard-<name>.ts)
N="$1"
KEEP="$RC_OUT"
mkdir -p "$KEEP"
cp src/lib/translateGuard.ts /tmp/guard-orig.ts
cp ".rc/x/guard-$N.ts" src/lib/translateGuard.ts
node_modules/.bin/vitest run src/test/translateGuard.test.tsx --testTimeout=300000 --hookTimeout=120000 > "$KEEP/$N-vitest.log" 2>&1; V=$?
npm run build > "$KEEP/$N-build.log" 2>&1; B=$?
unset RC_OUT
ONLY=/soccer-career,/club-manager ENGINES=chromium node scripts/playTranslatedPage.mjs > "$KEEP/$N-plain.log" 2>&1; P=$?
PLAY_TRANSLATED_CONTROL=notranslate ONLY=/soccer-career,/club-manager ENGINES=chromium node scripts/playTranslatedPage.mjs > "$KEEP/$N-notranslate.log" 2>&1; T=$?
cp /tmp/guard-orig.ts src/lib/translateGuard.ts
echo "--- vitest"; grep -E 'Tests|FAIL|✓|×' "$KEEP/$N-vitest.log" | tail -16
echo "--- plain"; grep -E 'FAIL|checks,' "$KEEP/$N-plain.log" | cut -c1-220 | head -30
echo "--- notranslate"; grep -E 'FAIL|checks,' "$KEEP/$N-notranslate.log" | cut -c1-220 | head -20
echo "MUT $N vitest=$V build=$B plain=$P notranslate=$T"
