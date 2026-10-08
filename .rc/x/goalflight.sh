#!/usr/bin/env bash
# Release AM fixer pass 2: the Round 1087 goal flight harness, run the way its own workflow runs it
# (.github/workflows/tycoon-goal-flight.yml): prefetched fonts, offline transport, headed Chromium under xvfb.
set -u
A=tycoon-goal-flight-artifacts
mkdir -p "$A"
command -v xvfb-run >/dev/null || sudo apt-get install -y -qq xvfb
export TZ=UTC SIM_OFFLINE_RECEIPT="$A/transport.log"
node scripts/qa/tycoonGoalFlight1087.mjs --prefetch-fonts-only || { echo "goalflight: font prefetch failed"; exit 91; }
NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" xvfb-run -a node scripts/simTycoonGoalFlight.mjs > "$A/outcomes.log" 2>&1
code=$?
cp "$A/summary.json" "$RC_OUT/goalflight-summary.json" 2>/dev/null
node -e '
const fs = require("fs"), path = require("path");
const A = "tycoon-goal-flight-artifacts";
try {
  const s = JSON.parse(fs.readFileSync(path.join(A, "summary.json"), "utf8"));
  console.log("complete", s.complete, "| runs", s.runs.map(r => r.arm + ":" + r.status).join(" "));
  for (const c of s.controls) console.log("control", c.name, "proved", Boolean(c.proved), "| failures", [...new Set((c.assertionFailures || []).map(f => f.name))].join(","));
  if (s.historical) console.log("historical proved", Boolean(s.historical.expectedFailureProved), "|", [...new Set((s.historical.assertionFailures || []).map(f => f.name))].join(","));
  if (s.error) console.log("ERROR", s.error.name, String(s.error.message).slice(0, 600));
  if (s.sourceHoldError) console.log("HOLD ERROR", String(s.sourceHoldError.message).slice(0, 300));
} catch (e) { console.log("no summary:", e.message); }
const native = path.join(A, "native");
if (fs.existsSync(native)) for (const arm of fs.readdirSync(native)) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(native, arm, "report.json"), "utf8"));
    const names = {}; for (const f of r.failures || []) names[f.name] = (names[f.name] || 0) + 1;
    console.log("arm", arm, "complete", r.complete, "cases", (r.cases || []).length, "failures", JSON.stringify(names), r.runtimeError ? "RUNTIME " + String(r.runtimeError.message).slice(0, 300) : "");
  } catch (e) { console.log("arm", arm, "no report:", e.message); }
}
'
for f in "$A"/*.stderr.log; do [ -s "$f" ] && { echo "--- $f"; tail -15 "$f" | cut -c1-400; }; done
echo "--- outcomes.log"
cat "$A/outcomes.log"
echo "goalflight exit code $code | $(grep -m1 '^simTycoonGoalFlight:' "$A/outcomes.log")"
exit $code
