// Round 1509 probe (never committed): where a season's time goes, on one tree. Bundles <root>/src/lib/clubManager.ts,
// plays CAREERS seeded Everton careers of SEASONS seasons, and times the season's entries, finishSeason and
// startNextSeason separately, plus every objectiveStatuses call the engine makes at the season's end.
// Usage: node probeSeason.mjs <root> [careers=3] [seasons=8]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(process.argv[2] || '.');
const CAREERS = Number(process.argv[3] || 3);
const SEASONS = Number(process.argv[4] || 8);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1509-'));
const entry = path.join(tmp, 'entry.mjs');
const out = path.join(tmp, 'engine.mjs');
const fwd = root.split('\\').join('/');
fs.writeFileSync(entry, `export * from '${fwd}/src/lib/clubManager.ts';\n`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': `${fwd}/src` }, logLevel: 'error' });
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
const cm = await import(pathToFileURL(out).href);
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const now = () => performance.now();
const play = [], fin = [], roll = [], objs = [];
let entries = 0;
for (let c = 0; c < CAREERS; c += 1) {
  Math.random = seeded(0x1509 + c);
  let s = cm.startCareer('Everton');
  for (let y = 0; y < SEASONS; y += 1) {
    let t = now();
    for (let i = 0; i < 200; i += 1) {
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state; entries += 1;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    play.push(now() - t);
    if (s.sacked) break;
    t = now();
    for (let k = 0; k < 3; k += 1) cm.objectiveStatuses({ ...s });
    objs.push((now() - t) / 3);
    t = now();
    const f = cm.finishSeason(s);
    fin.push(now() - t);
    t = now();
    s = cm.startNextSeason(f.state);
    roll.push(now() - t);
  }
}
const med = a => { const b = [...a].sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
const sum = a => a.reduce((p, q) => p + q, 0);
console.log(`probe1509 ${root}: ${CAREERS} careers x ${SEASONS} seasons, ${entries} entries`);
console.log(`  season's entries: median ${med(play).toFixed(0)} ms, total ${(sum(play) / 1000).toFixed(1)} s`);
console.log(`  objectiveStatuses on a fresh copy at the season's end: median ${med(objs).toFixed(2)} ms`);
console.log(`  finishSeason: median ${med(fin).toFixed(1)} ms, total ${(sum(fin) / 1000).toFixed(1)} s`);
console.log(`  startNextSeason: median ${med(roll).toFixed(1)} ms, total ${(sum(roll) / 1000).toFixed(1)} s`);
