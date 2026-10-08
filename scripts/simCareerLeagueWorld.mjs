/* Round 1100: every league a real league (Soccer Career).

   The career club pool grows from four Club Manager leagues to all of them,
   every plain 2026-27 league gets a size, a format and a derby cadence row,
   the finish is banded by the club's place in its own league, and the leagues
   that split or play in conferences get an ODD_FORMATS row and nothing else.
   This harness holds that world to what main shipped before the round and to
   the facts file.

   Modes
     RECORD=main   run on the UNTOUCHED tree (refuses unless FALLBACK_CLUBS
                   has 241 rows and the Eredivisie has no size) and write the
                   four recorded files under scripts/data:
                     careerPoolMain1100.json           the 51 pool rows main ships
                     careerLeagueFinish1100.json       finishBand and drawLeagueFinish over a built cross
                     careerLeagueWorldSaves1100.json   seven old saves and what main reads from them
                     careerLeagueWorldBaseline1100.json  main's world shares (RECORD_PART=world, one SEEDSET a run)
     (default)     the checks, sections A to E.

   Nothing here touches the network or the database. Every control patches
   the BUNDLE in memory and first asserts its anchor exists.

   Runs past three minutes at full size: run it detached. Green is the closing
   "simCareerLeagueWorld: ... green" line and exit 0. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleCareerSources, poolInputs } from './lib/careerClubPool.mjs';
import { careerStep, seedRandom } from './lib/careerStep.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'scripts', 'data');
const RECORD = process.env.RECORD || '';
const PART = process.env.RECORD_PART || '';
const SEEDSET = Number(process.env.SEEDSET || 0);
const CAREERS = Number(process.env.CAREERS || 300);
const F = {
  pool: path.join(DATA, 'careerPoolMain1100.json'),
  finish: path.join(DATA, 'careerLeagueFinish1100.json'),
  saves: path.join(DATA, 'careerLeagueWorldSaves1100.json'),
  baseline: path.join(DATA, 'careerLeagueWorldBaseline1100.json'),
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const tmpDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'simworld-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const EXTRA = {
  league: 'lib/soccerCareerLeague.ts',
  format: 'data/leagueFormat.ts',
  derby: 'lib/soccerCareerDerby.ts',
  season: 'lib/season/soccer.ts',
  rivalries: 'data/clubRivalries.ts',
};
const t0 = Date.now();
const mod = await bundleCareerSources({ root: ROOT, tmpDir, extra: EXTRA });
const { engine, league: LG, season: SE } = mod;
const POOL = engine.FALLBACK_CLUBS;
const HAND = engine.HAND_CLUBS;
const inputs = poolInputs(mod);
console.log(`bundled in ${Date.now() - t0} ms; ${POOL.length} clubs (${HAND.length} hand rows)`);

const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value)}\n`);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

/* ─── The finish cross (3.3 item 2, critic 10) ───
   Built, not sampled: every league label of the list plus "Serie B" (which
   has no club on main) and null; nine years; tier 1 with and without the
   elite flag, tiers 2 to 5 without; five ratings; title on and off; three
   seed keys (the engine's real shape with a real club of that league, "x"
   and "s17"). 180 rows a (league, year) pair, stored as one string of base
   36 digits a pair (the finish, 0 for none) beside the pair's size and its
   30 bands, which keeps the whole cross under 1 MB without thinning it. */
export const CROSS = {
  years: [1990, 1994, 1995, 2003, 2019, 2025, 2026, 2030, 2045],
  ratings: [5.9, 6.3, 7.0, 7.5, 8.4],
  tiers: [[1, false], [1, true], [2, false], [3, false], [4, false], [5, false]],
  keys: ['engine', 'x', 's17'],
};
export const crossKey = (kind, club, year, rating) => (kind === 'engine' ? `Probe|${club}|${year}|30|7|4|${rating}` : kind);
const d36 = n => { if (!(n >= 0 && n < 36)) throw new Error(`cannot store ${n} as one base 36 digit`); return n.toString(36); };

