#!/usr/bin/env bash
# Reviewer (run lens), Round 1319: after rvmut.mjs applied a mutation, run what should catch it and say
# whether anything did. Exit 0 = CAUGHT by at least one gate, 9 = SURVIVED every gate. Never committed.
# Usage: bash rvmutrun.sh <id>
id="$1"
o="${RC_OUT:-/tmp}/mut-$id"
mkdir -p "$o"
secs() { awk '/^[0-9]+b?\. /{sec=$1} /FAIL:/{print sec}' "$1" | sort | uniq -c | tr '\n' ' ' | tr -s ' '; }
SEEDSET=a node scripts/simCareerPreDraft.mjs > "$o/pd-a.log" 2>&1; ha=$?
SEEDSET=c node scripts/simCareerPreDraft.mjs > "$o/pd-c.log" 2>&1; hc=$?
node_modules/.bin/vitest run src/test/careerPreDraft.test.tsx --testTimeout=300000 > "$o/vitest.log" 2>&1; vt=$?
node scripts/simUsCareerProspect.mjs > "$o/prospect.log" 2>&1; pj=$?
echo "pd-a: exit=$ha sections: $(secs "$o/pd-a.log")| $(tail -1 "$o/pd-a.log" | cut -c1-90)"
echo "pd-c: exit=$hc sections: $(secs "$o/pd-c.log")| $(tail -1 "$o/pd-c.log" | cut -c1-90)"
echo "vitest: exit=$vt | $(grep -E 'Tests +[0-9]' "$o/vitest.log" | tail -1 | tr -s ' ' | cut -c1-90)"
grep -E '(FAIL|×|✗) ' "$o/vitest.log" | head -6 | cut -c1-160
echo "prospect: exit=$pj | $(tail -1 "$o/prospect.log" | cut -c1-90)"
if [ $ha -ne 0 ] || [ $hc -ne 0 ] || [ $vt -ne 0 ] || [ $pj -ne 0 ]; then
  echo "MUTRESULT $id CAUGHT harness-a=$ha harness-c=$hc vitest=$vt prospect=$pj"; exit 0
fi
echo "MUTRESULT $id SURVIVED harness-a=$ha harness-c=$hc vitest=$vt prospect=$pj"; exit 9
