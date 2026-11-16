import { isNrlOpeningYear, nrlSeasonPlan, NRL_2026_ORIGIN_STAND_DOWN_ROUNDS, NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import { clamp, clampi, hashLabel, rngFrom } from '@/lib/careerEngine';
import { eliminated, premierOf, resolveWeek, type FinalsTie, type TieOutcome } from '@/lib/finalsBracket';
import { uniqueName } from '@/lib/foNames';
import { makeNrlInterchangeScoringReport, makeNrlScoringReport, nrlScorePoints as scoreOf, validNrlScoringReport, type NrlMatchScoringReport } from '@/lib/nrlPlayerScoring';
import { isNrlJudiciary, judiciaryNeedsResponse, nrlJudiciaryBannedBefore, nrlJudiciaryBans, validNrlJudiciary, type NrlJudiciary } from '@/lib/nrlJudiciary';

export type { NrlYear } from '@/data/nrlManager2026';

export const NRL_SAVE_KEY = 'nrl-manager-save-v1';
export const NRL_DOMESTIC_SCORING_MODEL = 'league-2026';
export const NRL_REGULAR_ROUNDS = nrlSeasonPlan(2026).draw.length;
export const nrlRegularRounds = (year: number): number => nrlSeasonPlan(year).draw.length;
export const NRL_ROLES = [
  'Fullback', 'Left Wing', 'Left Centre', 'Right Centre', 'Right Wing',
  'Five-eighth', 'Halfback', 'Prop 8', 'Hooker', 'Prop 10', 'Left Second Row', 'Right Second Row', 'Lock',
] as const;
export const NRL_TACTICS = ['balanced', 'attack', 'defense'] as const;
const NRL_DIRECTIONAL_PLANS = ['wideLeft', 'wideRight'] as const;
const NRL_SPECIALIST_PLANS = ['middle', 'wide', ...NRL_DIRECTIONAL_PLANS] as const;
export const NRL_ATTACK_PLANS = [...NRL_SPECIALIST_PLANS, 'counter'] as const;
export const NRL_BENCH_SIZE = 6;
export const NRL_RESERVE_GRADE_ROUNDS = 4;
export const NRL_MAX_BENCH_USED = 4;
const NRL_MAX_INTERCHANGES = NRL_MAX_BENCH_USED * 2;
export const NRL_FINALS_SPOTS = 8;
export const NRL_COACHING_BONUS = 2;
export const NRL_QUALIFIED_COACHING_BONUS = 3;
export const NRL_CAPTAIN_DEFENCE = 1;
const MAX_INJURY_ROUNDS = 4;
export const NRL_UTILITY_RATING_COST = 12;
const GOLDEN_POINT_SCORE_CHANCE = 0.78;
const FIELD_GOAL_CHANCE = 0.14;
const SET_FIELD_GOAL_CHANCE = 0.28;
const SET_FIELD_GOAL_ATTACK_COST = 2;
const REGULATION_PENALTY_CHANCE = 0.21;
export const NRL_CONVERSION_DRILLS_BOOST = 8;
const GOLDEN_POINT_APPROACH_CHANGE = 0.14;
const GOLDEN_POINT_VALUES = { tries: 4, penalties: 2, longFieldGoals: 2, fieldGoals: 1 } as const;

export type NrlRole = typeof NRL_ROLES[number];
export type NrlTactic = typeof NRL_TACTICS[number];
type NrlSpecialistPlan = typeof NRL_SPECIALIST_PLANS[number];
type NrlDirectionalPlan = typeof NRL_DIRECTIONAL_PLANS[number];
type NrlActiveAttackPlan = typeof NRL_ATTACK_PLANS[number];
export type NrlAttackPlan = 'standard' | NrlActiveAttackPlan;
export const isNrlSpecialistPlan = (plan: unknown): plan is NrlSpecialistPlan =>
  NRL_SPECIALIST_PLANS.includes(plan as NrlSpecialistPlan);
const isNrlDirectionalPlan = (plan: unknown): plan is NrlDirectionalPlan =>
  NRL_DIRECTIONAL_PLANS.includes(plan as NrlDirectionalPlan);
type NrlOpponentStyle = 'middle' | 'edges';
export type NrlCoachRole = Exclude<NrlTactic, 'balanced'>;
export type NrlPreparation = 'train' | 'recover' | 'defensiveDrills' | 'goalKickingDrills';
export const NRL_HALFTIME_TALKS = {
  reinforceBasics: { attack: -1, defense: 3 },
  liftTempo: { attack: 3, defense: -1 },
} as const;
export type NrlHalftimeTalk = keyof typeof NRL_HALFTIME_TALKS;
type NrlPreparationAction =
  | { type: 'prepare'; choice: 'train' | 'recover' }
  | { type: 'prepare'; choice: 'defensiveDrills' | 'goalKickingDrills' | null; year: number; clubId: string; round: number };
interface NrlRoundOptions {
  medicalReduction?: number;
  intensiveByePlayerId?: string;
  awayRecovery?: number;
  coachRole?: NrlCoachRole;
  coachBonus?: number;
  planRivalRatings?: ReadonlyMap<NrlRole, number>;
}

export interface NrlPlayer { id: string; name: string; role: NrlRole; rating: number; fitness: number; secondaryRole?: NrlRole }
interface NrlReserveGradeSpell { playerId: string; startedRound: number; startingRating: number; recalledRound?: number; acceleratedRound?: number; role?: NrlRole }

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
type NrlScoringPair = [NrlScoring, NrlScoring];
export interface NrlPhaseScoring {
  halfTime: NrlScoringPair;
  at60?: NrlScoringPair;
  regulation?: NrlScoringPair;
}
const scoringKinds = ['tries', 'conversions', 'penalties', 'fieldGoals', 'longFieldGoals'] as const;
type NrlPenaltyTapPoints = 0 | 4 | 6;
export type NrlLatePenaltyApproach = 'goal' | 'tap';
interface NrlLatePenalty { approach: NrlLatePenaltyApproach; points: NrlPenaltyTapPoints | 2 | 'none' }
type NrlActiveKickingPlan = 'territory' | 'contest';
export type NrlKickingPlan = 'mixed' | NrlActiveKickingPlan;
const isActiveKickingPlan = (plan: unknown): plan is NrlActiveKickingPlan => plan === 'territory' || plan === 'contest';
export const isNrlKickingPlan = (plan: unknown): plan is NrlKickingPlan => plan === 'mixed' || isActiveKickingPlan(plan);
export interface NrlHalftimeInterchange { starterId: string; reserveId: string }
export interface NrlQuickInterchange { reserveId: string; role: NrlRole; trigger: 'ahead' | 'behind' }
interface NrlHalftimeChoice {
  tactic: NrlTactic; interchange?: NrlHalftimeInterchange; secondInterchange?: NrlHalftimeInterchange; talk?: NrlHalftimeTalk;
  attackPlan?: NrlAttackPlan;
}
interface NrlLiveMinute60 extends NrlHalftimeChoice { homeScoring: NrlScoring; awayScoring: NrlScoring }
const CAPTAIN_CHALLENGE_RULES = 'strip-v1';
type NrlCaptainChallengeOutcome = 'overturned' | 'upheld' | 'inconclusive';
interface NrlCaptainChallengeReceipt {
  rules: typeof CAPTAIN_CHALLENGE_RULES; captainId: string; outcome: NrlCaptainChallengeOutcome;
}
interface NrlPendingCaptainChallenge {
  captainId: string; finish: NrlFinishMinute60; pauseForGoldenPoint?: true;
}
export interface NrlLiveHalf {
  fixture: NrlFixture; homeScoring: NrlScoring; awayScoring: NrlScoring; heldReserveId?: string; minute60?: NrlLiveMinute60;
  halftimeInjury?: NrlInjury;
  captainChallengeRules?: typeof CAPTAIN_CHALLENGE_RULES;
  captainChallenge?: NrlPendingCaptainChallenge;
  goldenPoint?: { score: number; finish: NrlLivePlanChoice; regulation?: NrlScoringPair; captainChallenge?: NrlCaptainChallengeReceipt };
}

export function nrlLivePhaseScoring(live: NrlLiveHalf): NrlPhaseScoring {
  return {
    halfTime: [live.homeScoring, live.awayScoring],
    ...(live.minute60 && { at60: [live.minute60.homeScoring, live.minute60.awayScoring] }),
    ...(live.goldenPoint?.regulation && { regulation: live.goldenPoint.regulation }),
  };
}
interface NrlHalftimeReceipt extends NrlHalftimeInterchange { enteredAtHalf?: true }
interface NrlHalftimeOption extends NrlHalftimeReceipt { role: NrlRole }
interface NrlHalftimeDecision {
  live: NrlLiveHalf; tactic: NrlTactic; interchanges: NrlHalftimeOption[]; talk?: NrlHalftimeTalk;
  attackPlan?: NrlAttackPlan;
  lateTactic?: NrlTactic; lateInterchange?: NrlHalftimeInterchange & { role: NrlRole };
  returnInterchange?: NrlHalftimeOption;
  quickInterchange?: NrlQuickInterchange;
  fieldGoalPlan?: true;
  latePenaltyApproach?: NrlLatePenaltyApproach;
  lateAttackPlan?: NrlAttackPlan;
  captainChallenge?: NrlCaptainChallengeReceipt;
}
export interface NrlInjury { playerId: string; rounds: number }
export interface NrlPhysioTreatment { playerId: string; injuryRound: number; round: number }
type NrlGoldenScore = keyof typeof GOLDEN_POINT_VALUES;
type NrlGoldenPoint = 'draw' | { period: 1 | 2; score: NrlGoldenScore };
type NrlActiveGoldenPointApproach = 'chase' | 'protect';
export type NrlGoldenPointApproach = 'standard' | NrlActiveGoldenPointApproach;
const isActiveGoldenPointApproach = (approach: unknown): approach is NrlActiveGoldenPointApproach =>
  approach === 'chase' || approach === 'protect';
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
  goldenPointApproach?: NrlActiveGoldenPointApproach;
  scorePeriods?: NrlScorePeriods;
  phaseScoring?: NrlPhaseScoring & { regulation: NrlScoringPair };
  benchUsed?: string[];
  openingCover?: NrlHalftimeInterchange;
  injury?: NrlInjury;
  halftimeInjury?: true;
  originRestId?: string;
  playerScoring?: NrlMatchScoringReport;
  halftimeInterchange?: NrlHalftimeReceipt;
  secondHalftimeInterchange?: NrlHalftimeReceipt;
  halftimeTalk?: NrlHalftimeTalk;
  halftimeAttackPlan?: NrlAttackPlan;
  minute60Tactic?: NrlTactic;
  minute60AttackPlan?: NrlAttackPlan;
  minute60Interchange?: NrlHalftimeInterchange;
  minute60Return?: NrlHalftimeInterchange;
  quickInterchange?: NrlQuickInterchange;
  minute60FieldGoal?: 0 | 1 | 2;
  individualRecoveryId?: string;
  individualSkillWorkId?: string;
  individualSkillGain?: true;
  intensivePositionTrainingId?: string;
  goalKickingDrills?: true;
  openInterchange?: true;
  penaltyTap?: NrlPenaltyTapPoints | 'none';
  latePenalty?: NrlLatePenalty;
  kickingPlan?: NrlActiveKickingPlan;
  ratingChanges?: [playerId: string, change: 1 | -1][];
  openingAttackPlan?: NrlDirectionalPlan;
  counterStyle?: NrlOpponentStyle;
  captainId?: string;
  actingCaptain?: { clubCaptainId: string; viceCaptainId: string };
  captainChallenge?: NrlCaptainChallengeReceipt;
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
export type NrlLeagueLadderArchive = [clubId: string, wins: number, draws: number, pointsFor: number, pointsAgainst: number][];
type NrlLadderOrder = Pick<NrlLadderRow, 'points' | 'differential' | 'pointsFor' | 'pointsAgainst'>;

function compareNrlLadder(a: NrlLadderOrder, b: NrlLadderOrder) {
  // After points and differential the NRL uses the ratio of points for to points against.
  // https://www.nrl.com/news/2014/09/03/finals-hopes-down-to-the-toss-of-a-coin/
  const ratio = (row: NrlLadderOrder) => row.pointsAgainst ? row.pointsFor / row.pointsAgainst : row.pointsFor ? Infinity : 1;
  return b.points - a.points || b.differential - a.differential || ratio(b) - ratio(a);
}
type NrlFormResult = 'W' | 'D' | 'L';
interface NrlClubForm {
  recent: NrlFormResult[];
  home: Record<NrlFormResult, number>;
  away: Record<NrlFormResult, number>;
}
interface NrlOriginStandDown { round: number; clubs: Record<string, string[]> }

export interface NrlManagerState {
  version: 1;
  seed: number;
  year: number;
  clubId: string;
  domesticScoringModel?: typeof NRL_DOMESTIC_SCORING_MODEL;
  originStandDown?: NrlOriginStandDown[];
  originRestId?: string;
  halftimeInjuryCover?: true;
  phase: 'regular' | 'finals' | 'complete';
  round: number;
  squad: NrlPlayer[];
  lineup: Record<NrlRole, string>;
  bench?: string[];
  injuryTracking?: true;
  physio?: NrlPhysioTreatment;
  kickerId?: string;
  backupKickerId?: string;
  captainId?: string;
  viceCaptainId?: string;
  tactic: NrlTactic;
  attackPlan?: NrlActiveAttackPlan;
  preparation: NrlPreparation | null;
  individualRecoveryId?: string;
  individualSkillWorkId?: string;
  intensivePositionTrainingId?: string;
  results: NrlMatchResult[];
  openInterchange?: true;
  quickInterchange?: NrlQuickInterchange;
  openingCoverId?: string;
  penaltyTap?: true;
  kickingPlan?: NrlActiveKickingPlan;
  championId: string | null;
  live?: NrlLiveHalf;
  reserveGrade?: NrlReserveGradeSpell;
  judiciary?: NrlJudiciary;
}
type NrlHalftimeAction<Type> = { type: Type; year: number; round: number } & NrlHalftimeChoice;
type NrlFinishMinute60 = { type: 'finishMinute60'; year: number; round: number; tactic: NrlTactic; reserveId?: string;
  reserveRole?: NrlRole; fieldGoalPlan?: true; attackPlan?: NrlAttackPlan; latePenaltyApproach?: NrlLatePenaltyApproach; returnStarterId?: string };
export type NrlLivePlanChoice = NrlHalftimeAction<'finishLive'> | NrlFinishMinute60;
type NrlStarterSwap = {
  type: 'swapStarters'; year: number; clubId: string; round: number;
  fromRole: NrlRole; toRole: NrlRole; fromPlayerId: string; toPlayerId: string;
};
export type NrlAction =
  | { type: 'selectStarter'; role: NrlRole; playerId: string }
  | NrlStarterSwap
  | { type: 'selectBench'; slot: number; playerId: string }
  | { type: 'setKicker'; playerId: string }
  | { type: 'setBackupKicker'; playerId: string | null; year: number; clubId: string; round: number }
  | { type: 'setCaptain'; playerId: string | null; year: number; clubId: string; round: number }
  | { type: 'setViceCaptain'; playerId: string | null; year: number; clubId: string; round: number }
  | { type: 'applyFitLineup'; previewKey: string }
  | { type: 'setTactic'; tactic: NrlTactic }
  | NrlPreparationAction
  | { type: 'setIndividualRecovery'; playerId: string | null; year: number; clubId: string; round: number }
  | { type: 'setOpenInterchange'; enabled: boolean; year: number; clubId: string; round: number }
  | { type: 'setQuickInterchange'; plan: NrlQuickInterchange | null; year: number; clubId: string; round: number }
  | { type: 'setOpeningCover'; reserveId: string | null; year: number; clubId: string; round: number }
  | { type: 'setPenaltyTap'; enabled: boolean; year: number; clubId: string; round: number }
  | { type: 'setKickingPlan'; plan: NrlKickingPlan; year: number; clubId: string; round: number }
  | { type: 'startLive'; hold?: { year: number; round: number; reserveId: string }; captainChallengeRules?: true }
  | NrlHalftimeAction<'reachMinute60'>
  | (NrlLivePlanChoice & { pauseForGoldenPoint?: true })
  | { type: 'resolveCaptainChallenge'; year: number; clubId: string; round: number; decision: 'accept' | 'challenge' }
  | { type: 'settleGoldenPoint'; year: number; clubId: string; round: number; approach: NrlGoldenPointApproach }
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
  return rows.sort((a, b) => compareNrlLadder(a, b) || b.tries - a.tries || b.goals - a.goals || b.fieldGoals - a.fieldGoals
    || a.clubId.localeCompare(b.clubId));
}

export function archiveNrlLadder(season: NrlManagerState): NrlLeagueLadderArchive {
  return nrlLadder(season).map(({ clubId, wins, draws, pointsFor, pointsAgainst }) => [clubId, wins, draws, pointsFor, pointsAgainst]);
}

export function nrlArchivedLadder(value: unknown, year: number) {
  const { clubs, draw } = nrlSeasonPlan(year);
  if (!Array.isArray(value) || value.length !== clubs.length) return null;
  const games = new Map(clubs.map(({ id }) => [id, 0]));
  for (const fixtures of draw) for (const [home, away] of fixtures) {
    games.set(home, games.get(home)! + 1);
    games.set(away, games.get(away)! + 1);
  }
  const seen = new Set<string>();
  let totalWins = 0, totalLosses = 0, totalDraws = 0, totalDifferential = 0;
  let previous: NrlLadderOrder | undefined;
  const rows: Array<Pick<NrlLadderRow, 'clubId' | 'played' | 'wins' | 'draws' | 'losses' | 'points' | 'differential'>> = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 5) return null;
    const [clubId, wins, draws, pointsFor, pointsAgainst] = entry;
    const played = games.get(clubId);
    // A settled regular-season result allows at most 112 in regulation and four in golden point.
    if (played === undefined || seen.has(clubId) || !integerIn(wins, 0, played) || !integerIn(draws, 0, played - wins)
      || !integerIn(pointsFor, 0, played * 116) || !integerIn(pointsAgainst, 0, played * 116)) return null;
    seen.add(clubId);
    const losses = played - wins - draws;
    const points = 2 * (wins + draw.length - played) + draws;
    const differential = pointsFor - pointsAgainst;
    const order = { points, differential, pointsFor, pointsAgainst };
    if (previous && compareNrlLadder(previous, order) > 0) return null;
    previous = order;
    rows.push({ clubId, played, wins, draws, losses, points, differential });
    totalWins += wins;
    totalDraws += draws;
    totalLosses += losses;
    totalDifferential += differential;
  }
  return totalWins === totalLosses && totalDraws % 2 === 0 && totalDifferential === 0 ? rows : null;
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

