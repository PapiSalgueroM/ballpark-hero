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
     SNAPSHOT_PROBE_ONLY=1  three new seasons from the captured player save,
                   only the independent saved-future field and table checks.

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
  odd: 'data/leagueOddFormats.ts',
  derby: 'lib/soccerCareerDerby.ts',
  season: 'lib/season/soccer.ts',
  core: 'lib/season/core.ts',
  rivalries: 'data/clubRivalries.ts',
  pool: 'data/soccerCareerClubPool.ts',
  ...(fs.existsSync(path.join(ROOT, 'src/data/soccerCareerLowerClubs.ts')) ? { lower: 'data/soccerCareerLowerClubs.ts' } : {}),
};
/* ─── Negative controls and the tap ───
   SIM_LEAGUE_WORLD_CONTROL=<name>: each is a transform of one source file in
   the bundle (the tree is never edited), first asserts its anchor exists
   (exit 2 when it does not: the control is dead), names the section that
   must go red, and the run exits 0 only if that section did. `world` says
   whether the control needs the careers of section D to be seen. */
const CONTROL = process.env.SIM_LEAGUE_WORLD_CONTROL || '';
const swap = (from, to) => s => {
  if (!s.includes(from)) { console.error(`control ${CONTROL}: its anchor is gone: ${from.slice(0, 70)}`); process.exit(2); }
  return s.replace(from, to);
};
/* the same line stands twice in soccerCareerLeague.ts (finishBand, then
   ladderBand): `swapLast` rewrites the LADDER's copy and dies unless there
   are exactly two */
const swapLast = (from, to) => s => {
  const parts = s.split(from);
  if (parts.length !== 3) { console.error(`control ${CONTROL}: ${parts.length - 1} copies of its anchor, 2 wanted: ${from.slice(0, 70)}`); process.exit(2); }
  return `${parts[0]}${from}${parts[1]}${to}${parts[2]}`;
};
const NUDGE = '  const nudge = rating >= 7.5 ? -at(0.1) : rating < 6.3 ? at(0.1) : 0;\n';
const ERE_SIZE = '  "Eredivisie": [{ from: 2026, size: 18 }],\n';
const CONTROLS = {
  nosize: { file: 'lib/soccerCareerLeague.ts', red: ['A', 'D2'], world: true, edit: swap(ERE_SIZE, '') },
  nocadence: { file: 'lib/soccerCareerDerby.ts', red: ['A', 'D2'], world: true, edit: swap('  "Eredivisie": [{ from: 2026, meetings: 2 }],\n', '') },
  scotrow: { file: 'lib/soccerCareerLeague.ts', red: ['A'], edit: swap(ERE_SIZE, `${ERE_SIZE}  "Scottish Premiership": [{ from: 2026, size: 12 }],\n`) },
  rankfive: { file: 'lib/soccerCareerLeague.ts', red: ['C1'], edit: swap('const ABSOLUTE_BAND = new Set(["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"]);', 'const ABSOLUTE_BAND = new Set<string>([]);') },
  flatband: { file: 'lib/soccerCareerLeague.ts', red: ['C4'], edit: swap('  if (groups && club !== null) {\n', '  if (groups && club !== null && input.year < 0) {\n') },
  keyshift: { file: 'lib/soccerCareerEngine.ts', red: ['B6'], world: true, edit: swap('seedKey: `${state.playerName}|${state.currentClub}|${seasonYear}|', 'seedKey: `${state.currentClub}|${state.playerName}|${seasonYear}|') },
  rewrite: { file: 'lib/soccerCareerEngine.ts', red: ['E'], edit: swap('export function repairCareer<T extends CareerState>(state: T): T {\n  if (!state || typeof state !== "object") return state;\n', 'export function repairCareer<T extends CareerState>(state: T): T {\n  if (!state || typeof state !== "object") return state;\n  for (const r of ((state as CareerState).seasons ?? [])) if (r.type === "playing" && r.year >= 2026 && r.leagueFinish === undefined) (r as { leagueFinish?: number }).leagueFinish = 5;\n') },
  nocanon: { file: 'data/clubRivalries.ts', red: ['B4'], edit: swap("  'Kasimpasa': 'Kasımpaşa',\n", '') },
  /* the review's finding: the top place of a table is left to the world's
     champion alone, so a league the world crowns nobody in reads "another
     club" in 1st and loses one of its clubs. D1 reads the page's own labels. */
  crownnobody: { file: 'lib/season/soccer.ts', red: ['D1'], world: true, edit: swap("    else if (s.champion && ctx.titleOpen && ctx.mode === 'table') open.push(s);\n", '') },
  snapshotfield: { file: 'lib/season/soccer.ts', red: ['D1'], world: true, edit: swap('const members = snapshot?.members ?? managerLeagueField(', 'const members = managerLeagueField(') },
  snapshotcrown: { file: 'lib/season/soccer.ts', red: ['D1'], world: true, edit: swap('snapshot && finish && finish.finish !== 1 ? snapshot.champion :', 'snapshot && finish && finish.finish !== 1 ? snapshot.members.find(n => n !== snapshot.champion && n !== row.club)! :') },
  snapshotmoves: { file: 'lib/soccerCareerLeagueWorld.ts', red: ['D1'], world: true, edit: swap('snapshot.movements = next.movements.map(', 'snapshot.movements = next.movements.slice(0, 0).map(') },
  /* the ladder band's own nudge, one edge each (C2's worked 7.5 and 6.3) */
  nudgeedge: { file: 'lib/soccerCareerLeague.ts', red: ['C2'], edit: swapLast(NUDGE, '  const nudge = rating > 7.5 ? -at(0.1) : rating < 6.3 ? at(0.1) : 0;\n') },
  nudgelow: { file: 'lib/soccerCareerLeague.ts', red: ['C2'], edit: swapLast(NUDGE, '  const nudge = rating >= 7.5 ? -at(0.1) : rating <= 6.3 ? at(0.1) : 0;\n') },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown SIM_LEAGUE_WORLD_CONTROL ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }
/* B6 (critic 3): every input the ENGINE hands drawLeagueFinish is recorded
   while a tap array is set, so the seed key contract is read off the engine's
   own calls and never off a key this harness built */
