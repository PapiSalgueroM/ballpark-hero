/* Round 1508: the old careers fixture (scripts/data/cmOldCareersWorldFixture.json).
 *
 * WHY. A Club Manager career started before the 13 October update (Release BC) has no world seed. Round 1508 brings
 * such a career into the living world at its next summer (adoptLivingWorld in src/lib/clubManager.ts), and the
 * lead's decision 4 asks for proof on real saves of such careers, written by the engines of that time, never by hand:
 * one from before Release AZ, one from between AZ and BC. scripts/simCmOldCareersWorld.mjs plays both across their
 * next summer on this tree, and scripts/playCmOldCareersWorld.mjs walks the first one on a phone.
 *
 * WHAT IT WRITES, each save the raw string the named engine's saveCareer wrote (no seed and no ledger, asserted),
 * in a fresh vm context with the held clock and the counter tape of scripts/simCmUnseededWorld.mjs:
 *   pre  Arsenal, now, started and played on 36cc9ffe (Record Release BB, the first parent of the AZ merge 5ec5a724,
 *        Round 1339's fixture engine) to about seven tenths of its first season, past its January window;
 *   mid  Bayern Munich, the 2015-16 world, started on 36cc9ffe (a career from before the update), played to about
 *        three tenths of its season and saved there, then opened on c28b078b (the Release BC join after the AZ merge,
 *        before BC was published at dec9075b) and played on to about seven tenths, past January, and saved by that
 *        engine. No engine with AZ in it ever started an unseeded career (Round 1250 seeds every new one), so an old
 *        career carried on by such an engine is what a save "from between AZ and BC" can be.
 * Exit 0 written, 2 could not run (a commit missing, or a save that is not an old career's).
 *
 *   node scripts/genCmOldCareersWorldFixture.mjs [out file]     (run on a runner, twice, and compare the bytes)
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRE = '36cc9ffe7e13ed1c1e5f994b6a3998c8e3206e2c';
const MID = 'c28b078b';
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'scripts/data/cmOldCareersWorldFixture.json');
const cannot = why => { console.log(`genCmOldCareersWorldFixture: cannot run: ${why}`); process.exit(2); };
const lf = s => s.split('\r\n').join('\n');
const sha = s => createHash('sha256').update(s).digest('hex');
let MID_FULL = '';
try {
  execFileSync('git', ['cat-file', '-e', `${PRE}^{commit}`], { cwd: ROOT, stdio: 'ignore' });
  MID_FULL = execFileSync('git', ['rev-parse', `${MID}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).trim();
} catch { cannot('a fixture commit is not in this clone (fetch the whole history, fetch-depth 0)'); }

/* One engine from one commit's src, run in a fresh context per save. */
async function engine(commit) {
  const plugin = {
    name: `old-careers-${commit.slice(0, 8)}`,
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        const text = lf(execFileSync('git', ['show', `${commit}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `old-${commit.slice(0, 8)}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const script = new vm.Script(out.outputFiles[0].text, { filename: `old-${commit.slice(0, 8)}.cjs` });
  return async () => {
    const module = { exports: {} }, store = new Map(), NOW = 1791633600000;
    class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
    const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
      console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
      setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
      localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
    script.runInContext(ctx);
    await module.exports.eras.ensureAllEraRosters();
    return { ...module.exports, store };
  };
}

/* The counter generator of scripts/simCmUnseededWorld.mjs, each step on its own stretch of the stream. */
function tape(seed, action) {
  let state = seed >>> 0;
  const original = Math.random;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    return ((v ^ v >>> 14) >>> 0) / 4294967296;
  };
  try { return action(); } finally { Math.random = original; }
}
const PLAY = { skipHalftime: true, noCoach: true };
/** Plays entries until the week reaches `share` of the calendar (never past the season's end). */
function playTo(M, s, share, seed) {
  for (let i = 0; i < 260; i += 1) {
    if (s.week >= Math.floor(s.calendar.length * share)) return s;
    const r = tape(seed + i * 7919, () => M.cm.playNextEntry(s, PLAY));
    if (r.kind === 'seasonOver') cannot(`the season ended before ${share} of it was played`);
    s = r.state;
    if (s.sacked) cannot('the manager was sacked while the fixture was played');
  }
  cannot('the fixture did not reach its week in 260 entries');
}
function saveRaw(M, s, label) {
  M.store.clear();
  if (!M.cm.saveCareer(s)) cannot(`save ${label}: the engine refused to save it`);
  const raw = M.store.get(M.cm.SAVE_KEY);
  const parsed = JSON.parse(raw);
  if ('worldSeed' in parsed || 'worldRoster' in parsed) cannot(`save ${label}: it carries a seed or a ledger, so it is not an old career's`);
  return { raw, parsed };
}

const t0 = Date.now();
const saves = {}, expect = {};
const oldEngine = await engine(PRE), midEngine = await engine(MID_FULL);

/* pre: Arsenal on the engine from before Release AZ. */
{
  const M = await oldEngine();
  let s = tape(0x1508a, () => M.cm.startCareer('Arsenal', 'now'));
  s = playTo(M, s, 0.7, 0x1508a + 1);
  const { raw, parsed } = saveRaw(M, s, 'pre');
  saves.pre = raw;
  expect.pre = { commit: PRE, club: parsed.clubName, era: parsed.eraId ?? 'now', season: parsed.season, week: parsed.week, weeks: parsed.calendar.length, window: parsed.transferWindow ?? null, bytes: raw.length };
}

/* mid: Bayern Munich in 2015-16, started before the update and carried on by an engine with AZ in it. */
{
  const A = await oldEngine();
  let s = tape(0x1508b, () => A.cm.startCareer('Bayern Munich', 'era2015'));
  s = playTo(A, s, 0.3, 0x1508b + 1);
  const first = saveRaw(A, s, 'mid (the old engine)');
  const B = await midEngine();
  B.store.clear(); B.store.set(B.cm.SAVE_KEY, first.raw);
  s = tape(0x1508c, () => B.cm.loadCareer());
  if (!s) cannot(`the engine of ${MID} would not open the old save`);
  if (B.cm.worldSeedOf(s) !== undefined) cannot(`the engine of ${MID} gave the old save a seed on load`);
  s = playTo(B, s, 0.7, 0x1508c + 1);
  const { raw, parsed } = saveRaw(B, s, 'mid');
  saves.mid = raw;
  expect.mid = { commit: MID_FULL, startedOn: PRE, startedWeek: first.parsed.week, club: parsed.clubName, era: parsed.eraId ?? 'now', season: parsed.season, week: parsed.week, weeks: parsed.calendar.length, window: parsed.transferWindow ?? null, bytes: raw.length };
}

const file = { round: 1508, made: process.env.FIXTURE_MADE || 'by hand (not for committing)',
  note: 'Raw saves of Club Manager careers from before the 13 October update, written by the engines named in expect: never edit by hand; rerun scripts/genCmOldCareersWorldFixture.mjs on a runner.',
  expect, saves };
const text = `${JSON.stringify(file, null, 1)}\n`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
for (const k of Object.keys(saves)) console.log(`  ${k}: ${expect[k].club} (${expect[k].era}), season ${expect[k].season} week ${expect[k].week} of ${expect[k].weeks}, window ${expect[k].window}, ${expect[k].bytes} bytes, by ${expect[k].commit.slice(0, 8)}`);
console.log(`genCmOldCareersWorldFixture: wrote ${path.relative(ROOT, OUT)} (${text.length} bytes, sha256 ${sha(text)}) in ${Math.round((Date.now() - t0) / 1000)}s`);
