#!/usr/bin/env bash
# Release BF join: give a base worktree this head's version of every src/lib file the Soccer Career life chain changed
# (every src/lib file that differs between Release BE's head 4ae7a534 and HEAD, tests aside), so "the tree without
# Round 1330" also carries the chain's engine inputs. usage: bash .rc/x/chainBase.sh /tmp/<dir>
set -e
D="$1"; n=0
for f in $(git diff --name-only 4ae7a534 HEAD -- src/lib | grep -v '\.test\.'); do
  mkdir -p "$D/$(dirname "$f")"; git show "HEAD:$f" > "$D/$f"; n=$((n+1)); echo "chainBase: $f"
done
echo "chainBase: $n file(s) from HEAD into $D"
