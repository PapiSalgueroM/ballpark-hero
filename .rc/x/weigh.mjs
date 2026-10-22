/* Round 1546 weight probe: every built chunk whose name starts with "fight"
   (any case), raw and gzip bytes, head against base. Usage:
   node weigh.mjs <head assets dir> <base assets dir> */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [headDir, baseDir] = process.argv.slice(2);
/* Rollup's default hash is 8 characters of base64url, which can hold a dash. */
const stem = (f) => f.replace(/-.{8}\.js$/, '');
function weigh(dir) {
  const out = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || !/^fight/i.test(f)) continue;
    const buf = fs.readFileSync(path.join(dir, f));
    const s = stem(f);
    const prev = out.get(s) || { raw: 0, gz: 0, files: 0 };
    out.set(s, { raw: prev.raw + buf.length, gz: prev.gz + zlib.gzipSync(buf, { level: 9 }).length, files: prev.files + 1 });
  }
  return out;
}
const head = weigh(headDir);
const base = weigh(baseDir);
const names = [...new Set([...head.keys(), ...base.keys()])].sort();
const lines = ['chunk | base raw | head raw | delta raw | base gzip | head gzip | delta gzip'];
let tb = 0;
let th = 0;
for (const n of names) {
  const b = base.get(n) || { raw: 0, gz: 0 };
  const h = head.get(n) || { raw: 0, gz: 0 };
  tb += b.gz;
  th += h.gz;
  lines.push(`${n} | ${b.raw} | ${h.raw} | ${h.raw - b.raw} | ${b.gz} | ${h.gz} | ${h.gz - b.gz}`);
}
lines.push(`total gzip | ${tb} | ${th} | ${th - tb}`);
const text = lines.join('\n');
console.log(text);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weight-1546.txt'), text + '\n');
console.log(`weigh: ${names.length} chunks compared`);
