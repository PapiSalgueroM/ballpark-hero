/**
 * Round 212 harness: a daily game has to actually be daily.
 *
 * This exists because of what a probe found. Several of the daily puzzles
 * seeded a random generator with the date as a NUMBER, which sounds fine
 * and is not. A Lehmer generator steps by `s = (s * 16807) % 2147483647`,
 * so its first output is very nearly a straight line in the seed: two
 * seeds one apart, which is what two consecutive days are, produce first
 * outputs eight parts in a million apart. Floor that against a pool of
 * twenty and you get the same index for tens of thousands of days.
 *
 * Measured over a simulated year before Round 212 fixed it:
 *   Missing XI          2 distinct lineups in 365 days, one for 243 days
 *   Missing XI blank    6 distinct in 365 days
 *   Sign the Player     ONE formation for the entire year
 *   Pack Battle         first card frozen all year
 * After: 150, 192, 9 of 9 formations, and 96 distinct first cards.
 *
 * How it drives them: the clock is replaced with a fixed instant that the
 * harness moves a day at a time, so `getTodayET()` inside the engines
 * returns whatever date is being tested. That is the only honest way to
 * test a function whose whole job is to read today's date.
 *
 * What it asserts, per game:
 *   1. Deterministic. The same date, asked twice, deals the same board.
 *      This is the promise the whole daily format rests on.
 *   2. Rotating. No board survives more than three days running.
 *   3. Using the pool. Enough distinct boards over a year that the pool is
 *      genuinely being drawn from rather than sampled twice.
 * And once, statically:
 *   4. No raw date seed is ever handed to a Lehmer generator again, which
 *      is the rule that stops the whole class of bug coming back.
 *
 * Round 213 added a third section. Every daily game used to pick its board
 * with pool[dateSeed % n], which covers the pool properly but makes
 * tomorrow today plus one, on every game at once, next to a leaderboard.
 * dailyIndex keeps the coverage and drops the predictability by cutting
 * the days into cycles the length of the pool and shuffling each cycle.
 * Section 3 checks BOTH halves, because losing either would be a
 * regression: a shuffle that repeats inside a cycle starves a small pool,
 * and a walk that is still plus one a day has fixed nothing.
 *
 * Run: node scripts/simDaily.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/dailyHarnessEntry.mjs';
const BUNDLE = '/tmp/dailyHarness.bundle.mjs';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---------- the clock, moved by hand ---------- */
const RealDate = Date;
const DAY = 86_400_000;
/* Noon UTC on the first, which is morning in New York, so the ET date the
   engines read is unambiguous and never lands on a boundary. */
const START = RealDate.UTC(2026, 0, 1, 18, 0, 0);
let fixedNow = START;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(fixedNow);
    else super(...args);
  }
  static now() { return fixedNow; }
};
const setDay = i => { fixedNow = START + i * DAY; };

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const du = await import('${ROOT}/src/lib/dateUtils.ts');
const missingXi = await import('${ROOT}/src/lib/missingXi.ts');
const missingFive = await import('${ROOT}/src/lib/missingFive.ts');
const missingNine = await import('${ROOT}/src/lib/missingNine.ts');
const missingEleven = await import('${ROOT}/src/lib/missingEleven.ts');
const orderTheList = await import('${ROOT}/src/lib/orderTheList.ts');
const rarityRound = await import('${ROOT}/src/lib/rarityRound.ts');
const packBattle = await import('${ROOT}/src/lib/packBattle.ts');
const signThePlayer = await import('${ROOT}/src/lib/signThePlayer.ts');
export { du, missingXi, missingFive, missingNine, missingEleven, orderTheList, rarityRound, packBattle, signThePlayer };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const mods = await import(BUNDLE);

/* A stand in squad for the two games that take a pool from the network. */
const POOL = Array.from({ length: 120 }, (_, i) => ({
  id: `p${i}`, name: `Player ${i}`,
  pos: ['GK', 'DF', 'MF', 'FW'][i % 4], position: ['GK', 'DF', 'MF', 'FW'][i % 4],
  value: 5 + i, marketValue: 5 + i, club: `Club ${i % 20}`,
  rating: 70 + (i % 25), overall: 70 + (i % 25),
}));

/**
 * One daily game: what it deals, and how big its pool is.
 * `poolSize` is what the game could in principle deal, so the coverage bar
 * scales with the content rather than being a flat guess.
 */
