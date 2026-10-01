/**
 * Round 718: Career Ladder's daily is a no repeat rotation from ROTATION_START,
 * and every day before it keeps the pick it always had.
 *
 * WHAT CHANGED. pickDailyPlayer in src/lib/careerLadder.ts used to be the date
 * as a number modulo the pool, two lists taking turns, which repeated a man
 * inside a few weeks (measured below: a minimum repeat gap of ONE day over the
 * 800 days before the start). From 2026-10-15 it walks two sides (harder and
 * easier) in one fixed order hashed from the player id, two days in three from
 * the harder side, so nobody comes back until his whole side has been dealt.
 *
 * WHO IS IN THE WALK comes from src/data/careerLadderRoster.json, never from
 * the live tables. The walk is a pure function of the date, so it works out
 * every past cycle each time it is asked, and a man who turns up in a past
 * cycle he was not dealt in pushes the walk back onto men dealt days ago. The
 * first fix froze cycles on career_players.created_at, and the review found
 * the hole: a season row added to or removed from a man already in the table
 * (a 4th season, a peak crossing the 50M line, a quarantined row) still moved
 * him, repeat gaps of one to three days. The roster is append only and dated,
 * written by scripts/genCareerLadderRoster.mjs; a rostered man the pool cannot
 * deal gets a stand in (half a cycle round the easier walk) instead of moving
 * everybody; an unrostered man is not dealt.
 *
 * SECTIONS
 *   1 the start date, the page's single clock read, and release timing: red
 *     when ROTATION_START has arrived and origin/main does not carry it
 *   2 the year before the start keeps the frozen legacy answers
 *   3 800 days from 9 start offsets on the baked pool: coverage, gaps, share
 *   4 same date, same man, whatever order the pool and roster arrive in
 *   5 small pools, one sided rosters, a roster nobody in the pool is on, and a
 *     roster with nobody in on the first cycle (run in a worker, so a walk
 *     that never moves on is a failure, not a hang)
 *   6 the pool and the roster change mid walk, every change the review
 *     probed: a newcomer, a 4th season, a peak crossing the line either way,
 *     a man losing his 4th season, a man deleted and restored, a man removed
 *     for good. Each repeat is held to its own side's floor, and a stand in's
 *     to the stand in floor
 *   7 the live tables: the roster says what they say, and the walk over them
 *   8 the roster file: well formed, one side per man, in date order, and
 *     append only against origin/main with every new line dated after today
 *   9 a golden walk: a synthetic pool and roster dealt over 800 days from
 *     2026-10-15, pinned by digest, so any change to the order, the hash, the
 *     cycle rule or the stand in rule shows up as days re-dealt
 *
 * MEASURED 2026-10-01 on the baked pool (src/data/careerPlayers.ts, 253 men,
 * 244 eligible, 125 harder and 119 easier) and on the live tables (same
 * counts), nine start offsets (0, 1, 2, 37, 100, 250, 500, 1000, 3000 days)
 * of 800 days each:
 *   distinct men dealt      244 of 244 every time (the coverage bound)
 *   harder side repeat gap  187 days every time (bound: 1.5 x 125 = 187)
 *   easier side repeat gap  357 days every time (bound: 3 x 119 = 357)
 *   harder share            0.6663 to 0.6675
 *   nulls                   0
 * Section 6, 207 changes on days 40, 200, 400, 600 and 1000: the smallest
 * harder gap 186, easier 354, stand in 177, and a newcomer was dealt within
 * 574 days of arriving (he waits for his side's next cycle). With the cycles
 * frozen on created_at instead, the review measured gaps of 1 to 3 days for
 * a 4th season, a crossing and a quarantined peak row.
 * The legacy rule over the 800 days before the start: 228 distinct, minimum
 * gap 1, harder share 0.835 against the same line.
 *
 * FLOORS, inside those numbers and scaled to the roster:
 *   harder gap   >= max(150, 0.9 x 1.5 x H)   168 today, measured 187
 *   easier gap   >= max(300, 0.9 x 3 x E)     321 today, measured 357
 *   stand in gap >= max(120, 0.9 x 1.5 x E)   160 today, measured 177 (a stand
 *                in sits half a cycle from his own days on the easier walk)
 *   distinct     >= 98% of the coverage bound  239 today, measured 244
 *   harder share in [0.64, 0.69]              measured 0.666 to 0.668
 *   rotation live: >= 20 of the first 30 days differ from the legacy rule
 *
 * THE FIXTURE. The baked file carries no ids (the hash order is by id), so the
 * fixture uses the name as the id and builds its roster from the baked peaks.
 * Every number above is structural, it comes from the side sizes and the fixed
 * order being a permutation, not from which permutation, and section 7 repeats
 * the walk over the live tables with the real ids and the committed roster.
 *
 * THE BASELINE for the days before the start is a frozen copy of the rule as
 * it shipped before Round 718 (peakValue, legendPool and pickDailyPlayer from
 * origin/main at aa771bec), not the branch's own legacyDailyPick, so a later
 * edit to either cannot pass by agreeing with itself.
 *
 * NEGATIVE CONTROLS, each on an in memory copy of careerLadder.ts, nothing on
 * disk moves, each refusing to run if its anchor text is gone. Under a control
 * the harness exits non zero: 1 when the planted break was caught in the
 * sections it belongs to and nowhere else, 2 when it went unnoticed or failed
 * something it should not have. CAREER_LADDER_ROTATION_CONTROL=
 *   earlystart  ROTATION_START moved to 2026-06-01: the legacy year changes
 *               answer (1, 2), the committed roster's lines all date after
 *               the start so its first cycles run on the fallback (7), and the
 *               golden days move (9)
 *   reshuffle   each cycle deals its own permutation: gaps collapse (3, 6, 7, 9)
 *   nofreeze    a cycle deals every man the roster ever has in, ignoring the
 *               since dates: a newcomer moves the walk back (6, 9)
 *   nohash      the order is a plain id sort: only the golden walk sees it (9)
 *   nofallback  a walk with nobody in on a cycle's first day loops for ever:
 *               the worker times out (5)
 *   liveside    the side comes from today's peak, not the roster: a peak
 *               crossing the line moves the walk back (6)
 *   skipgone    a man the pool cannot deal is dropped from every cycle instead
 *               of stood in for: a deleted and restored man moves the walk
 *               back (6, 9)
 *   unledgered  an eligible man the roster does not name joins as if he had
 *               always been in: a 4th season moves the walk back (6, 9)
 *
 * Run: node scripts/simCareerLadderRotation.mjs   (section 7 needs the network,
 * section 8's history check needs git and origin/main; each says when skipped)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { fetchLiveCareerPool } from './lib/careerTablesLive.mjs';
import { ROSTER_PATH, planAppends, readRoster } from './lib/careerLadderRoster.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CAREER_LADDER_ROTATION_CONTROL || '';
/* Which sections each control must turn red, measured (see the header). */
const CONTROLS = {
  earlystart: [1, 2, 7, 9],
  reshuffle: [3, 6, 7, 9],
  nofreeze: [6, 9],
  nohash: [9],
  nofallback: [5],
  liveside: [6],
  skipgone: [6, 9],
  unledgered: [6, 9],
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`CAREER_LADDER_ROTATION_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}

/* The first day the rotation may ever start. The constant may move later if a
   release slips, never earlier: the days before it have been played under the
   old rule. */
const FIRST_ALLOWED_START = '2026-10-15';
const DAYS = 800;
const START_OFFSETS = [0, 1, 2, 37, 100, 250, 500, 1000, 3000];
const CHANGE_DAYS = [40, 200, 400, 600, 1000];
const SHARE_BAND = [0.64, 0.69];
const LIVE_DIFFER_FLOOR = 20;
/* Section 9's pinned walk. Recompute it only for a change that is MEANT to
   re-deal days, and never once the rotation has started. Its days are
   absolute, so a release that slips and moves ROTATION_START later before the
   first rotation day re-pins it in the same commit; after that day, moving
   the start re-deals played days and this is what says so. */
const GOLDEN_DIGEST = '3a375aba848e96a4';

let failures = 0;
let section = 0;
const failBySection = {};
const fail = m => {
  failures += 1;
  failBySection[section] = (failBySection[section] || 0) + 1;
  console.error('  FAIL: ' + m);
};
const abort = m => { console.error('control cannot run: ' + m); process.exit(2); };

/* ---------- the module under test, possibly broken on purpose ---------- */
let libSrc = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'careerLadder.ts'), 'utf8');
function plant(oldText, newText) {
  if (!libSrc.includes(oldText)) abort(`anchor not in careerLadder.ts: ${oldText}`);
  libSrc = libSrc.replace(oldText, newText);
}
const SIDES_LINE = 'const { harder, easier } = rosterSides(roster);';
if (CONTROL === 'earlystart') {
  plant("export const ROTATION_START = '2026-10-15';", "export const ROTATION_START = '2026-06-01';");
}
if (CONTROL === 'reshuffle') {
  plant('function rotationOrder(ids: string[]): string[] {', 'function rotationOrder(ids: string[], salt = 0): string[] {');
  plant('return [...ids].sort((a, b) => key(a) - key(b) || a.localeCompare(b));',
    'return [...ids].sort((a, b) => dailyPrngSeed(`career-ladder:${a}:${salt}`) - dailyPrngSeed(`career-ladder:${b}:${salt}`) || a.localeCompare(b));');
  plant('return { order: rotationOrder(men.map(m => m.id)), offset: pos - cycleStart };',
    'return { order: rotationOrder(men.map(m => m.id), cycleStart), offset: pos - cycleStart };');
}
if (CONTROL === 'nofreeze') plant('let men = walk.men.filter(m => inOn(m, cycleDay));', 'let men = walk.men.filter(m => inOn(m, Infinity));');
if (CONTROL === 'nohash') plant('key(a) - key(b) || a.localeCompare(b)', 'a.localeCompare(b)');
if (CONTROL === 'nofallback') plant('if (men.length === 0) men = walk.men;', '');
if (CONTROL === 'liveside') {
  plant(SIDES_LINE, 'const named = [...rosterSides(roster).harder, ...rosterSides(roster).easier]; '
    + 'const harder = named.filter(m => !available.has(m.id) || peakValue(available.get(m.id)!) <= ROTATION_SPLIT_VALUE); '
    + 'const easier = named.filter(m => available.has(m.id) && peakValue(available.get(m.id)!) > ROTATION_SPLIT_VALUE);');
}
if (CONTROL === 'skipgone') {
  plant(SIDES_LINE, 'const harder = rosterSides(roster).harder.filter(m => available.has(m.id)); '
    + 'const easier = rosterSides(roster).easier.filter(m => available.has(m.id));');
}
if (CONTROL === 'unledgered') {
  plant(SIDES_LINE, 'const sides = rosterSides(roster); const named = new Set([...sides.harder, ...sides.easier].map(m => m.id)); '
    + 'const extra = eligible.filter(p => !named.has(p.id)).map(p => ({ id: p.id, spans: [{ day: -Infinity, isIn: true }], peak: peakValue(p) })); '
    + 'const harder = [...sides.harder, ...extra.filter(m => m.peak <= ROTATION_SPLIT_VALUE)]; '
    + 'const easier = [...sides.easier, ...extra.filter(m => m.peak > ROTATION_SPLIT_VALUE)];');
}
if (CONTROL) console.log(`NEGATIVE CONTROL ON (${CONTROL}): sections ${CONTROLS[CONTROL].join(', ')} must go red and nothing else.`);

/* Own temp directory per run: two harness runs at once must never share a
   bundle. The supabase client reads localStorage at module scope, and ESM
   hoists imports, so the stub has to be a module imported before it. The
   directory stays until exit because section 5's worker imports the bundle. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'careerLadderRotation-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const q = s => s.replaceAll('\\', '/');
const libCopy = path.join(tmp, 'careerLadder.ts');
fs.writeFileSync(libCopy, libSrc);
const stub = path.join(tmp, 'stub.mjs');
fs.writeFileSync(stub, 'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\n');
const entry = path.join(tmp, 'entry.mjs');
const bundle = path.join(tmp, 'bundle.mjs');
fs.writeFileSync(entry, [
  `import '${q(stub)}';`,
  `export { pickDailyPlayer, peakValue, ROTATION_START, ROTATION_SPLIT_VALUE, MIN_STINTS } from '${q(libCopy)}';`,
  `export { careerPlayers } from '${q(path.join(ROOT, 'src', 'data', 'careerPlayers.ts'))}';`,
  `export { dayNumber, getTodayET } from '${q(path.join(ROOT, 'src', 'lib', 'dateUtils.ts'))}';`,
].join('\n'));
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const BUNDLE_URL = pathToFileURL(bundle).href;
const mod = await import(BUNDLE_URL);
const { pickDailyPlayer, peakValue, ROTATION_START, ROTATION_SPLIT_VALUE, MIN_STINTS, dayNumber, getTodayET } = mod;

const iso = dn => new Date(dn * 86_400_000).toISOString().slice(0, 10);
const START_DN = dayNumber(ROTATION_START);
const FIRST_DN = dayNumber(FIRST_ALLOWED_START);
const TODAY = getTodayET();
const COMMITTED = readRoster(ROOT);

/* ---------- fixtures and rosters ---------- */
const season = (v, i) => ({ season: `${2010 + i}`, club: 'C', goals: 1, assists: 1, appearances: 20, marketValue: v, sortOrder: i });
const baked = mod.careerPlayers.map(p => ({
  id: p.name, name: p.name, nationality: p.nationality, position: p.position,
  seasons: p.career.map((s, i) => ({ season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, marketValue: s.marketValue, sortOrder: i })),
}));
const eligibleOf = pool => pool.filter(p => p.seasons.length >= MIN_STINTS);
const sideByPeak = p => (peakValue(p) <= ROTATION_SPLIT_VALUE ? 'h' : 'e');
/** A roster with every eligible man of `pool` in from `since`, the way the generator writes one. */
const rosterOf = (pool, since = ROTATION_START) => eligibleOf(pool).map(p => [p.id, sideByPeak(p), since, p.name]);
const bakedRoster = rosterOf(baked);
/** Each rostered man's side for good: his first in line. */
const sideMaps = new WeakMap();
function sideMap(roster) {
  if (sideMaps.has(roster)) return sideMaps.get(roster);
  const m = new Map();
  for (const [id, side] of roster) if (side !== 'x' && !m.has(id)) m.set(id, side);
  sideMaps.set(roster, m);
  return m;
}
/** Who the roster has in on day `dn`: his last line on or before it. */
function inOnDay(roster, dn) {
  const last = new Map();
  for (const [id, side, since] of roster) if (dayNumber(since) <= dn) last.set(id, side !== 'x');
  return new Set([...last].filter(([, isIn]) => isIn).map(([id]) => id));
}
function sideCounts(roster, dn = Infinity) {
  const sides = sideMap(roster);
  const ins = [...inOnDay(roster, dn)];
  return { H: ins.filter(id => sides.get(id) === 'h').length, E: ins.filter(id => sides.get(id) === 'e').length };
}
const floors = ({ H, E }) => ({
  harderGap: Math.max(150, Math.floor(0.9 * 1.5 * H)),
  easierGap: Math.max(300, Math.floor(0.9 * 3 * E)),
  standGap: Math.max(120, Math.floor(0.9 * 1.5 * E)),
});

/* ---------- the frozen legacy rule, as shipped before Round 718 ---------- */
function legacyPeak(p) { let peak = 0; for (const s of p.seasons) if ((s.marketValue ?? 0) > peak) peak = s.marketValue ?? 0; return peak; }
function legacyLegendPool(pool) {
  const eligible = pool.filter(p => p.seasons.length >= 4);
  if (eligible.length < 20) return eligible;
  const sorted = [...eligible].sort((a, b) => legacyPeak(b) - legacyPeak(a) || a.id.localeCompare(b.id));
  return sorted.slice(Math.floor(sorted.length / 2));
}
function legacyPick(pool, dateStr) {
  const eligible = pool.filter(p => p.seasons.length >= 4);
  if (eligible.length === 0) return null;
  const seed = parseInt(dateStr.replace(/-/g, ''), 10);
  const harder = legacyLegendPool(pool);
  const source = seed % 3 === 0 || harder.length === 0 ? eligible : harder;
  const sorted = [...source].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[seed % sorted.length];
}

/* ---------- one walk, measured ---------- */
function walk(pool, roster, startDn, days) {
  const sides = sideMap(roster);
  const last = new Map();
  const seen = new Set();
  let harderGap = Infinity, easierGap = Infinity, harder = 0, nulls = 0;
  for (let k = 0; k < days; k++) {
    const p = pickDailyPlayer(pool, iso(startDn + k), roster);
    if (!p) { nulls += 1; continue; }
    const isH = (sides.get(p.id) ?? sideByPeak(p)) === 'h';
    if (last.has(p.id)) {
      const gap = k - last.get(p.id);
      if (isH) harderGap = Math.min(harderGap, gap); else easierGap = Math.min(easierGap, gap);
    }
    last.set(p.id, k);
    seen.add(p.id);
    if (isH) harder += 1;
  }
  return { distinct: seen.size, harderGap, easierGap, harderShare: harder / days, nulls };
}
/* How many distinct men a correct walk must deal in `days` days from offset
   k0: every man of a side once the days on that side reach its size. Only the
   men the roster has in on the walk's first day count. */
function coverageBound(roster, k0, days) {
  const { H, E } = sideCounts(roster, START_DN + k0);
  let harderDays = 0;
  for (let k = k0; k < k0 + days; k++) if (k % 3 !== 2) harderDays += 1;
  return Math.min(H, harderDays) + Math.min(E, days - harderDays);
}
function checkWalk(pool, roster, label, k0, days) {
  const r = walk(pool, roster, START_DN + k0, days);
  const f = floors(sideCounts(roster, START_DN + k0));
  const bound = coverageBound(roster, k0, days);
  const distinctFloor = Math.ceil(0.98 * bound);
  console.log(`   ${label}: distinct ${r.distinct} (bound ${bound}), harder gap ${r.harderGap}, easier gap ${r.easierGap}, harder share ${r.harderShare.toFixed(4)}, nulls ${r.nulls}`);
  if (r.nulls > 0) fail(`${label}: ${r.nulls} days with no player`);
  if (r.distinct < distinctFloor) fail(`${label}: ${r.distinct} distinct men in ${days} days, floor ${distinctFloor} (98% of the ${bound} a full walk deals)`);
  if (r.harderGap < f.harderGap) fail(`${label}: a harder side man came back after ${r.harderGap} days, floor ${f.harderGap}`);
  if (r.easierGap < f.easierGap) fail(`${label}: an easier side man came back after ${r.easierGap} days, floor ${f.easierGap}`);
  if (r.harderShare < SHARE_BAND[0] || r.harderShare > SHARE_BAND[1]) fail(`${label}: harder share ${r.harderShare.toFixed(4)} outside [${SHARE_BAND.join(', ')}]`);
}

/* git, when it answers: null when it cannot (no git, no origin/main) */
function git(...args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}
const HAS_MAIN = git('rev-parse', '--verify', '--quiet', 'origin/main') !== null;

/* ---------- 1 ---------- */
section = 1;
console.log('1) the start date can only move later, the page reads one clock, and the rotation is on main before its first day');
{
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ROTATION_START) || Number.isNaN(START_DN)) fail(`ROTATION_START "${ROTATION_START}" is not an ISO date`);
  else if (START_DN < FIRST_DN) fail(`ROTATION_START is ${ROTATION_START}, before ${FIRST_ALLOWED_START}: the days between were played under the old rule and would change answer`);
  /* The page must take its day from useDailyPuzzle's todayStr and hand that
     and the committed roster to the pick, never read the clock itself.
     Comments stripped first: the prose around this code names all of it. */
  const page = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'CareerLadder.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const rosterImport = page.match(/import\s+(\w+)\s+from\s+['"]@\/data\/careerLadderRoster\.json['"]/);
  if (!/todayStr:\s*dailyDate/.test(page)) fail('CareerLadder.tsx no longer takes todayStr from useDailyPuzzle as dailyDate');
  if (!rosterImport) fail('CareerLadder.tsx no longer imports the committed roster, src/data/careerLadderRoster.json');
  else if (!new RegExp(`pickDailyPlayer\\(\\s*pool\\s*,\\s*dailyDate\\s*,\\s*${rosterImport[1]}\\.entries\\s*\\)`).test(page)) fail('CareerLadder.tsx no longer picks the daily player for the hook\'s own day from the committed roster');
  if (/getTodayET\s*\(/.test(page)) fail('CareerLadder.tsx reads the clock itself, a second read beside the hook\'s is the midnight race Round 718 closed');
  /* Release timing. The days before the start answer to the legacy rule, and
     a save the old code writes carries no puzzle id, so the hook cannot tell
     it was made against another man. If the start date arrives before the
     rotation is on main, those saves meet the rotation's man. */
  let release = 'not yet due';
  if (dayNumber(TODAY) >= START_DN) {
    const mainLib = HAS_MAIN ? git('show', 'origin/main:src/lib/careerLadder.ts') : null;
    if (mainLib === null) release = 'skipped, git or origin/main did not answer';
    else if (mainLib.includes(`export const ROTATION_START = '${ROTATION_START}';`)) release = 'on origin/main';
    else fail(`today (${TODAY} ET) is on or after ROTATION_START (${ROTATION_START}) and origin/main does not carry this rotation yet: move ROTATION_START, and the roster's since dates, to after the release`);
  }
  console.log(`   ROTATION_START ${ROTATION_START}, first allowed ${FIRST_ALLOWED_START}, today ${TODAY}: release check ${release}; the page picks for useDailyPuzzle's day from the committed roster`);
}

