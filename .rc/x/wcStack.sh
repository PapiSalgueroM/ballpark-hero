#!/usr/bin/env bash
# Diagnostic, never committed: runs simManagerWorldContinuity on one commit, and when its memory passes 4 GB asks
# node for a diagnostic report (the JavaScript stack, taken through an interrupt even inside a busy loop), prints
# it, and kills the run before it can take the runner down.
R=$PWD
git worktree add "/tmp/ws-$1" "$1" >/dev/null 2>&1 || { echo "worktree add failed"; exit 3; }
cd "/tmp/ws-$1" && ln -s "$R/node_modules" node_modules
REP="$RUNNER_TEMP/rep-$1"; mkdir -p "$REP"
L="$RUNNER_TEMP/ws-$1.log"
node --max-old-space-size=3000 --report-on-signal --report-signal=SIGUSR2 --report-directory="$REP" \
  scripts/simManagerWorldContinuity.mjs > "$L" 2>&1 &
P=$!
fired=0
for i in $(seq 1 2400); do
  kill -0 $P 2>/dev/null || break
  rss=$(ps -o rss= -p $P 2>/dev/null | tr -d ' ')
  if [ -n "$rss" ] && [ "$rss" -gt 4000000 ] && [ $fired -eq 0 ]; then
    echo "RSS $rss KB at tick $i (half seconds): sending SIGUSR2"
    kill -USR2 $P; fired=1
    for j in $(seq 1 40); do ls "$REP"/*.json >/dev/null 2>&1 && break; sleep 0.25; done
    sleep 1
    kill -9 $P
    break
  fi
  sleep 0.5
done
wait $P 2>/dev/null; s=$?
echo "node exit $s, fired $fired, log bytes $(stat -c %s "$L")"
tail -c 3000 "$L"
F=$(ls "$REP"/*.json 2>/dev/null | head -1)
if [ -n "$F" ]; then
  node -e "const r = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('JS STACK:'); console.log(JSON.stringify(r.javascriptStack, null, 1).slice(0, 6000)); console.log('heap', JSON.stringify(r.javascriptHeap && { total: r.javascriptHeap.totalMemory, used: r.javascriptHeap.usedMemory })); console.log('resource', JSON.stringify(r.resourceUsage && r.resourceUsage.rss)); console.log('NATIVE TOP:'); console.log(JSON.stringify((r.nativeStack || []).slice(0, 12).map(f => f.symbol), null, 1));" "$F"
else
  echo "no report written"
fi
exit 0
