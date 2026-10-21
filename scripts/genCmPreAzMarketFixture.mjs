/* Round 1339: the pre AZ market fixture (scripts/data/cmPreAzMarketFixture.json).
 *
 * WHY. A Club Manager career started before Release AZ (every career started before 2026-10-13 18:23 EDT) has no
 * world seed, and its transfer market listed men at the club you manage who are not in your squad: the bake's men
 * beyond the 26 a squad starts with, and from the next season the men you sold. scripts/simCmOwnClubMarket.mjs
 * proves the round's rule on real saves of such careers, written by the engine of that time, never by hand.
 *
 * WHAT IT WRITES, from the source of 36cc9ffe (Record Release BB, the first parent of the AZ merge 5ec5a724; the
 * src of c9c77eba and 36cc9ffe are identical), in a fresh vm context with the held clock and the counter tape of
 * scripts/simCmUnseededWorld.mjs, each save the raw string that engine's saveCareer wrote (saveVersion 3, no seed):
 *   A  Real Madrid, now, season 1, saved after the first league match with the summer window open (the extras);
 *   B  Real Madrid, now: the two most valuable men listed and sold to the AI bids the base engine drew (a bounded
 *      search over tape seeds, the seed and the men printed), two seasons played out, saved in season 3's summer;
 *   C  Real Madrid, now, season 1: a talk opened for the first own club extra on the market, saved mid talk.
 * `expect` records each save's own club rows on the base market and how many sit in its first 120.
 * Exit 0 written, 2 could not run (the base commit missing, or a save that cannot show the defect).
 *
 *   node scripts/genCmPreAzMarketFixture.mjs [out file]     (run on a runner, twice, and compare the bytes)
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
const BASE = '36cc9ffe7e13ed1c1e5f994b6a3998c8e3206e2c';
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'scripts/data/cmPreAzMarketFixture.json');
const CLUB = 'Real Madrid';
const cannot = why => { console.log(`genCmPreAzMarketFixture: cannot run: ${why}`); process.exit(2); };
const lf = s => s.split('\r\n').join('\n');
const sha = s => createHash('sha256').update(s).digest('hex');
try { execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); } catch { cannot(`the commit ${BASE.slice(0, 8)} is not in this clone (fetch the whole history, fetch-depth 0)`); }

async function engine() {
  const plugin = {
    name: 'pre-az-source',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        const text = lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'pre-az.ts', loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const script = new vm.Script(out.outputFiles[0].text, { filename: 'pre-az.cjs' });
  return async () => {
    const module = { exports: {} };
    const store = new Map();
    const NOW = 1791633600000;
    class HeldDate extends Date {
      constructor(...a) { super(...(a.length ? a : [NOW])); }
      static now() { return NOW; }
    }
    const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
      console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
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

const fresh = await engine();
const PLAY = { skipHalftime: true, noCoach: true };
/* The market rows at the managed club, in market order, and how many of them sit in its first 120. */
function ownRows(M, s) {
  const market = M.cm.buildMarket(s);
  const rows = market.map((p, i) => ({ name: p.name, i })).filter((x, i) => market[i].club === s.clubName);
  return { names: rows.map(x => x.name), inFirst120: rows.filter(x => x.i < 120).length, best: rows.length ? rows[0].i : null };
}
function saveRaw(M, s, label) {
  M.store.clear();
  if (!M.cm.saveCareer(s)) cannot(`save ${label}: the base engine refused to save it`);
  const raw = M.store.get(M.cm.SAVE_KEY);
  const parsed = JSON.parse(raw);
  if (parsed.saveVersion !== 3 || 'worldSeed' in parsed || 'worldRoster' in parsed) cannot(`save ${label}: not a saveVersion 3 save without a seed`);
  return raw;
}
function toEnd(M, s, seed) {
  for (let i = 0; i < 220; i += 1) {
    const r = tape(seed + i * 7919, () => M.cm.playNextEntry(s, PLAY));
    if (r.kind === 'seasonOver') return r.state;
    s = r.state;
  }
  cannot('a season did not end in 220 entries');
}

const saves = {}, expect = {}, searched = {};
const t0 = Date.now();

/* A: the extras. Played until the first league match is behind it, the summer window still open. */
{
  const M = await fresh();
  let s = tape(0x1339a, () => M.cm.startCareer(CLUB, 'now'));
  if (!ownRows(M, s).names.length) cannot(`${CLUB} on the base engine lists no man at its own club beyond its squad`);
  for (let k = 0; k < 30; k += 1) {
    const played = s.calendar[s.week]?.type;
    s = tape(0x1339a + (k + 1) * 7919, () => M.cm.playNextEntry(s, PLAY)).state;
    if (played === 'league') break;
  }
  if (s.transferWindow !== 'summer') cannot(`save A: the summer window closed before the first league match (${s.transferWindow})`);
  saves.A = saveRaw(M, s, 'A');
  expect.A = { club: CLUB, season: s.season, week: s.week, ...ownRows(M, s) };
}