/* ---------- 2 ---------- */
section = 2;
console.log('2) every day of the year before the start keeps the old pick');
{
  const newcomer = { id: 'zz-after-the-fact', name: 'Added Later', nationality: 'X', position: 'CM', seasons: [10, 20, 30, 40].map(season) };
  /* Anchored on FIRST_ALLOWED_START, the harness's own date, never on the
     module's constant: the first draft walked the year before ROTATION_START
     and stayed green with the start moved to June, because it had moved the
     comparison along with it. */
  for (const [label, pool, roster] of [
    ['baked pool, its own roster', baked, bakedRoster],
    ['baked pool, no roster', baked, []],
    ['baked pool plus a newcomer on the roster', [...baked, newcomer], [...bakedRoster, [newcomer.id, 'h', '2026-09-01', newcomer.name]]],
  ]) {
    let same = 0; const differ = [];
    for (let dn = FIRST_DN - 365; dn < FIRST_DN; dn++) {
      const d = iso(dn);
      const a = pickDailyPlayer(pool, d, roster), b = legacyPick(pool, d);
      if ((a && a.id) === (b && b.id)) same += 1; else differ.push(d);
    }
    console.log(`   ${label}: ${same} of 365 days before ${FIRST_ALLOWED_START} match the frozen legacy rule`);
    if (differ.length) fail(`${label}: ${differ.length} days before ${FIRST_ALLOWED_START} no longer give the old answer, first ${differ.slice(0, 3).join(', ')}`);
  }
  let differAfter = 0;
  for (let dn = START_DN; dn < START_DN + 30; dn++) {
    const d = iso(dn);
    if (pickDailyPlayer(baked, d, bakedRoster).id !== legacyPick(baked, d).id) differAfter += 1;
  }
  console.log(`   ${differAfter} of the first 30 days from the start differ from the legacy rule (floor ${LIVE_DIFFER_FLOOR})`);
  if (differAfter < LIVE_DIFFER_FLOOR) fail(`only ${differAfter} of the first 30 days differ from the legacy rule, so the rotation is not dealing`);
}

