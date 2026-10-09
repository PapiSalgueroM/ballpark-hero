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
  movements?: LeagueMovement[];
}
export interface CareerLeagueWorld { year: number; leagues: Record<string, string[]>; movements: LeagueMovement[] }

const PYRAMIDS = [
  { upper: 'Premier League', lower: 'Championship', count: 3 },
  { upper: 'Bundesliga', lower: '2. Bundesliga', count: 2 },
  { upper: 'Ligue 1', lower: 'Ligue 2', count: 2 },
  { upper: 'Serie A', lower: 'Serie B', count: 3 },
  { upper: 'La Liga', lower: 'Segunda Division', count: 3 },
];
const clubKey = (name: string) => (SC_CLUB_CANON[name] ?? name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const same = (a: string, b: string) => clubKey(a) === clubKey(b);
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
  const form = members.map(name => {
    const tier = clubs.find(c => same(c.name, name))?.tier ?? 4;
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
      ? supplied : leagueWorldOrder(world, league, playerName, clubs);
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
  if (year < 2026) return null;
  let world = career.leagueWorld ?? initialWorld(year);
  if (world.year > year) return null;
  while (world.year < year) world = finishLeagueWorld(world, career.playerName, clubs);
  return world;
}

/** Transfer and loan destinations carry the same division as the world.
 *  Newly named lower clubs use the game's generic tier and neutral color. */
export function projectLeagueWorldClubs(career: CareerState, clubs: ClubData[], year: number): ClubData[] {
  const world = leagueWorldForYear(career, clubs, year);
  if (!world) return clubs;
  const pool = [...clubs];
  for (const p of PYRAMIDS) for (const name of initialMembers(p.lower)) {
    if (!pool.some(c => same(c.name, name))) pool.push(CAREER_CLUB_POOL.find(c => same(c.name, name)) ?? { id: `career-lower-${clubKey(name).replace(/[^a-z0-9]+/g, '-')}`, name, country: p.lower === 'Ligue 2' ? 'France' : p.lower === 'Serie B' ? 'Italy' : name === 'FC Andorra' ? 'Andorra' : 'Spain', tier: 4, color: '#64748b', league: p.lower });
  }
  return pool.map(c => {
    const league = Object.entries(world.leagues).find(([, names]) => names.some(n => same(n, c.name)))?.[0];
    if (!league) return c;
    const lower = pyramidFor(league)?.lower === league;
    return { ...c, league, tier: lower ? Math.max(4, c.tier) : c.tier };
  });
}

/** Write only at a season transition, never while a saved page is viewed. */
export function prepareLeagueWorld(career: CareerState, clubs: ClubData[], year: number): ClubData[] {
  const world = leagueWorldForYear(career, clubs, year);
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
  const members = [...world.leagues[league]];
  if (typeof row.leagueApps === 'number') row.leagueApps = Math.min(row.leagueApps, row.apps, 2 * (members.length - 1));
  if (!row.injurySevere && (!row.leagueFinish || row.leagueSize !== members.length)) {
    row.leagueFinish = drawLeagueWorldFinish(row, career.playerName, members.length);
    row.leagueSize = members.length;
  }
  const champion = leagueWorldOrder(world, league, career.playerName, clubs, row.injurySevere ? undefined : row).find(n => !row.injurySevere || !same(n, row.club))!;
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

export function settleLeagueWorld(career: CareerState, clubs: ClubData[], row: SeasonRecord, tableOrder?: string[]): void {
  const world = career.leagueWorld;
  if (!world || world.year !== row.year) return;
  const snapshot = readLeagueWorldSeason(row);
  const order = snapshot ? tableOrder ?? leagueWorldOrder(world, snapshot.league, career.playerName, clubs, row) : undefined;
  const next = finishLeagueWorld(world, career.playerName, clubs, snapshot && order ? { league: snapshot.league, order } : undefined);
  if (snapshot) {
    snapshot.movements = next.movements.map(m => ({ ...m }));
    const movement = next.movements.find(m => same(m.club, row.club));
    if (movement) snapshot.movement = { ...movement };
  }
  career.leagueWorld = next;
}
