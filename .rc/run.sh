#!/usr/bin/env bash
# Runs on the GitHub runner, from the repo root: executes every line of .rc/request.txt and writes
# $RUNNER_TEMP/rc-out/summary.txt ("name exit=N seconds | last line", the shape of the release gate's summaries)
# plus logs/<name>.log. A request line is "name: bash command". Lines starting with # are comments, except:
#   #!build       run "npm run build" (a plain vite build into dist/, no saved pages) before every command
#   #!serve       after the build, serve dist/ on http://localhost:4173 for browser walks (implies #!build)
#   #!playwright  install Chromium (the workflow reads this one)
#   #!serial      run the commands one at a time instead of three at once
set -u
OUT="$RUNNER_TEMP/rc-out"
mkdir -p "$OUT/logs" "$OUT/files"
# Anything a command writes into $RC_OUT (screenshots, a JSON of measurements) comes back under files/ (keep it small).
export RC_OUT="$OUT/files"
REQ=.rc/request.txt
: > "$OUT/summary.txt"
echo "branch head $(git rev-parse HEAD^) request commit $(git rev-parse HEAD) started $(date -u +%H:%M) UTC" > "$OUT/head.txt"
cp "$REQ" "$OUT/request.txt"
MAXP=3
grep -q '^#!serial' "$REQ" && MAXP=1

run_one() {
  local name="$1" cmd="$2" t s rc last
  t="$RUNNER_TEMP/t-$name"
  mkdir -p "$t"
  s=$(date +%s)
  ( export TMPDIR="$t" TEMP="$t" TMP="$t"; timeout 4200 bash -c "$cmd" ) > "$OUT/logs/$name.log" 2>&1
  rc=$?
  last=$(sed 's/\x1b\[[0-9;]*m//g' "$OUT/logs/$name.log" | grep -v '^\s*$' | tail -1 | cut -c1-170)
  echo "$name exit=$rc $(( $(date +%s) - s ))s | $last" >> "$OUT/summary.txt"
  if [ "$(stat -c %s "$OUT/logs/$name.log")" -gt 700000 ]; then
    tail -c 700000 "$OUT/logs/$name.log" > "$OUT/logs/$name.cut" && mv "$OUT/logs/$name.cut" "$OUT/logs/$name.log"
  fi
}

if grep -q -E '^#!(build|serve)' "$REQ"; then
  run_one build "npm run build"
fi
if grep -q '^#!serve' "$REQ"; then
  node scripts/lib/hostLikeServer.mjs dist 4173 > "$OUT/logs/server.log" 2>&1 &
  export BASE=http://localhost:4173 SWEEP_BASE=http://localhost:4173
  sleep 4
fi

pids=()
running() {
  local n=0 p
  for p in "${pids[@]}"; do kill -0 "$p" 2>/dev/null && n=$((n + 1)); done
  echo "$n"
}
while IFS= read -r raw || [ -n "$raw" ]; do
  line="${raw%$'\r'}"
  case "$line" in ''|'#'*) continue ;; esac
  name="$(printf '%s' "${line%%:*}" | tr -c 'A-Za-z0-9_.-' '_')"
  cmd="${line#*:}"
  [ -z "$name" ] && continue
  if [ "${#pids[@]}" -gt 0 ]; then
    while [ "$(running)" -ge "$MAXP" ]; do sleep 1; done
  fi
  run_one "$name" "$cmd" &
  pids+=("$!")
done < "$REQ"
# wait for the commands (never for the static server, which is not in the list)
if [ "${#pids[@]}" -gt 0 ]; then
  for p in "${pids[@]}"; do wait "$p" 2>/dev/null; done
fi
if [ "$(du -sm "$OUT/files" | cut -f1)" -gt 25 ]; then
  rm -rf "$OUT/files"
  mkdir -p "$OUT/files"
  echo "files dropped: more than 25 MB was written into RC_OUT" > "$OUT/files/DROPPED.txt"
fi
echo "finished $(date -u +%H:%M) UTC" >> "$OUT/head.txt"
exit 0
