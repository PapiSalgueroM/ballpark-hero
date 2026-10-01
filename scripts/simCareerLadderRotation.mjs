/**
 * Round 718: Career Ladder's daily is a no repeat rotation from ROTATION_START,
 * and every day before it keeps the pick it always had.
 *
 * WHAT CHANGED. pickDailyPlayer in src/lib/careerLadder.ts used to be the date
 * as a number modulo the pool, two lists taking turns, which repeated a man
 * inside a few weeks (measured below: a minimum repeat gap of ONE day over the
 * 800 days before the start). From 2026-10-15 it walks each side of the pool
 * (harder: peak market value at or under ROTATION_SPLIT_VALUE, easier: above)
 * in one fixed order hashed from the player id, two days in three from the
 * harder side, so nobody comes back until his whole side has been dealt. Each
 * cycle deals the roster that existed when the cycle began (career_players
 * created_at, carried as addedAt), so a man added mid cycle waits for the next
 * one and nobody already in the walk moves. Days before the start call the old
 * rule, so a finished ladder never turns into another man on reload.
 *
 * MEASURED 2026-10-01 on the baked pool (src/data/careerPlayers.ts, 253 men,
 * 244 eligible, 125 harder and 119 easier) and again on the live tables (same
 * counts, created_at on all 253 rows). Nine start dates, offsets 0, 1, 2, 37,
 * 100, 250, 500, 1000 and 3000 days from ROTATION_START, 800 days each:
 *   distinct men dealt      244 of 244 every time (the coverage bound)
 *   harder side repeat gap  187 days every time (bound: 1.5 x 125 = 187)
 *   easier side repeat gap  357 days every time (bound: 3 x 119 = 357)
 *   harder share            0.6663 to 0.6675
 *   nulls                   0
 * The legacy rule over the 800 days before the start: 228 distinct (227 live),
 * minimum gap 1, harder share 0.835 against the same line. The year before the
 * start: 365 of 365 days agree with a frozen copy of the old rule, and 7 of the
 * first 7 days after it differ. A newcomer added mid walk (five days, six ids,
 * both sides, baked and live): the gap across the change stayed 187 every time
 * and he was dealt 153 to 583 days later. A man removed mid walk: 183 to 187.
 * Small pools of 1, 2, 3, 7, 19 and 25 men over 120 days: no null, every man
 * dealt. One sided pools of 125 and 119 over as many days: every man once.
 *
 * FLOORS, well inside those numbers and scaled to the pool, so growth cannot
 * turn the harness red and shrinkage past the promise does:
 *   harder gap  >= max(150, 0.9 x 1.5 x H)   168 today, measured 187 (and 183
 *               across a removal). 150 is the absolute floor because the What's
 *               New line promises about half a year; the harder side would have
 *               to lose 25 men before the walk itself could reach it.
 *   easier gap  >= max(300, 0.9 x 3 x E)     321 today, measured 357
 *   distinct    >= 98% of the coverage bound  239 today, measured 244
 *   harder share in [0.64, 0.69]              measured 0.666 to 0.668
 *   rotation live: >= 20 of the first 30 days differ from the legacy rule
 *
 * THE FIXTURE. The baked file carries no ids (the hash order is by id), so the
 * fixture uses the name as the id. Every number above is structural, it comes
 * from the side sizes and the fixed order being a permutation, not from which
 * permutation, and section 7 repeats the walk over the live table with the real
 * ids and created_at whenever it answers.
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
 * something it should not have.
 *   CAREER_LADDER_ROTATION_CONTROL=earlystart  ROTATION_START moved to
 *     2026-06-01. Sections 1 and 2 must go red (measured: 135 of the 365 days
 *     before 2026-10-15 stop matching the legacy rule), and 7 with them when
 *     the table answers, because the men the July and August data rounds added
 *     then join mid walk and the first cycles run short (measured: 69 days).
 *   CAREER_LADDER_ROTATION_CONTROL=reshuffle   the order is salted with the
 *     cycle, so each cycle deals a different permutation. Section 3 must go red
 *     (measured: the harder gap collapses from 187 to 7 to 13), and 6 and 7 with
 *     it.
 *   CAREER_LADDER_ROTATION_CONTROL=nofreeze    the cycle roster is the live
 *     side, the first version's bug. Section 6 must go red (measured: a newcomer
 *     whose hash lands before the walk's position deals yesterday's man again,
 *     gap 1).
 *
 * Run: node scripts/simCareerLadderRotation.mjs   (section 7 needs the network)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CAREER_LADDER_ROTATION_CONTROL || '';
/* Which sections each control must turn red. earlystart also reaches 7 when
   the table answers: with the start moved to June, the men created by the
   July and August data rounds join in a later cycle, so the first cycles are
   short and the live walk's gap collapses (measured: 69 days). That is the
   rotation behaving correctly on a start placed before data it already had,
   and exactly why the constant can only move later. */
