#!/usr/bin/env bash
# Round 1304 bisect helper (sent as an extra file, never committed).
# usage: bash .rc/x/at.sh <commit-ish> <harness>...
# Runs each harness of an OLDER commit in its own git worktree, with its own temp folder,
# and prints the failing lines, the closing line and the real exit code of each.
set -u
REPO="$PWD"
C="$1"; shift
SHA=$(git rev-parse --short=10 "$C")
W="/tmp/w-$SHA-$$"
for i in 1 2 3 4 5 6 7 8; do
  git worktree add -q --detach "$W" "$SHA" && break
  sleep 7
done
[ -d "$W/scripts" ] || { echo "no worktree for $C"; exit 3; }
ln -s "$REPO/node_modules" "$W/node_modules"
export TMPDIR="/tmp/t-$SHA-$$"
mkdir -p "$TMPDIR"
cd "$W"
echo "AT $C = $(git log -1 --format='%h %ad %s' --date=short | cut -c1-150)"
worst=0
for h in "$@"; do
  L="$TMPDIR/$h.log"
  node "scripts/$h.mjs" > "$L" 2>&1; e=$?
  if [ -n "${RC_OUT:-}" ]; then cp "$L" "$RC_OUT/$h-at-$SHA.log"; fi
  echo "== $h at $SHA exit=$e"
  grep -E "FAIL|era-only clubs|era-exclusive names|players compared|appearances" "$L" | cut -c1-300 | head -30
  echo "closing line: $(tail -1 "$L" | cut -c1-200)"
  if [ "$e" -gt "$worst" ]; then worst=$e; fi
done
echo "DONE at $SHA worst=$worst"
exit 0
