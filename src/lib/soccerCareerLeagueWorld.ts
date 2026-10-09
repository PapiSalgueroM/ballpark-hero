/* Round 1175: a saved, fictional league future. Existing historical ledgers
   stay untouched. Each playing row holds its own field and champion, so a
   later promotion cannot rewrite an old season's opponents. No main RNG. */
import type { CareerState, ClubData, SeasonRecord } from './soccerCareerEngine';
import { CAREER_CLUB_POOL, CAREER_LEAGUE_LADDER } from '../data/soccerCareerClubPool';
import { CAREER_LOWER_CLUBS } from '../data/soccerCareerLowerClubs';
import { SC_CLUB_CANON } from '../data/clubRivalries';
import { keyedRng } from './keyedRng';

export interface LeagueMovement { club: string; from: string; to: string; kind: 'promoted' | 'relegated' }
export interface LeagueWorldSeason {
  league: string;
  members: string[];
  champion: string;
  simulation: 'simulated' | 'simulated-partial';
  movement?: LeagueMovement;
  /** Release AQ: the clubs that LEFT his division at the end of this season
   *  (two or three), and nothing else. Present once the season is settled.
   *  The whole world's moves, about 26 a season, were written on every row
   *  and read by nothing, which alone added 34 to 40 KB to a long save. */
  movements?: LeagueMovement[];
}
export interface CareerLeagueWorld { year: number; leagues: Record<string, string[]>; movements: LeagueMovement[] }

/** Each count is also Club Manager's LEAGUE_RULES drop for the same league
 *  (src/lib/clubManager.ts); src/test/soccerCareerLeagueWorld.test.ts holds
 *  the two together. */
