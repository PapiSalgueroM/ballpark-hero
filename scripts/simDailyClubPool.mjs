/**
 * Round 1044: Manager Hot Seat and Deadline Day never re-deal a published day.
 *
 * Both dailies pick their club with dailyIndex(date, pool.length). Until this
 * round the pool was worked out fresh on every load, so any change to the
 * leagues or to the partial list re-dealt every day, today and the archive
 * included. They now read the dated, append only ledger
 * src/data/dailyClubPool.json (written by scripts/genDailyClubPool.mjs, read
 * by hotSeatPool(date) in src/lib/managerHotSeat.ts). This harness proves it.
 *
 *   1) no re-deal (hard). For every day from 2026-09-01 to today, and on to
 *      the day before the first line new since origin/main, dailyHotSeat(D)
 *      and dailyDeadlineDay(D) on this tree deal the club, league and seed
 *      main dealt: origin/main 1c10e7e5's own engine (the tree players were
 *      dealt from before this round), read from the committed fixture
 *      scripts/data/dailyClubPoolMain1c10.json, up to the day before the
 *      first legitimate join; after it, this tree's engine over main's ledger
 *      once main carries one.
 *   2) the ledger is the generator's (hard). planLines, the function
 *      genDailyClubPool.mjs appends from, has nothing to add against the
 *      engine's eligible clubs, and with no control on, the generator's own
 *      --check exits 0.
 *   3) append only (hard). Every line is a join or a leave line with a real
 *      date, a leave line closes an open line, no club is in twice on any
 *      day, the ledger starts with origin/main's lines unchanged (or, while
 *      main has no ledger, with the fixture's main pool exactly, all from
 *      2000-01-01), and every line after them is dated after today (ET).
 *   4) the joins are dealt, and nobody before they join (hard). From every
 *      join date the joining clubs are in every day's pool and both dailies
 *      deal them; before the first, no pre-join daily window's market, buyers
 *      or hourly rivals (passHour, played through the twelve hours) name a
 *      club outside that day's pool, every such window is still a full brief
 *      (three or four needs, two approaches each), and the hours send at
 *      least RIVAL_FLOOR rivals, so neither "nobody from outside" line can
 *      pass on an empty list.
 *   5) the engine runs every club the ledger can still deal (hard): every
 *      line live today or later names a club the engine has in that league,
 *      so a re-bake cannot drop a club the ledger deals until its leave date.
 *   6) leave lines (hard), on an in memory ledger since the file has none
 *      yet: a leave takes a club out on its until day and not before, a
 *      rejoin and a league move read once each day, and planLines writes one
 *      leave line for a dropped club, nothing on a replan, a rejoin on the
 *      leave date, and a move as a leave plus a join the same day.
 *   7) a clock before the ledger (hard): 1970-01-01 and the day before the
 *      first line deal both dailies from the founding pool, never a crash.
 *
 * RECORD MODE (once, to make the fixture): DAILY_POOL_RECORD=1 node
 * scripts/simDailyClubPool.mjs exports origin/main 1c10e7e5's src with git
 * archive into a temp folder, bundles its engine and writes the fixture. The
 * fixture is main's own output, so section 1 needs no second checkout.
 *
 * NEGATIVE CONTROLS (DAILY_POOL_CONTROL=...), each on an in memory copy,
 * refusing to run if its anchor is not in the file, exit 1 when a predicted
 * section went red and 2 when none did:
 *   today    a new join line dated today        -> sections 1 and 3
 *   live     hotSeatPool(date) reads the live list instead of the ledger -> 1
 *   edited   a founding line's date edited in place -> sections 1 and 3
 *   aleague  the daily market's ledger filter switched off, so an A-League
 *            player or club reaches a pre-join daily market -> section 4
 *   empty    the market filter handed the leagues set for the clubs set (the
 *            review's swapped argument), so the market is empty -> section 4
 *   rivals   the hourly rivals' call drops the day and reads every league
 *            -> section 4
 *   ghost    a club the engine does not have joins after the newest line
 *            -> sections 2 and 5
 *   inclusive  a club is still in on its until day -> section 6
 *   noleave  leave lines ignored by the reader -> section 6
 *   planleave  planLines never writes a leave line -> section 6
 *   beforeledger  a date before the ledger reads an empty pool -> section 7
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const MAIN_SHA = '1c10e7e5';
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'dailyClubPoolMain1c10.json');
const FIRST_DAY = '2026-09-01', RECORD_LAST = '2026-12-31';
const CONTROL = process.env.DAILY_POOL_CONTROL || '';
const PREDICTED = { today: [1, 3], live: [1], edited: [1, 3], aleague: [4], empty: [4], rivals: [4], ghost: [2, 5], inclusive: [6], noleave: [6], planleave: [6], beforeledger: [7] };
/* Section 4's floors, from measured headroom. The dailies are a pure function
   of the date and the ledger, so these are exact counts, not samples:
   measured 2026-10-06 on the ledger of 236 lines, the eleven A-League clubs
   joining on 2026-11-05 are dealt on 17 (Manager Hot Seat) and 14 (Deadline
   Day) of the 365 days from then, about 17 expected at 11 of 236, and reach
   24 of the first 60 daily markets. The floors sit at about a third of that,
   so a later round's joins (more clubs, a smaller share each) do not turn a
   healthy ledger red, while a join that never deals still does. */
