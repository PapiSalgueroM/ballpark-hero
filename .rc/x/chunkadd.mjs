// Round 1520 weight probe: the pieces the clubManager chunk gained and lost, base build against head build.
import fs from 'node:fs';
import zlib from 'node:zlib';

const pick = dir => {
  const f = fs.readdirSync(dir).find(x => /^clubManager-[A-Za-z0-9_-]{8}\.js$/.test(x));
  return fs.readFileSync(`${dir}/${f}`, 'utf8');
};
const a = pick(process.argv[2]), b = pick(process.argv[3]);
/* Mangled names differ between builds, so compare the pieces with every short identifier blanked. */
const norm = s => s.replace(/\b[A-Za-z_$][A-Za-z0-9_$]{0,2}\b/g, '#');
const split = s => s.split(/(?<=[;}])/);
const count = list => { const m = new Map(); for (const x of list) { const k = norm(x); m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const ca = count(split(a)), cb = count(split(b));
const added = [], removed = [];
for (const [k, n] of cb) { const d = n - (ca.get(k) ?? 0); if (d > 0) added.push([k, d]); }
for (const [k, n] of ca) { const d = n - (cb.get(k) ?? 0); if (d > 0) removed.push([k, d]); }
const len = list => list.reduce((t, [k, d]) => t + k.length * d, 0);
console.log(`base ${a.length} chars ${zlib.gzipSync(a).length} gz; head ${b.length} chars ${zlib.gzipSync(b).length} gz`);
console.log(`added pieces ${added.length} (${len(added)} chars), removed ${removed.length} (${len(removed)} chars)`);
added.sort((p, q) => q[0].length * q[1] - p[0].length * p[1]);
for (const [k, d] of added.slice(0, 30)) console.log(`+ ${d}x ${k.length}: ${k.slice(0, 220)}`);
removed.sort((p, q) => q[0].length * q[1] - p[0].length * p[1]);
for (const [k, d] of removed.slice(0, 12)) console.log(`- ${d}x ${k.length}: ${k.slice(0, 220)}`);
