#!/usr/bin/env bash
# Review run lens, Round 1567: do the base files (1229c0190) and the head files deal the same board id on every day
# for 400 days in all three sports (the brief: same ids, order and difficulty, so dailies deal the same day)?
# And is connectionsDealtDay1558.mjs's default output (no env) byte identical to the base script's on the same tree?
set -u
H=$PWD
git worktree add -q /tmp/rvbase 1229c0190 || exit 9
ln -s "$H/node_modules" /tmp/rvbase/node_modules
(cd /tmp/rvbase && node scripts/qa/connectionsDealtDay1558.mjs file 2026-10-29 +400 > /tmp/rv-dbase.txt 2>&1); eb=$?
node scripts/qa/connectionsDealtDay1558.mjs file 2026-10-29 +400 > /tmp/rv-dhead.txt 2>&1; eh=$?
ids() { grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}|(bconn|nflconn|nhlconn)-[0-9]+ of [0-9]+' "$1" | paste -sd' ' | sed -E 's/ ([0-9]{4}-[0-9]{2}-[0-9]{2})/\n\1/g'; }
ids /tmp/rv-dbase.txt > /tmp/rv-ibase.txt
ids /tmp/rv-dhead.txt > /tmp/rv-ihead.txt
echo "base exit $eb lines $(wc -l < /tmp/rv-ibase.txt); head exit $eh lines $(wc -l < /tmp/rv-ihead.txt)"
head -3 /tmp/rv-ibase.txt
if diff /tmp/rv-ibase.txt /tmp/rv-ihead.txt > /tmp/rv-idiff.txt; then echo "DEAL_SAME over $(wc -l < /tmp/rv-ihead.txt) days"; else echo "DEAL_DIFFERS"; head -20 /tmp/rv-idiff.txt; fleet=1; fi
# the default path of the 1558 script: base script vs head script, both on this tree's files, no env
git show 1229c0190:scripts/qa/connectionsDealtDay1558.mjs > scripts/qa/zzrvbase1558.mjs
node scripts/qa/zzrvbase1558.mjs file 2026-10-23 +45 > /tmp/rv-o1.txt 2>&1; e1=$?
node scripts/qa/connectionsDealtDay1558.mjs file 2026-10-23 +45 > /tmp/rv-o2.txt 2>&1; e2=$?
rm -f scripts/qa/zzrvbase1558.mjs
if diff /tmp/rv-o1.txt /tmp/rv-o2.txt > /tmp/rv-odiff.txt; then echo "DEFAULT_SAME e1=$e1 e2=$e2 lines $(wc -l < /tmp/rv-o2.txt)"; else echo "DEFAULT_DIFFERS e1=$e1 e2=$e2"; head -20 /tmp/rv-odiff.txt; fleet=1; fi
tail -2 /tmp/rv-o2.txt
exit ${fleet:-0}
