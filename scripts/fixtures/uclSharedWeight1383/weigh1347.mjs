// Round 1347 weight probe (never committed): two dist folders, one built as the branch is and one with the
// one line caller; prints every chunk whose size moved, raw and gzipped, and which chunk holds the engine.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [A, B] = process.argv.slice(2);
const stem = f => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
function read(dir) {
  const out = new Map();
  for (const f of fs.readdirSync(path.join(dir, 'assets')).filter(x => x.endsWith('.js'))) {
    const buf = fs.readFileSync(path.join(dir, 'assets', f));
    const key = stem(f);
    const prev = out.get(key) ?? { raw: 0, gz: 0, files: [], text: '' };
    out.set(key, { raw: prev.raw + buf.length, gz: prev.gz + zlib.gzipSync(buf).length, files: [...prev.files, f], text: prev.text + buf.toString('utf8') });
  }
  return out;
}
const a = read(A);
const b = read(B);
const K = n => (n / 1024).toFixed(2);
let rawSum = 0;
let gzSum = 0;
const lines = [];
for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
  const x = a.get(key) ?? { raw: 0, gz: 0, files: [] };
  const y = b.get(key) ?? { raw: 0, gz: 0, files: [] };
  if (x.raw === y.raw) continue;
  rawSum += y.raw - x.raw;
  gzSum += y.gz - x.gz;
  lines.push(`${key}: raw ${K(x.raw)}K -> ${K(y.raw)}K (${K(y.raw - x.raw)}K), gzip ${K(x.gz)}K -> ${K(y.gz)}K (${K(y.gz - x.gz)}K)`);
}
const holds = (m, marker) => [...m.entries()].filter(([, v]) => v.text.includes(marker)).map(([k]) => k);
const report = [
  `chunks that moved: ${lines.length}`, ...lines,
  `total: raw ${K(rawSum)}K, gzip ${K(gzSum)}K`,
  `the engine (marker uclGroups) is in: A ${holds(a, '"uclGroups"').join(',') || holds(a, "'uclGroups'").join(',')} | B ${holds(b, '"uclGroups"').join(',') || holds(b, "'uclGroups'").join(',')}`,
  `the world engine (marker R16_) is in: A ${holds(a, 'R16_').join(',') || 'nowhere'} | B ${holds(b, 'R16_').join(',') || 'nowhere'}`,
  `the slate search (marker swissSlate or PATTERN) is in B: ${holds(b, '__world1347').join(',')}`,
];
console.log(report.join('\n'));
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weigh1347.txt'), `${report.join('\n')}\n`);
