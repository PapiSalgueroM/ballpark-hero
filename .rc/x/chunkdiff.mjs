/* Round 1523 probe (not committed): gzip size of every JS chunk of two builds, matched by name without the hash,
   largest differences first. node chunkdiff.mjs <head dist> <base dist> */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [a, b] = process.argv.slice(2);
const sizes = dir => {
  const out = new Map();
  for (const f of fs.readdirSync(path.join(dir, 'assets'))) {
    if (!f.endsWith('.js')) continue;
    const key = f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
    const gz = zlib.gzipSync(fs.readFileSync(path.join(dir, 'assets', f)), { level: 9 }).length;
    out.set(key, (out.get(key) || 0) + gz);
  }
  return out;
};
const A = sizes(a), B = sizes(b);
const rows = [...new Set([...A.keys(), ...B.keys()])].map(k => [k, (A.get(k) || 0) - (B.get(k) || 0), A.get(k) || 0]).filter(r => r[1] !== 0).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
for (const [k, d, s] of rows.slice(0, 25)) console.log(`${String(d).padStart(7)} B  ${k} (${s} B gz)`);
console.log(`chunkdiff: ${rows.length} chunks differ, net ${rows.reduce((n, r) => n + r[1], 0)} B gz`);