/* ---------- 3 ---------- */
section = 3;
console.log(`3) ${DAYS} days from ${START_OFFSETS.length} start dates: every man once per side before anyone returns`);
{
  const s = sideCounts(bakedRoster);
  const f = floors(s);
  console.log(`   fixture: ${baked.length} men, ${bakedRoster.length} rostered, ${s.H} harder, ${s.E} easier; floors: harder gap ${f.harderGap}, easier gap ${f.easierGap}`);
  for (const k0 of START_OFFSETS) checkWalk(baked, bakedRoster, `from ${iso(START_DN + k0)} (+${k0})`, k0, DAYS);
  const legacy = walk(baked, bakedRoster, START_DN - DAYS, DAYS);
  console.log(`   for scale, the legacy rule over the ${DAYS} days before the start: distinct ${legacy.distinct}, harder gap ${legacy.harderGap}, easier gap ${legacy.easierGap}, harder share ${legacy.harderShare.toFixed(4)}`);
}

/* ---------- 4 ---------- */
section = 4;
console.log('4) the same date deals the same man, whatever order the pool and the roster arrived in');
{
  let seed = 718;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  const shuffledPool = [...baked].sort(() => rnd() - 0.5);
  const shuffledRoster = [...bakedRoster].sort(() => rnd() - 0.5);
  let dates = 0, mismatches = 0;
  for (let k = -DAYS; k <= DAYS; k += 7) {
    const d = iso(START_DN + k);
    dates += 1;
    const a = pickDailyPlayer(baked, d, bakedRoster), b = pickDailyPlayer(baked, d, bakedRoster), c = pickDailyPlayer(shuffledPool, d, shuffledRoster);
    if (!a || !b || !c || a.id !== b.id || a.id !== c.id) mismatches += 1;
  }
  console.log(`   ${dates} dates either side of the start, asked twice and once with the pool and the roster shuffled: ${mismatches} mismatches`);
  if (mismatches) fail(`${mismatches} dates changed answer between calls or with the arrival order`);
}

