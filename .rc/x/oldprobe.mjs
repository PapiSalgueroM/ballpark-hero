// Review probe for Round 1522: a save made by main's engine (paused at half time) continued by main's engine and by
// the branch's (with and without the tactics module loaded) must play the same rest of the season to the byte.
// Usage from the repo root: BASE_ROOT=<worktree of main> SEEDS=n node .rc/x/oldprobe.mjs
import '../../scripts/lib/offlineTransport.cjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_ROOT = path.resolve(ROOT, process.env.BASE_ROOT || '.rcmain');
const SEEDS = Number(process.env.SEEDS || 4);
const CLUBS = (process.env.CLUBS || 'Brentford,Arsenal,Hull City,Real Madrid,Torino').split(',');
async function bundle(root, withTac) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-old-'));
  const entry = path.join(work, 'entry.ts');
  const at = f => JSON.stringify(path.join(root, `src/lib/${f}.ts`).split(path.sep).join('/'));
  fs.writeFileSync(entry, `export * as cm from ${at('clubManager')};\n${withTac ? `export * as tac from ${at('clubManagerTactics')};\n` : ''}`);
  const out = path.join(work, 'bundle.cjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  return out;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
const fresh = b => { delete req.cache[req.resolve(b)]; store.clear(); return req(b); };
function seeded(seed) {
  let a = seed >>> 0;
  const f = () => { f.n += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.n = 0; return f;
}
function hash32(s) { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
const real = Math.random;
function make(b, club, seed) {
  const { cm } = fresh(b);
  Math.random = seeded(hash32(`old|${club}|${seed}`));
  try {
    let s = cm.startCareer(club);
    let played = 0;
    for (let i = 0; i < 60 && played < 2 + (seed % 4); i++) { const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'match') played += 1; }
    for (let i = 0; i < 60; i++) { const r = cm.playNextEntry(s, { skipHalftime: false }); s = r.state; if (r.kind === 'halftime') break; }
    return JSON.stringify(s);
  } finally { Math.random = real; }
}
function cont(b, json, seed) {
  const { cm } = fresh(b);
  const r0 = seeded(hash32(`cont|${seed}`));
  Math.random = r0;
  try {
    let s = JSON.parse(json);
    let r = cm.resumeMatch(s); s = r.state;
    for (let g = 0; g < 200 && s.week < s.calendar.length; g++) { r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; }
    return { json: JSON.stringify(s), draws: r0.n };
  } finally { Math.random = real; }
}
if (!fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) { console.log(`oldprobe: CANNOT RUN: no base at ${BASE_ROOT}`); process.exit(2); }
const B = await bundle(BASE_ROOT, false), H = await bundle(ROOT, false), HT = await bundle(ROOT, true);
let bad = 0, n = 0, draws = 0;
for (const club of CLUBS) for (let seed = 0; seed < SEEDS; seed++) {
  const saved = make(B, club, seed);
  const live = JSON.parse(saved).live;
  if (!live) { console.log(`  FAIL ${club} ${seed}: main's save is not paused at half time`); bad += 1; continue; }
  const a = cont(B, saved, seed), h = cont(H, saved, seed), t = cont(HT, saved, seed);
  n += 1; draws += a.draws;
  const same = a.json === h.json && a.json === t.json && a.draws === h.draws && a.draws === t.draws;
  if (!same) { bad += 1; console.log(`  FAIL ${club} seed ${seed}: main ${a.json.length}/${a.draws}, branch ${h.json.length}/${h.draws}, branch+module ${t.json.length}/${t.draws}`); }
  else console.log(`  ok ${club} seed ${seed}: week ${live.week} half time save, the rest of the season equal (${a.json.length} chars, ${a.draws} draws)`);
}
console.log(bad ? `oldprobe: RED (${bad} of ${n})` : `oldprobe: all green (${n} half time saves from main, ${draws} draws, equal on the branch with and without the module)`);
process.exit(bad ? 1 : 0);
