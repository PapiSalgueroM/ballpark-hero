#!/usr/bin/env bash
# Release BL kit: prints a commit that is <head> with each pinned sha256 of <map> (64 hex, a whole file hash a packet's
# prover holds as a literal, not a commit) replaced by the given 64 hex value in the named files, so the packet's own
# proof can run on the joined tree when a file it pins was moved by an earlier join (Release BL: PR345's prover pins the
# LF sha256 of PR341's AppearanceBuilder.tsx, which on the joined tree also carries PR333's aria-pressed lines, main).
# The new value is a literal the caller computed (git show <commit>:<file> | sha256sum) and must attribute in its
# report. <map> is old64=new64[,old64=new64...]. Parent <head> only. Fixed author and date (the same input gives the
# same sha). Fails closed when a value is not 64 hex, a file is not at <head>, a file is left unchanged, or an old
# value appears in none of the files.
# usage: C=$(bash .rc/x/bindHash.sh <head> <old64>=<new64>[,<old64>=<new64>...] <file>...) || exit 2
set -euo pipefail
H=$(git rev-parse "$1^{commit}"); MAP=$2; shift 2
test "$#" -ge 1 || { echo "bindHash: name at least one file" >&2; exit 2; }
declare -A to seen
for pair in ${MAP//,/ }; do
  o=${pair%%=*}; n=${pair#*=}
  [[ "$o" =~ ^[0-9a-f]{64}$ ]] || { echo "bindHash: $o is not 64 hex" >&2; exit 2; }
  [[ "$n" =~ ^[0-9a-f]{64}$ ]] || { echo "bindHash: $n is not 64 hex" >&2; exit 2; }
  to[$o]=$n
done
IDX=$(mktemp /tmp/bindhash-idx-XXXXXX); rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree "$H"
W=$(mktemp -d /tmp/bindhash-XXXXXX)
for f in "$@"; do
  mode=$(git ls-tree "$H" -- "$f" | cut -d' ' -f1)
  test -n "$mode" || { echo "bindHash: $f is not in $H" >&2; exit 2; }
  git show "$H:$f" > "$W/in"; cp "$W/in" "$W/out"
  for o in "${!to[@]}"; do
    if grep -q "$o" "$W/out"; then seen[$o]=1; sed -i "s/$o/${to[$o]}/g" "$W/out"; fi
  done
  cmp -s "$W/in" "$W/out" && { echo "bindHash: nothing to bind in $f" >&2; exit 2; }
  blob=$(git hash-object -w "$W/out")
  git update-index --cacheinfo "$mode,$blob,$f"
  echo "bindHash: $f bound" >&2
done
for o in "${!to[@]}"; do test -n "${seen[$o]:-}" || { echo "bindHash: $o is in none of the files" >&2; exit 2; }; echo "bindHash: ${o:0:12} -> ${to[$o]:0:12}" >&2; done
TREE=$(git write-tree)
rm -f "$IDX"; rm -rf "$W"
unset GIT_INDEX_FILE
export GIT_AUTHOR_NAME=gate GIT_AUTHOR_EMAIL=gate@invalid GIT_COMMITTER_NAME=gate GIT_COMMITTER_EMAIL=gate@invalid
export GIT_AUTHOR_DATE='2026-10-19T00:00:00Z' GIT_COMMITTER_DATE='2026-10-19T00:00:00Z'
git commit-tree "$TREE" -p "$H" -m "release BL hash bound: ${H:0:12} with pinned file hashes bound to the joined tree"