/* ---------- 5 ---------- */
section = 5;
console.log('5) small pools, one sided rosters, a roster nobody in the pool is on, and nobody in on the first cycle: never empty');
{
  const eligible = eligibleOf(baked);
  for (const n of [1, 2, 3, 7, 19, 25]) {
    const pool = eligible.slice(0, n);
    const roster = rosterOf(pool);
    const ids = new Set(pool.map(p => p.id));
    const seen = new Set();
    let nulls = 0, strangers = 0;
    for (let k = 0; k < 120; k++) {
      const p = pickDailyPlayer(pool, iso(START_DN + k), roster);
      if (!p) { nulls += 1; continue; }
      if (!ids.has(p.id)) strangers += 1;
      seen.add(p.id);
    }
    console.log(`   ${n} men (${roster.filter(e => e[1] === 'h').length} harder), 120 days: ${seen.size} dealt, ${nulls} empty days, ${strangers} men from outside the pool`);
    if (nulls) fail(`a pool of ${n} left ${nulls} days with no player`);
    if (strangers) fail(`a pool of ${n} dealt ${strangers} men who are not in it`);
    if (seen.size < n) fail(`a pool of ${n} dealt only ${seen.size} distinct men in 120 days`);
  }
  for (const [label, pool] of [['all harder', eligible.filter(p => sideByPeak(p) === 'h')], ['all easier', eligible.filter(p => sideByPeak(p) === 'e')]]) {
    const roster = rosterOf(pool);
    const seen = new Set();
    let nulls = 0;
    for (let k = 0; k < pool.length; k++) {
      const p = pickDailyPlayer(pool, iso(START_DN + k), roster);
      if (!p) nulls += 1; else seen.add(p.id);
    }
    console.log(`   ${label}, ${pool.length} men over ${pool.length} days: ${seen.size} distinct, ${nulls} empty days`);
    if (nulls) fail(`${label}: ${nulls} empty days`);
    if (seen.size !== pool.length) fail(`${label}: ${pool.length} men over ${pool.length} days dealt ${seen.size} distinct, so somebody came back before the side was done`);
  }
  {
    /* A pool the roster does not name at all (a test pool, or ids that do
       not match): the day still has a man, and every man comes round. */
    const strangers = Array.from({ length: 12 }, (_, i) => ({ id: `stranger-${i}`, name: `Stranger ${i}`, nationality: 'X', position: 'CM', seasons: [5, 10, 15, 20].map(season) }));
    const seen = new Set();
    let nulls = 0;
    for (let k = 0; k < 12; k++) {
      const p = pickDailyPlayer(strangers, iso(START_DN + k), bakedRoster);
      if (!p) nulls += 1; else seen.add(p.id);
    }
    console.log(`   12 men the roster does not name, 12 days: ${seen.size} distinct, ${nulls} empty days`);
    if (nulls || seen.size !== 12) fail(`a pool the roster does not name gave ${nulls} empty days and ${seen.size} of 12 men in 12 days`);
  }
  {
    /* Nobody in on the first cycles: every line dated 40 or 80 days after the
       start. The walk must deal everyone it names rather than loop on an
       empty cycle, and an endless loop blocks the thread it runs on, so it
       runs in a worker that is stopped after 20 seconds. */
    const pool = eligible.slice(0, 60);
    const roster = pool.map((p, i) => [p.id, sideByPeak(p), iso(START_DN + (i % 2 ? 40 : 80)), p.name]);
    const dates = Array.from({ length: 200 }, (_, k) => iso(START_DN + k));
    const code = `const { parentPort, workerData } = require('node:worker_threads');
import(workerData.url).then(m => {
  parentPort.postMessage(workerData.dates.map(d => { const p = m.pickDailyPlayer(workerData.pool, d, workerData.roster); return p ? p.id : null; }));
}, e => parentPort.postMessage({ error: String(e) }));`;
    const result = await new Promise(resolve => {
      const w = new Worker(code, { eval: true, workerData: { url: BUNDLE_URL, pool, roster, dates } });
      const timer = setTimeout(() => { w.terminate(); resolve({ hung: true }); }, 20_000);
      w.once('message', m => { clearTimeout(timer); w.terminate(); resolve(m); });
      w.once('error', e => { clearTimeout(timer); resolve({ error: String(e) }); });
    });
    if (result.hung) fail('a roster with nobody in on the first cycle never returned: the walk loops on an empty cycle');
    else if (result.error) fail(`a roster with nobody in on the first cycle threw: ${result.error}`);
    else {
      const ids = new Set(pool.map(p => p.id));
      const nulls = result.filter(id => id === null).length;
      const strangers = result.filter(id => id !== null && !ids.has(id)).length;
      const seen = new Set(result.filter(Boolean));
      console.log(`   60 men all dated after the start, 200 days: ${seen.size} dealt, ${nulls} empty days, ${strangers} from outside the pool`);
      if (nulls || strangers || seen.size < 60) fail(`a roster with nobody in on the first cycle gave ${nulls} empty days, ${strangers} strangers, ${seen.size} of 60 men in 200 days`);
    }
  }
}

