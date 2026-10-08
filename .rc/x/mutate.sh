#!/usr/bin/env bash
# Release AL close: prove on the REAL source that one changed ticket number turns simTycoonHelp red.
# usage: bash .rc/x/mutate.sh <file> <sed program>
# Applies the edit, refuses to go on if nothing changed, runs the claims half of the harness, puts the file
# back, then prints the plain section's own readings and exits with the harness's exit code.
set -u
FILE="$1"
PROG="$2"
sed -i "$PROG" "$FILE"
if git diff --quiet -- "$FILE"; then
  echo "MUTATION DID NOT APPLY to $FILE"
  exit 3
fi
echo "--- the change"
git diff -U0 -- "$FILE" | grep '^[+-][^+-]' | cut -c1-220
TYCOON_HELP_CLAIMS_ONLY=1 node scripts/simTycoonHelp.mjs > "$TMPDIR/mutated.log" 2>&1
rc=$?
git checkout -- "$FILE"
if ! git diff --quiet -- "$FILE"; then
  echo "RESTORE FAILED for $FILE"
  exit 4
fi
echo "--- the plain section, by section"
grep -m6 -E '^   (ok  |RED ) (G1|G2|G3|M1|M2|L1)' "$TMPDIR/mutated.log" | cut -c1-300
echo "--- every FAIL line of the plain section (the control cascades are left out)"
grep -E '^  FAIL: (G1|G2|G3|M1|M2|L1):' "$TMPDIR/mutated.log" | cut -c1-340
echo "--- how the run ended"
tail -2 "$TMPDIR/mutated.log" | cut -c1-260
echo "harness exit on the mutated source: $rc"
exit $rc
