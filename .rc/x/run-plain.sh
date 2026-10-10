#!/usr/bin/env bash
# Round 1216 review (lens RUN), one request line, never committed: every frame and its markup of every chance that
# is NOT an own goal, this round's whole tree against the base's whole tree (origin/release-at-gate 46e4231c), on
# clubs and seeds the builder did not use, with three controls that must move the digest.
BASE_SHA=46e4231cc82b6c047da6e0b4bdb5dfae5628a928
HERE="$PWD"
run() { (cd "$1" && node_modules/.bin/vitest run src/test/ogRunPlain.test.tsx --testTimeout=900000 > "$RC_OUT/plain-$2.log" 2>&1; grep -o "\[run plain\].*" "$RC_OUT/plain-$2.log" | head -1); }
cp .rc/x/ogRunPlain.test.tsx src/test/ogRunPlain.test.tsx
git worktree add /tmp/base "$BASE_SHA" > "$RC_OUT/plain-worktree.log" 2>&1
ln -s "$HERE/node_modules" /tmp/base/node_modules
cp .rc/x/ogRunPlain.test.tsx /tmp/base/src/test/ogRunPlain.test.tsx
echo "base tree head: $(git -C /tmp/base rev-parse HEAD), own goal code in the base's part: $(grep -c ownGoalFrame /tmp/base/src/components/pitch-motion/motion.tsx)"
A=$(run "$HERE" branch)
B=$(run /tmp/base base)
# The builder's way as a second reading of the base: the base's four files of the part inside this round's tree.
for f in motion.tsx PitchSurface.tsx contract.ts index.ts; do git show "$BASE_SHA:src/components/pitch-motion/$f" > "src/components/pitch-motion/$f"; done
B2=$(run "$HERE" base-files)
git checkout -- src/components/pitch-motion
node .rc/x/rmut.mjs plainmoved; C=$(run "$HERE" moved); git checkout -- src/components/pitch-motion
node .rc/x/rmut.mjs marked; D=$(run "$HERE" marked); git checkout -- src/components/pitch-motion
node .rc/x/rmut.mjs kind; E=$(run "$HERE" kind); git checkout -- src/components/pitch-motion
rm -f src/test/ogRunPlain.test.tsx
git status --short | head -5
echo "this round:        $A"
echo "the base tree:     $B"
echo "the base's files:  $B2"
echo "plainmoved:        $C"
echo "marked:            $D"
echo "kind:              $E"
da() { printf '%s' "$1" | sed 's/.*digest frames //'; }
if [ -n "$A" ] && [ "$A" = "$B" ] && [ "$A" = "$B2" ] && [ -n "$C" ] && [ "$(da "$A")" != "$(da "$C")" ] && [ -n "$D" ] && [ "$(da "$A")" != "$(da "$D")" ] && [ -n "$E" ] && [ "$(da "$A")" != "$(da "$E")" ]; then
  echo "RUN PLAIN EQUAL: the whole frame and its markup of every chance that is not an own goal is the base's on both readings, and all three controls moved the digest"
else
  echo "RUN PLAIN: DIFFERS, OR A CONTROL DID NOT MOVE THE DIGEST, OR AN ARM PRINTED NOTHING"
  exit 1
fi
