import { NRL_LAST_YEAR, nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { hashLabel, rngFrom } from '@/lib/careerEngine';
import {
  nrlCanPlayRole, nrlRetrainingRoles, NRL_BENCH_SIZE, NRL_ROLES, NRL_TACTICS, scoreNrlRepresentativeMatch,
  type NrlPlayer, type NrlRole, type NrlTactic,
} from '@/lib/nrlManager';

export const NRL_ORIGIN_SIDES = ['nsw', 'qld'] as const;
export type NrlOriginSide = typeof NRL_ORIGIN_SIDES[number];
export const NRL_ORIGIN_TEAM_NAMES = { nsw: 'New South Wales Blues', qld: 'Queensland Maroons' } as const;
type OriginPlayer = Omit<NrlPlayer, 'fitness'>;
interface OriginSelection { starters: Record<NrlRole, string>; bench: string[] }
interface OriginMatch {
  selection: OriginSelection;
  tactic: NrlTactic;
  homeScore: number;
  awayScore: number;
  goldenPoint: boolean;
}
type NrlOriginScore = Pick<OriginMatch, 'homeScore' | 'awayScore' | 'goldenPoint'>;
export interface NrlOriginHistory {
  year: number;
  side: NrlOriginSide;
  winner: NrlOriginSide;
  matches: NrlOriginScore[];
}
export interface NrlOriginSeries {
  version: 1;
  year: number;
  side: NrlOriginSide;
  pools: Record<NrlOriginSide, OriginPlayer[]>;
  selection: OriginSelection;
  tactic: NrlTactic;
  matches: OriginMatch[];
  nomination?: { clubId: string; playerId: string };
}
interface OriginFixture {
  game: number;
  home: NrlOriginSide;
  away: NrlOriginSide;
  neutral: boolean;
  date?: string;
  venue?: string;
  simulated?: true;
}

// Men's series announcement and draw: https://www.nrl.com/news/2025/11/12/2026-ampol-state-of-origin/
const ORIGIN_FIXTURES_2026: readonly OriginFixture[] = [
  { game: 1, date: '2026-05-27', venue: 'Accor Stadium, Sydney', home: 'nsw', away: 'qld', neutral: false },
  { game: 2, date: '2026-06-17', venue: 'Melbourne Cricket Ground', home: 'nsw', away: 'qld', neutral: true },
  { game: 3, date: '2026-07-08', venue: 'Suncorp Stadium, Brisbane', home: 'qld', away: 'nsw', neutral: false },
];
const SIMULATED_ORIGIN_FIXTURES: readonly OriginFixture[] = [
  { game: 1, home: 'nsw', away: 'qld', neutral: false, simulated: true },
  { game: 2, home: 'qld', away: 'nsw', neutral: false, simulated: true },
  { game: 3, home: 'nsw', away: 'qld', neutral: true, simulated: true },
];
export const nrlOriginFixtures = (year: number) => year === 2026 ? ORIGIN_FIXTURES_2026 : SIMULATED_ORIGIN_FIXTURES;

// Players already in the game's sourced opening roster who appeared in a final 2026 Origin team list.
// https://www.nrl.com/news/2026/05/22/blues-v-maroons-tedesco-returns-walker-steps-up/
// https://www.nrl.com/news/2026/06/10/blues-v-maroons-lucas-to-debut-walsh-recalled/
// https://www.nrl.com/news/2026/06/30/maroons-v-blues-carrigan-returns-best-ready-to-fire/
const NSW_ORIGIN_IDS = new Set([
  500663, 505410, 508062, 508009, 509634, 100006524, 504120, 500449, 504074, 508033, 500534,
  504176, 504274, 100011678, 509397, 503523, 500485, 100018452, 504300, 505582, 500109, 506682,
]);
const QLD_ORIGIN_IDS = new Set([
  504870, 100004649, 100001936, 100008220, 501459, 100004843, 504315, 505904, 506513, 504374,
  500992, 507062, 501781, 506603, 100004534, 504371, 100007811, 510216, 508443,
]);
const CLUB_PLAYER_ID = /^nrl-(?:(academy|prospect)-)?([a-z-]+)-(\d{4})-(0|[1-9]\d?)$/;
const OPENING_PLAYER_ID = /^([a-z-]+)-(?:[1-9]|1[0-3])-[01]$/;
const MARKET_PLAYER_ID = /^nrl-market-(\d{4})-(?:[0-9]|1[0-2])-[0-2]$/;
const MATCHDAY_SIZE = NRL_ROLES.length + NRL_BENCH_SIZE;
const MAX_POOL = Math.max(39, MATCHDAY_SIZE + Math.max(NSW_ORIGIN_IDS.size, QLD_ORIGIN_IDS.size));
const isYear = (year: number) => Number.isInteger(year) && year >= 2026 && year <= NRL_LAST_YEAR;
const isSide = (side: NrlOriginSide) => NRL_ORIGIN_SIDES.includes(side);
const isGeneratedClub = (clubId: string, year: number) => nrlSeasonPlan(Math.min(year, 2028)).clubs.some(club => club.id === clubId);

function isGeneratedOriginPlayer(id: string): boolean {
  const market = MARKET_PLAYER_ID.exec(id);
  if (market) return isYear(Number(market[1]));
  const initial = OPENING_PLAYER_ID.exec(id);
  if (initial) return isGeneratedClub(initial[1], 2027);
  const club = CLUB_PLAYER_ID.exec(id);
  if (!club) return false;
  const [, source, clubId, yearText, indexText] = club;
  const year = Number(yearText);
  return isYear(year) && isGeneratedClub(clubId, year)
    && Number(indexText) < (source === 'prospect' ? NRL_ROLES.length : 30);
}

export function nrlOriginEligibility(playerId: string): NrlOriginSide | null {
  if (playerId.startsWith('nrl-real-')) {
    const match = /^nrl-real-([1-9]\d*)$/.exec(playerId);
    const id = match ? Number(match[1]) : 0;
    return NSW_ORIGIN_IDS.has(id) ? 'nsw' : QLD_ORIGIN_IDS.has(id) ? 'qld' : null;
  }
  if (!isGeneratedOriginPlayer(playerId)) return null;
  const roll = rngFrom(hashLabel(`nrl-origin-eligibility-v1|${playerId}`))();
  return roll < 0.45 ? 'nsw' : roll < 0.9 ? 'qld' : null;
}

function originSelection(players: OriginPlayer[]): OriginSelection | null {
  if (players.length < MATCHDAY_SIZE) return null;
  const starters = {} as OriginSelection['starters'];
  const assigned = new Map<string, NrlRole>();
  const options = new Map(NRL_ROLES.map(role => [role, [
    ...players.filter(player => player.role === role),
    ...players.filter(player => player.secondaryRole === role && player.role !== role),
  ]]));
  const fill = (role: NrlRole, tried: Set<string>): boolean => {
    for (const player of options.get(role)!) {
      if (tried.has(player.id)) continue;
      tried.add(player.id);
      const previous = assigned.get(player.id);
      if (!previous || fill(previous, tried)) {
        assigned.set(player.id, role);
        starters[role] = player.id;
        return true;
      }
    }
    return false;
  };
  if (!NRL_ROLES.every(role => fill(role, new Set()))) return null;
  const reserves = players.filter(player => !assigned.has(player.id));
  const covered = new Set<NrlRole>();
  const bench = reserves.filter(player => {
    if (covered.has(player.role)) return false;
    covered.add(player.role);
    return true;
  }).slice(0, NRL_BENCH_SIZE).map(player => player.id);
  for (const player of reserves) {
    if (bench.length === NRL_BENCH_SIZE) break;
    if (!bench.includes(player.id)) bench.push(player.id);
  }
  return { starters, bench };
}

function originPool(players: readonly NrlPlayer[], side: NrlOriginSide): OriginPlayer[] {
  const eligible = players.filter(player => nrlOriginEligibility(player.id) === side)
    .sort((a, b) => b.rating - a.rating || (a.id < b.id ? -1 : Number(a.id > b.id)));
  const selection = originSelection(eligible);
  if (!selection) return [];
  const keep = new Set([...Object.values(selection.starters), ...selection.bench]);
  for (const player of eligible) if (player.id.startsWith('nrl-real-')) keep.add(player.id);
  for (const role of NRL_ROLES) {
    for (const player of eligible.filter(player => player.role === role).slice(0, 2)) {
      if (keep.size === MAX_POOL) break;
      keep.add(player.id);
    }
  }
  for (const player of eligible) {
    if (keep.size === MAX_POOL) break;
    keep.add(player.id);
  }
  return eligible.filter(player => keep.has(player.id)).map(({ id, name, role, rating, secondaryRole }) => ({
    id, name, role, rating, ...(secondaryRole ? { secondaryRole } : {}),
  }));
}

export function createNrlOriginSeries(players: readonly NrlPlayer[], year: number, side: NrlOriginSide,
  nomination?: NrlOriginSeries['nomination']): NrlOriginSeries | null {
  if (!isYear(year) || !isSide(side)) return null;
  const pools = { nsw: originPool(players, 'nsw'), qld: originPool(players, 'qld') };
  if (!pools.nsw.length || !pools.qld.length) return null;
  const selection = originSelection(pools[side]);
  if (!selection) return null;
  if (nomination && !pools[side].some(player => player.id === nomination.playerId)) {
    const player = players.find(candidate => candidate.id === nomination.playerId && nrlOriginEligibility(candidate.id) === side);
    if (!player) return null;
    const selected = new Set([...Object.values(selection.starters), ...selection.bench]);
    if (pools[side].length === MAX_POOL) {
      const replaced = [...pools[side]].reverse().find(candidate => !selected.has(candidate.id) && !candidate.id.startsWith('nrl-real-'));
      if (!replaced) return null;
      pools[side].splice(pools[side].indexOf(replaced), 1);
    }
    const { id, name, role, rating, secondaryRole } = player;
    pools[side].push({ id, name, role, rating, ...(secondaryRole ? { secondaryRole } : {}) });
  }
  return { version: 1, year, side, pools, selection, tactic: 'balanced', matches: [], ...(nomination ? { nomination } : {}) };
}

const SERIES_GAMES = ORIGIN_FIXTURES_2026.length;
const MAX_ORIGIN_SCORE = 18 * 6 + 2 + 1; // A converted try per chance, one penalty goal and one golden point.
export const nrlOriginComplete = ({ matches }: NrlOriginSeries) => matches.length >= SERIES_GAMES;

export function nrlOriginStarterOptions(series: NrlOriginSeries, role: NrlRole): OriginPlayer[] {
  const { starters } = series.selection;
  const pool = series.pools[series.side];
  const outgoing = pool.find(player => player.id === starters[role]);
  return pool.filter(player => {
    if (!nrlCanPlayRole(player, role)) return false;
    const oldRole = NRL_ROLES.find(candidate => candidate !== role && starters[candidate] === player.id);
    return !oldRole || (outgoing && nrlCanPlayRole(outgoing, oldRole));
  });
}

export function selectNrlOriginStarter(series: NrlOriginSeries, role: NrlRole, playerId: string): NrlOriginSeries {
  const { starters, bench } = series.selection;
  if (nrlOriginComplete(series) || !NRL_ROLES.includes(role) || starters[role] === playerId
    || !nrlOriginStarterOptions(series, role).some(player => player.id === playerId)) return series;
  const oldRole = NRL_ROLES.find(candidate => starters[candidate] === playerId);
  const outgoingId = starters[role];
  const selection = {
    starters: { ...starters, [role]: playerId, ...(oldRole ? { [oldRole]: outgoingId } : {}) },
    bench: bench.map(id => id === playerId ? outgoingId : id),
  };
  return { ...series, selection };
}

export function selectNrlOriginReserve(series: NrlOriginSeries, slot: number, playerId: string): NrlOriginSeries {
  const { starters, bench } = series.selection;
  if (nrlOriginComplete(series) || !Number.isInteger(slot) || slot < 0 || slot >= NRL_BENCH_SIZE || bench[slot] === playerId
    || Object.values(starters).includes(playerId) || !series.pools[series.side].some(player => player.id === playerId)) return series;
  return { ...series, selection: { starters, bench: bench.map((id, index) => index === slot ? playerId : id === playerId ? bench[slot] : id) } };
}

export function setNrlOriginTactic(series: NrlOriginSeries, tactic: NrlTactic): NrlOriginSeries {
  if (nrlOriginComplete(series) || series.tactic === tactic || !NRL_TACTICS.includes(tactic)) return series;
  return { ...series, tactic };
}

function simulateMatch(series: NrlOriginSeries, seed: number, fixture: OriginFixture, selection: OriginSelection, tactic: NrlTactic) {
  const team = (side: NrlOriginSide) => {
    const pool = series.pools[side];
    const chosen = side === series.side ? selection : originSelection(pool)!;
    return {
      squad: pool.map(player => ({ ...player, fitness: 100 })),
      lineup: chosen.starters, bench: chosen.bench, preparation: null,
      tactic: side === series.side ? tactic : 'balanced' as const,
    };
  };
  const rng = rngFrom(hashLabel(`nrl-origin-match-v1|${seed}|${series.year}|${fixture.game}`));
  return scoreNrlRepresentativeMatch(team(fixture.home), team(fixture.away), rng, fixture.neutral);
}

export function playNrlOriginMatch(series: NrlOriginSeries, seed: number, game: number): NrlOriginSeries {
  if (nrlOriginComplete(series) || game !== series.matches.length + 1) return series;
  const { selection, tactic } = series;
  const fixture = nrlOriginFixtures(series.year)[game - 1];
  const match = { selection, tactic, ...simulateMatch(series, seed, fixture, selection, tactic) };
  return { ...series, matches: [...series.matches, match] };
}

export function nrlOriginResult(series: { year: number; matches: readonly NrlOriginScore[] }) {
  const wins = { nsw: 0, qld: 0 };
  const fixtures = nrlOriginFixtures(series.year);
  series.matches.forEach(({ homeScore, awayScore }, index) => {
    const { home, away } = fixtures[index];
    wins[homeScore > awayScore ? home : away]++;
  });
  return { wins, winner: NRL_ORIGIN_SIDES.find(side => wins[side] >= 2) };
}

export function archiveNrlOrigin(series: NrlOriginSeries): NrlOriginHistory | null {
  const { winner } = nrlOriginResult(series);
  if (!nrlOriginComplete(series) || !winner) return null;
  const matches = series.matches.map(({ homeScore, awayScore, goldenPoint }) => ({ homeScore, awayScore, goldenPoint }));
  return { year: series.year, side: series.side, winner, matches };
}

export function validNrlOriginHistory(value: unknown, openingYear: number, activeYear: number): value is NrlOriginHistory[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > activeYear - openingYear) return false;
  let nextYear = openingYear;
  const validScore = (score: unknown) => typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= MAX_ORIGIN_SCORE;
  for (const record of value as NrlOriginHistory[]) {
    if (!record || typeof record !== 'object' || Object.keys(record).length !== 4 || !isYear(record.year)
      || record.year < nextYear || record.year >= activeYear || !isSide(record.side) || !isSide(record.winner)
      || !Array.isArray(record.matches) || record.matches.length !== SERIES_GAMES
      || !record.matches.every(match => match && typeof match === 'object' && Object.keys(match).length === 3
        && validScore(match.homeScore) && validScore(match.awayScore) && match.homeScore !== match.awayScore
        && typeof match.goldenPoint === 'boolean' && (match.goldenPoint
          ? Math.abs(match.homeScore - match.awayScore) === 1 && Math.min(match.homeScore, match.awayScore) % 2 === 0
          : match.homeScore % 2 === 0 && match.awayScore % 2 === 0))
      || nrlOriginResult(record).winner !== record.winner) return false;
    nextYear = record.year + 1;
  }
  return true;
}

