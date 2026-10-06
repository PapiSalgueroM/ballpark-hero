/**
 * Round 946: the GM league year calendar, and the date helpers it shares
 * with Club Manager.
 *
 * Run: node scripts/simGmCalendar.mjs
 *
 * Sections:
 *   1) The lift moved nothing. Club Manager's date helpers moved to
 *      src/lib/calDate.ts; scripts/data/calDateFixture946.json was recorded
 *      from origin/main before the move (scripts/recordCalDateFixture946.mjs,
 *      procedure in scripts/lib/calDateProbe946.mjs) and every hash in it must
 *      replay identically on this tree.
 *   2) Every league year keeps its rules (validateLeagueYear): every phase is
 *      one date range, two sourced or carrying a thin note and listed in
 *      GM_CALENDAR_PARTIAL, a phase with no source marked estimate; Wikipedia
 *      never counts toward the two (the owner's rule: spot checks only), for
 *      a phase or a regular season span, checked by the module's validator
 *      and again by a literal rule here; the
 *      deadline inside the regular season; every engine period one range,
 *      back to back, first day to last; and every sport stops for the six
 *      things the brief names (re-sign, draft, free agency, cut down day, the
 *      deadline, the season's end), a literal here, not read from the module.
 *   3) The engine periods are the engines' own counts, read from the code of
 *      frontOffice.ts, nbaFrontOffice.ts, mlbFrontOffice.ts, nhlFrontOffice.ts.
 *   4) A sim to a day never runs past a stop. Every pair of days in each year
 *      (from any day to any later day) is planned and must stop exactly at
 *      the first stop after the start, or reach the target; then a chained
 *      walk to the year's end with seeded host stops (a deal running out, a
 *      starter hurt, an inbox ask) must halt on every stop in turn and play
 *      every period exactly once. Every plan must also say which stop it
 *      halted for, one on the target day included. Then stops that come up
 *      mid run: runSimPlan with an engine that raises a stop in three seeded
 *      periods a year must end each run on the raising period, the next plan
 *      must hold until the stop is dropped, and every period is still played
 *      once and every calendar stop still seen. Last, deadlinePeriod is the
 *      count the walk has played at the deadline stop, and the measured one.
 *   5) Each league's real order, as facts that do not come from
 *      GM_PHASE_ORDER: the NFL opens its market before its draft, the NBA and
 *      NHL draft before theirs, baseball drafts mid season after opening day,
 *      the lottery comes before the draft, the deadline before the playoffs.
 *   6) The grid: every month of every year drawn, every regular season day in
 *      exactly one period, every period with its games, every phase marked on
 *      its first day once, every stop on exactly one day, and every host stop
 *      handed to the grid outlined on its own day.
 *   7) The offseason as steps: in date order, every phase before opening day,
 *      and baseball's draft an in season step; nextStep checked on every day
 *      of every year (the second day of the draft is still the draft).
 *
 * Measured on this tree (2026-10-05, after the fixer pass sourced seven
 * guessed dates and cut the MLB postseason to 31 October, and the next one
 * put a second source other than Wikipedia beside every Wikipedia date):
 * 35 phases, 14 of them thin and 4 estimates, 22 two sourced without
 * Wikipedia and 19 citing it as a spot check; section 4 plans 301,302 pairs of days over the
 * four years; the chained walk with four host stops a year, seeds 1 to 5,
 * halts 10 times a year (a host stop on a calendar stop's day is a stop of
 * its own) and plays 17, 20, 27 and 20 periods; the mid run walk raises 15
 * stops per sport over the five seeds; deadlinePeriod is nfl 8, nba 13,
 * mlb 19, nhl 15; section 5 holds 29 order facts; section 6 draws 1,582 days.
 * The fixture's date rule section was proved by hand on 2026-10-05: a scratch
 * tap rule (target >= week) recorded through scripts/recordCalDateFixture946.mjs
 * changes all three careers' dateRule hashes.
 * Every check here is exact (a date, a count, an order), so there is no
 * band to set: a single wrong day fails.
 *
 * Negative controls (GM_CALENDAR_CONTROL=<name>), each must turn its section red:
 *   fixture   dayOfWeek in a scratch copy of calDate.ts is off by one day (1)
 *   deadline  the NBA deadline dated 12 April 2027, after the last regular season day (2)
 *   thin      the NBA rosters day loses its thin note while it has one source (2)
 *   wiki      the NBA lottery's CBS Sports source becomes a Wikipedia one, so
 *             it rests on nba.com plus Wikipedia with no thin note (2)
 *   wikispan  the NFL season span's league source becomes a Wikipedia one (2)
 *   periods   the period cut leaves a one day gap between ranges (2, 6)
 *   engine    the NBA year claims 21 rounds (3)
 *   halt      the sim plan ignores its stops and runs to the target (4)
 *   order     baseball's draft moved to February, before opening day (5)
 *   nohalt    the NBA deadline marked halts: false (2)
 *   estimate  the NBA re-sign window, no source, loses its estimate mark (2)
 *   haltday   a stop on the target day goes unreported, k < t (4)
 *   midrun    runSimPlan ignores a stop the engine raises (4)
 *   openstop  an open host stop no longer holds the run (4)
 *   dlperiod  deadlinePeriod counts the period the deadline falls in (4)
 *   grid      the month grid drops the host stops (6)
 *   steps     opening day counts as an offseason step (7)
 *   nextstep  nextStep skips a phase already running (7)
 * Measured 2026-10-05, failures per control: fixture 16, deadline 2, thin 3,
 * wiki 2, wikispan 2, periods 174, engine 2, halt 68, order 4, nohalt 3,
 * estimate 2, haltday 24, midrun 49, openstop 20, dlperiod 6, grid 16,
 * steps 4, nextstep 4.
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probeCalDate } from './lib/calDateProbe946.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.GM_CALENDAR_CONTROL || '';
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmcalendar-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---- the controls: a module swapped for a scratch copy with one rewrite ---- */
const CONTROLS = {
  fixture: {
    file: 'src/lib/calDate.ts',
    fixed: 'Math.floor(yy / 400) + t[m - 1] + d) % 7',
    broken: 'Math.floor(yy / 400) + t[m - 1] + d + 1) % 7',
    say: 'CONTROL fixture: dayOfWeek is off by one day, section 1 must go red',
  },
  deadline: {
    file: 'src/lib/gmCalendar.ts',
    fixed: "{ id: 'deadline', label: 'Trade deadline', start: '2027-02-11', end: '2027-02-11', halts: true,",
    broken: "{ id: 'deadline', label: 'Trade deadline', start: '2027-04-12', end: '2027-04-12', halts: true,",
    say: 'CONTROL deadline: the NBA deadline is dated after the last regular season day, section 2 must go red',
  },
  thin: {
    file: 'src/lib/gmCalendar.ts',
    fixed: "sources: [`${NBACOM}: Oct. 19, rosters set for opening day (5 p.m. ET)`],\n      thin: 'One source (nba.com).' },",
    broken: "sources: [`${NBACOM}: Oct. 19, rosters set for opening day (5 p.m. ET)`] },",
    say: 'CONTROL thin: the NBA rosters day has one source and no thin note, section 2 must go red',
  },
  wiki: {
    file: 'src/lib/gmCalendar.ts',
    fixed: "'CBS Sports, 2026 NBA Draft Lottery winners and losers",
    broken: "'Wikipedia (raw wikitext): CBS Sports, 2026 NBA Draft Lottery winners and losers",
    say: 'CONTROL wiki: the NBA lottery rests on nba.com plus Wikipedia with no thin note, section 2 must go red',
  },
  wikispan: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'regularSources: [`${NFL_SCHEDULE}: kicks off',
    broken: 'regularSources: [`${WIKI}: kicks off',
    say: 'CONTROL wikispan: the NFL season span rests on ESPN plus Wikipedia, section 2 must go red',
  },
  periods: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'const to = Math.ceil(((i + 1) * days) / n) - 1;',
    broken: 'const to = Math.ceil(((i + 1) * days) / n) - 2;',
    say: 'CONTROL periods: every period ends a day early, leaving gaps, sections 2 and 6 must go red',
  },
  engine: {
    file: 'src/lib/gmCalendar.ts',
    fixed: "periods: 20, periodName: 'Round', gamesPerPeriod: 4,\n  phases: [\n    { id: 'lottery', label: 'Draft lottery', start: '2026-05-10',",
    broken: "periods: 21, periodName: 'Round', gamesPerPeriod: 4,\n  phases: [\n    { id: 'lottery', label: 'Draft lottery', start: '2026-05-10',",
    say: 'CONTROL engine: the NBA year claims 21 rounds, section 3 must go red',
  },
  halt: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'const stopAt = halt ? halt.date : target;',
    broken: 'const stopAt = target;',
    say: 'CONTROL halt: the sim plan runs to the target past every stop, section 4 must go red',
  },
  order: {
    file: 'src/lib/gmCalendar.ts',
    fixed: "{ id: 'draft', label: 'The draft', start: '2026-07-11', end: '2026-07-12', halts: true,",
    broken: "{ id: 'draft', label: 'The draft', start: '2026-02-11', end: '2026-02-12', halts: true,",
    say: 'CONTROL order: baseball drafts in February, before opening day, section 5 must go red',
  },
  nohalt: {
    file: 'src/lib/gmCalendar.ts',
    fixed: "{ id: 'deadline', label: 'Trade deadline', start: '2027-02-11', end: '2027-02-11', halts: true,",
    broken: "{ id: 'deadline', label: 'Trade deadline', start: '2027-02-11', end: '2027-02-11', halts: false,",
    say: 'CONTROL nohalt: the NBA deadline no longer stops the sim, section 2 must go red',
  },
  estimate: {
    file: 'src/lib/gmCalendar.ts',
    fixed: "{ id: 'resign', label: 'Re-sign window', start: '2026-06-25', end: '2026-06-29', halts: true, estimate: true,",
    broken: "{ id: 'resign', label: 'Re-sign window', start: '2026-06-25', end: '2026-06-29', halts: true,",
    say: 'CONTROL estimate: the NBA re-sign window has no source and loses its estimate mark, section 2 must go red',
  },
  haltday: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'if (k > f && k <= t && (!halt || k < dateKey(halt.date))) halt = h;',
    broken: 'if (k > f && k < t && (!halt || k < dateKey(halt.date))) halt = h;',
    say: 'CONTROL haltday: a stop on the target day goes unreported, section 4 must go red',
  },
  midrun: {
    file: 'src/lib/gmCalendar.ts',
    fixed: '    if (res.halt) {\n',
    broken: '    if (res.halt && false) {\n',
    say: 'CONTROL midrun: runSimPlan plays on past a stop that came up, section 4 must go red',
  },
  openstop: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'if (open) return { stopAt: from, halt: open, periods: [] };',
    broken: 'if (open && false) return { stopAt: from, halt: open, periods: [] };',
    say: 'CONTROL openstop: an open host stop no longer holds the run, section 4 must go red',
  },
  dlperiod: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'return year.periods.filter(p => dateKey(p.end) <= k).length;',
    broken: 'return year.periods.filter(p => dateKey(p.start) <= k).length;',
    say: 'CONTROL dlperiod: deadlinePeriod counts the period the deadline falls in, section 4 must go red',
  },
  grid: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'const halts = [...calendarHalts(year), ...hostHalts];',
    broken: 'const halts = calendarHalts(year);',
    say: 'CONTROL grid: the month grid drops the host stops, section 6 must go red',
  },
  steps: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'offseason: dateKey(phase.start) < open',
    broken: 'offseason: dateKey(phase.start) <= open',
    say: 'CONTROL steps: opening day counts as an offseason step, section 7 must go red',
  },
  nextstep: {
    file: 'src/lib/gmCalendar.ts',
    fixed: 'find(s => dateKey(s.phase.end) >= k)',
    broken: 'find(s => dateKey(s.phase.start) >= k)',
    say: 'CONTROL nextstep: the next step skips a phase already running, section 7 must go red',
  },
};
const swaps = new Map();
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.error(`unknown GM_CALENDAR_CONTROL=${CONTROL}`); process.exit(1); }
  const src = fs.readFileSync(path.join(ROOT, c.file), 'utf8').replaceAll('\r\n', '\n');
  if (src.split(c.fixed).length !== 2) {
    console.error(`control cannot run: ${c.file} does not contain the text GM_CALENDAR_CONTROL=${CONTROL} rewrites exactly once`);
    process.exit(1);
  }
  const scratch = path.join(tmpDir, path.basename(c.file));
  fs.writeFileSync(scratch, src.replace(c.fixed, c.broken));
  swaps.set(path.join(ROOT, c.file).replaceAll('\\', '/').toLowerCase(), scratch);
  console.log(c.say);
}
const swapPlugin = {
  name: 'control-swap',
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/(calDate|gmCalendar)$/ }, args => {
      const real = `${R}/src/lib/${args.path.slice(6)}.ts`.toLowerCase();
      return swaps.has(real) ? { path: swaps.get(real) } : undefined;
    });
  },
};