export function nrlRegularReturnFixture({ year, clubId, round, phase }: Pick<NrlManagerState, 'year' | 'clubId' | 'round' | 'phase'>,
  injuryRounds: number, bannedMatches: number) {
  if (phase !== 'regular') return undefined;
  const { draw } = nrlSeasonPlan(year);
  for (let next = round; next <= draw.length; next++) {
    const opponent = draw[next - 1].find(pair => pair.includes(clubId))?.find(id => id !== clubId);
    if (!opponent) continue;
    if (bannedMatches > 0) bannedMatches--;
    else if (next >= round + injuryRounds) return { round: next, opponent };
  }
}

type NrlInjuryClock = Pick<NrlManagerState, 'round' | 'phase' | 'results' | 'injuryTracking' | 'physio'>;

export function nrlInjuries(state: NrlInjuryClock, asOf = state.round + Number(state.phase === 'complete')): Map<string, number> {
  const injuries = new Map<string, number>();
  if (!state.injuryTracking) return injuries;
  for (const result of state.results) {
    if (!result.injury || result.round >= asOf) continue;
    const adjusted = state.physio && state.physio.round <= asOf && state.physio.injuryRound === result.round
      && state.physio.playerId === result.injury.playerId;
    const remaining = result.round + result.injury.rounds + 1 - asOf - Number(Boolean(adjusted));
    if (remaining > 0) injuries.set(result.injury.playerId, remaining);
  }
  return injuries;
}

export function isNrlPhysioTreatment(value: unknown, roundLimit: number): value is NrlPhysioTreatment {
  return record(value) && Object.keys(value).length === 3 && typeof value.playerId === 'string' && Boolean(value.playerId)
    && integerIn(value.round, 2, roundLimit) && integerIn(value.injuryRound, 1, value.round - 1);
}

type NrlAvailability = NrlInjuryClock & Pick<NrlManagerState, 'reserveGrade' | 'judiciary' | 'year' | 'clubId' | 'seed' | 'originStandDown' | 'originRestId'>;

export function nrlClubOriginAbsences(season: Pick<NrlManagerState, 'year' | 'round' | 'clubId' | 'originStandDown'>,
  clubId = season.clubId, round = season.round): readonly string[] {
  const called = season.originStandDown?.find(row => row.round === round)?.clubs[clubId];
  return called && nrlSeasonPlan(season.year).draw[round - 1]?.some(pair => pair.includes(clubId)) ? called : [];
}

// A bye lets players recover before their first actual club match back.
export function nrlClubOriginReturning(season: Pick<NrlManagerState, 'year' | 'clubId' | 'round' | 'phase' | 'originStandDown'>): readonly string[] {
  const camp = season.originStandDown?.filter(window => window.round < season.round).at(-1);
  if (!camp?.clubs[season.clubId]) return [];
  const first = nrlRegularReturnFixture({ ...season, round: camp.round + 1 }, 0, 0);
  return first?.round === season.round ? camp.clubs[season.clubId] : [];
}

export function nrlReserveGradeEnd({ startedRound, recalledRound, acceleratedRound }: Pick<NrlReserveGradeSpell, 'startedRound' | 'recalledRound' | 'acceleratedRound'>) {
  return recalledRound ?? (startedRound + NRL_RESERVE_GRADE_ROUNDS - Number(acceleratedRound !== undefined));
}

export function nrlReserveGradeRemaining({ reserveGrade, round }: Pick<NrlManagerState, 'reserveGrade' | 'round'>): number {
  return reserveGrade ? Math.max(0, nrlReserveGradeEnd(reserveGrade) - round) : 0;
}

export function nrlUnavailable(state: NrlAvailability): Map<string, number> {
  const unavailable = nrlInjuries(state);
  for (const id of nrlClubOriginAbsences(state)) unavailable.set(id, Math.max(1, unavailable.get(id) ?? 0));
  if (state.originRestId && !unavailable.has(state.originRestId)) unavailable.set(state.originRestId, 1);
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
  return state.squad.filter(player => player.id !== state.intensivePositionTrainingId && !unavailable.has(player.id));
}

function clearIndividualRecovery(state: NrlManagerState): NrlManagerState {
  if (state.individualRecoveryId === undefined) return state;
  const { individualRecoveryId: _cleared, ...next } = state;
  return next;
}

