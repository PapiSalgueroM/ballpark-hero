#!/usr/bin/env bash
# Round 1540 fixer 2, the old path proof. Usage, from the repo root on a runner:
#   bash .rc/x/cmp.sh <label> '<command>'
# Runs the command once in a worktree of 7a8750ba (the base, Round 1321 PART A closed) and twice in the head, each
# with its own TMPDIR, TEMP and TMP, keeps all three outputs in $RC_OUT, and compares them byte for byte.
# Exit 0 when base and head print the same bytes and exit the same; 1 when they differ (the differing lines are
# printed, with whether the head moves against itself on the same lines, which is run to run noise and not this
# round); 2 when it could not run.
set -u
label=$1
cmd=$2
BASE=/tmp/base-7a8750ba
if [ ! -d "$BASE" ]; then
  git worktree add -f "$BASE" 7a8750ba >/dev/null 2>&1 || { echo "cmp $label: no base worktree"; exit 2; }
  ln -sfn "$PWD/node_modules" "$BASE/node_modules"
fi
mkdir -p "$RC_OUT"
run() {
  local dir=$1 out=$2 T
  T=$(mktemp -d)
  (cd "$dir" && env TMPDIR="$T" TEMP="$T" TMP="$T" bash -c "$cmd") > "$out" 2>&1
  echo $?
}
eb=$(run "$BASE" "$RC_OUT/$label-base.txt")
eh=$(run "$PWD" "$RC_OUT/$label-head.txt")
eh2=$(run "$PWD" "$RC_OUT/$label-head2.txt")
echo "cmp $label: exit base=$eb head=$eh head2=$eh2"
echo "  base last line: $(grep -v -E '^\s*$' "$RC_OUT/$label-base.txt" | tail -1 | cut -c1-200)"
echo "  head last line: $(grep -v -E '^\s*$' "$RC_OUT/$label-head.txt" | tail -1 | cut -c1-200)"
echo "  lines: base $(wc -l < "$RC_OUT/$label-base.txt"), head $(wc -l < "$RC_OUT/$label-head.txt")"
echo "  sha1 base $(sha1sum < "$RC_OUT/$label-base.txt" | cut -c1-12) head $(sha1sum < "$RC_OUT/$label-head.txt" | cut -c1-12) head2 $(sha1sum < "$RC_OUT/$label-head2.txt" | cut -c1-12)"
if cmp -s "$RC_OUT/$label-base.txt" "$RC_OUT/$label-head.txt" && [ "$eb" = "$eh" ]; then
  echo "cmp $label: BYTE EQUAL to 7a8750ba"
  exit 0
fi
echo "  base against head:"
diff "$RC_OUT/$label-base.txt" "$RC_OUT/$label-head.txt" | head -30 | cut -c1-220
if cmp -s "$RC_OUT/$label-head.txt" "$RC_OUT/$label-head2.txt"; then
  echo "  the head against itself: byte equal, so the lines above moved with this branch"
else
  echo "  the head against itself:"
  diff "$RC_OUT/$label-head.txt" "$RC_OUT/$label-head2.txt" | head -12 | cut -c1-220
fi
echo "cmp $label: DIFFERS from 7a8750ba"
exit 1
