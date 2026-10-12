// Round 1309 review: the first differing paths between two JSON files (a base save and a head save).
import fs from 'node:fs';
const [fa, fb] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(fa, 'utf8')), b = JSON.parse(fs.readFileSync(fb, 'utf8'));
const out = [];
const walk = (x, y, p) => {
  if (out.length >= 14) return;
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y) || (x === null) !== (y === null)) { out.push(`${p}: base ${JSON.stringify(x)?.slice(0, 120)} | head ${JSON.stringify(y)?.slice(0, 120)}`); return; }
  if (x && typeof x === 'object') {
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    for (const k of keys) {
      if (!(k in x)) { out.push(`${p}.${k}: only on head: ${JSON.stringify(y[k])?.slice(0, 160)}`); continue; }
      if (!(k in y)) { out.push(`${p}.${k}: only on base: ${JSON.stringify(x[k])?.slice(0, 160)}`); continue; }
      walk(x[k], y[k], `${p}.${k}`);
    }
    return;
  }
  if (x !== y) out.push(`${p}: base ${JSON.stringify(x)} | head ${JSON.stringify(y)}`);
};
walk(a, b, '$');
console.log(`${fa} vs ${fb}: ${out.length ? out.length + ' (first) differences' : 'identical'}`);
for (const l of out) console.log(`  ${l}`);
