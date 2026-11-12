import { NRL_SEASONS, type NrlYear } from '@/data/nrlManager2026';
import { clamp, clampi, hashLabel, rngFrom } from '@/lib/careerEngine';
import { eliminated, premierOf, resolveWeek, type FinalsTie, type TieOutcome } from '@/lib/finalsBracket';
import { uniqueName } from '@/lib/foNames';

export type { NrlYear } from '@/data/nrlManager2026';

export const NRL_SAVE_KEY = 'nrl-manager-save-v1';
export const NRL_REGULAR_ROUNDS = NRL_SEASONS[2026].draw.length;
export const nrlRegularRounds = (year: NrlYear): number => NRL_SEASONS[year].draw.length;
export const NRL_ROLES = [
  'Fullback', 'Left Wing', 'Left Centre', 'Right Centre', 'Right Wing',
  'Five-eighth', 'Halfback', 'Prop 8', 'Hooker', 'Prop 10', 'Left Second Row', 'Right Second Row', 'Lock',
] as const;
export const NRL_TACTICS = ['balanced', 'attack', 'defense'] as const;

export type NrlRole = typeof NRL_ROLES[number];
export type NrlTactic = typeof NRL_TACTICS[number];
export type NrlPreparation = 'train' | 'recover';

export interface NrlPlayer { id: string; name: string; role: NrlRole; rating: number; fitness: number }
export interface NrlFixture { homeId: string; awayId: string; round: number; finalsRound?: number; tieId?: string }
export interface NrlScoring { tries: number; conversions: number; penalties: number; fieldGoals: number; longFieldGoals: number }
export interface NrlMatchResult extends NrlFixture {
  homeScore: number;
  awayScore: number;
  homeScoring: NrlScoring;
  awayScoring: NrlScoring;
  extraTime: boolean;
}
export interface NrlLadderRow {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
}
export interface NrlManagerState {
  version: 1;
  seed: number;
  year: NrlYear;
  clubId: string;
  phase: 'regular' | 'finals' | 'complete';
  round: number;
  squad: NrlPlayer[];
  lineup: Record<NrlRole, string>;
  tactic: NrlTactic;
  preparation: NrlPreparation | null;
  results: NrlMatchResult[];
  championId: string | null;
}
export type NrlAction =
  | { type: 'selectStarter'; role: NrlRole; playerId: string }
  | { type: 'setTactic'; tactic: NrlTactic }
  | { type: 'prepare'; choice: NrlPreparation }
  | { type: 'advance' };

const lastRound = (year: NrlYear) => nrlRegularRounds(year) + 4;
const clubFor = (year: NrlYear, clubId: string) => NRL_SEASONS[year].clubs.find(club => club.id === clubId);

// NRL finals cross over in week three so the two qualifying finals cannot immediately repeat.
// https://www.nrl.com/news/2021/09/05/nrl-finals-week-1-who-plays-who/
const FINALS: FinalsTie[] = [
  { id: 'QF1', week: 1, home: { seed: 1 }, away: { seed: 4 } },
  { id: 'QF2', week: 1, home: { seed: 2 }, away: { seed: 3 } },
  { id: 'EF1', week: 1, home: { seed: 5 }, away: { seed: 8 } },
  { id: 'EF2', week: 1, home: { seed: 6 }, away: { seed: 7 } },
  { id: 'SF1', week: 2, home: { loserOf: 'QF1' }, away: { winnerOf: 'EF1' } },
  { id: 'SF2', week: 2, home: { loserOf: 'QF2' }, away: { winnerOf: 'EF2' } },
  { id: 'PF1', week: 3, home: { winnerOf: 'QF1' }, away: { winnerOf: 'SF2' } },
  { id: 'PF2', week: 3, home: { winnerOf: 'QF2' }, away: { winnerOf: 'SF1' } },
  { id: 'GF', week: 4, home: { winnerOf: 'PF1' }, away: { winnerOf: 'PF2' } },
];
const FIRST_NAMES = ['Arlo', 'Beau', 'Brodie', 'Callum', 'Coby', 'Elijah', 'Hemi', 'Isaac', 'Jalen', 'Jesse', 'Koa', 'Lachlan', 'Levi', 'Luca', 'Malachi', 'Niko', 'Riley', 'Tama', 'Tane', 'Teo'];
const LAST_NAMES = ['Arden', 'Ashby', 'Bennett', 'Cairns', 'Dawson', 'Forde', 'Hanley', 'Hartley', 'Hewitt', 'Lennox', 'Linton', 'Marlow', 'Merritt', 'Nairn', 'Palmer', 'Preece', 'Reeve', 'Rourke', 'Rowan', 'Vale'];