/* ---------- 6 ---------- */
section = 6;
console.log('6) the pool and the roster change mid walk: nobody comes back early, by his own side\'s floor');
const section6 = { harder: Infinity, easier: Infinity, stand: Infinity };
{
  const f = floors(sideCounts(bakedRoster));
  /**
   * Walk with the pool and roster in force switching at given days, and hold
   * every repeat to the floor of the dealt man's side, or the stand in floor
   * when either deal of the pair was a stand in (the walk's own man could not
   * be dealt that day; found by asking again with `fullPool`, where everyone
   * the case ever removes is back).
   */
  function caseWalk(label, phases, until, fullPool, watch) {
    const last = new Map();
    let worst = { gap: Infinity };
    let watchDealt = -1;
    for (let j = 0; j < until; j++) {
      let phase = phases[0];
      for (const ph of phases) if (j >= ph.from) phase = ph;
      const d = iso(START_DN + j);
      const p = pickDailyPlayer(phase.pool, d, phase.roster);
      if (!p) { fail(`${label}: no player on day ${j}`); return; }
      const stand = fullPool ? pickDailyPlayer(fullPool, d, phase.roster).id !== p.id : false;
      const side = sideMap(phase.roster).get(p.id) ?? '?';
      if (watch && p.id === watch.id && j >= watch.after && watchDealt < 0) watchDealt = j;
      if (watch && p.id === watch.id && j < watch.after) fail(`${label}: ${p.id} was dealt on day ${j}, before the roster has him in`);
      const prev = last.get(p.id);
      if (prev) {
        const gap = j - prev.day;
        const kind = prev.stand || stand ? 'stand' : side === 'h' ? 'harder' : 'easier';
        const floor = kind === 'stand' ? f.standGap : kind === 'harder' ? f.harderGap : f.easierGap;
        section6[kind] = Math.min(section6[kind], gap);
        if (gap < floor && gap < worst.gap) worst = { gap, floor, kind, who: p.id, day: j };
      }
      last.set(p.id, { day: j, stand });
    }
    if (worst.gap !== Infinity) fail(`${label}: ${worst.who} (${worst.kind}) came back after ${worst.gap} days on day ${worst.day}, floor ${worst.floor}`);
    if (watch && watch.mustDeal && watchDealt < 0) fail(`${label}: ${watch.id} was never dealt after the roster took him in`);
    return watchDealt;
  }
  const withRows = (p, rows) => ({ ...p, seasons: rows.map(season) });
  const mkMan = (id, peak) => ({ id, name: id, nationality: 'X', position: 'CM', seasons: [peak - 30, peak - 20, peak - 10, peak].map(season) });
  const swap = (pool, man) => pool.map(p => (p.id === man.id ? man : p));
  const rostered = id => bakedRoster.some(e => e[0] === id);
  const harderMen = baked.filter(p => rostered(p.id) && sideByPeak(p) === 'h');
  const easierMen = baked.filter(p => rostered(p.id) && sideByPeak(p) === 'e');
  const threeSeasons = baked.filter(p => p.seasons.length === MIN_STINTS - 1);
  const pickEvery = (list, n) => Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
  const counts = {};
  const count = k => { counts[k] = (counts[k] || 0) + 1; };

  /* a) a newcomer, rostered from the day he arrives (the tightest since the
     generator allows), six ids so his hash lands all over the order */
  let slowest = 0;
  for (const k of CHANGE_DAYS) for (const id of ['newcomer-0', 'newcomer-5', 'newcomer-7', 'newcomer-11', 'newcomer-aa', 'newcomer-zz']) for (const peak of [40, 100]) {
    const man = mkMan(id, peak);
    const roster = [...bakedRoster, [id, sideByPeak(man), iso(START_DN + k), id]];
    const dealt = caseWalk(`newcomer ${id} (peak ${peak}) on day ${k}`, [{ from: 0, pool: baked, roster: bakedRoster }, { from: k, pool: [...baked, man], roster }], k + DAYS, null, { id, after: k, mustDeal: true });
    if (dealt >= 0) slowest = Math.max(slowest, dealt - k);
    count('newcomers');
  }
  /* b) a 4th season makes a man eligible on day k; the generator rosters him
     30 days later. Until then he is not dealt; after it he joins a cycle. */
  for (const k of CHANGE_DAYS) for (const p of pickEvery(threeSeasons, 4)) for (const v of [5, 80]) {
    const grown = withRows(p, [...p.seasons.map(s => s.marketValue ?? 0), v]);
    const pool = swap(baked, grown);
    const roster = [...bakedRoster, [p.id, sideByPeak(grown), iso(START_DN + k + 30), p.name]];
    caseWalk(`${p.name} gains a 4th season (${v}M) on day ${k}`, [{ from: 0, pool: baked, roster: bakedRoster }, { from: k, pool, roster: bakedRoster }, { from: k + 30, pool, roster }], k + DAYS, null, { id: p.id, after: k + 30, mustDeal: true });
    count('fourth seasons');
  }
  /* c) a peak crosses the line, both ways, roster untouched: a harder man's
     new 60M season, an easier man's peak row quarantined */
  for (const k of CHANGE_DAYS) {
    for (const p of pickEvery(harderMen, 6)) {
      const pool = swap(baked, withRows(p, [...p.seasons.map(s => s.marketValue ?? 0), ROTATION_SPLIT_VALUE + 10]));
      caseWalk(`${p.name} crosses to above the line on day ${k}`, [{ from: 0, pool: baked, roster: bakedRoster }, { from: k, pool, roster: bakedRoster }], k + 600, null);
      count('crossings');
    }
    const falls = easierMen.filter(p => {
      const vals = p.seasons.map(s => s.marketValue ?? 0);
      const i = vals.indexOf(Math.max(...vals));
      const rest = vals.filter((_, j) => j !== i);
      return rest.length >= MIN_STINTS && Math.max(...rest) <= ROTATION_SPLIT_VALUE;
    });
    for (const p of pickEvery(falls, 6)) {
      const vals = p.seasons.map(s => s.marketValue ?? 0);
      const i = vals.indexOf(Math.max(...vals));
      const pool = swap(baked, withRows(p, vals.filter((_, j) => j !== i)));
      caseWalk(`${p.name} falls under the line on day ${k}`, [{ from: 0, pool: baked, roster: bakedRoster }, { from: k, pool, roster: bakedRoster }], k + 600, null);
      count('crossings');
    }
  }
  /* d) a man drops to three seasons on day k (stood in for), the generator
     rosters him out 30 days later */
  const fourOnly = baked.filter(p => rostered(p.id) && p.seasons.length === MIN_STINTS);
  for (const k of CHANGE_DAYS) for (const p of pickEvery(fourOnly, 4)) {
    const pool = swap(baked, withRows(p, p.seasons.slice(0, MIN_STINTS - 1).map(s => s.marketValue ?? 0)));
    const roster = [...bakedRoster, [p.id, 'x', iso(START_DN + k + 30), p.name]];
    caseWalk(`${p.name} drops to three seasons on day ${k}`, [{ from: 0, pool: baked, roster: bakedRoster }, { from: k, pool, roster: bakedRoster }, { from: k + 30, pool, roster }], k + 600, baked);
    count('lost seasons');
  }
  /* e) a man deleted on day k and restored 20 days later, roster untouched;
     the dealt man three days before the change, so he is due again inside
     the walk */
  for (const k of CHANGE_DAYS) for (const back of [3, 40, 90, 150].filter(b => b <= k)) {
    const victim = pickDailyPlayer(baked, iso(START_DN + k - back), bakedRoster);
    const pool = baked.filter(p => p.id !== victim.id);
    caseWalk(`${victim.name} deleted on day ${k} and restored on day ${k + 20}`, [{ from: 0, pool: baked, roster: bakedRoster }, { from: k, pool, roster: bakedRoster }, { from: k + 20, pool: baked, roster: bakedRoster }], k + 600, baked);
    count('deleted and restored');
  }
  /* f) a man deleted for good on day k, rostered out 30 days later */
  for (const k of CHANGE_DAYS) for (const back of [3, 90].filter(b => b <= k)) {
    const victim = pickDailyPlayer(baked, iso(START_DN + k - back), bakedRoster);
    const pool = baked.filter(p => p.id !== victim.id);
    const roster = [...bakedRoster, [victim.id, 'x', iso(START_DN + k + 30), victim.name]];
    caseWalk(`${victim.name} deleted for good on day ${k}`, [{ from: 0, pool: baked, roster: bakedRoster }, { from: k, pool, roster: bakedRoster }, { from: k + 30, pool, roster }], k + 600, baked);
    count('removed for good');
  }
  console.log(`   cases: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  console.log(`   smallest repeat gap across every change: harder ${section6.harder} (floor ${f.harderGap}), easier ${section6.easier} (floor ${f.easierGap}), stand in ${section6.stand} (floor ${f.standGap}); a newcomer was dealt within ${slowest} days of arriving at the latest`);
}

/* ---------- 7 ---------- */
section = 7;
console.log('7) the live tables: the committed roster says what they say, and the walk over them');
{
  let live = null;
  try {
    live = await fetchLiveCareerPool(ROOT);
  } catch (e) {
    console.log(`   the database did not answer (${e.message}), skipped`);
  }
  if (live) {
    const appends = planAppends({ live, entries: COMMITTED, since: '(pending)', minStints: MIN_STINTS, splitValue: ROTATION_SPLIT_VALUE, peakValue });
    const sides = sideMap(COMMITTED);
    const drift = eligibleOf(live).filter(p => sides.has(p.id) && sides.get(p.id) !== sideByPeak(p));
    const s = sideCounts(COMMITTED);
    console.log(`   ${live.length} men, ${eligibleOf(live).length} eligible; roster ${COMMITTED.length} lines, ${s.H} harder and ${s.E} easier in; lines it is missing: ${appends.length}; men whose peak has crossed the line since they were rostered (they keep their side): ${drift.length}`);
    if (appends.length) fail(`the roster and the live tables disagree on ${appends.length} men (first: ${appends.slice(0, 3).map(e => `${e[3]} ${e[1] === 'x' ? 'out' : 'in'}`).join(', ')}): run node scripts/genCareerLadderRoster.mjs and commit ${ROSTER_PATH.replaceAll('\\', '/')}`);
    if (eligibleOf(live).length < 100) fail(`only ${eligibleOf(live).length} eligible men in the live table, the rotation's promise rests on a pool in the hundreds`);
    for (const k0 of [0, 100, 500]) checkWalk(live, COMMITTED, `live, from ${iso(START_DN + k0)} (+${k0})`, k0, DAYS);
  }
}

