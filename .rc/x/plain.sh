#!/usr/bin/env bash
# Round 1216, a one time request line: every frame of every chance that is NOT an own goal, this round's motion.tsx
# against the base's (origin/release-at-gate 46e4231c), and against the base's with one number moved (plainmoved).
BASE_SHA=46e4231cc82b6c047da6e0b4bdb5dfae5628a928
PART=src/components/pitch-motion/motion.tsx
cp .rc/x/ogPlain.test.tsx src/test/ogPlain.test.tsx
run() { node_modules/.bin/vitest run src/test/ogPlain.test.tsx --testTimeout=600000 2>&1 | grep -o "\[1216 plain\].*" | head -1; }
A=$(run)
git show "$BASE_SHA:$PART" > "$PART"
grep -c "ownGoalFrame" "$PART"
B=$(run)
grep -c "const flight = bounded((p - .24) / .48);" "$PART"
sed -i 's#const flight = bounded((p - .24) / .48);#const flight = bounded((p - .24) / .5);#' "$PART"
C=$(run)
git checkout -- "$PART"
rm -f src/test/ogPlain.test.tsx
echo "this round: $A"
echo "the base:   $B"
echo "plainmoved: $C"
if [ -n "$A" ] && [ "$A" = "$B" ] && [ -n "$C" ] && [ "$A" != "$C" ]; then
  echo "PLAIN EQUAL: every frame of every chance that is not an own goal is the base's, and the comparison sees a moved number"
else
  echo "PLAIN DIFFERS OR THE CONTROL DID NOT FIRE"
  exit 1
fi
