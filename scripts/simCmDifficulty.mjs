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
     2) Normal is the base, to the byte: the nine clubs, an Everton 2005-06
        career, a created club and a New year takeover, set up as the Dugout
        step sets them up with Normal chosen, SEEDS seeds, SEASONS seasons, the
        coach on and off: the whole state at every season end and the count of
        draws equal to BASE_ROOT's (a worktree of the commit the branch started
        from; without it, this tree with every dial read as Normal's). Then the
        picker path (setUpCareer returns its argument), and 2b: Hard with every
        dial set to Normal's plays as Normal, the key aside.
     3) each lever does exactly what its dial says, Hard with that one lever on
        and the rest at Normal's, from the same draws: B1 the board's change
        after the first match; P1 the next match card, the match facts and the
        odds, and from the code that only the seven readers of your match read
        the edge and simAiMatch keeps strengthOf; B2 a stay's opening; M1 day
        one and the summer cheque; M2 day one and a summer move's ceiling; T1
        the marked market, Buy's charge, the clause floor and the AI's deals.
     4) outcomes over the fleet at the three levels for the engaged driver,
        held to the lead's bands (see the table below). Long: run it as its
        own line, or sharded (SHARD=k/n with OUT_JSON) and folded (FOLD=<dir>).
     6) Manager Hot Seat and Deadline Day dates play as on the base, with no
        level; Deadline Day's code reaches no lever.
     7) the help's worked example (ClubManagerHelp.tsx, comments out) holds
        exactly the numbers the table gives, and the block opens by saying
        every other number on that screen is Normal's.

   MEASURED (GitHub runner, remote checks r1501-m1 at 08a2a7b8; the dials are the starting table, untuned,
   because they met every band on the first measurement). Section 4, the engaged driver, 9 clubs, 8 seeds,
   6 seasons a level (432 seasons each), a sacked career handing its club to a fresh one:
                         mid ppg   drop      sacked seasons      spend a season   big club titles in ten
     Normal              1.41                 91 of 432 (0.21)   27.00m           3.89
     Hard                1.24      12.6%     258 of 432 (2.84x)  22.53m (-16.5%)  2.64
     Legend              1.09      23.0%     364 of 432 (4.00x)  14.58m (-46.0%)  1.39
     bands (the lead)              8 to 20 / 18 to 35   1.4x / 2x   -10% on Hard     1 on Hard
     Normal against Normal (even seeds against odd seeds): mid ppg 1.43 and 1.40, a 2.1% gap.
   The second block of seeds (SEED_OFFSET=8, r1501-m2) is in the round's notes. Sacked share by tier, which
   the bands do not hold: Hard 0.41 big, 0.54 mid, 0.84 small; Legend 0.69, 0.85, 0.99 (Normal 0.13, 0.15,
   0.35). Section 0 on Normal, both drivers, 4 seeds, 10 seasons: the engaged buyer's mid ppg 1.40 against
   the steady keeper's 1.39, big club titles 4.25 and 3.83 in ten. One season takes about 0.7 s on a runner.

   Negative controls (CM_DIFF_CONTROL), each patched in memory or into the
   bundle, never into src; each must turn its section red:
     flat        Hard's pain set to 1                                      1
     leak        a save with no key reads as Hard                          2 and 6 (every Hot Seat date)
     alloffleak  2b's Hard keeps its edge                                  2
     gain, pain, cut, cheque, wages, mark, edge
                 that lever of Hard set back to Normal's                   3
     clause      the clause floor at the card's price taken out            3
     ddreach     deadlineDay.ts gains a call to oppStrengthVsMe            6
     alloff      Hard and Legend carry Normal's dials                      4
     helpdrift   Hard's cheque moved by 0.05 in memory                     7

   Run: node scripts/simCmDifficulty.mjs     (SECTION=1, MEASURE=1 SEEDS=4 SEASONS=10)
        git worktree add /tmp/base <base sha> && BASE_ROOT=/tmp/base node scripts/simCmDifficulty.mjs
   DIALS_JSON='{"hard":{"edge":2}}' merges into the table in memory (tuning on a runner).
   Exit 0 green, 1 red (or a control fired), 2 could not run, 3 a control that did not fire.
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_ROOT = process.env.BASE_ROOT ? path.resolve(ROOT, process.env.BASE_ROOT) : null;
const CONTROL = process.env.CM_DIFF_CONTROL || '';
/* Each control and the sections it must turn red. */
const CONTROLS = {
  flat: ['1'], leak: ['2', '6'], alloffleak: ['2'], alloff: ['4'], clause: ['3'],
  gain: ['3'], pain: ['3'], cut: ['3'], cheque: ['3'], wages: ['3'], mark: ['3'], edge: ['3'], ddreach: ['6'], helpdrift: ['7'],
};
const cannot = why => { console.log(`simCmDifficulty: CANNOT RUN: ${why}`); process.exit(2); };
if (CONTROL && !CONTROLS[CONTROL]) cannot(`CM_DIFF_CONTROL=${CONTROL} is not a control this harness knows`);
const num = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? Number(process.env[k]) : d);
const DEFAULT_SECTIONS = ['1', '2', '3', '6', '7'];
const SECTIONS = CONTROL ? CONTROLS[CONTROL]
  : (process.env.SECTION || 'all') === 'all'
    ? [...(process.env.MEASURE === '1' ? ['0'] : []), ...DEFAULT_SECTIONS]
    : String(process.env.SECTION).split(',');
if (BASE_ROOT && !fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) cannot(`BASE_ROOT ${BASE_ROOT} holds no src/lib/clubManager.ts`);

let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const readAt = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8').replaceAll('\r\n', '\n');
const read = rel => readAt(ROOT, rel);
/** Source with comments out, so a guard reads code, not prose. */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ---- bundles: this tree, the base tree (BASE_ROOT) and any control's edit, never src ---- */
const PATCHES = {
  leak: { file: 'clubManagerStart.ts', from: "  return readLevel(o && typeof o === 'object' ? o.difficulty : undefined);", to: "  return readLevel(o && typeof o === 'object' && o.difficulty !== undefined ? o.difficulty : 'hard');" },
  clause: { file: 'clubManager.ts', from: '  return Math.max(1, Math.round(base * mult * 10) / 10, mp.price);', to: '  return Math.max(1, Math.round(base * mult * 10) / 10);' },
};
/* Without BASE_ROOT, section 2 compares with this tree with every dial read as Normal's: the same claim (a
   career without the key never takes a lever's path), held for as long as the levers exist. */