const DEALT_FLOOR = 5, MARKET_FLOOR = 6, EXPECT_DEALS = 15;
/* Section 4's floor on the hourly rivals the pre-join windows draw (Round 1044
   review), so "no rival from outside the day's leagues" cannot pass on a
   window where no rival came. Measured 2026-10-07: 590 hourly rivals in 191 of
   the 200 pre-join windows, every window burning its 12 hours (an exact count,
   the windows are seeded). The floor is a third of that. */
const RIVAL_FLOOR = 195;
if (CONTROL && !PREDICTED[CONTROL]) {
  console.error(`DAILY_POOL_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(PREDICTED).join(', ')})`);
  process.exit(2);
}
const RECORD = process.env.DAILY_POOL_RECORD === '1';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simDailyClubPool-'));
/* planleave: the generator's library with its leave branch switched off, a
   copy in the temp folder (it imports only node built ins). */
let libFile = path.join(ROOT, 'scripts', 'lib', 'dailyClubPool.mjs');
if (CONTROL === 'planleave') {
  const from = '    if (e.until === null && !want.has(k)) out.push(';
  const text = fs.readFileSync(libFile, 'utf8').replaceAll('\r\n', '\n');
  if (!text.includes(from)) { console.error('control planleave: the anchor for planLines\' leave branch is not in the file; refusing to run'); process.exit(2); }
  libFile = path.join(TMP, 'dailyClubPool.planleave.mjs');
  fs.writeFileSync(libFile, text.replace(from, '    if (false) out.push('));
  console.log('NEGATIVE CONTROL ON (planleave): planLines never writes a leave line; section 6 must go red');
}
const lib = await import(pathToFileURL(libFile).href);

let section = 0, failures = 0;
const failedSections = new Set();
const fail = msg => { failures++; failedSections.add(section); console.log(`  FAIL: ${msg}`); };
const ok = msg => console.log(`   ok  ${msg}`);
const lf = s => s.replaceAll('\r\n', '\n');
function plant(text, from, to, what) {
  if (!text.includes(from)) {
    console.error(`control ${CONTROL}: the anchor for ${what} is not in the file, so the control would change nothing; refusing to run`);
    process.exit(2);
  }
  return text.replace(from, to);
}
function git(...args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }); } catch { return null; }
}
const days = (from, to) => {
  const out = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};
const dayAfter = d => new Date(Date.parse(`${d}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const laterOf = (a, b) => (a > b ? a : b);
const realDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;

/* One CommonJS bundle of an engine tree, with '@/' resolved here so a swapped
   file replaces the real one for every importer. */
async function loadEngine(srcRoot, swaps, tag) {
  const alias = {
    name: 'dukb-alias',
    setup(b) {
      b.onResolve({ filter: /^@\// }, async args => {
        if (swaps[args.path]) return { path: swaps[args.path] };
        const r = await b.resolve('./' + args.path.slice(2), { resolveDir: srcRoot, kind: args.kind });
        return { path: r.path, errors: r.errors };
      });
    },
  };
  const entry = path.join(TMP, `entry-${tag}.mjs`), bundle = path.join(TMP, `bundle-${tag}.cjs`);
  fs.writeFileSync(entry, `export * as dd from '@/lib/deadlineDay';\nexport * as hs from '@/lib/managerHotSeat';\nexport * as du from '@/lib/dateUtils';\nexport { REAL_LEAGUES, playableClubs } from '@/lib/clubManager';\n`);
  await build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile: bundle, logLevel: 'error', plugins: [alias] });
  return createRequire(import.meta.url)(bundle);
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const dealOf = (m, date) => {
  const h = m.hs.dailyHotSeat(date), d = m.dd.dailyDeadlineDay(date);
  return { hotSeat: { club: h.club, leagueName: h.leagueName, seed: h.seed }, deadline: { club: d.club, leagueName: d.leagueName, seed: d.seed } };
};
/* Burns a window's hours on low bids, one table at a time, and returns each
   rival club the hours sent after a target nobody has called about yet, once
   per target and club. Such a rival is passHour's pick from rivalPool alone: a
   target at the table can also draw the engine's own bidding war rival
   (makeOffer in clubManager.ts, every REAL_LEAGUES club), which the ledger
   does not hold. */
function hourRivals(start) {
  const dd = mEngine.dd;
  let run = start;
  const got = new Set(), dead = new Set();
  for (let guard = 0; !run.grade && guard < 150; guard++) {
    let i = run.targets.findIndex(t => t.status === 'talks');
    if (i < 0) {
      i = run.targets.findIndex((t, k) => t.status === 'idle' && !dead.has(k));
      if (i < 0) break;
      const opened = dd.openTalks(run, i);
      if (opened === run) dead.add(i);
      run = opened;
      continue;
    }
    const amt = Math.max(0.1, Math.min(run.state.budget, Math.round(run.targets[i].neg.theirAsk * 0.7 * 10) / 10));
    const next = dd.placeBid(run, i, amt);
    run = next === run ? dd.walkFrom(run, i) : next;
    run.targets.forEach((t, k) => { if (t.status === 'idle' && t.rival) got.add(`${k}|${t.rival.club}`); });
  }
  return { clubs: [...got].map(s => s.slice(s.indexOf('|') + 1)), hours: run.hour };
}
let mEngine = null;

/* ---------- record mode: origin/main 1c10e7e5's own deals, into the fixture ---------- */
if (RECORD) {
  const names = (git('ls-tree', '-r', '--name-only', MAIN_SHA, 'src') ?? '').trim().split('\n').filter(Boolean);
  if (names.length < 100) { console.error(`git could not list ${MAIN_SHA}'s src (${names.length} files)`); process.exit(2); }
  const blob = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: names.map(n => `${MAIN_SHA}:${n}`).join('\n') + '\n', maxBuffer: 1 << 30 });
  /* Inside the tree, so the export's npm imports resolve by walk-up; removed below. */
  const MAIN_DIR = fs.mkdtempSync(path.join(ROOT, '.record-main-'));
  let pos = 0;
  for (const n of names) {
    const nl = blob.indexOf(10, pos);
    const size = Number(blob.subarray(pos, nl).toString('utf8').split(' ')[2]);
    const file = path.join(MAIN_DIR, n);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, blob.subarray(nl + 1, nl + 1 + size));
    pos = nl + 1 + size + 1;
  }
  try {
    const main = await loadEngine(path.join(MAIN_DIR, 'src'), {}, 'main');
    const pool = main.hs.hotSeatPool().map(c => ({ club: c.club, leagueId: c.leagueId, leagueName: c.leagueName }));
    const dealt = {};
    for (const d of days(FIRST_DAY, RECORD_LAST)) dealt[d] = dealOf(main, d);
    const body = { about: `Recorded by DAILY_POOL_RECORD=1 node scripts/simDailyClubPool.mjs from origin/main ${MAIN_SHA}'s own engine, exported with git: the pool the dailies dealt from before Round 1044 and every day's deal from ${FIRST_DAY} to ${RECORD_LAST}. Never edit it by hand.`, commit: MAIN_SHA, pool, dealt };
    /* One club and one day per line, so a diff of the fixture reads. */
    const text = `{\n  "about": ${JSON.stringify(body.about)},\n  "commit": ${JSON.stringify(MAIN_SHA)},\n  "pool": [\n${pool.map(c => `    ${JSON.stringify(c)}`).join(',\n')}\n  ],\n  "dealt": {\n${Object.entries(dealt).map(([d, v]) => `    ${JSON.stringify(d)}: ${JSON.stringify(v)}`).join(',\n')}\n  }\n}\n`;
    if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(body)) { console.error('the fixture text does not parse back to what was recorded'); process.exit(2); }
    fs.writeFileSync(FIXTURE, text);
    console.log(`recorded ${pool.length} clubs and ${Object.keys(dealt).length} days from ${MAIN_SHA} into ${path.relative(ROOT, FIXTURE)}`);
  } finally {
    fs.rmSync(MAIN_DIR, { recursive: true, force: true });
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  process.exit(0);
}

