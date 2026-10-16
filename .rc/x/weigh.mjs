// Round 1508 helper (sent as an extra file, never committed): JS bytes of two builds, total and the Club Manager
// engine chunk (the one holding the only joined sentence), raw and gzipped.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [head, base] = process.argv.slice(2);
function weigh(dist) {
  const dir = path.join(dist, 'assets');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  let total = 0, gz = 0; const engine = [];
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    total += buf.length; gz += zlib.gzipSync(buf).length;
    if (buf.includes(' only joined ')) engine.push({ f, raw: buf.length, gz: zlib.gzipSync(buf).length });
  }
  return { files: files.length, total, gz, engine };
}
const h = weigh(head), b = weigh(base);
console.log(`head: ${h.files} js files, ${h.total} bytes (${h.gz} gzipped); engine chunks ${JSON.stringify(h.engine)}`);
console.log(`base: ${b.files} js files, ${b.total} bytes (${b.gz} gzipped); engine chunks ${JSON.stringify(b.engine)}`);
console.log(`weigh: head minus base ${h.total - b.total} bytes (${h.gz - b.gz} gzipped) over all JS`);