const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const cal = await import('${R}/src/lib/clubManagerCalendar.ts');
export const cm = await import('${R}/src/lib/clubManager.ts');
export const gm = await import('@/lib/gmCalendar');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', plugins: [swapPlugin],
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);

/* ---------- 1. The lift moved nothing ---------- */
console.log('1) Club Manager\'s date helpers and calendar replay the pre-lift fixture');
{
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/calDateFixture946.json'), 'utf8'));
  const now = probeCalDate({ cal: B.cal, cm: B.cm });
  let compared = 0;
  const cmp = (label, a, b) => {
    compared += 1;
    if (a.hash !== b.hash) fail(`${label}: hash ${b.hash} != recorded ${a.hash}; first lines now ${JSON.stringify(b.head).slice(0, 200)} recorded ${JSON.stringify(a.head).slice(0, 200)}`);
  };
  for (const k of ['days', 'addDays', 'daysBetween', 'kickoff']) cmp(k, fixture[k], now[k]);
  compared += 1;
  if (fixture.monthNames !== now.monthNames) fail('MONTH_NAMES changed');
  if (fixture.careers.length !== now.careers.length) fail('career count changed');
  fixture.careers.forEach((rec, i) => {
    const got = now.careers[i];
    for (const k of ['entryDates', 'seasonDays', 'monthGrid', 'dateRule']) cmp(`${rec.club} ${k}`, rec[k], got[k]);
    compared += 1;
    if (rec.fastForwards !== got.fastForwards) fail(`${rec.club} fast forwards changed`);
  });
  console.log(`   ${compared} sections compared against the record from ${fixture.recordedFrom}, ${fixture.days.lines} days, date rule ${fixture.careers.map(c => c.dateRule.lines).join('/')}`);
}