export function createNrlSeason(clubId: string, seed: number, year: NrlYear = 2026): NrlManagerState {
  const club = clubFor(year, clubId);
  if (!club) throw new RangeError(`Choose a club from the ${year} league.`);
  seed = seed >>> 0;
  const rng = rngFrom(hashLabel(`${seed}|${year}|${clubId}|squad`));
  const names = new Set<string>();
  const squad = NRL_ROLES.flatMap((role, jersey) => [0, 1].map(reserve => ({
    id: `${clubId}-${jersey + 1}-${reserve}`,
    name: uniqueName(rng, FIRST_NAMES, LAST_NAMES, names),
    role,
    rating: clampi(club.strength + (rng() - 0.5) * 10 - 6 * reserve, 40, 98),
    fitness: 100,
  })));
  const lineup = Object.fromEntries(NRL_ROLES.map((role, index) => [role, squad[2 * index].id])) as Record<NrlRole, string>;
  return {
    version: 1, seed, year, clubId, phase: 'regular', round: 1,
    squad, lineup, tactic: 'balanced', preparation: null, results: [], championId: null,
  };
}

export function nrlLadder(state: Pick<NrlManagerState, 'year' | 'round' | 'results'>): NrlLadderRow[] {
  const regularRounds = nrlRegularRounds(state.year);
  const rows = NRL_SEASONS[state.year].clubs.map(({ id }) => ({
    clubId: id, played: 0, wins: 0, draws: 0, losses: 0,
    byes: 0, points: 0, pointsFor: 0, pointsAgainst: 0, differential: 0,
    tries: 0, goals: 0, fieldGoals: 0,
  }));
  const byClub = new Map<string, (typeof rows)[number]>(rows.map(row => [row.clubId, row]));
  for (const match of state.results) {
    if (match.round > regularRounds) continue;
    const home = byClub.get(match.homeId)!;
    const away = byClub.get(match.awayId)!;
    const sides = [
      [home, match.homeScore, match.awayScore, match.homeScoring],
      [away, match.awayScore, match.homeScore, match.awayScoring],
    ] as const;
    for (const [row, scored, conceded, scoring] of sides) {
      row.played++;
      row.pointsFor += scored;
      row.pointsAgainst += conceded;
      row.tries += scoring.tries;
      row.goals += scoring.conversions + scoring.penalties;
      row.fieldGoals += scoring.fieldGoals + scoring.longFieldGoals;
      if (scored > conceded) row.wins++;
      else if (scored === conceded) row.draws++;
      else row.losses++;
    }
  }
  const completed = Math.min(state.round - 1, regularRounds);
  for (const row of rows) {
    row.byes = completed - row.played;
    row.points = 2 * (row.wins + row.byes) + row.draws;
    row.differential = row.pointsFor - row.pointsAgainst;
  }
  // After points and differential the NRL uses the ratio of points for to points against.
  // https://www.nrl.com/news/2014/09/03/finals-hopes-down-to-the-toss-of-a-coin/
  const ratio = (row: NrlLadderRow) => row.pointsAgainst ? row.pointsFor / row.pointsAgainst : row.pointsFor ? Infinity : 1;
  return rows.sort((a, b) => b.points - a.points || b.differential - a.differential
    || ratio(b) - ratio(a) || b.tries - a.tries || b.goals - a.goals || b.fieldGoals - a.fieldGoals
    || a.clubId.localeCompare(b.clubId));
}

function finalsOutcomes(results: NrlMatchResult[]): Record<string, TieOutcome> {
  const outcomes: Record<string, TieOutcome> = {};
  for (const { tieId, homeId, awayId, homeScore, awayScore } of results) {
    if (!tieId) continue;
    outcomes[tieId] = homeScore > awayScore ? { winner: homeId, loser: awayId } : { winner: awayId, loser: homeId };
  }
  return outcomes;
}

