// Release AV scratch (sent to the runner as .rc/x/flagshipProbe.mjs, never committed): the static closure of the
// /soccer-career route the way scripts/simFlagshipWeight.mjs section 3 counts it (the entry chunk and the
// SoccerCareer chunk, following static chunk imports only), to the tenth of a KB and chunk by chunk.
//   node flagshipProbe.mjs <dist dir>                 one line a chunk "name bytes", then the totals
//   node flagshipProbe.mjs --diff <a.txt> <b.txt>      chunks by name without the hash, a against b
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
const bare = f => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
if (process.argv[2] === '--diff') {
  const read = f => new Map(readFileSync(f, 'utf8').split('\n').filter(l => l.startsWith('chunk ')).map(l => { const [, name, bytes] = l.split(' '); return [bare(name), Number(bytes)]; }));
  const a = read(process.argv[3]), b = read(process.argv[4]);
  const names = [...new Set([...a.keys(), ...b.keys()])].sort();
  let total = 0;
  for (const n of names) {
    const d = (b.get(n) ?? 0) - (a.get(n) ?? 0);
    total += d;
    if (d !== 0) console.log(`${n}: ${a.has(n) ? a.get(n) : 'absent'} -> ${b.has(n) ? b.get(n) : 'absent'} (${d > 0 ? '+' : ''}${d} bytes)`);
  }
  console.log(`flagshipProbe diff: ${names.length} chunk names, raw bytes moved by ${total > 0 ? '+' : ''}${total} (${(total / 1024).toFixed(1)} KB)`);
  process.exit(0);
}
const ASSETS = path.join(process.argv[2], 'assets');
const files = readdirSync(ASSETS).filter(f => f.endsWith('.js'));
const CHUNK_IMPORT = /(?:^|[;\s}])import\s*(?:[^'"]*?\s*from\s*)?["']\.\/([^"']+\.js)["']/g;
const depsOf = f => { const t = readFileSync(path.join(ASSETS, f), 'utf8'); const out = new Set(); CHUNK_IMPORT.lastIndex = 0; for (let m; (m = CHUNK_IMPORT.exec(t)) !== null;) out.add(m[1]); return [...out]; };
const entry = files.find(f => /^index-.*\.js$/.test(f));
const route = files.find(f => /^SoccerCareer-.*\.js$/.test(f));
const seen = new Set();
const queue = [entry, route];
while (queue.length) { const f = queue.pop(); if (!f || seen.has(f) || !files.includes(f)) continue; seen.add(f); for (const d of depsOf(f)) queue.push(d); }
let raw = 0, gz = 0;
for (const f of [...seen].sort()) { const b = readFileSync(path.join(ASSETS, f)); raw += b.length; gz += gzipSync(b).length; console.log(`chunk ${f} ${b.length}`); }
console.log(`flagshipProbe: ${seen.size} chunks, ${raw} bytes raw = ${(raw / 1024).toFixed(1)} KB (the ceiling is 2600), ${(gz / 1024).toFixed(1)} KB gzipped`);
