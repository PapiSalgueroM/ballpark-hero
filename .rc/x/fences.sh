#!/usr/bin/env bash
# Round 1504: the 24 rule fences on the head (dist built by #!build), then every red one again on the base 8293c758
# (its own worktree, node_modules linked, its own dist), so a red is this round's only if its first failing line differs.
FENCES="simLiveScores simNoRivalNames simInventedNames simHarnessAnchors simNoInventedQuotes simNoInventedConduct simLegalPages simSingleFooter simCompletionSlugs simCompletionOnce simNoDoubleRecord simDailyPuzzleContract simDailySaveHardening simWritesAreSent simSchemaNames simFetchRetry simGoogleOnlyReturn simReportRelay simNavbarStatsReads simLeaderboardCaps simScoringCoverage simSiteSearch simResultMoment simGuideHeadings simStorageWrites simTrustCopy"
RED=""
for f in $FENCES; do
  T=$(mktemp -d); TEMP=$T TMP=$T timeout 1500 node scripts/$f.mjs > /tmp/fence-$f.log 2>&1; e=$?
  echo "head $f exit=$e | $(grep -v '^\s*$' /tmp/fence-$f.log | tail -1 | cut -c1-200)"
  [ $e -ne 0 ] && RED="$RED $f"
done
[ -z "$RED" ] && { echo "fences: every one green on the head"; exit 0; }
ROOTD="$PWD"
git worktree add -q /tmp/fbase 8293c758 && ln -s "$ROOTD/node_modules" /tmp/fbase/node_modules
(cd /tmp/fbase && node_modules/.bin/vite build > /tmp/fbase-build.log 2>&1)
SAME=0; DIFF=0
for f in $RED; do
  (cd /tmp/fbase && T=$(mktemp -d); TEMP=$T TMP=$T timeout 1500 node scripts/$f.mjs > /tmp/fbase-$f.log 2>&1; echo "base $f exit=$? | $(grep -v '^\s*$' /tmp/fbase-$f.log | tail -1 | cut -c1-200)")
  h=$(grep -m1 -E 'FAIL|Error|error' /tmp/fence-$f.log | cut -c1-160); b=$(grep -m1 -E 'FAIL|Error|error' /tmp/fbase-$f.log | cut -c1-160)
  if [ "$h" = "$b" ]; then SAME=$((SAME+1)); echo "  $f: the first failing line is the base's"; else DIFF=$((DIFF+1)); echo "  $f DIFFERS: head [$h] base [$b]"; fi
done
echo "fences: red on the head:$RED; the same first failing line on the base: $SAME, different: $DIFF"
exit $DIFF