const G = B.gm;
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const K = d => d.y * 10000 + d.m * 100 + d.d;
const iso = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const years = Object.fromEntries(SPORTS.map(s => [s, G.gmLeagueYear(s)]));
const WANT_HALTS = ['cutDown', 'deadline', 'draft', 'freeAgency', 'resign', 'seasonOver'].join(',');
/* Measured 2026-10-05: the periods played when the walk stops for the deadline. */
const WANT_DEADLINE_PERIOD = { nfl: 8, nba: 13, mlb: 19, nhl: 15 };

/* ---------- 2. Every league year keeps its rules ---------- */
console.log('2) Every phase one range, two sourced or marked thin; the deadline inside the season; periods back to back');
{
  let phases = 0, thin = 0, firm = 0, wikiSpot = 0;
  /* The owner's rule, written here and not read from the module: Wikipedia is a spot check and never one of the two sources. */
  const independent = list => list.filter(x => !x.startsWith('Wikipedia')).length;
  for (const s of SPORTS) {
    const def = G.GM_LEAGUE_YEARS[s];
    for (const p of G.validateLeagueYear(def)) fail(p);
    if (independent(def.regularSources) < 2) fail(`${s}: the regular season span rests on ${independent(def.regularSources)} source(s) other than Wikipedia`);
    for (const p of def.phases) {
      phases += 1;
      if (p.thin) thin += 1;
      if (p.sources.some(x => x.startsWith('Wikipedia'))) wikiSpot += 1;
      if (independent(p.sources) >= 2) firm += 1;
      if (p.sources.length < 2 && !G.GM_CALENDAR_PARTIAL.includes(`${s}.${p.id}`)) fail(`${s}.${p.id} has ${p.sources.length} source(s) and is not in GM_CALENDAR_PARTIAL`);
      if (independent(p.sources) < 2 && !G.GM_CALENDAR_PARTIAL.includes(`${s}.${p.id}`)) fail(`${s}.${p.id} has ${independent(p.sources)} source(s) other than Wikipedia and is not in GM_CALENDAR_PARTIAL`);
      if (p.sources.length === 0 && !G.GM_CALENDAR_ESTIMATE.includes(`${s}.${p.id}`)) fail(`${s}.${p.id} has no source and is not in GM_CALENDAR_ESTIMATE`);
    }
    /* The stops the brief names, written here and not read from the module: a
       data edit that turns one off (halts: false) must go red. */
    const kinds = G.calendarHalts(years[s]).map(h => h.kind).sort().join(',');
    if (kinds !== WANT_HALTS) fail(`${s}: the calendar stops for ${kinds}, it must stop for ${WANT_HALTS}`);
  }
  console.log(`   ${phases} phases over four years, ${thin} thin (listed partial), ${G.GM_CALENDAR_PARTIAL.length} in GM_CALENDAR_PARTIAL, ${G.GM_CALENDAR_ESTIMATE.length} estimates (no source); every sport stops for ${WANT_HALTS}`);
  console.log(`   ${firm} phases two sourced without Wikipedia, ${wikiSpot} cite Wikipedia as a spot check; every regular season span two sourced without it`);
}

