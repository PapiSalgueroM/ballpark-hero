#!/usr/bin/env bash
# The named harnesses on the head (already built by #!build), then the same on FENCE_BASE checked out at the SAME
# path and rebuilt, each through runEach.mjs; prints, per name, both exits and whether the last lines agree.
#   bash .rc/x/cmp.sh name1 name2 ...
BASE_SHA=${FENCE_BASE:-082fc277}
cp .rc/x/runEach.mjs /tmp/runEach.mjs
node /tmp/runEach.mjs /tmp/cmp-head.txt "$@" > /dev/null
git checkout -q -f "$BASE_SHA" && npm run build > /tmp/cmp-build.log 2>&1 || { echo "base build failed"; tail -5 /tmp/cmp-build.log; }
node /tmp/runEach.mjs /tmp/cmp-base.txt "$@" > /dev/null
cp /tmp/cmp-head.txt /tmp/cmp-base.txt "$RC_OUT/" 2>/dev/null
node -e '
const fs = require("fs");
const rd = f => Object.fromEntries(fs.readFileSync(f, "utf8").split("\n").filter(l => / exit=/.test(l) && !l.startsWith("runEach")).map(l => {
  const m = l.match(/^(\S+) exit=(\S+) \d+s \| (.*)$/); return m ? [m[1], { e: m[2], last: m[3].replace(/[0-9.]+ ?(s|ms)\b/g, "#").replace(/\/tmp\/\S+/g, "#").slice(0, 150) }] : [l, {}];
}));
const h = rd("/tmp/cmp-head.txt"), b = rd("/tmp/cmp-base.txt");
let differ = 0;
for (const n of Object.keys(h)) {
  const same = b[n] && h[n].e === b[n].e && h[n].last === b[n].last;
  if (!same) differ++;
  console.log(`${n}: head exit ${h[n].e}, base exit ${b[n]?.e}, ${same ? "same last line" : "DIFFERS"} | head: ${h[n].last} | base: ${b[n]?.last}`);
}
console.log(`cmp: ${Object.keys(h).length} harnesses, ${differ} differ between head and base`);
process.exit(differ ? 1 : 0);
'