/* ---------- this tree, with the control's in memory copy ---------- */
const FIX = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const LEDGER = JSON.parse(fs.readFileSync(path.join(ROOT, lib.LEDGER_PATH), 'utf8'));
const swaps = {};
function swapFile(alias, name, text) {
  const file = path.join(TMP, name);
  fs.writeFileSync(file, text);
  swaps[alias] = file;
}
if (CONTROL === 'today' || CONTROL === 'edited') {
  /* today: the newest line counts from today instead of 30 days on.
     edited: a founding line re-dated in place, as though the club joined on 2026-10-01. */
  const at = CONTROL === 'today' ? LEDGER.lines.length - 1 : 3;
  const line = LEDGER.lines[at];
  const to = CONTROL === 'today' ? TODAY : '2026-10-01';
  if (!line || !('from' in line) || line.from === to) { console.error(`control ${CONTROL}: line ${at} is not a join line dated other than ${to}; refusing to run`); process.exit(2); }
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${line.club}'s line ${at} dated ${to} instead of ${line.from}; sections ${PREDICTED[CONTROL].join(' and ')} must go red`);
  line.from = to;
  swapFile('@/data/dailyClubPool.json', 'dailyClubPool.control.json', lib.formatLedger(LEDGER.lines));
}
if (CONTROL === 'live') {
  const src = lf(fs.readFileSync(path.join(SRC, 'lib', 'managerHotSeat.ts'), 'utf8'));
  swapFile('@/lib/managerHotSeat', 'managerHotSeat.live.ts', plant(src, '  if (date !== undefined) {\n', '  if (date !== undefined && false) {\n', 'the dated read of the ledger'));
  console.log('NEGATIVE CONTROL ON (live): hotSeatPool(date) reads the live list, as before this round; section 1 must go red');
}
if (CONTROL === 'aleague') {
  const src = lf(fs.readFileSync(path.join(SRC, 'lib', 'deadlineDay.ts'), 'utf8'));
  swapFile('@/lib/deadlineDay', 'deadlineDay.aleague.ts', plant(src, '  if (!daily) return null;\n  const pool = hotSeatPool(daily);', '  return null;\n  const pool = hotSeatPool(daily);', 'the daily market\'s ledger filter'));
  console.log('NEGATIVE CONTROL ON (aleague): the daily market and buyers read the whole engine; section 4 must go red');
}
if (CONTROL === 'empty' || CONTROL === 'rivals') {
  /* empty: the review's swapped argument, the leagues set where the clubs set
     belongs, so no candidate passes. rivals: the hourly rivals' call drops
     the day, so they read every league. */
  const src = lf(fs.readFileSync(path.join(SRC, 'lib', 'deadlineDay.ts'), 'utf8'));
  const [from, to, what] = CONTROL === 'empty'
    ? ['taken, rng, reach?.clubs ?? null);', 'taken, rng, reach?.leagues ?? null);', 'the market filter\'s clubs argument']
    : ['  const pool = rivalPool(run.state, run.setup.daily);\n', '  const pool = rivalPool(run.state, undefined);\n', 'the hourly rivals\' day'];
  swapFile('@/lib/deadlineDay', `deadlineDay.${CONTROL}.ts`, plant(src, from, to, what));
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${CONTROL === 'empty' ? 'the daily market filter empties the market' : 'the hourly rivals come from every league'}; section 4 must go red`);
}
if (CONTROL === 'inclusive' || CONTROL === 'noleave' || CONTROL === 'beforeledger') {
  /* inclusive: a club is still in on its until day. noleave: leave lines
     ignored. beforeledger: a date before the ledger reads an empty pool. */
  const src = lf(fs.readFileSync(path.join(SRC, 'lib', 'managerHotSeat.ts'), 'utf8'));
  const [from, to, what] = {
    inclusive: ['(e.until === null || date < e.until)', '(e.until === null || date <= e.until)', 'the until test'],
    noleave: ['        out[i].until = l.until;\n', '        void l;\n', 'the leave line\'s close'],
    beforeledger: ['dailyPoolOn(LEDGER, date < LEDGER_FIRST ? LEDGER_FIRST : date)', 'dailyPoolOn(LEDGER, date)', 'the founding pool for a date before the ledger'],
  }[CONTROL];
  swapFile('@/lib/managerHotSeat', `managerHotSeat.${CONTROL}.ts`, plant(src, from, to, what));
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${what} changed; section ${PREDICTED[CONTROL].join(' and ')} must go red`);
}
if (CONTROL === 'ghost') {
  /* A club the engine does not have, joining after the newest line. */
  const last = LEDGER.lines.reduce((a, l) => laterOf(a, 'from' in l ? l.from : l.until), TODAY);
  const first = LEDGER.lines[0];
  LEDGER.lines.push({ club: 'Nowhere Athletic', leagueId: first.leagueId, leagueName: first.leagueName, from: dayAfter(last) });
  swapFile('@/data/dailyClubPool.json', 'dailyClubPool.control.json', lib.formatLedger(LEDGER.lines));
  console.log(`NEGATIVE CONTROL ON (ghost): a club the engine does not have joins ${first.leagueName} on ${dayAfter(last)}; sections 2 and 5 must go red`);
}
const m = await loadEngine(SRC, swaps, 'here');
mEngine = m;
const L = CONTROL === 'today' || CONTROL === 'edited' || CONTROL === 'ghost' ? LEDGER.lines : JSON.parse(fs.readFileSync(path.join(ROOT, lib.LEDGER_PATH), 'utf8')).lines;
if (m.du.getTodayET() !== TODAY) console.log(`   note: the engine's Eastern day is ${m.du.getTodayET()}, this harness's ${TODAY} (a run across midnight)`);
const dateOf = l => ('from' in l ? l.from : l.until);
const dayBefore = d => new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const minOf = (a, b) => (a < b ? a : b), maxOf = (a, b) => (a > b ? a : b);
/* The founding lines: origin/main's ledger once main has one, until then the fixture's main pool from 2000-01-01. */
const MAIN_TEXT = git('show', `origin/main:${lib.LEDGER_PATH.replaceAll('\\', '/')}`);
const BASE = MAIN_TEXT ? JSON.parse(MAIN_TEXT).lines : FIX.pool.map(c => ({ ...c, from: '2000-01-01' }));
/* Section 4's join: the first date any line after the founding block moves the pool. */
const JOIN = L.map(dateOf).filter(d => d > '2000-01-01').sort()[0] ?? null;
/* The PRE_WINDOWS days before it. Under the rivals control only about one
   hourly rival in fifty comes from a league the day does not hold, so 65
   windows (from FIRST_DAY) drew 4 and 200 draw enough that a data change
   cannot leave the control nothing to find. */