/* ---------- 3. The engine periods are the engines' own ---------- */
console.log('3) Periods and games per period match the four front office engines');
{
  const code = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const constant = (file, name) => {
    const m = new RegExp(`export const ${name} = (\\d+);`).exec(code(file));
    if (!m) { fail(`${file} has no export const ${name} = <number>;`); return NaN; }
    return Number(m[1]);
  };
  const want = {
    nfl: [constant('src/lib/frontOffice.ts', 'REGULAR_WEEKS'), 1],
    nba: [constant('src/lib/nbaFrontOffice.ts', 'NBA_ROUNDS'), constant('src/lib/nbaFrontOffice.ts', 'GAMES_PER_ROUND')],
    mlb: [constant('src/lib/mlbFrontOffice.ts', 'MLB_ROUNDS'), constant('src/lib/mlbFrontOffice.ts', 'MLB_GAMES_PER_ROUND')],
    nhl: [constant('src/lib/nhlFrontOffice.ts', 'NHL_FO_ROUNDS'), constant('src/lib/nhlFrontOffice.ts', 'NHL_GAMES_PER_ROUND')],
  };
  for (const s of SPORTS) {
    const def = G.GM_LEAGUE_YEARS[s];
    if (def.periods !== want[s][0]) fail(`${s}: the calendar has ${def.periods} periods, the engine plays ${want[s][0]}`);
    if (def.gamesPerPeriod !== want[s][1]) fail(`${s}: the calendar draws ${def.gamesPerPeriod} games a period, the engine plays ${want[s][1]}`);
    if (years[s].periods.length !== want[s][0]) fail(`${s}: ${years[s].periods.length} period ranges for ${want[s][0]} engine periods`);
  }
  console.log(`   engines: ${SPORTS.map(s => `${s} ${want[s][0]} x ${want[s][1]}`).join(', ')}`);
}

