#!/usr/bin/env bash
# Round 1216 review (lens RUN), never committed: what the dense fleet of this round's test becomes on the engine of
# each sibling round of the same train. A worktree of the sibling's pushed head, with this round's pitch part and
# test file laid over it, then the seven fleet tests ("on real feeds") of src/test/pitchOwnGoal.test.tsx.
HEAD_SHA=f5a40cc2f04e7d23ddd9a598dab55172d6d37cf2
HERE="$PWD"
for b in r1218-cm-var-true r1225-cm-fixtures-bind; do
  D="/tmp/sib-$b"
  git fetch -q origin "$b" > "$RC_OUT/sib-$b-worktree.log" 2>&1
  git worktree add "$D" FETCH_HEAD >> "$RC_OUT/sib-$b-worktree.log" 2>&1
  ln -s "$HERE/node_modules" "$D/node_modules"
  (
    cd "$D" || exit 1
    echo "== $b at $(git rev-parse --short HEAD), engine files that differ from this round's: $(git diff --name-only "$HEAD_SHA" HEAD -- src/lib src/hooks | wc -l)"
    git checkout "$HEAD_SHA" -- src/components/pitch-motion src/test/pitchOwnGoal.test.tsx
    node_modules/.bin/vitest run src/test/pitchOwnGoal.test.tsx -t "on real feeds" --testTimeout=300000 --hookTimeout=120000 > "$RC_OUT/sib-$b.txt" 2>&1
    echo "vitest exit $?"
    grep -o "\[1216 material\].*" "$RC_OUT/sib-$b.txt" | cut -c1-330
    grep -o "\[1216 OG5\].*" "$RC_OUT/sib-$b.txt" | cut -c1-260
    grep -E "Tests |→" "$RC_OUT/sib-$b.txt" | cut -c1-160
  )
done
exit 0