const PRE_WINDOWS = 200;
const PRE_END = JOIN ? minOf(dayBefore(JOIN), RECORD_LAST) : RECORD_LAST;
const PRE_JOIN_DAYS = days(new Date(Date.parse(`${PRE_END}T12:00:00Z`) - (PRE_WINDOWS - 1) * 86_400_000).toISOString().slice(0, 10), PRE_END);
/* Section 1's range. Today has been dealt whatever the ledger says, and so
   has every day before the first line new since main, so both are checked.
   The fixture (main 1c10e7e5's own engine) is the truth up to the day before
   the first legitimate move: the first date after the founding lines in
   main's ledger, or while main has none, the first new line dated after
   today (a line dated today or earlier is not legitimate, section 3). Days
   after that, up to the range's end, are this tree's engine over main's
   ledger. */
const firstNew = L.slice(BASE.length).map(dateOf).sort()[0] ?? null;
const END = firstNew ? maxOf(TODAY, dayBefore(firstNew)) : TODAY;
const legit = (MAIN_TEXT ? BASE.map(dateOf) : L.slice(BASE.length).map(dateOf).filter(d => d > TODAY)).filter(d => d > '2000-01-01').sort()[0] ?? null;
const FIXTURE_END = legit ? dayBefore(legit) : RECORD_LAST;
console.log(`ledger ${L.length} lines (${BASE.length} founding, from ${MAIN_TEXT ? 'origin/main' : `the fixture of ${FIX.commit}`}), first move ${JOIN ?? 'none'}; today ${TODAY} ET`);