const CONTROLS = { earlystart: [1, 2, 7], reshuffle: [3, 6, 7], nofreeze: [6] };
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
const SHARE_BAND = [0.64, 0.69];
const LIVE_DIFFER_FLOOR = 20;

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
if (CONTROL === 'earlystart') {
  plant("export const ROTATION_START = '2026-10-15';", "export const ROTATION_START = '2026-06-01';");
  console.log('NEGATIVE CONTROL ON (earlystart): ROTATION_START moved to 2026-06-01. Sections 1 and 2 must go red.');
}
if (CONTROL === 'reshuffle') {
  plant('function rotationOrder(players: CareerPlayer[]): CareerPlayer[] {', 'function rotationOrder(players: CareerPlayer[], salt = 0): CareerPlayer[] {');
  plant('dailyPrngSeed(`career-ladder:${p.id}`)', 'dailyPrngSeed(`career-ladder:${p.id}:${salt}`)');
  plant('return rotationOrder(roster)[pos - cycleStart];', 'return rotationOrder(roster, cycleStart)[pos - cycleStart];');
  console.log('NEGATIVE CONTROL ON (reshuffle): every cycle deals its own permutation. Section 3 must go red.');
}
if (CONTROL === 'nofreeze') {
  plant('let roster = side.filter(p => joinDay(p) < cycleDay);', 'let roster = side;');
  console.log('NEGATIVE CONTROL ON (nofreeze): a cycle deals the live side, not the roster it began with. Section 6 must go red.');
}

