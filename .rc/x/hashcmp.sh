# Reviewer: the card's text on the base build (ab162ea8) against the head, same walk, same planted saves.
# Runs from the repo root on the runner, the head's dist already served on 4173 (#!serve).
git worktree add -f /tmp/rbase ab162ea8a3a1aeecdd430e4c5b1a69725202ea69 > /dev/null 2>&1 || { echo "hashcmp: no base worktree"; exit 2; }
ln -s "$PWD/node_modules" /tmp/rbase/node_modules
(cd /tmp/rbase && npx vite build --outDir /tmp/rdist-base --logLevel error) || { echo "hashcmp: base build failed"; exit 2; }
(node scripts/lib/hostLikeServer.mjs /tmp/rdist-base 4185 > /dev/null 2>&1 &)
sleep 3
RC_OUT= BASE=http://localhost:4185 ENGINES=chromium node scripts/playFoSeasonCard.mjs > /tmp/rb.txt 2>&1; eb=$?
RC_OUT= BASE=http://localhost:4173 ENGINES=chromium node scripts/playFoSeasonCard.mjs > /tmp/rh.txt 2>&1; eh=$?
echo "base walk exit $eb: $(tail -1 /tmp/rb.txt)"
echo "head walk exit $eh: $(tail -1 /tmp/rh.txt)"
grep -F '(printed) text' /tmp/rb.txt | sed 's/; the card.*//' > /tmp/rbh
grep -F '(printed) text' /tmp/rh.txt | sed 's/; the card.*//' > /tmp/rhh
grep -F '(printed) text' /tmp/rh.txt | head -6
cp /tmp/rb.txt "$RC_OUT/hash-base.txt"; cp /tmp/rh.txt "$RC_OUT/hash-head.txt"
n=$(wc -l < /tmp/rhh)
if [ "$n" -lt 18 ]; then echo "hashcmp: only $n hash lines on the head, ABORT"; exit 2; fi
if diff /tmp/rbh /tmp/rhh > /tmp/rdiff; then echo "hashcmp: SAME, $n tab texts identical base vs head"; exit 0; fi
head -20 /tmp/rdiff
echo "hashcmp: DIFFER"
exit 1