/* ---------- 8 ---------- */
section = 8;
console.log('8) the roster file: well formed, one side per man, in date order, and append only');
{
  const bad = COMMITTED.filter(e => !Array.isArray(e) || e.length !== 4 || e.some(v => typeof v !== 'string') || !e[0] || !['h', 'e', 'x'].includes(e[1]) || !/^\d{4}-\d{2}-\d{2}$/.test(e[2]) || Number.isNaN(dayNumber(e[2])));
  if (bad.length) fail(`${bad.length} malformed roster lines, first ${JSON.stringify(bad[0])}`);
  const firstSide = new Map(), twoSides = new Set(), outFirst = new Set(), pairs = new Set(), dupes = [];
  let disorder = null;
  COMMITTED.forEach(([id, side, since], i) => {
    if (!firstSide.has(id) && side === 'x') outFirst.add(id);
    if (side !== 'x') { if (firstSide.has(id) && firstSide.get(id) !== side) twoSides.add(id); if (!firstSide.has(id)) firstSide.set(id, side); }
    if (pairs.has(`${id} ${since}`)) dupes.push(id);
    pairs.add(`${id} ${since}`);
    if (!disorder && i > 0 && since < COMMITTED[i - 1][2]) disorder = `line ${i + 1} (${since}) after ${COMMITTED[i - 1][2]}`;
  });
  if (twoSides.size) fail(`${twoSides.size} men are on both sides (a man keeps his first side for good): ${[...twoSides].slice(0, 3).join(', ')}`);
  if (outFirst.size) fail(`${outFirst.size} men start out of the roster, an x before any in line means nothing`);
  if (dupes.length) fail(`${dupes.length} men have two lines on one date, which leaves their standing to file order: ${dupes.slice(0, 3).join(', ')}`);
  if (disorder) fail(`the roster is not in date order (${disorder}): the generator only appends, so a line out of order was written by hand`);
  const ids = new Set(COMMITTED.map(e => e[0]));
  console.log(`   ${COMMITTED.length} lines, ${ids.size} men, ${COMMITTED.filter(e => e[1] === 'x').length} out lines, dated ${COMMITTED[0]?.[2]} to ${COMMITTED.at(-1)?.[2]}`);
  /* Append only against origin/main, and every line main does not have yet
     dated after today: a line dated today or earlier reaches cycles the live
     roster has already dealt. Main is not the live site, so this is the
     earliest the check can see, not a promise about the release. */
  if (!HAS_MAIN) console.log('   history check skipped: git or origin/main did not answer');
  else {
    const mainText = git('show', `origin/main:${ROSTER_PATH.replaceAll('\\', '/')}`);
    const mainEntries = mainText === null ? [] : JSON.parse(mainText).entries;
    const kept = mainEntries.every((e, i) => JSON.stringify(e) === JSON.stringify(COMMITTED[i]));
    if (!kept) fail(`the roster no longer starts with origin/main's ${mainEntries.length} lines: a line was edited, removed or put in front, which re-deals days already played`);
    const fresh = COMMITTED.slice(mainEntries.length);
    const early = fresh.filter(e => dayNumber(e[2]) <= dayNumber(TODAY));
    console.log(`   origin/main has ${mainEntries.length} lines, ${kept ? 'all kept in order' : 'NOT kept'}; ${fresh.length} new here, ${early.length} of them dated today (${TODAY} ET) or earlier`);
    if (early.length) fail(`${early.length} roster lines new since origin/main count from today or earlier (first: ${early[0][3]}, ${early[0][2]}): regenerate them with a later --since`);
  }
}