function clearIndividualSkillWork(state: NrlManagerState): NrlManagerState {
  if (state.individualSkillWorkId === undefined) return state;
  const { individualSkillWorkId: _cleared, ...next } = state;
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

export function nrlStarterSwaps(state: NrlManagerState): NrlStarterSwap[] {
  if (state.live || state.phase === 'complete') return [];
  const unavailable = nrlUnavailable(state);
  const players = new Map(state.squad.filter(player => !unavailable.has(player.id)).map(player => [player.id, player]));
  const { lineup, year, clubId, round } = state;
  const swaps: NrlStarterSwap[] = [];
  NRL_ROLES.forEach((fromRole, index) => {
    const from = players.get(lineup[fromRole]);
    if (!from) return;
    for (const toRole of NRL_ROLES.slice(index + 1)) {
      const to = players.get(lineup[toRole]);
      if (!to || from.id === to.id || !nrlCanPlayRole(from, toRole) || !nrlCanPlayRole(to, fromRole)) continue;
      swaps.push({ type: 'swapStarters', year, clubId, round, fromRole, toRole, fromPlayerId: from.id, toPlayerId: to.id });
    }
  });
  return swaps;
}

function captainFor(starters: readonly string[], captainId?: string, viceCaptainId?: string) {
  return captainId && starters.includes(captainId) ? captainId
    : viceCaptainId && starters.includes(viceCaptainId) ? viceCaptainId : undefined;
}

export function nrlOnFieldCaptain({ captainId, viceCaptainId, lineup }: Pick<NrlManagerState, 'captainId' | 'viceCaptainId' | 'lineup'>) {
  return captainFor(Object.values(lineup), captainId, viceCaptainId);
}

export function nrlActingCaptainPhases(match: NrlMatchResult) {
  const { actingCaptain } = match;
  return actingCaptain ? matchCaptainPhases(match, actingCaptain.clubCaptainId, actingCaptain.viceCaptainId) : [];
}

function matchCaptainPhases(match: NrlMatchResult, clubCaptainId?: string, viceCaptainId?: string) {
  const { playerScoring, halftimeInterchange, secondHalftimeInterchange, minute60Interchange, minute60Return, scorePeriods } = match;
  if (!playerScoring) return [];
  const starters = [...playerScoring.starters];
  const phases = [{ period: 'Kickoff', playerId: captainFor(starters, clubCaptainId, viceCaptainId) }];
  for (const change of [halftimeInterchange, secondHalftimeInterchange]) {
    if (change) starters[starters.indexOf(change.starterId)] = change.reserveId;
  }
  if (halftimeInterchange || secondHalftimeInterchange || scorePeriods?.at60) {
    phases.push({ period: 'Second half', playerId: captainFor(starters, clubCaptainId, viceCaptainId) });
  }
  if (scorePeriods?.at60) {
    if (minute60Interchange) starters[starters.indexOf(minute60Interchange.starterId)] = minute60Interchange.reserveId;
    if (minute60Return) starters[starters.indexOf(minute60Return.reserveId)] = minute60Return.starterId;
    phases.push({ period: 'Final 20 minutes', playerId: captainFor(starters, clubCaptainId, viceCaptainId) });
  }
  return phases;
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

export function repairMatchday(state: NrlManagerState, preferFit = false, awayRecovery = 0): NrlManagerState {
  const unavailable = nrlUnavailable(state);
  if (state.individualRecoveryId && unavailable.has(state.individualRecoveryId)) state = clearIndividualRecovery(state);
  if (state.individualSkillWorkId && unavailable.has(state.individualSkillWorkId)) state = clearIndividualSkillWork(state);
  const healthy = state.squad.filter(player => !unavailable.has(player.id));
  const byId = new Map(healthy.map(player => [player.id, player]));
  const grade = (player: NrlPlayer) => player.rating - fitnessPenalty(state, player, awayRecovery);
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
  return retainOpeningCover({ ...repaired, bench: nrlBench(repaired) });
}

function lineupChanges(from: NrlManagerState['lineup'], to: NrlManagerState['lineup']) {
  return NRL_ROLES.flatMap(role => from[role] === to[role] ? [] : [{ role, fromId: from[role], toId: to[role] }]);
}

export function nrlFitLineup(state: NrlManagerState, awayRecovery = 0) {
  if (state.live || state.phase === 'complete' || !nrlNextRound(state).clubMatch) return null;
  const next = repairMatchday(state, true, awayRecovery);
  const changes = lineupChanges(state.lineup, next.lineup);
  const key = JSON.stringify([state.seed, state.clubId, state.year, state.round, state.preparation, state.lineup, state.bench, state.kickerId,
    ...(state.squad.some(player => player.secondaryRole) ? [next.lineup, next.bench, next.kickerId] : []),
    ...(state.individualRecoveryId ? [state.individualRecoveryId] : []),
    ...(state.individualSkillWorkId ? ['individual-skill-work', state.individualSkillWorkId] : []),
    ...(state.originRestId ? ['origin-rest', state.originRestId] : []),
    ...(state.backupKickerId ? ['backup-kicker', state.backupKickerId] : []),
    ...(awayRecovery ? ['away-recovery', awayRecovery] : [])]);
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
type NrlRoundPreparation = Pick<NrlManagerState, 'preparation' | 'individualRecoveryId' | 'individualSkillWorkId' | 'intensivePositionTrainingId'>;
type NrlSelectedSquad = NrlRoundPreparation & Pick<NrlManagerState, 'squad' | 'lineup' | 'bench' | 'kickerId' | 'openInterchange' | 'openingCoverId'>;

function openingCoverOption(state: NrlSelectedSquad, id: string) {
  if (!state.kickerId || !state.bench?.includes(id)) return;
  const reserve = state.squad.find(player => player.id === id);
  const role = reserve?.secondaryRole;
  if (!reserve || !role || state.lineup[role] === state.kickerId || Object.values(state.lineup).includes(id)) return;
  return { reserve, role, starterId: state.lineup[role] };
}

function retainOpeningCover(state: NrlManagerState) {
  if (state.openingCoverId === undefined || openingCoverOption(state, state.openingCoverId)) return state;
  const { openingCoverId, ...next } = state;
  return next;
}

export function nrlOpeningCoverOptions(state: NrlManagerState) {
  if (state.live || state.phase !== 'regular' || !state.kickerId || !nrlNextRound(state).clubMatch) return [];
  const unavailable = nrlUnavailable(state);
  return (state.bench ?? []).flatMap(id => {
    const cover = openingCoverOption(state, id);
    return cover && !unavailable.has(id) ? [cover] : [];
  });
}

export function nrlBenchRotation(state: NrlSelectedSquad, heldReserveId?: string): Map<string, NrlPlayer> {
  const rotation = new Map<string, NrlPlayer>();
  const heldRole = heldReserveId && state.squad.find(player => player.id === heldReserveId)?.role;
  const limit = NRL_MAX_BENCH_USED - Number(Boolean(heldRole || state.openInterchange));
  const choice = state.openingCoverId === undefined ? undefined : openingCoverOption(state, state.openingCoverId);
  const cover = choice?.reserve.id !== heldReserveId && choice?.role !== heldRole ? choice : undefined;
  if (cover) rotation.set(cover.starterId, cover.reserve);
  for (const id of state.bench ?? []) {
    if (rotation.size === limit) break;
    if (id === cover?.reserve.id) continue;
    const player = state.squad.find(reserve => reserve.id === id)!;
    const starterId = state.lineup[player.role];
    if (player.role !== heldRole && !rotation.has(starterId)) rotation.set(starterId, player);
  }
  return rotation;
}

export function nrlCanOpenInterchange(state: NrlManagerState) {
  return !state.live && state.phase !== 'complete' && Boolean(state.kickerId && state.bench && nrlNextRound(state).clubMatch)
    && nrlBenchRotation({ ...state, openInterchange: undefined }).size === NRL_MAX_BENCH_USED;
}

export function nrlHoldableReserves(state: NrlManagerState): NrlPlayer[] {
  if (!state.kickerId || !state.bench) return [];
  const unavailable = nrlUnavailable(state);
  const cover = state.openingCoverId === undefined ? undefined : openingCoverOption(state, state.openingCoverId);
  return state.bench.flatMap(id => {
    const reserve = state.squad.find(player => player.id === id);
    return reserve && id !== cover?.reserve.id && reserve.role !== cover?.role
      && state.lineup[reserve.role] !== state.kickerId && !unavailable.has(id) ? [reserve] : [];
  });
}

export function nrlHalftimeInterchanges(state: NrlManagerState): NrlHalftimeOption[] {
  if (!state.live || !state.kickerId) return [];
  const { heldReserveId } = state.live;
  const unavailable = nrlUnavailable(state);
  const backup = state.backupKickerId && state.backupKickerId !== state.kickerId
    && Object.values(state.lineup).includes(state.backupKickerId) && !unavailable.has(state.backupKickerId);
  const rotation = nrlBenchRotation(state, heldReserveId);
  const rotationRoles = new Map(NRL_ROLES.map(role => [state.lineup[role], role]));
  const options: NrlHalftimeOption[] = [...rotation].filter(([starterId]) => starterId !== state.kickerId || backup)
    .map(([starterId, reserve]) => ({ starterId, reserveId: reserve.id, role: rotationRoles.get(starterId)! }));
  const held = heldReserveId && nrlHoldableReserves(state).find(player => player.id === heldReserveId);
  if (held) options.push({ starterId: state.lineup[held.role], reserveId: held.id, role: held.role, enteredAtHalf: true });
  if (state.openInterchange && !heldReserveId) {
    for (const reserveId of state.bench ?? []) {
      const reserve = state.squad.find(player => player.id === reserveId);
      if (!reserve || unavailable.has(reserveId) || reserveId === state.openingCoverId) continue;
      const starterId = state.lineup[reserve.role];
      if (rotation.has(starterId) || (starterId === state.kickerId && !backup)) continue;
      options.push({ starterId, reserveId, role: reserve.role, enteredAtHalf: true });
    }
  }
  return options;
}

export function nrlCanPairHalftimeInterchanges(state: Pick<NrlManagerState, 'kickerId' | 'backupKickerId'>,
  first: Pick<NrlHalftimeReceipt, 'starterId' | 'enteredAtHalf'>, second: Pick<NrlHalftimeReceipt, 'starterId' | 'enteredAtHalf'>) {
  return first.starterId !== second.starterId && !(first.enteredAtHalf && second.enteredAtHalf)
    && !(first.starterId === state.kickerId && second.starterId === state.backupKickerId)
    && !(second.starterId === state.kickerId && first.starterId === state.backupKickerId);
}

export function nrlMinute60Interchange(state: NrlManagerState) {
  const live = state.live;
  if (!live?.minute60 || !live.heldReserveId
    || [live.minute60.interchange, live.minute60.secondInterchange].some(change => change?.reserveId === live.heldReserveId)) return;
  const held = nrlHoldableReserves(state).find(player => player.id === live.heldReserveId);
  if (!held) return;
  const starterId = state.lineup[held.role];
  if (starterId === state.backupKickerId
    && [live.minute60.interchange, live.minute60.secondInterchange].some(change => change?.starterId === state.kickerId)) return;
  return { starterId, reserveId: held.id, role: held.role };
}

export function nrlMinute60Interchanges(state: NrlManagerState) {
  const live = state.live;
  if (!live?.minute60) return [];
  const held = nrlMinute60Interchange(state);
  const rotation = nrlBenchRotation(state, live.heldReserveId);
  const halfway = [live.minute60.interchange, live.minute60.secondInterchange];
  const entered = halfway.some(change => change && rotation.get(change.starterId)?.id !== change.reserveId);
  if (entered && !live.heldReserveId) return [];
  const kept = halfway.filter(change => change && rotation.get(change.starterId)?.id === change.reserveId).length;
  const entrants = Number(entered);
  // A rotating reserve normally comes on and then leaves. A half-time keep skips the return.
  if (rotation.size + entrants >= NRL_MAX_BENCH_USED || rotation.size * 2 - kept + entrants >= NRL_MAX_INTERCHANGES) return [];

  const additional = additionalMinute60Interchanges(state, rotation, halfway, live.heldReserveId);
  return held ? [held, ...additional] : additional;
}

export function nrlMinute60Returns(state: NrlManagerState) {
  const live = state.live;
  if (!live?.minute60) return [];
  const { interchange, secondInterchange } = live.minute60;
  if (!interchange) return [];
  const halfway = secondInterchange ? [interchange, secondInterchange] : [interchange];
  const pairs = nrlHalftimeInterchanges(state).filter(option => halfway.some(pair =>
    pair.starterId === option.starterId && pair.reserveId === option.reserveId));
  const reservesUsed = nrlBenchRotation(state, live.heldReserveId).size + pairs.filter(pair => pair.enteredAtHalf).length;
  // The halftime choices either skip an automatic return or bring on one fresh reserve.
  if (pairs.length !== halfway.length || reservesUsed > NRL_MAX_BENCH_USED
    || 2 * reservesUsed - pairs.length >= NRL_MAX_INTERCHANGES) return [];
  const unavailable = nrlUnavailable(state);
  return pairs.filter(({ starterId, reserveId, role }) =>
    state.lineup[role] === starterId && starterId !== live.halftimeInjury?.playerId
    && !unavailable.has(starterId) && !unavailable.has(reserveId));
}

function additionalMinute60Interchanges(state: NrlManagerState, rotation: ReadonlyMap<string, NrlPlayer>,
  halfway: (NrlHalftimeInterchange | undefined)[], heldReserveId?: string) {
  const restarting = halfway.some(change => change?.starterId === state.kickerId) ? state.backupKickerId : undefined;
  const used = new Set([...rotation.values()].map(player => player.id));
  const unavailable = nrlUnavailable(state);
  const backup = state.backupKickerId;
  const backupCanKick = backup && backup !== state.kickerId && !unavailable.has(backup)
    && Object.values(state.lineup).includes(backup) && halfway.every(change => change?.starterId !== backup);
  return (state.bench ?? []).flatMap(id => {
    const reserve = state.squad.find(player => player.id === id);
    if (!state.kickerId || !reserve || unavailable.has(id) || used.has(id)) return [];
    const roles = [reserve.role, reserve.secondaryRole];
    return roles.flatMap(role => {
      if (!role || (id === heldReserveId && role === reserve.role)) return [];
      const starterId = state.lineup[role];
      return (starterId === state.kickerId && !backupCanKick) || starterId === restarting || rotation.has(starterId)
        || halfway.some(change => change?.starterId === starterId) ? [] : [{ starterId, reserveId: id, role }];
    });
  });
}

export function nrlQuickInterchangeOptions(state: NrlManagerState) {
  if (!state.openInterchange || state.live || state.phase !== 'regular' || !nrlNextRound(state).clubMatch) return [];
  const rotation = nrlBenchRotation(state);
  return rotation.size === NRL_MAX_BENCH_USED - 1 ? additionalMinute60Interchanges(state, rotation, []) : [];
}

function quickInterchangeDue([home, away]: NrlScorePair, atHome: boolean, trigger: NrlQuickInterchange['trigger']) {
  const margin = atHome ? home - away : away - home;
  return trigger === 'ahead' ? margin > 0 : margin < 0;
}

export function nrlQuickInterchangeOutcome(result: NrlMatchResult, clubId: string) {
  const { quickInterchange, scorePeriods, minute60Interchange } = result;
  if (!quickInterchange || !scorePeriods?.at60) return null;
  if (minute60Interchange) return 'used';
  return quickInterchangeDue(scorePeriods.at60, result.homeId === clubId, quickInterchange.trigger) ? 'unavailable' : 'missed';
}

const fieldGoalPlanGap = (gap: number) => gap === 0 || gap === -2;

export function nrlMinute60FieldGoalAvailable({ clubId, live }: Pick<NrlManagerState, 'clubId' | 'live'>) {
  if (!live?.minute60) return false;
  const { homeScoring, awayScoring } = live.minute60;
  const gap = scoreOf(homeScoring) - scoreOf(awayScoring);
  return fieldGoalPlanGap(live.fixture.homeId === clubId ? gap : -gap);
}

const TACTIC_EFFECT: Record<NrlTactic, { attack: number; defense: number }> = {
  balanced: { attack: 0, defense: 0 },
  attack: { attack: 5, defense: -3 },
  defense: { attack: -2, defense: 5 },
};
const PREPARATION_FITNESS = { train: -4, defensiveDrills: -4, goalKickingDrills: -4, recover: 10, normal: 0 };
const isTraining = (preparation: NrlPreparation | null) =>
  preparation === 'train' || preparation === 'defensiveDrills' || preparation === 'goalKickingDrills';
function readyFitness(fitness: number, preparation: NrlPreparation | null, playing: boolean, awayRecovery = 0): number {
  const routineRecovery = Math.ceil((100 - fitness) * 0.45);
  return clamp(fitness + routineRecovery + PREPARATION_FITNESS[preparation ?? 'normal'] + (playing ? awayRecovery : 12), 0, 100);
}

const intensivePositionFitness = (recovered: number) => clamp(recovered + PREPARATION_FITNESS.train, 0, 100);

export function nrlByeTrainingPreview(player: NrlPlayer, preparation: NrlPreparation | null) {
  const normal = readyFitness(player.fitness, preparation, false);
  return { normal, intensive: intensivePositionFitness(normal) };
}

const playerPreparation = (state: NrlRoundPreparation, id: string): NrlPreparation | null =>
  state.individualRecoveryId === id ? 'recover' : state.preparation;

function playerReadyFitness(state: NrlRoundPreparation, player: NrlPlayer, playing: boolean, awayRecovery = 0) {
  const ready = readyFitness(player.fitness, playerPreparation(state, player.id), playing, awayRecovery);
  return playing && (state.intensivePositionTrainingId === player.id || state.individualSkillWorkId === player.id)
    ? intensivePositionFitness(ready) : ready;
}

export function nrlIndividualRecoveryPreview(player: NrlPlayer, preparation: NrlPreparation | null, awayRecovery = 0) {
  return { normal: readyFitness(player.fitness, preparation, true, awayRecovery), recovery: readyFitness(player.fitness, 'recover', true, awayRecovery) };
}

export function nrlMatchFitness(state: NrlRoundPreparation, player: NrlPlayer, awayRecovery = 0) {
  return playerReadyFitness(state, player, true, awayRecovery);
}

function fitnessPenalty(state: NrlRoundPreparation, player: NrlPlayer, awayRecovery = 0): number {
  return (100 - nrlMatchFitness(state, player, awayRecovery)) * 0.18;
}

function matchInjury(state: NrlManagerState, used: Set<string>, medicalReduction: number, awayRecovery: number): NrlInjury | undefined {
  const starters = new Set(Object.values(state.lineup));
  const played = state.squad.filter(player => starters.has(player.id) || used.has(player.id));
  const ready = played.reduce((total, player) => total + readyFitness(player.fitness, state.preparation, true, awayRecovery), 0) / played.length;
  const risk = 0.12 + (100 - ready) / 260 + (isTraining(state.preparation) ? 0.04 : 0);
  const rng = rngFrom(hashLabel(`${state.seed}|${state.year}|${state.round}|${state.clubId}|injury`));
  if (rng() >= risk) return undefined;
  return { playerId: played[Math.floor(rng() * played.length)].id, rounds: Math.max(1, 1 + Math.floor(rng() * MAX_INJURY_ROUNDS) - medicalReduction) };
}

const PLAN_ROLES: Record<NrlSpecialistPlan, readonly NrlRole[]> = {
  middle: ['Prop 8', 'Hooker', 'Prop 10', 'Lock'],
  wide: ['Left Wing', 'Left Centre', 'Right Centre', 'Right Wing'],
  wideLeft: ['Left Wing', 'Left Centre'],
  wideRight: ['Right Wing', 'Right Centre'],
};
const OPPOSITE_EDGE: Partial<Record<NrlRole, NrlRole>> = {
  'Left Wing': 'Right Wing', 'Left Centre': 'Right Centre',
  'Right Wing': 'Left Wing', 'Right Centre': 'Left Centre',
};

function addMatchdayRating(sum: number, player: NrlPlayer, role: NrlRole, state: NrlRoundPreparation, reserve?: NrlPlayer, awayRecovery = 0): number {
  const rating = nrlCanPlayRole(player, role) ? player.rating : player.rating - NRL_UTILITY_RATING_COST;
  const penalty = fitnessPenalty(state, player, awayRecovery);
  // Keep the original summation order for the ordinary ratings.
  if (!reserve) return sum + rating - penalty;
  return sum + (rating - penalty) * 0.68
    + (reserve.rating - fitnessPenalty(state, reserve, awayRecovery)) * 0.32;
}

function matchdayBase(state: NrlSelectedSquad, rotation: ReadonlyMap<string, NrlPlayer>, awayRecovery = 0): number {
  const starters = new Map(Object.entries(state.lineup).map(([role, id]) => [id, role]));
  return state.squad.filter(player => starters.has(player.id)).reduce((sum, player) =>
    addMatchdayRating(sum, player, starters.get(player.id) as NrlRole, state, rotation.get(player.id), awayRecovery), 0) / NRL_ROLES.length;
}

interface NrlPlanPosition { role: NrlRole; own: number; rival: number; rivalRole?: NrlRole }

function planLaneGap(state: NrlManagerState, rotation: ReadonlyMap<string, NrlPlayer>,
  plan: NrlSpecialistPlan, rival: ReadonlyMap<NrlRole, number>, positions?: NrlPlanPosition[], awayRecovery = 0) {
  const roles = PLAN_ROLES[plan];
  const players = new Map(state.squad.map(player => [player.id, player]));
  return roles.reduce((sum, role) => {
    const id = state.lineup[role];
    const starter = players.get(id)!;
    const reserve = rotation.get(id);
    const rivalRole = isNrlDirectionalPlan(plan) ? OPPOSITE_EDGE[role]! : role;
    const reference = rival.get(rivalRole)!;
    if (positions) positions.push({ role, own: addMatchdayRating(0, starter, role, state, reserve, awayRecovery), rival: reference,
      ...(rivalRole !== role && { rivalRole }) });
    return addMatchdayRating(sum, starter, role, state, reserve, awayRecovery) - reference;
  }, 0) / roles.length;
}

function planAdjustment(state: NrlManagerState, rotation: ReadonlyMap<string, NrlPlayer>, base: number,
  plan: NrlSpecialistPlan, rival: ReadonlyMap<NrlRole, number>, awayRecovery = 0) {
  const laneGap = planLaneGap(state, rotation, plan, rival, undefined, awayRecovery);
  const rivalBase = [...rival.values()].reduce((sum, rating) => sum + rating, 0) / NRL_ROLES.length;
  return { attack: clamp((laneGap - (base - rivalBase)) * 0.5, -4, 6), defense: -2 };
}

export function nrlPlanAdjustments(state: NrlManagerState, rival: ReadonlyMap<NrlRole, number>, awayRecovery = 0) {
  const rotation = nrlBenchRotation(state);
  const base = matchdayBase(state, rotation, awayRecovery);
  return {
    middle: planAdjustment(state, rotation, base, 'middle', rival, awayRecovery),
    wide: planAdjustment(state, rotation, base, 'wide', rival, awayRecovery),
    wideLeft: planAdjustment(state, rotation, base, 'wideLeft', rival, awayRecovery),
    wideRight: planAdjustment(state, rotation, base, 'wideRight', rival, awayRecovery),
  };
}

export function nrlPlanMatchups(state: NrlManagerState, rival: ReadonlyMap<NrlRole, number>, awayRecovery = 0) {
  const rotation = nrlBenchRotation(state);
  const group = (plan: NrlSpecialistPlan) => {
    const positions: NrlPlanPosition[] = [];
    const gap = planLaneGap(state, rotation, plan, rival, positions, awayRecovery);
    return { gap, positions };
  };
  return { middle: group('middle'), wide: group('wide'), wideLeft: group('wideLeft'), wideRight: group('wideRight') };
}

export function nrlCounterPlan({ clubId, seed, year }: Pick<NrlManagerState, 'clubId' | 'seed' | 'year'>, fixture: NrlFixture) {
  const rival = fixture.homeId === clubId ? fixture.awayId : fixture.homeId;
  // A club keeps its simulated style for this season without using the match stream.
  const edges = (hashLabel(`nrl-opp-style|${seed}|${year}|${rival}`) >>> 11) & 1;
  return edges ? { style: 'edges' as const, attack: -2, defense: 3 } : { style: 'middle' as const, attack: 3, defense: -2 };
}

function teamRatings(state: NrlManagerState, clubId: string, opponentStrength: ReadonlyMap<string, number> | undefined,
  rotation: ReadonlyMap<string, NrlPlayer>, { coachRole, coachBonus = NRL_COACHING_BONUS, planRivalRatings, awayRecovery }: NrlRoundOptions) {
  if (clubId !== state.clubId) {
    const strength = opponentStrength?.get(clubId) ?? clubFor(state.year, clubId)!.strength;
    return { attack: strength, defense: strength };
  }
  const base = matchdayBase(state, rotation, awayRecovery);
  const { attack, defense } = TACTIC_EFFECT[state.tactic];
  const attackCoaching = coachRole === 'attack' && state.tactic === 'attack' ? coachBonus : 0;
  const defenseCoaching = coachRole === 'defense' && state.tactic === 'defense' ? coachBonus : 0;
  const ordinary = {
    attack: base + attack + (state.preparation === 'train' ? 7 : 0) + attackCoaching,
    defense: base + defense + (state.preparation === 'defensiveDrills' ? 7 : 0) + defenseCoaching,
  };
  if (nrlOnFieldCaptain(state)) ordinary.defense += NRL_CAPTAIN_DEFENCE;
  if (!state.attackPlan || state.attackPlan === 'counter' || !planRivalRatings) return ordinary;
  const specialist = planAdjustment(state, rotation, base, state.attackPlan, planRivalRatings, awayRecovery);
  return { attack: ordinary.attack + specialist.attack, defense: ordinary.defense + specialist.defense };
}

function conversionBoost(state: NrlManagerState, clubId: string): number {
  return state.clubId === clubId && state.preparation === 'goalKickingDrills' ? NRL_CONVERSION_DRILLS_BOOST / 100 : 0;
}

const conversionChance = (edge: number, boost: number) => clamp(0.76 + edge / 400, 0.62, 0.89) + boost;

const ORIGINAL_TRY_RATE = { base: 0.204, edgeDivisor: 155 };
const DOMESTIC_TRY_RATE = { base: 0.236, edgeDivisor: 225 };

function fixtureTryRate(state: NrlManagerState, fixture: NrlFixture) {
  return state.domesticScoringModel === NRL_DOMESTIC_SCORING_MODEL && !fixture.finalsRound ? DOMESTIC_TRY_RATE : ORIGINAL_TRY_RATE;
}

function tryChances(rng: () => number, edge: number, chances: number, conversion = 0, plan?: NrlActiveKickingPlan,
  rate = ORIGINAL_TRY_RATE, tryChanceOverride?: number): NrlScoring {
  const scoring: NrlScoring = { tries: 0, conversions: 0, penalties: 0, fieldGoals: 0, longFieldGoals: 0 };
  const convert = conversionChance(edge, conversion);
  const tryChance = tryChanceOverride ?? (clamp(rate.base + edge / rate.edgeDivisor, 0.065, 0.40)
    + (plan === 'territory' ? -0.025 : plan === 'contest' ? 0.025 : 0));
  for (let chance = 0; chance < chances; chance++) {
    const tryRoll = rng();
    const conversionRoll = rng();
    if (tryRoll < tryChance) {
      scoring.tries++;
      if (conversionRoll < convert) scoring.conversions++;
    }
  }
  return scoring;
}

function scoringChances(rng: () => number, edge: number, chances: number, conversion = 0,
  rate = ORIGINAL_TRY_RATE, tryChanceOverride?: number): NrlScoring {
  const scoring = tryChances(rng, edge, chances, conversion, undefined, rate, tryChanceOverride);
  if (rng() < (chances === 18 ? 0.21 : 0.04)) scoring.penalties++;
  return scoring;
}

function worldCupTryChance(edge: number, ratingGap: number): number | undefined {
  const excess = Math.abs(ratingGap) - 4;
  if (excess <= 0) return undefined;
  return clamp(ORIGINAL_TRY_RATE.base + edge / ORIGINAL_TRY_RATE.edgeDivisor
    + excess * (ratingGap > 0 ? 0.022 : -0.004), 0.025, 0.62);
}

// Saved Origin and version 1 World Cup rounds replay the default calculation and RNG draws.
export function scoreNrlRepresentativeMatch(home: NrlSelectedSquad & { tactic: NrlTactic },
  away: NrlSelectedSquad & { tactic: NrlTactic }, rng: () => number, neutral: boolean, worldCupRatingGap = 0) {
  const homeBase = matchdayBase(home, nrlBenchRotation(home));
  const awayBase = matchdayBase(away, nrlBenchRotation(away));
  const homeTactic = TACTIC_EFFECT[home.tactic];
  const awayTactic = TACTIC_EFFECT[away.tactic];
  const venue = neutral ? 0 : 2;
  const homeEdge = homeBase + homeTactic.attack - awayBase - awayTactic.defense + venue;
  const awayEdge = awayBase + awayTactic.attack - homeBase - homeTactic.defense - venue;
  const homeScoring = scoringChances(rng, homeEdge, 18, 0, ORIGINAL_TRY_RATE, worldCupTryChance(homeEdge, worldCupRatingGap));
  const awayScoring = scoringChances(rng, awayEdge, 18, 0, ORIGINAL_TRY_RATE, worldCupTryChance(awayEdge, -worldCupRatingGap));
  const goldenPoint = scoreOf(homeScoring) === scoreOf(awayScoring);
  if (goldenPoint) {
    const winner = rng() < clamp(0.5 + (homeEdge - awayEdge) / 140, 0.25, 0.75) ? homeScoring : awayScoring;
    winner.fieldGoals++;
  }
  return { homeScore: scoreOf(homeScoring), awayScore: scoreOf(awayScoring), goldenPoint };
}

function penaltyPeriod(roll: number): 0 | 1 | 2 | 3 {
  if (roll < 0.105) return 1;
  if (roll < 0.105 + 0.105 * 5 / 9) return 2;
  return roll < REGULATION_PENALTY_CHANCE ? 3 : 0;
}

function takeRegulationPenalty(scoring: NrlScoring, edge: number, conversion: number, tap?: () => number): NrlPenaltyTapPoints | undefined {
  if (!tap) {
    scoring.penalties++;
    return;
  }
  if (tap() >= clamp(0.36 + edge / 155, 0.22, 0.47)) return 0;
  scoring.tries++;
  if (tap() >= conversionChance(edge, conversion)) return 4;
  scoring.conversions++;
  return 6;
}

function regulationHalves(rng: () => number, openingEdge: number, closingEdge: number, conversion: number, rate: typeof ORIGINAL_TRY_RATE,
  tap?: () => number, plan?: NrlActiveKickingPlan) {
  const first = tryChances(rng, openingEdge, 9, conversion, plan, rate);
  const second = tryChances(rng, closingEdge, 9, conversion, plan, rate);
  // Keep the same 18 chance pairs and single penalty roll as Quick Sim.
  const period = penaltyPeriod(rng());
  const penaltyTap = period ? takeRegulationPenalty(period === 1 ? first : second,
    period === 1 ? openingEdge : closingEdge, conversion, tap) : undefined;
  return { first, second, penaltyTap };
}

function regulationStages(rng: () => number, opening: number, middle: number, late: number, conversion: number, rate: typeof ORIGINAL_TRY_RATE,
  tap?: () => number, plan?: NrlActiveKickingPlan, lateTap?: (() => number) | null) {
  const first = tryChances(rng, opening, 9, conversion, plan, rate);
  const through60 = tryChances(rng, middle, 5, conversion, plan, rate);
  const finish = tryChances(rng, late, 4, conversion, plan, rate);
  // Use the same 18 chance pairs and penalty roll as the other match paths.
  const period = penaltyPeriod(rng());
  const penaltyApproach = period === 3 && lateTap !== undefined ? lateTap ?? undefined : tap;
  const penaltyTap = period ? takeRegulationPenalty([first, through60, finish][period - 1],
    [opening, middle, late][period - 1], conversion, penaltyApproach) : undefined;
  addScoring(through60, first);
  return { first, through60, finish, penaltyTap, period };
}

function addScoring(total: NrlScoring, extra: NrlScoring) {
  total.tries += extra.tries;
  total.conversions += extra.conversions;
  total.penalties += extra.penalties;
}

function fixtureRng(state: Pick<NrlManagerState, 'seed' | 'year'>, { round, homeId, awayId }: NrlFixture) {
  return rngFrom(hashLabel(`${state.seed}|${state.year}|${round}|${homeId}|${awayId}`));
}

function clubPenaltyPeriod(state: Pick<NrlManagerState, 'seed' | 'year' | 'clubId'>, fixture: NrlFixture) {
  const rng = fixtureRng(state, fixture);
  // Each side's penalty roll follows its 18 pairs of try and conversion rolls.
  const beforePenalty = 36 + (fixture.homeId === state.clubId ? 0 : 37);
  for (let draw = 0; draw < beforePenalty; draw++) rng();
  return penaltyPeriod(rng());
}

function lateRivalPenalty(state: Pick<NrlManagerState, 'seed' | 'year' | 'clubId'>, fixture: NrlFixture) {
  const clubId = fixture.homeId === state.clubId ? fixture.awayId : fixture.homeId;
  // The rival takes the goal on this regulation roll. Only the managed club can tap.
  return clubPenaltyPeriod({ seed: state.seed, year: state.year, clubId }, fixture) === 3;
}

function captainChallengeEvidence(state: Pick<NrlManagerState, 'seed' | 'year'>, { homeId, awayId, round }: NrlFixture) {
  // A separate match key preserves every scoring and injury draw.
  const rng = rngFrom(hashLabel(`nrl-captain-challenge|${CAPTAIN_CHALLENGE_RULES}|${state.seed}|${state.year}|${round}|${homeId}|${awayId}`));
  const knockOnFirst = rng() < 0.35;
  const replayClear = rng() >= 0.14;
  const captainSawPlay = rng() >= 0.28;
  const captainReadCorrectly = rng() < 0.8;
  const clue = captainSawPlay ? (knockOnFirst === captainReadCorrectly ? 'ball-first' : 'contact-first') : 'obscured';
  const outcome: NrlCaptainChallengeOutcome = replayClear ? (knockOnFirst ? 'overturned' : 'upheld') : 'inconclusive';
  return { clue, outcome } as const;
}

export function nrlCaptainChallengePreview(state: NrlManagerState) {
  const live = state.live;
  if (!live?.captainChallenge) return;
  return { captainId: live.captainChallenge.captainId, clue: captainChallengeEvidence(state, live.fixture).clue };
}

function penaltyTapRng(state: NrlManagerState, { round, homeId, awayId }: NrlFixture, clubId: string, enabled = Boolean(state.penaltyTap)) {
  if (enabled && clubId === state.clubId) return rngFrom(hashLabel(`nrl-penalty-tap|${state.seed}|${state.year}|${round}|${homeId}|${awayId}`));
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
  return clubEdges(fixtureEdges(state, fixture, opponentStrength, nrlBenchRotation(state), options), fixture.homeId === state.clubId);
}

function clubEdges({ homeEdge, awayEdge }: ReturnType<typeof fixtureEdges>, managedAtHome: boolean) {
  return managedAtHome
    ? { attackEdge: homeEdge, defenseEdge: -awayEdge }
    : { attackEdge: awayEdge, defenseEdge: -homeEdge };
}

function drawHalftime(state: NrlManagerState, fixture: NrlFixture, opponentStrength: ReadonlyMap<string, number> | undefined,
  options: NrlRoundOptions, heldReserveId?: string): NrlLiveHalf {
  const rng = fixtureRng(state, fixture);
  const rotation = nrlBenchRotation(state, heldReserveId);
  const { homeEdge, awayEdge } = fixtureEdges(state, fixture, opponentStrength, rotation, options);
  const rate = fixtureTryRate(state, fixture);
  const homeScoring = regulationHalves(rng, homeEdge, homeEdge, conversionBoost(state, fixture.homeId),
    rate, penaltyTapRng(state, fixture, fixture.homeId), state.kickingPlan).first;
  const awayScoring = regulationHalves(rng, awayEdge, awayEdge, conversionBoost(state, fixture.awayId),
    rate, penaltyTapRng(state, fixture, fixture.awayId), state.kickingPlan).first;
  const live = { fixture, homeScoring, awayScoring, ...(heldReserveId && { heldReserveId }) };
  if (!state.halftimeInjuryCover || fixture.finalsRound) return live;
  const appeared = new Set([...rotation.values()].map(player => player.id));
  const injury = matchInjury(state, appeared, options.medicalReduction ?? 0, options.awayRecovery ?? 0);
  return injury && nrlHalftimeInterchanges({ ...state, live }).some(choice => choice.starterId === injury.playerId)
    ? { ...live, halftimeInjury: injury } : live;
}

export function validNrlLiveScore(state: NrlManagerState, opponentStrength?: ReadonlyMap<string, number>, options: NrlRoundOptions = {}): boolean {
  if (!state.live) return true;
  const actual = state.live;
  const expected = drawHalftime(state, actual.fixture, opponentStrength, options, actual.heldReserveId);
  const same = (a: NrlScoring, b: NrlScoring) => a.tries === b.tries && a.conversions === b.conversions && a.penalties === b.penalties;
  if (!same(actual.homeScoring, expected.homeScoring) || !same(actual.awayScoring, expected.awayScoring)
    || actual.halftimeInjury?.playerId !== expected.halftimeInjury?.playerId
    || actual.halftimeInjury?.rounds !== expected.halftimeInjury?.rounds) return false;
  if (actual.minute60) {
    if (actual.halftimeInjury && actual.minute60.interchange?.starterId !== actual.halftimeInjury.playerId) return false;
    const decision = halftimeDecision(state, actual, actual.minute60, options);
    if (!decision || decision.attackPlan !== actual.minute60.attackPlan) return false;
    const scores = minute60Scores(state, decision, opponentStrength, options);
    if (!same(scores.homeScoring, actual.minute60.homeScoring) || !same(scores.awayScoring, actual.minute60.awayScoring)) return false;
  }
  const challenge = actual.captainChallenge;
  if (challenge) {
    const decision = liveFinishDecision(state, actual, challenge.finish, options);
    return Boolean(decision && challengeCaptainId(state, decision) === challenge.captainId);
  }
  const pending = actual.goldenPoint;
  if (!pending) return true;
  const decision = liveFinishDecision(state, actual, pending.finish, options);
  if (pending.captainChallenge) {
    if (!decision || challengeCaptainId(state, decision) !== pending.captainChallenge.captainId
      || captainChallengeEvidence(state, actual.fixture).outcome !== pending.captainChallenge.outcome) return false;
    decision.captainChallenge = pending.captainChallenge;
  }
  const tie = decision && goldenPointTie(state, decision, opponentStrength, options);
  if (!tie || tie.score !== pending.score) return false;
  return !pending.regulation || pending.regulation.every((score, side) =>
    scoringKinds.every(kind => score[kind] === tie.regulation[side][kind]));
}

function closingSelection(state: NrlManagerState, rotation: ReadonlyMap<string, NrlPlayer>, decision: NrlHalftimeDecision) {
  const lineup = { ...state.lineup };
  const finalRotation = new Map(rotation);
  for (const { role, starterId, reserveId } of decision.interchanges) {
    lineup[role] = reserveId;
    finalRotation.delete(starterId);
  }
  const { attackPlan, lateInterchange, returnInterchange, lateTactic, lateAttackPlan } = decision;
  const secondHalf = { ...withLineup(state, lineup), tactic: decision.tactic,
    ...(attackPlan && { attackPlan: attackPlan === 'standard' ? undefined : attackPlan }) };
  const lateLineup = lateInterchange ? { ...lineup, [lateInterchange.role]: lateInterchange.reserveId }
    : returnInterchange ? { ...lineup, [returnInterchange.role]: returnInterchange.starterId } : null;
  const lateState = lateLineup || lateTactic || lateAttackPlan ? {
    ...(lateLineup ? withLineup(secondHalf, lateLineup) : secondHalf),
    tactic: lateTactic ?? decision.tactic,
    ...(lateAttackPlan && { attackPlan: lateAttackPlan === 'standard' ? undefined : lateAttackPlan }),
  } : undefined;
  return { state: secondHalf, rotation: finalRotation, talk: decision.talk, attackPlan, lateTactic, lateAttackPlan, lateState,
    fieldGoalPlan: decision.fieldGoalPlan, latePenaltyApproach: decision.latePenaltyApproach };
}

function challengeCaptainId(state: NrlManagerState, decision: NrlHalftimeDecision) {
  const { fixture, heldReserveId, captainChallengeRules } = decision.live;
  if (state.domesticScoringModel !== NRL_DOMESTIC_SCORING_MODEL || fixture.finalsRound
    || captainChallengeRules !== CAPTAIN_CHALLENGE_RULES || !decision.live.minute60 || !lateRivalPenalty(state, fixture)) return;
  const closing = closingSelection(state, nrlBenchRotation(state, heldReserveId), decision);
  return nrlOnFieldCaptain(closing.lateState ?? closing.state);
}

function regulationEdges({ homeEdge, awayEdge }: ReturnType<typeof fixtureEdges>, talk: NrlHalftimeTalk | undefined,
  managedAtHome: boolean, fieldGoalPlan = false) {
  const { attack, defense } = talk ? NRL_HALFTIME_TALKS[talk] : { attack: 0, defense: 0 };
  const ownAttack = attack - (fieldGoalPlan ? SET_FIELD_GOAL_ATTACK_COST : 0);
  return { homeEdge: homeEdge + (managedAtHome ? ownAttack : -defense), awayEdge: awayEdge + (managedAtHome ? -defense : ownAttack) };
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
  const rate = fixtureTryRate(state, fixture);
  const homeScoring = regulationStages(rng, opening.homeEdge, mid.homeEdge, mid.homeEdge, conversionBoost(state, fixture.homeId),
    rate, penaltyTapRng(state, fixture, fixture.homeId), state.kickingPlan).through60;
  const awayScoring = regulationStages(rng, opening.awayEdge, mid.awayEdge, mid.awayEdge, conversionBoost(state, fixture.awayId),
    rate, penaltyTapRng(state, fixture, fixture.awayId), state.kickingPlan).through60;
  return { homeScoring, awayScoring };
}

function playFixture(state: NrlManagerState, fixture: NrlFixture, opponentStrength: ReadonlyMap<string, number> | undefined,
  rotation: ReadonlyMap<string, NrlPlayer>,
  closing: ReturnType<typeof closingSelection> | undefined,
  options: NrlRoundOptions, minute60?: NrlLiveMinute60, goldenPointApproach?: NrlActiveGoldenPointApproach,
  captainChallenge?: NrlCaptainChallengeReceipt): NrlMatchResult {
  const { homeId, awayId, finalsRound } = fixture;
  const managed = homeId === state.clubId || awayId === state.clubId;
  const rng = fixtureRng(state, fixture);
  const rate = fixtureTryRate(state, fixture);
  const opening = fixtureEdges(state, fixture, opponentStrength, rotation, options);
  const throughHalf = closing ? fixtureEdges(closing.state, fixture, opponentStrength, closing.rotation, options) : opening;
  const extra = closing?.lateState
    ? fixtureEdges(closing.lateState, fixture, opponentStrength, closing.rotation, options) : throughHalf;
  const { homeEdge, awayEdge } = extra;
  const middle = regulationEdges(throughHalf, closing?.talk, homeId === state.clubId);
  const fieldGoalPlan = closing?.fieldGoalPlan;
  const latePenaltyApproach = closing?.latePenaltyApproach;
  const late = regulationEdges(extra, closing?.talk, homeId === state.clubId, fieldGoalPlan);
  const homeSetsUpKick = fieldGoalPlan && homeId === state.clubId;
  const awaySetsUpKick = fieldGoalPlan && awayId === state.clubId;
  const homeConversion = conversionBoost(state, homeId), awayConversion = conversionBoost(state, awayId);
  const regulation = (openingEdge: number, closingEdge: number, lateEdge: number, conversion: number, clubId: string) => {
    if (!managed) return { total: scoringChances(rng, openingEdge, 18, 0, rate) };
    const tap = penaltyTapRng(state, fixture, clubId);
    if (closing?.lateState || fieldGoalPlan || latePenaltyApproach) {
      const approach = clubId === state.clubId ? latePenaltyApproach : undefined;
      const lateTap = approach === 'goal' ? null : approach === 'tap' ? penaltyTapRng(state, fixture, clubId, true) : undefined;
      const { first, through60, finish, penaltyTap, period } = regulationStages(rng, openingEdge, closingEdge, lateEdge, conversion,
        rate, tap, state.kickingPlan, lateTap);
      addScoring(through60, finish);
      const latePenalty: NrlLatePenalty | undefined = approach ? { approach, points: period === 3 ? penaltyTap ?? 2 : 'none' } : undefined;
      return { total: through60, halfTime: first, penaltyTap: approach && period === 3 ? undefined : penaltyTap, latePenalty };
    }
    const { first, second, penaltyTap } = regulationHalves(rng, openingEdge, closingEdge, conversion, rate, tap, state.kickingPlan);
    const halfTime = { ...first };
    addScoring(first, second);
    return { total: first, halfTime, penaltyTap };
  };
  const home = regulation(opening.homeEdge, middle.homeEdge, late.homeEdge, homeConversion, homeId);
  const away = regulation(opening.awayEdge, middle.awayEdge, late.awayEdge, awayConversion, awayId);
  const penaltyTap = home.penaltyTap ?? away.penaltyTap;
  const latePenalty = home.latePenalty ?? away.latePenalty;
  const homeScoring = home.total, awayScoring = away.total;
  const gap = scoreOf(homeScoring) - scoreOf(awayScoring);
  const homeKick = rng();
  const awayKick = rng();
  const homeKickPoints = regulationFieldGoal(homeScoring, gap, homeKick, homeSetsUpKick ? SET_FIELD_GOAL_CHANCE : FIELD_GOAL_CHANCE);
  const awayKickPoints = regulationFieldGoal(awayScoring, -gap, awayKick, awaySetsUpKick ? SET_FIELD_GOAL_CHANCE : FIELD_GOAL_CHANCE);
  if (captainChallenge?.outcome === 'overturned') {
    // Correct this restart without changing the other regulation scoring opportunities.
    const rival = homeId === state.clubId ? awayScoring : homeScoring;
    rival.penalties--;
  }
  // NRL finals play ten minutes before sudden death. A regular match can finish level.
  // https://www.nrl.com/siteassets/operations/the-game/nrl-international-rules-book-2023.pdf
  const regulationScore: NrlScorePair = [scoreOf(homeScoring), scoreOf(awayScoring)];
  const phaseScoring: NrlMatchResult['phaseScoring'] = managed ? {
    halfTime: [home.halfTime!, away.halfTime!],
    ...(minute60 && { at60: [minute60.homeScoring, minute60.awayScoring] }),
    regulation: [{ ...homeScoring }, { ...awayScoring }],
  } : undefined;
  const extraTime = regulationScore[0] === regulationScore[1];
  if (extraTime && finalsRound) {
    addScoring(homeScoring, scoringChances(rng, homeEdge, 2, homeConversion));
    addScoring(awayScoring, scoringChances(rng, awayEdge, 2, awayConversion));
  }
  const stillTied = scoreOf(homeScoring) === scoreOf(awayScoring);
  const regularRoll = stillTied && !finalsRound ? rng() : undefined;
  const recordGoldenPoint = regularRoll !== undefined && managed && Boolean(state.kickerId);
  let goldenPoint: NrlGoldenPoint | undefined = recordGoldenPoint ? 'draw' : undefined;
  const goldenPointChance = GOLDEN_POINT_SCORE_CHANCE + (goldenPointApproach === 'chase' ? GOLDEN_POINT_APPROACH_CHANGE
    : goldenPointApproach === 'protect' ? -GOLDEN_POINT_APPROACH_CHANGE : 0);
  if (stillTied && (finalsRound || regularRoll < goldenPointChance)) {
    const golden = rng() < clamp(0.5 + (homeEdge - awayEdge) / 140, 0.25, 0.75) ? homeScoring : awayScoring;
    const method = rng();
    let score: NrlGoldenScore = 'fieldGoals';
    if (method < 0.09) score = 'tries';
    else if (method < 0.17) score = 'penalties';
    else if (method < 0.19) score = 'longFieldGoals';
    golden[score]++;
    // Use equal scoring chances in each five-minute period.
    if (recordGoldenPoint) goldenPoint = { period: regularRoll < 1 - Math.sqrt(1 - goldenPointChance) ? 1 : 2, score };
  }
  const result: NrlMatchResult = {
    ...fixture, homeScoring, awayScoring, homeScore: scoreOf(homeScoring), awayScore: scoreOf(awayScoring), extraTime,
    ...(goldenPoint ? { goldenPoint } : {}),
    ...(goldenPoint && goldenPointApproach && { goldenPointApproach }),
    ...(managed && { scorePeriods: { halfTime: [scoreOf(home.halfTime!), scoreOf(away.halfTime!)],
      ...(minute60 && { at60: [scoreOf(minute60.homeScoring), scoreOf(minute60.awayScoring)] }),
      regulation: regulationScore } }),
    ...(phaseScoring && { phaseScoring }),
    ...(closing?.talk ? { halftimeTalk: closing.talk } : {}),
    ...(closing?.attackPlan && { halftimeAttackPlan: closing.attackPlan }),
    ...(closing?.lateTactic ? { minute60Tactic: closing.lateTactic } : {}),
    ...(closing?.lateAttackPlan && { minute60AttackPlan: closing.lateAttackPlan }),
    ...(fieldGoalPlan && { minute60FieldGoal: homeSetsUpKick ? homeKickPoints : awayKickPoints }),
    ...(managed && state.penaltyTap && (!latePenalty || penaltyTap !== undefined) && { penaltyTap: penaltyTap ?? 'none' as const }),
    ...(latePenalty && { latePenalty }),
    ...(managed && state.kickingPlan && { kickingPlan: state.kickingPlan }),
    ...(captainChallenge && { captainChallenge }),
  };
  return rotation.size && managed
    ? { ...result, benchUsed: [...rotation.values()].map(player => player.id) }
    : result;
}

function regulationFieldGoal(scoring: NrlScoring, gap: number, roll: number, chance: number) {
  if (gap > 0 || gap < -2 || roll >= chance) return 0;
  if (gap === -2 || roll < 0.008) {
    scoring.longFieldGoals++;
    return 2;
  }
  scoring.fieldGoals++;
  return 1;
}

function matchClosingSelection(state: NrlManagerState, rotation: ReadonlyMap<string, NrlPlayer>, halftime?: NrlHalftimeDecision) {
  return halftime && (halftime.interchanges.length || halftime.talk || halftime.attackPlan || halftime.lateTactic || halftime.lateAttackPlan
    || halftime.lateInterchange || halftime.fieldGoalPlan || halftime.latePenaltyApproach || halftime.tactic !== state.tactic)
    ? closingSelection(state, rotation, halftime) : undefined;
}

function goldenPointTie(state: NrlManagerState, decision: NrlHalftimeDecision,
  opponentStrength: ReadonlyMap<string, number> | undefined, options: NrlRoundOptions) {
  const live = decision.live;
  const { fixture, heldReserveId, minute60 } = live;
  if (fixture.finalsRound) return;
  const rotation = nrlBenchRotation(state, heldReserveId);
  const closed = matchClosingSelection(state, rotation, decision);
  const result = playFixture(state, fixture, opponentStrength, rotation, closed, options, minute60, undefined, decision.captainChallenge);
  const score = result.scorePeriods!.regulation;
  if (score[0] === score[1] && result.phaseScoring) return { score: score[0], regulation: result.phaseScoring.regulation };
}

function advanceRound(state: NrlManagerState, opponentStrength: ReadonlyMap<string, number> | undefined,
  options: NrlRoundOptions, halftime?: NrlHalftimeDecision, goldenPointApproach?: NrlActiveGoldenPointApproach): NrlManagerState {
  const { medicalReduction = 0, awayRecovery = 0 } = options;
  const fixtures = nrlRoundFixtures(state);
  const played = fixtures.some(match => match.homeId === state.clubId || match.awayId === state.clubId);
  const starters = new Set(Object.values(state.lineup));
  const rotation = played ? nrlBenchRotation(state, halftime?.live.heldReserveId) : new Map<string, NrlPlayer>();
  const used = new Set([...rotation.values()].map(player => player.id));
  const coverPair = state.openingCoverId === undefined ? undefined : [...rotation].find(([, reserve]) => reserve.id === state.openingCoverId);
  const interchanges = halftime?.interchanges ?? [];
  const entering = interchanges.find(change => change.enteredAtHalf);
  const lateInterchange = halftime?.lateInterchange;
  const returning = halftime?.returnInterchange;
  if (entering) used.add(entering.reserveId);
  if (lateInterchange) used.add(lateInterchange.reserveId);
  const closing = matchClosingSelection(state, rotation, halftime);
  const squad = state.squad.map(player => {
    const recovered = playerReadyFitness(state, player, played, awayRecovery);
    const before = !played && player.id === options.intensiveByePlayerId ? intensivePositionFitness(recovered) : recovered;
    const starterFatigue = played && starters.has(player.id) ? 15 : 0;
    const relief = rotation.has(player.id) ? 4 : 0;
    const reserveFatigue = used.has(player.id) ? (player.id === lateInterchange?.reserveId ? 4 : 8) : 0;
    // A previously unused reserve shares the full match equally. A rotating reserve extends their original spell.
    const outgoing = interchanges.find(change => player.id === change.starterId);
    const extraRest = outgoing ? (outgoing.enteredAtHalf ? 7 : 5) : player.id === lateInterchange?.starterId ? 4 : 0;
    const extraWork = interchanges.some(change => !change.enteredAtHalf && player.id === change.reserveId) ? 5 : 0;
    const returnWork = player.id === returning?.starterId ? 4 : player.id === returning?.reserveId ? -4 : 0;
    return { ...player, fitness: Math.max(0, before - starterFatigue + relief - reserveFatigue + extraRest - extraWork - returnWork) };
  });
  const halftimeInjury = halftime?.live.halftimeInjury;
  const injury = halftimeInjury ?? (played && state.injuryTracking ? matchInjury(state, used, medicalReduction, awayRecovery) : undefined);
  const results = [...state.results, ...fixtures.map(fixture => {
    const managed = fixture.homeId === state.clubId || fixture.awayId === state.clubId;
    const result = playFixture(state, fixture, opponentStrength, rotation, managed ? closing : undefined, options,
      managed ? halftime?.live.minute60 : undefined, managed ? goldenPointApproach : undefined, managed ? halftime?.captainChallenge : undefined);
    if (!managed) return result;
    const withInjury = injury ? { ...result, injury } : result;
    if (!state.kickerId) return withInjury;
    const { captainId, viceCaptainId } = state;
    const actingCaptain = captainId && viceCaptainId && [state, closing?.state, closing?.lateState]
      .some(phase => phase && nrlOnFieldCaptain(phase) === viceCaptainId)
      ? { clubCaptainId: captainId, viceCaptainId } : undefined;
    const matchReport = {
      ...withInjury,
      ...(halftimeInjury && { halftimeInjury: true as const }),
      ...(state.originRestId && { originRestId: state.originRestId }),
      ...(state.individualRecoveryId && { individualRecoveryId: state.individualRecoveryId }),
      ...(state.individualSkillWorkId && (starters.has(state.individualSkillWorkId) || used.has(state.individualSkillWorkId))
        && { individualSkillWorkId: state.individualSkillWorkId }),
      ...(state.intensivePositionTrainingId && { intensivePositionTrainingId: state.intensivePositionTrainingId }),
      ...(state.preparation === 'goalKickingDrills' && { goalKickingDrills: true as const }),
      ...(state.openInterchange && { openInterchange: true as const }),
      ...(halftime?.quickInterchange && { quickInterchange: halftime.quickInterchange }),
      ...(coverPair && { openingCover: { starterId: coverPair[0], reserveId: coverPair[1].id } }),
      ...(isNrlDirectionalPlan(state.attackPlan) && { openingAttackPlan: state.attackPlan }),
      ...(state.attackPlan === 'counter' && { counterStyle: nrlCounterPlan(state, fixture).style }),
      ...(state.captainId && (starters.has(state.captainId) || lateInterchange?.reserveId === state.captainId
        || interchanges.some(change => change.reserveId === state.captainId))
        && { captainId: state.captainId }),
      ...(actingCaptain && { actingCaptain }),
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
      const late = (lateInterchange || returning) && mid && lateLineup ? {
        through60: home ? mid.homeScoring : mid.awayScoring,
        kickerId: closing.lateState?.kickerId,
        starting: NRL_ROLES.map(role => ({ role, id: lateLineup[role] })),
        rotation: closing.rotation,
      } : undefined;
      const playerScoring = makeNrlInterchangeScoringReport(totals, first, { starting, rotation },
        { starting: closingStarting, rotation: closing.rotation }, state.kickerId, attribution, late, closing.state.kickerId);
      const [halftimeInterchange, secondHalftimeInterchange] = interchanges.map(({ starterId, reserveId, enteredAtHalf }) => ({
        starterId, reserveId, ...(enteredAtHalf && { enteredAtHalf }),
      }));
      return {
        ...matchReport, playerScoring, ...(halftimeInterchange && { halftimeInterchange }),
        ...(secondHalftimeInterchange && { secondHalftimeInterchange }),
        ...(lateInterchange && { minute60Interchange: { starterId: lateInterchange.starterId, reserveId: lateInterchange.reserveId } }),
        ...(returning && { minute60Return: { starterId: returning.starterId, reserveId: returning.reserveId } }),
        ...((entering || lateInterchange) && { benchUsed: [...used] }),
      };
    }
    return { ...matchReport, playerScoring: makeNrlScoringReport(totals, starting, rotation, state.kickerId, attribution) };
  })];
  const championId = premierOf(FINALS, finalsOutcomes(results))?.winner ?? null;
  const round = Math.min(state.round + 1, lastRound(state.year));
  const { attackPlan: _playedPlan, individualRecoveryId: _spentRecovery, individualSkillWorkId: _spentSkillWork,
    intensivePositionTrainingId: _spentTraining, openInterchange: _playedInterchange,
    penaltyTap: _takenPenaltyTap, kickingPlan: _playedKickingPlan, quickInterchange: _playedQuickInterchange,
    openingCoverId: _playedOpeningCover, originRestId: _spentOriginRest, ...settled } = state;
  const next: NrlManagerState = {
    ...settled, round, squad, results, championId, preparation: null,
    phase: championId ? 'complete' : round > nrlRegularRounds(state.year) ? 'finals' : 'regular',
  };
  return state.injuryTracking ? repairMatchday(next) : next;
}

function validLiveAttackPlan(state: NrlManagerState, plan: unknown, options: NrlRoundOptions): plan is NrlAttackPlan {
  return !!state.kickerId && !!state.bench && isNrlAttackPlan(plan)
    && (!isNrlSpecialistPlan(plan) || !!options.planRivalRatings);
}

function halftimeDecision(state: NrlManagerState, live: NrlLiveHalf, choices: NrlHalftimeChoice, options: NrlRoundOptions): NrlHalftimeDecision | null {
  const { tactic, talk, attackPlan, interchange, secondInterchange } = choices;
  if (!NRL_TACTICS.includes(tactic) || (talk !== undefined && !isNrlHalftimeTalk(talk))
    || (attackPlan !== undefined && !validLiveAttackPlan(state, attackPlan, options))
    || (secondInterchange !== undefined && interchange === undefined)) return null;
  const available = nrlHalftimeInterchanges(state);
  const injured = live.halftimeInjury?.playerId;
  const cover = injured ? available.find(option => option.starterId === injured) : undefined;
  if (injured && (!cover || (interchange && interchange.starterId !== injured))) return null;
  const interchanges: NrlHalftimeOption[] = [];
  for (const requested of [interchange ?? cover, secondInterchange]) {
    if (requested === undefined) continue;
    const choice = requested && available.find(option =>
      option.starterId === requested.starterId && option.reserveId === requested.reserveId);
    if (!choice || interchanges.some(first => !nrlCanPairHalftimeInterchanges(state, first, choice) || first.reserveId === choice.reserveId)) return null;
    interchanges.push(choice);
  }
  return { live, tactic, interchanges, talk, attackPlan: attackPlan === (state.attackPlan ?? 'standard') ? undefined : attackPlan };
}

function minute60Decision(state: NrlManagerState, live: NrlLiveHalf, choice: Extract<NrlAction, { type: 'finishMinute60' }>,
  options: NrlRoundOptions): NrlHalftimeDecision | null {
  const { tactic, fieldGoalPlan, reserveId, reserveRole, attackPlan, latePenaltyApproach, returnStarterId } = choice;
  if (!live.minute60 || !NRL_TACTICS.includes(tactic)) return null;
  if (latePenaltyApproach !== undefined && (state.phase !== 'regular' || (latePenaltyApproach !== 'goal' && latePenaltyApproach !== 'tap'))) return null;
  if (fieldGoalPlan !== undefined && (fieldGoalPlan !== true || !nrlMinute60FieldGoalAvailable(state))) return null;
  const decision = halftimeDecision(state, live, live.minute60, options);
  if (!decision) return null;
  if (reserveId !== undefined || reserveRole !== undefined) {
    if (returnStarterId !== undefined) return null;
    const target = reserveRole === undefined ? state.squad.find(player => player.id === reserveId)?.role : reserveRole;
    const late = nrlMinute60Interchanges(state).find(option => option.reserveId === reserveId && option.role === target);
    if (!late) return null;
    decision.lateInterchange = late;
  }
  if (returnStarterId !== undefined) {
    const returning = nrlMinute60Returns(state).find(option => option.starterId === returnStarterId);
    if (!returning) return null;
    decision.returnInterchange = returning;
  }
  if (attackPlan !== undefined) {
    if (!validLiveAttackPlan(state, attackPlan, options)) return null;
    if (attackPlan !== (decision.attackPlan ?? state.attackPlan ?? 'standard')) decision.lateAttackPlan = attackPlan;
  }
  if (tactic !== decision.tactic) decision.lateTactic = tactic;
  if (fieldGoalPlan) decision.fieldGoalPlan = true;
  if (latePenaltyApproach && latePenaltyApproach !== (state.penaltyTap ? 'tap' : 'goal')) decision.latePenaltyApproach = latePenaltyApproach;
  return decision;
}

function liveFinishDecision(state: NrlManagerState, live: NrlLiveHalf, choice: NrlLivePlanChoice, options: NrlRoundOptions) {
  if (choice.year !== state.year || choice.round !== state.round) return null;
  if (choice.type === 'finishMinute60') return minute60Decision(state, live, choice, options);
  return live.minute60 ? null : halftimeDecision(state, live, choice, options);
}

function finishLiveRound(state: NrlManagerState, decision: NrlHalftimeDecision, finish: NrlLivePlanChoice,
  pauseForGoldenPoint: true | undefined, opponentStrength: ReadonlyMap<string, number> | undefined, options: NrlRoundOptions) {
  const { live: _live, ...matchday } = state;
  const tie = pauseForGoldenPoint === true && goldenPointTie(matchday, decision, opponentStrength, options);
  if (!tie) return advanceRound(matchday, opponentStrength, options, decision);
  const { captainChallenge: _pending, ...live } = decision.live;
  const { captainChallenge } = decision;
  return { ...state, live: { ...live, goldenPoint: { ...tie, finish, ...(captainChallenge && { captainChallenge }) } } };
}

function quickHalftimeDecision(state: NrlManagerState, opponentStrength: ReadonlyMap<string, number> | undefined,
  options: NrlRoundOptions): NrlHalftimeDecision | undefined {
  const plan = state.quickInterchange;
  if (!plan && !state.halftimeInjuryCover) return;
  const { clubMatch } = nrlNextRound(state);
  if (!clubMatch || (!plan && clubMatch.finalsRound)) return;
  const opening = drawHalftime(state, clubMatch, opponentStrength, options);
  const halftime = halftimeDecision({ ...state, live: opening }, opening, { tactic: state.tactic }, options);
  if (!halftime) return;
  const [cover] = halftime.interchanges;
  if (!plan || cover?.enteredAtHalf || cover?.role === plan.role) return cover ? halftime : undefined;
  const minute60 = {
    tactic: state.tactic, ...minute60Scores(state, halftime, opponentStrength, options),
    ...(cover && { interchange: { starterId: cover.starterId, reserveId: cover.reserveId } }),
  };
  const live = { ...opening, minute60 };
  const choice = nrlQuickInterchangeOptions(state).find(row => row.reserveId === plan.reserveId && row.role === plan.role);
  const due = quickInterchangeDue([scoreOf(minute60.homeScoring), scoreOf(minute60.awayScoring)], clubMatch.homeId === state.clubId, plan.trigger);
  const { year, round, tactic } = state;
  const decision = minute60Decision({ ...state, live }, live, { type: 'finishMinute60', year, round, tactic,
    ...(due && choice && { reserveId: choice.reserveId, reserveRole: choice.role }) }, options);
  return decision ? { ...decision, quickInterchange: plan } : cover ? halftime : undefined;
}

export function nrlLivePhasePreview(state: NrlManagerState, choice: NrlLivePlanChoice,
  opponentStrength: ReadonlyMap<string, number>, options: NrlRoundOptions) {
  const { live } = state;
  if (!live || choice.year !== state.year || choice.round !== state.round || !options.planRivalRatings) return null;
  if (Boolean(live.minute60) !== (choice.type === 'finishMinute60')) return null;
  const decision = choice.type === 'finishMinute60'
    ? minute60Decision(state, live, choice, options) : halftimeDecision(state, live, choice, options);
  const unchanged = halftimeDecision(state, live, live.minute60 ?? { tactic: state.tactic }, options);
  if (!decision || !unchanged) return null;
  const { fixture, heldReserveId } = live;
  const rotation = nrlBenchRotation(state, heldReserveId);
  const atHome = fixture.homeId === state.clubId;
  const edges = (plan: NrlHalftimeDecision) => {
    const phase = closingSelection(state, rotation, plan);
    const teamEdges = fixtureEdges(phase.lateState ?? phase.state, fixture, opponentStrength, phase.rotation, options);
    return clubEdges(regulationEdges(teamEdges, phase.talk, atHome, phase.fieldGoalPlan), atHome);
  };
  const current = edges(unchanged);
  const planned = edges(decision);
  return { ...planned, attackChange: planned.attackEdge - current.attackEdge, defenseChange: planned.defenseEdge - current.defenseEdge };
}

export function reduceNrlSeason(state: NrlManagerState, action: NrlAction,
  opponentStrength?: ReadonlyMap<string, number>, options: NrlRoundOptions = {}): NrlManagerState {
  if (state.phase === 'complete') return state;
  if (state.live?.captainChallenge ? action.type !== 'resolveCaptainChallenge'
    : state.live?.goldenPoint ? action.type !== 'settleGoldenPoint'
    : state.live && action.type !== 'finishLive' && action.type !== 'reachMinute60' && action.type !== 'finishMinute60') return state;
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
        ? repairMatchday(selected) : retainOpeningCover(selected);
    }
    case 'swapStarters': {
      const { year, clubId, round, fromRole, toRole, fromPlayerId, toPlayerId } = action;
      if (state.year !== year || state.clubId !== clubId || state.round !== round
        || !nrlStarterSwaps(state).some(swap => swap.fromRole === fromRole && swap.toRole === toRole
          && swap.fromPlayerId === fromPlayerId && swap.toPlayerId === toPlayerId)) return state;
      return retainOpeningCover({ ...state, lineup: { ...state.lineup, [fromRole]: toPlayerId, [toRole]: fromPlayerId } });
    }
    case 'selectBench': {
      if (!state.bench || !integerIn(action.slot, 0, NRL_BENCH_SIZE - 1) || state.bench[action.slot] === action.playerId
        || Object.values(state.lineup).includes(action.playerId) || nrlUnavailable(state).has(action.playerId)
        || !state.squad.some(player => player.id === action.playerId)) return state;
      const bench = state.bench.slice();
      const previousSlot = bench.indexOf(action.playerId);
      if (previousSlot >= 0) bench[previousSlot] = bench[action.slot];
      bench[action.slot] = action.playerId;
      return retainOpeningCover({ ...state, bench });
    }
    case 'setKicker':
      if (!state.kickerId || state.kickerId === action.playerId || !Object.values(state.lineup).includes(action.playerId)) return state;
      return retainOpeningCover({ ...state, kickerId: action.playerId });
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
        const { captainId: _removed, viceCaptainId: _vice, ...next } = state;
        return next;
      }
      if (playerId === state.captainId || !Object.values(state.lineup).includes(playerId)) return state;
      if (playerId === state.viceCaptainId) {
        const { viceCaptainId: _vice, ...next } = state;
        return { ...next, captainId: playerId };
      }
      return { ...state, captainId: playerId };
    }
    case 'setViceCaptain': {
      const { playerId, year, clubId, round } = action;
      if (!state.kickerId || !state.captainId || year !== state.year || clubId !== state.clubId || round !== state.round) return state;
      if (playerId === null) {
        if (!state.viceCaptainId) return state;
        const { viceCaptainId: _vice, ...next } = state;
        return next;
      }
      return playerId === state.captainId || playerId === state.viceCaptainId || !Object.values(state.lineup).includes(playerId)
        ? state : { ...state, viceCaptainId: playerId };
    }
    case 'applyFitLineup': {
      const proposal = nrlFitLineup(state, options.awayRecovery);
      return proposal?.changes.length && proposal.key === action.previewKey ? proposal.next : state;
    }
    case 'setTactic':
      return NRL_TACTICS.includes(action.tactic) && state.tactic !== action.tactic ? { ...state, tactic: action.tactic } : state;
    case 'prepare': {
      const { choice } = action;
      if (state.preparation === choice) return state;
      if (choice === 'train' || choice === 'recover') {
        return { ...(choice === 'recover' ? clearIndividualSkillWork(clearIndividualRecovery(state)) : state), preparation: choice };
      }
      return (choice === 'defensiveDrills' || choice === 'goalKickingDrills' || choice === null)
        && 'year' in action && state.year === action.year && state.clubId === action.clubId && state.round === action.round
        && state.kickerId && (choice !== 'goalKickingDrills' || state.bench) && nrlNextRound(state).clubMatch ? { ...state, preparation: choice } : state;
    }
    case 'setIndividualRecovery': {
      const { year, clubId, round, playerId } = action;
      if (year !== state.year || clubId !== state.clubId || round !== state.round) return state;
      if (playerId === null) return clearIndividualRecovery(state);
      if (playerId === state.individualRecoveryId || !nrlIndividualRecoveryOptions(state).some(player => player.id === playerId)) return state;
      return { ...clearIndividualSkillWork(state), individualRecoveryId: playerId };
    }
    case 'setOpenInterchange': {
      const { enabled, year, clubId, round } = action;
      if (typeof enabled !== 'boolean' || year !== state.year || clubId !== state.clubId || round !== state.round
        || enabled === Boolean(state.openInterchange)) return state;
      if (enabled) return nrlCanOpenInterchange(state) ? { ...state, openInterchange: true } : state;
      const { openInterchange, quickInterchange, ...cleared } = state;
      return cleared;
    }
    case 'setQuickInterchange': {
      const { year, clubId, round, plan } = action;
      if (year !== state.year || clubId !== state.clubId || round !== state.round || !state.openInterchange) return state;
      if (plan === null) {
        if (!state.quickInterchange) return state;
        const { quickInterchange, ...cleared } = state;
        return cleared;
      }
      if (!validQuickInterchange(plan, new Map(state.squad.map(player => [player.id, player])))
        || !nrlQuickInterchangeOptions(state).some(option => option.reserveId === plan.reserveId && option.role === plan.role)
        || (plan.trigger === state.quickInterchange?.trigger && plan.reserveId === state.quickInterchange.reserveId
          && plan.role === state.quickInterchange.role)) return state;
      return { ...state, quickInterchange: { ...plan } };
    }
    case 'setOpeningCover': {
      const { year, clubId, round, reserveId } = action;
      if (year !== state.year || clubId !== state.clubId || round !== state.round || state.phase !== 'regular') return state;
      if (reserveId === null) {
        if (state.openingCoverId === undefined) return state;
        const { openingCoverId, ...next } = state;
        return next;
      }
      return reserveId !== state.openingCoverId && nrlOpeningCoverOptions(state).some(cover => cover.reserve.id === reserveId)
        ? { ...state, openingCoverId: reserveId } : state;
    }
    case 'setPenaltyTap': {
      const { year, clubId, round, enabled } = action;
      if (year !== state.year || clubId !== state.clubId || round !== state.round || typeof enabled !== 'boolean'
        || enabled === Boolean(state.penaltyTap) || !state.kickerId || !state.bench || !nrlNextRound(state).clubMatch) return state;
      if (enabled) return { ...state, penaltyTap: true };
      const { penaltyTap, ...cleared } = state;
      return cleared;
    }
    case 'setKickingPlan': {
      const { year, clubId, round, plan } = action;
      if (year !== state.year || clubId !== state.clubId || round !== state.round || plan === (state.kickingPlan ?? 'mixed')
        || !state.kickerId || !state.bench || !nrlNextRound(state).clubMatch) return state;
      if (isActiveKickingPlan(plan)) return { ...state, kickingPlan: plan };
      if (plan !== 'mixed') return state;
      const { kickingPlan, ...cleared } = state;
      return cleared;
    }
    case 'startLive': {
      if (!state.kickerId || !state.bench) return state;
      const { clubMatch } = nrlNextRound(state);
      const { hold } = action;
      if (!clubMatch || (hold && (hold.year !== state.year || hold.round !== state.round
        || !nrlHoldableReserves(state).some(player => player.id === hold.reserveId)))) return state;
      const live = drawHalftime(state, clubMatch, opponentStrength, options, hold?.reserveId);
      if (action.captainChallengeRules === true && state.domesticScoringModel === NRL_DOMESTIC_SCORING_MODEL && !clubMatch.finalsRound) {
        live.captainChallengeRules = CAPTAIN_CHALLENGE_RULES;
      }
      return { ...state, live };
    }
    case 'finishLive':
    case 'finishMinute60': {
      const { live } = state;
      if (!live) return state;
      const { pauseForGoldenPoint, ...finish } = action;
      const decision = liveFinishDecision(state, live, finish, options);
      if (!decision) return state;
      if (finish.type === 'finishMinute60') {
        const captainId = challengeCaptainId(state, decision);
        if (captainId) return { ...state, live: { ...live, captainChallenge: { captainId, finish,
          ...(pauseForGoldenPoint === true && { pauseForGoldenPoint }) } } };
      }
      return finishLiveRound(state, decision, finish, pauseForGoldenPoint, opponentStrength, options);
    }
    case 'resolveCaptainChallenge': {
      const { live } = state;
      const { year, clubId, round, decision: answer } = action;
      if (!live?.captainChallenge || year !== state.year || clubId !== state.clubId || round !== state.round
        || (answer !== 'accept' && answer !== 'challenge')) return state;
      const { captainId, finish, pauseForGoldenPoint } = live.captainChallenge;
      const decision = liveFinishDecision(state, live, finish, options);
      if (!decision || challengeCaptainId(state, decision) !== captainId) return state;
      if (answer === 'challenge') decision.captainChallenge = {
        rules: CAPTAIN_CHALLENGE_RULES, captainId, outcome: captainChallengeEvidence(state, live.fixture).outcome,
      };
      return finishLiveRound(state, decision, finish, pauseForGoldenPoint, opponentStrength, options);
    }
    case 'settleGoldenPoint': {
      const { live, ...matchday } = state;
      const { year, clubId, round, approach } = action;
      if (!live?.goldenPoint || year !== state.year || clubId !== state.clubId || round !== state.round
        || (approach !== 'standard' && !isActiveGoldenPointApproach(approach))) return state;
      const decision = liveFinishDecision(state, live, live.goldenPoint.finish, options);
      if (decision && live.goldenPoint.captainChallenge) decision.captainChallenge = live.goldenPoint.captainChallenge;
      return decision ? advanceRound(matchday, opponentStrength, options, decision, approach === 'standard' ? undefined : approach) : state;
    }
    case 'reachMinute60': {
      const { live } = state;
      if (!live || live.minute60 || action.year !== state.year || action.round !== state.round) return state;
      const decision = halftimeDecision(state, live, action, options);
      if (!decision) return state;
      const [first, second] = decision.interchanges;
      const minute60 = {
        tactic: decision.tactic, ...minute60Scores(state, decision, opponentStrength, options),
        ...(decision.talk && { talk: decision.talk }),
        ...(decision.attackPlan && { attackPlan: decision.attackPlan }),
        ...(first && { interchange: { starterId: first.starterId, reserveId: first.reserveId } }),
        ...(second && { secondInterchange: { starterId: second.starterId, reserveId: second.reserveId } }),
      };
      return { ...state, live: { ...live, minute60 } };
    }
    case 'advance':
      return advanceRound(state, opponentStrength, options, quickHalftimeDecision(state, opponentStrength, options));
  }
}

