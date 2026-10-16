/* Reviewer probe (Round 1342, runner lens): saves written by the BASE engine open and play on the branch exactly as
 * they do on the base. Runs on a runner from the repo root with BASE_ROOT = a worktree of d4f2c6f6.
 * Variants of each base save: as written, no startOptions at all (a pre Round 514 save), a broken block (v 0),
 * and a saved zero (loadCareer's repair). For each: loadCareer on both trees equal, summarize equal, then the
 * loaded career played on (same seeded stream) to the end of the season and one more, every season end equal and
 * the draw count equal. Also: a branch save carrying noSack, opened and written back by the BASE engine, keeps it.
 * Exit 0 all equal, 1 any difference, 2 could not run. */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_ROOT = path.resolve(process.env.BASE_ROOT || '/tmp/base-o');
const SEEDS = Number(process.env.SEEDS || 4);
if (!fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) { console.log('oldsave: CANNOT RUN: no base tree'); process.exit(2); }
const P = (root, f) => JSON.stringify(path.join(root, f).split(path.sep).join('/'));
async function bundleOf(root, name) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `oldsave-${name}-`));
  const entry = path.join(work, 'entry.ts');
  fs.writeFileSync(entry, [['cm', 'clubManager'], ['st', 'clubManagerStart'], ['sl', 'clubManagerSlots']]
    .map(([a, f]) => `export * as ${a} from ${P(root, `src/lib/${f}.ts`)};`).join('\n') + '\n');
  const out = path.join(work, 'bundle.cjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  return out;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
const fresh = b => { delete req.cache[req.resolve(b)]; store.clear(); return req(b); };
function seeded(seed) {
  let a = seed >>> 0;
  const f = () => { f.n += 1; a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.n = 0; return f;
}
function onStream(seed, fn) { const saved = Math.random; const r = seeded(seed); Math.random = r; try { return { value: fn(), draws: r.n }; } finally { Math.random = saved; } }

const HEAD = await bundleOf(ROOT, 'head');
const BASE = await bundleOf(BASE_ROOT, 'base');
let fails = 0, compared = 0;
const fail = m => { fails += 1; if (fails <= 30) console.log(`  FAIL: ${m}`); };

/* Play n entries (rolling seasons over), return the state. */
function playN(cm, s, n) {
  for (let i = 0; i < n; i += 1) {
    if (s.sacked) return s;
    const res = cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind === 'seasonOver') s = cm.startNextSeason(cm.finishSeason(s).state);
  }
  return s;
}
/* Open the raw save on one tree and play on: the loaded JSON, the summary, every season end, the draws. */
function openAndPlay(b, raw, seed) {
  const { cm, sl } = fresh(b);
  localStorage.setItem(cm.SAVE_KEY, raw);
  const loaded = cm.loadCareer();
  const summary = JSON.stringify(sl.summarize(raw));
  const ends = [];
  const { draws } = onStream(seed, () => {
    let s = loaded;
    if (!s) return;
    for (let k = 0; k < 2; k += 1) {
      for (let g = 0; g < 160; g += 1) {
        if (s.sacked) { ends.push('sacked ' + JSON.stringify(s)); return; }
        const res = cm.playNextEntry(s, { skipHalftime: true });
        s = res.state;
        if (res.kind === 'seasonOver') break;
      }
      const f = cm.finishSeason(s).state;
      ends.push(JSON.stringify(f));
      s = cm.startNextSeason(f);
    }
  });
  return { loaded: JSON.stringify(loaded), summary, ends, draws };
}

const { cm: cm0 } = fresh(BASE);
const CLUBS = [];
for (const id of ['premier', 'laliga', 'seriea']) {
  const list = cm0.playableClubs(id);
  for (const c of [list[0], list[Math.floor(list.length / 2)], list[list.length - 1]]) CLUBS.push(c.name);
}
console.log(`oldsave: ${CLUBS.length} clubs x ${SEEDS} seeds x 4 variants, base ${BASE_ROOT}`);
const t0 = performance.now();
for (const club of CLUBS) for (let seed = 0; seed < SEEDS; seed += 1) {
  const sd = 31000 + seed * 131 + CLUBS.indexOf(club);
  const n = 8 + ((seed * 17 + CLUBS.indexOf(club) * 7) % 45);
  const { cm } = fresh(BASE);
  const s = onStream(sd, () => playN(cm, cm.startCareer(club), n)).value;
  const variants = {
    asWritten: s,
    noBlock: (() => { const c = JSON.parse(JSON.stringify(s)); delete c.startOptions; return c; })(),
    broken: { ...JSON.parse(JSON.stringify(s)), startOptions: { v: 0 } },
    zero: { ...JSON.parse(JSON.stringify(s)), boardConfidence: 0 },
  };
  for (const [v, c] of Object.entries(variants)) {
    const raw = JSON.stringify(c);
    const a = openAndPlay(BASE, raw, sd + 7), h = openAndPlay(HEAD, raw, sd + 7);
    compared += 1;
    const tag = `${club} seed ${seed} after ${n} entries, ${v}`;
    if (a.loaded !== h.loaded) fail(`${tag}: loadCareer differs`);
    if (a.summary !== h.summary) fail(`${tag}: summarize differs (${a.summary.slice(0, 80)} vs ${h.summary.slice(0, 80)})`);
    if (a.draws !== h.draws) fail(`${tag}: ${a.draws} draws on the base, ${h.draws} here`);
    if (a.ends.length !== h.ends.length) fail(`${tag}: ${a.ends.length} season ends on the base, ${h.ends.length} here`);
    for (let i = 0; i < Math.min(a.ends.length, h.ends.length); i += 1) if (a.ends[i] !== h.ends[i]) { fail(`${tag}: season end ${i + 1} differs`); break; }
    if (h.ends.some(j => j.includes('"noSack"'))) fail(`${tag}: a base save picked up the key`);
  }
}
/* A branch save with the key, opened and written back by the base engine (an old tab): does the key survive? */
let kept = 0, keyed = 0;
for (const club of CLUBS) {
  const { cm, st } = fresh(HEAD);
  const s = onStream(41000 + CLUBS.indexOf(club), () => playN(cm, st.turnOnNoSack(cm.startCareer(club)), 12)).value;
  const raw = JSON.stringify(s);
  const { cm: bcm } = fresh(BASE);
  localStorage.setItem(bcm.SAVE_KEY, raw);
  const back = bcm.loadCareer();
  keyed += 1;
  if (back && back.startOptions && back.startOptions.noSack === 1) kept += 1;
}
console.log(`   ${compared} base saves compared in ${((performance.now() - t0) / 1000).toFixed(0)} s; branch saves whose key survives a base load: ${kept} of ${keyed}`);
console.log(fails ? `oldsave: FAIL (${fails} differences)` : 'oldsave: PASS (every base save opens and plays on the branch as on the base)');
process.exit(fails ? 1 : 0);
