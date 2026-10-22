#!/usr/bin/env bash
# Round 1556 byte equal proof: run one harness command on the pushed head and on the base, in ONE worktree path
# of this line's own (so a printed path cannot differ and lines can run side by side), and compare every byte.
# usage: bash .rc/x/beq.sh <label> <base sha> <old harness ref or -> <command>
# With an old harness ref, scripts/simNbaGmDesk.mjs is replaced by that ref's file on both trees (same file name,
# so the same seeded stream).
set -u
label="$1"; base="$2"; oldref="$3"; shift 3
out="${RC_OUT:-/tmp}/beq-$label"; mkdir -p "$out"
w=".rcw-$label"
head=$(git rev-parse HEAD~1)
git worktree add -q --detach "$w" "$head" || exit 3
prep() { if [ "$oldref" != "-" ]; then git -C "$w" show "$oldref:scripts/simNbaGmDesk.mjs" > "$w/scripts/simNbaGmDesk.mjs"; fi; }
echo "head $(git -C "$w" rev-parse --short HEAD), base $base, old harness $oldref"
prep; (cd "$w" && bash -c "$*") > "$out/head.txt" 2>&1; eh=$?
git -C "$w" checkout -q -f "$base" || exit 3
echo "base tree $(git -C "$w" rev-parse --short HEAD)"
prep; (cd "$w" && bash -c "$*") > "$out/base.txt" 2>&1; eb=$?
echo "head exit $eh, base exit $eb"
echo "head last line: $(tail -1 "$out/head.txt")"
echo "base last line: $(tail -1 "$out/base.txt")"
if cmp -s "$out/head.txt" "$out/base.txt"; then echo "BYTE EQUAL $label ($(wc -l < "$out/head.txt") lines)"; exit 0; fi
echo "DIFFER $label"
diff "$out/base.txt" "$out/head.txt" | head -40
exit 1
