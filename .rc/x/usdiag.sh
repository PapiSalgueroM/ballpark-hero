#!/usr/bin/env bash
# Release AM fixer pass 2: Codex's Round 1084 native driver with a digest of its own report when it fails.
#   bash usdiag.sh <label>     (run from the root of the checkout to test, dist already built)
set -u
LABEL="${1:-head}"
A=us-career-save-recovery-artifacts
mkdir -p "$A"
command -v xvfb-run >/dev/null || sudo apt-get install -y -qq xvfb
export TZ=UTC SIM_OFFLINE_RECEIPT="$A/transport.log"
node scripts/qa/usCareerSaveRecovery1084.mjs --prefetch-fonts-only > "$A/prefetch.log" 2>&1 || { tail -30 "$A/prefetch.log" | cut -c1-500; echo "usdiag $LABEL: prefetch failed"; exit 91; }
s=$(date +%s)
NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" xvfb-run -a timeout --verbose --signal=TERM --kill-after=15s 20m node scripts/qa/usCareerSaveRecovery1084.mjs > "$A/native.log" 2>&1
code=$?
echo "usdiag $LABEL at $(git rev-parse --short HEAD): driver exit $code after $(( $(date +%s) - s )) s"
node -e '
const fs = require("fs"), path = require("path");
const label = process.argv[1];
try {
  const file = path.join("us-career-save-recovery-artifacts", "native", "report.json");
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [...(r.cases || []), ...(r.deletions || [])];
  console.log("complete", r.complete, "| cases", (r.cases || []).length, "done", (r.cases || []).filter(c => c.complete).length, "| deletions", (r.deletions || []).length, "done", (r.deletions || []).filter(c => c.complete).length, "| transportErrors", (r.transportErrors || []).length);
  for (const row of rows) {
    const local = row.localRequests || [];
    const ms = local.filter(q => q.started && q.ended).map(q => Date.parse(q.ended) - Date.parse(q.started));
    const first = local.length ? Date.parse(local[0].started) : 0, last = local.reduce((m, q) => Math.max(m, Date.parse(q.ended || q.started)), 0);
    console.log("row", row.id, "complete", row.complete, "phase", row.routePhase, "| local", local.length, "pending", local.filter(q => !q.ended).length, "errors", local.filter(q => q.error).length, "slowest ms", ms.length ? Math.max(...ms) : 0, "span ms", last - first, "| blocked", (row.network || []).length, "unexpected", (row.unexpectedRequests || []).length, "sockets", (row.sockets || []).length, "pageErrors", (row.errors || []).length, "console", (row.consoleErrors || []).length);
  }
  const bad = rows.filter(row => !row.complete).slice(0, 2);
  for (const row of bad) {
    console.log("=== NOT COMPLETE", row.id);
    const local = row.localRequests || [];
    for (const q of local.filter(q => !q.ended || q.error).slice(0, 12)) console.log("  local pending or failed", q.id, q.phase, q.url, q.status || "", q.error ? String(q.error.message).slice(0, 200) : "PENDING since " + q.started);
    const tail = local.slice(-8); for (const q of tail) console.log("  local tail", q.id, q.url.split("/").slice(3).join("/").slice(0, 90), q.status || "", q.started.slice(11, 23), (q.ended || "PENDING").slice(11, 23));
    const seen = {}; for (const n of row.network || []) { const k = n.method + " " + n.origin + n.path + " [" + n.handling + "]"; seen[k] = (seen[k] || 0) + 1; }
    for (const [k, v] of Object.entries(seen).slice(0, 25)) console.log("  other", v, k.slice(0, 200));
    for (const u of (row.unexpectedRequests || []).slice(0, 8)) console.log("  unexpected", JSON.stringify(u).slice(0, 260));
    for (const e of (row.errors || []).slice(0, 5)) console.log("  pageError", JSON.stringify(e).slice(0, 400));
    for (const e of (row.consoleErrors || []).slice(0, 8)) console.log("  console", JSON.stringify(e).slice(0, 400));
    for (const e of (row.sockets || []).slice(0, 5)) console.log("  socket", e);
    console.log("  lifecycle", JSON.stringify(row.routeLifecycle || []).slice(0, 600));
  }
  for (const t of (r.transportErrors || []).slice(0, 6)) console.log("transportError", JSON.stringify(t).slice(0, 500));
  if (r.error) console.log("REPORT ERROR", r.error.name, String(r.error.message).slice(0, 700));
  const slim = { label, complete: r.complete, error: r.error, transportErrors: r.transportErrors, bad };
  if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, "us1084-" + label + ".json"), JSON.stringify(slim).slice(0, 2500000));
} catch (e) { console.log("no report:", e.message); }
' "$LABEL"
grep -h 'SAVE STATS' "$A/native.log" | tail -2
echo "--- native.log (tail)"
tail -25 "$A/native.log" | cut -c1-600
echo "usdiag $LABEL exit code $code | $(grep -v '^[[:space:]]*$' "$A/native.log" | grep -i -m1 -E 'pass|fail|Timeout|Error' | cut -c1-140)"
exit $code