/* ---------- 4. A sim to a day never runs past a stop ---------- */
console.log('4) Every pair of days: the plan stops at the first stop after the start or reaches the target; a chained walk halts on every stop');
{
  let pairs = 0;
  for (const s of SPORTS) {
    const y = years[s];
    const haltList = G.calendarHalts(y);
    const halts = haltList.map(h => K(h.date));
    const days = [];
    for (let d = B.cal.addDays(y.first, -1); K(d) <= K(y.last); d = B.cal.addDays(d, 1)) days.push(d);
    for (let i = 0; i < days.length; i++) {
      const f = K(days[i]);
      for (let j = i; j < days.length; j++) {
        const t = K(days[j]);
        const plan = G.planSimToDay(y, days[i], days[j]);
        pairs += 1;
        if (j === i) { if (plan !== null) fail(`${s}: a sim to the same day ${iso(days[i])} is not null`); continue; }
        const first = halts.find(h => h > f && h <= t);
        const want = first ?? t;
        if (!plan || K(plan.stopAt) !== want) { fail(`${s}: from ${iso(days[i])} to ${iso(days[j])} stops at ${plan ? iso(plan.stopAt) : 'nothing'}, the first stop is ${want}`); break; }
        /* The plan says why it stopped, a stop on the target day included: a
           silent stop is one the next plan from that day skips. */
        const wantKind = first === undefined ? null : haltList[halts.indexOf(first)].kind;
        if ((plan.halt ? plan.halt.kind : null) !== wantKind) { fail(`${s}: from ${iso(days[i])} to ${iso(days[j])} reports halt ${plan.halt ? plan.halt.kind : 'none'}, the stop is ${wantKind ?? 'none'}`); break; }
        const wantPeriods = y.periods.filter(p => K(p.end) > f && K(p.end) <= want).map(p => p.index).join(',');
        if (plan.periods.join(',') !== wantPeriods) { fail(`${s}: from ${iso(days[i])} to ${iso(days[j])} plays ${plan.periods.join(',')} not ${wantPeriods}`); break; }
      }
      if (failures > 20) break;
    }
  }
  console.log(`   ${pairs} pairs of days planned over the four years`);

  /* The chained walk, with seeded host stops on top of the calendar's own. */
  const mulberry = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const kinds = ['expiringDeal', 'injury', 'inboxAsk'];
  const summary = [];
  for (const s of SPORTS) {
    const y = years[s];
    const total = B.cal.daysBetween(y.first, y.last);
    const stopsPerSeed = [];
    for (let seed = 1; seed <= 5; seed++) {
      const rnd = mulberry(seed * 946);
      const host = Array.from({ length: 4 }, (_, i) => ({ kind: kinds[i % 3], date: B.cal.addDays(y.first, 1 + Math.floor(rnd() * total)), label: 'host stop' }));
      /* Every stop is seen, a host stop on a calendar stop's day as well (it
         holds the next run until the host drops it, as a host does once the
         GM has dealt with it). */
      const expected = [...G.calendarHalts(y).map(h => K(h.date)), ...host.map(h => K(h.date))].sort((a, b) => a - b);
      let open = [...host];
      let at = B.cal.addDays(y.first, -1);
      const stops = [], played = [];
      for (let guard = 0; guard < 100; guard++) {
        const plan = G.planSimToDay(y, at, y.last, open);
        if (!plan) break;
        played.push(...plan.periods);
        if (plan.halt) stops.push(K(plan.halt.date));
        if (plan.halt && open.includes(plan.halt)) open = open.filter(h => h !== plan.halt);
        at = plan.stopAt;
      }
      if (stops.join(',') !== expected.join(',')) fail(`${s} seed ${seed}: the walk halted on ${stops.join(',')}, the stops are ${expected.join(',')}`);
      if (played.join(',') !== y.periods.map(p => p.index).join(',')) fail(`${s} seed ${seed}: the walk played ${played.join(',')}`);
      stopsPerSeed.push(stops.length);
    }
    summary.push(`${s} ${Math.min(...stopsPerSeed)} to ${Math.max(...stopsPerSeed)} stops, ${y.periods.length} periods`);
  }
  console.log(`   chained walks, seeds 1 to 5: ${summary.join('; ')}`);

  /* Stops that come up mid run: the host's engine raises one while it plays
     a period (seeded, three a year). runSimPlan must end the run on that
     period, the next plan must hold until the host drops the stop, and the
     walk must still play every period once and see every calendar stop. */
  const midSummary = [];
  for (const s of SPORTS) {
    const y = years[s];
    let raisedTotal = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const rnd = mulberry(seed * 9461);
      const raising = new Set();
      while (raising.size < 3) raising.add(1 + Math.floor(rnd() * y.periods.length));
      let open = [];
      let at = B.cal.addDays(y.first, -1);
      const played = [], calStops = [], raisedSeen = [];
      let held = 0;
      for (let guard = 0; guard < 200; guard++) {
        const plan = G.planSimToDay(y, at, y.last, open);
        if (!plan) break;
        if (plan.halt && open.includes(plan.halt)) {
          if (plan.periods.length) fail(`${s} seed ${seed}: an open stop did not hold the run (it plays ${plan.periods.join(',')})`);
          held += 1;
          open = open.filter(h => h !== plan.halt);
          at = plan.stopAt;
          continue;
        }
        const raisedHere = [];
        const run = G.runSimPlan(y, plan, 0, (n, p) => {
          if (!raising.has(p.index)) return { state: n + 1, halt: null };
          const h = { kind: 'injury', date: p.start, label: `hurt in ${p.index}` };
          raisedHere.push(p.index);
          open.push(h);
          return { state: n + 1, halt: h };
        });
        played.push(...run.played);
        if (run.state !== run.played.length) fail(`${s} seed ${seed}: the run's state counts ${run.state} periods for ${run.played.length} played`);
        if (raisedHere.length > 1) fail(`${s} seed ${seed}: one run played past a stop that came up (periods ${raisedHere.join(',')} all raised one)`);
        if (raisedHere.length && run.played[run.played.length - 1] !== raisedHere[0]) fail(`${s} seed ${seed}: the run raised a stop in period ${raisedHere[0]} and kept playing to ${run.played[run.played.length - 1]}`);
        raisedSeen.push(...raisedHere);
        if (run.halt && !run.halt.label.startsWith('hurt')) calStops.push(K(run.halt.date));
        at = run.stopAt;
      }
      if (played.join(',') !== y.periods.map(p => p.index).join(',')) fail(`${s} seed ${seed}: the mid run walk played ${played.join(',')}`);
      if ([...raisedSeen].sort((a, b) => a - b).join(',') !== [...raising].sort((a, b) => a - b).join(',')) fail(`${s} seed ${seed}: stops came up in ${raisedSeen.join(',')}, the engine raised ${[...raising].join(',')}`);
      if (held !== raising.size) fail(`${s} seed ${seed}: ${held} runs held for an open stop, ${raising.size} stops came up`);
      const wantCal = G.calendarHalts(y).map(h => K(h.date)).join(',');
      if (calStops.join(',') !== wantCal) fail(`${s} seed ${seed}: the mid run walk stopped for the calendar on ${calStops.join(',')}, the stops are ${wantCal}`);
      raisedTotal += raisedSeen.length;
    }
    midSummary.push(`${s} ${raisedTotal} raised`);
  }
  console.log(`   mid run stops, seeds 1 to 5, three a year: ${midSummary.join(', ')}, every one ended its run and held the next`);

  /* The deadline period is what the walk has played when it stops for the deadline. */
  for (const s of SPORTS) {
    const y = years[s];
    let at = B.cal.addDays(y.first, -1);
    const played = [];
    for (let guard = 0; guard < 50; guard++) {
      const plan = G.planSimToDay(y, at, y.last);
      if (!plan) break;
      played.push(...plan.periods);
      at = plan.stopAt;
      if (plan.halt && plan.halt.kind === 'deadline') break;
    }
    const got = G.deadlinePeriod(y);
    if (got !== Math.max(0, ...played)) fail(`${s}: deadlinePeriod says ${got}, the walk has played ${Math.max(0, ...played)} periods at the deadline stop`);
    if (got !== WANT_DEADLINE_PERIOD[s]) fail(`${s}: deadlinePeriod ${got}, measured ${WANT_DEADLINE_PERIOD[s]}`);
  }
  console.log(`   deadline periods: ${SPORTS.map(s => `${s} ${G.deadlinePeriod(years[s])}`).join(', ')}`);
}

