#!/usr/bin/env bash
# REHEARSAL ONLY, on a runner, in /tmp. It writes nothing to any branch.
# What Round 1220 (r1220-draft-night) must do to follow Round 1222's move of the
# one lottery presenter out of src/components/motion into src/components/lottery.
#   bash .rc/x/follow.sh setup   a worktree of Round 1220's head at /tmp/r1220
#   bash .rc/x/follow.sh move    the move itself, in that worktree, uncommitted
set -euo pipefail
SRC="$PWD"
T=/tmp/r1220
mode="${1:-}"
if [ "$mode" = "setup" ]; then
  git fetch -q origin r1220-draft-night
  git worktree add -q "$T" FETCH_HEAD
  ln -s "$SRC/node_modules" "$T/node_modules"
  cd "$T"
  echo "r1220 head: $(git log -1 --format='%H %s' | cut -c1-120)"
  echo "r1222 head under test: $(cd "$SRC" && git log -2 --format='%h' | tail -1)"
  echo "presenter files at r1220 head:"
  git ls-files | grep -i lotteryreveal
  exit 0
fi
if [ "$mode" = "move" ]; then
  cd "$T"
  git rm -q src/components/motion/LotteryReveal.tsx src/components/motion/LotteryReveal.test.tsx
  mkdir -p src/components/lottery
  for f in src/components/lottery/LotteryReveal.tsx src/components/lottery/LotteryReveal.test.tsx src/lib/lotteryReveal.ts; do
    cp "$SRC/$f" "$f"
  done
  git add src/components/lottery/LotteryReveal.tsx src/components/lottery/LotteryReveal.test.tsx src/lib/lotteryReveal.ts
  sed -i "s#@/components/motion/LotteryReveal#@/components/lottery/LotteryReveal#g" src/components/career/DraftNightSequence.tsx
  sed -i "s#src/components/motion/LotteryReveal.tsx#src/components/lottery/LotteryReveal.tsx#g" src/components/career/DraftNightSequence.tsx src/lib/careerDraftNight.ts
  echo "what the move changed in Round 1220's tree:"
  git status --short | cut -c1-120
  git diff --stat HEAD | tail -1
  n=$( (grep -rn "motion/LotteryReveal" src scripts docs/audits/ROUND-1220-NOTES.md || true) | wc -l)
  echo "lines that still name the old path (src, scripts, the round's notes): $n"
  (grep -rn "motion/LotteryReveal" src scripts docs/audits/ROUND-1220-NOTES.md || true) | cut -c1-160 | head -12
  m=$(git ls-files src/components/motion | grep -c -i lottery || true)
  echo "presenter files left in src/components/motion: $m"
  test "$m" = "0"
  exit 0
fi
echo "follow.sh: say setup or move"
exit 2
