#!/usr/bin/env bash
# Release BK kit: prints a commit that is <head> with each pinned sha of <map> replaced by the full sha of its ref in
# the named files (a packet's own prover), so the packet's own proof runs against the joined tree with its base bound
# to the tree before its merge (the merge's first parent, or a minusRange.sh reference for a round that came in under
# another, or for PR310's frozen baseline). <map> is old40=ref[,old40=ref...]. Parents: <head>, then every ref that is
# not already an ancestor of <head>, so the prover's ancestry checks hold. Fixed author and date (the same input gives
# the same sha). Fails closed when an old sha is not 40 hex, a ref does not resolve, a file is not at <head>, a file is
# left unchanged, or an old sha appears in none of the files.
# usage: C=$(bash .rc/x/bindAt.sh <head> <old40>=<ref>[,<old40>=<ref>...] <file>...) || exit 2
set -euo pipefail
H=$(git rev-parse "$1^{commit}"); MAP=$2; shift 2
test "$#" -ge 1 || { echo "bindAt: name at least one file" >&2; exit 2; }
declare -A to seen
P=(-p "$H")
for pair in ${MAP//,/ }; do
  o=${pair%%=*}; r=${pair#*=}
  [[ "$o" =~ ^[0-9a-f]{40}$ ]] || { echo "bindAt: $o is not a 40 hex sha" >&2; exit 2; }
  R=$(git rev-parse "$r^{commit}") || { echo "bindAt: $r does not resolve" >&2; exit 2; }
  to[$o]=$R
  git merge-base --is-ancestor "$R" "$H" || P+=(-p "$R")
done
IDX=$(mktemp /tmp/bindat-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$H"
W=$(mktemp -d /tmp/bindat-XXXXXX)
for f in "$@"; do
  mode=$(git ls-tree "$H" -- "$f" | cut -d' ' -f1)
  test -n "$mode" || { echo "bindAt: $f is not in $H" >&2; exit 2; }
  git show "$H:$f" > "$W/in"; cp "$W/in" "$W/out"
  for o in "${!to[@]}"; do
    if grep -q "$o" "$W/out"; then seen[$o]=1; sed -i "s/$o/${to[$o]}/g" "$W/out"; fi
  done
  cmp -s "$W/in" "$W/out" && { echo "bindAt: nothing to bind in $f" >&2; exit 2; }
  blob=$(git hash-object -w "$W/out")
  git update-index --cacheinfo "$mode,$blob,$f"
  echo "bindAt: $f bound" >&2
done
for o in "${!to[@]}"; do test -n "${seen[$o]:-}" || { echo "bindAt: $o is in none of the files" >&2; exit 2; }; echo "bindAt: ${o:0:12} -> ${to[$o]:0:12}" >&2; done
TREE=$(git write-tree)
rm -f "$IDX"; rm -rf "$W"
unset GIT_INDEX_FILE
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-18T00:00:00Z' GIT_COMMITTER_DATE='2026-10-18T00:00:00Z'
git commit-tree "$TREE" "${P[@]}" -m "release BK bound: ${H:0:12} with its pinned bases bound to the joined tree"
