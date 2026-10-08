/* Review probe helpers (shootout review, Release AM). Never committed.
   Bundles one tree's Club Manager engine and hands it back as a module.
   Reads nothing from the network: the supabase client is stubbed. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export const ROOT = process.cwd().replaceAll('\\', '/');
export const MAIN_SHA = process.env.MAIN_SHA || 'c623e77d22541ac88c30f48b078a9a8a9c699e1d';
export const WORK = (process.env.PROBE_WORK || fs.mkdtempSync(path.join(os.tmpdir(), 'shoprobe-'))).replaceAll('\\', '/');
fs.mkdirSync(WORK, { recursive: true });
export const OUT = (process.env.RC_OUT || WORK).replaceAll('\\', '/');
fs.mkdirSync(OUT, { recursive: true });

let slot = {};
globalThis.localStorage = {
  getItem: k => (k in slot ? slot[k] : null),
  setItem: (k, v) => { slot[k] = String(v); },
  removeItem: k => { delete slot[k]; },
  clear: () => { slot = {}; },
};
export const storage = { dump: () => ({ ...slot }), load: o => { slot = { ...o }; } };

const sbStub = { name: 'sb', setup(b) {
  b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
  b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline probe"); } }); export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";' }));
} };

/** Bundle <treeRoot>/src/lib/<file> (or an explicit engine path) with '@' on that tree's src. */
export async function bundleEngine(treeRoot, tag, enginePath, extra = []) {
  const tree = treeRoot.replaceAll('\\', '/');
  const entry = `${WORK}/${tag}.entry.mjs`;
  const out = `${WORK}/${tag}.bundle.mjs`;
  const eng = (enginePath || `${tree}/src/lib/clubManager.ts`).replaceAll('\\', '/');
  fs.writeFileSync(entry, [`export * as cm from '${eng}';`, ...extra.map(([name, rel]) => `export * as ${name} from '${tree}/${rel}';`)].join('\n') + '\n');
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': `${tree}/src` }, plugins: [sbStub] });
  return import(pathToFileURL(out).href);
}

/** origin/main's src, out of git, into a folder of its own. */
export function mainTree() {
  const dir = `${WORK}/main-tree`;
  if (fs.existsSync(`${dir}/src/lib/clubManager.ts`)) return dir;
  fs.mkdirSync(dir, { recursive: true });
  const tar = `${WORK}/main-src.tar`;
  execFileSync('git', ['archive', '-o', tar, MAIN_SHA, 'src'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  /* cwd plus a bare file name, so no drive letter reaches tar on Windows. */
  execFileSync('tar', ['-xf', 'main-src.tar', '-C', 'main-tree'], { cwd: WORK, stdio: ['ignore', 'pipe', 'inherit'] });
  return dir;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const FIXED_NOW = Date.UTC(2026, 9, 1);
export function withSeed(seed, fn) {
  const saved = Math.random;
  const savedNow = Date.now;
  Math.random = mulberry32(seed >>> 0);
  Date.now = () => FIXED_NOW;
  try { return fn(); } finally { Math.random = saved; Date.now = savedNow; }
}
export const sortedJSON = value => JSON.stringify(value, (_k, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

/** Sim a fresh career to its first cup week (the harness's own walk). */
export function reachCup(engine, club, baseSeed) {
  return withSeed(baseSeed, () => {
    const start = engine.startCareer(club);
    const cupIdx = start.calendar.findIndex(e => e.type === 'cup');
    if (cupIdx < 0) throw new Error(`${club} has no cup entry`);
    let s = start;
    for (let guard = 0; s.week < cupIdx && guard < 80; guard++) {
      const r = engine.playNextEntry(s, { skipHalftime: true, untilWeek: cupIdx });
      s = r.state;
      if (r.kind === 'reached') break;
      if (r.kind !== 'match') throw new Error(`could not sim to the cup week: ${r.kind} at week ${s.week}`);
    }
    if (s.week !== cupIdx) throw new Error(`stopped at week ${s.week}, wanted ${cupIdx}`);
    return s;
  });
}
export const cupOppOf = s => s.cupDraw?.[s.calendar[s.week]?.cupRound ?? s.calendar.find(e => e.type === 'cup')?.cupRound];
/** thin, full (names an eleven), noeleven (eleven or more names, no eleven), empty */
export function classOf(roster) {
  const keepers = roster.filter(p => p.p === 'GK').length;
  if (!roster.length) return 'empty';
  if (keepers >= 1 && roster.length - keepers >= 10) return 'full';
  return roster.length >= 11 ? 'noeleven' : 'thin';
}
let failures = 0;
export const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
export const done = name => {
  if (failures) { console.log(`\n${name}: ${failures} FAILURE(S)`); process.exit(1); }
  console.log(`\n${name}: all checks passed`);
};
