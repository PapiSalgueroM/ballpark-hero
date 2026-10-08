#!/usr/bin/env bash
# Reviewer only, on the runner: what this round's FINAL harness says once the other lane's create path repair
# (Round 1096, origin/codex/soccer-create-translation-1096) sits on top of the guard. Read only: two src files are
# taken from that branch into the runner's throwaway checkout, nothing is committed anywhere.
KEEP="$RC_OUT"
git fetch --depth=60 origin codex/soccer-create-translation-1096 > /dev/null 2>&1 || { echo "fetch failed"; exit 9; }
echo "codex head: $(git log -1 --format='%h %s' FETCH_HEAD | cut -c1-90)"
git checkout FETCH_HEAD -- src/components/FlagImg.tsx src/pages/SoccerCareer.tsx || { echo "checkout failed"; exit 9; }
git diff --cached --stat | tail -3
npm run build > "$KEEP/codex-build.log" 2>&1
echo "build=$?"
unset RC_OUT
SHOTS="$KEEP/codex-shots" ONLY=/soccer-career ENGINES=chromium node scripts/playTranslatedPage.mjs > "$KEEP/codex-plain.log" 2>&1
P=$?
ONLY=/soccer-career PLAY_TRANSLATED_CONTROL=noguard ENGINES=chromium node scripts/playTranslatedPage.mjs > "$KEEP/codex-noguard.log" 2>&1
G=$?
echo "--- plain"; grep -E 'FAIL|checks,|GUARD WAS NEEDED|nationality "' "$KEEP/codex-plain.log" | cut -c1-300 | head -24
echo "--- noguard"; grep -E 'control "noguard"|checks,' "$KEEP/codex-noguard.log" | cut -c1-300 | head -12
echo "CODEX1096 plain=$P noguard=$G"