const PLAIN = [{ file: 'clubManagerDifficulty.ts', from: '  return CM_DIFFICULTY_DIALS[levelFrom(state)];', to: '  return CM_DIFFICULTY_DIALS.normal;' }];
const patchPlugin = (edits, hits) => ({
  name: 'cm-difficulty-edits',
  setup(b) {
    b.onLoad({ filter: /[.]ts$/ }, async args => {
      const mine = edits.filter(e => path.basename(args.path) === e.file);
      if (!mine.length) return undefined;
      let source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      for (const e of mine) {
        const count = source.split(e.from).length - 1;
        if (count !== 1) cannot(`an edit's text is in ${e.file} ${count} times, it must be exactly once (${e.from.slice(0, 60)}...)`);
        source = source.replace(e.from, e.to);
        hits.n += 1;
      }
      return { contents: source, loader: 'ts' };
    });
  },
});
const MODS = { cm: 'clubManager', st: 'clubManagerStart', dif: 'clubManagerDifficulty', asks: 'clubManagerBoardAsks', cal: 'clubManagerCalendar', eras: 'clubManagerEras', hs: 'managerHotSeat', dd: 'deadlineDay' };
async function bundleOf(root, name, edits) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `cmdiff-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const lines = Object.entries(MODS)
    .filter(([, f]) => fs.existsSync(path.join(root, `src/lib/${f}.ts`)))
    .map(([k, f]) => `export * as ${k} from ${JSON.stringify(path.join(root, `src/lib/${f}.ts`).split(path.sep).join('/'))};`);
  fs.writeFileSync(entry, lines.join('\n') + '\n');
  const out = path.join(work, 'bundle.cjs');
  const hits = { n: 0 };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], plugins: edits.length ? [patchPlugin(edits, hits)] : [] });
  if (hits.n !== edits.length) cannot(`${name}: ${hits.n} of ${edits.length} edits reached the bundle`);
  return out;
}

/* ---- the runtime: a fresh module per career (the way a page load deals one), a fixed clock ---- */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
const LEVELS = ['normal', 'hard', 'legend'];
const KEYS = ['gain', 'pain', 'cut', 'cheque', 'wageRoom', 'mark', 'edge'];
const HARDER = { gain: -1, pain: 1, cut: 1, cheque: -1, wageRoom: -1, mark: 1, edge: 1 };
/* DIALS_JSON (tuning on a runner without a commit): merged over the table of every module this run loads. */
const TUNE = process.env.DIALS_JSON ? JSON.parse(process.env.DIALS_JSON) : null;
/** Dial edits made in memory, after each load: TUNE first, then the run's control. */
let memEdit = null;
function fresh(b) {
  delete req.cache[req.resolve(b)];
  store.clear();
  const m = req(b);
  const D = m.dif?.CM_DIFFICULTY_DIALS;
  if (D && TUNE) for (const lv of Object.keys(TUNE)) Object.assign(D[lv], TUNE[lv]);
  if (D && memEdit) memEdit(D);
  return m;
}
if (CONTROL === 'flat') { memEdit = D => { D.hard.pain = 1; }; console.log('NEGATIVE CONTROL ON: Hard\'s pain is 1, the same as Normal\'s'); }
if (CONTROL === 'alloff') { memEdit = D => { Object.assign(D.hard, D.normal); Object.assign(D.legend, D.normal); }; console.log('NEGATIVE CONTROL ON: Hard and Legend carry Normal\'s dials'); }

const FOLD = process.env.FOLD || '';
const HEAD = FOLD ? null : await bundleOf(ROOT, 'head', PATCHES[CONTROL] ? [PATCHES[CONTROL]] : []);
const head = FOLD ? { cm: null, dif: null, st: null, asks: null } : fresh(HEAD);
const cm = head.cm, dif = head.dif, st = head.st, asks = head.asks;
const DIALS = dif ? dif.CM_DIFFICULTY_DIALS : null;
console.log(`simCmDifficulty: sections ${SECTIONS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}${TUNE ? `, dials tuned by DIALS_JSON ${JSON.stringify(TUNE)}` : ''}`);
if (DIALS) console.log(`  table: ${LEVELS.map(lv => `${lv} ${JSON.stringify(DIALS[lv])}`).join('; ')}`);

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
  const f = () => {
    f.n += 1;
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.n = 0;
  return f;
}
function hash32(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** Runs fn on its own stream; the draws it took are on withStream.draws afterwards. */
function withStream(seed, fn) {
  const saved = Math.random;
  const r = seeded(seed);
  Math.random = r;
  try { return fn(); } finally { Math.random = saved; withStream.draws = r.n; }
}
/** The hook's rebuild of the board's card (useClubManager.ts rebuildBoardAsks), for a module m. */
const rebuildAsksOf = m => s => [...(s.boardObjectives ?? []).filter(o => !m.asks.isBoardAsk(o.id)), ...m.asks.buildBoardAsks(s)];
/** A career on a level, the way the Dugout step sets it up (a base tree without the module plays Normal). */
const asLevel = (m, s, level) => (level === 'normal' && !m.dif ? s : m.dif.setUpCareer(s, { level }, rebuildAsksOf(m)));
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
function playSeason(m, s, driver, rec) {
  const { cm, dif } = m;
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
  const m = fresh(HEAD);
  const { cm } = m;
  return withStream(hash32(`${club.name}|${driver}|${seed}`), () => {
    let s = asLevel(m, cm.startCareer(club.name), level);
    const rows = [];
    for (let season = 1; season <= seasons; season++) {
      const rec = { club: club.name, tier: club.tier, driver, seed, level, season, fees: 0, signings: 0, clauseUnder: 0, loanUnder: 0, over: false, boardMin: 100, boardSum: 0, boardN: 0, xiStart: xiAvg(s), budgetStart: s.budget };
      s = playSeason(m, s, driver, rec);
      const row = (s.table ?? []).find(r => r.club === s.clubName);
      rec.pts = row ? row.pts : 0;
      rec.games = row ? row.w + row.d + row.l : 0;
      rec.xiEnd = xiAvg(s);
      rec.sacked = !!s.sacked;
      rec.matches = rec.boardN;
      if (s.sacked) {
        rec.position = null; rec.title = false; rec.trophies = 0; rec.balance = s.budget;
        rows.push(rec);
        s = asLevel(m, cm.startCareer(club.name), level);
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
  const off = num('SEED_OFFSET', 0);
  for (const club of fleetClubs()) for (const driver of drivers) for (let seed = off; seed < off + seeds; seed++) jobs.push({ club, driver, seed });
  const [k, n] = String(process.env.SHARD || '0/1').split('/').map(Number);
  return { jobs: jobs.filter((_, i) => i % n === k), levels };
}
function runFleet(levels, seeds, seasons, drivers) {
  const { jobs } = fleetJobs(levels, seeds, drivers);
  const rows = [];
  const t0 = performance.now();
  for (const j of jobs) for (const level of levels) rows.push(...runCareer(j.club, j.driver, j.seed, level, seasons));
  const secs = (performance.now() - t0) / 1000;
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

/* ---------- 2. Normal is the base, to the byte ---------- */
const SPEC = { name: 'Difficulty Town', stadium: 'Level Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'DT' }, budgetTier: 'small', leagueId: 'premier', replacedClub: '' };
/** The careers section 2 replays: the nine clubs, an Everton career in 2005-06, a created club, and a New
    year takeover, each set up the way the Dugout step does it with Normal chosen. */
function identityCareers() {
  const out = fleetClubs().map(c => ({ tag: c.name, era: null, make: m => m.cm.startCareer(c.name) }));
  out.push({ tag: 'Everton 2005-06', era: 'era2005', make: m => m.cm.startCareer('Everton', 'era2005') });
  const spec = { ...SPEC, replacedClub: cm.playableClubs('premier').at(-1).name };
  out.push({ tag: 'a created club', era: null, make: m => m.cm.startCareer(spec.name, 'now', spec) });
  out.push({ tag: 'Brentford, New year takeover', era: null, make: m => m.cal.startMidSeason(m.cm.startCareer('Brentford'), 'newYear') });
  return out;
}
const setUp = (m, s, setup) => (m.dif ? m.dif.setUpCareer(s, setup, rebuildAsksOf(m)) : s);
/** One career, SEASONS seasons of quick sims; the whole state at every season end, and the draws taken. */
async function replay(b, career, seed, coach, level, seasons, edit) {
  const m = fresh(b);
  if (edit) edit(m.dif.CM_DIFFICULTY_DIALS);
  if (career.era && m.eras?.ensureEraRosters) await m.eras.ensureEraRosters(career.era);
  const snaps = [];
  withStream(seed, () => {
    let s = setUp(m, career.make(m), { level });
    for (let k = 1; k <= seasons; k += 1) {
      let over = false;
      for (let guard = 0; guard < 160; guard += 1) {
        const res = m.cm.playNextEntry(s, { skipHalftime: true, noCoach: !coach });
        s = res.state;
        if (res.kind === 'seasonOver') { over = true; break; }
        if (s.sacked) break;
      }
      if (!over) { snaps.push(JSON.stringify(s)); return; }
      s = m.cm.finishSeason(s).state;
      snaps.push(JSON.stringify(s));
      if (k < seasons) s = m.cm.startNextSeason(s);
    }
  });
  return { snaps, draws: withStream.draws };
}
const firstDiff = (a, b) => {
  const x = JSON.parse(a), y = JSON.parse(b);
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) return k;
  return '(key order)';
};
/* 2b compares the two as data: the key goes in where setUpCareer puts it, so the order of the keys differs. */
const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
const withoutLevel = j => { const o = JSON.parse(j); if (o.startOptions) delete o.startOptions.difficulty; return JSON.stringify(canon(o)); };
const canonJson = j => JSON.stringify(canon(JSON.parse(j)));
async function section2() {
  const seeds = num('SEEDS', 2), seasons = num('SEASONS', 2);
  const BASE = BASE_ROOT ? await bundleOf(BASE_ROOT, 'base', []) : await bundleOf(ROOT, 'plain', PLAIN);
  console.log(`2) Normal plays as ${BASE_ROOT ? `the base tree ${BASE_ROOT}` : 'this tree with every dial read as Normal\'s'}: ${seeds} seeds, ${seasons} seasons, coach and noCoach`);
  const careers = identityCareers();
  let compared = 0, draws = 0, keyed = 0;
  const t0 = performance.now();
  for (const career of careers) for (let seed = 0; seed < seeds; seed += 1) for (const coach of [true, false]) {
    const sd = 5000 + seed * 97 + careers.indexOf(career);
    const a = await replay(HEAD, career, sd, coach, 'normal', seasons);
    const b = await replay(BASE, career, sd, coach, 'normal', seasons);
    const tag = `${career.tag} seed ${seed} ${coach ? 'coach' : 'noCoach'}`;
    compared += 1; draws += a.draws;
    if (a.draws !== b.draws) fail(`${tag}: ${a.draws} draws here, ${b.draws} on the base`);
    if (a.snaps.length !== b.snaps.length) fail(`${tag}: ${a.snaps.length} season ends here, ${b.snaps.length} on the base`);
    for (let i = 0; i < Math.min(a.snaps.length, b.snaps.length); i += 1) {
      if (a.snaps[i] !== b.snaps[i]) { fail(`${tag}: season ${i + 1} differs from the base, first at key ${firstDiff(a.snaps[i], b.snaps[i])}`); break; }
    }
    if (a.snaps.some(j => JSON.parse(j).startOptions?.difficulty !== undefined)) keyed += 1;
  }
  if (keyed) fail(`${keyed} Normal careers carry the difficulty key`);
  ok(`${compared} Normal careers compared with the base, ${draws} draws, in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  /* The picker path: Normal with No sacking off is the very object it was given. */
  const m = fresh(HEAD), s0 = m.cm.startCareer('Everton');
  if (m.dif.setUpCareer(s0, { level: 'normal', noSack: false }, () => { throw new Error('rebuilt'); }) === s0 && m.dif.setUpCareer(s0) === s0) ok('setUpCareer on Normal with No sacking off returns its argument');
  else fail('setUpCareer on Normal does not return its argument');

  /* 2c. Old saves: a save the base wrote (its own saveCareer, after a season) opens on this tree to exactly what
     the base opens it to, and reads as Normal with No sacking off. */
  let loaded = 0;
  for (const career of careers) {
    const mb = fresh(BASE);
    if (career.era && mb.eras?.ensureEraRosters) await mb.eras.ensureEraRosters(career.era);
    const s = withStream(17000 + careers.indexOf(career), () => {
      let x = career.make(mb);
      for (let guard = 0; guard < 160; guard += 1) { const res = mb.cm.playNextEntry(x, { skipHalftime: true }); x = res.state; if (res.kind === 'seasonOver' || x.sacked) break; }
      return x;
    });
    mb.cm.saveCareer(s);
    let raw = store.get(mb.cm.SAVE_KEY);
    if (!raw) { raw = JSON.stringify(s); console.log(`   2c ${career.tag}: the base's writer left nothing in the stub storage, the state's own JSON is opened instead`); }
    const openOn = async b => {
      const m = fresh(b);
      if (career.era && m.eras?.ensureEraRosters) await m.eras.ensureEraRosters(career.era);
      store.set(m.cm.SAVE_KEY, raw);
      return { json: JSON.stringify(m.cm.loadCareer()), level: m.st.levelFrom ? m.st.levelFrom(m.cm.loadCareer()) : 'normal', noSack: m.st.noSackFrom(m.cm.loadCareer()) };
    };
    const a = await openOn(HEAD), b = await openOn(BASE);
    if (a.json !== b.json) fail(`2c ${career.tag}: the base's save opens differently here, first at key ${firstDiff(a.json, b.json)}`);
    else if (a.level !== 'normal' || a.noSack !== null) fail(`2c ${career.tag}: the base's save reads as ${a.level}, No sacking ${a.noSack}`);
    else loaded += 1;
  }
  ok(`2c: ${loaded} of ${careers.length} saves the base wrote open here as they open there, Normal with No sacking off`);

  /* 2b. Every lever is its dial: Hard with every dial set to Normal's plays as Normal, the key aside. */
  const leakEdge = CONTROL === 'alloffleak';
  if (leakEdge) console.log('NEGATIVE CONTROL ON: 2b keeps Hard\'s edge on');
  const allOff = D => { const edge = D.hard.edge; Object.assign(D.hard, D.normal); if (leakEdge) D.hard.edge = edge; };
  let same = 0, n2 = 0;
  for (const career of careers.slice(0, 9)) for (const coach of [true, false]) {
    const sd = 7000 + careers.indexOf(career);
    const a = await replay(HEAD, career, sd, coach, 'hard', seasons, allOff);
    const b = await replay(HEAD, career, sd, coach, 'normal', seasons);
    n2 += 1;
    const tag = `2b ${career.tag} ${coach ? 'coach' : 'noCoach'}`;
    if (a.draws !== b.draws) { fail(`${tag}: Hard with Normal's dials took ${a.draws} draws, Normal ${b.draws}`); continue; }
    const bad = a.snaps.findIndex((j, i) => withoutLevel(j) !== canonJson(b.snaps[i]));
    if (bad >= 0 || a.snaps.length !== b.snaps.length) fail(`${tag}: Hard with Normal's dials differs from Normal${bad >= 0 ? ` in season ${bad + 1}, first at key ${firstDiff(withoutLevel(a.snaps[bad]), canonJson(b.snaps[bad]))}` : ''}`);
    else if (!a.snaps.every(j => JSON.parse(j).startOptions?.difficulty === 'hard')) fail(`${tag}: the Hard career lost its key`);
    else same += 1;
  }
  ok(`2b: ${same} of ${n2} Hard careers on Normal's dials play as Normal, the key aside`);
}

