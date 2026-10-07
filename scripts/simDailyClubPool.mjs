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
 *   4) the joins are dealt, and nobody before they join (hard). From the join
 *      date the A-League clubs are in every day's pool and both dailies deal
 *      them; before it, no pre-join daily window's market or buyers name a
 *      club outside that day's pool.
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
const PREDICTED = { today: [1, 3], live: [1], edited: [1, 3], aleague: [4] };
/* Section 4's floors, from measured headroom. The dailies are a pure function
   of the date and the ledger, so these are exact counts, not samples:
   measured 2026-10-06 on the ledger of 236 lines, the eleven A-League clubs
   joining on 2026-11-05 are dealt on 17 (Manager Hot Seat) and 14 (Deadline
   Day) of the 365 days from then, about 17 expected at 11 of 236, and reach
   24 of the first 60 daily markets. The floors sit at about a third of that,
   so a later round's joins (more clubs, a smaller share each) do not turn a
   healthy ledger red, while a join that never deals still does. */
const DEALT_FLOOR = 5, MARKET_FLOOR = 6;
if (CONTROL && !PREDICTED[CONTROL]) {
  console.error(`DAILY_POOL_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(PREDICTED).join(', ')})`);
  process.exit(2);
}
const RECORD = process.env.DAILY_POOL_RECORD === '1';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simDailyClubPool-'));
const lib = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'dailyClubPool.mjs')).href);

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
const m = await loadEngine(SRC, swaps, 'here');
const L = CONTROL === 'today' || CONTROL === 'edited' ? LEDGER.lines : JSON.parse(fs.readFileSync(path.join(ROOT, lib.LEDGER_PATH), 'utf8')).lines;
if (m.du.getTodayET() !== TODAY) console.log(`   note: the engine's Eastern day is ${m.du.getTodayET()}, this harness's ${TODAY} (a run across midnight)`);
const dateOf = l => ('from' in l ? l.from : l.until);
const dayBefore = d => new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const minOf = (a, b) => (a < b ? a : b), maxOf = (a, b) => (a > b ? a : b);
/* The founding lines: origin/main's ledger once main has one, until then the fixture's main pool from 2000-01-01. */
const MAIN_TEXT = git('show', `origin/main:${lib.LEDGER_PATH.replaceAll('\\', '/')}`);
const BASE = MAIN_TEXT ? JSON.parse(MAIN_TEXT).lines : FIX.pool.map(c => ({ ...c, from: '2000-01-01' }));
/* Section 4's join: the first date any line after the founding block moves the pool. */
const JOIN = L.map(dateOf).filter(d => d > '2000-01-01').sort()[0] ?? null;
const PRE_JOIN_DAYS = days(FIRST_DAY, JOIN ? minOf(dayBefore(JOIN), RECORD_LAST) : RECORD_LAST);
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
  let windows = 0, men = 0, buyers = 0, outside = 0;
  const seen = new Map();
  for (const d of PRE_JOIN_DAYS) {
    const dayPool = m.hs.dailyPoolOn(L, d);
    const pool = new Set(dayPool.map(c => c.club)), leagues = new Set(dayPool.map(c => c.leagueId));
    const day = m.dd.dailyDeadlineDay(d);
    const run = m.dd.startDeadlineDay({ club: day.club, seed: day.seed, daily: day.daily });
    windows++;
    const out = [
      ...run.targets.map(t => t.mp.club).filter(c => { men++; return !pool.has(c); }),
      ...run.sales.map(s => s.club).filter(c => { buyers++; return !leagues.has(leagueOf.get(c)); }),
    ];
    for (const c of out) { outside++; seen.set(c, (seen.get(c) ?? 0) + 1); }
  }
  if (outside) fail(`${outside} of ${men} candidates and ${buyers} buyers in ${windows} pre-join daily windows come from outside that day's pool: ${[...seen].slice(0, 6).map(([c, k]) => `${c} x${k}`).join(', ')}`);
  console.log(`   ${windows} daily windows from ${FIRST_DAY} to ${PRE_JOIN_DAYS[PRE_JOIN_DAYS.length - 1]}: ${men} candidates and ${buyers} buyers, ${outside} from outside the day's pool`);
  /* From the join date: the joining clubs are in every day's pool and both dailies deal them. */
  if (JOIN) {
    const joined = L.filter(l => 'from' in l && l.from === JOIN);
    const YEAR = days(JOIN, new Date(Date.parse(`${JOIN}T12:00:00Z`) + 364 * 86_400_000).toISOString().slice(0, 10));
    const names = new Set(joined.map(l => l.club));
    let missing = 0, hsDealt = 0, ddDealt = 0, mkt = 0;
    /* A joining club may only be missing on a day a later leave line has closed it. */
    const closedBy = new Map(m.hs.dailyPoolEntries(L).filter(e => e.from === JOIN && names.has(e.club)).map(e => [e.club, e.until]));
    for (const d of YEAR) {
      const pool = new Set(m.hs.hotSeatPool(d).map(c => c.club));
      for (const l of joined) if (!pool.has(l.club) && !(closedBy.get(l.club) && closedBy.get(l.club) <= d)) missing++;
      if (names.has(m.hs.dailyHotSeat(d).club)) hsDealt++;
      if (names.has(m.dd.dailyDeadlineDay(d).club)) ddDealt++;
    }
    for (const d of YEAR.slice(0, 60)) {
      const day = m.dd.dailyDeadlineDay(d);
      const run = m.dd.startDeadlineDay({ club: day.club, seed: day.seed, daily: day.daily });
      if ([...run.targets.map(t => t.mp.club), ...run.sales.map(s => s.club)].some(c => names.has(c))) mkt++;
    }
    const expect = Math.round(YEAR.length * names.size / m.hs.hotSeatPool(JOIN).length);
    if (missing) fail(`${missing} club days after ${JOIN} leave out a club that joined then`);
    if (hsDealt < DEALT_FLOOR || ddDealt < DEALT_FLOOR) fail(`in the year from ${JOIN} Manager Hot Seat deals the ${names.size} joining clubs on ${hsDealt} days and Deadline Day on ${ddDealt}, under the floor of ${DEALT_FLOOR} (about ${expect} expected)`);
    if (mkt < MARKET_FLOOR) fail(`in the 60 daily windows from ${JOIN} only ${mkt} name a joining club's player or a joining club as a buyer, under the floor of ${MARKET_FLOOR}`);
    console.log(`   ${names.size} clubs join on ${JOIN}: in the pool every day of the next year (${missing} club days missing); dealt by Manager Hot Seat on ${hsDealt} days and Deadline Day on ${ddDealt} (about ${expect} expected); in ${mkt} of the first 60 daily markets`);
  }
  if (!failedSections.has(4)) ok('no club reaches a daily before its join date, and every join is dealt from it');
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
