#!/usr/bin/env bash
# Release BF join: prints a commit that is origin/main plus this head's Soccer Career life chain src/lib files (every
# src/lib file that differs between Release BE's head 4ae7a534 and HEAD, tests aside), the base for a harness that
# compares this tree with origin/main, so the chain (proved by its own harnesses) is on both sides.
set -e
D=$(mktemp -d /tmp/chainmain-XXXX)
git worktree add -q --detach "$D" origin/main >&2
for f in $(git diff --name-only 4ae7a534 HEAD -- src/lib | grep -v '\.test\.'); do mkdir -p "$D/$(dirname "$f")"; git show "HEAD:$f" > "$D/$f"; done
git -C "$D" add -A src/lib >&2
git -C "$D" -c user.name=gate -c user.email=gate@invalid commit -qm "origin/main plus the BF life chain" >&2
git -C "$D" rev-parse HEAD
