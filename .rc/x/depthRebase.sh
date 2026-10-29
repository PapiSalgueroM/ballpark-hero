#!/usr/bin/env bash
# Release BS triage: rgBEb's playDepth reads its baseline receipt from the artifact of run 38329792123, which GitHub no
# longer serves. This makes the same receipt again the way .github/workflows/manager-decision-depth.yml made it: the
# baseline phase on the source of 48cb9d4b (the workflow's own diff --exit-code base) with this head's walk, then the
# kit's fixed phase on this head against it. Run from the runner's repo root under #!serve.
#   bash .rc/x/depthRebase.sh
set -u
R="$PWD"; W=/tmp/ddbase; OUTB=/tmp/ddb-out
git worktree add -q --detach "$W" 48cb9d4bbe8d8f4922113326d9db5d120dcb0b09 || exit 2
ln -s "$R/node_modules" "$W/node_modules"
cp "$R/scripts/playClubManagerDecisionDepth.mjs" "$W/scripts/"
cp -r "$R/scripts/lib/." "$W/scripts/lib/"
mkdir -p "$OUTB"
(cd "$W" && CI=1 SIM_NETWORK=offline CM_LOCAL_ONLY=1 ENGINES=chromium MANAGER_DECISION_DEPTH_PHASE=baseline MANAGER_DECISION_DEPTH_OUT="$OUTB" NODE_OPTIONS="--require=$W/scripts/lib/offlineTransport.cjs" node scripts/playClubManagerDecisionDepth.mjs > /tmp/ddbase.log 2>&1)
b=$?
tail -3 /tmp/ddbase.log | cut -c1-200
[ -f "$OUTB/baseline/report.json" ] || { echo "depthRebase: the baseline phase (exit $b) wrote no baseline/report.json"; exit 2; }
node -e "const r=require('$OUTB/baseline/report.json');console.log('baseline receipt:',r.status,'missingContexts',r.missingContexts,'failures',r.failures,'setupFailures',r.setupFailures,'sourceHeld',r.sourceHeld,'installedHeld',r.installedHeld)"
mkdir -p "$R/mdd"
MANAGER_DECISION_DEPTH_BASELINE_REPORT="$OUTB/baseline/report.json" MANAGER_DECISION_DEPTH_OUT="$R/mdd" MANAGER_DECISION_DEPTH_PHASE=fixed NODE_OPTIONS="--require=$R/scripts/lib/offlineTransport.cjs" node scripts/playClubManagerDecisionDepth.mjs > /tmp/ddfixed.log 2>&1
s=$?
tail -2 /tmp/ddfixed.log | cut -c1-240
exit $s
