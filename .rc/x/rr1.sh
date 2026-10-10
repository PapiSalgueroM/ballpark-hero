#!/usr/bin/env bash
# Round 1225 fixer, re-record 1: the saved page /whats-new and the one input that moves it.
# Draws the page with the real prerenderer twice on a runner: from the head, and from the head with
# src/pages/WhatsNew.tsx alone put back to the base. The two saved pages must differ by exactly this round's
# one entry. Nothing is committed: the saved page and its lastmod row are taken by the lead's build:seo at the gate.
# Run from the repo root, in a #!serial request with #!playwright: it edits src and public in place and restores them.
set -u
BASE_SHA=46e4231cc82b6c047da6e0b4bdb5dfae5628a928
PAGE=public/whats-new/index.html
draw() {
  node_modules/.bin/vite build > "/tmp/rr1-$1.build.log" 2>&1 || { echo "$1: BUILD FAILED"; tail -3 "/tmp/rr1-$1.build.log"; return 9; }
  PRERENDER_ONLY=/whats-new node scripts/prerender.mjs > "/tmp/rr1-$1.prerender.log" 2>&1 || { echo "$1: PRERENDER FAILED"; tail -5 "/tmp/rr1-$1.prerender.log" | cut -c1-300; return 9; }
  cp "$PAGE" "$RC_OUT/whats-new-$1.html"
  node .rc/x/snapText.mjs "$PAGE" > "/tmp/rr1-$1.txt"
  echo "$1: $(wc -l < "/tmp/rr1-$1.txt") list items on the saved page"
}
node .rc/x/snapText.mjs "$PAGE" > /tmp/rr1-recorded.txt
echo "recorded (as committed): $(wc -l < /tmp/rr1-recorded.txt) list items"
git checkout -q "$BASE_SHA" -- src/pages/WhatsNew.tsx && draw basewhatsnew; a=$?
git checkout -q HEAD -- src public
draw head; b=$?
git checkout -q HEAD -- src public
[ $a -eq 0 ] && [ $b -eq 0 ] || exit 9
grep -Fxv -f /tmp/rr1-basewhatsnew.txt /tmp/rr1-head.txt > /tmp/rr1-only-head.txt
grep -Fxv -f /tmp/rr1-head.txt /tmp/rr1-basewhatsnew.txt > /tmp/rr1-only-base.txt
grep -Fxv -f /tmp/rr1-recorded.txt /tmp/rr1-basewhatsnew.txt > /tmp/rr1-base-not-recorded.txt
cp /tmp/rr1-only-head.txt "$RC_OUT/rr1-only-head.txt"; cp /tmp/rr1-base-not-recorded.txt "$RC_OUT/rr1-base-not-recorded.txt"
oh=$(wc -l < /tmp/rr1-only-head.txt); ob=$(wc -l < /tmp/rr1-only-base.txt); bn=$(wc -l < /tmp/rr1-base-not-recorded.txt)
echo "items only on the head's page: $oh; items only on the page drawn with the base's WhatsNew.tsx: $ob; items the base's page has that the committed recording lacks: $bn"
echo "the head's own item: $(head -1 /tmp/rr1-only-head.txt | cut -c1-120)"
left=$(git status --porcelain -- src public | wc -l)
echo "src and public restored: $left file(s) differ from the head"
[ "$oh" -eq 1 ] && [ "$ob" -eq 0 ] && [ "$left" -eq 0 ] && grep -q "^Club Manager: the real 2026/27 fixture list in nine more leagues" /tmp/rr1-only-head.txt
