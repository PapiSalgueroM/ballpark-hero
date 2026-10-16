#!/usr/bin/env bash
# Release BF join: give a base worktree this head's version of every src/lib file the Soccer Career life chain changed
# (every src/lib file that differs between Release BE's head 08923969 and HEAD, tests aside), so "the tree without
# Round 1330" also carries the chain's engine inputs. usage: bash .rc/x/chainBase.sh /tmp/<dir>
# Round BFH: the reference is 08923969 (Release BE after it merged main's Round 1368 codec), no longer 4ae7a534, so
# main's src/lib/soccerCareerSave.ts, which this branch took through that merge, is not mistaken for a chain file.
set -e
D="$1"; n=0
for f in $(git diff --name-only 08923969 HEAD -- src/lib | grep -v '\.test\.'); do
  mkdir -p "$D/$(dirname "$f")"; git show "HEAD:$f" > "$D/$f"; n=$((n+1)); echo "chainBase: $f"
done
echo "chainBase: $n file(s) from HEAD into $D"