export const PYRAMIDS = [
  { upper: 'Premier League', lower: 'Championship', count: 3 },
  { upper: 'Bundesliga', lower: '2. Bundesliga', count: 2 },
  { upper: 'Ligue 1', lower: 'Ligue 2', count: 2 },
  { upper: 'Serie A', lower: 'Serie B', count: 3 },
  { upper: 'La Liga', lower: 'Segunda Division', count: 3 },
];
const clubKey = (name: string) => (SC_CLUB_CANON[name] ?? name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const same = (a: string, b: string) => clubKey(a) === clubKey(b);
/** The one spelling a club is compared by here (alias, accents and case gone). */
export function clubKeyOf(name: string): string { return clubKey(name); }
const initialMembers = (league: string) => [...(CAREER_LOWER_CLUBS[league] ?? CAREER_LEAGUE_LADDER[league]?.flat() ?? [])];
const pyramidFor = (league: string) => PYRAMIDS.find(p => p.upper === league || p.lower === league);

/** Absent or malformed legacy data never becomes a claim about a season. */
export function readLeagueWorldSeason(row: SeasonRecord): LeagueWorldSeason | null {
  const held = row.leagueWorld;
  if (!held || row.year < 2026 || row.type !== 'playing' || !pyramidFor(held.league)) return null;
  const members = held.members;
  if (!Array.isArray(members) || members.length !== initialMembers(held.league).length || members.some(n => typeof n !== 'string' || !n.trim())) return null;
  const pyramid = pyramidFor(held.league)!;
  const allowed = [...initialMembers(pyramid.upper), ...initialMembers(pyramid.lower)].map(clubKey);
  if (members.some(n => !allowed.includes(clubKey(n)))) return null;
  if (new Set(members.map(clubKey)).size !== members.length || !members.some(n => same(n, row.club)) || !members.includes(held.champion)) return null;
  if (row.leagueSize !== undefined && row.leagueSize !== members.length) return null;
  if (held.simulation !== 'simulated' && held.simulation !== 'simulated-partial') return null;
  return held;
}

function initialWorld(year: number): CareerLeagueWorld {
  const leagues: Record<string, string[]> = {};
  for (const p of PYRAMIDS) for (const league of [p.upper, p.lower]) leagues[league] = initialMembers(league);
  return { year, leagues, movements: [] };
}

/** Non-player tables use independent yearly form on the game's existing
 *  club tiers. This is simulation, never a predicted real league result. */
export function leagueWorldOrder(world: CareerLeagueWorld, league: string, playerName: string, clubs: ClubData[], row?: SeasonRecord): string[] {
  const members = world.leagues[league] ?? [];
  const tiers = new Map<string, number>();
  for (const c of clubs) {
    const key = clubKey(c.name);
    if (!tiers.has(key)) tiers.set(key, c.tier);
  }
  const form = members.map(name => {
    const tier = tiers.get(clubKey(name)) ?? 4;
    const rng = keyedRng(`${playerName}|${world.year}|${league}|${name}|league-form`);
    return { name, score: (5 - tier) * 0.8 + rng() * 4 };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).map(c => c.name);
  if (row && row.leagueFinish && members.some(n => same(n, row.club))) {
    const without = form.filter(n => !same(n, row.club));
    without.splice(Math.min(without.length, Math.max(0, row.leagueFinish - 1)), 0, members.find(n => same(n, row.club))!);
    return without;
  }
  return form;
}

/** Finish exactly once. A supplied order comes from the very final table
 *  Season Centre displays; all other leagues use the fictional world form. */
export function finishLeagueWorld(world: CareerLeagueWorld, playerName: string, clubs: ClubData[], played?: { league: string; order: string[] }): CareerLeagueWorld {
  const leagues = Object.fromEntries(Object.entries(world.leagues).map(([league, members]) => [league, [...members]]));
  const movements: LeagueMovement[] = [];
  const orderFor = (league: string) => {
    const supplied = played?.league === league ? played.order : null;
    const members = world.leagues[league];
    return supplied && supplied.length === members.length && new Set(supplied.map(clubKey)).size === members.length && supplied.every(n => members.some(m => same(m, n)))
      ? supplied.map(n => members.find(m => same(m, n))!) : leagueWorldOrder(world, league, playerName, clubs);
  };
  for (const p of PYRAMIDS) {
    const down = orderFor(p.upper).slice(-p.count);
    const up = orderFor(p.lower).slice(0, p.count);
    leagues[p.upper] = [...world.leagues[p.upper].filter(n => !down.includes(n)), ...up];
    leagues[p.lower] = [...world.leagues[p.lower].filter(n => !up.includes(n)), ...down];
    for (const club of down) movements.push({ club, from: p.upper, to: p.lower, kind: 'relegated' });
    for (const club of up) movements.push({ club, from: p.lower, to: p.upper, kind: 'promoted' });
  }
  return { year: world.year + 1, leagues, movements };
}

/** Old future saves start their own world at the next unplayed season.
 *  Historical seasons keep their existing ledgers and have no world field. */
export function leagueWorldForYear(career: CareerState, clubs: ClubData[], year: number): CareerLeagueWorld | null {
  return catchUpLeagueWorld(career, clubs, year);
}

/** Release AQ: a held world is read only when every division is whole. A
 *  damaged one used to be indexed as it stood and threw on every Next Season
 *  with no repair; now the career starts its world again from the real
 *  2026-27 field, the way a save from before the world does. */
function wholeWorld(world: CareerLeagueWorld | undefined): world is CareerLeagueWorld {
  if (!world || typeof world !== 'object' || !Number.isInteger(world.year) || !world.leagues || typeof world.leagues !== 'object') return false;
  return PYRAMIDS.every(p => [p.upper, p.lower].every(league => {
    const names = world.leagues[league];
    return Array.isArray(names) && names.length === initialMembers(league).length && names.every(n => typeof n === 'string' && !!n.trim());
  }));
}

/** A year with no played season behind it (a ban, a prison year) is finished
 *  on the world's own form. `onOwnMove` hears it when that moved his club,
 *  so the season that follows can say so (prepareLeagueWorld). */
function catchUpLeagueWorld(career: CareerState, clubs: ClubData[], year: number, onOwnMove?: (m: LeagueMovement) => void): CareerLeagueWorld | null {
  if (year < 2026) return null;
  let world = wholeWorld(career.leagueWorld) ? career.leagueWorld : initialWorld(year);
  if (world.year > year) return null;
  while (world.year < year) {
    world = finishLeagueWorld(world, career.playerName, clubs);
    const own = world.movements.find(m => same(m.club, career.currentClub));
    if (own && onOwnMove) onOwnMove(own);
  }
  return world;
}

/** Transfer and loan destinations carry the same division as the world.
 *  Newly named lower clubs use the game's generic tier and neutral color. */
export function projectLeagueWorldClubs(career: CareerState, clubs: ClubData[], year: number): ClubData[] {
  const world = leagueWorldForYear(career, clubs, year);
  if (!world) return clubs;
  const pool = [...clubs];
  const present = new Set(pool.map(c => clubKey(c.name)));
  const knownPool = new Map<string, ClubData>();
  for (const c of CAREER_CLUB_POOL) {
    const key = clubKey(c.name);
    if (!knownPool.has(key)) knownPool.set(key, c);
  }
  for (const p of PYRAMIDS) for (const name of initialMembers(p.lower)) {
    const key = clubKey(name);
    if (!present.has(key)) {
      pool.push(knownPool.get(key) ?? { id: `career-lower-${key.replace(/[^a-z0-9]+/g, '-')}`, name, country: p.lower === 'Ligue 2' ? 'France' : p.lower === 'Serie B' ? 'Italy' : name === 'FC Andorra' ? 'Andorra' : 'Spain', tier: 4, color: '#64748b', league: p.lower });
      present.add(key);
    }
  }
  const leagueOf = new Map<string, string>();
  for (const [league, names] of Object.entries(world.leagues)) for (const name of names) {
    const key = clubKey(name);
    if (!leagueOf.has(key)) leagueOf.set(key, league);
  }
  return pool.map(c => {
    const league = leagueOf.get(clubKey(c.name));
    if (!league) return c;
    const lower = pyramidFor(league)?.lower === league;
    return { ...c, league, tier: lower ? Math.max(4, c.tier) : c.tier };
  });
}

/** Write only at a season transition, never while a saved page is viewed. */
export function prepareLeagueWorld(career: CareerState, clubs: ClubData[], year: number): ClubData[] {
  /* Release AQ: a year he did not play (a ban, a prison year) has no season
     row to carry the news, so his club could change division with nothing on
     screen saying so. The season that follows now opens with the line. */
  const world = catchUpLeagueWorld(career, clubs, year, m => {
    if (Array.isArray(career.events)) career.events.push(`${m.kind === 'promoted' ? '⬆️' : '⬇️'} ${career.currentClub} ${m.kind} to ${m.to} in your simulated league world while you were away.`);
  });
  if (world) career.leagueWorld = world;
  const pool = projectLeagueWorldClubs(career, clubs, year);
  const own = pool.find(c => same(c.name, career.currentClub));
  if (world && own && Object.values(world.leagues).some(names => names.some(n => same(n, own.name)))) {
    career.currentLeague = own.league;
    career.currentClubTier = own.tier;
  }
  return pool;
}

export function recordLeagueWorldSeason(career: CareerState, clubs: ClubData[], row: SeasonRecord): void {
  const world = career.leagueWorld;
  if (!world || world.year !== row.year) return;
  const league = Object.entries(world.leagues).find(([, names]) => names.some(n => same(n, row.club)))?.[0];
  if (!league) return;
  const members = world.leagues[league].map(n => same(n, row.club) ? row.club : n);
  if (typeof row.leagueApps === 'number') row.leagueApps = Math.min(row.leagueApps, row.apps, 2 * (members.length - 1));
  if (!row.injurySevere && (!row.leagueFinish || row.leagueSize !== members.length)) {
    row.leagueFinish = drawLeagueWorldFinish(row, career.playerName, members.length);
    row.leagueSize = members.length;
  }
  const crowned = leagueWorldOrder(world, league, career.playerName, clubs, row.injurySevere ? undefined : row).find(n => !row.injurySevere || !same(n, row.club))!;
  const champion = same(crowned, row.club) ? row.club : crowned;
  row.leagueWorld = { league, members, champion, simulation: pyramidFor(league)?.upper === 'La Liga' ? 'simulated-partial' : 'simulated' };
}

/** Reconstruct a simulated lower-division finish without touching a save. */
export function drawLeagueWorldFinish(row: Pick<SeasonRecord, 'year' | 'club' | 'leagueTitle'>, playerName: string, size: number): number {
  const rng = keyedRng(`${playerName}|${row.year}|${row.club}|division-finish`);
  return row.leagueTitle ? 1 : 2 + Math.floor(rng() * (size - 1));
}

export function leagueWorldChampions(career: CareerState, clubs: ClubData[], row: SeasonRecord): Record<string, string> | undefined {
  const world = career.leagueWorld;
  if (!world || world.year !== row.year) return undefined;
  return Object.fromEntries(Object.keys(world.leagues).map(league => [league, row.leagueWorld?.league === league ? row.leagueWorld.champion : leagueWorldOrder(world, league, career.playerName, clubs)[0]]));
}

/** Release AQ: the order his own division finished in, for the settle. It is
 *  the world's form order with his club at the place the season saved, the
 *  rule every other division already moves by. Before this the engine drew
 *  the whole Season Centre season here to read its final table, which put
 *  that code in the page's first download (scripts/simFlagshipWeight.mjs)
 *  and let a derby rival, whose place in that table was a random draw, go
 *  down about one season in ten however big the club. The Season Centre now
 *  draws its table to agree with what is saved here (leagueWorldZone below,
 *  read by src/lib/season/soccer.ts).
 *
 *  A season cut short by a severe injury has no finish: his club is placed
 *  on form like any other, and never first, because the champion recorded
 *  for that season is never his club (recordLeagueWorldSeason). */
export function settledLeagueOrder(world: CareerLeagueWorld, league: string, playerName: string, clubs: ClubData[], row: SeasonRecord): string[] {
  const order = leagueWorldOrder(world, league, playerName, clubs, row);
  if (row.injurySevere && order.length > 1 && same(order[0], row.club)) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

export function settleLeagueWorld(career: CareerState, clubs: ClubData[], row: SeasonRecord, tableOrder?: string[]): void {
  const world = career.leagueWorld;
  if (!world || world.year !== row.year) return;
  const snapshot = readLeagueWorldSeason(row);
  const order = snapshot ? tableOrder ?? settledLeagueOrder(world, snapshot.league, career.playerName, clubs, row) : undefined;
  const next = finishLeagueWorld(world, career.playerName, clubs, snapshot && order ? { league: snapshot.league, order } : undefined);
  if (snapshot) {
    snapshot.movements = next.movements.map(m => ({ ...m, club: snapshot.members.find(n => same(n, m.club)) ?? m.club })).filter(m => m.from === snapshot.league);
    const movement = snapshot.movements.find(m => same(m.club, row.club));
    if (movement) snapshot.movement = { ...movement };
  }
  career.leagueWorld = next;
}

/** Release AQ: the places of his division that change hands, and the clubs a
 *  settled season saved in them: the bottom two or three of a top flight,
 *  the top two or three of a second division. Null before the settle and for
 *  a saved list that is not exactly that many clubs. The Season Centre's
 *  table is drawn to hold these clubs in these places. */
export function leagueWorldZone(held: LeagueWorldSeason): { side: 'top' | 'bottom'; count: number; clubs: string[] } | null {
  const pyramid = pyramidFor(held.league);
  if (!pyramid || !Array.isArray(held.movements)) return null;
  const clubs = held.movements.filter(m => m.from === held.league).map(m => m.club);
  if (clubs.length !== pyramid.count || clubs.some(n => !held.members.some(m => same(m, n)))) return null;
  return { side: pyramid.upper === held.league ? 'bottom' : 'top', count: pyramid.count, clubs };
}
