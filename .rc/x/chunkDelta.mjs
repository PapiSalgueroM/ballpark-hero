// Round 1604: gzip size of every JS asset in two builds, matched by name without the hash, printed where they differ.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [a, b] = process.argv.slice(2);
const read = dir => {
  const m = new Map();
  for (const f of fs.readdirSync(path.join(dir, 'assets'))) {
    if (!f.endsWith('.js')) continue;
    const key = f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
    const buf = fs.readFileSync(path.join(dir, 'assets', f));
    const prev = m.get(key) ?? { raw: 0, gz: 0, n: 0 };
    m.set(key, { raw: prev.raw + buf.length, gz: prev.gz + zlib.gzipSync(buf, { level: 9 }).length, n: prev.n + 1 });
  }
  return m;
};
const A = read(a), B = read(b);
let ta = 0, tb = 0;
for (const k of new Set([...A.keys(), ...B.keys()])) {
  const x = A.get(k) ?? { raw: 0, gz: 0 }, y = B.get(k) ?? { raw: 0, gz: 0 };
  ta += x.gz; tb += y.gz;
  if (x.raw !== y.raw) console.log(`${k}: raw ${x.raw} -> ${y.raw} (${y.raw - x.raw}), gz ${x.gz} -> ${y.gz} (${y.gz - x.gz})`);
}
console.log(`all JS gz ${ta} -> ${tb} (${tb - ta} bytes), first ${a}, second ${b}`);