export function nrlRoundFixtures(state: Pick<NrlManagerState, 'year' | 'round' | 'phase' | 'results'>): NrlFixture[] {
  const { year, round, phase, results } = state;
  if (phase === 'complete') return [];
  if (phase === 'regular') return (NRL_SEASONS[year].draw[round - 1] ?? []).map(([homeId, awayId]) => ({ homeId, awayId, round }));
  const finalsRound = round - nrlRegularRounds(year);
  const seeds = nrlLadder(state).slice(0, 8).map(row => row.clubId);
  const pairings = resolveWeek(FINALS, seeds, finalsOutcomes(results), finalsRound);
  return (pairings ?? []).map(({ id, homeId, awayId }) => ({ homeId, awayId, round, finalsRound, tieId: id }));
}

export function nrlFinalsEliminated(state: NrlManagerState): Set<string> {
  if (state.phase === 'regular') return new Set();
  const seeds = nrlLadder(state).map(row => row.clubId);
  return eliminated(FINALS, seeds, 8, finalsOutcomes(state.results));
}

const FINALS_ROUND_TITLES = ['Qualifying and elimination finals', 'Semi-finals', 'Preliminary finals', 'Grand final'];
export interface NrlNextRound {
  round: number;
  finalsRound: number | null;
  title: string;
  fixtures: NrlFixture[];
  clubMatch: NrlFixture | null;
  clubStatus: 'playing' | 'bye' | 'eliminated' | 'complete';
}

export function nrlNextRound(state: NrlManagerState): NrlNextRound {
  const { year, round, phase, clubId } = state;
  const fixtures = nrlRoundFixtures(state);
  const clubMatch = fixtures.find(match => match.homeId === clubId || match.awayId === clubId) ?? null;
  const finalsRound = phase === 'finals' ? round - nrlRegularRounds(year) : null;
  if (phase === 'complete') return { round, finalsRound, title: 'Season complete', fixtures, clubMatch, clubStatus: 'complete' };
  if (phase === 'regular') return { round, finalsRound, title: `Round ${round}`, fixtures, clubMatch, clubStatus: clubMatch ? 'playing' : 'bye' };
  const clubStatus = clubMatch ? 'playing' : nrlFinalsEliminated(state).has(clubId) ? 'eliminated' : 'bye';
  return { round, finalsRound, title: FINALS_ROUND_TITLES[finalsRound - 1], fixtures, clubMatch, clubStatus };
}

const TACTIC_EFFECT: Record<NrlTactic, { attack: number; defense: number }> = {
  balanced: { attack: 0, defense: 0 },
  attack: { attack: 5, defense: -3 },
  defense: { attack: -2, defense: 5 },
};
const PREPARATION_FITNESS = { train: -4, recover: 10, normal: 0 };
function readyFitness(fitness: number, preparation: NrlPreparation | null, playing: boolean): number {
  const routineRecovery = Math.ceil((100 - fitness) * 0.45);
  return clamp(fitness + routineRecovery + PREPARATION_FITNESS[preparation ?? 'normal'] + (playing ? 0 : 12), 0, 100);
}

function teamRatings(state: NrlManagerState, clubId: string) {
  if (clubId !== state.clubId) {
    const strength = clubFor(state.year, clubId)!.strength;
    return { attack: strength, defense: strength };
  }
  const starters = new Set(Object.values(state.lineup));
  const base = state.squad.filter(player => starters.has(player.id)).reduce((sum, player) => {
    const fitness = readyFitness(player.fitness, state.preparation, true);
    return sum + player.rating - (100 - fitness) * 0.18;
  }, 0) / NRL_ROLES.length;
  const { attack, defense } = TACTIC_EFFECT[state.tactic];
  return { attack: base + attack + (state.preparation === 'train' ? 7 : 0), defense: base + defense };
}

function scoreOf(scoring: NrlScoring): number {
  return 4 * scoring.tries + 2 * scoring.conversions + 2 * scoring.penalties
    + scoring.fieldGoals + 2 * scoring.longFieldGoals;
}

