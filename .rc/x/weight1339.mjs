/* Runner only: the bytes a route's code costs, from a built dist: every JS asset, and the chunks that carry the
   Club Manager engine, the market screen, the Hot Seat and Deadline Day. Usage: node weight1339.mjs <dist> <label> */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const [dist, label] = process.argv.slice(2);
const dir = path.join(dist, 'assets');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const marks = { engine: 'dukb-club-manager-save', market: 'Search player or club' };
let raw = 0, gz = 0; const by = {};
for (const f of files) {
  const b = fs.readFileSync(path.join(dir, f)); raw += b.length; const g = gzipSync(b, { level: 9 }).length; gz += g;
  const t = b.toString('utf8');
  for (const [k, m] of Object.entries(marks)) if (t.includes(m)) (by[k] ??= []).push(`${f} ${b.length}B raw ${g}B gz`);
}
console.log(`${label}: ${files.length} JS files, ${raw} bytes raw, ${gz} bytes gzip`);
for (const [k, list] of Object.entries(by)) console.log(`  ${k}: ${list.join('; ')}`);