export function simulateNrlSeasonWithoutManager(year: number, seed: number, strengthsForRound: (round: number) => ReadonlyMap<string, number>,
  domesticScoringModel?: NrlManagerState['domesticScoringModel']) {
  // No club uses managed tactics, fatigue, injuries or player attribution.
  let season: NrlManagerState = {
    ...createNrlSeason(nrlSeasonPlan(year).clubs[0].id, seed, year), clubId: '', squad: [],
    ...(domesticScoringModel && { domesticScoringModel }),
  };
  for (let round = 1; round <= lastRound(year); round++) {
    season = advanceRound(season, strengthsForRound(round), {});
  }
  return season;
}

const integerIn = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const isNrlAttackPlan = (value: unknown): value is NrlAttackPlan =>
  value === 'standard' || NRL_ATTACK_PLANS.includes(value as NrlActiveAttackPlan);

const isNrlHalftimeTalk = (value: unknown): value is NrlHalftimeTalk =>
  value === 'reinforceBasics' || value === 'liftTempo';
function validScoring(value: unknown, extraTry = 0): value is NrlScoring {
  return record(value) && integerIn(value.tries, 0, 21 + extraTry) && integerIn(value.conversions, 0, value.tries)
    && integerIn(value.penalties, 0, 3) && integerIn(value.fieldGoals, 0, 2) && integerIn(value.longFieldGoals, 0, 2);
}

