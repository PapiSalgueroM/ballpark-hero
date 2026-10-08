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
import { bundleCareerSources, poolInputs, POOL_LEAGUE_ROWS, POOL_LEAGUES, HELD_LEAGUES, NAME_ALIASES } from './lib/careerClubPool.mjs';
import { careerStep, seedRandom } from './lib/careerStep.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'scripts', 'data');
const RECORD = process.env.RECORD || '';
const PART = process.env.RECORD_PART || '';
const SEEDSET = Number(process.env.SEEDSET || 0);
const CAREERS = Number(process.env.CAREERS || 300);
const PARTS = process.env.WORLD_PARTS || path.join(ROOT, '.tmp-fx');
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

/* ─── Old saves (section E, critic 6) ───
   Built through the engine's own doors: a 2025 career walks its academy
   years, signs for the named club through acceptOffer, and stays put (the
   one choice that differs from careerStep: a transfer window is declined)
   until two playing seasons from 2026 sit in the save. Hertha Berlin and
   Nantes sign under the label they carried before Round 1037 moved it, which
   is what a save from before that round still holds. The two dugout saves
   are simManagerCareer's hand built shape, played two seasons. */
const clone = v => JSON.parse(JSON.stringify(v));
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const clubRow = name => { const c = POOL.find(x => x.name === name); if (!c) throw new Error(`no club ${name} in the list`); return c; };
export const SAVE_PLAN = [
  { id: 'ere', kind: 'player', club: 'Twente', nat: 'Netherlands' },
  { id: 'cha', kind: 'player', club: 'Norwich City', nat: 'England' },
  { id: 'sco', kind: 'player', club: 'Hearts', nat: 'Scotland' },
  { id: 'her', kind: 'player', club: 'Hertha Berlin', nat: 'Germany', oldLabel: 'Bundesliga' },
  { id: 'nan', kind: 'player', club: 'Nantes', nat: 'France', oldLabel: 'Ligue 1' },
  { id: 'mgrSco', kind: 'manager', club: 'Hearts', league: 'Scottish Premiership' },
  { id: 'mgrSeg', kind: 'manager', club: 'Girona', league: 'Segunda Division' },
];
function stayStep(s) {
  if (s.phase === 'transfer_window') return engine.stayAtClub(s, POOL);
  return careerStep(engine, s, POOL);
}
const settled = (s, club) => {
  const rows = s.seasons.filter(r => r.type === 'playing');
  const last = rows.slice(-2);
  return s.phase === 'playing' && !s.retired && s.currentClub === club && last.length === 2
    && last.every(r => r.club === club && r.year >= 2026 && r.apps > 0 && !r.injurySevere);
};
function buildPlayerSave(plan) {
  const row = clubRow(plan.club);
  const signFor = plan.oldLabel ? { ...row, league: plan.oldLabel } : row;
  for (let seed = 1; seed <= 40; seed += 1) {
    seedRandom(0x1100a + seed * 7919);
    let s = engine.initCareer(`World ${plan.id}`, plan.nat, 'CM', '2025', abil(68), 68, 2025, POOL, null, 86);
    let guard = 0;
    while (s.phase !== 'contract_offer' && !s.retired && guard++ < 80) s = careerStep(engine, s, POOL);
    if (s.phase !== 'contract_offer') continue;
    s = engine.acceptOffer(s, { club: signFor, contractYears: 5, wage: 20000, transferFee: 0 });
    guard = 0;
    while (!settled(s, plan.club) && !s.retired && guard++ < 200) s = stayStep(s);
    if (settled(s, plan.club)) return { seed, state: s };
  }
  throw new Error(`no seed in 40 left a player two seasons into ${plan.club}`);
}
function seasonRow(year, tier) {
  return { year, age: 28, club: 'Club', clubCountry: 'England', clubTier: tier, apps: 34, goals: 10,
    assists: 5, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.1, leagueTitle: false, domesticCup: false,
    championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
}
export function dugoutState(club, tier, lastYear, league) {
  return { nationality: 'England', peakOverall: 80, intStats: { caps: 10 },
    seasons: Array.from({ length: 12 }, (_, i) => seasonRow(lastYear - 11 + i, 2)), events: [], awards: [],
    phase: 'manager_season', overall: 80, age: 40,
    managerState: { club, clubTier: tier, season: 0, trophies: 0, promotions: 0, seasonResults: [],
      nationalTeamOffer: false, managingNationalTeam: false, ...(league ? { league } : {}) } };
}
function buildManagerSave(plan) {
  const row = clubRow(plan.club);
  for (let seed = 1; seed <= 40; seed += 1) {
    seedRandom(0x1100b + seed * 7919);
    let s = dugoutState(plan.club, row.tier, 2029, plan.league);
    s = engine.advanceManagerSeason(s, POOL);
    s = engine.advanceManagerSeason(s, POOL);
    const ms = s.managerState;
    if (!ms.unemployed && ms.club === plan.club && ms.seasonResults.length === 2) return { seed, state: s };
  }
  throw new Error(`no seed in 40 kept a manager two seasons at ${plan.club}`);
}
/** What a tree reads from a save: repairCareer's bytes and, per playing row
 *  from 2026, the finish and the Season Centre's mode, reason and games. */
function readSave(state) {
  /* null when repairCareer leaves the save's own bytes alone */
  const fixed = JSON.stringify(engine.repairCareer(clone(state)));
  const repaired = fixed === JSON.stringify(state) ? null : fixed;
  const keep = Math.random;
  Math.random = () => { throw new Error('Math.random called while reading a save'); };
  try {
    const rows = state.seasons.filter(r => r.type === 'playing' && r.year >= 2026 && r.club !== 'Club').map(r => {
      const ctx = SE.buildSoccerSeasonCtx(state, POOL, r);
      return { year: r.year, club: r.club, finish: LG.readLeagueFinish(r), league: ctx.league ? ctx.league.name : null, mode: ctx.mode, why: ctx.why, games: ctx.games };
    });
    const dugout = (state.managerState?.seasonResults ?? []).map(r => {
      const w = LG.dugoutTableWords(r);
      return { league: r.league ?? null, leagueSize: r.leagueSize ?? null, sizeVerified: r.sizeVerified === true, result: r.result, header: w.header, orderNote: w.orderNote, note: w.note };
    });
    return { repaired, rows, dugout };
  } finally { Math.random = keep; }
}
/* ─── The world (section D) ───
   CAREERS careers from the 2025 start for each of 17 starting nations,
   stepped by careerStep (simCareerClubPool section 6's dispatch: he takes the
   first offer and goes where the window sends him), seeded per seed set and
   nation. Every playing season from 2026 with a game played and no severe
   injury is measured: does the row hold a league finish, does the Season
   Centre open a table for it, and how much of that table carries a name. */
export const NATIONS = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands', 'Portugal', 'Turkey', 'Belgium', 'Scotland', 'Brazil', 'Argentina', 'Mexico', 'USA', 'Saudi Arabia', 'Japan', 'Nigeria'];
const POSITIONS = ['ST', 'CM', 'CB', 'GK'];
const todayLeague = club => POOL.find(c => c.name === club)?.league ?? '';
function measureSeason(career, row) {
  const keep = Math.random;
  Math.random = () => { throw new Error('Math.random called while reading a season'); };
  try {
    const ctx = SE.buildSoccerSeasonCtx(career, POOL, row);
    const finish = LG.readLeagueFinish(row);
    const table = ctx.mode === 'table';
    const size = table ? finish.size : 0;
    const names = new Set([...ctx.rivals, ...ctx.named, ...(ctx.champion ? [ctx.champion] : [])]);
    names.delete(row.club);
    return { finish, table, named: table ? Math.min(size, 1 + names.size) / size : 0, namedRows: table ? Math.min(size, 1 + names.size) : 0, size, ctx };
  } finally { Math.random = keep; }
}
function playWorld(seedset, careers, onSeason, nations = NATIONS) {
  for (const nat of nations) {
    const ni = NATIONS.indexOf(nat);
    seedRandom(0x1100c + seedset * 100003 + ni * 7919);
    for (let c = 0; c < careers; c += 1) {
      const ovr = 45 + (c % 28);
      let s = engine.initCareer(`World ${seedset}.${ni}.${c}`, nat, POSITIONS[c % POSITIONS.length], '2025', abil(ovr), ovr, 2025, POOL, null);
      let rows = s.seasons.length;
      let guard = 0;
      while (!s.retired && guard++ < 140) {
        s = careerStep(engine, s, POOL);
        if (s.seasons.length > rows) {
          rows = s.seasons.length;
          const row = s.seasons[rows - 1];
          if (row.type === 'playing' && row.year >= 2026 && row.apps > 0 && !row.injurySevere) onSeason(s, row, nat);
        }
      }
    }
  }
}
const tally = () => ({ seasons: 0, finish: 0, table: 0, named: 0 });
function addSeason(t, m) { t.seasons += 1; if (m.finish) t.finish += 1; if (m.table) t.table += 1; t.named += m.named; }
const shares = t => ({ finishShare: t.seasons ? t.finish / t.seasons : 0, tableShare: t.seasons ? t.table / t.seasons : 0, namedShare: t.seasons ? t.named / t.seasons : 0 });
const pct = v => `${(v * 100).toFixed(1)}%`;
/** One seed set's world: overall, per nation and per league tallies. */
function worldRun(seedset, careers, nations, onEach) {
  const out = { careers, overall: tally(), nations: {}, leagues: {} };
  playWorld(seedset, careers, (career, row, nat) => {
    const m = measureSeason(career, row);
    addSeason(out.overall, m);
    addSeason(out.nations[nat] ??= tally(), m);
    addSeason(out.leagues[todayLeague(row.club) || '(none)'] ??= tally(), m);
    if (onEach) onEach(career, row, m);
  }, nations);
  return out;
}
function recordWorld() {
  const nations = process.env.NATION ? [process.env.NATION] : NATIONS;
  const t = Date.now();
  const run = worldRun(SEEDSET, CAREERS, nations);
  const s = shares(run.overall);
  console.log(`  seed set ${SEEDSET}, ${CAREERS} careers x ${nations.length} nations: ${run.overall.seasons} seasons, finish ${pct(s.finishShare)}, table ${pct(s.tableShare)}, named ${pct(s.namedShare)} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
  if (process.env.NATION) return;
  /* one part a seed set, so three runs can go side by side; RECORD_PART=merge folds them */
  const part = path.join(PARTS, `world-main-seed${SEEDSET}.json`);
  writeJson(part, run);
  console.log(`  wrote ${part}`);
}
function recordMerge() {
  const world = {};
  for (const set of [0, 1, 2]) {
    const part = path.join(PARTS, `world-main-seed${set}.json`);
    if (!fs.existsSync(part)) { console.error(`  missing ${part}: run RECORD_PART=world SEEDSET=${set} first`); process.exit(2); }
    world[set] = readJson(part);
  }
  const dugout = dugoutRates();
  writeJson(F.baseline, { note: 'Round 1100 step 0: the world as main plays it, recorded on the untouched tree by RECORD=main node scripts/simCareerLeagueWorld.mjs with RECORD_PART=world SEEDSET=0, 1 and 2, then RECORD_PART=merge. world: per seed set, overall, per starting nation and per league (the label the list gives the club): seasons, seasons holding a league finish, seasons the Season Centre opens a table for, and the summed share of table rows that carry a name. dugout: title, top two, bottom three and sack counts by the number of rows in the table and by league.', world, dugout });
  for (const set of [0, 1, 2]) { const sh = shares(world[set].overall); console.log(`  seed set ${set}: ${world[set].overall.seasons} seasons, finish ${pct(sh.finishShare)}, table ${pct(sh.tableShare)}, named ${pct(sh.namedShare)}`); }
  console.log(`  dugout: ${Object.entries(dugout.bySize).map(([n, t]) => `size ${n}: ${t.seasons} seasons, title ${t.title}, top two ${t.topTwo}, bottom three ${t.bottomThree}, sacked ${t.sack}`).join('; ')}`);
  console.log(`  wrote ${path.relative(ROOT, F.baseline)}: ${fs.statSync(F.baseline).size} bytes`);
}

/* ─── The dugout (section D3) ───
   120 dugout careers a tier over the HAND clubs of that tier (the same clubs
   on main and on the branch, so the two can be read side by side), eight
   seasons each from 2030, simManagerCareer's loop: a sacked manager takes the
   first job offered. onRow sees every employed season as the save holds it. */
function dugoutRun(onRow) {
  seedRandom(0x1100d);
  for (const tier of [1, 2, 3, 4]) {
    const pool = HAND.filter(c => c.tier === tier);
    for (let k = 0; k < 120; k += 1) {
      const club = pool[k % pool.length];
      let s = dugoutState(club.name, tier, 2029, club.league);
      for (let y = 0; y < 8; y += 1) {
        if (s.managerState.unemployed) {
          if ((s.managerState.offers ?? [])[0]) s = engine.acceptManagerOffer(s, 0);
          else { s = engine.advanceManagerSeason(s, POOL); continue; }
        }
        const tierBefore = s.managerState.clubTier;
        s = engine.advanceManagerSeason(s, POOL);
        const ms = s.managerState;
        onRow(ms.seasonResults[ms.seasonResults.length - 1], ms, tierBefore);
      }
    }
  }
}
const dugTally = () => ({ seasons: 0, title: 0, topTwo: 0, bottomThree: 0, sack: 0 });
/** Rates by the table's row count and by league, as the tree plays them. */
function dugoutRates(check) {
  const bySize = {};
  const byLeague = {};
  dugoutRun((row, ms, tier) => {
    for (const t of [bySize[row.leagueSize] ??= dugTally(), byLeague[row.league ?? '(none)'] ??= dugTally()]) {
      t.seasons += 1;
      if (row.playerPos === 1) t.title += 1;
      if (row.playerPos <= 2) t.topTwo += 1;
      if (row.playerPos >= row.leagueSize - 2) t.bottomThree += 1;
      if (ms.unemployed) t.sack += 1;
    }
    if (check) check(row, ms, tier);
  });
  return { bySize, byLeague };
}
function recordSaves() {
  const saves = SAVE_PLAN.map(plan => {
    const built = plan.kind === 'player' ? buildPlayerSave(plan) : buildManagerSave(plan);
    const state = clone(built.state);
    const main = readSave(state);
    console.log(`  ${plan.id}: seed ${built.seed}, ${plan.kind === 'player' ? main.rows.map(r => `${r.year} ${r.club} ${r.finish ? `${r.finish.finish}/${r.finish.size}` : 'no finish'} ${r.mode}${r.why ? `(${r.why})` : ''} ${r.games}g`).join('; ') : main.dugout.map(r => `${r.league} size ${r.leagueSize}${r.sizeVerified ? ' verified' : ''}: ${r.result.slice(0, 50)}`).join('; ')}`);
    return { ...plan, seed: built.seed, state, main };
  });
  writeJson(F.saves, { note: 'Round 1100 step 0: seven saves built on the untouched tree by RECORD=main node scripts/simCareerLeagueWorld.mjs (RECORD_PART=saves), each with what main reads from it: repairCareer serialised, and per playing row from 2026 the finish, the Season Centre mode, reason and games; per dugout season the size and the words around the table.', saves });
  console.log(`  wrote ${path.relative(ROOT, F.saves)}: ${saves.length} saves, ${fs.statSync(F.saves).size} bytes`);
}

/* ─── main ─── */
await engine.loadManagerMarket();
if (RECORD === 'main') {
  recordGuard();
  console.log('RECORD=main: writing what the untouched tree answers');
  if (!PART || PART === 'pool') recordPool();
  if (!PART || PART === 'finish') recordFinish();
  if (!PART || PART === 'saves') recordSaves();
  if (PART === 'world') recordWorld();
  if (PART === 'merge') recordMerge();
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

head('B4', "POOL: the dugout's key finds every pool club under Club Manager's spelling");
{
  /* the dugout matches a job's club (Club Manager's spelling) to the list
     (the career's) by this key, soccerCareerLeague.ts clubKey word for word */
  const CANON = mod.rivalries.SC_CLUB_CANON;
  const foldName = v => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const clubKey = name => foldName(CANON[name] ?? name);
  /* Club Manager's Nacional is the Madeira club and the list's "Nacional" is
     the Uruguayan one, so CD Nacional must NOT share the key "nacional" */
  const PINNED = { Nacional: 'CD Nacional' };
  let checked = 0;
  const missing = [];
  for (const row of POOL_LEAGUE_ROWS.filter(r => !HELD_LEAGUES[r.id])) {
    for (const cmName of inputs.realLeagues.find(l => l.id === row.id).clubs) {
      const career = NAME_ALIASES[cmName] ?? inputs.fold(cmName);
      checked += 1;
      if (PINNED[cmName]) { ok(career === PINNED[cmName] && clubKey(cmName) !== clubKey(career), `${cmName}: the pinned exception no longer holds (career name ${career})`); continue; }
      if (clubKey(cmName) !== clubKey(career)) missing.push(`'${career}': '${cmName}',`);
    }
  }
  ok(missing.length === 0, `${missing.length} pool clubs the dugout cannot match to Club Manager's spelling; add to SC_CLUB_CANON in src/data/clubRivalries.ts: ${missing.join(' ')}`);
  ok(checked >= 350, `only ${checked} clubs checked`);
  console.log(`  ${checked} Club Manager clubs of ${POOL_LEAGUES.length} leagues, ${checked - missing.length} matched by the key (1 pinned apart: Nacional and CD Nacional)`);
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