/* ---------- 5. Each league's real order ---------- */
console.log('5) The real order, as facts of each league, not read from GM_PHASE_ORDER');
{
  const at = (s, id) => { const p = years[s].phases.find(x => x.id === id); return p ? K(p.start) : null; };
  const before = (s, a, b) => {
    const x = at(s, a), y = at(s, b);
    if (x === null || y === null || !(x < y)) fail(`${s}: ${a} (${x}) is not before ${b} (${y})`);
  };
  const facts = [
    ['nfl', 'freeAgency', 'draft'], ['nba', 'draft', 'freeAgency'], ['nhl', 'draft', 'freeAgency'],
    ['mlb', 'freeAgency', 'lottery'], ['mlb', 'opening', 'draft'], ['mlb', 'draft', 'deadline'],
    ['nba', 'lottery', 'draft'], ['nhl', 'lottery', 'draft'], ['mlb', 'lottery', 'draft'],
  ];
  for (const s of SPORTS) {
    facts.push([s, 'resign', 'freeAgency'], [s, 'camp', 'cutDown'], [s, 'cutDown', 'opening'], [s, 'opening', 'deadline'], [s, 'deadline', 'playoffs']);
    if (at(s, 'opening') !== K(years[s].regularStart)) fail(`${s}: opening day is not the regular season's first day`);
    if (!(at(s, 'playoffs') > K(years[s].regularEnd))) fail(`${s}: the playoffs do not follow the regular season`);
  }
  if (at('nfl', 'lottery') !== null) fail('nfl: the league has no draft lottery');
  for (const [s, a, b] of facts) before(s, a, b);
  console.log(`   ${facts.length} order facts across the four leagues`);
}

