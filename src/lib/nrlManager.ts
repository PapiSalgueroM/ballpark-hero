import { isNrlOpeningYear, nrlSeasonPlan, NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import { clamp, clampi, hashLabel, rngFrom } from '@/lib/careerEngine';
import { eliminated, premierOf, resolveWeek, type FinalsTie, type TieOutcome } from '@/lib/finalsBracket';
import { uniqueName } from '@/lib/foNames';
import { makeNrlInterchangeScoringReport, makeNrlScoringReport, nrlScorePoints as scoreOf, validNrlScoringReport, type NrlMatchScoringReport } from '@/lib/nrlPlayerScoring';
import { isNrlJudiciary, judiciaryNeedsResponse, nrlJudiciaryBannedBefore, nrlJudiciaryBans, validNrlJudiciary, type NrlJudiciary } from '@/lib/nrlJudiciary';

export type { NrlYear } from '@/data/nrlManager2026';

export const NRL_SAVE_KEY = 'nrl-manager-save-v1';
export const NRL_REGULAR_ROUNDS = nrlSeasonPlan(2026).draw.length;
export const nrlRegularRounds = (year: number): number => nrlSeasonPlan(year).draw.length;
export const NRL_ROLES = [
  'Fullback', 'Left Wing', 'Left Centre', 'Right Centre', 'Right Wing',
  'Five-eighth', 'Halfback', 'Prop 8', 'Hooker', 'Prop 10', 'Left Second Row', 'Right Second Row', 'Lock',
] as const;
export const NRL_TACTICS = ['balanced', 'attack', 'defense'] as const;
const NRL_SPECIALIST_PLANS = ['middle', 'wide'] as const;
export const NRL_ATTACK_PLANS = [...NRL_SPECIALIST_PLANS, 'counter'] as const;
export const NRL_BENCH_SIZE = 6;
export const NRL_RESERVE_GRADE_ROUNDS = 4;
export const NRL_MAX_BENCH_USED = 4;
export const NRL_FINALS_SPOTS = 8;
export const NRL_COACHING_BONUS = 2;
export const NRL_QUALIFIED_COACHING_BONUS = 3;
export const NRL_CAPTAIN_DEFENCE = 1;
const MAX_INJURY_ROUNDS = 4;
const UTILITY_RATING_COST = 12;
const GOLDEN_POINT_SCORE_CHANCE = 0.78;
// Split the existing probability using the same scoring chance in each five-minute period.
const FIRST_GOLDEN_POINT_SCORE_CHANCE = 1 - Math.sqrt(1 - GOLDEN_POINT_SCORE_CHANCE);
const GOLDEN_POINT_VALUES = { tries: 4, penalties: 2, longFieldGoals: 2, fieldGoals: 1 } as const;

export type NrlRole = typeof NRL_ROLES[number];
export type NrlTactic = typeof NRL_TACTICS[number];
type NrlSpecialistPlan = typeof NRL_SPECIALIST_PLANS[number];
type NrlActiveAttackPlan = typeof NRL_ATTACK_PLANS[number];
export type NrlAttackPlan = 'standard' | NrlActiveAttackPlan;
type NrlOpponentStyle = 'middle' | 'edges';
export type NrlCoachRole = Exclude<NrlTactic, 'balanced'>;
export type NrlPreparation = 'train' | 'recover' | 'defensiveDrills';
export const NRL_HALFTIME_TALKS = {
  reinforceBasics: { attack: -1, defense: 3 },
  liftTempo: { attack: 3, defense: -1 },
} as const;
export type NrlHalftimeTalk = keyof typeof NRL_HALFTIME_TALKS;
type NrlPreparationAction =
  | { type: 'prepare'; choice: 'train' | 'recover' }
  | { type: 'prepare'; choice: 'defensiveDrills' | null; year: number; clubId: string; round: number };
interface NrlRoundOptions {
  medicalReduction?: number;
  coachRole?: NrlCoachRole;
  coachBonus?: number;
  planRivalRatings?: ReadonlyMap<NrlRole, number>;
}

export interface NrlPlayer { id: string; name: string; role: NrlRole; rating: number; fitness: number; secondaryRole?: NrlRole }
interface NrlReserveGradeSpell { playerId: string; startedRound: number; startingRating: number; recalledRound?: number }

const RETRAINING_ROLES: Partial<Record<NrlRole, readonly NrlRole[]>> = {
  Fullback: ['Left Wing', 'Right Wing'],
  'Left Wing': ['Fullback', 'Left Centre', 'Right Wing'],
  'Right Wing': ['Fullback', 'Left Wing', 'Right Centre'],
  'Left Centre': ['Left Wing'],
  'Right Centre': ['Right Wing'],
  'Five-eighth': ['Halfback'],
  Halfback: ['Five-eighth'],
  'Prop 8': ['Prop 10'],
  'Prop 10': ['Prop 8'],
  'Left Second Row': ['Right Second Row', 'Lock'],
  'Right Second Row': ['Left Second Row', 'Lock'],
  Lock: ['Left Second Row', 'Right Second Row'],
};
export const nrlRetrainingRoles = (role: NrlRole): readonly NrlRole[] => RETRAINING_ROLES[role] ?? [];
export const nrlCanPlayRole = (player: Pick<NrlPlayer, 'role' | 'secondaryRole'>, role: NrlRole) =>
  player.role === role || player.secondaryRole === role;
export interface NrlFixture { homeId: string; awayId: string; round: number; finalsRound?: number; tieId?: string }
export interface NrlScoring { tries: number; conversions: number; penalties: number; fieldGoals: number; longFieldGoals: number }
export interface NrlHalftimeInterchange { starterId: string; reserveId: string }
interface NrlHalftimeChoice {
  tactic: NrlTactic; interchange?: NrlHalftimeInterchange; secondInterchange?: NrlHalftimeInterchange; talk?: NrlHalftimeTalk;
}
interface NrlLiveMinute60 extends NrlHalftimeChoice { homeScoring: NrlScoring; awayScoring: NrlScoring }
export interface NrlLiveHalf {
  fixture: NrlFixture; homeScoring: NrlScoring; awayScoring: NrlScoring; heldReserveId?: string; minute60?: NrlLiveMinute60;
}
interface NrlHalftimeReceipt extends NrlHalftimeInterchange { enteredAtHalf?: true }
interface NrlHalftimeOption extends NrlHalftimeReceipt { role: NrlRole }
interface NrlHalftimeDecision {
  live: NrlLiveHalf; tactic: NrlTactic; interchanges: NrlHalftimeOption[]; talk?: NrlHalftimeTalk;
  lateTactic?: NrlTactic; lateInterchange?: NrlHalftimeInterchange & { role: NrlRole };
}
export interface NrlInjury { playerId: string; rounds: number }
type NrlGoldenScore = keyof typeof GOLDEN_POINT_VALUES;
type NrlGoldenPoint = 'draw' | { period: 1 | 2; score: NrlGoldenScore };
type NrlScorePair = [home: number, away: number];
interface NrlScorePeriods {
  halfTime: NrlScorePair;
  at60?: NrlScorePair;
  regulation: NrlScorePair;
}
export interface NrlMatchResult extends NrlFixture {
  homeScore: number;
  awayScore: number;
  homeScoring: NrlScoring;
  awayScoring: NrlScoring;
  extraTime: boolean;
  goldenPoint?: NrlGoldenPoint;
  scorePeriods?: NrlScorePeriods;
  benchUsed?: string[];
  injury?: NrlInjury;
  playerScoring?: NrlMatchScoringReport;
  halftimeInterchange?: NrlHalftimeReceipt;
  secondHalftimeInterchange?: NrlHalftimeReceipt;
  halftimeTalk?: NrlHalftimeTalk;
  minute60Tactic?: NrlTactic;
  minute60Interchange?: NrlHalftimeInterchange;
  individualRecoveryId?: string;
  counterStyle?: NrlOpponentStyle;
  captainId?: string;
}
export interface NrlFinalsArchive {
  seeds: string[];
  scores: [number, number][]; // Home and away scores in the nine-tie preset order.
}
export interface NrlSavedLineup {
  year: number;
  lineup: Record<NrlRole, string>;
  bench: string[];
  kickerId: string;
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
type NrlFormResult = 'W' | 'D' | 'L';
interface NrlClubForm {
  recent: NrlFormResult[];
  home: Record<NrlFormResult, number>;
  away: Record<NrlFormResult, number>;
}
export interface NrlManagerState {
  version: 1;
  seed: number;
  year: number;
  clubId: string;
  phase: 'regular' | 'finals' | 'complete';
  round: number;
  squad: NrlPlayer[];
  lineup: Record<NrlRole, string>;
  bench?: string[];
  injuryTracking?: true;
  kickerId?: string;
  backupKickerId?: string;
  captainId?: string;
  tactic: NrlTactic;
  attackPlan?: NrlActiveAttackPlan;
  preparation: NrlPreparation | null;
  individualRecoveryId?: string;
  results: NrlMatchResult[];
  championId: string | null;
  live?: NrlLiveHalf;
  reserveGrade?: NrlReserveGradeSpell;
  judiciary?: NrlJudiciary;
}
type NrlHalftimeAction<Type> = { type: Type; year: number; round: number } & NrlHalftimeChoice;
export type NrlAction =
  | { type: 'selectStarter'; role: NrlRole; playerId: string }
  | { type: 'selectBench'; slot: number; playerId: string }
  | { type: 'setKicker'; playerId: string }
  | { type: 'setBackupKicker'; playerId: string | null; year: number; clubId: string; round: number }
  | { type: 'setCaptain'; playerId: string | null; year: number; clubId: string; round: number }
  | { type: 'applyFitLineup'; previewKey: string }
  | { type: 'setTactic'; tactic: NrlTactic }
  | NrlPreparationAction
  | { type: 'setIndividualRecovery'; playerId: string | null; year: number; clubId: string; round: number }
  | { type: 'startLive'; hold?: { year: number; round: number; reserveId: string } }
  | NrlHalftimeAction<'finishLive'> | NrlHalftimeAction<'reachMinute60'>
  | { type: 'finishMinute60'; year: number; round: number; tactic: NrlTactic; reserveId?: string }
  | { type: 'advance' };

const lastRound = (year: number) => nrlRegularRounds(year) + 4;
const clubFor = (year: number, clubId: string) => nrlSeasonPlan(year).clubs.find(club => club.id === clubId);

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

export function createNrlSeason(clubId: string, seed: number, year = 2026): NrlManagerState {
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
  const rows = nrlSeasonPlan(state.year).clubs.map(({ id }) => ({
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

export function nrlFinalsRace(state: Pick<NrlManagerState, 'year' | 'round' | 'phase' | 'clubId' | 'results'>, ladder?: NrlLadderRow[]) {
  const { draw } = nrlSeasonPlan(state.year);
  if (state.phase !== 'regular' || state.round <= draw.length - 4 || state.round > draw.length) return null;
  const rows = ladder ?? nrlLadder(state);
  const rounds = draw.slice(state.round - 1);
  const points = rows.map(row => ({
    clubId: row.clubId,
    minimum: row.points + 2 * rounds.filter(fixtures => !fixtures.some(pair => pair.includes(row.clubId))).length,
    maximum: row.points + 2 * rounds.length,
  }));
  const club = points.find(row => row.clubId === state.clubId);
  if (!club) return null;
  const rivals = points.filter(row => row.clubId !== state.clubId);
  const status = (places: number) => {
    // Equal points may still be decided by differential and the other ladder tie-breaks.
    if (rivals.filter(row => row.maximum >= club.minimum).length < places) return 'secured';
    if (rivals.filter(row => row.minimum > club.maximum).length >= places) return 'out';
    return 'open';
  };
  return {
    minimum: club.minimum,
    maximum: club.maximum,
    topFour: status(4),
    topEight: status(NRL_FINALS_SPOTS),
    remaining: rounds.map((fixtures, index) => {
      const fixture = fixtures.find(pair => pair.includes(state.clubId));
      const opponentId = fixture ? fixture[fixture[0] === state.clubId ? 1 : 0] : null;
      const rank = rows.findIndex(row => row.clubId === opponentId) + 1;
      return { round: state.round + index, opponentId, home: fixture ? fixture[0] === state.clubId : null,
        nearCut: rank >= NRL_FINALS_SPOTS - 1 && rank <= NRL_FINALS_SPOTS + 2 };
    }),
  };
}

export function nrlLeagueForm({ year, results }: Pick<NrlManagerState, 'year' | 'results'>) {
  const { clubs, draw } = nrlSeasonPlan(year);
  const form = new Map<string, NrlClubForm>(clubs.map(({ id }) => [id, {
    recent: [], home: { W: 0, D: 0, L: 0 }, away: { W: 0, D: 0, L: 0 },
  }]));
  for (const { round, homeId, awayId, homeScore, awayScore } of results) {
    if (round > draw.length) continue;
    const home = form.get(homeId)!;
    const away = form.get(awayId)!;
    const homeResult = homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D';
    const awayResult = awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D';
    home.home[homeResult]++;
    away.away[awayResult]++;
    home.recent.push(homeResult);
    away.recent.push(awayResult);
    if (home.recent.length > 5) home.recent.shift();
    if (away.recent.length > 5) away.recent.shift();
  }
  return form;
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
  if (phase === 'regular') return (nrlSeasonPlan(year).draw[round - 1] ?? []).map(([homeId, awayId]) => ({ homeId, awayId, round }));
  const finalsRound = round - nrlRegularRounds(year);
  const seeds = nrlLadder(state).slice(0, NRL_FINALS_SPOTS).map(row => row.clubId);
  const pairings = resolveWeek(FINALS, seeds, finalsOutcomes(results), finalsRound);
  return (pairings ?? []).map(({ id, homeId, awayId }) => ({ homeId, awayId, round, finalsRound, tieId: id }));
}

export function nrlFinalsEliminated(state: NrlManagerState): Set<string> {
  if (state.phase === 'regular') return new Set();
  const seeds = nrlLadder(state).map(row => row.clubId);
  return eliminated(FINALS, seeds, 8, finalsOutcomes(state.results));
}

export const NRL_FINALS_ROUND_TITLES = ['Qualifying and elimination finals', 'Semi-finals', 'Preliminary finals', 'Grand final'] as const;
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
  return { round, finalsRound, title: NRL_FINALS_ROUND_TITLES[finalsRound - 1], fixtures, clubMatch, clubStatus };
}

type NrlInjuryClock = Pick<NrlManagerState, 'round' | 'phase' | 'results' | 'injuryTracking'>;

export function nrlInjuries(state: NrlInjuryClock): Map<string, number> {
  const injuries = new Map<string, number>();
  if (!state.injuryTracking) return injuries;
  const upcoming = state.round + Number(state.phase === 'complete');
  for (const result of state.results) {
    if (!result.injury) continue;
    const remaining = result.round + result.injury.rounds + 1 - upcoming;
    if (remaining > 0) injuries.set(result.injury.playerId, remaining);
  }
  return injuries;
}

type NrlAvailability = NrlInjuryClock & Pick<NrlManagerState, 'reserveGrade' | 'judiciary' | 'year' | 'clubId' | 'seed'>;

export function nrlReserveGradeRemaining({ reserveGrade, round }: Pick<NrlManagerState, 'reserveGrade' | 'round'>): number {
  return reserveGrade && reserveGrade.recalledRound === undefined
    ? Math.max(0, reserveGrade.startedRound + NRL_RESERVE_GRADE_ROUNDS - round) : 0;
}

export function nrlUnavailable(state: NrlAvailability): Map<string, number> {
  const unavailable = nrlInjuries(state);
  const remaining = nrlReserveGradeRemaining(state);
  if (remaining && state.reserveGrade) unavailable.set(state.reserveGrade.playerId, remaining);
  if (state.judiciary) {
    for (const [id, matches] of nrlJudiciaryBans(state)) {
      unavailable.set(id, Math.max(matches, unavailable.get(id) ?? 0));
    }
  }
  return unavailable;
}

export function nrlIndividualRecoveryOptions(state: NrlManagerState): NrlPlayer[] {
  if (!state.injuryTracking || !state.kickerId || !state.bench || state.live || state.preparation === 'recover'
    || !nrlNextRound(state).clubMatch) return [];
  const unavailable = nrlUnavailable(state);
  return state.squad.filter(player => !unavailable.has(player.id));
}

function clearIndividualRecovery(state: NrlManagerState): NrlManagerState {
  if (state.individualRecoveryId === undefined) return state;
  const { individualRecoveryId: _cleared, ...next } = state;
  return next;
}

export function nrlStarterOptions(state: NrlManagerState, role: NrlRole): NrlPlayer[] {
  const unavailable = nrlUnavailable(state);
  const occupied = new Set(Object.values(state.lineup));
  occupied.delete(state.lineup[role]);
  const eligible = state.squad.filter(player => !unavailable.has(player.id) && !occupied.has(player.id));
  const qualified = eligible.filter(player => nrlCanPlayRole(player, role));
  if (!state.injuryTracking || eligible.some(player => player.role === role)) return qualified;
  const current = eligible.find(player => player.id === state.lineup[role]);
  return qualified.length ? [...qualified, ...(current && !nrlCanPlayRole(current, role) ? [current] : [])] : eligible;
}

export function nrlCaptainInLineup({ captainId, lineup }: Pick<NrlManagerState, 'captainId' | 'lineup'>) {
  return captainId !== undefined && Object.values(lineup).includes(captainId);
}

/** Keep eligible selections in order and fill empty places with coverage for different positions. */
export function nrlBench(state: NrlAvailability & Pick<NrlManagerState, 'squad' | 'lineup' | 'bench'>): string[] {
  const starters = new Set(Object.values(state.lineup));
  const unavailable = nrlUnavailable(state);
  const reserves = state.squad.filter(player => !starters.has(player.id) && !unavailable.has(player.id));
  const byId = new Map(reserves.map(player => [player.id, player]));
  const bench = [...new Set((state.bench ?? []).filter(id => byId.has(id)))].slice(0, NRL_BENCH_SIZE);
  if (bench.length === NRL_BENCH_SIZE) return bench;
  reserves.sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
  const covered = new Set(bench.map(id => byId.get(id)!.role));
  for (const player of reserves) {
    if (bench.length === NRL_BENCH_SIZE) break;
    if (covered.has(player.role)) continue;
    bench.push(player.id);
    covered.add(player.role);
  }
  for (const player of reserves) {
    if (bench.length === NRL_BENCH_SIZE) break;
    if (!bench.includes(player.id)) bench.push(player.id);
  }
  return bench;
}

function withLineup(state: NrlManagerState, lineup: NrlManagerState['lineup']): NrlManagerState {
  const starters = Object.values(lineup);
  if (!state.kickerId || starters.includes(state.kickerId)) return { ...state, lineup };
  const backup = state.backupKickerId;
  return { ...state, lineup, kickerId: backup && starters.includes(backup) ? backup : lineup.Halfback };
}

export function repairMatchday(state: NrlManagerState, preferFit = false): NrlManagerState {
  const unavailable = nrlUnavailable(state);
  if (state.individualRecoveryId && unavailable.has(state.individualRecoveryId)) state = clearIndividualRecovery(state);
  const healthy = state.squad.filter(player => !unavailable.has(player.id));
  const byId = new Map(healthy.map(player => [player.id, player]));
  const grade = (player: NrlPlayer) => player.rating - fitnessPenalty(player, playerPreparation(state, player.id));
  if (preferFit) healthy.sort((a, b) => grade(b) - grade(a) || a.id.localeCompare(b.id));
  else {
    const benchRank = new Map(state.bench?.map((id, index) => [id, index]));
    healthy.sort((a, b) => (benchRank.get(a.id) ?? NRL_BENCH_SIZE) - (benchRank.get(b.id) ?? NRL_BENCH_SIZE)
      || b.rating - a.rating || a.id.localeCompare(b.id));
  }
  const pick = (previous: NrlPlayer | undefined, eligible: (player: NrlPlayer) => boolean) => {
    if (previous && !preferFit) return previous;
    const best = healthy.find(eligible);
    return !previous || (best && grade(best) > grade(previous)) ? best : previous;
  };
  const lineup = { ...state.lineup };
  // Retain an explicit trained selection before filling native positions.
  const trainedStarts = new Set(NRL_ROLES.filter(role => byId.get(lineup[role])?.secondaryRole === role));
  const selected = new Set([...trainedStarts].map(role => lineup[role]));
  const uncovered: NrlRole[] = [];
  for (const role of NRL_ROLES) {
    if (trainedStarts.has(role)) continue;
    const previous = byId.get(lineup[role]);
    const natural = pick(previous?.role === role ? previous : undefined, player => player.role === role && !selected.has(player.id));
    if (natural) {
      lineup[role] = natural.id;
      selected.add(natural.id);
    } else uncovered.push(role);
  }
  for (const role of uncovered) {
    const previous = byId.get(lineup[role]);
    const cover = pick(previous && !selected.has(previous.id) ? previous : undefined, player => !selected.has(player.id))!;
    lineup[role] = cover.id;
    selected.add(cover.id);
  }
  const repaired = withLineup(state, lineup);
  return { ...repaired, bench: nrlBench(repaired) };
}

function lineupChanges(from: NrlManagerState['lineup'], to: NrlManagerState['lineup']) {
  return NRL_ROLES.flatMap(role => from[role] === to[role] ? [] : [{ role, fromId: from[role], toId: to[role] }]);
}

export function nrlFitLineup(state: NrlManagerState) {
  if (state.live || state.phase === 'complete' || !nrlNextRound(state).clubMatch) return null;
  const next = repairMatchday(state, true);
  const changes = lineupChanges(state.lineup, next.lineup);
  const key = JSON.stringify([state.seed, state.clubId, state.year, state.round, state.preparation, state.lineup, state.bench, state.kickerId,
    ...(state.squad.some(player => player.secondaryRole) ? [next.lineup, next.bench, next.kickerId] : []),
    ...(state.individualRecoveryId ? [state.individualRecoveryId] : []),
    ...(state.backupKickerId ? ['backup-kicker', state.backupKickerId] : [])]);
  return { next, changes, key };
}

export function nrlMatchdaySelection(state: NrlManagerState): NrlSavedLineup | null {
  if (!state.kickerId || state.live || state.phase === 'complete' || !nrlNextRound(state).clubMatch) return null;
  return { year: state.year, lineup: { ...state.lineup }, bench: nrlBench(state), kickerId: state.kickerId };
}

export function nrlSavedLineupPreview(state: NrlManagerState, saved: NrlSavedLineup) {
  const current = nrlMatchdaySelection(state);
  if (!current || saved.year !== state.year) return null;
  const { lineup, bench, kickerId } = saved;
  const next = repairMatchday({ ...state, lineup, bench, kickerId });
  const changes = lineupChanges(current.lineup, next.lineup);
  const benchChanged = current.bench.some((id, slot) => id !== next.bench![slot]);
  const kickerChanged = current.kickerId !== next.kickerId;
  const replacements = lineupChanges(lineup, next.lineup).length + bench.filter(id => !next.bench!.includes(id)).length;
  const key = JSON.stringify([state.seed, state.clubId, state.round, current, saved, next.lineup, next.bench, next.kickerId,
    ...(state.backupKickerId ? [state.backupKickerId] : [])]);
  return { next, changes, benchChanged, kickerChanged, replacements, key, changed: Boolean(changes.length || benchChanged || kickerChanged) };
}

// Six may be named. Quick sim gives up to four listed reserves a spell in
// their position and lets the starter return, representing up to eight changes.
// https://www.nrl.com/news/2026/02/04/strategic-element-new-rules-to-create-exciting-new-role-for-young-stars/
type NrlRoundPreparation = Pick<NrlManagerState, 'preparation' | 'individualRecoveryId'>;
type NrlSelectedSquad = NrlRoundPreparation & Pick<NrlManagerState, 'squad' | 'lineup' | 'bench'>;

export function nrlBenchRotation(state: NrlSelectedSquad, heldReserveId?: string): Map<string, NrlPlayer> {
  const rotation = new Map<string, NrlPlayer>();
  const heldRole = heldReserveId && state.squad.find(player => player.id === heldReserveId)?.role;
  const limit = NRL_MAX_BENCH_USED - Number(Boolean(heldRole));
  for (const id of state.bench ?? []) {
    if (rotation.size === limit) break;
    const player = state.squad.find(reserve => reserve.id === id)!;
    const starterId = state.lineup[player.role];
    if (player.role !== heldRole && !rotation.has(starterId)) rotation.set(starterId, player);
  }
  return rotation;
}

export function nrlHoldableReserves(state: NrlManagerState): NrlPlayer[] {
  if (!state.kickerId || !state.bench) return [];
  const unavailable = nrlUnavailable(state);
  return state.bench.flatMap(id => {
    const reserve = state.squad.find(player => player.id === id);
    return reserve && state.lineup[reserve.role] !== state.kickerId && !unavailable.has(id) ? [reserve] : [];
  });
}

export function nrlHalftimeInterchanges(state: NrlManagerState): NrlHalftimeOption[] {
  if (!state.live || !state.kickerId) return [];
  const { heldReserveId } = state.live;
  const options: NrlHalftimeOption[] = [...nrlBenchRotation(state, heldReserveId)].filter(([starterId]) => starterId !== state.kickerId)
    .map(([starterId, reserve]) => ({ starterId, reserveId: reserve.id, role: reserve.role }));
  const held = heldReserveId && nrlHoldableReserves(state).find(player => player.id === heldReserveId);
  if (held) options.push({ starterId: state.lineup[held.role], reserveId: held.id, role: held.role, enteredAtHalf: true });
  return options;
}

export function nrlMinute60Interchange(state: NrlManagerState) {
  const live = state.live;
  if (!live?.minute60 || !live.heldReserveId
    || [live.minute60.interchange, live.minute60.secondInterchange].some(change => change?.reserveId === live.heldReserveId)) return;
  const held = nrlHoldableReserves(state).find(player => player.id === live.heldReserveId);
  if (held) return { starterId: state.lineup[held.role], reserveId: held.id, role: held.role };
}

const TACTIC_EFFECT: Record<NrlTactic, { attack: number; defense: number }> = {
  balanced: { attack: 0, defense: 0 },
  attack: { attack: 5, defense: -3 },
  defense: { attack: -2, defense: 5 },
};
const PREPARATION_FITNESS = { train: -4, defensiveDrills: -4, recover: 10, normal: 0 };
const isTraining = (preparation: NrlPreparation | null) => preparation === 'train' || preparation === 'defensiveDrills';
function readyFitness(fitness: number, preparation: NrlPreparation | null, playing: boolean): number {
  const routineRecovery = Math.ceil((100 - fitness) * 0.45);
  return clamp(fitness + routineRecovery + PREPARATION_FITNESS[preparation ?? 'normal'] + (playing ? 0 : 12), 0, 100);
}

const playerPreparation = (state: NrlRoundPreparation, id: string): NrlPreparation | null =>
  state.individualRecoveryId === id ? 'recover' : state.preparation;

export function nrlIndividualRecoveryPreview(player: NrlPlayer, preparation: NrlPreparation | null) {
  return { normal: readyFitness(player.fitness, preparation, true), recovery: readyFitness(player.fitness, 'recover', true) };
}

function fitnessPenalty(player: NrlPlayer, preparation: NrlPreparation | null): number {
  return (100 - readyFitness(player.fitness, preparation, true)) * 0.18;
}

function matchInjury(state: NrlManagerState, used: Set<string>, medicalReduction: number): NrlInjury | undefined {
  const starters = new Set(Object.values(state.lineup));
  const played = state.squad.filter(player => starters.has(player.id) || used.has(player.id));
  const ready = played.reduce((total, player) => total + readyFitness(player.fitness, state.preparation, true), 0) / played.length;
  const risk = 0.12 + (100 - ready) / 260 + (isTraining(state.preparation) ? 0.04 : 0);
  const rng = rngFrom(hashLabel(`${state.seed}|${state.year}|${state.round}|${state.clubId}|injury`));
  if (rng() >= risk) return undefined;
  return { playerId: played[Math.floor(rng() * played.length)].id, rounds: Math.max(1, 1 + Math.floor(rng() * MAX_INJURY_ROUNDS) - medicalReduction) };
}

const PLAN_ROLES: Record<NrlSpecialistPlan, readonly NrlRole[]> = {
  middle: ['Prop 8', 'Hooker', 'Prop 10', 'Lock'],
  wide: ['Left Wing', 'Left Centre', 'Right Centre', 'Right Wing'],
};

function addMatchdayRating(sum: number, player: NrlPlayer, role: NrlRole, state: NrlRoundPreparation, reserve?: NrlPlayer): number {
  const rating = nrlCanPlayRole(player, role) ? player.rating : player.rating - UTILITY_RATING_COST;
  const penalty = fitnessPenalty(player, playerPreparation(state, player.id));
  // Keep the original summation order for the ordinary ratings.
  if (!reserve) return sum + rating - penalty;
  return sum + (rating - penalty) * 0.68
    + (reserve.rating - fitnessPenalty(reserve, playerPreparation(state, reserve.id))) * 0.32;
}

function matchdayBase(state: NrlSelectedSquad, rotation: ReadonlyMap<string, NrlPlayer>): number {
  const starters = new Map(Object.entries(state.lineup).map(([role, id]) => [id, role]));
  return state.squad.filter(player => starters.has(player.id)).reduce((sum, player) =>
    addMatchdayRating(sum, player, starters.get(player.id) as NrlRole, state, rotation.get(player.id)), 0) / NRL_ROLES.length;
}

function planAdjustment(state: NrlManagerState, rotation: ReadonlyMap<string, NrlPlayer>, base: number,
  plan: NrlSpecialistPlan, rival: ReadonlyMap<NrlRole, number>) {
  const roles = PLAN_ROLES[plan];
  const players = new Map(state.squad.map(player => [player.id, player]));
  const laneGap = roles.reduce((sum, role) => {
    const id = state.lineup[role];
    return addMatchdayRating(sum, players.get(id)!, role, state, rotation.get(id)) - rival.get(role)!;
  }, 0) / roles.length;
  const rivalBase = [...rival.values()].reduce((sum, rating) => sum + rating, 0) / NRL_ROLES.length;
  return { attack: clamp((laneGap - (base - rivalBase)) * 0.5, -4, 6), defense: -2 };
}

export function nrlPlanAdjustments(state: NrlManagerState, rival: ReadonlyMap<NrlRole, number>) {
  const rotation = nrlBenchRotation(state);
  const base = matchdayBase(state, rotation);
  return { middle: planAdjustment(state, rotation, base, 'middle', rival), wide: planAdjustment(state, rotation, base, 'wide', rival) };
}

export function nrlCounterPlan({ clubId, seed, year }: Pick<NrlManagerState, 'clubId' | 'seed' | 'year'>, fixture: NrlFixture) {
  const rival = fixture.homeId === clubId ? fixture.awayId : fixture.homeId;
  // A club keeps its simulated style for this season without using the match stream.
  const edges = (hashLabel(`nrl-opp-style|${seed}|${year}|${rival}`) >>> 11) & 1;
  return edges ? { style: 'edges' as const, attack: -2, defense: 3 } : { style: 'middle' as const, attack: 3, defense: -2 };
}

function teamRatings(state: NrlManagerState, clubId: string, opponentStrength: ReadonlyMap<string, number> | undefined,
  rotation: ReadonlyMap<string, NrlPlayer>, { coachRole, coachBonus = NRL_COACHING_BONUS, planRivalRatings }: NrlRoundOptions) {
  if (clubId !== state.clubId) {
    const strength = opponentStrength?.get(clubId) ?? clubFor(state.year, clubId)!.strength;
    return { attack: strength, defense: strength };
  }
  const base = matchdayBase(state, rotation);
  const { attack, defense } = TACTIC_EFFECT[state.tactic];
  const attackCoaching = coachRole === 'attack' && state.tactic === 'attack' ? coachBonus : 0;
  const defenseCoaching = coachRole === 'defense' && state.tactic === 'defense' ? coachBonus : 0;
  const ordinary = {
    attack: base + attack + (state.preparation === 'train' ? 7 : 0) + attackCoaching,
    defense: base + defense + (state.preparation === 'defensiveDrills' ? 7 : 0) + defenseCoaching,
  };
  if (nrlCaptainInLineup(state)) ordinary.defense += NRL_CAPTAIN_DEFENCE;
  if (!state.attackPlan || state.attackPlan === 'counter' || !planRivalRatings) return ordinary;
  const specialist = planAdjustment(state, rotation, base, state.attackPlan, planRivalRatings);
  return { attack: ordinary.attack + specialist.attack, defense: ordinary.defense + specialist.defense };
}

function tryChances(rng: () => number, edge: number, chances: number): NrlScoring {
  const scoring: NrlScoring = { tries: 0, conversions: 0, penalties: 0, fieldGoals: 0, longFieldGoals: 0 };
  for (let chance = 0; chance < chances; chance++) {
    const tryRoll = rng();
    const conversionRoll = rng();
    if (tryRoll < clamp(0.204 + edge / 155, 0.065, 0.40)) {
      scoring.tries++;
      if (conversionRoll < clamp(0.76 + edge / 400, 0.62, 0.89)) scoring.conversions++;
    }
  }
  return scoring;
}

function scoringChances(rng: () => number, edge: number, chances: number): NrlScoring {
  const scoring = tryChances(rng, edge, chances);
  if (rng() < (chances === 18 ? 0.21 : 0.04)) scoring.penalties++;
  return scoring;
}

// Saved Origin results replay this calculation, including the order of its RNG draws.
export function scoreNrlRepresentativeMatch(home: NrlSelectedSquad & { tactic: NrlTactic },
  away: NrlSelectedSquad & { tactic: NrlTactic }, rng: () => number, neutral: boolean) {
  const homeBase = matchdayBase(home, nrlBenchRotation(home));
  const awayBase = matchdayBase(away, nrlBenchRotation(away));
  const homeTactic = TACTIC_EFFECT[home.tactic];
  const awayTactic = TACTIC_EFFECT[away.tactic];
  const venue = neutral ? 0 : 2;
  const homeEdge = homeBase + homeTactic.attack - awayBase - awayTactic.defense + venue;
  const awayEdge = awayBase + awayTactic.attack - homeBase - homeTactic.defense - venue;
  const homeScoring = scoringChances(rng, homeEdge, 18);
  const awayScoring = scoringChances(rng, awayEdge, 18);
  const goldenPoint = scoreOf(homeScoring) === scoreOf(awayScoring);
  if (goldenPoint) {
    const winner = rng() < clamp(0.5 + (homeEdge - awayEdge) / 140, 0.25, 0.75) ? homeScoring : awayScoring;
    winner.fieldGoals++;
  }
  return { homeScore: scoreOf(homeScoring), awayScore: scoreOf(awayScoring), goldenPoint };
}

function regulationHalves(rng: () => number, openingEdge: number, closingEdge: number) {
  const first = tryChances(rng, openingEdge, 9);
  const second = tryChances(rng, closingEdge, 9);
  // Keep the same 18 chance pairs and single penalty roll as Quick Sim.
  const penalty = rng();
  if (penalty < 0.105) first.penalties++;
  else if (penalty < 0.21) second.penalties++;
  return { first, second };
}

function regulationStages(rng: () => number, opening: number, middle: number, late: number) {
  const first = tryChances(rng, opening, 9);
  const through60 = tryChances(rng, middle, 5);
  const finish = tryChances(rng, late, 4);
  // Use the same 18 chance pairs and penalty roll as the other match paths.
  const penalty = rng();
  if (penalty < 0.105) first.penalties++;
  else if (penalty < 0.105 + 0.105 * 5 / 9) through60.penalties++;
  else if (penalty < 0.21) finish.penalties++;
  addScoring(through60, first);
  return { first, through60, finish };
}

function addScoring(total: NrlScoring, extra: NrlScoring) {
  total.tries += extra.tries;
  total.conversions += extra.conversions;
  total.penalties += extra.penalties;
}

function fixtureRng(state: NrlManagerState, { round, homeId, awayId }: NrlFixture) {
  return rngFrom(hashLabel(`${state.seed}|${state.year}|${round}|${homeId}|${awayId}`));
}

function fixtureEdges(state: NrlManagerState, fixture: NrlFixture,
  opponentStrength: ReadonlyMap<string, number> | undefined, rotation: ReadonlyMap<string, NrlPlayer>, options: NrlRoundOptions) {
  const { homeId, awayId, tieId } = fixture;
  const home = teamRatings(state, homeId, opponentStrength, rotation, options);
  const away = teamRatings(state, awayId, opponentStrength, rotation, options);
  if (state.attackPlan === 'counter' && (homeId === state.clubId || awayId === state.clubId)) {
    const counter = nrlCounterPlan(state, fixture);
    const managed = homeId === state.clubId ? home : away;
    managed.attack += counter.attack;
    managed.defense += counter.defense;
  }
  const venue = tieId === 'GF' ? 0 : 2;
  return { homeEdge: home.attack - away.defense + venue, awayEdge: away.attack - home.defense - venue };
}

export function nrlMatchupEdges(state: NrlManagerState, fixture: NrlFixture, opponentStrength?: ReadonlyMap<string, number>,
  options: NrlRoundOptions = {}) {
  const { homeEdge, awayEdge } = fixtureEdges(state, fixture, opponentStrength, nrlBenchRotation(state), options);
  return fixture.homeId === state.clubId
    ? { attackEdge: homeEdge, defenseEdge: -awayEdge }
    : { attackEdge: awayEdge, defenseEdge: -homeEdge };
}

function drawHalftime(state: NrlManagerState, fixture: NrlFixture, opponentStrength: ReadonlyMap<string, number> | undefined,
  options: NrlRoundOptions, heldReserveId?: string): NrlLiveHalf {
  const rng = fixtureRng(state, fixture);
  const { homeEdge, awayEdge } = fixtureEdges(state, fixture, opponentStrength, nrlBenchRotation(state, heldReserveId), options);
  const homeScoring = regulationHalves(rng, homeEdge, homeEdge).first;
  const awayScoring = regulationHalves(rng, awayEdge, awayEdge).first;
  return { fixture, homeScoring, awayScoring, ...(heldReserveId && { heldReserveId }) };
}

export function validNrlLiveScore(state: NrlManagerState, opponentStrength?: ReadonlyMap<string, number>, options: NrlRoundOptions = {}): boolean {
  if (!state.live) return true;
  const actual = state.live;
  const expected = drawHalftime(state, actual.fixture, opponentStrength, options, actual.heldReserveId);
  const same = (a: NrlScoring, b: NrlScoring) => a.tries === b.tries && a.conversions === b.conversions && a.penalties === b.penalties;
  if (!same(actual.homeScoring, expected.homeScoring) || !same(actual.awayScoring, expected.awayScoring)) return false;
  if (!actual.minute60) return true;
  const decision = halftimeDecision(state, actual, actual.minute60);
  if (!decision) return false;
  const scores = minute60Scores(state, decision, opponentStrength, options);
  return same(scores.homeScoring, actual.minute60.homeScoring) && same(scores.awayScoring, actual.minute60.awayScoring);
}

function closingSelection(state: NrlManagerState, rotation: ReadonlyMap<string, NrlPlayer>, decision: NrlHalftimeDecision) {
  const lineup = { ...state.lineup };
  const finalRotation = new Map(rotation);
  for (const { role, starterId, reserveId } of decision.interchanges) {
    lineup[role] = reserveId;
    finalRotation.delete(starterId);
  }
  const { lateInterchange, lateTactic } = decision;
  const secondHalf = { ...state, tactic: decision.tactic, lineup };
  const lateState = lateInterchange || lateTactic ? {
    ...secondHalf, tactic: lateTactic ?? decision.tactic,
    lineup: lateInterchange ? { ...lineup, [lateInterchange.role]: lateInterchange.reserveId } : lineup,
  } : undefined;
  return { state: secondHalf, rotation: finalRotation, talk: decision.talk, lateTactic, lateState };
}

function regulationEdges({ homeEdge, awayEdge }: ReturnType<typeof fixtureEdges>, talk: NrlHalftimeTalk | undefined, managedAtHome: boolean) {
  if (!talk) return { homeEdge, awayEdge };
  const { attack, defense } = NRL_HALFTIME_TALKS[talk];
  return { homeEdge: homeEdge + (managedAtHome ? attack : -defense), awayEdge: awayEdge + (managedAtHome ? -defense : attack) };
}

function minute60Scores(state: NrlManagerState, decision: NrlHalftimeDecision, opponentStrength: ReadonlyMap<string, number> | undefined,
  options: NrlRoundOptions) {
  const { fixture, heldReserveId } = decision.live;
  const rotation = nrlBenchRotation(state, heldReserveId);
  const closing = closingSelection(state, rotation, decision);
  const opening = fixtureEdges(state, fixture, opponentStrength, rotation, options);
  const mid = regulationEdges(fixtureEdges(closing.state, fixture, opponentStrength, closing.rotation, options),
    decision.talk, fixture.homeId === state.clubId);
  const rng = fixtureRng(state, fixture);
  const homeScoring = regulationStages(rng, opening.homeEdge, mid.homeEdge, mid.homeEdge).through60;
  const awayScoring = regulationStages(rng, opening.awayEdge, mid.awayEdge, mid.awayEdge).through60;
  return { homeScoring, awayScoring };
}

function playFixture(state: NrlManagerState, fixture: NrlFixture, opponentStrength: ReadonlyMap<string, number> | undefined,
  rotation: ReadonlyMap<string, NrlPlayer>,
  closing: ReturnType<typeof closingSelection> | undefined,
  options: NrlRoundOptions, minute60?: NrlLiveMinute60): NrlMatchResult {
  const { homeId, awayId, finalsRound } = fixture;
  const managed = homeId === state.clubId || awayId === state.clubId;
  const rng = fixtureRng(state, fixture);
  const opening = fixtureEdges(state, fixture, opponentStrength, rotation, options);
  const throughHalf = closing ? fixtureEdges(closing.state, fixture, opponentStrength, closing.rotation, options) : opening;
  const extra = closing?.lateState
    ? fixtureEdges(closing.lateState, fixture, opponentStrength, closing.rotation, options) : throughHalf;
  const { homeEdge, awayEdge } = extra;
  const middle = regulationEdges(throughHalf, closing?.talk, homeId === state.clubId);
  const late = regulationEdges(extra, closing?.talk, homeId === state.clubId);
  const regulation = (openingEdge: number, closingEdge: number, lateEdge: number) => {
    if (!managed) return { total: scoringChances(rng, openingEdge, 18), halfTime: 0 };
    if (closing?.lateState) {
      const { first, through60, finish } = regulationStages(rng, openingEdge, closingEdge, lateEdge);
      addScoring(through60, finish);
      return { total: through60, halfTime: scoreOf(first) };
    }
    const { first, second } = regulationHalves(rng, openingEdge, closingEdge);
    const halfTime = scoreOf(first);
    addScoring(first, second);
    return { total: first, halfTime };
  };
  const home = regulation(opening.homeEdge, middle.homeEdge, late.homeEdge);
  const away = regulation(opening.awayEdge, middle.awayEdge, late.awayEdge);
  const homeScoring = home.total, awayScoring = away.total;
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
  const regulationScore: NrlScorePair = [scoreOf(homeScoring), scoreOf(awayScoring)];
  const extraTime = regulationScore[0] === regulationScore[1];
  if (extraTime && finalsRound) {
    addScoring(homeScoring, scoringChances(rng, homeEdge, 2));
    addScoring(awayScoring, scoringChances(rng, awayEdge, 2));
  }
  const stillTied = scoreOf(homeScoring) === scoreOf(awayScoring);
  const regularRoll = stillTied && !finalsRound ? rng() : undefined;
  const recordGoldenPoint = regularRoll !== undefined && managed && Boolean(state.kickerId);
  let goldenPoint: NrlGoldenPoint | undefined = recordGoldenPoint ? 'draw' : undefined;
  if (stillTied && (finalsRound || regularRoll < GOLDEN_POINT_SCORE_CHANCE)) {
    const golden = rng() < clamp(0.5 + (homeEdge - awayEdge) / 140, 0.25, 0.75) ? homeScoring : awayScoring;
    const method = rng();
    let score: NrlGoldenScore = 'fieldGoals';
    if (method < 0.09) score = 'tries';
    else if (method < 0.17) score = 'penalties';
    else if (method < 0.19) score = 'longFieldGoals';
    golden[score]++;
    if (recordGoldenPoint) goldenPoint = { period: regularRoll < FIRST_GOLDEN_POINT_SCORE_CHANCE ? 1 : 2, score };
  }
  const result: NrlMatchResult = {
    ...fixture, homeScoring, awayScoring, homeScore: scoreOf(homeScoring), awayScore: scoreOf(awayScoring), extraTime,
    ...(goldenPoint ? { goldenPoint } : {}),
    ...(managed && { scorePeriods: { halfTime: [home.halfTime, away.halfTime],
      ...(minute60 && { at60: [scoreOf(minute60.homeScoring), scoreOf(minute60.awayScoring)] }),
      regulation: regulationScore } }),
    ...(closing?.talk ? { halftimeTalk: closing.talk } : {}),
    ...(closing?.lateTactic ? { minute60Tactic: closing.lateTactic } : {}),
  };
  return rotation.size && managed
    ? { ...result, benchUsed: [...rotation.values()].map(player => player.id) }
    : result;
}

function advanceRound(state: NrlManagerState, opponentStrength: ReadonlyMap<string, number> | undefined,
  options: NrlRoundOptions, halftime?: NrlHalftimeDecision): NrlManagerState {
  const { medicalReduction = 0 } = options;
  const fixtures = nrlRoundFixtures(state);
  const played = fixtures.some(match => match.homeId === state.clubId || match.awayId === state.clubId);
  const starters = new Set(Object.values(state.lineup));
  const rotation = played ? nrlBenchRotation(state, halftime?.live.heldReserveId) : new Map<string, NrlPlayer>();
  const used = new Set([...rotation.values()].map(player => player.id));
  const interchanges = halftime?.interchanges ?? [];
  const entering = interchanges.find(change => change.enteredAtHalf);
  const lateInterchange = halftime?.lateInterchange;
  if (entering) used.add(entering.reserveId);
  if (lateInterchange) used.add(lateInterchange.reserveId);
  const closing = halftime && (interchanges.length || halftime.talk || halftime.lateTactic || lateInterchange || halftime.tactic !== state.tactic)
    ? closingSelection(state, rotation, halftime) : undefined;
  const squad = state.squad.map(player => {
    const before = readyFitness(player.fitness, playerPreparation(state, player.id), played);
    const starterFatigue = played && starters.has(player.id) ? 15 : 0;
    const relief = rotation.has(player.id) ? 4 : 0;
    const reserveFatigue = used.has(player.id) ? (player.id === lateInterchange?.reserveId ? 4 : 8) : 0;
    // A previously unused reserve shares the full match equally. A rotating reserve extends their original spell.
    const outgoing = interchanges.find(change => player.id === change.starterId);
    const extraRest = outgoing ? (outgoing.enteredAtHalf ? 7 : 5) : player.id === lateInterchange?.starterId ? 4 : 0;
    const extraWork = interchanges.some(change => !change.enteredAtHalf && player.id === change.reserveId) ? 5 : 0;
    return { ...player, fitness: Math.max(0, before - starterFatigue + relief - reserveFatigue + extraRest - extraWork) };
  });
  const injury = played && state.injuryTracking ? matchInjury(state, used, medicalReduction) : undefined;
  const results = [...state.results, ...fixtures.map(fixture => {
    const managed = fixture.homeId === state.clubId || fixture.awayId === state.clubId;
    const result = playFixture(state, fixture, opponentStrength, rotation, managed ? closing : undefined, options,
      managed ? halftime?.live.minute60 : undefined);
    if (!managed) return result;
    const withInjury = injury ? { ...result, injury } : result;
    if (!state.kickerId) return withInjury;
    const matchReport = {
      ...withInjury,
      ...(state.individualRecoveryId && { individualRecoveryId: state.individualRecoveryId }),
      ...(state.attackPlan === 'counter' && { counterStyle: nrlCounterPlan(state, fixture).style }),
      ...(state.captainId && (starters.has(state.captainId) || lateInterchange?.reserveId === state.captainId
        || interchanges.some(change => change.reserveId === state.captainId))
        && { captainId: state.captainId }),
    };
    const totals = result.homeId === state.clubId ? result.homeScoring : result.awayScoring;
    const starting = NRL_ROLES.map(role => ({ role, id: state.lineup[role] }));
    const attribution = rngFrom(hashLabel(`${state.seed}|${state.year}|${state.round}|${state.clubId}|scorers`));
    if ((interchanges.length || lateInterchange) && halftime && closing) {
      const home = result.homeId === state.clubId;
      const first = home ? halftime.live.homeScoring : halftime.live.awayScoring;
      const closingStarting = NRL_ROLES.map(role => ({ role, id: closing.state.lineup[role] }));
      const mid = halftime.live.minute60;
      const lateLineup = closing.lateState?.lineup;
      const late = lateInterchange && mid && lateLineup ? {
        through60: home ? mid.homeScoring : mid.awayScoring,
        starting: NRL_ROLES.map(role => ({ role, id: lateLineup[role] })),
        rotation: closing.rotation,
      } : undefined;
      const playerScoring = makeNrlInterchangeScoringReport(totals, first, { starting, rotation },
        { starting: closingStarting, rotation: closing.rotation }, state.kickerId, attribution, late);
      const [halftimeInterchange, secondHalftimeInterchange] = interchanges.map(({ starterId, reserveId, enteredAtHalf }) => ({
        starterId, reserveId, ...(enteredAtHalf && { enteredAtHalf }),
      }));
      return {
        ...matchReport, playerScoring, ...(halftimeInterchange && { halftimeInterchange }),
        ...(secondHalftimeInterchange && { secondHalftimeInterchange }),
        ...(lateInterchange && { minute60Interchange: { starterId: lateInterchange.starterId, reserveId: lateInterchange.reserveId } }),
        ...((entering || lateInterchange) && { benchUsed: [...used] }),
      };
    }
    return { ...matchReport, playerScoring: makeNrlScoringReport(totals, starting, rotation, state.kickerId, attribution) };
  })];
  const championId = premierOf(FINALS, finalsOutcomes(results))?.winner ?? null;
  const round = Math.min(state.round + 1, lastRound(state.year));
  const { attackPlan: _playedPlan, individualRecoveryId: _spentRecovery, ...settled } = state;
  const next: NrlManagerState = {
    ...settled, round, squad, results, championId, preparation: null,
    phase: championId ? 'complete' : round > nrlRegularRounds(state.year) ? 'finals' : 'regular',
  };
  return state.injuryTracking ? repairMatchday(next) : next;
}

function halftimeDecision(state: NrlManagerState, live: NrlLiveHalf, choices: NrlHalftimeChoice): NrlHalftimeDecision | null {
  const { tactic, talk, interchange, secondInterchange } = choices;
  if (!NRL_TACTICS.includes(tactic) || (talk !== undefined && !isNrlHalftimeTalk(talk))
    || (secondInterchange !== undefined && interchange === undefined)) return null;
  const available = nrlHalftimeInterchanges(state);
  const interchanges: NrlHalftimeOption[] = [];
  for (const requested of [interchange, secondInterchange]) {
    if (requested === undefined) continue;
    const choice = requested && available.find(option =>
      option.starterId === requested.starterId && option.reserveId === requested.reserveId);
    if (!choice || interchanges.some(first => first.starterId === choice.starterId || first.reserveId === choice.reserveId)) return null;
    interchanges.push(choice);
  }
  return { live, tactic, interchanges, talk };
}

export function reduceNrlSeason(state: NrlManagerState, action: NrlAction,
  opponentStrength?: ReadonlyMap<string, number>, options: NrlRoundOptions = {}): NrlManagerState {
  if (state.phase === 'complete') return state;
  if (state.live && action.type !== 'finishLive' && action.type !== 'reachMinute60' && action.type !== 'finishMinute60') return state;
  switch (action.type) {
    case 'selectStarter': {
      const previous = state.lineup[action.role];
      if (previous === action.playerId
        || !nrlStarterOptions(state, action.role).some(player => player.id === action.playerId)) return state;
      const next = withLineup(state, { ...state.lineup, [action.role]: action.playerId });
      const bench = state.bench?.includes(action.playerId)
        ? state.bench.map(id => id === action.playerId ? previous : id) : state.bench;
      const selected = bench === state.bench ? next : { ...next, bench };
      // Releasing a trained starter can make their native role eligible for repair.
      return state.squad.some(player => player.id === previous && player.secondaryRole === action.role)
        ? repairMatchday(selected) : selected;
    }
    case 'selectBench': {
      if (!state.bench || !integerIn(action.slot, 0, NRL_BENCH_SIZE - 1) || state.bench[action.slot] === action.playerId
        || Object.values(state.lineup).includes(action.playerId) || nrlUnavailable(state).has(action.playerId)
        || !state.squad.some(player => player.id === action.playerId)) return state;
      const bench = state.bench.slice();
      const previousSlot = bench.indexOf(action.playerId);
      if (previousSlot >= 0) bench[previousSlot] = bench[action.slot];
      bench[action.slot] = action.playerId;
      return { ...state, bench };
    }
    case 'setKicker':
      if (!state.kickerId || state.kickerId === action.playerId || !Object.values(state.lineup).includes(action.playerId)) return state;
      return { ...state, kickerId: action.playerId };
    case 'setBackupKicker': {
      const { playerId, year, clubId, round } = action;
      if (!state.kickerId || year !== state.year || clubId !== state.clubId || round !== state.round) return state;
      if (playerId === null) {
        if (!state.backupKickerId) return state;
        const { backupKickerId: _removed, ...next } = state;
        return next;
      }
      if (playerId === state.kickerId || playerId === state.backupKickerId || !Object.values(state.lineup).includes(playerId)) return state;
      return { ...state, backupKickerId: playerId };
    }
    case 'setCaptain': {
      const { year, clubId, round, playerId } = action;
      if (!state.kickerId || year !== state.year || clubId !== state.clubId || round !== state.round) return state;
      if (playerId === null) {
        if (!state.captainId) return state;
        const { captainId: _removed, ...next } = state;
        return next;
      }
      if (playerId === state.captainId || !Object.values(state.lineup).includes(playerId)) return state;
      return { ...state, captainId: playerId };
    }
    case 'applyFitLineup': {
      const proposal = nrlFitLineup(state);
      return proposal?.changes.length && proposal.key === action.previewKey ? proposal.next : state;
    }
    case 'setTactic':
      return NRL_TACTICS.includes(action.tactic) && state.tactic !== action.tactic ? { ...state, tactic: action.tactic } : state;
    case 'prepare': {
      const { choice } = action;
      if (state.preparation === choice) return state;
      if (choice === 'train' || choice === 'recover') {
        return { ...(choice === 'recover' ? clearIndividualRecovery(state) : state), preparation: choice };
      }
      return (choice === 'defensiveDrills' || choice === null) && 'year' in action && state.year === action.year && state.clubId === action.clubId
        && state.round === action.round && state.kickerId && nrlNextRound(state).clubMatch ? { ...state, preparation: choice } : state;
    }
    case 'setIndividualRecovery': {
      const { year, clubId, round, playerId } = action;
      if (year !== state.year || clubId !== state.clubId || round !== state.round) return state;
      if (playerId === null) return clearIndividualRecovery(state);
      if (playerId === state.individualRecoveryId || !nrlIndividualRecoveryOptions(state).some(player => player.id === playerId)) return state;
      return { ...state, individualRecoveryId: playerId };
    }
    case 'startLive': {
      if (!state.kickerId || !state.bench) return state;
      const { clubMatch } = nrlNextRound(state);
      const { hold } = action;
      if (!clubMatch || (hold && (hold.year !== state.year || hold.round !== state.round
        || !nrlHoldableReserves(state).some(player => player.id === hold.reserveId)))) return state;
      return { ...state, live: drawHalftime(state, clubMatch, opponentStrength, options, hold?.reserveId) };
    }
    case 'finishLive':
    case 'reachMinute60':
    case 'finishMinute60': {
      const { live, ...matchday } = state;
      if (!live || action.year !== state.year || action.round !== state.round) return state;
      if (action.type === 'finishMinute60') {
        if (!live.minute60 || !NRL_TACTICS.includes(action.tactic)) return state;
        const decision = halftimeDecision(state, live, live.minute60);
        if (!decision) return state;
        if (action.reserveId !== undefined) {
          const late = nrlMinute60Interchange(state);
          if (!late || late.reserveId !== action.reserveId) return state;
          decision.lateInterchange = late;
        }
        if (action.tactic !== decision.tactic) decision.lateTactic = action.tactic;
        return advanceRound(matchday, opponentStrength, options, decision);
      }
      if (live.minute60) return state;
      const decision = halftimeDecision(state, live, action);
      if (!decision) return state;
      if (action.type === 'finishLive') return advanceRound(matchday, opponentStrength, options, decision);
      const [first, second] = decision.interchanges;
      const minute60 = {
        tactic: decision.tactic, ...minute60Scores(state, decision, opponentStrength, options),
        ...(decision.talk && { talk: decision.talk }),
        ...(first && { interchange: { starterId: first.starterId, reserveId: first.reserveId } }),
        ...(second && { secondInterchange: { starterId: second.starterId, reserveId: second.reserveId } }),
      };
      return { ...state, live: { ...live, minute60 } };
    }
    case 'advance':
      return advanceRound(state, opponentStrength, options);
  }
}

export function simulateNrlSeasonWithoutManager(year: number, seed: number, strengthsForRound: (round: number) => ReadonlyMap<string, number>) {
  // No club uses managed tactics, fatigue, injuries or player attribution.
  let season: NrlManagerState = { ...createNrlSeason(nrlSeasonPlan(year).clubs[0].id, seed, year), clubId: '', squad: [] };
  for (let round = 1; round <= lastRound(year); round++) {
    season = advanceRound(season, strengthsForRound(round), {});
  }
  return season;
}

const integerIn = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNrlHalftimeTalk = (value: unknown): value is NrlHalftimeTalk =>
  value === 'reinforceBasics' || value === 'liftTempo';
function validScoring(value: unknown): value is NrlScoring {
  return record(value) && integerIn(value.tries, 0, 21) && integerIn(value.conversions, 0, value.tries)
    && integerIn(value.penalties, 0, 3) && integerIn(value.fieldGoals, 0, 2) && integerIn(value.longFieldGoals, 0, 2);
}

export function archiveNrlFinals(season: NrlManagerState): NrlFinalsArchive {
  return {
    seeds: nrlLadder(season).slice(0, NRL_FINALS_SPOTS).map(row => row.clubId),
    scores: season.results.filter(match => match.finalsRound !== undefined).map(match => [match.homeScore, match.awayScore]),
  };
}

export function nrlArchivedFinals(value: unknown, year: number) {
  if (!record(value) || !Array.isArray(value.seeds) || !Array.isArray(value.scores)) return null;
  const { seeds, scores } = value;
  const { clubs, draw } = nrlSeasonPlan(year);
  if (seeds.length !== NRL_FINALS_SPOTS || new Set(seeds).size !== seeds.length
    || !seeds.every((id): id is string => clubs.some(club => club.id === id)) || scores.length !== FINALS.length) return null;
  // Match the upper bound of a valid saved score, including finals extra time.
  const maxScore = scoreOf({ tries: 21, conversions: 21, penalties: 3, fieldGoals: 2, longFieldGoals: 2 });
  const outcomes: Record<string, TieOutcome> = {};
  const matches: (NrlFixture & Pick<NrlMatchResult, 'homeScore' | 'awayScore'>)[] = [];
  for (let week = 1; week <= NRL_FINALS_ROUND_TITLES.length; week++) {
    const pairings = resolveWeek(FINALS, seeds, outcomes, week);
    if (!pairings) return null;
    for (const { id, homeId, awayId } of pairings) {
      const pair = scores[matches.length];
      if (!Array.isArray(pair) || pair.length !== 2) return null;
      const [homeScore, awayScore] = pair;
      if (!integerIn(homeScore, 0, maxScore) || !integerIn(awayScore, 0, maxScore) || homeScore === awayScore) return null;
      matches.push({ homeId, awayId, round: draw.length + week, finalsRound: week, tieId: id, homeScore, awayScore });
      outcomes[id] = homeScore > awayScore ? { winner: homeId, loser: awayId } : { winner: awayId, loser: homeId };
    }
  }
  const champion = premierOf(FINALS, outcomes);
  return champion ? { seeds, matches, championId: champion.winner } : null;
}

function validLiveHalf(value: unknown, fixture: NrlFixture | undefined): boolean {
  const partial = (score: unknown, chances: number) => validScoring(score) && score.tries <= chances && score.penalties <= 1
    && score.fieldGoals === 0 && score.longFieldGoals === 0;
  const choice = (swap: unknown) => swap === undefined || (record(swap) && Object.keys(swap).length === 2
    && typeof swap.starterId === 'string' && typeof swap.reserveId === 'string');
  return !!fixture && record(value) && record(value.fixture)
    && value.fixture.homeId === fixture.homeId && value.fixture.awayId === fixture.awayId
    && value.fixture.round === fixture.round && value.fixture.tieId === fixture.tieId && value.fixture.finalsRound === fixture.finalsRound
    && partial(value.homeScoring, 9) && partial(value.awayScoring, 9)
    && (value.heldReserveId === undefined || typeof value.heldReserveId === 'string')
    && (value.minute60 === undefined || (record(value.minute60) && NRL_TACTICS.includes(value.minute60.tactic as NrlTactic)
      && (value.minute60.talk === undefined || isNrlHalftimeTalk(value.minute60.talk))
      && choice(value.minute60.interchange) && choice(value.minute60.secondInterchange)
      && partial(value.minute60.homeScoring, 14) && partial(value.minute60.awayScoring, 14)));
}

function validBenchUse(value: unknown, managed: boolean, byId: Map<string, NrlPlayer>): boolean {
  if (value === undefined) return true;
  if (!managed || !Array.isArray(value) || value.length < 1 || value.length > NRL_MAX_BENCH_USED) return false;
  const roles = value.map(id => typeof id === 'string' ? byId.get(id)?.role : undefined);
  return roles.every(Boolean) && new Set(roles).size === value.length;
}

function validHalftimeInterchange(value: unknown, scoring: NrlMatchScoringReport | undefined,
  benchUsed: string[] | undefined, byId: ReadonlyMap<string, NrlPlayer>): value is NrlHalftimeReceipt {
  if (!scoring || !record(value) || typeof value.starterId !== 'string' || typeof value.reserveId !== 'string'
    || value.starterId === scoring.kickerId || !benchUsed?.includes(value.reserveId)
    || (value.enteredAtHalf !== undefined && (value.enteredAtHalf !== true || benchUsed.at(-1) !== value.reserveId))) return false;
  const role = NRL_ROLES[scoring.starters.indexOf(value.starterId)];
  return !!role && byId.get(value.reserveId)?.role === role;
}

function validHalftimeInterchanges(first: unknown, second: unknown, scoring: NrlMatchScoringReport | undefined,
  benchUsed: string[] | undefined, byId: ReadonlyMap<string, NrlPlayer>): boolean {
  if (first === undefined) return second === undefined;
  if (!validHalftimeInterchange(first, scoring, benchUsed, byId)) return false;
  return second === undefined || (validHalftimeInterchange(second, scoring, benchUsed, byId)
    && first.starterId !== second.starterId && first.reserveId !== second.reserveId
    && !(first.enteredAtHalf && second.enteredAtHalf));
}

function validMinute60Interchange(late: unknown, halftime: unknown[], scoring: NrlMatchScoringReport | undefined,
  benchUsed: string[] | undefined, byId: ReadonlyMap<string, NrlPlayer>): boolean {
  if (late === undefined) return true;
  if (!validHalftimeInterchange(late, scoring, benchUsed, byId) || late.enteredAtHalf !== undefined
    || benchUsed?.at(-1) !== late.reserveId) return false;
  return halftime.every(change => !record(change) || (change.enteredAtHalf === undefined && change.starterId !== late.starterId));
}

function validGoldenPoint(value: unknown, home: NrlScoring, away: NrlScoring): boolean {
  const margin = scoreOf(home) - scoreOf(away);
  if (value === 'draw') return margin === 0;
  if (!record(value) || (value.period !== 1 && value.period !== 2) || typeof value.score !== 'string') return false;
  const score = value.score as NrlGoldenScore;
  const winner = margin > 0 ? home : away;
  return GOLDEN_POINT_VALUES[score] === Math.abs(margin) && winner[score] > 0;
}

function validScorePeriods(value: unknown, home: NrlScoring, away: NrlScoring,
  extraTime: boolean, finals: boolean, requires60: boolean): boolean {
  const pair = (scores: unknown, max: number): scores is NrlScorePair =>
    Array.isArray(scores) && scores.length === 2 && integerIn(scores[0], 0, max) && integerIn(scores[1], 0, max);
  if (!record(value) || !pair(value.halfTime, 56) || !pair(value.regulation, 112)
    || (value.at60 === undefined ? requires60 : !pair(value.at60, 86))) return false;
  const halfTime = value.halfTime, regulation = value.regulation, at60 = value.at60 as NrlScorePair | undefined;
  if (extraTime !== (regulation[0] === regulation[1])) return false;
  const totals = [scoreOf(home), scoreOf(away)];
  const added = totals.map((total, side) => total - regulation[side]);
  return halfTime.every((half, side) => half % 2 === 0
    && (at60
      ? integerIn(at60[side] - half, 0, 32) && at60[side] % 2 === 0 && integerIn(regulation[side] - at60[side], 0, 28)
      : integerIn(regulation[side] - half, 0, 58)))
    && added.every(points => integerIn(points, 0, extraTime ? finals ? 18 : 4 : 0))
    && (finals || [0, 1, 2, 4].includes(added[0] + added[1]) && (added[0] === 0 || added[1] === 0));
}

function validResult(value: unknown, expected: NrlFixture, state: Pick<NrlManagerState, 'clubId' | 'seed' | 'year'>,
  byId: Map<string, NrlPlayer>): value is NrlMatchResult {
  const { clubId } = state;
  const managed = expected.homeId === clubId || expected.awayId === clubId;
  return record(value) && value.homeId === expected.homeId && value.awayId === expected.awayId
    && value.round === expected.round && value.tieId === expected.tieId && value.finalsRound === expected.finalsRound
    && validScoring(value.homeScoring) && value.homeScore === scoreOf(value.homeScoring)
    && validScoring(value.awayScoring) && value.awayScore === scoreOf(value.awayScoring)
    && typeof value.extraTime === 'boolean' && (value.homeScore !== value.awayScore || (!expected.tieId && value.extraTime))
    && (value.scorePeriods === undefined || (managed && validScorePeriods(value.scorePeriods,
      value.homeScoring, value.awayScoring, value.extraTime, Boolean(expected.finalsRound),
      value.minute60Tactic !== undefined || value.minute60Interchange !== undefined)))
    && (value.goldenPoint === undefined || (managed && !expected.finalsRound && value.extraTime
      && value.playerScoring !== undefined && validGoldenPoint(value.goldenPoint, value.homeScoring, value.awayScoring)))
    && validBenchUse(value.benchUsed, managed, byId)
    && (value.halftimeTalk === undefined || (managed && isNrlHalftimeTalk(value.halftimeTalk) && value.playerScoring !== undefined))
    && (value.minute60Tactic === undefined || (managed && NRL_TACTICS.includes(value.minute60Tactic as NrlTactic)
      && value.playerScoring !== undefined))
    && (value.individualRecoveryId === undefined || (managed && typeof value.individualRecoveryId === 'string'
      && byId.has(value.individualRecoveryId) && value.playerScoring !== undefined))
    && (value.counterStyle === undefined || (managed && value.playerScoring !== undefined
      && value.counterStyle === nrlCounterPlan(state, expected).style))
    && (value.injury === undefined || (managed && record(value.injury)
      && typeof value.injury.playerId === 'string' && byId.has(value.injury.playerId)
      && integerIn(value.injury.rounds, 1, MAX_INJURY_ROUNDS)))
    && (value.playerScoring === undefined || (managed && validNrlScoringReport(value.playerScoring,
      expected.homeId === clubId ? value.homeScoring : value.awayScoring, (value.benchUsed as string[] | undefined) ?? [],
      byId, NRL_ROLES.length)))
    && (value.captainId === undefined || (typeof value.captainId === 'string' && managed && value.playerScoring !== undefined
      && ((value.playerScoring as NrlMatchScoringReport).starters.includes(value.captainId)
        || (record(value.halftimeInterchange) && value.halftimeInterchange.reserveId === value.captainId)
        || (record(value.secondHalftimeInterchange) && value.secondHalftimeInterchange.reserveId === value.captainId)
        || (record(value.minute60Interchange) && value.minute60Interchange.reserveId === value.captainId))))
    && validHalftimeInterchanges(value.halftimeInterchange, value.secondHalftimeInterchange, value.playerScoring as NrlMatchScoringReport | undefined,
      value.benchUsed as string[] | undefined, byId)
    && validMinute60Interchange(value.minute60Interchange, [value.halftimeInterchange, value.secondHalftimeInterchange],
      value.playerScoring as NrlMatchScoringReport | undefined, value.benchUsed as string[] | undefined, byId);
}

export function isNrlSeasonProgress(value: unknown): value is NrlManagerState {
  if (!record(value) || value.version !== 1 || !integerIn(value.year, 2026, NRL_LAST_YEAR)
    || typeof value.clubId !== 'string' || !clubFor(value.year, value.clubId)
    || !integerIn(value.seed, 0, 0xffffffff) || !integerIn(value.round, 1, lastRound(value.year))
    || !NRL_TACTICS.includes(value.tactic as NrlTactic)
    || (value.preparation !== null && value.preparation !== 'train' && value.preparation !== 'recover' && value.preparation !== 'defensiveDrills')
    || (value.injuryTracking !== undefined && value.injuryTracking !== true)
    || (value.kickerId !== undefined && typeof value.kickerId !== 'string')
    || !Array.isArray(value.squad) || !record(value.lineup) || !Array.isArray(value.results)) return false;
  const { year, clubId, seed, round, phase, preparation, squad, lineup, bench, results, injuryTracking, kickerId, reserveGrade } = value;
  const judiciary = isNrlJudiciary(value.judiciary) ? value.judiciary : undefined;
  const regularRounds = nrlRegularRounds(year);
  const expectedPhase = phase === 'complete' && round === lastRound(year) ? 'complete'
    : round > regularRounds ? 'finals' : 'regular';
  if (phase !== expectedPhase || (phase === 'complete' && preparation !== null)) return false;
  if (value.attackPlan !== undefined && (!NRL_ATTACK_PLANS.includes(value.attackPlan as NrlActiveAttackPlan)
    || !kickerId || !bench || phase === 'complete')) return false;

  if (squad.length < NRL_ROLES.length || squad.length > 30 || !squad.every((player: unknown) =>
    record(player) && typeof player.id === 'string' && typeof player.name === 'string'
      && NRL_ROLES.includes(player.role as NrlRole) && integerIn(player.rating, 40, 98) && integerIn(player.fitness, 0, 100)
      && (player.secondaryRole === undefined || (injuryTracking && kickerId && nrlRetrainingRoles(player.role as NrlRole).includes(player.secondaryRole as NrlRole))))) return false;
  const byId = new Map<string, NrlPlayer>(squad.map(player => [player.id, player]));
  if (value.backupKickerId !== undefined && (!kickerId || typeof value.backupKickerId !== 'string' || !byId.has(value.backupKickerId))) return false;
  if (value.captainId !== undefined && (!kickerId || typeof value.captainId !== 'string' || !byId.has(value.captainId))) return false;
  if (value.judiciary !== undefined && (!kickerId || !injuryTracking || !judiciary
    || (judiciary.carried && !byId.has(judiciary.carried.playerId)))) return false;
  if (!validReserveGrade(reserveGrade, round, regularRounds, byId, Boolean(injuryTracking && kickerId))) return false;
  const starters = new Set(NRL_ROLES.map(role => lineup[role]));
  if (byId.size !== squad.length || Object.keys(lineup).length !== NRL_ROLES.length || starters.size !== NRL_ROLES.length
    || (kickerId !== undefined && !starters.has(kickerId))
    || ![...starters].every(id => typeof id === 'string' && byId.has(id))) return false;

  const completed = phase === 'complete' ? round : round - 1;
  const verified: NrlMatchResult[] = [];
  const injuredThrough = new Map<string, number>();
  const spellEnd = reserveGrade && (reserveGrade.recalledRound ?? reserveGrade.startedRound + NRL_RESERVE_GRADE_ROUNDS);
  const identity = { year, seed, clubId };
  for (let playedRound = 1; playedRound <= completed; playedRound++) {
    if (reserveGrade?.startedRound === playedRound && (injuredThrough.get(reserveGrade.playerId) ?? 0) >= playedRound) return false;
    const fixtures = nrlRoundFixtures({
      year, round: playedRound, phase: playedRound <= regularRounds ? 'regular' : 'finals', results: verified,
    });
    for (const fixture of fixtures) {
      const match: unknown = results[verified.length];
      if (!validResult(match, fixture, identity, byId)) return false;
      const managed = fixture.homeId === value.clubId || fixture.awayId === value.clubId;
      if (Boolean(match.playerScoring) !== Boolean(kickerId && managed)) return false;
      const participants = [...(match.playerScoring?.starters ?? []), ...(match.benchUsed ?? [])];
      if (participants.some(id => (injuredThrough.get(id) ?? 0) >= playedRound)) return false;
      if (match.individualRecoveryId && (!injuryTracking || (injuredThrough.get(match.individualRecoveryId) ?? 0) >= playedRound)) return false;
      if (reserveGrade && spellEnd && playedRound >= reserveGrade.startedRound && playedRound < spellEnd
        && (participants.includes(reserveGrade.playerId) || match.injury?.playerId === reserveGrade.playerId
          || match.individualRecoveryId === reserveGrade.playerId)) return false;
      if (match.injury) {
        const { playerId, rounds } = match.injury;
        if (!injuryTracking || (injuredThrough.get(playerId) ?? 0) >= playedRound) return false;
        injuredThrough.set(playerId, playedRound + rounds);
      }
      verified.push(match);
    }
  }
  if (reserveGrade?.startedRound === round && (injuredThrough.get(reserveGrade.playerId) ?? 0) >= round) return false;
  const judiciarySeason = { year, clubId, seed, round, results: verified, judiciary };
  if (judiciary && (!validNrlJudiciary({ ...judiciarySeason, phase: expectedPhase }) || (value.live !== undefined && judiciaryNeedsResponse(judiciarySeason))
    || (reserveGrade && nrlJudiciaryBannedBefore(judiciarySeason, reserveGrade.playerId, reserveGrade.startedRound))
    || verified.some(match => match.individualRecoveryId
      && nrlJudiciaryBannedBefore(judiciarySeason, match.individualRecoveryId, match.round)))) return false;
  const unavailable = nrlUnavailable({ ...judiciarySeason, phase: expectedPhase,
    injuryTracking: injuryTracking === true ? true : undefined, reserveGrade });
  const trainedStarts = new Set(NRL_ROLES.filter(role => byId.get(lineup[role] as string)?.secondaryRole === role).map(role => lineup[role]));
  const naturalRoles = new Set([...byId.values()].filter(player => !unavailable.has(player.id) && !trainedStarts.has(player.id)).map(player => player.role));
  if (!NRL_ROLES.every(role => {
    const player = byId.get(lineup[role] as string)!;
    return !unavailable.has(player.id) && (nrlCanPlayRole(player, role) || (injuryTracking && !naturalRoles.has(role)));
  })) return false;
  if (bench !== undefined && (!Array.isArray(bench) || bench.length !== NRL_BENCH_SIZE
    || new Set(bench).size !== bench.length
    || !bench.every(id => typeof id === 'string' && byId.has(id) && !starters.has(id) && !unavailable.has(id)))) return false;
  const { individualRecoveryId } = value;
  if (individualRecoveryId !== undefined && (typeof individualRecoveryId !== 'string' || !injuryTracking || preparation === 'recover'
    || phase === 'complete' || !byId.has(individualRecoveryId) || unavailable.has(individualRecoveryId))) return false;
  if (value.live !== undefined || value.attackPlan !== undefined || preparation === 'defensiveDrills' || individualRecoveryId !== undefined) {
    if (!kickerId || !bench) return false;
    const fixture = nrlRoundFixtures({ year, round, phase: expectedPhase, results: verified }).find(match =>
      match.homeId === value.clubId || match.awayId === value.clubId);
    if (!fixture || (value.live !== undefined && !validLiveHalf(value.live, fixture))) return false;
    const heldReserveId = record(value.live) ? value.live.heldReserveId : undefined;
    if (heldReserveId !== undefined && !nrlHoldableReserves(value as unknown as NrlManagerState).some(player => player.id === heldReserveId)) return false;
  }
  return verified.length === results.length && value.championId === (premierOf(FINALS, finalsOutcomes(verified))?.winner ?? null);
}

function validReserveGrade(value: unknown, round: number, regularRounds: number, players: Map<string, NrlPlayer>,
  enabled: boolean): value is NrlReserveGradeSpell | undefined {
  if (value === undefined) return true;
  if (!enabled || !record(value) || typeof value.playerId !== 'string'
    || !integerIn(value.startedRound, 1, Math.min(round, regularRounds - NRL_RESERVE_GRADE_ROUNDS + 1))
    || !integerIn(value.startingRating, 40, 97)) return false;
  const { playerId, startedRound, startingRating, recalledRound } = value;
  if (recalledRound !== undefined && !integerIn(recalledRound, startedRound, Math.min(round, startedRound + NRL_RESERVE_GRADE_ROUNDS - 1))) return false;
  const gained = recalledRound === undefined && round >= startedRound + NRL_RESERVE_GRADE_ROUNDS;
  return Object.keys(value).length === (recalledRound === undefined ? 3 : 4)
    && players.get(playerId)?.rating === startingRating + Number(gained);
}

export function isNrlManagerState(value: unknown): value is NrlManagerState {
  if (!isNrlSeasonProgress(value) || !isNrlOpeningYear(value.year)
    || value.kickerId !== undefined || value.injuryTracking !== undefined || value.bench !== undefined || value.results.some(match => match.benchUsed !== undefined)) return false;
  const expected = createNrlSeason(value.clubId, value.seed, value.year).squad;
  return value.squad.length === expected.length && expected.every((player, index) => {
    const saved = value.squad[index];
    return player.id === saved.id && player.name === saved.name && player.role === saved.role && player.rating === saved.rating;
  });
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
