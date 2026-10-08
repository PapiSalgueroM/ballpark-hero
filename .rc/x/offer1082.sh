#!/usr/bin/env bash
# AN2: Codex's Round 1082 native offer review driver, run the way its own workflow runs it
# (.github/workflows/soccer-offer-review.yml): cached presentation assets, offline transport.
set -u
A=soccer-offer-review-artifacts
mkdir -p "$A"
export TZ=UTC SIM_NETWORK=offline ENGINES=chromium SIM_OFFLINE_RECEIPT="$A/transport.log"
node scripts/qa/soccerOfferAssets1082.mjs > "$A/assets.log" 2>&1 || { tail -30 "$A/assets.log" | cut -c1-500; echo "offer1082: asset cache failed"; exit 91; }
SOCCER_OFFER_REVIEW_ASSET_CACHE="$PWD/$A/font-cache/manifest.json" NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" timeout --verbose --signal=TERM --kill-after=15s 20m node scripts/playSoccerOfferReview1082.mjs > "$A/native.log" 2>&1
code=$?
echo "--- native.log (tail)"
if [ "$code" -ne 0 ]; then tail -80 "$A/native.log" | cut -c1-700; else tail -12 "$A/native.log" | cut -c1-500; fi
echo "offer1082 exit code $code | $(grep -v '^[[:space:]]*$' "$A/native.log" | tail -1 | cut -c1-200)"
exit $code