/* ---------- 6. The grid ---------- */
console.log('6) Every month drawn: each season day in one period, each period its games, each phase and stop on one day');
{
  let cells = 0;
  for (const s of SPORTS) {
    const y = years[s];
    const def = G.GM_LEAGUE_YEARS[s];
    const today = y.first;
    const perPeriodDays = new Map(), perPeriodGames = new Map(), marks = new Map(), haltDays = new Map(), hostSeen = new Map();
    /* Host stops the board hands the grid, each on a day with no calendar stop: the grid must outline each one on its day. */
    const calDays = new Set(G.calendarHalts(y).map(h => K(h.date)));
    const host = [20, 75, 140, 210].map(n => B.cal.addDays(y.first, n)).filter(d => !calDays.has(K(d)))
      .map((date, i) => ({ kind: ['expiringDeal', 'injury', 'inboxAsk'][i % 3], date, label: `host ${i}` }));
    for (const { y: yy, m } of G.monthsOf(y)) {
      const grid = G.gmMonthGrid(y, yy, m, today, host);
      const lead = B.cal.dayOfWeek(yy, m, 1);
      if (grid.length !== lead + B.cal.daysInMonth(yy, m)) fail(`${s} ${yy}-${m}: ${grid.length} cells`);
      for (const c of grid) {
        if (!c) continue;
        cells += 1;
        const inSeason = c.key >= K(y.regularStart) && c.key <= K(y.regularEnd);
        if (inSeason !== (c.period !== null)) fail(`${s} ${iso(c.date)}: in season ${inSeason}, period ${c.period}`);
        if (c.period !== null) perPeriodDays.set(c.period, (perPeriodDays.get(c.period) ?? 0) + 1);
        if (c.game) perPeriodGames.set(c.period, (perPeriodGames.get(c.period) ?? 0) + 1);
        for (const id of c.starts) marks.set(id, (marks.get(id) ?? 0) + 1);
        if (c.halt) haltDays.set(c.halt.kind, (haltDays.get(c.halt.kind) ?? 0) + 1);
        if (c.halt && c.halt.label.startsWith('host ')) hostSeen.set(c.halt.label, K(c.date));
      }
    }
    const seasonDays = B.cal.daysBetween(y.regularStart, y.regularEnd) + 1;
    const counted = [...perPeriodDays.values()].reduce((a, b) => a + b, 0);
    if (counted !== seasonDays) fail(`${s}: ${counted} season days on the grid for ${seasonDays}`);
    for (const p of y.periods) {
      const games = perPeriodGames.get(p.index) ?? 0;
      /* Spread games can share a day only when a period is shorter than its games, which none is. */
      if (games !== def.gamesPerPeriod) fail(`${s} period ${p.index}: ${games} game days drawn for ${def.gamesPerPeriod}`);
    }
    for (const p of y.phases) if (marks.get(p.id) !== 1) fail(`${s}: ${p.id} is marked ${marks.get(p.id) ?? 0} times`);
    for (const h of G.calendarHalts(y)) if (haltDays.get(h.kind) !== 1) fail(`${s}: the ${h.kind} stop sits on ${haltDays.get(h.kind) ?? 0} days`);
    if (host.length < 3) fail(`${s}: only ${host.length} host stops placed`);
    for (const h of host) if (hostSeen.get(h.label) !== K(h.date)) fail(`${s}: the host stop ${h.label} (${iso(h.date)}) is outlined on ${hostSeen.get(h.label) ?? 'no day'}`);
  }
  console.log(`   ${cells} days drawn across the four years`);
}

