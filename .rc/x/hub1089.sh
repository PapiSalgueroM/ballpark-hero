#!/usr/bin/env bash
# AN2: Codex's Round 1089 native hub grid driver, run the way its own workflow runs it
# (.github/workflows/soccer-hub-grid.yml). It pins SoccerCareer.tsx to Codex's base 6f57ce78 on its line 137,
# so it is expected red on any release line; this run records where it stops.
set -u
A=soccer-hub-grid-artifacts
mkdir -p "$A"
export TZ=UTC SIM_NETWORK=offline ENGINES=chromium SIM_OFFLINE_RECEIPT="$A/transport.log"
node scripts/playSoccerHubGrid1089.mjs --prepare-assets-only > "$A/preparation.log" 2>&1 || { tail -30 "$A/preparation.log" | cut -c1-500; echo "hub1089: asset preparation failed"; exit 91; }
NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" timeout --verbose --signal=TERM --kill-after=15s 12m node scripts/playSoccerHubGrid1089.mjs > "$A/native.log" 2>&1
code=$?
echo "--- native.log (tail)"
tail -40 "$A/native.log" | cut -c1-700
echo "hub1089 exit code $code | $(grep -v '^[[:space:]]*$' "$A/native.log" | grep -m1 -i -E 'assert|error|pass|fail' | cut -c1-200)"
exit $code