function scoringChances(rng: () => number, edge: number, chances: number): NrlScoring {
  const scoring: NrlScoring = { tries: 0, conversions: 0, penalties: 0, fieldGoals: 0, longFieldGoals: 0 };
  for (let chance = 0; chance < chances; chance++) {
    const tryRoll = rng();
    const conversionRoll = rng();
    if (tryRoll < clamp(0.204 + edge / 155, 0.065, 0.40)) {
      scoring.tries++;
      if (conversionRoll < clamp(0.76 + edge / 400, 0.62, 0.89)) scoring.conversions++;
    }
  }
  if (rng() < (chances === 18 ? 0.21 : 0.04)) scoring.penalties++;
  return scoring;
}

function addScoring(total: NrlScoring, extra: NrlScoring) {
  total.tries += extra.tries;
  total.conversions += extra.conversions;
  total.penalties += extra.penalties;
}

function playFixture(state: NrlManagerState, fixture: NrlFixture): NrlMatchResult {
  const { round, homeId, awayId, finalsRound, tieId } = fixture;
  const rng = rngFrom(hashLabel(`${state.seed}|${state.year}|${round}|${homeId}|${awayId}`));
  const home = teamRatings(state, homeId);
  const away = teamRatings(state, awayId);
  const venue = tieId === 'GF' ? 0 : 2;
  const homeEdge = home.attack - away.defense + venue;
  const awayEdge = away.attack - home.defense - venue;
  const homeScoring = scoringChances(rng, homeEdge, 18);
  const awayScoring = scoringChances(rng, awayEdge, 18);
  const gap = scoreOf(homeScoring) - scoreOf(awayScoring);
  const homeKick = rng();
  const awayKick = rng();
  if (gap <= 0 && gap >= -2 && homeKick < 0.14) {
    if (gap === -2 || homeKick < 0.008) homeScoring.longFieldGoals++;
    else homeScoring.fieldGoals++;
  }
  if (gap >= 0 && gap <= 2 && awayKick < 0.14) {
    if (gap === 2 || awayKick < 0.008) awayScoring.longFieldGoals++;
    else awayScoring.fieldGoals++;
  }
  // NRL finals play ten minutes before sudden death. A regular match can finish level.
  // https://www.nrl.com/siteassets/operations/the-game/nrl-international-rules-book-2023.pdf
  const extraTime = scoreOf(homeScoring) === scoreOf(awayScoring);
  if (extraTime && finalsRound) {
    addScoring(homeScoring, scoringChances(rng, homeEdge, 2));
    addScoring(awayScoring, scoringChances(rng, awayEdge, 2));
  }
  if (scoreOf(homeScoring) === scoreOf(awayScoring) && (finalsRound || rng() < 0.78)) {
    const golden = rng() < clamp(0.5 + (homeEdge - awayEdge) / 140, 0.25, 0.75) ? homeScoring : awayScoring;
    const method = rng();
    if (method < 0.09) golden.tries++;
    else if (method < 0.17) golden.penalties++;
    else if (method < 0.19) golden.longFieldGoals++;
    else golden.fieldGoals++;
  }
  return { ...fixture, homeScoring, awayScoring, homeScore: scoreOf(homeScoring), awayScore: scoreOf(awayScoring), extraTime };
}

function advanceRound(state: NrlManagerState): NrlManagerState {
  const fixtures = nrlRoundFixtures(state);
  const played = fixtures.some(match => match.homeId === state.clubId || match.awayId === state.clubId);
  const starters = new Set(Object.values(state.lineup));
  const squad = state.squad.map(player => {
    const before = readyFitness(player.fitness, state.preparation, played);
    return { ...player, fitness: Math.max(0, before - (played && starters.has(player.id) ? 15 : 0)) };
  });
  const results = [...state.results, ...fixtures.map(fixture => playFixture(state, fixture))];
  const championId = premierOf(FINALS, finalsOutcomes(results))?.winner ?? null;
  const round = Math.min(state.round + 1, lastRound(state.year));
  return {
    ...state, round, squad, results, championId, preparation: null,
    phase: championId ? 'complete' : round > nrlRegularRounds(state.year) ? 'finals' : 'regular',
  };
}