function validScoringPair(value: unknown): value is NrlScoringPair {
  return Array.isArray(value) && value.length === 2
    && value.every(score => record(score) && Object.keys(score).length === scoringKinds.length && validScoring(score, 1));
}

function validPhaseScoring(value: unknown, periods: NrlScorePeriods, final: NrlScoringPair): boolean {
  if (!record(value) || !validScoringPair(value.halfTime) || !validScoringPair(value.regulation)
    || (value.at60 === undefined) !== (periods.at60 === undefined)
    || (value.at60 !== undefined && !validScoringPair(value.at60))
    || Object.keys(value).length !== 2 + Number(value.at60 !== undefined)) return false;
  const { halfTime, at60, regulation } = value;
  return halfTime.every((first, side) => {
    const middle = at60?.[side] ?? first;
    const last = regulation[side];
    return scoreOf(first) === periods.halfTime[side] && (!periods.at60 || scoreOf(middle) === periods.at60[side])
      && scoreOf(last) === periods.regulation[side] && !middle.fieldGoals && !middle.longFieldGoals
      && scoringKinds.every(kind => first[kind] <= middle[kind] && middle[kind] <= last[kind] && last[kind] <= final[side][kind]);
  });
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

function validCaptainChallengeReceipt(value: unknown): value is NrlCaptainChallengeReceipt {
  return record(value) && Object.keys(value).length === 3 && value.rules === CAPTAIN_CHALLENGE_RULES && typeof value.captainId === 'string'
    && (value.outcome === 'overturned' || value.outcome === 'upheld' || value.outcome === 'inconclusive');
}

function validLiveHalf(value: unknown, fixture: NrlFixture, tapSide?: 0 | 1, tapPeriod = 0, domesticRules = false): boolean {
  const partial = (score: unknown, chances: number, playedPeriods: number, side: number) => validScoring(score)
    && score.tries <= chances + Number(tapSide === side && tapPeriod > 0 && tapPeriod <= playedPeriods)
    && score.penalties <= Number(tapSide !== side)
    && score.fieldGoals === 0 && score.longFieldGoals === 0;
  const choice = (swap: unknown) => swap === undefined || (record(swap) && Object.keys(swap).length === 2
    && typeof swap.starterId === 'string' && typeof swap.reserveId === 'string');
  return record(value) && record(value.fixture)
    && value.fixture.homeId === fixture.homeId && value.fixture.awayId === fixture.awayId
    && value.fixture.round === fixture.round && value.fixture.tieId === fixture.tieId && value.fixture.finalsRound === fixture.finalsRound
    && partial(value.homeScoring, 9, 1, 0) && partial(value.awayScoring, 9, 1, 1)
    && (value.heldReserveId === undefined || typeof value.heldReserveId === 'string')
    && (value.halftimeInjury === undefined || (!fixture.finalsRound && record(value.halftimeInjury)
      && Object.keys(value.halftimeInjury).length === 2 && typeof value.halftimeInjury.playerId === 'string'
      && integerIn(value.halftimeInjury.rounds, 1, MAX_INJURY_ROUNDS)))
    && (value.captainChallengeRules === undefined || (domesticRules && !fixture.finalsRound && value.captainChallengeRules === CAPTAIN_CHALLENGE_RULES))
    && (value.captainChallenge === undefined || (value.captainChallengeRules === CAPTAIN_CHALLENGE_RULES
      && value.minute60 !== undefined && value.goldenPoint === undefined && record(value.captainChallenge)
      && typeof value.captainChallenge.captainId === 'string' && record(value.captainChallenge.finish)
      && value.captainChallenge.finish.type === 'finishMinute60' && value.captainChallenge.finish.pauseForGoldenPoint === undefined
      && (value.captainChallenge.pauseForGoldenPoint === undefined || value.captainChallenge.pauseForGoldenPoint === true)
      && Object.keys(value.captainChallenge).length === 2 + Number(value.captainChallenge.pauseForGoldenPoint === true)))
    && (value.goldenPoint === undefined || (!fixture.finalsRound && record(value.goldenPoint)
      && Object.keys(value.goldenPoint).length === 2 + Number(value.goldenPoint.regulation !== undefined)
        + Number(value.goldenPoint.captainChallenge !== undefined)
      && (value.goldenPoint.captainChallenge === undefined || (value.captainChallengeRules === CAPTAIN_CHALLENGE_RULES
        && value.minute60 !== undefined && value.goldenPoint.regulation !== undefined && validCaptainChallengeReceipt(value.goldenPoint.captainChallenge)))
      && Number.isInteger(value.goldenPoint.score)
      && (value.goldenPoint.regulation === undefined || validScoringPair(value.goldenPoint.regulation))
      && record(value.goldenPoint.finish) && value.goldenPoint.finish.type === (value.minute60 ? 'finishMinute60' : 'finishLive')
      && value.goldenPoint.finish.pauseForGoldenPoint === undefined))
    && (value.minute60 === undefined || (record(value.minute60) && NRL_TACTICS.includes(value.minute60.tactic as NrlTactic)
      && (value.minute60.talk === undefined || isNrlHalftimeTalk(value.minute60.talk))
      && (value.minute60.attackPlan === undefined || isNrlAttackPlan(value.minute60.attackPlan))
      && choice(value.minute60.interchange) && choice(value.minute60.secondInterchange)
      && partial(value.minute60.homeScoring, 14, 2, 0) && partial(value.minute60.awayScoring, 14, 2, 1)));
}

function validBenchUse(value: unknown, managed: boolean, byId: Map<string, NrlPlayer>, late: unknown, cover: unknown, scoring: unknown): boolean {
  if (value === undefined) return true;
  if (!managed || !Array.isArray(value) || value.length < 1 || value.length > NRL_MAX_BENCH_USED) return false;
  if (new Set(value).size !== value.length) return false;
  const roles = value.map(id => {
    if (typeof id !== 'string') return;
    const assigned = record(late) && id === late.reserveId ? late : record(cover) && id === cover.reserveId ? cover : undefined;
    if (assigned && record(scoring) && Array.isArray(scoring.starters)) {
      return NRL_ROLES[scoring.starters.indexOf(assigned.starterId)];
    }
    return byId.get(id)?.role;
  });
  return roles.every(Boolean) && new Set(roles).size === value.length;
}

function validOpeningCover(match: Record<string, unknown>, byId: ReadonlyMap<string, NrlPlayer>): boolean {
  const { openingCover, benchUsed, playerScoring, minute60Interchange } = match;
  if (!record(openingCover) || typeof openingCover.reserveId !== 'string' || typeof openingCover.starterId !== 'string'
    || !Array.isArray(benchUsed) || benchUsed[0] !== openingCover.reserveId || !record(playerScoring)
    || (record(minute60Interchange) && minute60Interchange.reserveId === openingCover.reserveId)
    || !Array.isArray(playerScoring.starters) || playerScoring.kickerId === openingCover.starterId) return false;
  const role = NRL_ROLES[playerScoring.starters.indexOf(openingCover.starterId)];
  return !!role && byId.get(openingCover.reserveId)?.secondaryRole === role
    && [match.halftimeInterchange, match.secondHalftimeInterchange].every(change =>
      !record(change) || change.reserveId !== openingCover.reserveId
      || (change.starterId === openingCover.starterId && change.enteredAtHalf === undefined));
}

export function validNrlRatingChanges(value: unknown, byId: ReadonlyMap<string, NrlPlayer>): boolean {
  return Array.isArray(value) && value.length <= byId.size
    && new Set(value.map(row => row?.[0])).size === value.length
    && value.every(row => Array.isArray(row) && row.length === 2 && byId.has(row[0]) && (row[1] === 1 || row[1] === -1));
}

function validHalftimeInterchange(value: unknown, scoring: NrlMatchScoringReport | undefined,
  benchUsed: string[] | undefined, byId: ReadonlyMap<string, NrlPlayer>, allowTrained = false): value is NrlHalftimeReceipt {
  if (!scoring || !record(value) || typeof value.starterId !== 'string' || typeof value.reserveId !== 'string'
    || (value.starterId === scoring.kickerId && !scoring.kickerHandoff) || !benchUsed?.includes(value.reserveId)
    || (value.enteredAtHalf !== undefined && (value.enteredAtHalf !== true || benchUsed.at(-1) !== value.reserveId))) return false;
  const role = NRL_ROLES[scoring.starters.indexOf(value.starterId)];
  const reserve = byId.get(value.reserveId);
  return !!role && !!reserve && (reserve.role === role || (allowTrained && nrlCanPlayRole(reserve, role)));
}

function validHalftimeInterchanges(first: unknown, second: unknown, scoring: NrlMatchScoringReport | undefined,
  benchUsed: string[] | undefined, byId: ReadonlyMap<string, NrlPlayer>, cover: unknown): boolean {
  if (first === undefined) return second === undefined;
  const isTrainedCover = (change: unknown) => record(change) && record(cover) && change.enteredAtHalf === undefined
    && change.reserveId === cover.reserveId && change.starterId === cover.starterId;
  if (!validHalftimeInterchange(first, scoring, benchUsed, byId, isTrainedCover(first))) return false;
  return second === undefined || (validHalftimeInterchange(second, scoring, benchUsed, byId, isTrainedCover(second))
    && first.starterId !== second.starterId && first.reserveId !== second.reserveId
    && !(first.enteredAtHalf && second.enteredAtHalf));
}

function validMinute60Interchange(late: unknown, halftime: unknown[], scoring: NrlMatchScoringReport | undefined,
  benchUsed: string[] | undefined, byId: ReadonlyMap<string, NrlPlayer>): boolean {
  if (late === undefined) return true;
  if (!validHalftimeInterchange(late, scoring, benchUsed, byId, true) || late.enteredAtHalf !== undefined
    || late.starterId === scoring?.kickerHandoff?.playerId
    || benchUsed?.at(-1) !== late.reserveId) return false;
  return halftime.every(change => !record(change) || (change.enteredAtHalf === undefined && change.starterId !== late.starterId));
}

function validMinute60Return(match: Record<string, unknown>, managed: boolean): boolean {
  const { minute60Return: returning, minute60Interchange, quickInterchange, scorePeriods, benchUsed } = match;
  if (returning === undefined) return true;
  if (!managed || minute60Interchange !== undefined || quickInterchange !== undefined
    || !record(scorePeriods) || scorePeriods.at60 === undefined || !record(returning) || Object.keys(returning).length !== 2
    || !Array.isArray(benchUsed)) return false;
  const halftime = [match.halftimeInterchange, match.secondHalftimeInterchange].filter(record);
  return 2 * benchUsed.length - halftime.length < NRL_MAX_INTERCHANGES
    && !(match.halftimeInjury && record(match.injury) && match.injury.playerId === returning.starterId)
    && halftime.some(pair => pair.starterId === returning.starterId && pair.reserveId === returning.reserveId);
}

function validKickerHandoff(match: Record<string, unknown>, managedHome: boolean, tapPeriod: number) {
  const scoring = match.playerScoring as NrlMatchScoringReport | undefined;
  const handoff = scoring?.kickerHandoff;
  if (!scoring || !handoff) return true;
  const changes = [match.halftimeInterchange, match.secondHalftimeInterchange].filter(record);
  const late = match.minute60Interchange;
  const at60 = record(late) && late.starterId === scoring.kickerId;
  const periods = match.scorePeriods as NrlScorePeriods | undefined;
  const before = (at60 ? periods?.at60 : periods?.halfTime)?.[managedHome ? 0 : 1];
  if (before === undefined
    || (!at60 && !changes.some(change => change.starterId === scoring.kickerId
      && (change.enteredAtHalf === undefined || match.openInterchange === true)))
    || changes.some(change => change.starterId === handoff.playerId)) return false;
  const goals = handoff.openingConversions + handoff.openingPenalties;
  const tries = (before - goals * 2) / 4;
  const tapTry = (match.penaltyTap === 4 || match.penaltyTap === 6) && tapPeriod > 0 && tapPeriod <= (at60 ? 2 : 1);
  return integerIn(tries, handoff.openingConversions, (at60 ? 14 : 9) + Number(tapTry)) && handoff.openingPenalties <= 1;
}

function validGoldenPoint(value: unknown, home: NrlScoring, away: NrlScoring): boolean {
  const margin = scoreOf(home) - scoreOf(away);
  if (value === 'draw') return margin === 0;
  if (!record(value) || (value.period !== 1 && value.period !== 2) || typeof value.score !== 'string') return false;
  const score = value.score as NrlGoldenScore;
  const winner = margin > 0 ? home : away;
  return GOLDEN_POINT_VALUES[score] === Math.abs(margin) && winner[score] > 0;
}

interface ScoringTap { side: number; period: number; points: 4 | 6 }

function validScorePeriods(value: unknown, home: NrlScoring, away: NrlScoring,
  extraTime: boolean, finals: boolean, requires60: boolean, tap?: ScoringTap): boolean {
  const extraPoints = (side: number, through: number, after = 0) => tap?.side === side && tap.period > after && tap.period <= through ? tap.points - 2 : 0;
  const pair = (scores: unknown, max: number, through: number): scores is NrlScorePair =>
    Array.isArray(scores) && scores.length === 2 && [0, 1].every(side => integerIn(scores[side], 0, max + extraPoints(side, through)));
  if (!record(value) || !pair(value.halfTime, 56, 1) || !pair(value.regulation, 112, 3)
    || (value.at60 === undefined ? requires60 : !pair(value.at60, 86, 2))) return false;
  const halfTime = value.halfTime, regulation = value.regulation, at60 = value.at60 as NrlScorePair | undefined;
  if (extraTime !== (regulation[0] === regulation[1])) return false;
  const totals = [scoreOf(home), scoreOf(away)];
  const added = totals.map((total, side) => total - regulation[side]);
  return halfTime.every((half, side) => half % 2 === 0
    && (at60
      ? integerIn(at60[side] - half, 0, 32 + extraPoints(side, 2, 1)) && at60[side] % 2 === 0
        && integerIn(regulation[side] - at60[side], 0, 28 + extraPoints(side, 3, 2))
      : integerIn(regulation[side] - half, 0, 58 + extraPoints(side, 3, 1))))
    && added.every(points => integerIn(points, 0, extraTime ? finals ? 18 : 4 : 0))
    && (finals || [0, 1, 2, 4].includes(added[0] + added[1]) && (added[0] === 0 || added[1] === 0));
}

function validPenaltyTap(match: Record<string, unknown>, side: number, period: number, scoring: NrlScoring, points: unknown) {
  if (match.playerScoring === undefined || match.scorePeriods === undefined) return false;
  if (!period) return points === 'none';
  if (points !== 0 && points !== 4 && points !== 6) return false;
  const { halfTime, at60, regulation } = match.scorePeriods as NrlScorePeriods;
  const before = period === 1 ? 0 : period === 3 && at60 ? at60[side] : halfTime[side];
  const after = period === 1 ? halfTime[side] : period === 2 && at60 ? at60[side] : regulation[side];
  return after - before >= points && (points === 0 || (scoring.tries > 0 && (points === 4 || scoring.conversions > 0)));
}

function validLatePenalty(match: Record<string, unknown>, side: number, period: number, scoring: NrlScoring) {
  const late = match.latePenalty;
  const periods = match.scorePeriods as NrlScorePeriods | undefined;
  if (!record(late) || Object.keys(late).length !== 2 || !periods?.at60 || match.playerScoring === undefined
    || (late.approach !== 'goal' && late.approach !== 'tap')) return false;
  const earlyTap = late.approach === 'goal' && (period === 1 || period === 2);
  if (earlyTap !== (match.penaltyTap !== undefined)) return false;
  if (period !== 3) return late.points === 'none';
  return late.approach === 'tap' ? validPenaltyTap(match, side, period, scoring, late.points)
    : late.points === 2 && scoring.penalties > 0 && periods.regulation[side] - periods.at60[side] >= 2;
}

function validActingCaptain(match: Record<string, unknown>, byId: ReadonlyMap<string, NrlPlayer>) {
  const appointment = match.actingCaptain;
  if (appointment === undefined) return true;
  if (!match.playerScoring || !match.scorePeriods || !record(appointment) || Object.keys(appointment).length !== 2) return false;
  const { clubCaptainId, viceCaptainId } = appointment;
  if (typeof clubCaptainId !== 'string' || typeof viceCaptainId !== 'string' || clubCaptainId === viceCaptainId
    || !byId.has(clubCaptainId) || !byId.has(viceCaptainId)) return false;
  const phases = nrlActingCaptainPhases(match as unknown as NrlMatchResult);
  return phases.some(phase => phase.playerId === viceCaptainId)
    && match.captainId === (phases.some(phase => phase.playerId === clubCaptainId) ? clubCaptainId : undefined);
}

function validCaptainChallengeResult(match: NrlMatchResult, state: Pick<NrlManagerState, 'clubId' | 'seed' | 'year' | 'domesticScoringModel'>) {
  const receipt = match.captainChallenge;
  if (receipt === undefined) return true;
  const phases = match.phaseScoring;
  if (state.domesticScoringModel !== NRL_DOMESTIC_SCORING_MODEL || match.finalsRound || !match.playerScoring || match.quickInterchange
    || !phases?.at60 || !validCaptainChallengeReceipt(receipt) || !lateRivalPenalty(state, match)
    || captainChallengeEvidence(state, match).outcome !== receipt.outcome) return false;
  const rival = match.homeId === state.clubId ? 1 : 0;
  if (phases.regulation[rival].penalties - phases.at60[rival].penalties !== Number(receipt.outcome !== 'overturned')) return false;
  const captain = match.actingCaptain?.clubCaptainId ?? match.captainId;
  const vice = match.actingCaptain?.viceCaptainId;
  return matchCaptainPhases(match, captain, vice).at(-1)?.playerId === receipt.captainId;
}

function validQuickInterchange(value: unknown, byId: ReadonlyMap<string, NrlPlayer>): value is NrlQuickInterchange {
  if (!record(value) || Object.keys(value).length !== 3 || typeof value.reserveId !== 'string'
    || (value.trigger !== 'ahead' && value.trigger !== 'behind') || !NRL_ROLES.includes(value.role as NrlRole)) return false;
  const reserve = byId.get(value.reserveId);
  return reserve !== undefined && nrlCanPlayRole(reserve, value.role as NrlRole);
}

function validQuickInterchangeResult(value: Record<string, unknown>, atHome: boolean, byId: ReadonlyMap<string, NrlPlayer>) {
  const { quickInterchange: plan, minute60Interchange: late, playerScoring: scoring, halftimeInterchange: cover } = value;
  const at60 = (value.scorePeriods as NrlScorePeriods | undefined)?.at60;
  if (!validQuickInterchange(plan, byId) || !at60 || value.openInterchange !== true || !record(scoring) || !Array.isArray(scoring.starters)
    || value.secondHalftimeInterchange !== undefined || value.halftimeTalk !== undefined
    || value.halftimeAttackPlan !== undefined || value.minute60Tactic !== undefined || value.minute60AttackPlan !== undefined
    || value.minute60FieldGoal !== undefined || value.goldenPointApproach !== undefined || value.latePenalty !== undefined) return false;
  const plannedStarter = scoring.starters[NRL_ROLES.indexOf(plan.role)];
  if (cover !== undefined && (value.halftimeInjury !== true || !record(cover)
    || cover.enteredAtHalf !== undefined || cover.starterId === plannedStarter)) return false;
  return late === undefined || (record(late) && late.reserveId === plan.reserveId
    && plannedStarter === late.starterId && quickInterchangeDue(at60, atHome, plan.trigger));
}

function validResult(value: unknown, expected: NrlFixture, state: Pick<NrlManagerState, 'clubId' | 'seed' | 'year' | 'domesticScoringModel' | 'halftimeInjuryCover'>,
  byId: Map<string, NrlPlayer>): value is NrlMatchResult {
  if (!record(value)) return false;
  const { individualSkillWorkId: skillId, playerScoring, benchUsed, ratingChanges } = value;
  const { clubId } = state;
  const managed = expected.homeId === clubId || expected.awayId === clubId;
  const home = expected.homeId === clubId, side = home ? 0 : 1;
  const period = managed && (value.penaltyTap !== undefined || value.latePenalty !== undefined) ? clubPenaltyPeriod(state, expected) : 0;
  const late = value.latePenalty;
  const points = value.penaltyTap ?? (record(late) && late.approach === 'tap' ? late.points : undefined);
  const tap: ScoringTap | undefined = period && (points === 4 || points === 6) ? { side, period, points } : undefined;
  return value.homeId === expected.homeId && value.awayId === expected.awayId
    && value.round === expected.round && value.tieId === expected.tieId && value.finalsRound === expected.finalsRound
    && validScoring(value.homeScoring, Number(tap?.side === 0)) && value.homeScore === scoreOf(value.homeScoring)
    && validScoring(value.awayScoring, Number(tap?.side === 1)) && value.awayScore === scoreOf(value.awayScoring)
    && typeof value.extraTime === 'boolean' && (value.homeScore !== value.awayScore || (!expected.tieId && value.extraTime))
    && (value.scorePeriods === undefined || (managed && validScorePeriods(value.scorePeriods,
      value.homeScoring, value.awayScoring, value.extraTime, Boolean(expected.finalsRound),
      value.minute60Tactic !== undefined || value.minute60Interchange !== undefined || value.minute60Return !== undefined
        || value.minute60AttackPlan !== undefined || late !== undefined, tap)))
    && (value.phaseScoring === undefined || (managed && value.scorePeriods !== undefined
      && validPhaseScoring(value.phaseScoring, value.scorePeriods as NrlScorePeriods, [value.homeScoring, value.awayScoring])))
    && (value.penaltyTap === undefined || (managed && validPenaltyTap(value, side, period, home ? value.homeScoring : value.awayScoring, value.penaltyTap)))
    && (late === undefined || (managed && !expected.finalsRound && validLatePenalty(value, side, period, home ? value.homeScoring : value.awayScoring)))
    && (value.kickingPlan === undefined || (managed && value.scorePeriods !== undefined
      && value.playerScoring !== undefined && isActiveKickingPlan(value.kickingPlan)))
    && (value.goldenPoint === undefined || (managed && !expected.finalsRound && value.extraTime
      && value.playerScoring !== undefined && validGoldenPoint(value.goldenPoint, value.homeScoring, value.awayScoring)))
    && (value.goldenPointApproach === undefined || (value.goldenPoint !== undefined && value.scorePeriods !== undefined
      && isActiveGoldenPointApproach(value.goldenPointApproach)))
    && (value.openingCover === undefined || (managed && !expected.finalsRound && validOpeningCover(value, byId)))
    && validBenchUse(value.benchUsed, managed, byId, value.minute60Interchange, value.openingCover, value.playerScoring)
    && (value.quickInterchange === undefined || (managed && !expected.finalsRound && validQuickInterchangeResult(value, home, byId)))
    && (value.halftimeTalk === undefined || (managed && isNrlHalftimeTalk(value.halftimeTalk) && value.playerScoring !== undefined))
    && (value.openingAttackPlan === undefined || (managed && value.scorePeriods !== undefined && value.playerScoring !== undefined
      && value.counterStyle === undefined && isNrlDirectionalPlan(value.openingAttackPlan)))
    && (value.halftimeAttackPlan === undefined || (managed && value.scorePeriods !== undefined
      && isNrlAttackPlan(value.halftimeAttackPlan) && value.playerScoring !== undefined))
    && (value.minute60Tactic === undefined || (managed && NRL_TACTICS.includes(value.minute60Tactic as NrlTactic)
      && value.playerScoring !== undefined))
    && (value.minute60AttackPlan === undefined || (managed && record(value.scorePeriods) && value.scorePeriods.at60 !== undefined
      && isNrlAttackPlan(value.minute60AttackPlan) && value.playerScoring !== undefined))
    && (value.minute60FieldGoal === undefined || (managed && validMinute60FieldGoal(value, expected.homeId === clubId)))
    && (value.individualRecoveryId === undefined || (managed && typeof value.individualRecoveryId === 'string'
      && byId.has(value.individualRecoveryId) && value.playerScoring !== undefined))
    && (skillId === undefined || (managed && !expected.finalsRound && typeof skillId === 'string'
      && value.individualRecoveryId === undefined && value.intensivePositionTrainingId !== skillId
      && ((record(playerScoring) && Array.isArray(playerScoring.starters) && playerScoring.starters.includes(skillId))
        || (Array.isArray(benchUsed) && benchUsed.includes(skillId)))))
    && (value.individualSkillGain === undefined || (value.individualSkillGain === true && typeof skillId === 'string'
      && Array.isArray(ratingChanges) && ratingChanges.some(row => Array.isArray(row) && row[0] === skillId && row[1] === 1)))
    && (value.intensivePositionTrainingId === undefined || (managed && !expected.finalsRound
      && typeof value.intensivePositionTrainingId === 'string' && byId.has(value.intensivePositionTrainingId)
      && value.playerScoring !== undefined && value.individualRecoveryId !== value.intensivePositionTrainingId))
    && (value.goalKickingDrills === undefined || (managed && value.goalKickingDrills === true && value.playerScoring !== undefined))
    && (value.ratingChanges === undefined || (managed && !expected.finalsRound && value.playerScoring !== undefined
      && validNrlRatingChanges(value.ratingChanges, byId)))
    && (value.openInterchange === undefined || (managed && value.openInterchange === true && value.playerScoring !== undefined
      && (!Array.isArray(value.benchUsed) || value.benchUsed.length < NRL_MAX_BENCH_USED
        || value.minute60Interchange !== undefined
        || (record(value.halftimeInterchange) && value.halftimeInterchange.enteredAtHalf === true)
        || (record(value.secondHalftimeInterchange) && value.secondHalftimeInterchange.enteredAtHalf === true))))
    && (value.counterStyle === undefined || (managed && value.playerScoring !== undefined
      && value.counterStyle === nrlCounterPlan(state, expected).style))
    && (value.injury === undefined || (managed && record(value.injury)
      && typeof value.injury.playerId === 'string' && byId.has(value.injury.playerId)
      && integerIn(value.injury.rounds, 1, MAX_INJURY_ROUNDS)))
    && (value.halftimeInjury === undefined || (value.halftimeInjury === true && state.halftimeInjuryCover && !expected.finalsRound
      && record(value.injury) && record(value.halftimeInterchange) && value.halftimeInterchange.starterId === value.injury.playerId))
    && (value.playerScoring === undefined || (managed && validNrlScoringReport(value.playerScoring,
      expected.homeId === clubId ? value.homeScoring : value.awayScoring, (value.benchUsed as string[] | undefined) ?? [],
      byId, NRL_ROLES.length)))
    && (value.captainId === undefined || (typeof value.captainId === 'string' && managed && value.playerScoring !== undefined
      && ((value.playerScoring as NrlMatchScoringReport).starters.includes(value.captainId)
        || (record(value.halftimeInterchange) && value.halftimeInterchange.reserveId === value.captainId)
        || (record(value.secondHalftimeInterchange) && value.secondHalftimeInterchange.reserveId === value.captainId)
        || (record(value.minute60Interchange) && value.minute60Interchange.reserveId === value.captainId))))
    && validHalftimeInterchanges(value.halftimeInterchange, value.secondHalftimeInterchange, value.playerScoring as NrlMatchScoringReport | undefined,
      value.benchUsed as string[] | undefined, byId, value.openingCover)
    && validMinute60Interchange(value.minute60Interchange, [value.halftimeInterchange, value.secondHalftimeInterchange],
      value.playerScoring as NrlMatchScoringReport | undefined, value.benchUsed as string[] | undefined, byId)
    && validMinute60Return(value, managed)
    && validKickerHandoff(value, home, period)
    && validActingCaptain(value, byId)
    && (value.captainChallenge === undefined || (managed && validCaptainChallengeResult(value as unknown as NrlMatchResult, state)));
}

function validMinute60FieldGoal(match: Record<string, unknown>, home: boolean): boolean {
  const points = match.minute60FieldGoal;
  const periods = match.scorePeriods as NrlScorePeriods | undefined;
  const scoring = (home ? match.homeScoring : match.awayScoring) as NrlScoring;
  if (!integerIn(points, 0, 2) || !periods?.at60 || match.playerScoring === undefined) return false;
  const side = home ? 0 : 1;
  return fieldGoalPlanGap(periods.at60[side] - periods.at60[1 - side])
    && periods.regulation[side] - periods.at60[side] >= points
    && periods.regulation[side] % 2 === points % 2
    && (points === 0 || (points === 1 ? scoring.fieldGoals : scoring.longFieldGoals) > 0);
}

export function isNrlSeasonProgress(value: unknown): value is NrlManagerState {
  if (!record(value) || value.version !== 1 || !integerIn(value.year, 2026, NRL_LAST_YEAR)
    || typeof value.clubId !== 'string' || !clubFor(value.year, value.clubId)
    || !integerIn(value.seed, 0, 0xffffffff) || !integerIn(value.round, 1, lastRound(value.year))
    || !NRL_TACTICS.includes(value.tactic as NrlTactic)
    || (value.preparation !== null && value.preparation !== 'train' && value.preparation !== 'recover'
      && value.preparation !== 'defensiveDrills' && value.preparation !== 'goalKickingDrills')
    || (value.injuryTracking !== undefined && value.injuryTracking !== true)
    || (value.halftimeInjuryCover !== undefined && (value.halftimeInjuryCover !== true || !value.kickerId || !value.bench || !value.injuryTracking))
    || (value.domesticScoringModel !== undefined && (value.domesticScoringModel !== NRL_DOMESTIC_SCORING_MODEL
      || !value.kickerId || !value.injuryTracking))
    || (value.kickerId !== undefined && typeof value.kickerId !== 'string')
    || !Array.isArray(value.squad) || !record(value.lineup) || !Array.isArray(value.results)) return false;
  const { year, clubId, seed, round, phase, preparation, squad, lineup, bench, results, injuryTracking, kickerId, reserveGrade, originStandDown, originRestId } = value;
  if (originStandDown !== undefined && (!kickerId || !injuryTracking || !validOriginStandDown(originStandDown, year, round))) return false;
  const judiciary = isNrlJudiciary(value.judiciary) ? value.judiciary : undefined;
  const regularRounds = nrlRegularRounds(year);
  const physio = isNrlPhysioTreatment(value.physio, Math.min(round, regularRounds)) ? value.physio : undefined;
  if (value.physio !== undefined && (!physio || !injuryTracking || !kickerId)) return false;
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
  const originSeason = { year, clubId, round, originStandDown: originStandDown as NrlOriginStandDown[] | undefined };
  if (originRestId !== undefined && (typeof originRestId !== 'string' || !byId.has(originRestId)
    || !nrlClubOriginReturning({ ...originSeason, phase: expectedPhase }).includes(originRestId))) return false;
  if (value.backupKickerId !== undefined && (!kickerId || typeof value.backupKickerId !== 'string' || !byId.has(value.backupKickerId))) return false;
  if (value.captainId !== undefined && (!kickerId || typeof value.captainId !== 'string' || !byId.has(value.captainId))) return false;
  if (value.viceCaptainId !== undefined && (!value.captainId || value.viceCaptainId === value.captainId
    || typeof value.viceCaptainId !== 'string' || !byId.has(value.viceCaptainId))) return false;
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
  const applyPhysio = (beforeRound: number) => {
    if (!physio || beforeRound !== physio.round) return true;
    const injury = verified.find(match => match.round === physio.injuryRound && match.injury?.playerId === physio.playerId)?.injury;
    const through = injuredThrough.get(physio.playerId);
    if (!injury || through !== physio.injuryRound + injury.rounds || through <= beforeRound) return false;
    injuredThrough.set(physio.playerId, through - 1);
    return true;
  };
  const spellEnd = reserveGrade && nrlReserveGradeEnd(reserveGrade);
  const identity: Pick<NrlManagerState, 'year' | 'seed' | 'clubId' | 'domesticScoringModel' | 'halftimeInjuryCover'> = { year, seed, clubId,
    domesticScoringModel: value.domesticScoringModel === NRL_DOMESTIC_SCORING_MODEL ? NRL_DOMESTIC_SCORING_MODEL : undefined,
    halftimeInjuryCover: value.halftimeInjuryCover === true ? true : undefined };
  for (let playedRound = 1; playedRound <= completed; playedRound++) {
    if (!applyPhysio(playedRound)) return false;
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
      const originAbsences = nrlClubOriginAbsences({ ...originSeason, round: playedRound });
      if (participants.some(id => (injuredThrough.get(id) ?? 0) >= playedRound || originAbsences.includes(id))) return false;
      if (match.originRestId !== undefined && (typeof match.originRestId !== 'string' || !managed
        || !nrlClubOriginReturning({ ...originSeason, round: playedRound, phase: playedRound <= regularRounds ? 'regular' : 'finals' }).includes(match.originRestId)
        || (injuredThrough.get(match.originRestId) ?? 0) >= playedRound || participants.includes(match.originRestId)
        || match.injury?.playerId === match.originRestId || match.individualRecoveryId === match.originRestId
        || match.individualSkillWorkId === match.originRestId || match.intensivePositionTrainingId === match.originRestId)) return false;
      if (match.individualRecoveryId && (!injuryTracking || (injuredThrough.get(match.individualRecoveryId) ?? 0) >= playedRound)) return false;
      if (match.intensivePositionTrainingId && (!injuryTracking
        || (injuredThrough.get(match.intensivePositionTrainingId) ?? 0) >= playedRound)) return false;
      if (reserveGrade && spellEnd && playedRound >= reserveGrade.startedRound && playedRound < spellEnd
        && (participants.includes(reserveGrade.playerId) || match.injury?.playerId === reserveGrade.playerId
          || match.individualRecoveryId === reserveGrade.playerId || match.intensivePositionTrainingId === reserveGrade.playerId
          || match.originRestId === reserveGrade.playerId)) return false;
      if (match.injury) {
        const { playerId, rounds } = match.injury;
        if (!injuryTracking || (injuredThrough.get(playerId) ?? 0) >= playedRound) return false;
        injuredThrough.set(playerId, playedRound + rounds);
      }
      verified.push(match);
    }
  }
  if (phase !== 'complete' && !applyPhysio(round)) return false;
  if (reserveGrade?.startedRound === round && (injuredThrough.get(reserveGrade.playerId) ?? 0) >= round) return false;
  const judiciarySeason = { year, clubId, seed, round, results: verified, judiciary };
  if (judiciary && (!validNrlJudiciary({ ...judiciarySeason, phase: expectedPhase }) || (value.live !== undefined && judiciaryNeedsResponse(judiciarySeason))
    || (reserveGrade && nrlJudiciaryBannedBefore(judiciarySeason, reserveGrade.playerId, reserveGrade.startedRound))
    || verified.some(match => (match.individualRecoveryId && nrlJudiciaryBannedBefore(judiciarySeason, match.individualRecoveryId, match.round))
      || (match.intensivePositionTrainingId && nrlJudiciaryBannedBefore(judiciarySeason, match.intensivePositionTrainingId, match.round))
      || (match.originRestId && nrlJudiciaryBannedBefore(judiciarySeason, match.originRestId, match.round))))) return false;
  const unavailable = nrlUnavailable({ ...judiciarySeason, phase: expectedPhase,
    injuryTracking: injuryTracking === true ? true : undefined, reserveGrade, physio, originStandDown: originSeason.originStandDown });
  if (typeof originRestId === 'string') {
    if (unavailable.has(originRestId)) return false;
    unavailable.set(originRestId, 1);
  }
  const trainedStarts = new Set(NRL_ROLES.filter(role => byId.get(lineup[role] as string)?.secondaryRole === role).map(role => lineup[role]));
  const naturalRoles = new Set([...byId.values()].filter(player => !unavailable.has(player.id) && !trainedStarts.has(player.id)).map(player => player.role));
  if (!NRL_ROLES.every(role => {
    const player = byId.get(lineup[role] as string)!;
    return !unavailable.has(player.id) && (nrlCanPlayRole(player, role) || (injuryTracking && !naturalRoles.has(role)));
  })) return false;
  if (bench !== undefined && (!Array.isArray(bench) || bench.length !== NRL_BENCH_SIZE
    || new Set(bench).size !== bench.length
    || !bench.every(id => typeof id === 'string' && byId.has(id) && !starters.has(id) && !unavailable.has(id)))) return false;
  const { individualRecoveryId, individualSkillWorkId, intensivePositionTrainingId, openInterchange, openingCoverId, penaltyTap, kickingPlan, quickInterchange } = value;
  if (openingCoverId !== undefined && (phase !== 'regular' || typeof openingCoverId !== 'string'
    || !openingCoverOption(value as unknown as NrlManagerState, openingCoverId))) return false;
  if (quickInterchange !== undefined && (phase !== 'regular' || openInterchange !== true || !validQuickInterchange(quickInterchange, byId))) return false;
  if (openInterchange !== undefined && (openInterchange !== true || phase === 'complete')) return false;
  if (penaltyTap !== undefined && (penaltyTap !== true || phase === 'complete')) return false;
  if (kickingPlan !== undefined && (!isActiveKickingPlan(kickingPlan) || phase === 'complete')) return false;
  if (individualRecoveryId !== undefined && (typeof individualRecoveryId !== 'string' || !injuryTracking || preparation === 'recover'
    || phase === 'complete' || !byId.has(individualRecoveryId) || unavailable.has(individualRecoveryId))) return false;
  if (individualSkillWorkId !== undefined && (typeof individualSkillWorkId !== 'string' || !injuryTracking || preparation === 'recover'
    || phase !== 'regular' || individualRecoveryId !== undefined || intensivePositionTrainingId === individualSkillWorkId
    || !byId.has(individualSkillWorkId) || unavailable.has(individualSkillWorkId))) return false;
  if (intensivePositionTrainingId !== undefined && (typeof intensivePositionTrainingId !== 'string' || !injuryTracking || phase !== 'regular'
    || !byId.has(intensivePositionTrainingId) || unavailable.has(intensivePositionTrainingId) || individualRecoveryId === intensivePositionTrainingId)) return false;
  if (value.live !== undefined || value.attackPlan !== undefined || preparation === 'defensiveDrills'
    || preparation === 'goalKickingDrills' || individualRecoveryId !== undefined || openInterchange !== undefined || penaltyTap !== undefined
    || kickingPlan !== undefined || openingCoverId !== undefined || intensivePositionTrainingId !== undefined || individualSkillWorkId !== undefined) {
    if (!kickerId || !bench) return false;
    const fixture = nrlRoundFixtures({ year, round, phase: expectedPhase, results: verified }).find(match =>
      match.homeId === value.clubId || match.awayId === value.clubId);
    if (!fixture || (value.live !== undefined && !validLiveHalf(value.live, fixture,
      penaltyTap ? (fixture.homeId === clubId ? 0 : 1) : undefined, penaltyTap ? clubPenaltyPeriod(identity, fixture) : 0,
      identity.domesticScoringModel === NRL_DOMESTIC_SCORING_MODEL))) return false;
    if (record(value.live) && value.live.halftimeInjury !== undefined && value.halftimeInjuryCover !== true) return false;
    const heldReserveId = record(value.live) ? value.live.heldReserveId : undefined;
    if (heldReserveId !== undefined && !nrlHoldableReserves(value as unknown as NrlManagerState).some(player => player.id === heldReserveId)) return false;
  }
  return verified.length === results.length && value.championId === (premierOf(FINALS, finalsOutcomes(verified))?.winner ?? null);
}

