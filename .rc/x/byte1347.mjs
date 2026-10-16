// Round 1347 review (run lens): is the default path byte identical to main over a fleet, and does an old save
// written by main's engine load and play on to the same bytes on this branch?
// Run from the repo root: node .rc/x/byte1347.mjs [BASE_SHA]. Exit 0 all equal, 1 a difference, 2 could not run.
// Every step of every journey draws from the same counter stream on both engines; the whole state is compared as
// JSON text after every step, with the number of Math.random draws, and the bytes a save writes.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.argv[2] || '1027b08c';
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const lf = s => s.split('\r\n').join('\n');
const CONTROL = process.env.BYTE_CONTROL || '';
let controlled = 0;

async function engine(label, base) {
  let fromGit = 0;
  const plugin = {
    name: 'byte-source',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        let text;
        if (base) {
          try { text = lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 27 })); fromGit += 1; } catch { return null; }
        } else text = lf(fs.readFileSync(args.path, 'utf8'));
        /* The negative control: the branch's group tables sorted by points the wrong way round. */
        if (!base && CONTROL === 'pts' && rel === 'src/lib/clubManagerUclGroups.ts') {
          const from = 'const byPts = [...rows].sort((a, b) => b.pts - a.pts ||';
          if (text.split(from).length - 1 !== 1) throw new Error('control pts: its line is not there exactly once');
          text = text.replace(from, 'const byPts = [...rows].sort((a, b) => a.pts - b.pts ||');
          controlled += 1;
        }
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `byte-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const code = out.outputFiles[0].text;
  console.log(`  engine ${label}: ${base ? `${fromGit} files from ${BASE}` : 'this tree'}, bundle ${sha(code)} (${code.length} bytes)`);
  const script = new vm.Script(code, { filename: `byte-${label}.cjs` });
  return {
    async fresh() {
      const module = { exports: {} };
      const store = new Map();
      const NOW = 1791633600000;
      class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

function tape(seed, action) {
  let state = seed >>> 0; let draws = 0;
  const original = Math.random;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    draws += 1; return ((v ^ v >>> 14) >>> 0) / 4294967296;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}

async function journey(E, input, seed) {
  const M = await E.fresh();
  const steps = [];
  let s = null; let k = 0; let firstRaw = null;
  const step = (label, fn) => {
    k += 1;
    const r = tape((seed + k * 7919) >>> 0, () => fn(s));
    const got = r.value ?? {};
    if (got.state) s = got.state;
    steps.push({ label, json: JSON.stringify(s), draws: r.draws, saved: got.saved ?? null });
  };
  const reload = () => step('save-and-reload', cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return {};
    const raw = M.store.get(M.cm.SAVE_KEY);
    if (firstRaw === null) firstRaw = raw;
    const saved = sha([...M.store.entries()].sort());
    return { state: M.cm.loadCareer(), saved };
  });
  const play = (n, label) => { for (let i = 0; i < n; i += 1) step(`${label}-${i + 1}`, cur => ({ state: M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }).state })); };
  const toEnd = label => {
    for (let i = 0; i < 240; i += 1) {
      let over = false;
      step(`${label}-${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (over) return;
    }
    throw new Error('a season did not end in 240 entries');
  };
  step('start', () => ({ state: M.cm.startCareer(input.club, input.era) }));
  play(8, 'early'); reload(); toEnd('rest');
  step('finish', cur => ({ state: M.cm.finishSeason(cur).state })); reload();
  step('rollover', cur => ({ state: M.cm.startNextSeason(cur) }));
  play(6, 'next'); reload();
  return { steps, firstRaw, M, ucl: s?.uclGroup ? 'participant' : 'watcher' };
}

/* An old save: the raw bytes main's engine wrote after eight entries, loaded and played on by both engines. */
async function oldSave(E, raw, seed) {
  const M = await E.fresh();
  M.store.clear(); M.store.set(M.cm.SAVE_KEY, raw);
  const out = [];
  let s = tape(seed, () => M.cm.loadCareer()).value;
  out.push(JSON.stringify(s));
  for (let i = 0; i < 12 && s; i += 1) { s = tape(seed + i + 1, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }).state).value; out.push(JSON.stringify(s)); }
  return out;
}

const FLEET = [
  { club: 'Real Madrid' }, { club: 'Arsenal' }, { club: 'Chelsea' }, { club: 'Everton' }, { club: 'Hoffenheim' },
  { club: 'Arsenal', era: 'era2005' }, { club: 'Everton', era: 'era2005' },
  { club: 'Arsenal', era: 'era2010' }, { club: 'Everton', era: 'era2010' },
  { club: 'Arsenal', era: 'era2015' }, { club: 'Everton', era: 'era2015' },
  { club: 'Chelsea', era: 'era2020' }, { club: 'Everton', era: 'era2020' },
];
const SEEDS = (process.env.BYTE_SEEDS || '1,2').split(',').map(Number);
try {
  const A = await engine('main', true);
  const B = await engine('branch', false);
  if (CONTROL && controlled !== 1) throw new Error(`control ${CONTROL} edited ${controlled} files, one expected`);
  if (CONTROL) console.log(`  control ${CONTROL}: the branch engine's group tables sort points upside down`);
  let compared = 0; let diffs = 0; let oldCompared = 0;
  const kinds = { participant: 0, watcher: 0 };
  for (const f of FLEET) for (const seed of SEEDS) {
    const t0 = Date.now();
    const a = await journey(A, f, seed);
    const b = await journey(B, f, seed);
    kinds[a.ucl] += 1;
    let bad = '';
    if (a.steps.length !== b.steps.length) bad = `steps ${a.steps.length} vs ${b.steps.length}`;
    else for (let i = 0; i < a.steps.length && !bad; i += 1) {
      const x = a.steps[i]; const y = b.steps[i]; compared += 1;
      if (x.json !== y.json) bad = `step ${i} ${x.label}: state differs`;
      else if (x.draws !== y.draws) bad = `step ${i} ${x.label}: draws ${x.draws} vs ${y.draws}`;
      else if (x.saved !== y.saved) bad = `step ${i} ${x.label}: saved bytes differ`;
    }
    const oa = await oldSave(A, a.firstRaw, seed);
    const ob = await oldSave(B, a.firstRaw, seed);
    oldCompared += oa.length;
    if (!bad && JSON.stringify(oa) !== JSON.stringify(ob)) bad = 'the old save loads or plays on differently';
    if (bad) diffs += 1;
    console.log(`  ${f.era ?? 'today'} ${f.club} seed ${seed} (${a.ucl}, ${a.steps.length} steps, save ${a.firstRaw?.length ?? 0} bytes, ${Date.now() - t0} ms): ${bad || 'equal'}`);
  }
  console.log(`byte1347: ${diffs === 0 ? 'EQUAL' : 'DIFFERENT'}: ${FLEET.length * SEEDS.length} journeys (${kinds.participant} participant, ${kinds.watcher} watcher), ${compared} steps and ${oldCompared} old save states compared, ${diffs} differing`);
  process.exit(diffs === 0 ? 0 : 1);
} catch (e) {
  console.log(`byte1347: cannot run: ${e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e}`);
  process.exit(2);
}
