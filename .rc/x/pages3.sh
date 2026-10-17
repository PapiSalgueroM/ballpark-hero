#!/usr/bin/env bash
# Round 1504, critic correction 16: the 25 page test files three times on the head and three times on the base
# 8293c758 (its own worktree, node_modules linked), listing every file whose result moves.
FILES=$(git grep -l "pages/SoccerCareer" -- src | grep -E "\.test\.tsx?$" | tr '\n' ' ')
echo "page test files: $(echo $FILES | wc -w)"
ROOTD="$PWD"
git worktree add -q /tmp/pbase 8293c758 && ln -s "$ROOTD/node_modules" /tmp/pbase/node_modules
run() { # side n dir
  (cd "$3" && node_modules/.bin/vitest run $FILES --testTimeout=300000 --hookTimeout=120000 --reporter=json --outputFile=/tmp/pages-$1-$2.json > /tmp/pages-$1-$2.log 2>&1); echo "$1 run $2 exit=$?"
}
for n in 1 2 3; do run head $n "$ROOTD"; run base $n /tmp/pbase; done
node -e '
const fs = require("fs");
const read = (s, n) => { try { return JSON.parse(fs.readFileSync(`/tmp/pages-${s}-${n}.json`, "utf8")); } catch { return null; } };
const by = {};
for (const s of ["head", "base"]) for (const n of [1, 2, 3]) {
  const j = read(s, n);
  if (!j) { console.log(`${s} ${n}: no json`); continue; }
  console.log(`${s} ${n}: ${j.numPassedTests} passed, ${j.numFailedTests} failed of ${j.numTotalTests}`);
  for (const f of j.testResults) { const k = f.name.split("/src/")[1]; (by[k] ??= {})[`${s}${n}`] = f.status; }
}
const moved = Object.entries(by).filter(([, v]) => new Set(Object.values(v)).size > 1);
console.log(`files whose result moved across the six runs: ${moved.length}`);
for (const [k, v] of moved) console.log(`  ${k}: ${JSON.stringify(v)}`);
process.exit(moved.length ? 1 : 0);
'
