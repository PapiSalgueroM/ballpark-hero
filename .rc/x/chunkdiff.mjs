// Round 1520 weight probe: every JS chunk's gzipped size in two builds, matched by name without the hash.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [a, b] = process.argv.slice(2);
const sizes = dir => {
  const out = new Map();
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) {
        const key = e.name.replace(/-[A-Za-z0-9_]{6,}\.js$/, '');
        out.set(key, (out.get(key) ?? 0) + zlib.gzipSync(fs.readFileSync(p)).length);
      }
    }
  };
  walk(path.join(dir, 'assets'));
  return out;
};
const x = sizes(a), y = sizes(b);
const rows = [];
for (const k of new Set([...x.keys(), ...y.keys()])) {
  const d = (y.get(k) ?? 0) - (x.get(k) ?? 0);
  if (d !== 0) rows.push([d, k, x.get(k) ?? 0, y.get(k) ?? 0]);
}
rows.sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]));
for (const [d, k, s1, s2] of rows.slice(0, 25)) console.log(`${d > 0 ? '+' : ''}${d}\t${k}\t${s1} -> ${s2}`);
console.log(`chunks compared: ${x.size} and ${y.size}; changed ${rows.length}; net ${rows.reduce((t, r) => t + r[0], 0)} bytes gz`);
