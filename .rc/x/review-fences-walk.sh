#!/usr/bin/env bash
# Reviewer probe (never committed): run one of the other lane's browser walks on one commit on the runner and
# bring back the small evidence files that say WHY it failed.
# usage: bash .rc/x/review-fences-walk.sh <commit|inplace> <tag> <cm|dev>
set -u
C="$1"; TAG="$2"; WHICH="$3"
ROOT="$PWD"
export SIM_NETWORK=offline ENGINES=chromium TZ=UTC
export FREE_KICK_FONT_CACHE="$ROOT/.tmp-fx/font-cache"
if [ "$C" = "inplace" ]; then
  W="$ROOT"
else
  W="/tmp/walk-$TAG"
  git worktree add -f --detach "$W" "$C" > "/tmp/wt-$TAG.log" 2>&1 || { echo "worktree failed for $C"; tail -3 "/tmp/wt-$TAG.log"; exit 2; }
  ln -s "$ROOT/node_modules" "$W/node_modules"
  ( cd "$W" && npm run build > "/tmp/build-$TAG.log" 2>&1 ) || { echo "build failed for $C"; tail -6 "/tmp/build-$TAG.log"; exit 2; }
fi
cd "$W" || exit 2
echo "tree $(git rev-parse --short HEAD) ($C), walk $WHICH"
OUTD="$RC_OUT/$TAG"; mkdir -p "$OUTD"
export NODE_OPTIONS="--require=$W/scripts/lib/offlineTransport.cjs"
if [ "$WHICH" = "dev" ]; then
  SHOTS="/tmp/shots-$TAG" node scripts/playSoccerCareerDevelopment.mjs > "/tmp/walk-$TAG.log" 2>&1
  RC=$?
  grep -E "^FAIL|CONTROL FIRED|must complete" "/tmp/walk-$TAG.log" | cut -c1-230
  echo "ok lines: $(grep -c '^ok ' "/tmp/walk-$TAG.log")  FAIL lines: $(grep -c '^FAIL' "/tmp/walk-$TAG.log")"
  find "/tmp/shots-$TAG" -name "*mentor*escape*restoration*.json" -size -60k | head -8 | while read -r f; do cp "$f" "$OUTD/"; done
  find "/tmp/shots-$TAG" -name "*mentor*dismissSummary*diff*.json" -size -300k | head -6 | while read -r f; do cp "$f" "$OUTD/"; done
  find "/tmp/shots-$TAG" -name "*failure*.png" -size -3000k | head -4 | while read -r f; do cp "$f" "$OUTD/"; done
else
  node "$ROOT/.rc/x/review-fences-repin2.mjs" cm || exit 2
  export CM_REAL_FIXTURE_ARTIFACTS="/tmp/cmrf-$TAG/outcomes" CM_REAL_FIXTURE_NATIVE_ARTIFACTS="/tmp/cmrf-$TAG/native"
  node scripts/simCmRealFixtures.mjs > "/tmp/sim-$TAG.log" 2>&1; S=$?
  echo "sim exit=$S: $(tail -1 "/tmp/sim-$TAG.log" | cut -c1-200)"
  node scripts/playCmRealFixtures.mjs > "/tmp/walk-$TAG.log" 2>&1
  RC=$?
  tail -3 "/tmp/walk-$TAG.log" | cut -c1-240
  grep -E '"(id|kind|passed|error)"' "/tmp/cmrf-$TAG/native/report.json" | cut -c1-900 > "$OUTD/report-cases.txt"
  cat "$OUTD/report-cases.txt" | cut -c1-600
  find "/tmp/cmrf-$TAG/native" -name "*diff*.json" -size -200k | head -6 | while read -r f; do cp "$f" "$OUTD/"; done
  find "/tmp/cmrf-$TAG/native" -name "*failure*.png" -size -3000k | head -4 | while read -r f; do cp "$f" "$OUTD/"; done
  git checkout -- scripts
fi
ls "$OUTD" | head -20
echo "RESULT $TAG $WHICH walk=$RC"
exit 0
