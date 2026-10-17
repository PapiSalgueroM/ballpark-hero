/* Club Manager difficulty: Normal, Hard and Legend (Round 1501).

   A player's report on /club-manager, 2026-10-14: "plsss make the game harder
   its simply way too easy". The levels are picked on the Dugout step and fixed
   for the career; the dials are one table, CM_DIFFICULTY_DIALS in
   src/lib/clubManagerDifficulty.ts. Normal is the game as it was, to the byte.

   Sections (SECTION=<n> runs one, SECTION=all the default set; MEASURE=1 adds 0):
     0) measure: the Normal table (or LEVELS=normal,hard,legend) per tier and
        driver, over SEEDS and SEASONS. Asserts only that no cell is empty.
     1) the table: Normal is the identity row, each level strictly harder than
        the one before on every dial, every dial inside the caps the brief set,
        the two modules (comments stripped) name no growth, potential or rating,
        and clubManagerDifficulty.ts imports at runtime only files that do not
        import the engine back.
   Later sections are added by the steps that build the levers (see below).

   Negative controls (CM_DIFF_CONTROL), each patched in memory or into the
   bundle, never into src:
     flat   Hard's pain set to 1. Section 1 must go red.

   Run: node scripts/simCmDifficulty.mjs     (SECTION=1, MEASURE=1 SEEDS=4 SEASONS=10)
   Exit 0 green, 1 red (or a control fired), 2 could not run.
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdiff-')).replaceAll('\\', '/');
const CONTROL = process.env.CM_DIFF_CONTROL || '';
const CONTROLS = ['flat'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.log(`CM_DIFF_CONTROL=${CONTROL} is not a control this harness knows; could not run`);
  process.exit(2);
}
const num = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? Number(process.env[k]) : d);
const SECTIONS = (process.env.SECTION || 'all') === 'all'
  ? [...(process.env.MEASURE === '1' ? ['0'] : []), '1']
  : String(process.env.SECTION).split(',');

let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
/** Source with comments and string contents' comment look alikes out, so a guard reads code, not prose. */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ---- bundle the engine and the difficulty module together (one copy of each) ---- */
const ENTRY = `${TMP}/entry.mjs`;
const BUNDLE = `${TMP}/bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as engine from '${ROOT_URL}/src/lib/clubManager.ts';
export * as difficulty from '${ROOT_URL}/src/lib/clubManagerDifficulty.ts';
export * as start from '${ROOT_URL}/src/lib/clubManagerStart.ts';
export * as asks from '${ROOT_URL}/src/lib/clubManagerBoardAsks.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const bundle = await import(pathToFileURL(BUNDLE).href);
const cm = bundle.engine, dif = bundle.difficulty, st = bundle.start, asks = bundle.asks;
const DIALS = dif.CM_DIFFICULTY_DIALS;
const LEVELS = ['normal', 'hard', 'legend'];
const KEYS = ['gain', 'pain', 'cut', 'cheque', 'wageRoom', 'mark', 'edge'];
const HARDER = { gain: -1, pain: 1, cut: 1, cheque: -1, wageRoom: -1, mark: 1, edge: 1 };

if (CONTROL === 'flat') {
  DIALS.hard.pain = 1;
  console.log('NEGATIVE CONTROL ON: Hard\'s pain is 1, the same as Normal\'s');
}

/* ---------- 1. the table ---------- */
function section1() {
  console.log('1) the table');
  const n = DIALS.normal;
  const identity = { gain: 1, pain: 1, cut: 0, cheque: 1, wageRoom: 1, mark: 1, edge: 0 };
  if (KEYS.every(k => n[k] === identity[k]) && Object.keys(n).length === KEYS.length) ok('Normal is the identity row');
  else fail(`Normal is not the identity row: ${JSON.stringify(n)}`);
  for (let i = 1; i < LEVELS.length; i++) {
    const a = DIALS[LEVELS[i - 1]], b = DIALS[LEVELS[i]];
    for (const k of KEYS) {
      const harder = HARDER[k] > 0 ? b[k] > a[k] : b[k] < a[k];
      if (!harder) fail(`${LEVELS[i]} is not strictly harder than ${LEVELS[i - 1]} on ${k} (${a[k]} then ${b[k]})`);
    }
  }
  /* The caps the brief set (decision 6): never gain under 0.6, cheque under 0.6, mark over 1.4,
     room under 0.85; the edge at most 3 on Hard and 5 on Legend; pain at most 1.5 and 1.8. */
  const caps = [
    ['hard', 'edge', v => v <= 3], ['legend', 'edge', v => v <= 5], ['hard', 'pain', v => v <= 1.5], ['legend', 'pain', v => v <= 1.8],
  ];
  for (const lv of ['hard', 'legend']) {
    const d = DIALS[lv];
    caps.push([lv, 'gain', v => v >= 0.6], [lv, 'cheque', v => v >= 0.6], [lv, 'mark', v => v <= 1.4], [lv, 'wageRoom', v => v >= 0.85]);
    if (!(d.cut > 0 && d.cut < 25)) fail(`${lv} cut ${d.cut} is outside 0 to 25`);
  }
  let capped = 0;
  for (const [lv, k, okFn] of caps) { if (okFn(DIALS[lv][k])) capped += 1; else fail(`${lv} ${k} = ${DIALS[lv][k]} is past its cap`); }
  ok(`${capped} of ${caps.length} caps hold`);
  const mods = ['src/lib/managerDifficulty.ts', 'src/lib/clubManagerDifficulty.ts'];
  for (const m of mods) {
    const c = code(read(m));
    const bad = ['growth', 'potential', 'rating', 'developmentRate', 'agePlayer', 'Math.random', 'Date.now'].filter(w => c.includes(w));
    if (bad.length) fail(`${m} names ${bad.join(', ')} in its code`); else ok(`${m}: no growth, potential, rating, draw or clock in its code`);
  }
  /* The import cycle rule: runtime imports only from files that do not import the engine back. */
  const imports = [...code(read('src/lib/clubManagerDifficulty.ts')).matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)].map(m => m[1]);
  const allowed = ['@/lib/clubManagerStart', '@/lib/clubManagerBoardVerdict', '@/lib/managerDifficulty'];
  const stray = imports.filter(p => !allowed.includes(p));
  if (imports.length === 0) fail('read no runtime import from clubManagerDifficulty.ts, the reader is broken');
  else if (stray.length) fail(`clubManagerDifficulty.ts imports ${stray.join(', ')} at runtime`);
  else ok(`clubManagerDifficulty.ts runtime imports: ${imports.join(', ')}`);
  for (const p of allowed.slice(0, 2)) {
    const file = `src/lib/${p.split('/').pop()}.ts`;
    const back = [...code(read(file)).matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gm)].map(m => m[1]);
    if (back.some(b => b.endsWith('/clubManager') || b.endsWith('/clubManagerDifficulty'))) fail(`${file} imports the engine back at runtime`);
    else ok(`${file} does not import the engine or this module at runtime`);
  }
}

/* ---------- the drivers (section 0 and section 4) ---------- */
/* One stream per career, the same on every level, so Normal, Hard and Legend at one club and seed are
   paired: nothing in the setup draws, so they differ only by what the levers change. Same mix as
   scripts/lib/seedRandom.mjs (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash32(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function withStream(seed, fn) {
  const saved = Math.random;
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = saved; }
}
const rebuildAsks = s => [...(s.boardObjectives ?? []).filter(o => !asks.isBoardAsk(o.id)), ...asks.buildBoardAsks(s)];
const asLevel = (s, level) => (level === 'normal' ? s : dif.setUpCareer(s, { level }, rebuildAsks));
const xiAvg = s => {
  const top = (s.squad ?? []).filter(p => !p.onLoan).map(p => p.rating).sort((a, b) => b - a).slice(0, 11);
  while (top.length < 11) top.push(60);
  return top.reduce((a, b) => a + b, 0) / 11;
};

/** The nine clubs: the first, the middle and the last of three leagues by expectation. */
function fleetClubs() {
  const out = [];
  for (const id of ['premier', 'laliga', 'seriea']) {
    const clubs = cm.playableClubs(id);
    out.push({ name: clubs[0].name, tier: 'big', expectation: clubs[0].expectation, league: id });
    const mid = clubs[Math.floor(clubs.length / 2)];
    out.push({ name: mid.name, tier: 'mid', expectation: mid.expectation, league: id });
    const last = clubs[clubs.length - 1];
    out.push({ name: last.name, tier: 'small', expectation: last.expectation, league: id });
  }
  return out;
}

/** One season under a driver. engaged renews every expiring deal and buys the best men the budget
    reaches in every window, from the market the page shows (marketForMe), while the squad is under 28;
    steady renews every deal and signs nobody. Both quick sim with the coach on. */
function playSeason(s, driver, rec) {
  for (let guard = 0; guard < 150; guard++) {
    for (const p of cm.expiringPlayers(s)) { const nx = cm.renewContract(s, p.id); if (nx) s = nx; }
    if (driver === 'engaged' && s.transferWindow) {
      const market = dif.marketForMe(s, cm.buildMarket(s)).filter(m => m.price <= s.budget).sort((a, b) => b.rating - a.rating);
      for (const mp of market.slice(0, 60)) {
        if (s.squad.length >= 28) break;
        if (mp.price > s.budget) continue;
        const nx = cm.buyPlayer(s, mp);
        if (!nx) continue;
        rec.fees += s.budget - nx.budget;
        rec.signings += 1;
        const clause = cm.releaseClauseOf(mp, s.season);
        if (clause !== null && clause < mp.price) rec.clauseUnder += 1;
        if (cm.loanEligible && cm.loanEligible(s, mp) && cm.loanFeeOf(mp) + 1.15 * (mp.value ?? mp.price) < mp.price) rec.loanUnder += 1;
        s = nx;
      }
    }
    const bill = cm.wageBill(s);
    if (Number.isFinite(bill) && s.wageCap > 0 && bill > s.wageCap) rec.over = true;
    const res = cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (typeof s.boardConfidence === 'number') {
      rec.boardMin = Math.min(rec.boardMin, s.boardConfidence);
      rec.boardSum += s.boardConfidence; rec.boardN += 1;
    }
    if (res.kind === 'seasonOver' || s.sacked) return s;
  }
  rec.stuck = true;
  return s;
}

/** A career of SEASONS seasons at one club. A sacked career hands the club to a fresh one on the next
    draws of the same stream (the Round 505 keeper rule), so every level plays the same number of seasons
    and a level that sacks more is not averaged over its luckier survivors. */
function runCareer(club, driver, seed, level, seasons) {
  return withStream(hash32(`${club.name}|${driver}|${seed}`), () => {
    let s = asLevel(cm.startCareer(club.name), level);
    const rows = [];
    for (let season = 1; season <= seasons; season++) {
      const rec = { club: club.name, tier: club.tier, driver, seed, level, season, fees: 0, signings: 0, clauseUnder: 0, loanUnder: 0, over: false, boardMin: 100, boardSum: 0, boardN: 0, xiStart: xiAvg(s), budgetStart: s.budget };
      s = playSeason(s, driver, rec);
      const row = (s.table ?? []).find(r => r.club === s.clubName);
      rec.pts = row ? row.pts : 0;
      rec.games = row ? row.w + row.d + row.l : 0;
      rec.xiEnd = xiAvg(s);
      rec.sacked = !!s.sacked;
      rec.matches = rec.boardN;
      if (s.sacked) {
        rec.position = null; rec.title = false; rec.trophies = 0; rec.balance = s.budget;
        rows.push(rec);
        s = asLevel(cm.startCareer(club.name), level);
        continue;
      }
      const fin = cm.finishSeason(s);
      rec.position = fin.summary.position;
      rec.expectation = club.expectation;
      rec.title = fin.summary.position === 1 && rec.games > 0;
      rec.trophies = (fin.summary.trophies ?? []).length;
      rec.balance = fin.state.budget;
      rows.push(rec);
      if (season < seasons) s = cm.startNextSeason(fin.state);
    }
    return rows;
  });
}

/** Every career of a fleet, sharded by SHARD=k/n (k from 0) so a runner can split it into jobs. */
function fleetJobs(levels, seeds, drivers) {
  const jobs = [];
  for (const club of fleetClubs()) for (const driver of drivers) for (let seed = 0; seed < seeds; seed++) jobs.push({ club, driver, seed });
  const [k, n] = String(process.env.SHARD || '0/1').split('/').map(Number);
  return { jobs: jobs.filter((_, i) => i % n === k), levels };
}
function runFleet(levels, seeds, seasons, drivers) {
  const { jobs } = fleetJobs(levels, seeds, drivers);
  const rows = [];
  const t0 = Date.now();
  for (const j of jobs) for (const level of levels) rows.push(...runCareer(j.club, j.driver, j.seed, level, seasons));
  const secs = (Date.now() - t0) / 1000;
  console.log(`  played ${rows.length} seasons in ${secs.toFixed(0)} s (${(secs / Math.max(1, rows.length)).toFixed(2)} s a season)`);
  if (process.env.OUT_JSON) fs.writeFileSync(process.env.OUT_JSON, JSON.stringify(rows));
  return rows;
}
const sum = (a, f) => a.reduce((n, r) => n + f(r), 0);
/** One cell of the table: the numbers decision 2 and section 0 name. */
function cell(rows) {
  const done = rows.filter(r => !r.sacked);
  const games = sum(rows, r => r.games);
  return {
    seasons: rows.length,
    ppg: games ? sum(rows, r => r.pts) / games : NaN,
    vsExp: done.length ? sum(done, r => r.position - r.expectation) / done.length : NaN,
    titles10: rows.length ? (10 * rows.filter(r => r.title).length) / rows.length : NaN,
    trophies10: rows.length ? (10 * sum(rows, r => r.trophies)) / rows.length : NaN,
    fees: rows.length ? sum(rows, r => r.fees) / rows.length : NaN,
    signings: rows.length ? sum(rows, r => r.signings) / rows.length : NaN,
    balance: done.length ? sum(done, r => r.balance) / done.length : NaN,
    over: rows.length ? rows.filter(r => r.over).length / rows.length : NaN,
    boardMin: rows.length ? sum(rows, r => r.boardMin) / rows.length : NaN,
    boardMean: sum(rows, r => r.boardN) ? sum(rows, r => r.boardSum) / sum(rows, r => r.boardN) : NaN,
    sacked: rows.length ? rows.filter(r => r.sacked).length / rows.length : NaN,
    matches: rows.length ? sum(rows, r => r.matches) / rows.length : NaN,
    xiStart: rows.length ? sum(rows, r => r.xiStart) / rows.length : NaN,
    xiEnd: rows.length ? sum(rows, r => r.xiEnd) / rows.length : NaN,
    clauseUnder: sum(rows, r => r.clauseUnder),
    loanUnder: sum(rows, r => r.loanUnder),
    stuck: rows.filter(r => r.stuck).length,
  };
}
const f2 = v => (Number.isFinite(v) ? v.toFixed(2) : '  -  ');
function printTable(rows, levels) {
  console.log('  level  tier  driver   n   ppg  vsExp titles10 troph10   fees  sign  balance over  bMin bMean sacked matches xiS  xiE  clauseU loanU');
  for (const level of levels) for (const tier of ['big', 'mid', 'small']) for (const driver of ['engaged', 'steady']) {
    const rs = rows.filter(r => r.level === level && r.tier === tier && r.driver === driver);
    if (!rs.length) continue;
    const c = cell(rs);
    console.log(`  ${level.padEnd(6)} ${tier.padEnd(5)} ${driver.padEnd(7)} ${String(c.seasons).padStart(3)} ${f2(c.ppg)} ${f2(c.vsExp).padStart(6)} ${f2(c.titles10).padStart(7)} ${f2(c.trophies10).padStart(7)} ${f2(c.fees).padStart(6)} ${f2(c.signings).padStart(5)} ${f2(c.balance).padStart(8)} ${f2(c.over)} ${f2(c.boardMin).padStart(5)} ${f2(c.boardMean).padStart(5)} ${f2(c.sacked)} ${f2(c.matches).padStart(6)} ${f2(c.xiStart)} ${f2(c.xiEnd)} ${String(c.clauseUnder).padStart(5)} ${String(c.loanUnder).padStart(5)}`);
  }
}

/* ---------- 0. measure ---------- */
function section0() {
  const levels = (process.env.LEVELS || 'normal').split(',');
  const seeds = num('SEEDS', 4), seasons = num('SEASONS', 10);
  const drivers = (process.env.DRIVERS || 'engaged,steady').split(',');
  console.log(`0) measure: ${levels.join(', ')}, ${seeds} seeds, ${seasons} seasons, ${drivers.join(' and ')}, shard ${process.env.SHARD || '0/1'}`);
  for (const c of fleetClubs()) console.log(`  ${c.tier.padEnd(5)} ${c.name} (${c.league}, expected ${c.expectation})`);
  const rows = runFleet(levels, seeds, seasons, drivers);
  printTable(rows, levels);
  const empty = [];
  for (const level of levels) for (const tier of ['big', 'mid', 'small']) for (const driver of drivers) {
    if (!rows.some(r => r.level === level && r.tier === tier && r.driver === driver)) empty.push(`${level} ${tier} ${driver}`);
  }
  if (process.env.SHARD && process.env.SHARD !== '0/1') ok('a shard: the empty cell check is the fold\'s');
  else if (empty.length) fail(`empty cells: ${empty.join(', ')}`); else ok('no cell is empty');
  const stuck = rows.filter(r => r.stuck).length;
  if (stuck) fail(`${stuck} seasons never reached their end inside 150 entries`);
}

/* ---------- run ---------- */
const RUN = { 0: section0, 1: section1 };
for (const s of SECTIONS) {
  if (!RUN[s]) { console.log(`SECTION=${s} is not a section of this harness; could not run`); process.exit(2); }
  RUN[s]();
}
if (CONTROL) console.log(failures ? `CONTROL ${CONTROL} FIRED: ${failures} failures` : `CONTROL ${CONTROL} DID NOT FIRE`);
console.log(failures ? `simCmDifficulty: ${failures} FAILURES (sections ${SECTIONS.join(',')})` : `simCmDifficulty: all green (sections ${SECTIONS.join(',')})`);
process.exit(failures ? 1 : (CONTROL ? 3 : 0));