const TAP_ANCHOR = 'export function drawLeagueFinish(input: LeagueFinishInput): LeagueFinish {\n';
const tapLeague = s => {
  if (!s.includes(TAP_ANCHOR)) { console.error('soccerCareerLeague.ts has no drawLeagueFinish to tap'); process.exit(2); }
  return s.replace(TAP_ANCHOR, `${TAP_ANCHOR}  { const tap = (globalThis as { __leagueFinishTap?: LeagueFinishInput[] }).__leagueFinishTap; if (tap) tap.push(input); }\n`);
};
const transforms = { 'lib/soccerCareerLeague.ts': tapLeague };
if (CONTROL && !RECORD) {
  const c = CONTROLS[CONTROL];
  const prior = transforms[c.file];
  transforms[c.file] = prior ? s => prior(c.edit(s)) : c.edit;
  console.log(`CONTROL ${CONTROL}: ${c.file} patched in the bundle only; section ${c.red.join(' or ')} must go red`);
}
const t0 = Date.now();
const mod = await bundleCareerSources({ root: ROOT, tmpDir, extra: EXTRA, transforms });
const { engine, league: LG, season: SE, core: SC } = mod;
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
  /* null when repairCareer leaves the save's own bytes alone. Seeded: repairCareer
     fills a missing primeType off Math.random, and a read must not depend on
     where the stream happens to stand */
  const keep = Math.random;
  seedRandom(0x1100f);
  const fixed = JSON.stringify(engine.repairCareer(clone(state)));
  const repaired = fixed === JSON.stringify(state) ? null : fixed;
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
const SIM_PYRAMIDS = [
  ['Premier League', 'Championship', 3], ['Bundesliga', '2. Bundesliga', 2],
  ['Ligue 1', 'Ligue 2', 2], ['Serie A', 'Serie B', 3], ['La Liga', 'Segunda Division', 3],
];
const clubIdentity = name => (mod.rivalries.SC_CLUB_CANON[name] ?? name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const sameClubs = (a, b) => JSON.stringify(a.map(clubIdentity).sort()) === JSON.stringify(b.map(clubIdentity).sort());
const initialSimField = league => mod.lower?.CAREER_LOWER_CLUBS[league] ?? mod.pool.CAREER_LEAGUE_LADDER[league]?.flat() ?? [];
/* Expected future fields come from the saved row and its allowed club pool,
   independently of the Season Centre context being checked. */
function savedFutureSnapshot(row) {
  const held = row.leagueWorld;
  if (!held) return null;
  const pyramid = SIM_PYRAMIDS.find(([upper, lower]) => upper === held.league || lower === held.league);
  const members = held.members;
  const allowed = pyramid ? [...initialSimField(pyramid[0]), ...initialSimField(pyramid[1])].map(clubIdentity) : [];
  if (row.type !== 'playing' || row.year < 2026 || !pyramid || !Array.isArray(members)
    || members.length !== initialSimField(held.league).length || members.some(n => typeof n !== 'string' || !n.trim() || !allowed.includes(clubIdentity(n)))
    || new Set(members.map(clubIdentity)).size !== members.length || !members.some(n => clubIdentity(n) === clubIdentity(row.club))
    || !members.includes(held.champion) || (row.leagueSize !== undefined && row.leagueSize !== members.length)
    || !['simulated', 'simulated-partial'].includes(held.simulation)) throw new Error(`${row.club} ${row.year}: malformed saved simulated league field`);
  return held;
}
function snapshotContextErrors(row, held, m) {
  const errors = [];
  const names = new Set([row.club, ...m.ctx.rivals, ...m.ctx.named, ...(m.ctx.champion ? [m.ctx.champion] : [])].map(clubIdentity));
  if (m.ctx.league?.key !== held.league || names.size !== held.members.length || held.members.some(n => !names.has(clubIdentity(n)))) errors.push('the displayed division or field differs from its saved snapshot');
  const champion = m.finish?.finish === 1 ? null : held.champion;
  if (m.ctx.champion !== champion) errors.push(`the context champion is ${m.ctx.champion}, saved ${champion}`);
  return errors;
}
function snapshotTableErrors(row, held, table) {
  const errors = [];
  if (!table.labels.every(l => l.named) || !sameClubs(table.labels.map(l => l.name), held.members)) errors.push('the drawn table differs from the saved field');
  if (clubIdentity(table.top.name) !== clubIdentity(held.champion)) errors.push(`the drawn champion is ${table.top.name}, saved ${held.champion}`);
  if (held.movements) {
    const [upper, lower, count] = SIM_PYRAMIDS.find(([a, b]) => a === held.league || b === held.league);
    const promoted = held.league === lower;
    const expected = promoted ? table.order.slice(0, count) : table.order.slice(-count);
    const moves = held.movements.filter(m => m.from === held.league);
    const kind = promoted ? 'promoted' : 'relegated';
    const to = promoted ? upper : lower;
    if (!sameClubs(moves.map(m => m.club), expected) || moves.some(m => m.kind !== kind || m.to !== to)) errors.push('saved movement differs from the final displayed places');
    const own = expected.some(n => clubIdentity(n) === clubIdentity(row.club));
    const movement = held.movement;
    if (own ? !movement || clubIdentity(movement.club) !== clubIdentity(row.club) || movement.from !== held.league || movement.to !== to || movement.kind !== kind : !!movement) errors.push('the saved player club movement differs from its final place');
  }
  return errors;
}
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
/* D1 (review fix): the table as the PAGE draws it. measureSeason counts the
   names a season could print; four leagues passed that at 18 of 18 while
   their drawn table read "another club" in 1st place and left a real club
   off, because the top place was the world's champion or nobody. This derives
   the season exactly as the Season Centre does (deriveSeason, then the final
   standings) and hands back its labels and the row on top. Up to D1_DRAWN
   tables a league are drawn, the first ones the careers reach. */
const D1_DRAWN = Number(process.env.D1_DRAWN || 300);
/* The fewest tables a league must have had drawn, and the fewest of them in
   a season he did not win (the ones whose top place is somebody else's), so
   the label checks cannot pass on nothing. MEASURED 2026-10-08, 300 careers a
   nation, seed sets 0, 1 and 2: seven of the eight leagues reach the cap of
   300 (930 to 3,939 tables each; the Primeira Liga drew 298 in set 2, two
   seasons the Season Centre could not derive), 221 to 294 of them not his
   title. The 2. Bundesliga is the thin one, a second flight few careers
   pass through: 110, 168 and 135 tables, 106, 164 and 130 not his title.
   Each floor is that league's lowest count minus its spread of 58. Scaled
   by CAREERS / 300. */
const D1_DRAWN_FLOOR = { tables: 52, open: 48 };
function drawnTable(row, ctx) {
  const keep = Math.random;
  Math.random = () => { throw new Error('Math.random called while drawing a season'); };
  try {
    const d = SC.deriveSeason(SE.SOCCER, row, ctx);
    if (!d || d.mode !== 'table') return null;
    const final = SC.tableAt(d, d.rounds.length);
    return { labels: d.labels, top: d.labels[final[0].slot], order: final.map(r => d.labels[r.slot].name) };
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
      const tap = globalThis.__leagueFinishTap;
      while (!s.retired && guard++ < 140) {
        if (tap) tap.length = 0;
        s = careerStep(engine, s, POOL);
        if (s.seasons.length > rows) {
          rows = s.seasons.length;
          const row = s.seasons[rows - 1];
          /* the one finish the engine drew in this step is this row's (B6) */
          if (row.type === 'playing' && row.year >= 2026 && row.apps > 0 && !row.injurySevere) onSeason(s, row, nat, tap && tap.length === 1 ? tap[0] : null);
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
  playWorld(seedset, careers, (career, row, nat, input) => {
    const m = measureSeason(career, row);
    addSeason(out.overall, m);
    addSeason(out.nations[nat] ??= tally(), m);
    addSeason(out.leagues[todayLeague(row.club) || '(none)'] ??= tally(), m);
    if (onEach) onEach(career, row, m, input);
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
  if (CONTROL) {
    const want = CONTROLS[CONTROL].red;
    const fired = want.every(s => red.has(s));
    console.log(fired
      ? `simCareerLeagueWorld control ${CONTROL}: section ${want.join(' and ')} went red as it must (${failures} failures)`
      : `simCareerLeagueWorld control ${CONTROL}: DID NOT FIRE. Section ${want.filter(s => !red.has(s)).join(' and ')} stayed green (red: ${[...red].sort().join(', ') || 'none'})`);
    process.exit(fired ? 0 : 1);
  }
  console.log(failures ? `simCareerLeagueWorld: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}` : `simCareerLeagueWorld: all sections green (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(failures ? 1 : 0);
}
const GENERATED = POOL.slice(HAND.length);
const BIG_FIVE = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);
const LADDER = mod.pool.CAREER_LEAGUE_LADDER;
const WORLD = readJson(path.join(DATA, 'soccerCareerFacts.json')).leagueWorld;

/* A fictional saved season whose champion also has a fixed derby slot.
   Context roles overlap; the actual table must still name each club once. */
head('D1', 'SAVED RIVAL CHAMPION: context roles overlap, table clubs do not');
{
  const row = { ...seasonRow(2026, 3), club: 'Everton', leagueApps: 34, leagueFinish: 5, leagueSize: 20,
    derbies: [{ rival: 'Liverpool', name: 'Merseyside derby', kind: 'derby', meetings: [
      { home: true, gf: 0, ga: 0, played: true, goals: 0 }, { home: false, gf: 0, ga: 0, played: true, goals: 0 },
    ] }], leagueWorld: { league: 'Premier League', members: [...initialSimField('Premier League')], champion: 'Liverpool', simulation: 'simulated' } };
  const bytes = JSON.stringify(row);
  const held = savedFutureSnapshot(row);
  const m = measureSeason({ playerName: 'Saved rival champion probe', position: 'CM', seasons: [row], awards: [] }, row);
  ok(m.ctx.rivals.includes(held.champion), 'the saved champion must actually share the fixed rival role');
  const oldRoles = [row.club, ...m.ctx.rivals, ...m.ctx.named, ...(m.ctx.champion ? [m.ctx.champion] : [])];
  ok(oldRoles.length === held.members.length + 1 && !sameClubs(oldRoles, held.members), 'the copied old multiset predicate must reject this valid overlapping context');
  for (const error of snapshotContextErrors(row, held, m)) fail(`saved rival champion: ${error}`);
  const table = m.table ? drawnTable(row, m.ctx) : null;
  if (ok(!!table, 'the saved rival champion probe must derive an actual table')) {
    for (const error of snapshotTableErrors(row, held, table)) fail(`saved rival champion: ${error}`);
    ok(table.labels.filter(l => clubIdentity(l.name) === clubIdentity(held.champion)).length === 1, 'the champion rival must occupy exactly one displayed slot');
    const duplicate = { ...table, labels: table.labels.map((label, index) => index === 1 ? { ...label, name: row.club } : label) };
    ok(snapshotTableErrors(row, held, duplicate).includes('the drawn table differs from the saved field'), 'the copied duplicate table club must still be rejected');
  }
  ok(m.ctx.named.length > 0, 'the context omission controls need a named club');
  const missing = { ...m, ctx: { ...m.ctx, named: m.ctx.named.slice(1) } };
  ok(snapshotContextErrors(row, held, missing).some(error => error.includes('field differs')), 'the copied missing context club must still be rejected');
  const foreign = initialSimField('Championship').find(n => !held.members.some(member => clubIdentity(member) === clubIdentity(n)));
  ok(!!foreign, 'the foreign-club control needs an actual lower-division club outside this field');
  if (foreign) {
    const wrong = { ...m, ctx: { ...m.ctx, named: [foreign, ...m.ctx.named.slice(1)] } };
    ok(snapshotContextErrors(row, held, wrong).some(error => error.includes('field differs')), 'the copied foreign context club must still be rejected');
  }
  ok(JSON.stringify(row) === bytes, 'the overlap probe must preserve its complete saved row');
  console.log('  rival champion probe: actual context and table checked; old double-count defect reproduced; missing, foreign and duplicate club copies caught');
}

if (process.env.SNAPSHOT_PROBE_ONLY === '1') {
  head('D1', 'SNAPSHOT PROBE: three actual future seasons from the captured old save');
  seedRandom(0x1175e);
  const captured = readJson(F.saves).saves.find(save => save.id === 'ere').state;
  const bytes = JSON.stringify(captured);
  let s = engine.repairCareer(clone(captured));
  s = engine.acceptOffer(s, { club: clubRow('Freiburg'), contractYears: 5, wage: 20000, transferFee: 0 });
  const before = s.seasons.length;
  let guard = 0;
  const playable = row => row.type === 'playing' && row.apps > 0 && !row.injurySevere && row.leagueWorld;
  while (!s.retired && s.seasons.slice(before).filter(playable).length < 3 && guard++ < 200) s = stayStep(s);
  const rows = s.seasons.slice(before).filter(playable);
  ok(rows.length === 3, `only ${rows.length} playable simulated seasons were produced, three expected`);
  let tables = 0; let changed = 0; let moves = 0;
  for (const row of rows) {
    const held = savedFutureSnapshot(row);
    const m = measureSeason(s, row);
    const tag = `${row.club} ${row.year} (${held.league})`;
    if (!sameClubs(held.members, initialSimField(held.league))) changed += 1;
    moves += (held.movements ?? []).filter(move => move.from === held.league).length;
    ok(m.finish?.size === held.members.length && m.ctx.games === 2 * (held.members.length - 1), `${tag}: finish or calendar differs from the saved size`);
    for (const error of snapshotContextErrors(row, held, m)) fail(`${tag}: ${error}`);
    const table = m.table ? drawnTable(row, m.ctx) : null;
    if (ok(!!table, `${tag}: no table was derived for the probe`)) {
      tables += 1;
      for (const error of snapshotTableErrors(row, held, table)) fail(`${tag}: ${error}`);
    }
  }
  ok(changed > 0, 'the probe never reached a field changed by promotion or relegation');
  ok(JSON.stringify(captured) === bytes, 'playing a cloned fixture changed the captured old save');
  const played = s.seasons.slice(before).filter(row => row.type === 'playing');
  const severe = played.filter(row => row.injurySevere).length;
  console.log(`  snapshot probe: ${played.length} actual seasons played (${severe} severe-injury seasons), ${rows.length} playable snapshots, ${tables} drawn tables, ${changed} changed fields, ${moves} recorded league movements`);
  finish();
}

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

head('C2', 'BAND: the worked examples, exact, and every ladder club banded at its own place');
{
  /* [rank, n, size, rating, last] and the band a reviewer can check by hand
     (brief 3.5): the Primeira Liga's 4th of 18 on a 7.0, a 7.6 and a 6.0, its
     17th, the Segunda's 20th of 20 known clubs in a league of 22, and a group
     of eleven clubs the ladder cannot order, places 8 to 18 of 18 */
  const WORKED = [
    [[4, 18, 18, 7.0], [2, 7]], [[4, 18, 18, 7.6], [2, 5]], [[4, 18, 18, 6.0], [3, 9]],
    [[17, 18, 18, 7.0], [14, 18]], [[20, 20, 22, 7.0], [19, 22]], [[8, 18, 18, 7.0, 18], [5, 18]],
    [[1, 18, 18, 7.0], [2, 4]], [[1, 1, 1, 7.0], [1, 1]],
    /* review fix: the nudge's two edges on the LADDER's own copy of it.
       Ratings are one decimal and both values are common: a 7.5 is a great
       season (a tenth of the table up), a 6.3 is not a poor one (the band of
       a 7.0), and the tenth on either side says which way each edge faces.
       The absolute band's copy is held by the recorded cross; this one was
       only ever worked at 7.0, 7.6 and 6.0 (controls nudgeedge, nudgelow). */
    [[4, 18, 18, 7.5], [2, 5]], [[4, 18, 18, 7.4], [2, 7]], [[4, 18, 18, 6.3], [2, 7]], [[4, 18, 18, 6.2], [3, 9]],
    [[12, 24, 24, 7.5], [6, 14]], [[12, 24, 24, 6.3], [8, 16]], [[12, 24, 24, 6.2], [10, 18]],
  ];
  for (const [args, want] of WORKED) {
    const got = LG.ladderBand(...args);
    ok(got[0] === want[0] && got[1] === want[1], `ladderBand(${args.join(', ')}) = ${got.join(' to ')}, ${want.join(' to ')} expected`);
  }
  for (const [key, want] of [['Probe|Braga|2027|30|7|4|7', 'Braga'], ['A|B|Braga|2027|30|7|4|7.25', 'Braga'], ['x', null], ['s17', null], ['a|b|c|d|e|f|g', null], ['Probe|Braga|2027|30|7|4|', null], ['Braga|2027|30|7|4|7', null]]) {
    ok(LG.seedKeyClub(key) === want, `seedKeyClub(${JSON.stringify(key)}) = ${LG.seedKeyClub(key)}, ${want} expected`);
  }
  let clubs = 0;
  for (const [label, groups] of Object.entries(LADDER)) {
    if (BIG_FIVE.has(label)) continue;
    const size = WORLD[label].size;
    const n = groups.flat().length;
    let before = 0;
    for (const g of groups) {
      for (const club of g) {
        clubs += 1;
        const got = LG.finishBandFor({ league: label, year: 2027, tier: 4, elite: false, rating: 7, leagueTitle: false, seedKey: crossKey('engine', club, 2027, 7) }, size);
        const want = LG.ladderBand(before + 1, n, size, 7, before + g.length);
        ok(got.by === 'ladder' && got.band[0] === want[0] && got.band[1] === want[1], `${club} (${label}): band ${got.band.join(' to ')} by ${got.by}, ${want.join(' to ')} by the ladder expected`);
      }
      before += g.length;
    }
  }
  ok(clubs > 250, `only ${clubs} ladder clubs outside the five big leagues`);
  console.log(`  ${WORKED.length} worked bands and 7 seed keys exact; ${clubs} clubs of ${Object.keys(LADDER).filter(l => !BIG_FIVE.has(l)).length} ladder leagues each banded at their own place`);
}

head('C3', 'BAND: every ladder club, five ratings, 200 engine shaped keys');
{
  const RATINGS = [5.9, 6.3, 7.0, 7.5, 8.4];
  let draws = 0; let bad = 0; let groupsSeen = 0;
  for (const [label, groups] of Object.entries(LADDER)) {
    if (BIG_FIVE.has(label)) continue;
    const size = WORLD[label].size;
    const sized = LG.leagueSizeFor(label, 2027) !== null;
    for (const g of groups) {
      if (g.length > 1) groupsSeen += 1;
      for (const rating of RATINGS) {
        const bands = new Set();
        for (const club of g) {
          for (let k = 0; k < 200; k += 1) {
            const input = { league: label, year: 2026 + (k % 30), tier: 1 + (k % 5), elite: false, rating, leagueTitle: false, seedKey: `Player ${k}|${club}|${2026 + (k % 30)}|${10 + (k % 29)}|${k % 31}|${k % 17}|${rating}` };
            const b = LG.finishBandFor(input, size);
            draws += 1;
            if (k === 0) bands.add(b.band.join());
            if (b.by !== 'ladder' || !(b.band[0] >= 2 && b.band[0] <= b.band[1] && b.band[1] <= size)) { bad += 1; if (bad <= 3) fail(`${club} (${label}) ${rating}: band ${b.band.join(' to ')} by ${b.by} in a league of ${size}`); }
            if (sized) {
              const d = LG.drawLeagueFinish(input);
              if (!(d.leagueSize === size && d.leagueFinish >= b.band[0] && d.leagueFinish <= b.band[1])) { bad += 1; if (bad <= 3) fail(`${club} (${label}) ${rating}: drew ${JSON.stringify(d)} outside ${b.band.join(' to ')}`); }
            }
          }
        }
        ok(bands.size === 1, `${label}: the clubs of one group (${g.slice(0, 3).join(', ')}) do not share a band at ${rating}`);
      }
    }
  }
  ok(bad === 0, `${bad} bands or draws outside their table`);
  ok(draws > 250000 && groupsSeen > 0, `only ${draws} bands and ${groupsSeen} groups of several`);
  console.log(`  ${draws} bands, every one from the ladder and inside 2 to the league's size; ${groupsSeen} groups the ladder cannot order, each sharing one band at every rating`);
}

/* ─── A. LEDGERS ─── */
head('A', 'LEDGERS: every league the pool reads is sized, odd or waiting with its reason');
{
  const FMT = mod.format;
  const DERBY = mod.derby;
  const ODD = mod.odd.ODD_FORMATS;
  const hosts = list => new Set((list ?? []).map(x => { try { return new URL(x.url).hostname.replace(/^www\./, ''); } catch { return ''; } }));
  const dated = list => (list ?? []).every(x => /^\d{4}-\d{2}-\d{2}$/.test(x.read ?? '') && typeof x.says === 'string' && x.says.length > 0);
  const YEARS = [2026, 2030, 2045];
  const readLabels = [...new Set(POOL_LEAGUES.map(id => POOL_LEAGUE_ROWS.find(r => r.id === id).label))];
  const status = { sized: [], odd: [], waiting: [] };
  for (const label of readLabels) {
    const w = WORLD[label];
    if (!ok(!!w, `${label}: no leagueWorld row in the facts file`)) continue;
    const size = LG.leagueSizeFor(label, 2026);
    const odd = ODD[label];
    const flat = (LADDER[label] ?? []).flat();
    /* A5: the ladder is the facts file's lineup, career spelling */
    ok(flat.length === w.members.length && w.members.every(n => flat.includes(n)), `${label}: its ladder (${flat.length}) is not the facts file's members (${w.members.length})`);
    ok(!(size !== null && odd), `${label}: both a size row and an odd format row`);
    if (BIG_FIVE.has(label)) { ok(size === w.size && flat.length === size, `${label}: size ${size}, the facts file ${w.size}, ladder ${flat.length}`); continue; }
    if (size !== null) {
      /* A1 */
      status.sized.push(`${label} ${size}`);
      ok(YEARS.every(y => LG.leagueSizeFor(label, y) === size), `${label}: its size is not ${size} in every season from 2026`);
      ok(YEARS.every(y => FMT.leagueFormatFor(label, y) !== null), `${label}: a size but no LEAGUE_FORMAT window over the same seasons`);
      ok(YEARS.every(y => DERBY.derbyMeetings(label, y) === 2), `${label}: a size but its derby cadence is not two meetings from 2026`);
      ok(w.shape === 'plain' && w.size === size && w.games === 2 * (size - 1), `${label}: the facts file says ${w.shape}, ${w.size} clubs, ${w.games} games; a size row needs plain, ${size} and ${2 * (size - 1)}`);
      ok(hosts(w.membership).size >= 2 && dated(w.membership), `${label}: its lineup is not read from two dated hosts`);
      ok(hosts(w.format).size >= 2 && dated(w.format), `${label}: its format is read from ${hosts(w.format).size} host(s), two wanted for a size row`);
      /* A4: the ladder is the whole league (pinned: the Segunda's 20 known clubs of 22) */
      const PINNED_SHORT = { 'Segunda Division': 20 };
      ok(flat.length === (PINNED_SHORT[label] ?? size), `${label}: ladder of ${flat.length} in a league of ${size}`);
    } else if (odd) {
      /* A2 */
      status.odd.push(`${label} ${odd[odd.length - 1].clubs}`);
      for (const win of odd) {
        for (const y of YEARS.filter(v => v >= win.from && (win.to === undefined || v <= win.to))) ok(FMT.leagueFormatFor(label, y) === null && LG.leagueSizeFor(label, y, true) === null, `${label} ${y}: an odd format and a size or a table format in the same season`);
        ok(w.shape === win.shape && w.size === win.clubs && w.games === win.games, `${label}: the odd row says ${win.shape}, ${win.clubs} clubs, ${win.games} games; the facts file ${w.shape}, ${w.size}, ${w.games}`);
        /* brief A2 (review fix): the games after the league divides too. The
           facts file states none today (no row's count was read from two
           hosts), so a number typed into a row with no fact behind it is red */
        ok(win.after === (w.after ?? null), `${label}: the odd row says ${win.after} games after it divides, the facts file ${w.after ?? 'states none'}`);
        ok(hosts(w.membership).size >= 2 && hosts(w.format).size >= 2 && dated(w.format), `${label}: an odd row needs its lineup and its format read from two dated hosts each`);
        ok(flat.length === win.clubs, `${label}: ladder of ${flat.length} in a league of ${win.clubs}`);
      }
    } else {
      /* A3: not silent. A league with neither row must be one whose format is not yet read from two hosts */
      status.waiting.push(`${label} (format from ${hosts(w.format).size} host${hosts(w.format).size === 1 ? '' : 's'})`);
      ok(hosts(w.format).size < 2, `${label}: its format is read from two hosts (${w.shape}) and it has neither a size row nor an odd row`);
      ok(YEARS.every(y => FMT.leagueFormatFor(label, y) === null), `${label}: a LEAGUE_FORMAT window with no size`);
    }
  }
  for (const label of Object.keys(ODD)) ok(readLabels.includes(label), `${label}: an odd format row for a league the pool does not read`);
  /* A6: the Championship's window moved out of the dugout's table changes no playing season before 2026 */
  let ledgerYears = 0;
  for (let y = 2004; y <= 2025; y += 1) if (ok(LG.ledgerLeague('Championship', y) !== null, `the league ledgers do not hold the Championship in ${y}`)) ledgerYears += 1;
  /* the held second flights keep a dugout size and nothing else */
  for (const id of Object.keys(HELD_LEAGUES)) {
    const label = POOL_LEAGUE_ROWS.find(r => r.id === id).label;
    ok(LG.leagueSizeFor(label, 2030) === null && FMT.leagueFormatFor(label, 2030) === null, `${label} is held, yet a player gets a size or a table there`);
    ok(LG.leagueSizeFor(label, 2030, true) === WORLD[label].size, `${label}: the dugout's size ${LG.leagueSizeFor(label, 2030, true)}, the facts file ${WORLD[label].size}`);
  }
  ok(status.sized.length >= 8, `only ${status.sized.length} leagues sized`);
  console.log(`  sized (a finish, a table): ${status.sized.join(', ')}`);
  console.log(`  odd (their real row count, no table): ${status.odd.join(', ') || 'none yet'}`);
  console.log(`  waiting, results only as on main: ${status.waiting.join(', ') || 'none'}`);
  console.log(`  held by the generator: ${Object.keys(HELD_LEAGUES).map(id => POOL_LEAGUE_ROWS.find(r => r.id === id).label).join(', ')}; the ledgers hold the Championship in ${ledgerYears} of 22 seasons from 2004`);
}

/* ─── E. OLD SAVES ─── */
head('E', 'OLD SAVES: seven saves recorded on main read the same, and play on');
{
  const recorded = readJson(F.saves).saves;
  const moved = [];
  for (const save of recorded) {
    const now = readSave(clone(save.state));
    /* E1: repairCareer leaves the same bytes */
    ok(now.repaired === save.main.repaired, `${save.id}: repairCareer no longer serialises this save as main did`);
    /* E2: every saved row reads the same finish, league and mode; games is the league's real count where it gained a size */
    ok(now.rows.length === save.main.rows.length, `${save.id}: ${now.rows.length} playing rows read, ${save.main.rows.length} recorded`);
    save.main.rows.forEach((was, i) => {
      const is = now.rows[i];
      if (!is) return;
      ok(JSON.stringify(is.finish) === JSON.stringify(was.finish) && is.mode === was.mode && is.why === was.why && is.league === was.league, `${save.id} ${was.year}: reads ${JSON.stringify(is)}, main read ${JSON.stringify(was)}`);
      const size = LG.leagueSizeFor(todayLeague(was.club), was.year);
      const wantGames = is.mode === 'table' ? 2 * (is.finish.size - 1) : (size !== null ? 2 * (size - 1) : 38);
      ok(is.games === wantGames, `${save.id} ${was.year}: ${is.games} games shown, ${wantGames} expected (main showed ${was.games})`);
      if (is.games !== was.games) moved.push(`${save.id} ${was.year} ${was.club}: ${was.games} to ${is.games}`);
    });
    /* the dugout rows saved on main print what they printed (the sentence around the table may now be the league's own) */
    save.main.dugout.forEach((was, i) => {
      const is = now.dugout[i];
      ok(!!is && is.leagueSize === was.leagueSize && is.sizeVerified === was.sizeVerified && is.result === was.result && is.header === was.header, `${save.id} dugout season ${i + 1}: reads ${JSON.stringify(is)}, main read ${JSON.stringify(was)}`);
    });
    /* E3: three more seasons without a throw */
    seedRandom(0x1100e + recorded.indexOf(save));
    let s = clone(save.state);
    const before = s.seasons.length + (s.managerState?.seasonResults?.length ?? 0);
    try {
      if (save.kind === 'manager') { for (let y = 0; y < 3 && !s.managerState.unemployed; y += 1) s = engine.advanceManagerSeason(s, POOL); }
      else { let guard = 0; while (s.seasons.length < save.state.seasons.length + 3 && !s.retired && guard++ < 200) s = stayStep(s); }
    } catch (e) { fail(`${save.id}: playing on threw ${String(e.message).slice(0, 120)}`); }
    const after = s.seasons.length + (s.managerState?.seasonResults?.length ?? 0);
    ok(after > before, `${save.id}: no season was added by playing on`);
    const fresh = s.seasons.slice(save.state.seasons.length).filter(r => r.type === 'playing' && r.apps > 0 && !r.injurySevere && r.club === save.club);
    const league = save.oldLabel ?? todayLeague(save.club);
    const sized = LG.leagueSizeFor(league, 2030);
    for (const r of fresh) {
      const f = LG.readLeagueFinish(r);
      const held = savedFutureSnapshot(r);
      const expectedLeague = held?.league ?? league;
      const expectedSize = held?.members.length ?? sized;
      ok(expectedSize === null ? (f === null || f.finish === 1) : (f !== null && f.size === expectedSize), `${save.id} ${r.year}: a new season in ${expectedLeague} holds ${JSON.stringify(f)}, a league of ${expectedSize ?? 'no verified size'}`);
      if (held) {
        const m = measureSeason(s, r);
        for (const error of snapshotContextErrors(r, held, m)) fail(`${save.id} ${r.year}: ${error}`);
        const table = m.table ? drawnTable(r, m.ctx) : null;
        if (table) for (const error of snapshotTableErrors(r, held, table)) fail(`${save.id} ${r.year}: ${error}`);
      }
    }
    if (save.kind === 'manager') {
      const rows = s.managerState.seasonResults.slice(save.state.managerState.seasonResults.length);
      const odd = mod.odd.oddFormatFor(save.league, 2032);
      const real = LG.leagueSizeFor(save.league, 2032, true);
      for (const r of rows.filter(x => x.league === save.league)) {
        if (real !== null) ok(r.sizeVerified === true && r.leagueSize === real, `${save.id}: a new ${save.league} season of ${r.leagueSize} rows, the league's size is ${real}`);
        else if (odd) ok(r.sizeVerified !== true && r.leagueSize === odd.clubs && !/ of \d| points/.test(r.result), `${save.id}: a new ${save.league} season of ${r.leagueSize} rows printing "${r.result.slice(0, 50)}", the odd ledger says ${odd.clubs} rows and no number`);
      }
    }
  }
  /* critic 6: a relabelled club whose old and new league share a size places no finish in a league */
  const her = recorded.find(x => x.id === 'her');
  ok(her.main.rows.every(r => r.finish && r.league === null && r.mode === 'results'), 'the recorded Hertha Berlin save (label "Bundesliga") did not read as a finish in no league on main');
  for (const [club, old] of Object.entries(LG.RELABELLED_1037)) {
    const today = todayLeague(club);
    ok(today !== '' && today !== old, `${club}: RELABELLED_1037 says it left ${old}, the list has it in ${today || 'no league'}`);
    const a = LG.leagueSizeFor(old, 2030); const b = LG.leagueSizeFor(today, 2030);
    const placed = LG.finishLeague({ name: club, league: today }, 2030, b);
    ok(a !== null && a === b ? placed === null : true, `${club}: ${old} and ${today} are both ${a} clubs in 2030, yet a saved finish is placed in ${today}`);
  }
  ok(recorded.length === 7, `${recorded.length} recorded saves, 7 expected`);
  console.log(`  ${recorded.length} saves: repairCareer byte equal, every saved row reads the finish, league and mode main read; matchdays moved to the league's real count on ${moved.length} rows (${moved.join('; ') || 'none'}); each played three more seasons`);
}

/* ─── C4. BAND: the outcome, not the mechanism ───
   Per sized ladder league: 400 engine shaped keys a club on a 7.0 season,
   the mean finish of each club, and Spearman's rank correlation between the
   ladder's place and that mean. Over the clubs the ladder can ORDER only
   (critic 2: a group of several has no place of its own), and again over the
   tier 4 clubs among them, the group the absolute band flattened into one
   bottom third. Three key sets. A league that can order fewer than four
   clubs (or fewer than four tier 4 clubs) is printed and not measured.
   MEASURED 2026-10-08 on the merged tree, three key sets, eight leagues:
   1.000 to three places in every league and key set, over the ordered clubs
   (5 to 19 a league) and over the tier 4 clubs alone (the Championship 17,
   the Brasileirao 10, the Primeira Liga 5, the 2. Bundesliga 5). The spread
   is nil, so the floor is not set at the measurement: two neighbours on a
   24 club ladder can scale to the same place and then only noise orders
   their means, which may cost a hundredth. 0.97 leaves that room; the flat
   band (control flatband) reads about 0 on the tier 4 clubs. */
const C4_FLOOR = { all: 0.97, tier4: 0.97 };
head('C4', 'BAND: a higher place on the ladder finishes higher, tier 4 clubs included');
{
  const tierOf = new Map(POOL.map(c => [c.name, c.tier]));
  const ranks = xs => { const o = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j += 1; for (let k = i; k <= j; k += 1) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  const pearson = (a, b) => { const n = a.length; const ma = a.reduce((s, v) => s + v, 0) / n; const mb = b.reduce((s, v) => s + v, 0) / n; let sab = 0; let saa = 0; let sbb = 0; for (let i = 0; i < n; i += 1) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0; };
  const spearman = (a, b) => pearson(ranks(a), ranks(b));
  const low = { all: 1, tier4: 1 }; const high = { all: -1, tier4: -1 };
  let measured = 0; let measured4 = 0;
  const lines = [];
  for (const [label, groups] of Object.entries(LADDER)) {
    if (BIG_FIVE.has(label) || LG.leagueSizeFor(label, 2027) === null) continue;
    const ordered = [];
    let before = 0;
    for (const g of groups) { if (g.length === 1) ordered.push({ club: g[0], rank: before + 1 }); before += g.length; }
    const four = ordered.filter(c => tierOf.get(c.club) === 4);
    const rho = { all: [], tier4: [] };
    for (const ks of [0, 1, 2]) {
      const mean = new Map();
      for (const c of ordered) {
        let sum = 0;
        for (let k = 0; k < 400; k += 1) {
          const year = 2026 + (k % 20);
          sum += LG.drawLeagueFinish({ league: label, year, tier: tierOf.get(c.club), elite: false, rating: 7, leagueTitle: false, seedKey: `Band ${ks}.${k}|${c.club}|${year}|${10 + (k % 29)}|${k % 31}|${k % 17}|7` }).leagueFinish;
        }
        mean.set(c.club, sum / 400);
      }
      if (ordered.length >= 4) rho.all.push(spearman(ordered.map(c => c.rank), ordered.map(c => mean.get(c.club))));
      if (four.length >= 4) rho.tier4.push(spearman(four.map(c => c.rank), four.map(c => mean.get(c.club))));
    }
    for (const k of ['all', 'tier4']) for (const v of rho[k]) { low[k] = Math.min(low[k], v); high[k] = Math.max(high[k], v); }
    if (rho.all.length) measured += 1;
    if (rho.tier4.length) measured4 += 1;
    lines.push(`${label}: ${ordered.length} of ${before} ordered${rho.all.length ? `, rho ${Math.min(...rho.all).toFixed(3)} to ${Math.max(...rho.all).toFixed(3)}` : ' (too few to measure)'}; tier 4 ${four.length}${rho.tier4.length ? `, rho ${Math.min(...rho.tier4).toFixed(3)} to ${Math.max(...rho.tier4).toFixed(3)}` : ' (too few to measure)'}`);
  }
  for (const l of lines) console.log(`  ${l}`);
  ok(measured >= 4, `only ${measured} leagues could be measured`);
  ok(measured4 >= 1, 'no league has four tier 4 clubs the ladder can order, so the flattened group is not measured');
  ok(low.all >= C4_FLOOR.all, `the lowest correlation over a league's ordered clubs is ${low.all.toFixed(3)}, floor ${C4_FLOOR.all}`);
  if (measured4) ok(low.tier4 >= C4_FLOOR.tier4, `the lowest correlation over a league's tier 4 clubs is ${low.tier4.toFixed(3)}, floor ${C4_FLOOR.tier4}`);
  console.log(`  ${measured} leagues measured over three key sets: lowest ${low.all.toFixed(3)}, highest ${high.all.toFixed(3)} (floor ${C4_FLOOR.all}); tier 4 alone in ${measured4}: lowest ${low.tier4.toFixed(3)}, highest ${high.tier4.toFixed(3)} (floor ${C4_FLOOR.tier4})`);
}

/* ─── D. WORLD, and B6 read off the same careers ───
   CAREERS careers a nation (300 unless CAREERS says otherwise), one seed set
   a run (SEEDSET 0, 1 or 2), against what main played on the same seeds
   (careerLeagueWorldBaseline1100.json). WORLD=0 skips it; a control that
   does not need the careers skips it too.
   MEASURED 2026-10-08 on the merged tree, 300 careers a nation, seed sets
   0, 1 and 2 (about 64,700 seasons each, 100 s a set on a CI runner), main
   beside the branch:
     a league position   main 41.0, 41.1, 41.2 %   now 68.5, 69.0, 68.6 %
     a table             main 34.1, 34.4, 34.5 %   now 65.2, 65.7, 65.4 %
     named table rows    main 24.0, 23.9, 24.1 %   now 65.2, 65.7, 65.4 %
   Each floor is the lowest of the three minus the larger of two points and
   their spread. Per nation, the table share of the six whose top flight
   became plain (3,770 to 3,825 seasons each): Netherlands 77.2, 77.1, 78.4;
   Portugal 77.6, 82.9, 81.0; Turkey 78.4, 81.7, 77.6; Belgium 73.0, 79.1,
   78.1; Brazil 77.9, 78.9, 78.1; Saudi Arabia 82.9, 79.9, 80.9 (main: 17.7
   to 24.5 in all six). Fewer CAREERS means more noise than these floors
   allow for: they are set for the default 300.
   "Named table rows" is the count of names a season COULD print (his club,
   the rivals, the champion and the league's named clubs), the measure main
   was recorded with, so D2 compares like with like. It is not the table as
   drawn: D1 derives up to D1_DRAWN tables a league the way the page does and
   reads their labels (review fix; four leagues read 18 of 18 by the count
   while their drawn table had "another club" in 1st place). */
const WORLD_FLOOR = { finish: 0.665, table: 0.632, named: 0.632 };
const NATION_FLOOR = { Netherlands: 0.751, Portugal: 0.723, Turkey: 0.735, Belgium: 0.669, Brazil: 0.759, 'Saudi Arabia': 0.769 };
const RUN_WORLD = process.env.WORLD !== '0' && (!CONTROL || CONTROLS[CONTROL].world === true);
if (RUN_WORLD) {
  const ODD = mod.odd.ODD_FORMATS;
  const base = readJson(F.baseline);
  const shape = { five: tally(), plain: tally(), odd: tally(), waiting: tally(), other: tally() };
  const d1 = { sized: 0, tables: 0, bad: [], drawn: {} };
  const b6 = { seen: 0, ladder: 0, bad: [], fallback: new Map() };
  const spread = { five: { n: 0, sum: 0, top: 0 }, plain: { n: 0, sum: 0, top: 0 } };
  const tierOf = new Map(POOL.map(c => [c.name, c.tier]));
  const generated = new Set(GENERATED.map(c => c.name));
  globalThis.__leagueFinishTap = [];
  const tw = Date.now();
  const run = worldRun(SEEDSET, CAREERS, NATIONS, (career, row, m, input) => {
    const held = savedFutureSnapshot(row);
    const L = held?.league ?? todayLeague(row.club);
    const size = held?.members.length ?? (L ? LG.leagueSizeFor(L, row.year) : null);
    addSeason(shape[BIG_FIVE.has(L) ? 'five' : size !== null ? 'plain' : ODD[L] ? 'odd' : LADDER[L] ? 'waiting' : 'other'], m);
    /* D1 */
    if (size !== null) {
      d1.sized += 1;
      const f = m.finish;
      if (held) for (const error of snapshotContextErrors(row, held, m)) d1.bad.push(`${row.club} ${row.year} (${L}): ${error}`);
      if (!(f && f.size === size && f.finish >= 1 && f.finish <= size)) d1.bad.push(`${row.club} ${row.year} (${L}, ${size} clubs) holds ${JSON.stringify(f)}`);
      else if (m.ctx.games !== 2 * (size - 1)) d1.bad.push(`${row.club} ${row.year} (${L}): ${m.ctx.games} matchdays, ${2 * (size - 1)} wanted`);
      if (m.table && (held || LADDER[L]) && (held || !BIG_FIVE.has(L))) {
        if (!BIG_FIVE.has(L)) d1.tables += 1;
        const clubsOf = held?.members ?? LADDER[L].flat();
        const want = Math.min(size, clubsOf.length);
        if (m.namedRows !== want) d1.bad.push(`${row.club} ${row.year} (${L}): its table names ${m.namedRows} rows, ${want} wanted`);
        /* the page's own labels (review fix): the count above is the names
           the season COULD print; this is the table as it is drawn */
        const seen = (d1.drawn[L] ??= { all: 0, n: 0, open: 0, none: 0 });
        seen.all += 1;
        if (seen.n + seen.none < D1_DRAWN) {
          const t = drawnTable(row, m.ctx);
          if (!t) seen.none += 1;
          else {
            seen.n += 1;
            if (!row.leagueTitle) seen.open += 1;
            if (held) for (const error of snapshotTableErrors(row, held, t)) d1.bad.push(`${row.club} ${row.year} (${L}): ${error}`);
            const shown = new Set(t.labels.filter(l => l.named).map(l => l.name));
            const unnamed = t.labels.length - shown.size;
            const missing = clubsOf.filter(n => !shown.has(n));
            if (t.labels.length !== size) d1.bad.push(`${row.club} ${row.year} (${L}): the drawn table has ${t.labels.length} rows, ${size} wanted`);
            else if (!t.top.named) d1.bad.push(`${row.club} ${row.year} (${L}): 1st place on the drawn table reads "${t.top.name}"`);
            else if (unnamed !== size - want) d1.bad.push(`${row.club} ${row.year} (${L}): the drawn table leaves ${unnamed} rows unnamed, ${size - want} allowed`);
            else if (clubsOf.length === size && missing.length) d1.bad.push(`${row.club} ${row.year} (${L}): ${missing.join(', ')} left off the drawn table`);
          }
        }
      }
      if (f && f.finish > 1 && tierOf.get(row.club) === 4 && generated.has(row.club)) {
        const s = spread[BIG_FIVE.has(L) ? 'five' : 'plain'];
        s.n += 1; s.sum += f.finish / size; if (f.finish <= size / 2) s.top += 1;
      }
    }
    /* B6: what the engine handed drawLeagueFinish for this very row */
    if (input && input.year >= 2026 && input.league !== null && LADDER[input.league] && !BIG_FIVE.has(input.league)) {
      b6.seen += 1;
      const by = LG.finishBandFor(input, LG.leagueSizeFor(input.league, input.year) ?? WORLD[input.league].size).by;
      const placed = LADDER[input.league].some(g => g.includes(row.club));
      if (LG.seedKeyClub(input.seedKey) !== row.club) b6.bad.push(`${row.club} ${row.year}: the engine's key ${JSON.stringify(input.seedKey)} parses to ${JSON.stringify(LG.seedKeyClub(input.seedKey))}`);
      else if (by === 'ladder') b6.ladder += 1;
      else if (!placed) b6.fallback.set(`${input.league}: ${row.club}`, (b6.fallback.get(`${input.league}: ${row.club}`) ?? 0) + 1);
      else b6.bad.push(`${row.club} ${row.year}: on the ${input.league} ladder, yet banded by the tier`);
    }
  });
  globalThis.__leagueFinishTap = undefined;
  const secs = ((Date.now() - tw) / 1000).toFixed(0);

  head('D1', 'WORLD: a season in a sized league always has its finish, its matchdays and a whole table');
  for (const b of d1.bad.slice(0, 8)) fail(b);
  ok(d1.bad.length === 0, `${d1.bad.length} seasons in a sized league broke a rule`);
  ok(d1.sized > 1000 * (CAREERS / 300) && d1.tables > 200 * (CAREERS / 300), `only ${d1.sized} seasons in a sized league and ${d1.tables} tables outside the five`);
  /* every sized ladder league outside the five must have had tables DRAWN,
     seasons he did not win among them (those are the ones whose top place
     is somebody else's), or the label checks above passed on nothing */
  const sizedLadder = Object.keys(LADDER).filter(l => !BIG_FIVE.has(l) && LG.leagueSizeFor(l, 2027) !== null);
  const drawnAll = Object.values(d1.drawn).reduce((a, t) => a + t.n, 0);
  const blank = { all: 0, n: 0, open: 0, none: 0 };
  for (const l of sizedLadder) {
    const t = d1.drawn[l] ?? blank;
    /* the floors are for the default cap: a smaller D1_DRAWN (a quick local
       run) can only ask that every league was drawn at all */
    if (D1_DRAWN >= 300) ok(t.n >= D1_DRAWN_FLOOR.tables * (CAREERS / 300) && t.open >= D1_DRAWN_FLOOR.open * (CAREERS / 300), `${l}: only ${t.n} tables drawn, ${t.open} of them seasons he did not win (floors ${D1_DRAWN_FLOOR.tables} and ${D1_DRAWN_FLOOR.open} at 300 careers)`);
    else ok(t.n > 0 && t.open > 0, `${l}: ${t.n} tables drawn, ${t.open} of them seasons he did not win`);
  }
  console.log(`  seed set ${SEEDSET}, ${CAREERS} careers x ${NATIONS.length} nations in ${secs} s: ${run.overall.seasons} seasons, ${d1.sized} in a sized league (a finish from 1 to the size, 2 x (size - 1) matchdays), ${d1.tables} tables in a ladder league outside the five whose names cover every row`);
  console.log(`  drawn as the page draws them (up to ${D1_DRAWN} a league): ${drawnAll} tables, every row named, 1st place named, no club of the league left off: ${sizedLadder.map(l => { const t = d1.drawn[l] ?? blank; return `${l} ${t.n} of ${t.all} (${t.open} not his title${t.none ? `, ${t.none} the Season Centre could not derive` : ''})`; }).join('; ')}`);

  head('D2', "WORLD: more seasons end with a league position and a real table than on main");
  const was = base.world[SEEDSET] ? shares(base.world[SEEDSET].overall) : null;
  const now = shares(run.overall);
  if (ok(!!was, `main recorded no seed set ${SEEDSET}`)) {
    for (const [k, word] of [['finishShare', 'finish'], ['tableShare', 'table'], ['namedShare', 'named']]) {
      ok(now[k] > was[k], `${word}: ${pct(now[k])} on the branch does not beat main's ${pct(was[k])}`);
      ok(now[k] >= WORLD_FLOOR[word], `${word}: ${pct(now[k])}, floor ${pct(WORLD_FLOOR[word])}`);
    }
    console.log(`  seasons holding a league position: main ${pct(was.finishShare)}, now ${pct(now.finishShare)}; with a table in Week by week: main ${pct(was.tableShare)}, now ${pct(now.tableShare)}; share of table rows carrying a name: main ${pct(was.namedShare)}, now ${pct(now.namedShare)}`);
    for (const nat of Object.keys(NATION_FLOOR)) {
      const t = run.nations[nat]; const m = base.world[SEEDSET].nations[nat];
      if (!t || t.seasons < 1000 * (CAREERS / 300)) { console.log(`  ${nat}: ${t ? t.seasons : 0} seasons, too few for a floor`); continue; }
      const s = shares(t); const sm = shares(m);
      ok(s.finishShare > sm.finishShare && s.tableShare > sm.tableShare, `${nat}: finish ${pct(s.finishShare)} and table ${pct(s.tableShare)} do not beat main's ${pct(sm.finishShare)} and ${pct(sm.tableShare)}`);
      ok(s.tableShare >= NATION_FLOOR[nat], `${nat}: table share ${pct(s.tableShare)}, floor ${pct(NATION_FLOOR[nat])}`);
      console.log(`  ${nat}: ${t.seasons} seasons; position main ${pct(sm.finishShare)}, now ${pct(s.finishShare)}; table main ${pct(sm.tableShare)}, now ${pct(s.tableShare)} (floor ${pct(NATION_FLOOR[nat])})`);
    }
  }
  console.log(`  where the seasons are: ${Object.entries(shape).map(([k, t]) => `${{ five: 'big five', plain: 'plain and sized', odd: 'odd ledger', waiting: 'a pool league waiting for its format', other: 'not a Club Manager league' }[k]} ${t.seasons} (${pct(t.seasons / run.overall.seasons)}; position ${pct(shares(t).finishShare)}, table ${pct(shares(t).tableShare)})`).join('; ')}`);
  console.log(`  critic 12, printed and not asserted: a tier 4 pool club's finish as a share of the table, titles apart: in the five (the tier's band) mean ${spread.five.n ? (spread.five.sum / spread.five.n).toFixed(3) : 'none'} over ${spread.five.n}, ${spread.five.n ? pct(spread.five.top / spread.five.n) : 'none'} in the top half; in a ladder league mean ${spread.plain.n ? (spread.plain.sum / spread.plain.n).toFixed(3) : 'none'} over ${spread.plain.n}, ${spread.plain.n ? pct(spread.plain.top / spread.plain.n) : 'none'} in the top half`);

  head('B6', "POOL: the engine's own seed key carries the club, and every ladder club is banded by its ladder");
  for (const b of b6.bad.slice(0, 6)) fail(b);
  ok(b6.bad.length === 0, `${b6.bad.length} engine calls whose key does not carry the row's club, or a ladder club banded by its tier`);
  ok(b6.seen > 1000 * (CAREERS / 300) && b6.ladder > 0, `only ${b6.seen} engine calls seen in a ladder league outside the five`);
  console.log(`  ${b6.seen} finishes the engine drew from 2026 in a ladder league outside the five: ${b6.ladder} banded by the ladder; ${[...b6.fallback.values()].reduce((a, b) => a + b, 0)} by the tier for a club the list does not place in that league${b6.fallback.size ? ` (${[...b6.fallback].slice(0, 8).map(([k, v]) => `${k} x${v}`).join(', ')})` : ''}`);
}

/* ─── D3. The dugout ───
   The same 480 dugout careers main's rates were recorded on (hand clubs
   only, so both trees start at the same clubs). Exact: a row in a sized
   league is verified at that size and prints " of N"; a row in an odd league
   has the ledger's number of rows, no verified size, no position out of N
   and no points, and the words around its table are the league's own
   sentence. The title, top two, bottom three and sack rates by table size
   are PRINTED beside main's, never asserted: no rule changed, the tables
   got their real size (critic 17: read the 10 and 12 row leagues here). */
if (!CONTROL) {
  head('D3', 'DUGOUT: a sized league prints its position, an odd league its real number of rows and no number');
  const ODD = mod.odd.ODD_FORMATS;
  const seen = { sized: 0, odd: 0, other: 0 };
  const rates = dugoutRates(row => {
    if (!row.league) { seen.other += 1; return; }
    const size = LG.leagueSizeFor(row.league, 2032, true);
    const odd = mod.odd.oddFormatFor(row.league, 2032);
    if (size !== null) {
      seen.sized += 1;
      ok(row.sizeVerified === true && row.leagueSize === size && row.result.includes(` of ${size}`), `${row.league}: a dugout season of ${row.leagueSize} rows${row.sizeVerified ? ' (verified)' : ''} printing "${row.result.slice(0, 60)}", the league has ${size}`);
    } else if (odd) {
      seen.odd += 1;
      const w = LG.dugoutTableWords(row);
      ok(row.sizeVerified !== true && row.leagueSize === odd.clubs && !/ of \d| points/.test(row.result), `${row.league}: a dugout season of ${row.leagueSize} rows printing "${row.result.slice(0, 60)}", the odd ledger says ${odd.clubs} rows and no number`);
      ok(typeof w.orderNote === 'string' && w.orderNote.includes(odd.words) && !/we don't know how many/.test(w.orderNote), `${row.league}: the words around its table are "${w.orderNote}"`);
    } else seen.other += 1;
  });
  ok(seen.sized > 500 && seen.odd > 20, `only ${seen.sized} seasons in a sized league and ${seen.odd} in an odd one`);
  console.log(`  ${seen.sized} dugout seasons in a sized league, ${seen.odd} in an odd league (${Object.keys(ODD).join(', ')}), ${seen.other} elsewhere`);
  const main = readJson(F.baseline).dugout.bySize;
  const rate = (t, k) => (t && t.seasons ? `${((t[k] / t.seasons) * 100).toFixed(1)}%` : 'none');
  for (const n of [...new Set([...Object.keys(main), ...Object.keys(rates.bySize)])].map(Number).sort((a, b) => a - b)) {
    const a = main[n]; const b = rates.bySize[n];
    console.log(`  a table of ${n}: main ${a ? a.seasons : 0} seasons (title ${rate(a, 'title')}, top two ${rate(a, 'topTwo')}, bottom three ${rate(a, 'bottomThree')}, sacked ${rate(a, 'sack')}); now ${b ? b.seasons : 0} (title ${rate(b, 'title')}, top two ${rate(b, 'topTwo')}, bottom three ${rate(b, 'bottomThree')}, sacked ${rate(b, 'sack')})`);
  }
}

finish();