function validOriginStandDown(value: unknown, year: number, round: number): value is NrlOriginStandDown[] {
  if (year !== 2026 || !Array.isArray(value) || !value.length) return false;
  const expected = NRL_2026_ORIGIN_STAND_DOWN_ROUNDS.filter(candidate => candidate <= round);
  if (value.length !== expected.length) return false;
  const clubs = new Set(nrlSeasonPlan(year).clubs.map(club => club.id));
  return value.every((window, index) => {
    if (!record(window) || Object.keys(window).length !== 2 || window.round !== expected[index] || !record(window.clubs)) return false;
    const ids = new Set<string>();
    for (const [clubId, players] of Object.entries(window.clubs)) {
      if (!clubs.has(clubId) || !Array.isArray(players) || !players.length || players.length > 30) return false;
      for (const id of players) {
        if (typeof id !== 'string' || !id || ids.has(id)) return false;
        ids.add(id);
      }
    }
    return ids.size <= 2 * (NRL_ROLES.length + NRL_BENCH_SIZE);
  });
}

function validReserveGrade(value: unknown, round: number, regularRounds: number, players: Map<string, NrlPlayer>,
  enabled: boolean): value is NrlReserveGradeSpell | undefined {
  if (value === undefined) return true;
  if (!enabled || !record(value) || typeof value.playerId !== 'string'
    || !integerIn(value.startedRound, 1, Math.min(round, regularRounds - NRL_RESERVE_GRADE_ROUNDS + 1))
    || !integerIn(value.startingRating, 40, 97)) return false;
  const { playerId, startedRound, startingRating, recalledRound, acceleratedRound, role } = value;
  const player = players.get(playerId);
  if (!player) return false;
  if (acceleratedRound !== undefined && !integerIn(acceleratedRound, startedRound, Math.min(round, startedRound + NRL_RESERVE_GRADE_ROUNDS - 2))) return false;
  const paidRound = typeof acceleratedRound === 'number' ? acceleratedRound : undefined;
  const completed = nrlReserveGradeEnd({ startedRound, acceleratedRound: paidRound });
  if (recalledRound !== undefined && !integerIn(recalledRound, paidRound ?? startedRound, Math.min(round, completed - 1))) return false;
  const gained = recalledRound === undefined && round >= completed;
  const recordedFields = 3 + Number(recalledRound !== undefined) + Number(acceleratedRound !== undefined) + Number(role !== undefined);
  if (Object.keys(value).length !== recordedFields) return false;
  if (role === undefined) return player.rating === startingRating + Number(gained);
  if (!nrlRetrainingRoles(player.role).includes(role as NrlRole)) return false;
  return gained ? player.secondaryRole === role : recalledRound !== undefined || player.secondaryRole === undefined;
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