export function reduceNrlSeason(state: NrlManagerState, action: NrlAction): NrlManagerState {
  if (state.phase === 'complete') return state;
  switch (action.type) {
    case 'selectStarter':
      if (state.lineup[action.role] === action.playerId
        || !state.squad.some(player => player.id === action.playerId && player.role === action.role)) return state;
      return { ...state, lineup: { ...state.lineup, [action.role]: action.playerId } };
    case 'setTactic':
      return NRL_TACTICS.includes(action.tactic) && state.tactic !== action.tactic ? { ...state, tactic: action.tactic } : state;
    case 'prepare':
      return (action.choice === 'train' || action.choice === 'recover') && state.preparation !== action.choice
        ? { ...state, preparation: action.choice } : state;
    case 'advance':
      return advanceRound(state);
  }
}

const integerIn = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
function validScoring(value: unknown): value is NrlScoring {
  return record(value) && integerIn(value.tries, 0, 21) && integerIn(value.conversions, 0, value.tries)
    && integerIn(value.penalties, 0, 3) && integerIn(value.fieldGoals, 0, 2) && integerIn(value.longFieldGoals, 0, 2);
}

function validResult(value: unknown, expected: NrlFixture): value is NrlMatchResult {
  return record(value) && value.homeId === expected.homeId && value.awayId === expected.awayId
    && value.round === expected.round && value.tieId === expected.tieId && value.finalsRound === expected.finalsRound
    && validScoring(value.homeScoring) && value.homeScore === scoreOf(value.homeScoring)
    && validScoring(value.awayScoring) && value.awayScore === scoreOf(value.awayScoring)
    && typeof value.extraTime === 'boolean' && (value.homeScore !== value.awayScore || (!expected.tieId && value.extraTime));
}

export function isNrlManagerState(value: unknown): value is NrlManagerState {
  if (!record(value) || value.version !== 1 || (value.year !== 2026 && value.year !== 2027)
    || typeof value.clubId !== 'string' || !clubFor(value.year, value.clubId)
    || !integerIn(value.seed, 0, 0xffffffff) || !integerIn(value.round, 1, lastRound(value.year))
    || !NRL_TACTICS.includes(value.tactic as NrlTactic)
    || (value.preparation !== null && value.preparation !== 'train' && value.preparation !== 'recover')
    || !Array.isArray(value.squad) || !record(value.lineup) || !Array.isArray(value.results)) return false;
  const { year, round, phase, preparation, squad, lineup, results } = value;
  const regularRounds = nrlRegularRounds(year);
  const expectedPhase = phase === 'complete' && round === lastRound(year) ? 'complete'
    : round > regularRounds ? 'finals' : 'regular';
  if (phase !== expectedPhase || (phase === 'complete' && preparation !== null)) return false;

  const expectedSquad = createNrlSeason(value.clubId, value.seed, year).squad;
  if (squad.length !== expectedSquad.length || !expectedSquad.every((expected, index) => {
    const player: unknown = squad[index];
    return record(player) && player.id === expected.id && player.name === expected.name && player.role === expected.role
      && player.rating === expected.rating && integerIn(player.fitness, 0, 100);
  })) return false;
  if (!NRL_ROLES.every(role => expectedSquad.some(player => player.role === role && player.id === lineup[role]))) return false;

  const completed = phase === 'complete' ? round : round - 1;
  const verified: NrlMatchResult[] = [];
  for (let playedRound = 1; playedRound <= completed; playedRound++) {
    const fixtures = nrlRoundFixtures({
      year, round: playedRound, phase: playedRound <= regularRounds ? 'regular' : 'finals', results: verified,
    });
    for (const fixture of fixtures) {
      const match: unknown = results[verified.length];
      if (!validResult(match, fixture)) return false;
      verified.push(match);
    }
  }
  return verified.length === results.length && value.championId === (premierOf(FINALS, finalsOutcomes(verified))?.winner ?? null);
}

export function readNrlSave(raw: string | null): NrlManagerState | null {
  if (!raw || raw.length > 160_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isNrlManagerState(value) ? value : null;
  } catch {
    return null;
  }
}
