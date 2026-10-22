/* Reviewer probe (round 1321): compare two vite builds chunk by chunk with the content hashes taken out, and look for
   any string of the two new libraries in the shipped JavaScript. Usage: node cmpdist.mjs <head dist> <base dist> */
import fs from 'node:fs';
import path from 'node:path';

const [headDir, baseDir] = process.argv.slice(2);
const list = d => fs.readdirSync(path.join(d, 'assets')).filter(f => f.endsWith('.js'));
const stem = f => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
const norm = s => s.replace(/-[A-Za-z0-9_-]{8}\.js/g, '-X.js');
const read = (d, f) => fs.readFileSync(path.join(d, 'assets', f), 'utf8');
const head = new Map(list(headDir).map(f => [stem(f), f]));
const base = new Map(list(baseDir).map(f => [stem(f), f]));
let same = 0;
const differ = [];
for (const [s, f] of head) {
  const b = base.get(s);
  if (!b) { differ.push(`${s}: only on head (${read(headDir, f).length} bytes)`); continue; }
  const x = norm(read(headDir, f));
  const y = norm(read(baseDir, b));
  if (x === y) same += 1; else differ.push(`${s}: head ${x.length} bytes, base ${y.length} bytes`);
}
for (const s of base.keys()) if (!head.has(s)) differ.push(`${s}: only on base`);
const NEEDLES = ["This game's draft is two rounds", 'leaning a little to a position', 'it could land anywhere from', 'Your club\'s own pick was seeded', 'is never current', 'You hold no pick tonight'];
const hits = [];
for (const f of list(headDir)) {
  const t = read(headDir, f);
  for (const n of NEEDLES) if (t.includes(n)) hits.push(`${f}: ${n}`);
}
console.log(`chunks equal with hashes taken out: ${same}; different or unmatched: ${differ.length}`);
for (const d of differ.slice(0, 40)) console.log(`  ${d}`);
console.log(`strings of the new libraries in the head build: ${hits.length}`);
for (const h of hits.slice(0, 20)) console.log(`  ${h}`);
console.log(differ.length === 0 && hits.length === 0 ? 'CMPDIST: byte identical modulo hashes, no new string shipped' : 'CMPDIST: see the lines above');
process.exit(hits.length ? 1 : 0);
