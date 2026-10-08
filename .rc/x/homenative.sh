#!/usr/bin/env bash
# Release AM fixer pass 2: the Round 1088 native home search walk, run the way its own workflow runs it
# (.github/workflows/home-search-recovery.yml): the built Home in dist, prefetched fonts and flags,
# offline transport, headed Chromium under xvfb, an eight minute deadline.
set -u
A=home-search-recovery-artifacts
mkdir -p "$A"
command -v xvfb-run >/dev/null || sudo apt-get install -y -qq xvfb
export TZ=UTC SIM_OFFLINE_RECEIPT="$A/transport.log" HOME_SEARCH_RECOVERY_ARTIFACTS="$A/outcomes"
node scripts/playHomeSearchRecovery1088.mjs --prefetch-assets-only || { echo "homenative: asset prefetch failed"; exit 91; }
NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" xvfb-run -a timeout --verbose --signal=TERM --kill-after=15s 8m node scripts/playHomeSearchRecovery1088.mjs > "$A/native.log" 2>&1
code=$?
node -e '
const fs = require("fs"), path = require("path");
try {
  const r = JSON.parse(fs.readFileSync(path.join("home-search-recovery-artifacts", "native", "report.json"), "utf8"));
  console.log("complete", r.complete, "| cases", (r.cases || []).map(c => (c.id || c.name || "?") + ":" + Boolean(c.complete)).join(" "));
  console.log("controls", (r.controls || []).length, "proved", (r.controls || []).filter(c => c.proved).length, "| unexpected", (r.unexpected || []).length, "| sockets", (r.sockets || []).length);
  for (const c of (r.controls || []).filter(c => !c.proved)) console.log("UNPROVED control", JSON.stringify(c).slice(0, 400));
  for (const u of (r.unexpected || []).slice(0, 10)) console.log("UNEXPECTED", JSON.stringify(u).slice(0, 300));
  if (r.error) console.log("ERROR", r.error.name, String(r.error.message).slice(0, 900), String(r.error.stack || "").split("\n").slice(0, 6).join(" | ").slice(0, 900));
  if (r.sourceHoldError) console.log("HOLD ERROR", JSON.stringify(r.sourceHoldError).slice(0, 300));
} catch (e) { console.log("no report:", e.message); }
'
echo "--- native.log"
tail -40 "$A/native.log" | cut -c1-600
echo "homenative exit code $code | $(grep -m1 '^Home search native:' "$A/native.log")"
exit $code
