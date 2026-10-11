#!/usr/bin/env bash
# Round 1304 (extra file, never committed): run pins1304.mjs on the tree of a commit.
set -u
REPO="$PWD"
SHA=$(git rev-parse --short=10 "$1")
W="/tmp/wp-$SHA-$$"
for i in 1 2 3 4 5 6 7 8; do
  git worktree add -q --detach "$W" "$SHA" && break
  sleep 7
done
[ -d "$W/scripts" ] || { echo "no worktree for $1"; exit 3; }
ln -s "$REPO/node_modules" "$W/node_modules"
cp "$REPO/.rc/x/pins1304.mjs" "$W/scripts/pins1304x.mjs"
cd "$W"
echo "AT $1 = $(git log -1 --format='%h %ad %s' --date=short | cut -c1-140)"
node scripts/pins1304x.mjs