/* ---------- 9 ---------- */
section = 9;
console.log('9) a golden walk: a synthetic pool and roster over 800 days from 2026-10-15, pinned');
{
  /* Everything the walk does in one fixture: two sides, men joining a later
     cycle, men rostered out, men the pool no longer holds (stood in for), a
     man under four seasons, and one the roster does not name. Peaks and ids
     are made up here, so a data round cannot move it. The days are absolute,
     from FIRST_ALLOWED_START, so a moved start date shows too. */
  const men = Array.from({ length: 102 }, (_, i) => ({
    id: `g${String(i).padStart(3, '0')}`, name: `G ${i}`, nationality: 'X', position: 'CM',
    seasons: [0, 1, 2, 3].slice(0, i % 17 === 5 ? 3 : 4).map(j => season(5 + ((i * 37 + j * 11) % 90), j)),
  }));
  const pool = [...men.filter(m => m.id !== 'g010' && m.id !== 'g020'), { id: 'g-unrostered', name: 'Not On It', nationality: 'X', position: 'CM', seasons: [10, 20, 30, 40].map(season) }];
  const roster = [
    ...men.slice(0, 96).filter(m => m.seasons.length >= MIN_STINTS).map(m => [m.id, sideByPeak(m), FIRST_ALLOWED_START, m.name]),
    ...men.slice(96).map(m => [m.id, sideByPeak(m), iso(FIRST_DN + 100), m.name]),
    ...['g030', 'g031', 'g032'].map(id => [id, 'x', iso(FIRST_DN + 300), id]),
  ];
  const ids = Array.from({ length: DAYS }, (_, k) => pickDailyPlayer(pool, iso(FIRST_DN + k), roster)?.id ?? 'null');
  const digest = crypto.createHash('sha256').update(ids.join(',')).digest('hex').slice(0, 16);
  console.log(`   ${pool.length} men, ${roster.length} roster lines; first days ${ids.slice(0, 8).join(' ')}; digest ${digest} (pinned ${GOLDEN_DIGEST})`);
  if (digest !== GOLDEN_DIGEST) fail(`the golden walk changed (digest ${digest}, pinned ${GOLDEN_DIGEST}): the order, the hash, the cycle rule or the stand in rule moved, which re-deals days already played`);
}