/* ---------- 3. each lever does exactly what its dial says ---------- */
/* A module whose Hard row is Normal's but for ONE lever (Hard's own value), so a Hard career and a Normal
   one take the same draws up to that lever. The lever's control sets that dial back to Normal's too, and
   its check must then go red. */
const LEVER_OF = { gain: ['gain'], pain: ['pain'], cut: ['cut'], cheque: ['cheque'], wages: ['wageRoom'], mark: ['mark'], edge: ['edge'] };
function leverModule(keys) {
  const m = fresh(HEAD);
  const D = m.dif.CM_DIFFICULTY_DIALS, hard = { ...D.hard };
  Object.assign(D.hard, D.normal);
  for (const k of keys) D.hard[k] = hard[k];
  if (LEVER_OF[CONTROL] && keys.some(k => LEVER_OF[CONTROL].includes(k))) for (const k of LEVER_OF[CONTROL]) D.hard[k] = D.normal[k];
  return { m, dial: hard };
}
const close = (a, b, tol) => Math.abs(a - b) <= tol;
/** The first match a career plays: its report and the state after it. */
function firstMatch(m, s) {
  for (let guard = 0; guard < 30; guard += 1) {
    const res = m.cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.report && typeof res.report.confidenceDelta === 'number') return { report: res.report, s };
  }
  return null;
}
/** A season's end under the steady driver (renews, signs nobody), on the Normal module m. */
function seasonEnd(m, club, seed) {
  return withStream(seed, () => {
    let s = m.cm.startCareer(club);
    const rec = { fees: 0, signings: 0, clauseUnder: 0, loanUnder: 0, over: false, boardMin: 100, boardSum: 0, boardN: 0 };
    s = playSeason(m, s, 'steady', rec);
    return s.sacked ? null : m.cm.finishSeason(s).state;
  });
}
const keyed = (s, level) => ({ ...s, startOptions: { ...(s.startOptions ?? {}), difficulty: level } });
function section3() {
  const seeds = num('SEEDS3', 4);
  if (LEVER_OF[CONTROL] || CONTROL === 'clause') console.log(`NEGATIVE CONTROL ON: ${CONTROL === 'clause' ? 'the clause floor at the card\'s price is gone' : `Hard's ${LEVER_OF[CONTROL].join(' and ')} set back to Normal's`}`);
  console.log(`3) each lever does what its dial says (Hard with one lever on, the rest Normal's), ${seeds} seeds`);
  const clubs = fleetClubs();
  /* B1: the board's change after the first match. */
  {
    const { m: mh, dial } = leverModule(['gain', 'pain']);
    let n = 0, bad = 0, up = 0, down = 0;
    for (const c of clubs) for (let seed = 0; seed < seeds; seed += 1) {
      const sd = 9000 + seed * 31 + clubs.indexOf(c);
      const mn = fresh(HEAD);
      const a = withStream(sd, () => firstMatch(mn, mn.cm.startCareer(c.name)));
      const b = withStream(sd, () => firstMatch(mh, setUp(mh, mh.cm.startCareer(c.name), { level: 'hard' })));
      if (!a || !b) { fail(`B1 ${c.name} seed ${seed}: no first match`); continue; }
      const dn = a.report.confidenceDelta, dh = b.report.confidenceDelta;
      if (Math.abs(dn) < 0.5) continue;
      n += 1;
      const want = dn > 0 ? dn * dial.gain : dn * dial.pain;
      if (dn > 0) up += 1; else down += 1;
      if (!close(dh, want, 0.13) || Math.sign(dh) !== Math.sign(dn)) { bad += 1; if (bad <= 3) fail(`B1 ${c.name} seed ${seed}: Normal ${dn}, Hard ${dh}, the dial says ${want.toFixed(2)}`); }
    }
    if (bad > 3) fail(`B1: ${bad} matches in all off the dial`);
    if (n < 20 || up < 3 || down < 3) fail(`B1: only ${n} first matches (${up} up, ${down} down) moved the board by 0.5 or more, the floor is 20 with 3 each way`);
    else if (!bad) ok(`B1: ${n} first matches (${up} up, ${down} down), Hard's change is Normal's times the dial every time`);
  }
  /* P1: the match facts and the next match card show the edge; the odds turn against you; no AI match reads it. */
  {
    const { m: mh, dial } = leverModule(['edge']);
    const mn = fresh(HEAD);
    let n = 0, worse = 0;
    for (const c of clubs) {
      const sn = withStream(11, () => mn.cm.startCareer(c.name));
      const sh = withStream(11, () => setUp(mh, mh.cm.startCareer(c.name), { level: 'hard' }));
      const opp = mn.cm.nextFixtureFrom(sn, sn.week);
      const oh = mh.cm.nextFixtureFrom(sh, sh.week);
      if (!opp?.opponent || !oh?.opponent || opp.opponent !== oh.opponent) continue;
      n += 1;
      const want = mn.cm.strengthOf(sn, opp.opponent) + dial.edge;
      if (!close(mh.cm.oppStrengthVsMe(sh, oh.opponent), want, 1e-9)) fail(`P1 ${c.name}: the opponent reads ${mh.cm.oppStrengthVsMe(sh, oh.opponent)}, the dial says ${want}`);
      if (oh.oppStrength !== Math.round(want)) fail(`P1 ${c.name}: the next match card shows ${oh.oppStrength}, the dial says ${Math.round(want)}`);
      const fn = mn.cm.matchFacts(sn), fh = mh.cm.matchFacts(sh);
      if (fn && fh && fh.odds.loss > fn.odds.loss && fh.odds.win < fn.odds.win) worse += 1;
    }
    if (n < 6) fail(`P1: only ${n} clubs had a next fixture to read`);
    else if (worse < n) fail(`P1: the odds turned against you in ${worse} of ${n} match facts`);
    else ok(`P1: ${n} next match cards and match facts read the opponent at strength plus ${dial.edge}, the odds worse in all ${n}`);
    /* No AI against AI match reads it: in the engine (comments stripped) oppStrengthVsMe is called in the seven
       readers of your match only, and simAiMatch keeps strengthOf. */
    const src = code(read('src/lib/clubManager.ts'));
    const readers = ['talkTargetNow', 'firstHalfLambdas', 'secondHalfLambdas', 'playMyMatch', 'talkEdgeFor', 'nextFixtureFrom', 'matchFacts'];
    const calls = [...src.matchAll(/oppStrengthVsMe\(/g)].map(x => x.index);
    const fnStarts = [...src.matchAll(/^(?:export )?function (\w+)/gm)].map(x => ({ name: x[1], at: x.index }));
    const owner = at => fnStarts.filter(f => f.at < at).at(-1)?.name;
    const owners = calls.map(owner).filter(o => o !== 'oppStrengthVsMe');
    const stray = owners.filter(o => !readers.includes(o));
    if (owners.length !== 7 || stray.length) fail(`P1: oppStrengthVsMe is called ${owners.length} times (${owners.join(', ')}), seven are expected, all in ${readers.join(', ')}`);
    else ok(`P1: oppStrengthVsMe is read in exactly the seven readers of your match (${[...new Set(owners)].join(', ')})`);
    const ai = src.slice(src.indexOf('function simAiMatch('), src.indexOf('\n}\n', src.indexOf('function simAiMatch(')));
    if (!ai.includes('strengthOf(state, home)') || ai.includes('oppStrengthVsMe')) fail('P1: simAiMatch no longer reads plain strengthOf');
    else ok('P1: simAiMatch reads plain strengthOf, so no match between other clubs moves');
  }
}

/** The summer rolled from one season end state on a stream of its own (simClubManagerBudget's rollWith). */
const rollOn = (m, s, seed, club) => withStream(seed, () => m.cm.startNextSeason(s, club));
function section3money() {
  const seeds = num('SEEDS3', 4);
  const clubs = fleetClubs().filter(c => c.tier !== 'big');
  const mn = fresh(HEAD);
  const ends = [];
  for (const c of clubs) for (let seed = 0; seed < Math.max(2, seeds - 1); seed += 1) {
    const s = seasonEnd(mn, c.name, 12000 + seed * 53 + clubs.indexOf(c));
    if (s) ends.push({ club: c.name, s, seed: 13000 + seed * 7 + clubs.indexOf(c) });
  }
  console.log(`  ${ends.length} season ends rolled (the steady driver at the mid and small clubs)`);
  /* B2: a stay's opening. At or above Safe it is Normal's; under Safe it is Normal's minus the cut. */
  {
    const { m, dial } = leverModule(['cut']);
    let below = 0, above = 0, bad = 0;
    for (const e of ends) {
      const a = rollOn(mn, e.s, e.seed), b = rollOn(m, keyed(e.s, 'hard'), e.seed);
      const want = a.boardConfidence >= 60 ? a.boardConfidence : a.boardConfidence - dial.cut;
      if (a.boardConfidence >= 60) above += 1; else below += 1;
      if (b.boardConfidence !== want) { bad += 1; if (bad <= 3) fail(`B2 ${e.club}: Normal opens at ${a.boardConfidence}, Hard at ${b.boardConfidence}, the dial says ${want}`); }
    }
    if (below < 4 || above < 1) fail(`B2: ${below} openings under Safe and ${above} at or above it; the floors are 4 and 1`);
    else if (!bad) ok(`B2: ${below} bad openings fell by exactly ${dial.cut}, ${above} at or above Safe stayed`);
  }
  /* M1: the summer cheque, read with nothing carried. */
  {
    const { m, dial } = leverModule(['cheque']);
    let n = 0, bad = 0;
    for (const e of ends) {
      const empty = { ...e.s, budget: 0 };
      const a = rollOn(mn, empty, e.seed), b = rollOn(m, keyed(empty, 'hard'), e.seed);
      n += 1;
      const want = Math.round(a.budget * dial.cheque * 10) / 10;
      if (!close(b.budget, want, 0.11)) { bad += 1; if (bad <= 3) fail(`M1 ${e.club}: Normal's cheque ${a.budget}, Hard's ${b.budget}, the dial says ${want}`); }
    }
    const day = fresh(HEAD).cm.startCareer('Brentford');
    const dh = setUp(m, m.cm.startCareer('Brentford'), { level: 'hard' });
    if (dh.budget !== Math.round(day.budget * dial.cheque * 10) / 10) fail(`M1 day one: Normal ${day.budget}, Hard ${dh.budget}`);
    if (n < 6) fail(`M1: only ${n} summers read`);
    else if (!bad) ok(`M1: day one and ${n} summer cheques are Normal's times ${dial.cheque}`);
  }
  /* M2: the wage ceiling of a new job (day one, and a summer move); a stay grows the one it has. */
  {
    const { m, dial } = leverModule(['wageRoom']);
    let n = 0, bad = 0;
    const want = cap => Math.max(60, Math.round(cap * dial.wageRoom));
    for (const c of clubs.slice(0, 4)) {
      const a = withStream(3, () => mn.cm.startCareer(c.name)), b = withStream(3, () => setUp(m, m.cm.startCareer(c.name), { level: 'hard' }));
      n += 1;
      if (b.wageCap !== want(a.wageCap)) { bad += 1; fail(`M2 day one ${c.name}: Normal ${a.wageCap}, Hard ${b.wageCap}, the dial says ${want(a.wageCap)}`); }
    }
    const league = cm.playableClubs('premier');
    for (const e of ends.slice(0, 6)) {
      const to = league.find(c => c.name !== e.club && c.expectation > 8)?.name;
      const a = rollOn(mn, e.s, e.seed, to), b = rollOn(m, keyed(e.s, 'hard'), e.seed, to);
      if (a.clubName !== to || b.clubName !== to) { fail(`M2 move ${e.club} to ${to}: the move did not happen`); continue; }
      n += 1;
      if (b.wageCap !== want(a.wageCap)) { bad += 1; if (bad <= 3) fail(`M2 move to ${to}: Normal ${a.wageCap}, Hard ${b.wageCap}, the dial says ${want(a.wageCap)}`); }
    }
    if (n < 8) fail(`M2: only ${n} new jobs read`);
    else if (!bad) ok(`M2: ${n} new jobs (day one and summer moves) start on Normal's ceiling times ${dial.wageRoom}`);
  }
  /* T1: the market listed to you. Same men, same order, marked prices; Buy charges the marked price; the
     clause never undercuts it (at Legend's mark, where on the old rule it could); the AI's headlines are Normal's. */
  {
    const { m, dial } = leverModule(['mark']);
    const s0 = withStream(5, () => m.cm.startCareer('Brentford'));
    const sh = { ...setUp(m, s0, { level: 'hard' }), budget: 9999, transferWindow: s0.transferWindow ?? 'summer' };
    const base = m.cm.buildMarket(sh), mine = m.dif.marketForMe(sh, base);
    let marked = 0;
    mine.forEach((mp, i) => { if (mp.name === base[i].name && mp.value === base[i].value && mp.price === Math.max(0.5, Math.round(base[i].price * dial.mark * 10) / 10)) marked += 1; });
    if (marked !== base.length || (dial.mark !== 1 && mine.every((mp, i) => mp.price === base[i].price))) fail(`T1: ${marked} of ${base.length} cards are the same man at the marked price`);
    else ok(`T1: all ${base.length} cards are the same men in the same order at ${dial.mark} times the list`);
    const pick = mine.find(mp => m.cm.buyPlayer(sh, mp));
    const after = pick && m.cm.buyPlayer(sh, pick);
    if (!after || !close(sh.budget - after.budget, pick.price, 1e-9) || pick.price === base[mine.indexOf(pick)].price) fail(`T1: Buy did not charge the marked price${pick ? ` (${sh.budget - after?.budget} for a card of ${pick.price})` : ''}`);
    else ok(`T1: Buy charges the marked price (${pick.price} for a man listed at ${base[mine.indexOf(pick)].price})`);
    const legendMark = DIALS.legend.mark;
    let under = 0, clauses = 0;
    for (const mp of base) {
      const card = { ...mp, price: Math.max(0.5, Math.round(mp.price * legendMark * 10) / 10) };
      const c = m.cm.releaseClauseOf(card, sh.season);
      if (c === null) continue;
      clauses += 1;
      if (c < card.price) under += 1;
    }
    if (under) fail(`T1: ${under} of ${clauses} release clauses undercut the price at Legend's mark`);
    else ok(`T1: none of ${clauses} release clauses undercuts the price at Legend's mark`);
    const runA = withStream(21, () => { let s = mn.cm.startCareer('Brentford'); for (let i = 0; i < 6; i += 1) s = mn.cm.playNextEntry(s, { skipHalftime: true }).state; return s.aiHeadlines; });
    const runB = withStream(21, () => { let s = setUp(m, m.cm.startCareer('Brentford'), { level: 'hard' }); for (let i = 0; i < 6; i += 1) s = m.cm.playNextEntry(s, { skipHalftime: true }).state; return s.aiHeadlines; });
    if (JSON.stringify(runA) !== JSON.stringify(runB)) fail('T1: the AI\'s headlines on a marked market differ from Normal\'s');
    else ok(`T1: the AI's own deals are Normal's (${runA.length} headlines after six entries)`);
  }
}

/* ---------- 6. the dailies never carry a level ---------- */
const HOT = ['2026-10-10', '2026-10-11', '2026-10-27'];
const DEAD = ['2026-10-10', '2026-10-11', '2026-10-18'];
const carriesLevel = x => !!(x && x.startOptions && typeof x.startOptions === 'object' && 'difficulty' in x.startOptions);
/* simDailyDeals' fixed script: balanced, no talk, the first press answer. */
function hotSeatDay(b, date) {
  const { hs } = fresh(b);
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  let guard = 0;
  while (!run.verdict && guard++ < 40) run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
  const hand = run.verdict ? hs.handoverState(run) : null;
  return { club: setup.club, json: JSON.stringify([run.state, run.log, run.verdict ?? null, hand]), keyed: carriesLevel(run.state) || carriesLevel(hand) };
}
function deadlineDayRun(b, date) {
  const { dd } = fresh(b);
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.endDay(dd.startDeadlineDay(setup));
  return { club: setup.club, json: JSON.stringify([run.state, run.grade ?? null, run.ticker]), keyed: carriesLevel(run.state) };
}
async function section6() {
  const BASE = BASE_ROOT ? await bundleOf(BASE_ROOT, 'base6', []) : await bundleOf(ROOT, 'plain6', PLAIN);
  console.log(`6) Manager Hot Seat (${HOT.join(', ')}) and Deadline Day (${DEAD.join(', ')}) play as on ${BASE_ROOT ? 'the base tree' : 'this tree with every dial read as Normal\'s'}`);
  const red = { 'Hot Seat': 0, 'Deadline Day': 0 };
  for (const [kind, dates, day] of [['Hot Seat', HOT, hotSeatDay], ['Deadline Day', DEAD, deadlineDayRun]]) {
    for (const date of dates) {
      const a = day(HEAD, date), b = day(BASE, date);
      const why = [];
      if (a.json !== b.json) why.push('the day differs from the base');
      if (a.keyed) why.push('its state carries a level');
      if (why.length) { red[kind] += 1; fail(`${kind} ${date} (${a.club}): ${why.join('; ')}`); }
      else console.log(`   ${kind} ${date} ${a.club}: identical, no level`);
    }
  }
  /* Deadline Day plays no match and never sets a career up, so no lever can reach it whatever its state
     holds. Proved from its code (comments stripped), with a control that adds one call to a copy. */
  let ddCode = code(read('src/lib/deadlineDay.ts'));
  if (CONTROL === 'ddreach') ddCode += '\nexport function reach(state) { return oppStrengthVsMe(state, "x"); }\n';
  const ENTRY_POINTS = ['playNextEntry', 'resumeMatch', 'playMyMatch', 'simToWeek', 'oppStrengthVsMe', 'boardSwing', 'boardOpening',
    'boardCheque', 'wageRoomFor', 'marketForMe', 'setUpCareer', 'applyNewJobDials', 'joinClubNow', 'startNextSeason', 'useClubManager'];
  const reached = ENTRY_POINTS.filter(n => new RegExp('(^|[^A-Za-z0-9_$])' + n + '[(]').test(ddCode));
  if (reached.length) fail(`deadlineDay.ts calls ${reached.join(', ')}, so a lever can reach Deadline Day`);
  console.log(`   red per daily: Hot Seat ${red['Hot Seat']} of ${HOT.length}, Deadline Day ${red['Deadline Day']} of ${DEAD.length}; deadlineDay.ts calls ${reached.length ? reached.join(', ') : 'none of the match, summer, market or setup entry points'}`);
}

/* ---------- 4. outcomes: the lead's table for the engaged driver ---------- */
/* Decision 2 of the round's brief, the bands the dials are tuned to, over the fleet (the nine clubs,
   SEEDS seeds, SEASONS seasons, a sacked career handing its club to a fresh one so every level plays every
   season): at the mid clubs the engaged driver's points per game falls 8 to 20 percent on Hard and 18 to 35
   on Legend; his seasons ending in a sacking (all nine clubs) are at least 1.4 times Normal's on Hard and 2
   times on Legend; his spend per season is at least 10 percent lower on Hard; and a big club on Hard still
   wins its league in at least one season in ten. The bands are the lead's; the measured numbers and the
   spread of Normal against Normal on other seeds are in the header table. */
const BANDS = { hard: { drop: [0.08, 0.20], sack: 1.4 }, legend: { drop: [0.18, 0.35], sack: 2 } };
function outcomesOf(rows) {
  const eng = l => rows.filter(r => r.level === l && r.driver === 'engaged');
  const out = {};
  for (const l of LEVELS) {
    const all = eng(l);
    if (!all.length) continue;
    out[l] = {
      seasons: all.length,
      midPpg: cell(all.filter(r => r.tier === 'mid')).ppg,
      sack: all.filter(r => r.sacked).length / all.length,
      sacks: all.filter(r => r.sacked).length,
      spend: sum(all, r => r.fees) / all.length,
      bigTitles10: cell(all.filter(r => r.tier === 'big')).titles10,
    };
  }
  return out;
}
function assertOutcomes(rows) {
  const before = failures;
  const o = outcomesOf(rows);
  if (!o.normal) { fail('section 4 has no Normal rows'); return; }
  const n = o.normal;
  /* Normal against Normal: the even seeds against the odd ones, the spread a level's drop has to clear. */
  const nRows = rows.filter(r => r.level === 'normal' && r.driver === 'engaged' && r.tier === 'mid');
  const even = cell(nRows.filter(r => r.seed % 2 === 0)).ppg, odd = cell(nRows.filter(r => r.seed % 2 === 1)).ppg;
  console.log(`  Normal: mid points per game ${f2(n.midPpg)}, sacked ${n.sacks} of ${n.seasons} seasons (${f2(n.sack)}), spend ${f2(n.spend)}m a season, big club titles ${f2(n.bigTitles10)} in ten`);
  console.log(`  Normal against Normal (even seeds against odd): mid points per game ${f2(even)} and ${f2(odd)}, a gap of ${f2(Math.abs(1 - odd / even) * 100)} percent`);
  for (const l of ['hard', 'legend']) {
    const x = o[l];
    if (!x) continue;
    const drop = 1 - x.midPpg / n.midPpg;
    const sackRatio = n.sack > 0 ? x.sack / n.sack : (x.sack > 0 ? Infinity : NaN);
    const spendDrop = 1 - x.spend / n.spend;
    console.log(`  ${l}: mid points per game ${f2(x.midPpg)} (down ${f2(drop * 100)} percent), sacked ${x.sacks} of ${x.seasons} (${f2(x.sack)}, ${f2(sackRatio)} times Normal), spend ${f2(x.spend)}m (down ${f2(spendDrop * 100)} percent), big club titles ${f2(x.bigTitles10)} in ten`);
    const [lo, hi] = BANDS[l].drop;
    if (!(drop >= lo && drop <= hi)) fail(`${l}: the mid clubs' points per game fell ${f2(drop * 100)} percent, the band is ${lo * 100} to ${hi * 100}`);
    if (!(sackRatio >= BANDS[l].sack)) fail(`${l}: sacked ${f2(sackRatio)} times as often as Normal, the floor is ${BANDS[l].sack}`);
    if (l === 'hard' && !(spendDrop >= 0.10)) fail(`hard: spend per season fell ${f2(spendDrop * 100)} percent, the floor is 10`);
    if (l === 'hard' && !(x.bigTitles10 >= 1)) fail(`hard: a big club won its league ${f2(x.bigTitles10)} seasons in ten, the floor is 1`);
  }
  if (failures === before) ok('every level sits inside the bands the lead set');
}
function section4() {
  const seeds = num('SEEDS', 8), seasons = num('SEASONS', 6);
  const levels = (process.env.LEVELS || LEVELS.join(',')).split(',');
  const drivers = (process.env.DRIVERS || 'engaged').split(',');
  console.log(`4) outcomes: ${levels.join(', ')}, ${seeds} seeds from ${num('SEED_OFFSET', 0)}, ${seasons} seasons, ${drivers.join(' and ')}, shard ${process.env.SHARD || '0/1'}`);
  const rows = runFleet(levels, seeds, seasons, drivers);
  printTable(rows, levels);
  if (process.env.SHARD && process.env.SHARD !== '0/1') { ok('a shard: the bands are the fold\'s (FOLD=<dir of OUT_JSON files>)'); return; }
  assertOutcomes(rows);
}
/** FOLD=<dir>: every OUT_JSON file in it, folded into one table and the bands. Bundles nothing. */
function fold() {
  const files = fs.readdirSync(FOLD).filter(f => f.endsWith('.json'));
  const rows = files.flatMap(f => JSON.parse(fs.readFileSync(path.join(FOLD, f), 'utf8')));
  console.log(`4) outcomes folded from ${files.length} files, ${rows.length} seasons`);
  const levels = LEVELS.filter(l => rows.some(r => r.level === l));
  printTable(rows, levels);
  assertOutcomes(rows);
}

/* ---------- 7. the help's worked example is the dial table's ---------- */
/* The example paragraph of the "How hard" block in ClubManagerHelp.tsx (read from the source, comments out)
   names, in order: a league defeat at a mid table club on its place with the press neutral (4.5 times pain,
   rounded the way the engine rounds), a win (4 times gain), a 40m cheque, a man listed at 10m, an opponent
   of 80, and a bad season that would open at 35. Every number in it must be the one the table gives. */
function section7() {
  if (CONTROL === 'helpdrift') { DIALS.hard.cheque = Math.round((DIALS.hard.cheque + 0.05) * 100) / 100; console.log(`NEGATIVE CONTROL ON: Hard's cheque moved to ${DIALS.hard.cheque} in memory`); }
  console.log('7) the help\'s worked example is the dial table\'s');
  const r1 = x => Math.round(x * 10) / 10;
  const fmt = x => String(Math.abs(r1(x)));
  const want = [];
  const H = DIALS.hard, L = DIALS.legend;
  want.push('4.5', fmt(-4.5 * H.pain), fmt(-4.5 * L.pain), '4', fmt(4 * H.gain), fmt(4 * L.gain));
  want.push('40', fmt(40 * H.cheque), fmt(40 * L.cheque));
  want.push('10', fmt(Math.max(0.5, 10 * H.mark)), fmt(Math.max(0.5, 10 * L.mark)));
  want.push('80', fmt(80 + H.edge), fmt(80 + L.edge));
  want.push('35', fmt(35 - H.cut), fmt(35 - L.cut));
  const src = code(read('src/components/club-manager/ClubManagerHelp.tsx'));
  const at = src.indexOf('data-cm-help="difficulty"');
  const block = at < 0 ? '' : src.slice(at, src.indexOf('</div>', at));
  const ex = block.split('<p>').find(p => p.includes('Example:')) ?? '';
  const text = ex.replace(/<[^>]+>/g, ' ');
  const got = [...text.matchAll(/\d+(?:\.\d+)?/g)].map(x => x[0]);
  if (!block) fail('ClubManagerHelp.tsx has no "How hard" block');
  else if (JSON.stringify(got) !== JSON.stringify(want)) fail(`the help's example reads ${got.join(', ')}; the table gives ${want.join(', ')}`);
  else ok(`the example's ${got.length} numbers are the table's (${got.join(', ')})`);
  const first = (block.split('<p>')[1] ?? '').replace(/<[^>]+>/g, ' ');
  if (!/Every number elsewhere on this screen is for a Normal career/.test(first) || !/No sacking/.test(first)) fail('the block does not open by saying the screen\'s other numbers are Normal\'s and that No sacking switches off the zero rule');
  else ok('the block opens by saying every other number on the screen is Normal\'s, and names No sacking');
}

/* ---------- run ---------- */
const RUN = { 0: section0, 1: section1, 2: section2, 3: () => { section3(); section3money(); }, 4: section4, 6: section6, 7: section7 };
if (FOLD) { fold(); console.log(failures ? `simCmDifficulty: ${failures} FAILURES (fold)` : 'simCmDifficulty: all green (fold)'); process.exit(failures ? 1 : 0); }
for (const s of SECTIONS) {
  if (!RUN[s]) { console.log(`SECTION=${s} is not a section of this harness; could not run`); process.exit(2); }
  await RUN[s]();
}
if (CONTROL) console.log(failures ? `CONTROL ${CONTROL} FIRED: ${failures} failures` : `CONTROL ${CONTROL} DID NOT FIRE`);
console.log(failures ? `simCmDifficulty: ${failures} FAILURES (sections ${SECTIONS.join(',')})` : `simCmDifficulty: all green (sections ${SECTIONS.join(',')})`);
process.exit(failures ? 1 : (CONTROL ? 3 : 0));
