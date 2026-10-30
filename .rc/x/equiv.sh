#!/usr/bin/env bash
# Round 1583 closing check: one rehearsal run at the head before the lift (c0b6c86dc, the two copies) and at the
# pushed head (the thin scripts over scripts/lib/connectionsRehearsal.mjs), same control, same PGlite; the whole
# output (stdout and stderr) and the exit code must be byte equal.
#   bash .rc/x/equiv.sh <script> [control]     exits with the run's own code when equal, 3 when they differ
s=$1; c=$2
if [ ! -d /tmp/base ]; then
  git worktree add -q /tmp/base c0b6c86dcf3519f840a89c6acbd97a0f7a97ca9c && ln -s "$PWD/node_modules" /tmp/base/node_modules || exit 4
fi
grep -c "connectionsRehearsal" /tmp/base/$s > /tmp/eq-base-lib.txt
grep -c "connectionsRehearsal" $s > /tmp/eq-head-lib.txt
echo "base imports the lib: $(cat /tmp/eq-base-lib.txt) lines; head: $(cat /tmp/eq-head-lib.txt) lines"
old=/tmp/eq-old-$c-$(basename $s).txt; new=/tmp/eq-new-$c-$(basename $s).txt
(cd /tmp/base && REHEARSE_CONTROL=$c PGLITE_DIR=/tmp/pgl node $s > $old 2>&1); eo=$?
REHEARSE_CONTROL=$c PGLITE_DIR=/tmp/pgl node $s > $new 2>&1; en=$?
echo "old exit=$eo new exit=$en; old $(wc -l < $old) lines, new $(wc -l < $new) lines"
cat $new | cut -c1-200
if [ "$eo" = "$en" ] && cmp -s $old $new; then echo "EQUAL exit=$en $(wc -l < $new) lines: $(grep -v '^$' $new | tail -1 | cut -c1-120)"; exit $en; fi
diff $old $new | head -30
echo "DIFFER old exit=$eo new exit=$en"
exit 3