function crossLeagues() {
  const labels = [...new Set(POOL.map(c => c.league))];
  const out = labels.map(l => [l, POOL.find(c => c.league === l).name]);
  if (!labels.includes('Serie B')) {
    const serieb = inputs.realLeagues.find(l => l.id === 'serieb');
    if (!serieb) throw new Error('Club Manager has no serieb league to take a Serie B club from');
    out.push(['Serie B', inputs.fold(serieb.clubs[0])]);
  }
  out.push([null, 'Nowhere FC']);
  return out;
}
/** One pair of the cross as main answers it: [leagueIndex, yearIndex, size, bands, finishes]. */
function crossPair(li, yi, label, club) {
  const year = CROSS.years[yi];
  const size = label === null ? null : LG.leagueSizeFor(label, year);
  let bands = '';
  let fins = '';
  for (const [tier, elite] of CROSS.tiers) for (const rating of CROSS.ratings) {
    if (size) { const [lo, hi] = LG.finishBand(tier, elite, size, rating); bands += d36(lo) + d36(hi); }
    for (const title of [false, true]) for (const kind of CROSS.keys) {
      const got = LG.drawLeagueFinish({ league: label, year, tier, elite, rating, leagueTitle: title, seedKey: crossKey(kind, club, year, rating) });
      if ((got.leagueSize ?? null) !== (got.leagueFinish === undefined ? null : size)) throw new Error(`size of ${label} ${year} is not what leagueSizeFor says`);
      fins += d36(got.leagueFinish ?? 0);
    }
  }
  return [li, yi, size ?? 0, bands, fins];
}

/* ─── RECORD=main ─── */
function recordGuard() {
  if (POOL.length !== 241 || LG.leagueSizeFor('Eredivisie', 2030) !== null) {
    console.error(`RECORD=main refuses: this is not the untouched tree (FALLBACK_CLUBS ${POOL.length}, 241 wanted; Eredivisie 2030 size ${LG.leagueSizeFor('Eredivisie', 2030)}, null wanted)`);
    process.exit(2);
  }
}
function recordPool() {
  const rows = POOL.slice(HAND.length);
  writeJson(F.pool, { note: 'Round 1100 step 0: the generated pool rows main ships (FALLBACK_CLUBS after the hand rows), recorded on the untouched tree. The regenerated pool must START with these rows in this order.', hand: HAND.length, rows });
  console.log(`  wrote ${path.relative(ROOT, F.pool)}: ${rows.length} rows after ${HAND.length} hand rows`);
}
function recordFinish() {
  const leagues = crossLeagues();
  const pairs = [];
  for (let li = 0; li < leagues.length; li += 1) for (let yi = 0; yi < CROSS.years.length; yi += 1) pairs.push(crossPair(li, yi, leagues[li][0], leagues[li][1]));
  const sized = pairs.filter(p => p[2] > 0).length;
  writeJson(F.finish, {
    note: 'Round 1100 step 0: finishBand and drawLeagueFinish as main answers them, recorded on the untouched tree by RECORD=main node scripts/simCareerLeagueWorld.mjs. One entry a (league, year) pair: [league index, year index, size or 0, 30 bands as lo hi base 36 digits, 180 finishes as base 36 digits (0 is none)]. Row order inside a pair: tiers, ratings, title off then on, keys.',
    ...CROSS, leagues, pairs,
  });
  const bytes = fs.statSync(F.finish).size;
  console.log(`  wrote ${path.relative(ROOT, F.finish)}: ${leagues.length} leagues x ${CROSS.years.length} years = ${pairs.length} pairs (${sized} sized on main), ${pairs.length * 180} rows, ${bytes} bytes`);
  if (bytes > 1e6) { console.error('  the cross is over 1 MB'); process.exit(1); }
}

