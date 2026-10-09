#!/usr/bin/env bash
# Reviewer's helper (never committed): run one harness on a copy of ANOTHER tree. usage: bash .rc/x/rvbase.sh <sha> <harness name>
SHA="$1"; H="$2"
SRC="$PWD"
W="${TMPDIR:-/tmp}/tree-$H"
mkdir -p "$W"
git archive "$SHA" | tar -x -C "$W" || { echo "TREE SETUP FAILED for $SHA"; exit 4; }
ln -s "$SRC/node_modules" "$W/node_modules"
cd "$W" || exit 4
echo "tree $SHA, harness $H"
node "scripts/$H.mjs"
