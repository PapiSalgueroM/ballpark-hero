#!/usr/bin/env bash
# Release AM fixer pass 2: run one of Codex's native drivers the way its own workflow does.
#   bash .rc/x/native.sh <artifacts dir> <driver> <prefetch flag> <xvfb|plain>
set -u
A="$1"; DRIVER="$2"; PREFETCH="$3"; MODE="$4"
mkdir -p "$A"
command -v xvfb-run >/dev/null || sudo apt-get install -y -qq xvfb
export TZ=UTC SIM_OFFLINE_RECEIPT="$A/transport.log"
case "$A" in
  boxing-show-forecast-artifacts) export BOXING_SHOW_FORECAST_ARTIFACTS="$A/outcomes" ;;
esac
node "$DRIVER" "$PREFETCH" > "$A/prefetch.log" 2>&1 || { tail -30 "$A/prefetch.log" | cut -c1-500; echo "native: prefetch failed for $DRIVER"; exit 91; }
if [ "$MODE" = xvfb ]; then
  NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" xvfb-run -a timeout --verbose --signal=TERM --kill-after=15s 20m node "$DRIVER" > "$A/native.log" 2>&1
else
  NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" timeout --verbose --signal=TERM --kill-after=15s 20m node "$DRIVER" > "$A/native.log" 2>&1
fi
code=$?
echo "--- prefetch.log (tail)"
tail -3 "$A/prefetch.log" | cut -c1-300
echo "--- native.log (tail)"
if [ "$code" -ne 0 ]; then tail -120 "$A/native.log" | cut -c1-700; else tail -12 "$A/native.log" | cut -c1-500; fi
echo "native $DRIVER exit code $code | $(grep -v '^[[:space:]]*$' "$A/native.log" | grep -i -m1 -E 'pass|fail' | cut -c1-140)"
exit $code