/* ─── main ─── */
if (RECORD === 'main') {
  recordGuard();
  console.log('RECORD=main: writing what the untouched tree answers');
  if (!PART || PART === 'pool') recordPool();
  if (!PART || PART === 'finish') recordFinish();
  console.log(`simCareerLeagueWorld: recorded (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(0);
}

/* ─── The checks ─── */
const red = new Set();
let section = '0';
let failures = 0;
const fail = m => { failures += 1; red.add(section); if (failures <= 60) console.error(`  FAIL [${section}]: ${m}`); };
const ok = (cond, m) => { if (!cond) fail(m); return cond; };
const head = (id, title) => { section = id; console.log(`\n${id}. ${title}`); };
function finish() {
  console.log('');
  console.log(failures ? `simCareerLeagueWorld: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}` : `simCareerLeagueWorld: all sections green (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(failures ? 1 : 0);
}
const GENERATED = POOL.slice(HAND.length);
const BIG_FIVE = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);

/* ─── B. POOL ─── */
head('B1', 'POOL: the rows main shipped are still the first rows, in order');
{
  const main = readJson(F.pool);
  ok(HAND.length === main.hand, `HAND_CLUBS has ${HAND.length} rows, main had ${main.hand}`);
  ok(main.rows.length === 51, `the recorded file holds ${main.rows.length} rows, 51 wanted`);
  /* the permanent form (critic 9): order, id, name, country and league. Tier
     and colour follow Club Manager's bake and may move at a re-bake; the full
     byte check against main's bake is step 2's one time proof (POOL_BYTES=1). */
  const keys = process.env.POOL_BYTES === '1' ? ['id', 'name', 'country', 'tier', 'color', 'league'] : ['id', 'name', 'country', 'league'];
  let same = 0;
  main.rows.forEach((want, i) => {
    const got = GENERATED[i];
    if (ok(!!got && keys.every(k => got[k] === want[k]), `pool row ${i + 1} is ${got ? JSON.stringify(got) : 'missing'}, main had ${JSON.stringify(want)}`)) same += 1;
  });
  console.log(`  ${same} of ${main.rows.length} recorded rows found in place (${keys.join(', ')}); the pool has ${GENERATED.length} generated rows`);
}

/* ─── C. BAND ─── */
head('C1', "BAND: main's recorded cross, the five big leagues and every season before 2026 byte for byte");
{
  const cross = readJson(F.finish);
  const count = { five: 0, past: 0, other: 0, changed: 0, sizedPairs: 0 };
  const strays = [];
  for (const [li, yi, size, bands, fins] of cross.pairs) {
    const [label, club] = cross.leagues[li];
    const year = cross.years[yi];
    const now = crossPair(li, yi, label, club);
    const five = label !== null && BIG_FIVE.has(label);
    const held = five || year < 2026;
    const sizedNow = size === 0 && now[2] > 0;
    if (sizedNow) count.sizedPairs += 1;
    let diff = 0;
    for (let i = 0; i < fins.length; i += 1) if (fins[i] !== now[4][i]) diff += 1;
    if (size !== now[2] || bands !== now[3]) diff += 1;
    if (held) {
      count[five ? 'five' : 'past'] += fins.length;
      ok(diff === 0, `${label} ${year}: ${diff} recorded answers moved in a ${five ? 'big five league' : 'season before 2026'}`);
    } else {
      count.other += fins.length;
      count.changed += diff;
      if (diff && !sizedNow) strays.push(`${label} ${year}`);
    }
  }
  ok(strays.length === 0, `answers moved in a league this round gave no size: ${strays.slice(0, 6).join(', ')}`);
  ok(count.five > 0 && count.past > 0 && count.other > 0, `an empty group: five ${count.five}, past ${count.past}, other ${count.other}`);
  ok(count.sizedPairs === 0 ? count.changed === 0 : count.changed > 0, `${count.sizedPairs} (league, year) pairs gained a size and ${count.changed} answers moved`);
  console.log(`  held: ${count.five} rows in the five big leagues, ${count.past} rows before 2026 outside them; free to move: ${count.other} rows, ${count.changed} moved over ${count.sizedPairs} pairs that gained a size`);
}

finish();