function isOriginSelection(value: unknown, pool: OriginPlayer[]): value is OriginSelection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { starters, bench } = value as OriginSelection;
  if (Object.keys(value).length !== 2 || !starters || typeof starters !== 'object'
    || Object.keys(starters).length !== NRL_ROLES.length || !Array.isArray(bench) || bench.length !== NRL_BENCH_SIZE) return false;
  const byId = new Map(pool.map(player => [player.id, player]));
  if (!NRL_ROLES.every(role => {
    const player = byId.get(starters[role]);
    return player && nrlCanPlayRole(player, role);
  }) || !bench.every(id => byId.has(id))) return false;
  return new Set([...Object.values(starters), ...bench]).size === MATCHDAY_SIZE;
}

function isOriginPool(value: unknown, side: NrlOriginSide): value is OriginPlayer[] {
  if (!Array.isArray(value) || value.length < MATCHDAY_SIZE || value.length > MAX_POOL) return false;
  const ids = new Set<string>();
  for (const player of value as OriginPlayer[]) {
    if (!player || typeof player !== 'object' || typeof player.id !== 'string' || player.id.length > 80
      || nrlOriginEligibility(player.id) !== side || ids.has(player.id) || typeof player.name !== 'string' || !player.name.trim()
      || player.name.length > 100 || !NRL_ROLES.includes(player.role) || !Number.isInteger(player.rating)
      || player.rating < 40 || player.rating > 98 || (player.secondaryRole !== undefined
      && !nrlRetrainingRoles(player.role).includes(player.secondaryRole))
      || Object.keys(player).length !== (player.secondaryRole === undefined ? 4 : 5)) return false;
    ids.add(player.id);
  }
  return Boolean(originSelection(value));
}

