#!/usr/bin/env bash
# Release BE join: prints a commit that is Release BC as published without Release AZ (the BD gate's base for the
# unseeded world and world continuity kits) plus this tree's clubManagerDecisions.ts, because Rounds 1351 and 1357
# (m3) add six desk situations and the drawn desk card differs from BC's deck at the first decision week.
set -e
B=$(node scripts/lib/treeWithoutMerge.mjs 5ec5a724 36cc9ffe 082fc277)
D=$(mktemp -d /tmp/basedeck-XXXX)
git worktree add -q --detach "$D" "$B" >&2
git show HEAD:src/lib/clubManagerDecisions.ts > "$D/src/lib/clubManagerDecisions.ts"
git -C "$D" -c user.name=gate -c user.email=gate@invalid commit -qam "BC without AZ, plus the BE desk deck" >&2
git -C "$D" rev-parse HEAD