/* ---------- 7. The offseason as steps ---------- */
console.log('7) The offseason is dated steps in order, and baseball drafts in season');
{
  for (const s of SPORTS) {
    const y = years[s];
    const steps = G.yearSteps(y);
    for (let i = 1; i < steps.length; i++) if (K(steps[i].phase.start) < K(steps[i - 1].phase.start)) fail(`${s}: step ${steps[i].phase.id} comes before ${steps[i - 1].phase.id}`);
    const off = G.offseasonSteps(y).map(st => st.phase.id);
    const wantOff = y.phases.filter(p => K(p.start) < K(y.regularStart)).map(p => p.id);
    if (off.join(',') !== wantOff.join(',')) fail(`${s}: offseason steps ${off.join(',')} for ${wantOff.join(',')}`);
    if (off.length < 4) fail(`${s}: only ${off.length} offseason steps`);
    const nxt = G.nextStep(y, y.regularStart);
    if (!nxt || nxt.phase.id !== 'opening') fail(`${s}: the step on opening day is ${nxt ? nxt.phase.id : 'none'}`);
    /* Every day of the year: the next step is the phase running that day, or the next one to start. */
    const byStart = [...y.phases].sort((a, b) => K(a.start) - K(b.start));
    for (let d = B.cal.addDays(y.first, -1); K(d) <= K(y.last) + 1; d = B.cal.addDays(d, 1)) {
      const want = byStart.find(p => K(p.end) >= K(d)) ?? null;
      const got = G.nextStep(y, d);
      if ((got ? got.phase.id : null) !== (want ? want.id : null)) { fail(`${s} ${iso(d)}: the next step is ${got ? got.phase.id : 'none'}, the phase is ${want ? want.id : 'none'}`); break; }
    }
  }
  const mlbDraft = G.yearSteps(years.mlb).find(st => st.phase.id === 'draft');
  if (!mlbDraft || mlbDraft.offseason) fail('mlb: the draft is not an in season step');
  console.log(`   offseason steps: ${SPORTS.map(s => `${s} ${G.offseasonSteps(years[s]).map(st => st.phase.id).join('>')}`).join('; ')}`);
}

console.log(failures ? `simGmCalendar: ${failures} failure(s)` : 'simGmCalendar: all checks passed');
process.exit(failures ? 1 : 0);
