#!/usr/bin/env bash
# Round BFH: one negative control of a harness, run on this head (the life chain attribution in its historical bundles)
# and on the chainOut tree (this head with the chain's three engine inputs at 4ae7a534, so Release BE's careers).
# Prints both exit codes, the head's FAIL and verdict lines, any difference, and FIRED-SAME (exit 0) only when the
# control fails the run on both trees with the same exit code and identical FAIL and verdict lines.
# usage: bash .rc/x/ctlcmp.sh <harness name without .mjs> <CONTROL ENV> <control>
S="$1"; E="$2"; C="$3"
T=$(mktemp -d /tmp/ctlcmp-XXXX)
D=$(bash .rc/x/chainOut.sh)
env "$E=$C" NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node "scripts/$S.mjs" > "$T/h.log" 2>&1; s=$?
(cd "$D" && env "$E=$C" NODE_OPTIONS="--require=$D/scripts/lib/offlineTransport.cjs" node "scripts/$S.mjs" > "$T/o.log" 2>&1); t=$?
P='FAIL|CONTROL|check works|proves nothing|cannot run|refused'
grep -E "$P" "$T/h.log" | sed 's/^ *//' | sort > "$T/h.txt"
grep -E "$P" "$T/o.log" | sed 's/^ *//' | sort > "$T/o.txt"
echo "$S $E=$C: head exit $s, chainOut exit $t, $(wc -l < "$T/h.txt") verdict lines on the head"
cut -c1-220 "$T/h.txt" | head -14
echo "head last line: $(tail -1 "$T/h.log" | cut -c1-200)"
if cmp -s "$T/h.txt" "$T/o.txt"; then echo "same FAIL and verdict lines on both trees"; else echo "DIFFERENT on chainOut:"; diff "$T/h.txt" "$T/o.txt" | head -14 | cut -c1-220; fi
[ "$s" -eq "$t" ] && [ "$s" -ne 0 ] && [ -s "$T/h.txt" ] && cmp -s "$T/h.txt" "$T/o.txt" && echo FIRED-SAME