/* ---------- 1. no re-deal ---------- */
section = 1;
console.log(`1) Every day from ${FIRST_DAY} to ${END} deals what main dealt, in both dailies`);
{
  let same = 0, n = 0;
  const moved = [];
  const check = (d, want, got) => {
    n++;
    if (JSON.stringify(got) === JSON.stringify(want)) same++;
    else moved.push(`${d}: hot seat ${want.hotSeat.club} -> ${got.hotSeat.club}, deadline ${want.deadline.club} -> ${got.deadline.club}`);
  };
  for (const d of days(FIRST_DAY, minOf(END, FIXTURE_END))) {
    if (!FIX.dealt[d]) { fail(`the fixture has no deal for ${d}; re-record it`); continue; }
    check(d, FIX.dealt[d], dealOf(m, d));
  }
  const after = END > FIXTURE_END ? days(new Date(Date.parse(`${FIXTURE_END}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10), END) : [];
  if (after.length && !MAIN_TEXT) fail(`days ${after[0]} to ${END} are past the fixture's truth and main has no ledger to read them from`);
  else if (after.length) {
    const mainFile = path.join(TMP, 'dailyClubPool.main.json');
    fs.writeFileSync(mainFile, MAIN_TEXT);
    const ref = await loadEngine(SRC, { '@/data/dailyClubPool.json': mainFile }, 'ref');
    for (const d of after) check(d, dealOf(ref, d), dealOf(m, d));
  }
  for (const s of moved.slice(0, 5)) fail(`re-dealt ${s}`);
  if (moved.length > 5) fail(`... and ${moved.length - 5} more days re-dealt`);
  console.log(`   ${same} of ${n} days deal main's club, league and seed in both dailies (the fixture to ${minOf(END, FIXTURE_END)}${after.length ? `, main's ledger from ${after[0]}` : ''})`);
  if (!failedSections.has(1)) ok('no day already dealt, and no day before the first new line, is re-dealt');
}

/* ---------- 2. the ledger is the generator's ---------- */
section = 2;
console.log('2) The ledger is what scripts/genDailyClubPool.mjs writes: nothing to append against the engine');
{
  const eligible = m.hs.hotSeatPool();
  const plan = lib.planLines({ eligible, entries: m.hs.dailyPoolEntries(L), since: TODAY });
  for (const l of plan.slice(0, 5)) fail(`the generator would append ${JSON.stringify(l)}`);
  if (plan.length > 5) fail(`... and ${plan.length - 5} more lines`);
  console.log(`   engine ${eligible.length} eligible clubs, ${m.hs.dailyPoolEntries(L).filter(e => e.until === null).length} open ledger lines, ${plan.length} to append`);
  if (!CONTROL) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'genDailyClubPool.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) fail(`node scripts/genDailyClubPool.mjs --check exited ${r.status}: ${(r.stdout + r.stderr).trim().split('\n').slice(-3).join(' / ')}`);
    else console.log('   node scripts/genDailyClubPool.mjs --check exited 0');
  }
  if (!failedSections.has(2)) ok('the ledger holds every eligible club and nothing else open');
}

/* ---------- 3. append only ---------- */
section = 3;
console.log('3) Append only: real dates, every leave closes a join, nobody in twice, main\'s lines kept, every new line after today');
{
  const isJoin = l => l && typeof l.club === 'string' && typeof l.leagueId === 'string' && typeof l.leagueName === 'string' && 'from' in l && !('until' in l);
  const isLeave = l => l && typeof l.club === 'string' && typeof l.leagueId === 'string' && 'until' in l && !('from' in l) && !('leagueName' in l);
  const open = new Map();
  L.forEach((l, i) => {
    if (!isJoin(l) && !isLeave(l)) return fail(`line ${i} is neither a join nor a leave line: ${JSON.stringify(l)}`);
    if (!realDate(dateOf(l))) return fail(`line ${i} (${l.club}) carries "${dateOf(l)}", not a real date`);
    const k = `${l.leagueId}|${l.club}`;
    if (isJoin(l) && open.get(k)) fail(`line ${i} joins ${l.club} (${l.leagueId}) while line ${open.get(k).i} still has them in`);
    if (isLeave(l) && !open.get(k)) fail(`line ${i} closes ${l.club} (${l.leagueId}), who has no open line`);
    open.set(k, isJoin(l) ? { i } : null);
  });
  /* Nobody in twice on any day: per club name, the live spans never overlap (a club cannot be in two leagues at once either). */
  const spans = new Map();
  for (const e of m.hs.dailyPoolEntries(L)) {
    const list = spans.get(e.club) ?? [];
    for (const o of list) {
      const a = e.from < (o.until ?? '9999-12-31') && o.from < (e.until ?? '9999-12-31');
      if (a) fail(`${e.club} is in the pool twice from ${e.from > o.from ? e.from : o.from}`);
    }
    list.push(e);
    spans.set(e.club, list);
  }
  const base = BASE;
  const baseFrom = MAIN_TEXT ? 'origin/main\'s ledger' : `the fixture's main ${FIX.commit} pool, all from 2000-01-01`;
  let kept = 0;
  while (kept < base.length && kept < L.length && JSON.stringify(lib.lineOf(L[kept])) === JSON.stringify(lib.lineOf(base[kept]))) kept++;
  if (kept < base.length) fail(`the ledger does not start with ${baseFrom}: line ${kept} is ${JSON.stringify(L[kept])}, it was ${JSON.stringify(base[kept])}. A line was edited, moved or removed, which re-deals days already played`);
  const fresh = L.slice(base.length);
  const early = fresh.filter(l => !(dateOf(l) > TODAY));
  for (const l of early.slice(0, 5)) fail(`a new line is dated ${dateOf(l)}, not after today (${TODAY} ET): ${l.club} would change days already dealt`);
  for (let i = 1; i < fresh.length; i++) if (dateOf(fresh[i]) < dateOf(fresh[i - 1])) fail(`new line ${base.length + i} (${dateOf(fresh[i])}) is dated before the line above it (${dateOf(fresh[i - 1])})`);
  console.log(`   founding lines: ${baseFrom}, ${base.length}, ${kept === base.length ? 'all kept in order' : `${kept} kept`}; ${fresh.length} new, ${early.length} of them dated today or earlier`);
  if (!failedSections.has(3)) ok('every line is real and dated, the founding lines are untouched and every new line is in the future');
}

/* ---------- 4. the joins are dealt, and nobody before they join ---------- */
section = 4;
console.log('4) Before a club joins, no daily market or buyer names it; from its join date it is in the pool and dealt');
{
  /* Before the first move: every candidate plays for a club in the day's
     ledger pool, and every buyer is a club of one of the day's leagues (a
     buyer may be a partial club, as rivals always could; only its league has
     to be in that day's pool). */
  const leagueOf = new Map(m.REAL_LEAGUES.flatMap(l => m.playableClubs(l.id).map(c => [c.name, l.id])));
  let windows = 0, men = 0, buyers = 0, outside = 0, rivals = 0, rivalsOut = 0, rivalWindows = 0, hours = 0;
  const seen = new Map(), thin = [];
  for (const d of PRE_JOIN_DAYS) {
    const dayPool = m.hs.dailyPoolOn(L, d);
    const pool = new Set(dayPool.map(c => c.club)), leagues = new Set(dayPool.map(c => c.leagueId));
    const day = m.dd.dailyDeadlineDay(d);
    const run = m.dd.startDeadlineDay({ club: day.club, seed: day.seed, daily: day.daily });
    windows++;
    /* A filter that emptied the market would pass the "nobody from outside"
       line with nobody in it, so every window must still be a real brief:
       three or four needs, at least two approaches each (the shape
       simDeadlineDay section 1 holds on every window). */
    const per = run.needs.map((_, n) => run.targets.filter(t => t.need === n).length);
    if (per.length < 3 || per.some(k => k < 2)) thin.push(`${d} (${per.join('/') || 'no needs'})`);
    const out = [
      ...run.targets.map(t => t.mp.club).filter(c => { men++; return !pool.has(c); }),
      ...run.sales.map(s => s.club).filter(c => { buyers++; return !leagues.has(leagueOf.get(c)); }),
    ];
    /* The hours: the rivals passHour sends keep to the day's leagues too. */
    const hr = hourRivals(run);
    hours += hr.hours;
    if (hr.clubs.length) rivalWindows++;
    for (const c of hr.clubs) {
      rivals++;
      if (!leagues.has(leagueOf.get(c))) { rivalsOut++; out.push(c); }
    }
    for (const c of out) { outside++; seen.set(c, (seen.get(c) ?? 0) + 1); }
  }
  if (thin.length) fail(`${thin.length} of ${windows} pre-join daily windows are not a full brief (approaches per need): ${thin.slice(0, 4).join(', ')}`);
  if (rivals < RIVAL_FLOOR) fail(`the hours of ${windows} pre-join windows sent only ${rivals} rivals, under the floor of ${RIVAL_FLOOR}, so the rival check below proves little`);
  if (outside) fail(`${outside} of ${men} candidates, ${buyers} buyers and ${rivals} hourly rivals in ${windows} pre-join daily windows come from outside that day's pool: ${[...seen].slice(0, 6).map(([c, k]) => `${c} x${k}`).join(', ')}`);
  console.log(`   ${windows} daily windows from ${PRE_JOIN_DAYS[0]} to ${PRE_END}: ${men} candidates (${thin.length} windows short of a full brief), ${buyers} buyers and ${rivals} hourly rivals (in ${rivalWindows} windows, over ${hours} hours), ${outside} from outside the day's pool (${rivalsOut} of them rivals)`);
  /* From each join date (every one, not only the first: a later round's
     joins must be dealt too): the joining clubs are in every day's pool and
     both dailies deal them. The span runs a year, longer for a small join,
     until about EXPECT_DEALS deals are expected, so the floor of DEALT_FLOOR
     sits near a third of the expectation however few clubs join. The market
     check runs on the first join only: the filter is one mechanism. */
  const JOINS = [...new Set(L.filter(l => 'from' in l && l.from > '2000-01-01').map(l => l.from))].sort();
  JOINS.forEach((J, gi) => {
    const joined = L.filter(l => 'from' in l && l.from === J);
    const names = new Set(joined.map(l => l.club));
    let missing = 0, hsDealt = 0, ddDealt = 0, mkt = 0, expect = 0, n = 0;
    /* A joining club may only be missing on a day a later leave line has closed it. */
    const closedBy = new Map(m.hs.dailyPoolEntries(L).filter(e => e.from === J && names.has(e.club)).map(e => [e.club, e.until]));
    for (let t = Date.parse(`${J}T12:00:00Z`); n < 365 || (expect < EXPECT_DEALS && n < 20 * 365); t += 86_400_000, n++) {
      const d = new Date(t).toISOString().slice(0, 10);
      const dayPool = m.hs.hotSeatPool(d);
      const pool = new Set(dayPool.map(c => c.club));
      for (const l of joined) if (!pool.has(l.club) && !(closedBy.get(l.club) && closedBy.get(l.club) <= d)) missing++;
      expect += [...names].filter(c => pool.has(c)).length / dayPool.length;
      if (names.has(m.hs.dailyHotSeat(d).club)) hsDealt++;
      if (names.has(m.dd.dailyDeadlineDay(d).club)) ddDealt++;
    }
    if (gi === 0) {
      for (const d of days(J, new Date(Date.parse(`${J}T12:00:00Z`) + 59 * 86_400_000).toISOString().slice(0, 10))) {
        const day = m.dd.dailyDeadlineDay(d);
        const run = m.dd.startDeadlineDay({ club: day.club, seed: day.seed, daily: day.daily });
        if ([...run.targets.map(t => t.mp.club), ...run.sales.map(s => s.club)].some(c => names.has(c))) mkt++;
      }
      if (mkt < MARKET_FLOOR) fail(`in the 60 daily windows from ${J} only ${mkt} name a joining club's player or a joining club as a buyer, under the floor of ${MARKET_FLOOR}`);
    }
    const floor = Math.min(DEALT_FLOOR, Math.floor(expect / 3));
    if (missing) fail(`${missing} club days after ${J} leave out a club that joined then`);
    if (hsDealt < floor || ddDealt < floor) fail(`in the ${n} days from ${J} Manager Hot Seat deals the ${names.size} joining clubs on ${hsDealt} days and Deadline Day on ${ddDealt}, under the floor of ${floor} (about ${Math.round(expect)} expected)`);
    console.log(`   ${names.size} clubs join on ${J}: in the pool every day of the next ${n} (${missing} club days missing); dealt by Manager Hot Seat on ${hsDealt} days and Deadline Day on ${ddDealt} (about ${Math.round(expect)} expected, floor ${floor})${gi === 0 ? `; in ${mkt} of the first 60 daily markets` : ''}`);
  });
  if (!failedSections.has(4)) ok('no club reaches a daily before its join date, and every join is dealt from it');
}

/* ---------- 5. every club the ledger can still deal is one the engine runs ---------- */
section = 5;
console.log('5) Every club the ledger deals from today on is a club the engine runs, in that league');
{
  /* A club a re-bake drops or renames stays dealt until its leave line's date
     (30 days on, by design), and the engine would run it on a stub def in a
     league that does not hold it. So the engine has to keep a club until its
     leave date: this goes red on a tree that drops one early. */
  const runs = new Set(m.REAL_LEAGUES.flatMap(l => m.playableClubs(l.id).map(c => `${l.id}|${c.name}`)));
  const live = m.hs.dailyPoolEntries(L).filter(e => e.until === null || e.until > TODAY);
  const ghosts = live.filter(e => !runs.has(`${e.leagueId}|${e.club}`));
  for (const e of ghosts.slice(0, 5)) fail(`${e.club} (${e.leagueId}) is in the ledger's pool from ${laterOf(e.from, TODAY)}${e.until ? ` to ${e.until}` : ' on'}, but the engine runs no such club in that league`);
  if (ghosts.length > 5) fail(`... and ${ghosts.length - 5} more`);
  console.log(`   ${live.length} ledger lines live today or later, ${ghosts.length} naming a club the engine does not run there`);
  if (!failedSections.has(5)) ok('the engine runs every club the ledger can still deal');
}

/* ---------- 6. leave lines ---------- */
section = 6;
console.log('6) A leave line closes a club from its until day; a rejoin and a league move read right; the generator writes each once');
{
  /* The real ledger has no leave line yet, so this runs on an in memory
     ledger built from the engine's eligible list, independent of the file. */
  const hs = m.hs;
  const eligible = hs.hotSeatPool();
  const B0 = eligible.map(c => ({ club: c.club, leagueId: c.leagueId, leagueName: c.leagueName, from: '2000-01-01' }));
  const A = B0[0], B = B0[1], C = B0[2];
  const other = B0.find(l => l.leagueId !== B.leagueId);
  const D1 = '2030-03-01', D2 = '2030-06-01', D3 = '2030-09-01', S = '2030-01-01';
  const T = [...B0,
    { club: A.club, leagueId: A.leagueId, until: D1 },
    { club: A.club, leagueId: A.leagueId, leagueName: A.leagueName, from: D2 },
    { club: B.club, leagueId: B.leagueId, until: D3 },
    { club: B.club, leagueId: other.leagueId, leagueName: other.leagueName, from: D3 },
  ];
  const has = (lines, d, c, lg) => hs.dailyPoolOn(lines, d).filter(x => x.club === c && (!lg || x.leagueId === lg)).length;
  const size = d => hs.dailyPoolOn(T, d).length;
  const same = (a, b) => JSON.stringify(a.map(lib.lineOf)) === JSON.stringify(b.map(lib.lineOf));
  const checks = [
    [has(T, dayBefore(D1), A.club) === 1 && has(T, D1, A.club) === 0, `${A.club} is in on ${dayBefore(D1)} and out on ${D1}, its until day (${has(T, dayBefore(D1), A.club)}, ${has(T, D1, A.club)})`],
    [size(D1) === size(dayBefore(D1)) - 1, `the pool is one club smaller on ${D1} (${size(dayBefore(D1))} to ${size(D1)})`],
    [has(T, dayBefore(D2), A.club) === 0 && has(T, D2, A.club) === 1, `${A.club} rejoins on ${D2}, once`],
    [has(T, dayBefore(D3), B.club, B.leagueId) === 1 && has(T, dayBefore(D3), B.club) === 1, `${B.club} reads ${B.leagueId} on ${dayBefore(D3)}, once`],
    [has(T, D3, B.club, other.leagueId) === 1 && has(T, D3, B.club) === 1, `${B.club} reads ${other.leagueId} from ${D3}, once`],
  ];
  /* The generator: the engine drops C, so one leave line dated `since`; a
     replan then appends nothing; C back before the leave date rejoins on it. */
  const less = eligible.filter(c => !(c.club === C.club && c.leagueId === C.leagueId));
  const plan1 = lib.planLines({ eligible: less, entries: hs.dailyPoolEntries(B0), since: S });
  const left = [...B0, ...plan1];
  checks.push([same(plan1, [{ club: C.club, leagueId: C.leagueId, until: S }]), `planLines writes one leave line for ${C.club} dated ${S} when the engine drops it (wrote ${JSON.stringify(plan1)})`]);
  checks.push([lib.planLines({ eligible: less, entries: hs.dailyPoolEntries(left), since: S }).length === 0, 'a replan after the leave appends nothing']);
  checks.push([has(left, dayBefore(S), C.club) === 1 && has(left, S, C.club) === 0, `the leave it wrote takes ${C.club} out on ${S} and not before`]);
  const back = lib.planLines({ eligible, entries: hs.dailyPoolEntries(left), since: '2029-12-01' });
  checks.push([same(back, [{ club: C.club, leagueId: C.leagueId, leagueName: C.leagueName, from: S }]), `${C.club} back in the engine before its leave date rejoins on ${S} (wrote ${JSON.stringify(back)})`]);
  /* A league move through the generator: a leave in the old league and a join in the new, the same day. */
  const moved = eligible.map(c => (c.club === B.club && c.leagueId === B.leagueId ? { ...c, leagueId: other.leagueId, leagueName: other.leagueName } : c));
  const plan3 = [...B0, ...lib.planLines({ eligible: moved, entries: hs.dailyPoolEntries(B0), since: S })];
  checks.push([has(plan3, dayBefore(S), B.club, B.leagueId) === 1 && has(plan3, S, B.club, other.leagueId) === 1 && has(plan3, S, B.club) === 1, `planLines moves ${B.club} from ${B.leagueId} to ${other.leagueId} on ${S}, never in twice`]);
  for (const [good, what] of checks) if (!good) fail(what);
  console.log(`   ${checks.length} checks on an in memory ledger of ${B0.length} founding lines plus leave, rejoin and move lines, ${checks.filter(c => !c[0]).length} failed`);
  if (!failedSections.has(6)) ok('the leave line form reads and is written the way the ledger says');
}

/* ---------- 7. a clock before the ledger ---------- */
section = 7;
console.log('7) A device clock before the ledger\'s first day still deals both dailies, from the founding pool');
{
  const FIRST = L.reduce((a, l) => ('from' in l && l.from < a ? l.from : a), '9999-12-31');
  const founding = m.hs.dailyPoolOn(L, FIRST);
  for (const d of ['1970-01-01', dayBefore(FIRST)]) {
    try {
      const pool = m.hs.hotSeatPool(d);
      const h = m.hs.dailyHotSeat(d), dd = m.dd.dailyDeadlineDay(d);
      if (JSON.stringify(pool) !== JSON.stringify(founding)) fail(`${d} reads a pool of ${pool.length}, not the founding ${founding.length}`);
      if (![h.club, dd.club].every(c => founding.some(f => f.club === c))) fail(`${d} deals ${h.club} and ${dd.club}, not founding clubs`);
    } catch (e) {
      fail(`${d}: the dailies throw (${e.message})`);
    }
  }
  console.log(`   1970-01-01 and ${dayBefore(FIRST)} checked against the ${founding.length} clubs live on ${FIRST}`);
  if (!failedSections.has(7)) ok('a reset clock gets a daily, never a crash');
}

/* ---------- verdict ---------- */
fs.rmSync(TMP, { recursive: true, force: true });
if (CONTROL) {
  const want = PREDICTED[CONTROL];
  const red = [...failedSections].sort();
  console.log(`\ncontrol ${CONTROL}: sections red ${red.join(', ') || 'none'}; predicted ${want.join(', ')}`);
  if (want.every(s => failedSections.has(s))) { console.log('the control fired: the check can fail'); process.exit(1); }
  console.error('the control did NOT fire: the check proves nothing');
  process.exit(2);
}
console.log(`\nsimDailyClubPool: ${failures ? `${failures} failure(s)` : 'all sections green'}`);
process.exit(failures ? 1 : 0);
