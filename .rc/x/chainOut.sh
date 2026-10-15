#!/usr/bin/env bash
# Release BF join: prints a worktree of HEAD whose three changed life chain engine inputs (soccerCareerLife.ts,
# soccerCareerContracts.ts, soccerCareerRealismA.ts) are put back to Release BE's head 4ae7a534, with node_modules linked:
# the attribution leg of a harness that compares this tree's careers with an older original. Green there means the
# chain is the only thing that moved its careers.
set -e
D=$(mktemp -d /tmp/chainout-XXXX)
git worktree add -q --detach "$D" HEAD >&2
ln -s "$PWD/node_modules" "$D/node_modules"
for f in src/lib/soccerCareerLife.ts src/lib/soccerCareerContracts.ts src/lib/soccerCareerRealismA.ts; do git show "4ae7a534:$f" > "$D/$f"; done
echo "$D"
