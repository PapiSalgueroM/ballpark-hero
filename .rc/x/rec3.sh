#!/usr/bin/env bash
# rec3.sh (fixer scratch, Round 1103, never committed). Runs on the GitHub runner from the repo root.
# Two recordings the lead's ruling asks for, each in its own checkout of the branch's REAL head (HEAD^ here: the
# runner's HEAD is the throwaway request commit), so the other request lines keep reading the committed files.
#   usage: bash .rc/x/rec3.sh deckc|board
set -u
MODE="$1"
REPO="$PWD"
D="$(mktemp -d)"
REAL="$(git rev-parse HEAD^)"
git worktree add --detach "$D/tree" "$REAL" > /dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$REPO/node_modules" "$D/tree/node_modules"
cd "$D/tree" || exit 2
mkdir -p "$RC_OUT" "$D/tmp"
export TMPDIR="$D/tmp" TEMP="$D/tmp" TMP="$D/tmp"
echo "recording $MODE on $REAL"

if [ "$MODE" = "deckc" ]; then
  F=scripts/data/usCareerDeckCDigest.json
  cp "$F" "$D/before.json"
  echo "== before: the committed digest (Release AP's recording) against this tree"
  node scripts/simUsCareerDeckC.mjs > "$D/before.log" 2>&1; echo "exit $?"
  grep -c "^FAIL" "$D/before.log"; grep "^FAIL" "$D/before.log" | cut -c1-200 | head -12; tail -3 "$D/before.log" | cut -c1-300
  echo "== recording"
  DECKC_RECORD=1 node scripts/simUsCareerDeckC.mjs > "$D/record.log" 2>&1; echo "exit $?"; tail -2 "$D/record.log" | cut -c1-300
  node "$REPO/.rc/x/cmpDeck.mjs" "$D/before.json" "$F" || echo "compare failed"
  cp "$F" "$RC_OUT/usCareerDeckCDigest.json"
  sha256sum "$F"
  echo "== after: the plain run on the new digest"
  node scripts/simUsCareerDeckC.mjs > "$D/after.log" 2>&1; CODE=$?
  tail -4 "$D/after.log" | cut -c1-300
  cp "$D/after.log" "$RC_OUT/deckc-after.log"
  echo "after exit $CODE"; exit $CODE
fi

if [ "$MODE" = "board" ]; then
  F=scripts/data/usBoardFixture.json
  cp "$F" "$D/before.json"
  echo "== recording (first)"
  node scripts/recordUsBoardFixture.mjs > "$D/rec1.log" 2>&1; R1=$?; echo "exit $R1"; tail -6 "$D/rec1.log" | cut -c1-300
  [ $R1 -eq 0 ] || { cp "$D/rec1.log" "$RC_OUT/board-rec1.log"; exit 1; }
  echo "== recording (second, to a scratch file: the two must be byte for byte the same)"
  node scripts/recordUsBoardFixture.mjs "$D/second.json" > "$D/rec2.log" 2>&1; echo "exit $?"; tail -2 "$D/rec2.log" | cut -c1-300
  cmp "$F" "$D/second.json" && echo "TWICE: byte for byte the same" || echo "TWICE: the two recordings DIFFER"
  node "$REPO/.rc/x/cmpBoard.mjs" "$D/before.json" "$F" > "$D/cmp.txt" 2>&1 || echo "compare failed"
  head -80 "$D/cmp.txt" | cut -c1-400
  cp "$D/cmp.txt" "$RC_OUT/board-compare.txt"
  cp "$F" "$RC_OUT/usBoardFixture.json"
  sha256sum "$F"; wc -c "$F"
  echo "== the replay on the new fixture, all four sports"
  node scripts/simUsBoardParity.mjs > "$D/parity.log" 2>&1; CODE=$?
  tail -12 "$D/parity.log" | cut -c1-300
  cp "$D/parity.log" "$RC_OUT/board-parity.log"
  echo "parity exit $CODE"; exit $CODE
fi
echo "unknown mode $MODE"; exit 2