/* B: the sold men. The two most valuable men are listed and sold to bids the base engine draws itself; a seed
   whose window does not bid for both, or whose season 3 market holds no own club man in its first 120, is
   passed over and named. */
{
  const tried = [];
  for (let t = 0; t < 24 && !saves.B; t += 1) {
    const seed = 0x1339b0 + t;
    const M = await fresh();
    let s = tape(seed, () => M.cm.startCareer(CLUB, 'now'));
    const top = s.squad.filter(p => !p.onLoan).sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.id.localeCompare(b.id)).slice(0, 2);
    s = tape(seed + 1, () => top.reduce((cur, p) => M.cm.setTransferStatus(cur, p.id, 'listed'), s));
    s = tape(seed + 2, () => { const next = { ...s }; M.cm.generateIncomingBids(next); return next; });
    const sold = [];
    for (const [i, p] of top.entries()) {
      const next = tape(seed + 3 + i, () => M.cm.acceptBid(s, p.id));
      if (next) { s = next; sold.push(p.name); }
    }
    if (sold.length < 2) { tried.push(`seed ${seed.toString(16)}: sold ${sold.length} of 2`); continue; }
    for (let season = 0; season < 2; season += 1) {
      s = toEnd(M, s, seed + 101 + season * 977);
      s = tape(seed + 51 + season, () => M.cm.finishSeason(s).state);
      s = tape(seed + 61 + season, () => M.cm.startNextSeason(s));
    }
    const own = ownRows(M, s);
    if (!own.inFirst120) { tried.push(`seed ${seed.toString(16)}: season ${s.season} has no own club man in the first 120`); continue; }
    if (s.transferWindow !== 'summer') cannot(`save B: season ${s.season} did not open in the summer window`);
    saves.B = saveRaw(M, s, 'B');
    expect.B = { club: CLUB, season: s.season, week: s.week, sold, soldAtOwnClub: sold.filter(n => own.names.includes(n)), ...own };
    searched.B = { seed: `0x${seed.toString(16)}`, passedOver: tried };
    console.log(`  B: seed 0x${seed.toString(16)} sold ${sold.join(' and ')}; ${tried.length} seeds passed over`);
  }
  if (!saves.B) cannot(`save B: no seed of 24 sold both men and kept an own club man in season 3's first 120 (${tried.join('; ')})`);
}

/* C: a talk the base engine opened for a man at my own club, saved mid talk (open question 3's evidence). */
{
  const M = await fresh();
  let s = tape(0x1339c, () => M.cm.startCareer(CLUB, 'now'));
  const mine = new Set(s.squad.map(p => p.name));
  const extra = M.cm.buildMarket(s).find(p => p.club === CLUB && !mine.has(p.name));
  if (!extra) cannot('save C: no own club extra on the base market');
  const opened = tape(0x1339c + 1, () => M.cm.startNegotiation(s, extra));
  if (!opened?.negotiation) cannot(`save C: the base engine would not open a talk for ${extra.name}`);
  s = opened;
  saves.C = saveRaw(M, s, 'C');
  expect.C = { club: CLUB, season: s.season, week: s.week, talk: extra.name, phase: s.negotiation.phase ?? null, ...ownRows(M, s) };
}

const file = { round: 1339, base: BASE, made: process.env.FIXTURE_MADE || 'by hand (not for committing)',
  note: 'Raw saves written by the Club Manager engine of 36cc9ffe (before Release AZ): never edit by hand; rerun scripts/genCmPreAzMarketFixture.mjs on a runner.',
  expect, searched, saves };
const text = `${JSON.stringify(file, null, 1)}\n`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
for (const k of Object.keys(saves)) console.log(`  ${k}: ${expect[k].club}, season ${expect[k].season} week ${expect[k].week}, ${expect[k].names.length} own club rows (${expect[k].inFirst120} in the first 120, best at ${expect[k].best}), ${saves[k].length} bytes`);
console.log(`genCmPreAzMarketFixture: wrote ${path.relative(ROOT, OUT)} (${text.length} bytes, sha256 ${sha(text)}) from ${BASE.slice(0, 8)} in ${Math.round((Date.now() - t0) / 1000)}s`);