/* Own temp directory per run: two harness runs at once must never share a
   bundle. The supabase client reads localStorage at module scope, and ESM
   hoists imports, so the stub has to be a module imported before it. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'careerLadderRotation-'));
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
  `export { dayNumber } from '${q(path.join(ROOT, 'src', 'lib', 'dateUtils.ts'))}';`,
].join('\n'));
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const mod = await import(pathToFileURL(bundle).href);
const { pickDailyPlayer, peakValue, ROTATION_START, ROTATION_SPLIT_VALUE, MIN_STINTS, dayNumber } = mod;
fs.rmSync(tmp, { recursive: true, force: true });

const iso = dn => new Date(dn * 86_400_000).toISOString().slice(0, 10);
const START_DN = dayNumber(ROTATION_START);
const isHarder = p => peakValue(p) <= ROTATION_SPLIT_VALUE;

/* ---------- the fixture ---------- */
const baked = mod.careerPlayers.map(p => ({
  id: p.name, name: p.name, nationality: p.nationality, position: p.position,
  seasons: p.career.map((s, i) => ({ season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, marketValue: s.marketValue, sortOrder: i })),
}));
const sides = pool => {
  const eligible = pool.filter(p => p.seasons.length >= MIN_STINTS);
  return { eligible, H: eligible.filter(isHarder).length, E: eligible.filter(p => !isHarder(p)).length };
};
const floors = ({ H, E }) => ({
  harderGap: Math.max(150, Math.floor(0.9 * 1.5 * H)),
  easierGap: Math.max(300, Math.floor(0.9 * 3 * E)),
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
function walk(pool, startDn, days) {
  const last = new Map();
  const seen = new Set();
  let harderGap = Infinity, easierGap = Infinity, harder = 0, nulls = 0;
  for (let k = 0; k < days; k++) {
    const p = pickDailyPlayer(pool, iso(startDn + k));
    if (!p) { nulls += 1; continue; }
    if (last.has(p.id)) {
      const gap = k - last.get(p.id);
      if (isHarder(p)) harderGap = Math.min(harderGap, gap); else easierGap = Math.min(easierGap, gap);
    }
    last.set(p.id, k);
    seen.add(p.id);
    if (isHarder(p)) harder += 1;
  }
  return { distinct: seen.size, harderGap, easierGap, harderShare: harder / days, nulls };
}
/* How many distinct men a correct walk must deal in `days` days from offset
   k0: every man of a side once the days on that side reach its size. Only the
   men already in the table on the walk's first day count: a man added later
   joins a later cycle, which is the freeze working, not a shortfall. */
function coverageBound(pool, k0, days) {
  const joinDn = p => (p.addedAt && /^\d{4}-\d{2}-\d{2}/.test(p.addedAt)) ? dayNumber(p.addedAt.slice(0, 10)) : -Infinity;
  const { H, E } = sides(pool.filter(p => joinDn(p) < START_DN + k0));
  let harderDays = 0;
  for (let k = k0; k < k0 + days; k++) if (k % 3 !== 2) harderDays += 1;
  return Math.min(H, harderDays) + Math.min(E, days - harderDays);
}
function checkWalk(pool, label, k0, days) {
  const r = walk(pool, START_DN + k0, days);
  const f = floors(sides(pool));
  const bound = coverageBound(pool, k0, days);
  const distinctFloor = Math.ceil(0.98 * bound);
  console.log(`   ${label}: distinct ${r.distinct} (bound ${bound}), harder gap ${r.harderGap}, easier gap ${r.easierGap}, harder share ${r.harderShare.toFixed(4)}, nulls ${r.nulls}`);
  if (r.nulls > 0) fail(`${label}: ${r.nulls} days with no player`);
  if (r.distinct < distinctFloor) fail(`${label}: ${r.distinct} distinct men in ${days} days, floor ${distinctFloor} (98% of the ${bound} a full walk deals)`);
  if (r.harderGap < f.harderGap) fail(`${label}: a harder side man came back after ${r.harderGap} days, floor ${f.harderGap}`);
  if (r.easierGap < f.easierGap) fail(`${label}: an easier side man came back after ${r.easierGap} days, floor ${f.easierGap}`);
  if (r.harderShare < SHARE_BAND[0] || r.harderShare > SHARE_BAND[1]) fail(`${label}: harder share ${r.harderShare.toFixed(4)} outside [${SHARE_BAND.join(', ')}]`);
}

/* ---------- 1 ---------- */
section = 1;
console.log('1) the start date can only move later, and the page reads one clock');
{
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ROTATION_START) || Number.isNaN(START_DN)) fail(`ROTATION_START "${ROTATION_START}" is not an ISO date`);
  else if (START_DN < dayNumber(FIRST_ALLOWED_START)) fail(`ROTATION_START is ${ROTATION_START}, before ${FIRST_ALLOWED_START}: the days between were played under the old rule and would change answer`);
  /* The page must take its day from useDailyPuzzle's todayStr and hand that
     to the pick, never read the clock itself. Comments stripped first: the
     prose around this code names both. */
  const page = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'CareerLadder.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  if (!/todayStr:\s*dailyDate/.test(page)) fail('CareerLadder.tsx no longer takes todayStr from useDailyPuzzle as dailyDate');
  if (!/pickDailyPlayer\(\s*pool\s*,\s*dailyDate\s*\)/.test(page)) fail('CareerLadder.tsx no longer picks the daily player for the hook\'s own day');
  if (/getTodayET\s*\(/.test(page)) fail('CareerLadder.tsx reads the clock itself, a second read beside the hook\'s is the midnight race Round 718 closed');
  console.log(`   ROTATION_START ${ROTATION_START}, first allowed ${FIRST_ALLOWED_START}; the page picks for useDailyPuzzle's day`);
}

/* ---------- 2 ---------- */
section = 2;
console.log('2) every day of the year before the start keeps the old pick');
{
  const newcomer = { id: 'zz-after-the-fact', name: 'Added Later', nationality: 'X', position: 'CM', addedAt: '2026-09-01T12:00:00Z',
    seasons: [10, 20, 30, 40].map((v, i) => ({ season: `${2010 + i}`, club: 'C', goals: 1, assists: 1, appearances: 20, marketValue: v, sortOrder: i })) };
  /* Anchored on FIRST_ALLOWED_START, the harness's own date, never on the
     module's constant: the first draft walked the year before ROTATION_START
     and stayed green with the start moved to June, because it had moved the
     comparison along with it. */
  const FIRST_DN = dayNumber(FIRST_ALLOWED_START);
  for (const [label, pool] of [['baked pool', baked], ['baked pool plus a man with addedAt', [...baked, newcomer]]]) {
    let same = 0; const differ = [];
    for (let dn = FIRST_DN - 365; dn < FIRST_DN; dn++) {
      const d = iso(dn);
      const a = pickDailyPlayer(pool, d), b = legacyPick(pool, d);
      if ((a && a.id) === (b && b.id)) same += 1; else differ.push(d);
    }
    console.log(`   ${label}: ${same} of 365 days before ${FIRST_ALLOWED_START} match the frozen legacy rule`);
    if (differ.length) fail(`${label}: ${differ.length} days before ${FIRST_ALLOWED_START} no longer give the old answer, first ${differ.slice(0, 3).join(', ')}`);
  }
  let differAfter = 0;
  for (let dn = START_DN; dn < START_DN + 30; dn++) {
    const d = iso(dn);
    if (pickDailyPlayer(baked, d).id !== legacyPick(baked, d).id) differAfter += 1;
  }
  console.log(`   ${differAfter} of the first 30 days from the start differ from the legacy rule (floor ${LIVE_DIFFER_FLOOR})`);
  if (differAfter < LIVE_DIFFER_FLOOR) fail(`only ${differAfter} of the first 30 days differ from the legacy rule, so the rotation is not dealing`);
}

/* ---------- 3 ---------- */
section = 3;
console.log(`3) ${DAYS} days from ${START_OFFSETS.length} start dates: every man once per side before anyone returns`);
{
  const s = sides(baked);
  const f = floors(s);
  console.log(`   fixture: ${baked.length} men, ${s.eligible.length} eligible, ${s.H} harder, ${s.E} easier; floors: harder gap ${f.harderGap}, easier gap ${f.easierGap}`);
  for (const k0 of START_OFFSETS) checkWalk(baked, `from ${iso(START_DN + k0)} (+${k0})`, k0, DAYS);
  const legacy = walk(baked, START_DN - DAYS, DAYS);
  console.log(`   for scale, the legacy rule over the ${DAYS} days before the start: distinct ${legacy.distinct}, harder gap ${legacy.harderGap}, easier gap ${legacy.easierGap}, harder share ${legacy.harderShare.toFixed(4)}`);
}

/* ---------- 4 ---------- */
section = 4;
console.log('4) the same date deals the same man, whatever order the pool arrived in');
{
  let seed = 718;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  const shuffled = [...baked].sort(() => rnd() - 0.5);
  let dates = 0, mismatches = 0;
  for (let k = -DAYS; k <= DAYS; k += 7) {
    const d = iso(START_DN + k);
    dates += 1;
    const a = pickDailyPlayer(baked, d), b = pickDailyPlayer(baked, d), c = pickDailyPlayer(shuffled, d);
    if (!a || !b || !c || a.id !== b.id || a.id !== c.id) mismatches += 1;
  }
  console.log(`   ${dates} dates either side of the start, asked twice and once with the pool shuffled: ${mismatches} mismatches`);
  if (mismatches) fail(`${mismatches} dates changed answer between calls or with the pool's arrival order`);
}

/* ---------- 5 ---------- */
section = 5;
console.log('5) small pools and one sided pools: never empty, every man dealt');
{
  const { eligible } = sides(baked);
  for (const n of [1, 2, 3, 7, 19, 25]) {
    const pool = eligible.slice(0, n);
    const ids = new Set(pool.map(p => p.id));
    const seen = new Set();
    let nulls = 0, strangers = 0;
    for (let k = 0; k < 120; k++) {
      const p = pickDailyPlayer(pool, iso(START_DN + k));
      if (!p) { nulls += 1; continue; }
      if (!ids.has(p.id)) strangers += 1;
      seen.add(p.id);
    }
    console.log(`   ${n} men (${pool.filter(isHarder).length} harder), 120 days: ${seen.size} dealt, ${nulls} empty days, ${strangers} men from outside the pool`);
    if (nulls) fail(`a pool of ${n} left ${nulls} days with no player`);
    if (strangers) fail(`a pool of ${n} dealt ${strangers} men who are not in it`);
    if (seen.size < n) fail(`a pool of ${n} dealt only ${seen.size} distinct men in 120 days`);
  }
  for (const [label, pool] of [['all harder', eligible.filter(isHarder)], ['all easier', eligible.filter(p => !isHarder(p))]]) {
    const seen = new Set();
    let nulls = 0;
    for (let k = 0; k < pool.length; k++) {
      const p = pickDailyPlayer(pool, iso(START_DN + k));
      if (!p) nulls += 1; else seen.add(p.id);
    }
    console.log(`   ${label}, ${pool.length} men over ${pool.length} days: ${seen.size} distinct, ${nulls} empty days`);
    if (nulls) fail(`${label}: ${nulls} empty days`);
    if (seen.size !== pool.length) fail(`${label}: ${pool.length} men over ${pool.length} days dealt ${seen.size} distinct, so somebody came back before the side was done`);
  }
}

/* ---------- 6 ---------- */
section = 6;
console.log('6) the pool changes mid walk and nobody is dealt twice in a row');
{
  const f = floors(sides(baked));
  const mkMan = (id, peak) => ({ id, name: id, nationality: 'X', position: 'CM',
    seasons: [peak - 30, peak - 20, peak - 10, peak].map((v, i) => ({ season: `${2010 + i}`, club: 'C', goals: 1, assists: 1, appearances: 20, marketValue: v, sortOrder: i })) });
  /* Six ids so the newcomer's hash lands at different spots in the order, and
     five days so the walk's position is early and late in a cycle. */
  const ids = ['newcomer-0', 'newcomer-5', 'newcomer-7', 'newcomer-11', 'newcomer-aa', 'newcomer-zz'];
  const addDays = [40, 123, 170, 300, 450];
  let cases = 0, worstGap = Infinity, slowest = 0, undealt = 0;
  for (const k of addDays) {
    for (const id of ids) {
      for (const peak of [40, 100]) {
        const man = mkMan(id, peak);
        const grown = [...baked, { ...man, addedAt: iso(START_DN + k) + 'T12:00:00Z' }];
        const last = new Map();
        let minGap = Infinity, dealtAfter = -1;
        for (let j = 0; j < k + DAYS; j++) {
          const p = j < k ? pickDailyPlayer(baked, iso(START_DN + j)) : pickDailyPlayer(grown, iso(START_DN + j));
          if (p.id === man.id && dealtAfter < 0) dealtAfter = j - k;
          if (last.has(p.id)) minGap = Math.min(minGap, j - last.get(p.id));
          last.set(p.id, j);
        }
        cases += 1;
        worstGap = Math.min(worstGap, minGap);
        if (dealtAfter < 0) undealt += 1; else slowest = Math.max(slowest, dealtAfter);
        if (minGap < f.harderGap) fail(`${peak <= ROTATION_SPLIT_VALUE ? 'a harder' : 'an easier'} man (${id}) added on day ${k} made somebody come back after ${minGap} days, floor ${f.harderGap}`);
        if (dealtAfter < 0) fail(`${id} added on day ${k} was never dealt in the ${DAYS} days that followed`);
      }
    }
  }
  console.log(`   ${cases} additions: smallest repeat gap across any change ${worstGap} (floor ${f.harderGap}), newcomer dealt within ${slowest} days at the latest, ${undealt} never dealt`);
  let removals = 0, worstRemoval = Infinity;
  for (const k of [40, 200, 300]) {
    const victim = pickDailyPlayer(baked, iso(START_DN + k - 3));
    const shrunk = baked.filter(p => p.id !== victim.id);
    const last = new Map();
    let minGap = Infinity;
    for (let j = 0; j < k + 600; j++) {
      const p = j < k ? pickDailyPlayer(baked, iso(START_DN + j)) : pickDailyPlayer(shrunk, iso(START_DN + j));
      if (last.has(p.id)) minGap = Math.min(minGap, j - last.get(p.id));
      last.set(p.id, j);
    }
    removals += 1;
    worstRemoval = Math.min(worstRemoval, minGap);
    if (minGap < f.harderGap) fail(`removing ${victim.name} on day ${k} made somebody come back after ${minGap} days, floor ${f.harderGap}`);
  }
  console.log(`   ${removals} removals (the man dealt three days earlier): smallest repeat gap across any change ${worstRemoval}`);
}

/* ---------- 7 ---------- */
section = 7;
console.log('7) the live tables: created_at on every man, and the same walk over the real ids');
{
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
  const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
  const headers = range => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, Range: range });
  let live = null;
  try {
    const pr = await fetch(`${URL_}/rest/v1/career_players?select=id,player_name,nationality,position,created_at&order=id`, { headers: headers('0-9999') });
    if (!pr.ok) throw new Error(`career_players ${pr.status}`);
    const players = await pr.json();
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const sr = await fetch(`${URL_}/rest/v1/career_seasons?select=player_id,season,club,goals,assists,appearances,market_value,sort_order&order=player_id,sort_order`, { headers: headers(`${from}-${from + 999}`) });
      if (!sr.ok) throw new Error(`career_seasons ${sr.status}`);
      const page = await sr.json();
      rows.push(...page);
      if (page.length < 1000) break;
    }
    const by = new Map();
    for (const s of rows) {
      if (!by.has(s.player_id)) by.set(s.player_id, []);
      by.get(s.player_id).push({ season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, marketValue: s.market_value, sortOrder: s.sort_order });
    }
    live = players.map(p => ({ id: p.id, name: p.player_name, nationality: p.nationality, position: p.position, seasons: by.get(p.id) || [], addedAt: p.created_at ? String(p.created_at) : undefined }));
  } catch (e) {
    console.log(`   the database did not answer (${e.message}), skipped`);
  }
  if (live) {
    const missing = live.filter(p => !p.addedAt || !/^\d{4}-\d{2}-\d{2}/.test(p.addedAt));
    const s = sides(live);
    const f = floors(s);
    console.log(`   ${live.length} men, ${s.eligible.length} eligible, ${s.H} harder, ${s.E} easier, created_at missing on ${missing.length}; floors: harder gap ${f.harderGap}, easier gap ${f.easierGap}`);
    if (missing.length) fail(`${missing.length} live men have no usable created_at, so the cycle freeze cannot tell when they joined: ${missing.slice(0, 3).map(p => p.name).join(', ')}`);
    if (s.eligible.length < 100) fail(`only ${s.eligible.length} eligible men in the live table, the rotation's promise rests on a pool in the hundreds`);
    for (const k0 of [0, 100, 500]) checkWalk(live, `live, from ${iso(START_DN + k0)} (+${k0})`, k0, DAYS);
  }
}

/* ---------- verdict ---------- */
console.log('');
if (CONTROL) {
  const expected = CONTROLS[CONTROL];
  const caught = expected.reduce((n, s) => n + (failBySection[s] || 0), 0);
  const elsewhere = Object.entries(failBySection).filter(([s]) => !expected.includes(Number(s))).reduce((n, [, c]) => n + c, 0);
  if (caught > 0 && elsewhere === 0) {
    console.error(`simCareerLadderRotation control (${CONTROL}): fired as expected, ${caught} finding${caught === 1 ? '' : 's'} in section${expected.length === 1 ? '' : 's'} ${expected.join(', ')}. Exiting non zero on purpose.`);
    process.exit(1);
  }
  if (caught === 0) console.error(`simCareerLadderRotation control (${CONTROL}): RED. The planted break went unnoticed, so the sections it belongs to prove nothing.`);
  if (elsewhere > 0) console.error(`simCareerLadderRotation control (${CONTROL}): RED. ${elsewhere} failure(s) outside sections ${expected.join(', ')}, which the control run must not hide.`);
  process.exit(2);
}
if (failures > 0) {
  console.error(`simCareerLadderRotation: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCareerLadderRotation: green. The old days keep their man, and from the start nobody comes back until his side has been dealt.');