const GAMES = [
  ['Missing XI', () => mods.missingXi.pickDailyPuzzle().lineup.id, () => mods.missingXi.LINEUPS?.length ?? 0],
  ['Missing XI blank', () => mods.missingXi.pickDailyPuzzle().candidate.name, () => 40],
  ['Missing Five', () => mods.missingFive.getDailyFivePuzzle().lineup.id, () => 14],
  ['Missing Nine', () => mods.missingNine.getDailyNinePuzzle?.().lineup?.id ?? 'n/a', () => 14],
  ['Missing Eleven', () => mods.missingEleven.getDailyElevenPuzzle?.().lineup?.id ?? 'n/a', () => 14],
  ['Order the List', () => mods.orderTheList.getDailyRankRound().id, () => 14],
  ['Rarity Round', () => mods.rarityRound.pickDailyCategories().map(c => c.id ?? c.label).join('+'), () => 16],
  ['Pack Battle', () => mods.packBattle.buildDailyPack(POOL).map(c => c.id).join(','), () => 60],
  ['Sign the Player', () => JSON.stringify(mods.signThePlayer.buildDailySlate(POOL).formation).slice(0, 60), () => 9],
];

console.log('1) Every daily game deals a different board tomorrow');
const DAYS = 365;
for (const [name, deal, poolSizeOf] of GAMES) {
  const values = [];
  let deterministic = true;
  let broke = false;
  for (let d = 0; d < DAYS; d += 1) {
    setDay(d);
    let a, b;
    try { a = deal(); b = deal(); } catch (e) {
      fail(`${name}: threw on day ${d} (${String(e).split('\n')[0].slice(0, 70)})`);
      broke = true;
      break;
    }
    if (a === undefined || a === null) { fail(`${name}: dealt nothing on day ${d}`); broke = true; break; }
    /* 1. the promise the format rests on. */
    if (a !== b) deterministic = false;
    values.push(a);
  }
  if (broke) continue;
  if (values.some(v => v === 'n/a')) { console.log(`   ${name.padEnd(18)} not reachable headless, skipped`); continue; }
  if (!deterministic) fail(`${name}: the same date deals a different board when you ask twice`);

  /* 2. no board survives more than three days. */
  let longest = 1, cur = 1, at = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] === values[i - 1]) { cur += 1; if (cur > longest) { longest = cur; at = i; } }
    else cur = 1;
  }
  if (longest > 3) fail(`${name}: the same board ran for ${longest} days in a row (around day ${at}), which is not a daily game`);

  /* 3. the pool is genuinely being used. A game with fourteen boards
     cannot show more than fourteen; what matters is that it shows most of
     them rather than circling two. */
  const distinct = new Set(values).size;
  const pool = Math.max(1, poolSizeOf());
  const expected = Math.min(pool, DAYS);
  if (distinct < expected * 0.5) {
    fail(`${name}: only ${distinct} distinct boards in a year from a pool of about ${pool}`);
  }
  console.log(`   ${name.padEnd(18)} ${String(distinct).padStart(3)} distinct in ${DAYS} days, longest identical run ${longest}`);
}

console.log('2) The date is hashed before it seeds a random stream, everywhere');
{
  /* The rule that stops the whole class coming back. A raw dateSeed is
     fine for `pool[seed % pool.length]`, which is what most of these games
     do and which rotates correctly; it is NOT fine as the starting state
     of a multiplicative generator. So: any file that contains a Lehmer
     step must not also seed one from a raw date. */
  const LEHMER = /\* (?:16807|48271)\) % 2147483647/;
  const RAW_SEED = /=\s*dateSeed\(getTodayET\(\)\)/;
  const files = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  let checked = 0, lehmerFiles = 0;
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf-8');
    checked += 1;
    if (!LEHMER.test(t)) continue;
    lehmerFiles += 1;
    if (RAW_SEED.test(t)) {
      fail(`${path.relative(ROOT, f)}: seeds a Lehmer generator from the raw date, which freezes the puzzle for months`);
    }
  }
  /* And the hashed seed really does scatter, which is the whole point of
     having it. Adjacent days must not land on the same first draw. */
  const first = seed => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const buckets = [];
  for (let d = 0; d < 60; d += 1) {
    setDay(d);
    buckets.push(Math.floor(first(mods.du.dailyPrngSeed(mods.du.getTodayET())) * 20));
  }
  const distinctBuckets = new Set(buckets).size;
  if (distinctBuckets < 12) fail(`the hashed seed only reaches ${distinctBuckets} of 20 buckets across 60 days`);
  let run = 1, worst = 1;
  for (let i = 1; i < buckets.length; i += 1) {
    if (buckets[i] === buckets[i - 1]) { run += 1; worst = Math.max(worst, run); } else run = 1;
  }
  if (worst > 3) fail(`the hashed seed repeats its first draw ${worst} days running`);
  /* The control: the RAW seed must fail this, or the check proves nothing. */
  const rawBuckets = new Set();
  for (let d = 0; d < 60; d += 1) {
    setDay(d);
    rawBuckets.add(Math.floor(first(mods.du.dateSeed(mods.du.getTodayET())) * 20));
  }
  if (rawBuckets.size > 3) {
    fail(`the raw date seed now scatters (${rawBuckets.size} buckets), so this control no longer proves the hash is needed`);
  }
  console.log(`   ${checked} source files scanned, ${lehmerFiles} with a Lehmer step, 0 seeded from a raw date`);
  console.log(`   hashed seed reaches ${distinctBuckets}/20 buckets in 60 days; the raw seed reaches ${rawBuckets.size}`);
}

