// Round 1524 probe (never committed): gzip size of every built JS chunk, by name without its hash.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const dir = path.resolve('dist/assets');
const rows = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const b = fs.readFileSync(path.join(dir, f));
  rows.push([f.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''), b.length, gzipSync(b, { level: 9 }).length]);
}
rows.sort((a, b) => b[2] - a[2]);
const want = (process.env.CHUNKS || 'SoccerCareer,index,OwnerTail,soccerCareerOwner,soccer2').split(',');
for (const r of rows) if (want.some(w => r[0] === w || r[0].startsWith(w))) console.log(`${r[0]} raw ${r[1]} gz ${r[2]}`);
const out = process.env.RC_OUT;
if (out) fs.writeFileSync(path.join(out, 'chunkgz.json'), JSON.stringify(rows));
console.log(`chunks ${rows.length}`);