/* ---------- verdict ---------- */
console.log('');
if (CONTROL) {
  const expected = CONTROLS[CONTROL];
  const missed = expected.filter(s => !failBySection[s]);
  const elsewhere = Object.entries(failBySection).filter(([s]) => !expected.includes(Number(s))).reduce((n, [, c]) => n + c, 0);
  if (missed.length === 0 && elsewhere === 0) {
    console.error(`simCareerLadderRotation control (${CONTROL}): fired as expected in section${expected.length === 1 ? '' : 's'} ${expected.join(', ')}. Exiting non zero on purpose.`);
    process.exit(1);
  }
  if (missed.length) console.error(`simCareerLadderRotation control (${CONTROL}): RED. Section${missed.length === 1 ? '' : 's'} ${missed.join(', ')} did not notice the planted break, so ${missed.length === 1 ? 'it proves' : 'they prove'} nothing.`);
  if (elsewhere > 0) console.error(`simCareerLadderRotation control (${CONTROL}): RED. ${elsewhere} failure(s) outside sections ${expected.join(', ')}, which the control run must not hide.`);
  process.exit(2);
}
if (failures > 0) {
  console.error(`simCareerLadderRotation: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCareerLadderRotation: green. The old days keep their man, and from the start nobody comes back until his side has been dealt.');