console.log('3) The order through the pool is a real shuffle, not a straight line');
{
  /* Round 213. Every daily game used to pick with `pool[dateSeed % n]`,
     which covers the pool properly but means tomorrow is today plus one,
     on every game on the site, forever, next to a leaderboard. dailyIndex
     keeps the coverage and drops the predictability: the days are cut into
     cycles the length of the pool and each cycle is its own shuffle.
     Both halves of that are checked here, because dropping either one
     would be a regression: a shuffle that repeats inside a cycle starves a
     small pool, and a walk that is still +1 a day has not fixed anything. */
  const dayStr = day => new RealDate(day * 86_400_000).toISOString().slice(0, 10);
  for (const pool of [3, 10, 14, 18, 40, 150]) {
    const first = Math.ceil(20450 / pool) * pool;
    const seq = [];
    for (let d = first; d < first + pool * 6; d += 1) seq.push(mods.du.dailyIndex(dayStr(d), pool));

    /* Coverage: every board exactly once per cycle. */
    for (let c = 0; c < 6; c += 1) {
      const chunk = seq.slice(c * pool, (c + 1) * pool);
      if (new Set(chunk).size !== pool) {
        fail(`pool of ${pool}: cycle ${c} showed ${new Set(chunk).size} of ${pool} boards, so some board was skipped and another repeated`);
        break;
      }
    }
    /* Never the same board two days running, including across the seam
       between two cycles, which is the case that needed the extra rule. */
    for (let i = 1; i < seq.length; i += 1) {
      if (seq[i] === seq[i - 1]) { fail(`pool of ${pool}: the same board on two consecutive days at position ${i}`); break; }
    }
    /* And it is not just the old straight line wearing a hat. */
    let stepOne = 0;
    for (let i = 1; i < seq.length; i += 1) if (seq[i] === (seq[i - 1] + 1) % pool) stepOne += 1;
    if (pool >= 10 && stepOne > seq.length * 0.4) {
      fail(`pool of ${pool}: ${stepOne} of ${seq.length - 1} days simply moved one place on, which is the pattern this replaced`);
    }
  }
  /* Deterministic across calls, or two players see different puzzles. */
  const a = mods.du.dailyIndex('2026-07-04', 14);
  const b = mods.du.dailyIndex('2026-07-04', 14);
  if (a !== b) fail('dailyIndex is not deterministic for one date');
  /* A pool that cannot be indexed must not throw or return junk. */
  for (const bad of [0, 1, -3, NaN]) {
    const v = mods.du.dailyIndex('2026-07-04', bad);
    if (!Number.isFinite(v) || v < 0) fail(`dailyIndex returned ${v} for a pool of ${bad}`);
  }
  /* And the games really use it rather than the old modulo. */
  const USERS = [
    'src/hooks/useDailyPuzzle.ts', 'src/hooks/useConnections.ts', 'src/hooks/useNbaConnections.ts',
    'src/hooks/useNflConnections.ts', 'src/hooks/useNhlConnections.ts', 'src/hooks/useBaseballConnections.ts',
    'src/hooks/useBudgetBuilder.ts', 'src/hooks/useGuessSoccerClub.ts',
    'src/lib/missingFive.ts', 'src/lib/missingNine.ts', 'src/lib/missingEleven.ts',
    'src/lib/orderTheList.ts', 'src/lib/puckDetective.ts',
  ];
  for (const rel of USERS) {
    const t = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
    if (!/dailyIndex\(/.test(t)) fail(`${rel}: no longer picks its board with dailyIndex`);
    if (/dateSeed\(getTodayET\(\)\) % /.test(t)) fail(`${rel}: went back to the predictable +1 a day walk`);
  }
  console.log(`   6 pool sizes walked through 6 cycles each, full coverage, no repeats, no straight line; ${USERS.length} games on it`);
}

console.log('');
if (failures > 0) {
  console.error(`simDaily: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simDaily: green. Every daily game is a different game tomorrow.');
