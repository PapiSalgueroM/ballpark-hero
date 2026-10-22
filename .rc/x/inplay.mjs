// Review probe for Round 1522: does an in play change of instructions in the FIRST half (minute 20) move the goal
// rates the rest of the half is redrawn at? Compares the live match's h1Segs after the change with the same match
// left alone, over several clubs and seeds. Prints MOVED n of m.
import '../../scripts/lib/offlineTransport.cjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-ip-'));
const entry = path.join(work, 'entry.ts');
const at = f => JSON.stringify(path.join(ROOT, `src/lib/${f}.ts`).split(path.sep).join('/'));
fs.writeFileSync(entry, `export * as cm from ${at('clubManager')};\nexport * as tac from ${at('clubManagerTactics')};\n`);
const out = path.join(work, 'bundle.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
  alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let n = 0, moved = 0, refused = 0;
for (const club of ['Brentford', 'Arsenal', 'Hull City', 'Torino']) for (let seed = 0; seed < 3; seed++) {
  delete req.cache[req.resolve(out)];
  store.clear();
  const { cm } = req(out);
  const real = Math.random;
  Math.random = seeded(seed * 104729 + club.length * 17);
  try {
    let s = cm.startCareer(club);
    let r = cm.playNextEntry(s, { skipHalftime: false });
    for (let g = 0; g < 40 && r.kind !== 'halftime'; g++) { s = r.state; r = cm.playNextEntry(s, { skipHalftime: false }); }
    s = r.state;
    if (!s.live) continue;
    const seg = l => JSON.stringify((l.h1Segs ?? []).map(x => [x.from, x.to, +x.lamMine.toFixed(6), +x.lamOpp.toFixed(6)]));
    const json = JSON.stringify(s);
    const changed = cm.changeLive(JSON.parse(json), 20, { kind: 'instructions', instructions: { press: 0, tempo: 1, width: 1, line: 1 } });
    n += 1;
    if (!changed) { refused += 1; continue; }
    const after = changed.live;
    const lamAfter = after.h1Segs?.find(x => x.from === 20) ?? null;
    const before = JSON.parse(json).live;
    if (seg(after) !== seg(before) && lamAfter) moved += 1;
    if (n <= 2) console.log(`  ${club} ${seed}: before ${seg(before)} after ${seg(after)} log ${JSON.stringify(after.instrLog)}`);
  } finally { Math.random = real; }
}
console.log(`inplay probe: MOVED ${moved} of ${n} (refused ${refused})`);
process.exit(0);
