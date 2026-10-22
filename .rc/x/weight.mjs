// Round 1548 weight probe: the Hall of Champions page chunk and its static import closure, raw and gzip.
// node weight.mjs <dist dir> <label>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dist = path.resolve(process.argv[2] || 'dist');
const label = process.argv[3] || 'tree';
const assets = path.join(dist, 'assets');
const files = fs.readdirSync(assets);
const page = files.find(f => /^HallOfChampions-.*\.js$/.test(f));
if (!page) { console.error(`${label}: no HallOfChampions chunk in ${assets}`); process.exit(1); }
const seen = new Set();
const queue = [page];
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f)) continue;
  seen.add(f);
  const text = fs.readFileSync(path.join(assets, f), 'utf8');
  for (const m of text.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) if (!seen.has(m[1])) queue.push(m[1]);
}
const size = f => {
  const b = fs.readFileSync(path.join(assets, f));
  return { raw: b.length, gz: zlib.gzipSync(b, { level: 9 }).length };
};
const pg = size(page);
let raw = 0, gz = 0;
for (const f of seen) { const s = size(f); raw += s.raw; gz += s.gz; }
console.log(`${label}: page chunk ${page} raw ${pg.raw} gz ${pg.gz}; closure ${seen.size} files raw ${raw} gz ${gz}`);
