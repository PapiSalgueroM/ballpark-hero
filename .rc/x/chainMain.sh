#!/usr/bin/env bash
# Release BF join: prints a commit that is origin/main plus this head's Soccer Career life chain src/lib files (every
# src/lib file that differs between Release BE's head 08923969 and HEAD, tests aside), the base for a harness that
# compares this tree with origin/main, so the chain (proved by its own harnesses) is on both sides.
# Round BFH: the reference is 08923969 (Release BE after it merged main's Round 1368 codec), no longer 4ae7a534.
set -e
D=$(mktemp -d /tmp/chainmain-XXXX)
git worktree add -q --detach "$D" origin/main >&2
for f in $(git diff --name-only 08923969 HEAD -- src/lib | grep -v '\.test\.'); do mkdir -p "$D/$(dirname "$f")"; git show "HEAD:$f" > "$D/$f"; done
git -C "$D" add -A src/lib >&2
git -C "$D" -c user.name=gate -c user.email=gate@invalid commit -qm "origin/main plus the BF life chain" >&2
git -C "$D" rev-parse HEAD