export function isNrlOriginSeries(value: unknown, seed: number): value is NrlOriginSeries {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const series = value as NrlOriginSeries;
  if (Object.keys(series).length !== (series.nomination === undefined ? 7 : 8)
    || series.version !== 1 || !isYear(series.year) || !isSide(series.side)
    || !series.pools || typeof series.pools !== 'object' || Object.keys(series.pools).length !== 2
    || !isOriginPool(series.pools.nsw, 'nsw') || !isOriginPool(series.pools.qld, 'qld')
    || !NRL_TACTICS.includes(series.tactic) || !isOriginSelection(series.selection, series.pools[series.side])
    || !Array.isArray(series.matches) || series.matches.length > SERIES_GAMES) return false;
  const { nomination } = series;
  if (nomination !== undefined && (!nomination || typeof nomination !== 'object' || Object.keys(nomination).length !== 2
    || !nrlSeasonPlan(series.year).clubs.some(club => club.id === nomination.clubId)
    || !series.pools[series.side].some(player => player.id === nomination.playerId))) return false;
  const fixtures = nrlOriginFixtures(series.year);
  const final = series.matches[SERIES_GAMES - 1];
  if (final && (final.tactic !== series.tactic || NRL_ROLES.some(role => final.selection?.starters?.[role] !== series.selection.starters[role])
    || series.selection.bench.some((id, index) => final.selection?.bench?.[index] !== id))) return false;
  return series.matches.every((match, index) => {
    if (!match || typeof match !== 'object' || Object.keys(match).length !== 5
      || !isOriginSelection(match.selection, series.pools[series.side]) || !NRL_TACTICS.includes(match.tactic)) return false;
    const expected = simulateMatch(series, seed, fixtures[index], match.selection, match.tactic);
    return match.homeScore === expected.homeScore && match.awayScore === expected.awayScore && match.goldenPoint === expected.goldenPoint;
  });
}
