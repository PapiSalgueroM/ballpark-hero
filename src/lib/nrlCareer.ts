import { isNrlOpeningYear, nrlSeasonPlan, NRL_LAST_YEAR, type NrlClub } from '@/data/nrlManagerSeasons';
import { clampi, hashLabel, rngFrom } from '@/lib/careerEngine';
import { uniqueName } from '@/lib/foNames';
import {
  NRL_BOARD_PATHWAYS, nrlBoardBenchmark, nrlBoardChallengeStatus, nrlBoardPathwaysEligible, nrlBoardPathwaysProgress, nrlBoardTarget,
} from '@/lib/nrlBoardTarget';
import {
  archiveNrlPlayerSeasons, archiveNrlScoring, nrlSquadSeasonStats, validNrlPlayerSeasonArchive, validNrlScoringArchive,
  type NrlSeasonPlayerArchive, type NrlSeasonScoringTotal,
} from '@/lib/nrlPlayerScoring';
import {
  archiveNrlFinals, createNrlSeason, isNrlManagerState, isNrlSeasonProgress, nrlArchivedFinals, nrlBench, nrlCounterPlan, nrlLadder, nrlMatchdaySelection,
  nrlInjuries, nrlMatchupEdges, nrlNextRound, nrlRegularRounds, nrlRetrainingRoles, nrlSavedLineupPreview, NRL_BENCH_SIZE,
  nrlPlanAdjustments, nrlReserveGradeRemaining, nrlUnavailable, NRL_FINALS_SPOTS, NRL_RESERVE_GRADE_ROUNDS, NRL_ROLES,
  NRL_ATTACK_PLANS, NRL_COACHING_BONUS, NRL_QUALIFIED_COACHING_BONUS, reduceNrlSeason, repairMatchday, validNrlLiveScore,
  type NrlAction, type NrlAttackPlan, type NrlCoachRole, type NrlFinalsArchive, type NrlFixture, type NrlManagerState, type NrlMatchResult,
  type NrlPlayer, type NrlRole, type NrlSavedLineup, type NrlYear,
} from '@/lib/nrlManager';
import {
  createNrlOriginSeries, isNrlOriginSeries, nrlOriginComplete, nrlOriginEligibility, playNrlOriginMatch, selectNrlOriginReserve, selectNrlOriginStarter,
  setNrlOriginTactic, type NrlOriginSeries, type NrlOriginSide,
} from '@/lib/nrlOrigin';
import {
  isNrlJudiciary, judiciaryNeedsResponse, nrlJudiciaryBannedBefore, nrlJudiciaryBans, nrlJudiciaryCase, nrlJudiciaryMatchesAfter,
  nrlJudiciaryPenalty, nrlNewJudiciaryCase,
  type NrlJudiciaryCase, type NrlJudiciaryCarry, type NrlJudiciaryDecision,
} from '@/lib/nrlJudiciary';
import { createNrlWorldCup, isNrlWorldCupNation, isNrlWorldCupRun, type NrlWorldCupNation, type NrlWorldCupRun } from '@/lib/nrlWorldCupSave';

const SQUAD_SIZE = 30;
export const NRL_SAVE_MAX_CHARS = 1_000_000;
export const NRL_POSITION_TRAINING_ROUNDS = 4;
const MAX_CONTRACT_YEARS = 4;
const COUNTEROFFER_YEARS = 3;
const OPENING_CASH = 2_500_000;
const MARKET_PER_ROLE = 4;
export const NRL_SHORTLIST_LIMIT = 12;
const RETIREMENT_AGE = 36;
const MEDICAL_UPGRADE_COST = { 2: 800_000, 3: 2_600_000 } as const;
const ACADEMY_UPGRADE_COST = 600_000;
const ACADEMY_UPGRADE_POTENTIAL = 3;
const CONCESSIONS_UPGRADE_COST = 250_000;
const CONCESSIONS_HOME_INCOME = 25_000;
const BOARD_RECRUITMENT_BONUS = 100_000;
const ROUND_OPERATING_COST = 75_000;
const TRAVEL_COST = 45_000;
export const NRL_TICKET_GATE_CHANGES = {
  value: { regularNonWin: 18_000, regularWin: -22_000, homeFinal: -36_000 },
  standard: { regularNonWin: 0, regularWin: 0, homeFinal: 0 },
  premium: { regularNonWin: -24_000, regularWin: 18_000, homeFinal: 36_000 },
} as const;

export const NRL_SPONSOR_OFFERS = {
  fixed: { upfront: 200_000, bonus: 0 },
  finals: { upfront: 110_000, bonus: 200_000 },
} as const;
export type NrlSponsorOffer = keyof typeof NRL_SPONSOR_OFFERS;

const COACH_SIGNING_FEE = 120_000;
const COACH_ROUND_WAGE = 18_000;
const COACH_COURSE_FEE = COACH_SIGNING_FEE / 2;
const COACH_COURSE_ROUNDS = 4;
const COACH_ROLES = ['attack', 'defense', 'development'] as const;
export type NrlStaffRole = typeof COACH_ROLES[number];
export const NRL_DEVELOPMENT_ASSISTANT = { appearances: 8, players: 3, nextAge: 24 } as const;
const COACH_FIRST = ['Alden', 'Emery', 'Jory', 'Merrick', 'Quill', 'Rowe'];
const COACH_LAST = ['Bramwell', 'Chetwynd', 'Dacre', 'Emsley', 'Fenwick', 'Redfern'];
const FIRST = ['Arlo', 'Asa', 'Beau', 'Brodie', 'Callum', 'Coby', 'Dane', 'Eli', 'Eru', 'Finn', 'Hemi', 'Isaac', 'Jalen', 'Jesse', 'Keanu', 'Koa', 'Lachlan', 'Levi', 'Luca', 'Malachi', 'Mana', 'Niko', 'Oren', 'Peni', 'Remy', 'Riley', 'Sol', 'Tama', 'Tane', 'Teo', 'Toby', 'Zane'];
const LAST = ['Arden', 'Ashby', 'Avery', 'Bennett', 'Bishop', 'Cairns', 'Cato', 'Dawson', 'Ellery', 'Forde', 'Frost', 'Grier', 'Hanley', 'Hartley', 'Hewitt', 'Ives', 'Kerr', 'Lennox', 'Linton', 'Marlow', 'Merritt', 'Nairn', 'Palmer', 'Parr', 'Preece', 'Reeve', 'Rourke', 'Rowan', 'Shaw', 'Vale', 'Voss', 'Wilder'];

export interface NrlContract { clubId: string; startYear: number; endYear: number; salary: number }
export interface NrlCareerPlayer extends NrlPlayer {
  age: number;
  potential: number;
  contract: NrlContract | null;
  futureContract: NrlContract | null;
}
type MedicalUpgradeLevel = keyof typeof MEDICAL_UPGRADE_COST;
export type NrlMedicalLevel = 1 | MedicalUpgradeLevel;
interface NrlMedicalUpgrade { level: MedicalUpgradeLevel; round: number }
interface NrlCoachHire { role: NrlStaffRole; round: number; paidRounds: number; retained?: true; qualified?: true }
interface NrlMutualRelease { playerId: string; playerName: string; annualSalary: number }
interface NrlBoardRecruitment {
  role: NrlRole;
  signed?: { id: string; name: string; round: number; salary: number };
  paid?: true;
}
export type NrlTicketTier = keyof typeof NRL_TICKET_GATE_CHANGES;
type ActiveTicketTier = Exclude<NrlTicketTier, 'standard'>;
export interface NrlCareerBook {
  fromRound: number;
  openingCash: number;
  centralFunding: number;
  gateReceipts: number;
  wagesPaid: number;
  operatingCosts: number;
  medicalUpgrades?: NrlMedicalUpgrade[];
  academyUpgradeRound?: number;
  concessionsUpgradeRound?: number;
  concessionReceipts?: number;
  coachHire?: NrlCoachHire;
  coachCourseRound?: number;
  mutualRelease?: NrlMutualRelease;
  ticketTier?: ActiveTicketTier;
  sponsor?: { offer: NrlSponsorOffer; bonusPaid?: true };
  pathways?: { earnedBy?: string[] };
  boardRecruitment?: NrlBoardRecruitment;
}
export interface NrlCareerFinance extends NrlCareerBook { cash: number; profit: number }
export type NrlDevelopmentFocus = 'balanced' | 'youth' | 'veterans';
type ActiveDevelopmentFocus = Exclude<NrlDevelopmentFocus, 'balanced'>;
export interface NrlCareerHistoryRow {
  year: number;
  clubId: string;
  rank: number;
  wins: number;
  draws: number;
  losses: number;
  championId: string;
  finance: NrlCareerFinance | null;
  scoring?: NrlSeasonScoringTotal[];
  finals?: NrlFinalsArchive;
  playerSeasons?: NrlSeasonPlayerArchive;
  development?: { focus: ActiveDevelopmentFocus; affected: number };
  coachDevelopment?: string[];
  reserveGrade?: { playerId: string; playerName: string; rounds: number; ratingGain: 0 | 1 };
  appointment?: NrlOffseasonAppointment;
  summerApplication?: NrlSummerApplicationReceipt;
  leagueRecruitment?: NrlLeagueRecruitmentDeal[];
  coachRetained?: true;
  judiciary?: { case: NrlJudiciaryCase; matchesAfter: number };
  judiciaryCarry?: NrlJudiciaryCarry;
}
interface NrlAcademyAssignment {
  player: NrlCareerPlayer;
  startedRound: number;
}
export interface NrlAcademyReport {
  role: NrlRole;
  startedRound: number;
  status: 'scouting' | 'ready' | 'signed';
  player: NrlCareerPlayer | null;
}
interface NrlPositionCourse { playerId: string; role: NrlRole; startedRound: number }
interface NrlContractApproach {
  playerId: string;
  listedRound: number;
  endYear: number;
  destinationId?: string;
  outcome?: 'accepted' | 'declined';
}

export interface NrlCareerState {
  version: 2;
  openingYear: NrlYear;
  openingRoster?: 'matchday-2026' | 'perth-signings-2027';
  season: NrlManagerState;
  players: NrlCareerPlayer[];
  history: NrlCareerHistoryRow[];
  finance: NrlCareerBook;
  legacySeason: boolean;
  boardChallenge?: true;
  retired?: true;
  academy?: NrlAcademyAssignment[];
  developmentFocus?: ActiveDevelopmentFocus;
  shortlist?: string[];
  savedLineup?: NrlSavedLineup;
  positionTraining?: NrlPositionCourse;
  origin?: NrlOriginSeries;
  worldCup?: NrlWorldCupRun;
  offseasonApplication?: string;
  summerApplication?: NrlSummerApplication;
  leagueRecruitment?: true;
  coachRetention?: true;
  contractApproach?: NrlContractApproach;
}
type NrlOpeningMatchdayPlayer = readonly [id: number, name: string, age: number, role: NrlRole];
export type NrlOpeningMatchdayRoster = Readonly<Record<string, readonly NrlOpeningMatchdayPlayer[]>>;
type NrlOpeningRosterPlayer = readonly [id: number | string, name: string, age: number | undefined, role: NrlRole];
const PERTH_SIGNINGS_COUNT = 27;
export const isNrlNamedPlayer = (id: string): boolean => /^nrl-real-(?:\d+|perth-[a-z]+(?:-[a-z]+)*)$/.test(id);

type OriginMatchAction = { year: number; side: NrlOriginSide; game: number } & (
  | { type: 'selectOriginStarter'; role: NrlRole; playerId: string }
  | { type: 'selectOriginReserve'; slot: number; playerId: string }
  | { type: 'setOriginTactic'; tactic: NrlOriginSeries['tactic'] }
  | { type: 'playOriginMatch' }
);

export type NrlCareerAction = NrlAction
  | { type: 'startOrigin'; year: number; side: NrlOriginSide; nominationId?: string }
  | OriginMatchAction
  | { type: 'startWorldCupAppointment'; nation: NrlWorldCupNation }
  | { type: 'playWorldCupAppointment'; previous: NrlWorldCupRun; next: NrlWorldCupRun }
  | { type: 'setAttackPlan'; attackPlan: NrlAttackPlan; year: number; clubId: string; round: number }
  | { type: 'offerContract'; playerId: string; salary: number; years: number }
  | { type: 'acceptCounteroffer'; playerId: string; year: number; offeredSalary: number; contract: NrlContract }
  | { type: 'arrangeTakeover'; year: number; clubId: string; playerId: string; destinationId: string }
  | { type: 'inviteContractApproach'; year: number; clubId: string; round: number; playerId: string; permission: boolean }
  | { type: 'answerContractApproach'; year: number; clubId: string; listedRound: number; playerId: string; destinationId: string; decision: 'accept' | 'decline' }
  | { type: 'agreeMutualRelease'; year: number; clubId: string; playerId: string }
  | { type: 'saveLineup'; year: number; clubId: string }
  | { type: 'applySavedLineup'; previewKey: string }
  | { type: 'startPositionTraining'; year: number; clubId: string; round: number; playerId: string; role: NrlRole }
  | { type: 'cancelPositionTraining'; year: number; clubId: string; playerId: string; role: NrlRole; startedRound: number }
  | { type: 'startReserveGrade' | 'recallReserveGrade'; year: number; clubId: string; round: number; playerId: string }
  | { type: 'setShortlist'; playerId: string; saved: boolean; year: number }
  | { type: 'scoutAcademy'; role: NrlRole }
  | { type: 'promoteAcademy'; playerId: string }
  | { type: 'setDevelopmentFocus'; focus: NrlDevelopmentFocus }
  | { type: 'upgradeMedical'; level: MedicalUpgradeLevel }
  | { type: 'upgradeAcademy'; year: number; clubId: string; round: number }
  | { type: 'upgradeConcessions'; year: number; clubId: string; round: number }
  | { type: 'hireCoach'; role: NrlCoachRole; year: number; round: number }
  | { type: 'hireCoach'; role: 'development'; year: number; clubId: string; round: number }
  | { type: 'setTicketTier'; tier: NrlTicketTier; year: number; round: number }
  | { type: 'signSponsor'; offer: NrlSponsorOffer; year: number; clubId: string }
  | { type: 'acceptBoardPathways'; year: number; clubId: string }
  | { type: 'acceptBoardRecruitment'; year: number; clubId: string; role: NrlRole }
  | { type: 'startNextSeason'; move?: { fromYear: number; clubId: string } }
  | { type: 'applyForOffseasonJob' | 'acceptOffseasonJob'; year: number; clubId: string; destinationId: string }
  | { type: 'applyForSummerJob'; year: number; clubId: string; round: number; destinationId: string }
  | { type: 'setLeagueRecruitment'; year: number; clubId: string; enabled: boolean }
  | { type: 'setCoachRetention'; year: number; clubId: string; enabled: boolean }
  | { type: 'startCoachCourse'; year: number; clubId: string; round: number }
  | { type: 'resolveJudiciary'; year: number; clubId: string; caseRound: number; decision: NrlJudiciaryDecision }
  | { type: 'retireCareer'; year: number; clubId: string };

export interface NrlCareerCap {
  year: number;
  cap: number;
  minimumSalary: number;
  committed: number;
  slots: number;
  openSlots: number;
  holds: number;
  available: number;
}

export interface NrlCareerMarketEntry {
  player: NrlCareerPlayer;
  askingSalary: number;
  startYear: number;
  kind: 'renewal' | 'rival' | 'freeAgent';
}
export type NrlContractQuote = { ok: true; contract: NrlContract } | { ok: false; reason: string };

const rngFor = (seed: number, label: string) => rngFrom(hashLabel(`${seed}|${label}`));
const lastRound = (year: number) => nrlRegularRounds(year) + 4;
const intIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const byRating = (a: NrlCareerPlayer, b: NrlCareerPlayer) => b.rating - a.rating || a.id.localeCompare(b.id);
const activeDevelopmentFocus = (value: unknown): value is ActiveDevelopmentFocus => value === 'youth' || value === 'veterans';
const isCoachRole = (value: unknown): value is NrlStaffRole => COACH_ROLES.some(role => role === value);
const activeTicketTier = (value: unknown): value is ActiveTicketTier => value === 'value' || value === 'premium';

function contractIn(player: NrlCareerPlayer, year: number): NrlContract | null {
  const current = player.contract;
  if (current && current.startYear <= year && year <= current.endYear) return current;
  const future = player.futureContract;
  return future && future.startYear <= year && year <= future.endYear ? future : null;
}

function squadAt(players: NrlCareerPlayer[], clubId: string, year: number): NrlCareerPlayer[] {
  return players.filter(player => contractIn(player, year)?.clubId === clubId);
}

export function nrlCareerSquad(state: NrlCareerState, year = state.season.year): NrlCareerPlayer[] {
  const { clubId, squad } = state.season;
  const signed = squadAt(state.players, clubId, year);
  if (year !== state.season.year) return signed;
  const players = new Map(signed.map(player => [player.id, player]));
  return squad.map(player => players.get(player.id)!);
}

function capFor(players: NrlCareerPlayer[], clubId: string, year: number): NrlCareerCap {
  const { cap, minimumSalary } = nrlSeasonPlan(year);
  const contracts = players.map(player => contractIn(player, year)).filter(contract => contract?.clubId === clubId);
  const committed = contracts.reduce((sum, contract) => sum + contract!.salary, 0);
  const slots = contracts.length;
  const openSlots = Math.max(0, SQUAD_SIZE - slots);
  const holds = openSlots * minimumSalary;
  return { year, cap, minimumSalary, committed, slots, openSlots, holds, available: cap - committed - holds };
}

export function nrlCareerCap(state: NrlCareerState, year = state.season.year): NrlCareerCap {
  return capFor(state.players, state.season.clubId, year);
}

function makePlayer(id: string, role: NrlRole, rating: number, rng: () => number, taken: Set<string>, rookie = false): NrlCareerPlayer {
  return enrichPlayer({ id, role, rating, name: uniqueName(rng, FIRST, LAST, taken), fitness: 100 }, rng, rookie);
}

function enrichPlayer(player: NrlPlayer, rng: () => number, rookie = false, openingAge?: number): NrlCareerPlayer {
  const age = openingAge ?? (rookie ? 18 + Math.floor(rng() * 4) : 20 + Math.floor(rng() * 14));
  const potential = clampi(player.rating + rng() * (age <= 24 ? 12 : 4), player.rating, 98);
  return { ...player, age, potential, contract: null, futureContract: null };
}

function initialSquad(club: NrlClub, year: number, seed: number, taken: Set<string>, starting: NrlPlayer[] = [],
  openingTeam?: readonly NrlOpeningRosterPlayer[]): NrlCareerPlayer[] {
  const rng = rngFor(seed, `squad|${club.id}|${year}`);
  const players = openingTeam ? openingTeam.map(([id, name, age, role], index) => {
    const rating = clampi(club.strength + (rng() - 0.5) * 14 - (year === 2026 && index >= NRL_ROLES.length ? 5 : 0), 40, 98);
    const playerId = typeof id === 'number' ? `nrl-real-${id}` : `nrl-real-perth-${id}`;
    return enrichPlayer({ id: playerId, name, role, rating, fitness: 100 }, rng, false, age);
  }) : starting.map(player => enrichPlayer(player, rng));
  for (let index = players.length; index < SQUAD_SIZE; index++) {
    const role = openingTeam ? nextRole(players) : NRL_ROLES[index % NRL_ROLES.length];
    const rating = clampi(club.strength + (rng() - 0.5) * 14 - (index >= 13 ? 5 : 0), 40, 98);
    players.push(makePlayer(`nrl-${club.id}-${year}-${index}`, role, rating, rng, taken));
  }
  const { cap, minimumSalary } = nrlSeasonPlan(year);
  // Starter salaries are evenly spread above the larger known floor so existing deals stay legal in 2027.
  const floor = Math.max(minimumSalary, nrlSeasonPlan(2027).minimumSalary);
  const extra = Math.floor(cap * 0.94) - floor * SQUAD_SIZE;
  const weights = players.map(player => (player.rating - 36) ** 2);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  return players.map((player, index) => ({
    ...player,
    contract: {
      clubId: club.id, startYear: year,
      endYear: Math.min(NRL_LAST_YEAR, year + (index % 3)),
      salary: floor + Math.floor(extra * weights[index] / weightTotal),
    },
  }));
}

function newMarket(seed: number, year: number, taken: Set<string>): NrlCareerPlayer[] {
  const rng = rngFor(seed, `market|${year}`);
  return NRL_ROLES.flatMap((role, index) => Array.from({ length: 3 }, (_, prospect) => {
    const rating = clampi(49 + rng() * 23, 40, 98);
    return makePlayer(`nrl-market-${year}-${index}-${prospect}`, role, rating, rng, taken, prospect === 2);
  }));
}

function baseSalary(rating: number, year: number): number {
  const { minimumSalary } = nrlSeasonPlan(year);
  return minimumSalary + Math.round(Math.max(0, rating - 54) ** 2 * 340 / 5_000) * 5_000;
}

function marketStartYear(state: NrlCareerState, player: NrlCareerPlayer): number | null {
  if (player.futureContract || player.age >= RETIREMENT_AGE || state.season.year === NRL_LAST_YEAR) return null;
  const { contract } = player;
  const { clubId, year } = state.season;
  const own = contract?.clubId === clubId;
  if (contract && !own && contract.endYear !== year) return null;
  const startYear = (contract?.endYear ?? year) + 1;
  return startYear <= NRL_LAST_YEAR ? startYear : null;
}

function marketEntry(state: NrlCareerState, player: NrlCareerPlayer): NrlCareerMarketEntry | null {
  if (state.finance.mutualRelease?.playerId === player.id) return null;
  const startYear = marketStartYear(state, player);
  if (startYear === null) return null;
  const { contract } = player;
  const own = contract?.clubId === state.season.clubId;
  const askingSalary = Math.max(baseSalary(player.rating, startYear), own ? Math.floor(contract!.salary * 0.94) : 0);
  return { player, startYear, askingSalary, kind: own ? 'renewal' : contract ? 'rival' : 'freeAgent' };
}

export function nrlCareerMarket(state: NrlCareerState): NrlCareerMarketEntry[] {
  return state.players.slice().sort(byRating).flatMap(player => {
    const entry = marketEntry(state, player);
    return entry ? [entry] : [];
  });
}

export function nrlRivalSquad(state: NrlCareerState, clubId: string) {
  const { year } = state.season;
  if (clubId === state.season.clubId) return [];
  return squadAt(state.players, clubId, year).sort(byRating).map(player => ({
    player,
    contractEnd: contractIn(player, year)!.endYear,
    marketYear: marketStartYear(state, player),
  }));
}

function isRecruitmentTarget(state: NrlCareerState, id: string): boolean {
  const player = state.players.find(candidate => candidate.id === id);
  const entry = player && marketEntry(state, player);
  return Boolean(entry && entry.kind !== 'renewal');
}

function withShortlist(state: NrlCareerState, ids: string[]): NrlCareerState {
  if (ids.length) return { ...state, shortlist: ids };
  if (!state.shortlist) return state;
  const { shortlist, ...next } = state;
  return next;
}

const missingRoles = (squad: NrlCareerPlayer[]) => NRL_ROLES.filter(role => !squad.some(player => player.role === role));

export function nrlContractOffer(state: NrlCareerState, playerId: string, salary: number, years: number): NrlContractQuote {
  const player = state.players.find(candidate => candidate.id === playerId);
  const entry = player ? marketEntry(state, player) : null;
  return entry ? checkContractOffer(state, entry, salary, years) : { ok: false, reason: 'This player is unavailable.' };
}

export function nrlContractCounteroffer(state: NrlCareerState, playerId: string, offeredSalary: number): NrlContractQuote {
  if (state.legacySeason) return { ok: false, reason: 'Counteroffers open next season for this imported career.' };
  const player = state.players.find(candidate => candidate.id === playerId);
  const entry = player ? marketEntry(state, player) : null;
  if (state.retired || state.season.live || !entry) return { ok: false, reason: 'This player is unavailable.' };
  const { minimumSalary } = nrlSeasonPlan(entry.startYear);
  if (!intIn(offeredSalary, minimumSalary, entry.askingSalary - 1)) {
    return { ok: false, reason: 'Enter a whole AUD amount below the asking salary and at least the league minimum.' };
  }
  if (entry.startYear + COUNTEROFFER_YEARS - 1 > NRL_LAST_YEAR) {
    return { ok: false, reason: 'There are fewer than three seasons left for this contract.' };
  }
  const salary = Math.max(offeredSalary, Math.ceil(entry.askingSalary * 95 / 100));
  return checkContractOffer(state, { ...entry, askingSalary: salary }, salary, COUNTEROFFER_YEARS);
}

function checkContractOffer(
  state: NrlCareerState, entry: Pick<NrlCareerMarketEntry, 'startYear' | 'askingSalary' | 'player'>, salary: number, years: number,
): NrlContractQuote {
  if (!intIn(years, 1, MAX_CONTRACT_YEARS) || entry.startYear + years - 1 > NRL_LAST_YEAR) {
    return { ok: false, reason: 'Choose a contract from one to four years.' };
  }
  if (!intIn(salary, entry.askingSalary, Number.MAX_SAFE_INTEGER)) {
    return { ok: false, reason: 'Offer at least the asking salary in whole AUD.' };
  }
  const { clubId } = state.season;
  const contract = { clubId, startYear: entry.startYear, endYear: entry.startYear + years - 1, salary };
  const reason = contractCapacityRefusal(state.players, entry.player, contract);
  return reason ? { ok: false, reason } : { ok: true, contract };
}

function contractCapacityRefusal(players: NrlCareerPlayer[], player: NrlCareerPlayer, contract: NrlContract): string | null {
  const { clubId, salary, startYear, endYear } = contract;
  for (let year = startYear; year <= endYear; year++) {
    const cap = capFor(players, clubId, year);
    if (!cap.openSlots) return `The ${year} squad already has 30 contracts.`;
    if (salary > cap.available + cap.minimumSalary) return `This offer exceeds the ${year} salary cap.`;
    if (missingRoles([...squadAt(players, clubId, year), player]).length >= cap.openSlots) {
      return `Keep enough ${year} squad places to cover every starting position.`;
    }
  }
  return null;
}

export function nrlTakeoverPlayers(state: NrlCareerState): NrlCareerPlayer[] {
  const { clubId, year, live } = state.season;
  if (state.legacySeason || state.retired || live || year === NRL_LAST_YEAR) return [];
  return state.players.filter(player =>
    player.contract?.clubId === clubId && player.contract.endYear > year && !player.futureContract);
}

export function nrlTakeoverOffers(state: NrlCareerState, playerId: string): NrlContract[] {
  const { clubId, year } = state.season;
  const player = nrlTakeoverPlayers(state).find(candidate => candidate.id === playerId);
  if (!player?.contract) return [];
  const release = state.finance.mutualRelease;
  if (release && state.players.find(candidate => candidate.id === release.playerId)?.role === player.role
    && !nrlCareerSquad(state, year + 1).some(teammate => teammate.id !== playerId && teammate.role === player.role)) return [];
  const { salary, endYear } = player.contract;
  const startYear = year + 1;
  // Expansion clubs get their initial 30-player squad when they join the league.
  return nrlSeasonPlan(year).clubs.flatMap(club => {
    if (club.id === clubId || squadAt(state.players, club.id, startYear).some(
      signed => signed.role === player.role && signed.rating >= player.rating,
    )) return [];
    const contract = { clubId: club.id, startYear, endYear, salary };
    return contractCapacityRefusal(state.players, player, contract) ? [] : [contract];
  });
}

const CONTRACT_APPROACH_ROUNDS = 2;
export const nrlContractApproachLastRound = (year: number) => nrlRegularRounds(year) - CONTRACT_APPROACH_ROUNDS;

function applyTakeover(state: NrlCareerState, playerId: string, futureContract: NrlContract) {
  const { year } = state.season;
  return { ...state, players: state.players.map(player => player.id === playerId
    ? { ...player, contract: { ...player.contract!, endYear: year }, futureContract }
    : player) };
}

export function nrlContractApproachCandidates(state: NrlCareerState): NrlCareerPlayer[] {
  const { season } = state;
  return !state.contractApproach && season.phase === 'regular' && season.round <= nrlContractApproachLastRound(season.year)
    ? nrlTakeoverPlayers(state) : [];
}

function contractApproachCoverRefusal(state: NrlCareerState, player: NrlCareerPlayer, endYear: number): string | null {
  const { year, clubId } = state.season;
  const remaining = state.players.filter(candidate => candidate !== player);
  for (let next = year + 1; next <= endYear; next++) {
    const stillSigned = squadAt(remaining, clubId, next);
    const cap = capFor(remaining, clubId, next);
    if (cap.available < 0 || missingRoles(stillSigned).length > cap.openSlots) return `Keep enough ${next} cap room and squad places to fill every position.`;
    if (next === year + 1 && !stillSigned.some(teammate => teammate.role === player.role)) {
      return `Keep another ${player.role} signed for ${next} before accepting.`;
    }
  }
  return null;
}

function contractApproachOffers(state: NrlCareerState, listing: NrlContractApproach) {
  const player = state.players.find(candidate => candidate.id === listing.playerId);
  return player?.contract?.endYear === listing.endYear && !contractApproachCoverRefusal(state, player, listing.endYear)
    ? nrlTakeoverOffers(state, listing.playerId) : [];
}

export function nrlContractApproach(state: NrlCareerState) {
  const listing = state.contractApproach;
  if (!listing) return null;
  const { round, phase } = state.season;
  const { playerId, listedRound, destinationId, outcome } = listing;
  const deadline = listedRound + CONTRACT_APPROACH_ROUNDS;
  const status = outcome ?? (round === listedRound ? 'waiting'
    : !destinationId ? 'no-offer' : round > deadline || phase !== 'regular' ? 'expired' : 'offered');
  const player = state.players.find(candidate => candidate.id === playerId);
  let contract = status === 'accepted' ? player?.futureContract ?? null : null;
  let reason: string | null = null;
  if (status === 'offered') {
    reason = state.season.live ? 'Finish the live match before responding.'
      : !player || player.contract?.endYear !== listing.endYear ? 'The player’s remaining contract has already changed.'
        : contractApproachCoverRefusal(state, player, listing.endYear);
    if (!reason) {
      contract = nrlTakeoverOffers(state, playerId).find(offer => offer.clubId === destinationId) ?? null;
      if (!contract) reason = 'The receiving club can no longer take over this contract.';
    }
  }
  return { ...listing, deadline, status, player, contract, reason };
}

function settleContractApproach(state: NrlCareerState, settledRound: number): NrlCareerState {
  const listing = state.contractApproach;
  if (!listing || settledRound !== listing.listedRound) return state;
  const offers = contractApproachOffers(state, listing);
  if (!offers.length) return state;
  const { year, clubId, seed } = state.season;
  const rng = rngFor(seed, `contract-approach|${year}|${clubId}|${listing.playerId}`);
  return { ...state, contractApproach: { ...listing, destinationId: offers[Math.floor(rng() * offers.length)].clubId } };
}

export function nrlMutualReleaseSpend(book: NrlCareerBook): number {
  return book.mutualRelease ? Math.ceil(book.mutualRelease.annualSalary / 2) : 0;
}

export function nrlMutualReleaseQuote(state: NrlCareerState, playerId: string):
  { ok: true; settlement: number; capGain: number } | { ok: false; reason: string } {
  const { year, clubId, phase } = state.season;
  const player = state.players.find(candidate => candidate.id === playerId);
  const contract = player?.contract;
  if (phase !== 'complete' || state.retired || state.legacySeason || !state.season.kickerId || year === NRL_LAST_YEAR) {
    return { ok: false, reason: 'Mutual releases are agreed in the offseason.' };
  }
  if (state.finance.mutualRelease) return { ok: false, reason: 'This club has already agreed a release this offseason.' };
  if (!player || contract?.clubId !== clubId || contract.endYear !== year + 1
    || player.futureContract || player.age + 1 >= RETIREMENT_AGE) return { ok: false, reason: 'The player needs one season left on his deal.' };
  if (!nrlCareerSquad(state, year + 1).some(teammate => teammate.id !== playerId && teammate.role === player.role)) {
    return { ok: false, reason: 'Keep another player signed at this position for next season.' };
  }
  const settlement = Math.ceil(contract.salary / 2);
  const cash = nrlCareerFinance(state).cash;
  if (cash < settlement) return { ok: false, reason: 'The club cannot cover this settlement.' };
  if (state.coachRetention && cash - settlement < nrlCoachRetentionQuote(state).reservedWages) {
    return { ok: false, reason: 'Club cash is reserved for the assistant’s next-season wages.' };
  }
  return { ok: true, settlement, capGain: contract.salary - nrlCareerCap(state, year + 1).minimumSalary };
}

const academyPrefix = ({ clubId, year }: Pick<NrlManagerState, 'clubId' | 'year'>) => `nrl-prospect-${clubId}-${year}-`;
const academyId = (season: NrlManagerState, role: NrlRole) => `${academyPrefix(season)}${NRL_ROLES.indexOf(role)}`;
const reportReady = (season: NrlManagerState, assignment: NrlAcademyAssignment) =>
  season.phase === 'complete' || season.round > assignment.startedRound;

function academyFacilitiesActive(state: NrlCareerState, round = state.season.round): boolean {
  const purchased = state.finance.academyUpgradeRound;
  if (purchased !== undefined) return round > purchased;
  return state.history.some(receipt => receipt.clubId === state.season.clubId && receipt.finance?.academyUpgradeRound !== undefined);
}

export function nrlAcademyReports(state: NrlCareerState): NrlAcademyReport[] {
  return (state.academy ?? []).map(assignment => {
    const { player, startedRound } = assignment;
    const ready = reportReady(state.season, assignment);
    const status = !ready ? 'scouting' : state.players.some(member => member.id === player.id) ? 'signed' : 'ready';
    return { role: player.role, startedRound, status, player: ready ? player : null };
  });
}

export function nrlAcademyAvailableRoles(state: NrlCareerState): NrlRole[] {
  const { season } = state;
  const reports = state.academy ?? [];
  if (season.phase === 'complete' || season.year === NRL_LAST_YEAR || reports.some(report => !reportReady(season, report))) return [];
  const scouted = new Set(reports.map(report => report.player.role));
  return NRL_ROLES.filter(role => !scouted.has(role));
}

function scoutAcademy(state: NrlCareerState, role: NrlRole): NrlCareerState {
  if (!nrlAcademyAvailableRoles(state).includes(role)) return state;
  const { season } = state;
  const reports = state.academy ?? [];
  const names = new Set([...state.players.map(player => player.name), ...reports.map(report => report.player.name)]);
  const id = academyId(season, role);
  const rng = rngFor(season.seed, id);
  const player = makePlayer(id, role, 49 + Math.floor(rng() * 18), rng, names, true);
  const bonus = academyFacilitiesActive(state) ? ACADEMY_UPGRADE_POTENTIAL : 0;
  const potential = clampi(player.rating + 8 + rng() * 14 + bonus, player.rating, 90);
  return { ...state, academy: [...reports, { startedRound: season.round, player: { ...player, potential } }] };
}

export function nrlAcademyOffer(state: NrlCareerState, playerId: string): NrlContractQuote {
  const report = state.academy?.find(candidate => candidate.player.id === playerId);
  if (!report || !reportReady(state.season, report) || state.players.some(player => player.id === playerId)
    || state.season.year === NRL_LAST_YEAR) return { ok: false, reason: 'This prospect is unavailable.' };
  const startYear = state.season.year + 1;
  const { minimumSalary } = nrlSeasonPlan(startYear);
  return checkContractOffer(state, { player: report.player, startYear, askingSalary: minimumSalary }, minimumSalary, 1);
}

export function nrlRecruitmentBrief(state: NrlCareerState, role: NrlRole) {
  const year = state.season.year + 1;
  if (year > NRL_LAST_YEAR || state.retired) return null;
  const signed = nrlCareerSquad(state, year).filter(player => player.role === role).sort(byRating);
  const prospect = nrlAcademyReports(state).find(report => report.role === role && report.status === 'ready')?.player;
  const academy = prospect ? { player: prospect, quote: nrlAcademyOffer(state, prospect.id) } : null;
  const targets = nrlCareerMarket(state)
    .filter(entry => entry.kind !== 'renewal' && entry.startYear === year && entry.player.role === role)
    .map(entry => ({ entry, quote: checkContractOffer(state, entry, entry.askingSalary, 1) }))
    .sort((a, b) => Number(b.quote.ok) - Number(a.quote.ok)).slice(0, 3);
  return { year, signed, academy, targets };
}

export function nrlPositionTraining(state: NrlCareerState) {
  const course = state.positionTraining;
  if (!course) return null;
  const player = state.season.squad.find(candidate => candidate.id === course.playerId);
  return player ? { ...course, player, remaining: course.startedRound + NRL_POSITION_TRAINING_ROUNDS - state.season.round } : null;
}

export function nrlPositionTrainingCandidates(state: NrlCareerState): NrlPlayer[] {
  const { season } = state;
  if (state.legacySeason || state.retired || state.positionTraining || !season.injuryTracking || !season.kickerId || season.live || season.phase !== 'regular'
    || season.round + NRL_POSITION_TRAINING_ROUNDS - 1 > nrlRegularRounds(season.year)) return [];
  const unavailable = nrlUnavailable(season);
  return season.squad.filter(player => !player.secondaryRole && !unavailable.has(player.id) && nrlRetrainingRoles(player.role).length > 0);
}

export function nrlReserveGradeCandidates(state: NrlCareerState): NrlCareerPlayer[] {
  const { season } = state;
  if (state.legacySeason || state.retired || season.reserveGrade || !season.injuryTracking || !season.kickerId || season.live
    || season.phase !== 'regular' || season.round + NRL_RESERVE_GRADE_ROUNDS - 1 > nrlRegularRounds(season.year)) return [];
  const selected = new Set([...Object.values(season.lineup), ...nrlBench(season)]);
  const unavailable = nrlUnavailable(season);
  return nrlCareerSquad(state).filter(player => intIn(player.age, 18, 23) && player.rating < player.potential
    && !selected.has(player.id) && !unavailable.has(player.id) && state.positionTraining?.playerId !== player.id);
}

function playerView(player: NrlCareerPlayer): NrlPlayer {
  const { id, name, role, rating, fitness, secondaryRole } = player;
  return { id, name, role, rating, fitness, ...(secondaryRole ? { secondaryRole } : {}) };
}

function bookFrom(openingCash: number, fromRound = 1): NrlCareerBook {
  return { fromRound, openingCash, centralFunding: 0, gateReceipts: 0, wagesPaid: 0, operatingCosts: 0 };
}

export function nrlMedicalSpend(book: NrlCareerBook): number {
  return book.medicalUpgrades?.reduce((total, upgrade) => total + MEDICAL_UPGRADE_COST[upgrade.level], 0) ?? 0;
}

export function nrlAcademyFacilitySpend(book: NrlCareerBook): number {
  return book.academyUpgradeRound === undefined ? 0 : ACADEMY_UPGRADE_COST;
}

export function nrlConcessionsSpend(book: NrlCareerBook): number {
  return book.concessionsUpgradeRound === undefined ? 0 : CONCESSIONS_UPGRADE_COST;
}

export function nrlCoachSpend(book: NrlCareerBook) {
  return book.coachHire ? { signingFee: book.coachHire.retained ? 0 : COACH_SIGNING_FEE, wages: book.coachHire.paidRounds * COACH_ROUND_WAGE }
    : { signingFee: 0, wages: 0 };
}

export function nrlCoachCourseSpend({ coachCourseRound }: NrlCareerBook): number {
  return coachCourseRound === undefined ? 0 : COACH_COURSE_FEE;
}

function coachTermWages(firstRound: number, finalRound: number): number {
  return (finalRound - firstRound + 1) * COACH_ROUND_WAGE;
}

function coachWageReserve(book: NrlCareerBook, finalRound: number): number {
  return book.coachHire ? coachTermWages(book.coachHire.round, finalRound) - nrlCoachSpend(book).wages : 0;
}

export function nrlSponsorIncome({ sponsor }: NrlCareerBook): number {
  if (!sponsor) return 0;
  const { upfront, bonus } = NRL_SPONSOR_OFFERS[sponsor.offer];
  return upfront + (sponsor.bonusPaid ? bonus : 0);
}

export function nrlBoardPathwaysIncome({ pathways }: NrlCareerBook): number {
  return pathways?.earnedBy ? NRL_BOARD_PATHWAYS.bonus : 0;
}

export function nrlBoardRecruitmentIncome({ boardRecruitment }: NrlCareerBook): number {
  return boardRecruitment?.paid ? BOARD_RECRUITMENT_BONUS : 0;
}

export function nrlCareerFinance(state: Pick<NrlCareerState, 'finance'>): NrlCareerFinance {
  const { openingCash, centralFunding, gateReceipts, wagesPaid, operatingCosts } = state.finance;
  const { signingFee, wages } = nrlCoachSpend(state.finance);
  const profit = centralFunding + gateReceipts + nrlSponsorIncome(state.finance) + nrlBoardPathwaysIncome(state.finance)
    + nrlBoardRecruitmentIncome(state.finance)
    + (state.finance.concessionReceipts ?? 0) - nrlConcessionsSpend(state.finance)
    - wagesPaid - operatingCosts - nrlMedicalSpend(state.finance) - nrlAcademyFacilitySpend(state.finance)
    - nrlMutualReleaseSpend(state.finance) - signingFee - wages - nrlCoachCourseSpend(state.finance);
  return { ...state.finance, cash: openingCash + profit, profit };
}

function coachHireRefusal(state: NrlCareerState, remainingWages: number): string | null {
  const { season, finance } = state;
  if (finance.coachHire) return 'The assistant is signed through the end of this season.';
  if (state.legacySeason) return 'Hiring opens after this imported season.';
  if (season.phase === 'complete') return 'Hiring opens when the next season starts.';
  if (season.live) return 'Finish the live match first.';
  if (season.phase === 'finals' && nrlNextRound(season).clubStatus === 'eliminated') return 'Your club has no matches left this season.';
  if (nrlCareerFinance(state).cash < COACH_SIGNING_FEE + remainingWages) return 'The club needs enough cash for the fee and remaining wages.';
  return null;
}

function canHireDevelopmentAssistant(year: number, clubId: string, round: number): boolean {
  return year < NRL_LAST_YEAR && nrlSeasonPlan(year).draw.slice(round - 1)
    .filter(fixtures => fixtures.some(fixture => fixture.includes(clubId))).length >= NRL_DEVELOPMENT_ASSISTANT.appearances;
}

export function nrlTacticalAssistant({ coachHire }: NrlCareerBook): NrlCoachRole | undefined {
  return coachHire?.role === 'development' ? undefined : coachHire?.role;
}

export function nrlCoachTactics(finance: NrlCareerBook) {
  return {
    coachRole: nrlTacticalAssistant(finance),
    coachBonus: finance.coachHire?.qualified ? NRL_QUALIFIED_COACHING_BONUS : NRL_COACHING_BONUS,
  };
}

export function nrlCoachCourseQuote(state: NrlCareerState) {
  const { finance, season, legacySeason, retired } = state;
  const course = finance.coachCourseRound;
  const remaining = course === undefined ? COACH_COURSE_ROUNDS
    : Math.max(0, course + COACH_COURSE_ROUNDS - season.round);
  const reason = course !== undefined ? 'The assistant is already enrolled.'
    : retired || legacySeason || !season.kickerId || !nrlTacticalAssistant(finance) ? 'A hired tactical assistant can take this course.'
    : finance.coachHire?.retained || season.year >= NRL_LAST_YEAR ? 'This assistant cannot carry a new qualification into another season.'
    : season.live ? 'Finish the live match first.'
    : season.phase !== 'regular' || season.round + COACH_COURSE_ROUNDS - 1 > nrlRegularRounds(season.year)
      ? 'The course needs four regular-season rounds to finish.'
      : facilityPurchaseRefusal(finance, lastRound(season.year), COACH_COURSE_FEE);
  return { fee: COACH_COURSE_FEE, remaining, reason };
}

function nrlCoachCandidates(seed: number, year: number, clubId: string) {
  const rng = rngFor(seed, `coach|${year}|${clubId}`);
  const usedNames = new Set<string>();
  return COACH_ROLES.map(role => ({ role, name: uniqueName(rng, COACH_FIRST, COACH_LAST, usedNames) }));
}

export function nrlCoachRetentionQuote(state: NrlCareerState): { reason: string | null; reservedWages: number } {
  const { season, retired, legacySeason, finance } = state;
  const { year, clubId } = season;
  if (retired || legacySeason || season.phase !== 'complete' || year >= NRL_LAST_YEAR || !finance.coachHire) {
    return { reason: 'Assistant retention opens after the Grand Final for a club with an assistant.', reservedWages: 0 };
  }
  const reservedWages = coachTermWages(1, lastRound(year + 1));
  const reason = finance.coachHire.retained ? 'This assistant already extended for an extra season.'
    : nrlBoardChallengeStatus(state) === 'must-move' ? 'The board requires you to move clubs.'
    : finance.coachHire.role === 'development' && !canHireDevelopmentAssistant(year + 1, clubId, 1)
      ? 'There are no later seasons for the assistant’s development work.'
      : nrlCareerFinance(state).cash < reservedWages ? 'The club needs enough cash for next-season wages.' : null;
  return { reason, reservedWages };
}

export function nrlCoachQuote(state: NrlCareerState) {
  const { seed, year, clubId, round, phase } = state.season;
  const { coachHire } = state.finance;
  const candidates = nrlCoachCandidates(seed, year, clubId);
  const current = (coachHire?.retained ? nrlCoachCandidates(seed, year - 1, clubId) : candidates)
    .find(candidate => candidate.role === coachHire?.role) ?? null;
  const remainingWages = current ? coachWageReserve(state.finance, lastRound(year))
    : phase === 'complete' ? 0 : coachTermWages(round, lastRound(year));
  const developmentReason = !state.season.kickerId ? 'Development hiring opens after this imported season.'
    : canHireDevelopmentAssistant(year, clubId, round) ? null : 'The development assistant needs at least eight regular-season club matches left.';
  return { candidates, current, fee: COACH_SIGNING_FEE, wagePerRound: COACH_ROUND_WAGE, remainingWages,
    reason: coachHireRefusal(state, remainingWages), developmentReason };
}

function nrlMedicalLevel(state: NrlCareerState): NrlMedicalLevel {
  const current = state.finance.medicalUpgrades?.at(-1);
  if (current) return current.level;
  for (let index = state.history.length - 1; index >= 0; index--) {
    const receipt = state.history[index];
    if (receipt.clubId !== state.season.clubId) continue;
    const past = receipt.finance?.medicalUpgrades?.at(-1);
    if (past) return past.level;
  }
  return 1;
}

function facilityPurchaseRefusal(finance: NrlCareerBook, finalRound: number, cost: number): string | null {
  const cash = nrlCareerFinance({ finance }).cash;
  if (cash < cost) return 'The club needs more cash for this upgrade.';
  return cash - coachWageReserve(finance, finalRound) < cost ? 'Club cash is reserved for the assistant’s wages.' : null;
}

export function nrlAcademyFacilityQuote(state: NrlCareerState) {
  const { season, finance } = state;
  const active = academyFacilitiesActive(state);
  const installed = active || finance.academyUpgradeRound !== undefined;
  const reason = installed ? 'The club has already paid for this upgrade.'
    : state.legacySeason || !season.kickerId ? 'Upgrades open after this imported season.'
    : season.year === NRL_LAST_YEAR ? 'There is no next season for new prospects.'
    : season.phase === 'complete' ? 'Start the next season to buy an upgrade.'
    : season.live ? 'Finish the live match first.'
    : facilityPurchaseRefusal(finance, lastRound(season.year), ACADEMY_UPGRADE_COST);
  return { installed, active, cost: ACADEMY_UPGRADE_COST, potentialBonus: ACADEMY_UPGRADE_POTENTIAL, reason };
}

export function nrlMedicalUpgradeQuote(state: NrlCareerState) {
  const level = nrlMedicalLevel(state);
  const nextLevel: MedicalUpgradeLevel | null = level === 1 ? 2 : level === 2 ? 3 : null;
  const cost = nextLevel === null ? null : MEDICAL_UPGRADE_COST[nextLevel];
  const reason = cost === null ? 'Both upgrades are installed.'
    : !state.season.injuryTracking ? 'Upgrades open when injury tracking starts next season.'
      : state.season.phase === 'complete' ? 'Start the next season to buy an upgrade.'
        : state.season.live ? 'Finish the live match first.'
          : facilityPurchaseRefusal(state.finance, lastRound(state.season.year), cost);
  return { level, nextLevel, cost, reason };
}

function addMedicalUpgrade(book: NrlCareerBook, upgrade: NrlMedicalUpgrade): NrlCareerBook {
  return { ...book, medicalUpgrades: [...(book.medicalUpgrades ?? []), upgrade] };
}

function seasonReceipt(state: NrlCareerState): NrlCareerHistoryRow {
  const { season } = state;
  const ladder = nrlLadder(season);
  const rank = ladder.findIndex(row => row.clubId === season.clubId) + 1;
  const { wins, draws, losses } = ladder[rank - 1];
  const finance = state.finance.fromRound > lastRound(season.year) ? null : nrlCareerFinance(state);
  const spell = season.reserveGrade;
  const trainee = spell && season.squad.find(player => player.id === spell.playerId);
  return {
    year: season.year, clubId: season.clubId, rank, wins, draws, losses, championId: season.championId!, finance,
    ...(season.kickerId ? { scoring: archiveNrlScoring(season) } : {}),
    ...(spell && trainee ? { reserveGrade: {
      playerId: trainee.id, playerName: trainee.name,
      rounds: spell.recalledRound === undefined ? NRL_RESERVE_GRADE_ROUNDS : spell.recalledRound - spell.startedRound,
      ratingGain: spell.recalledRound === undefined ? 1 : 0,
    } } : {}),
  };
}

type NrlCareerRecordYear = Pick<NrlCareerHistoryRow, 'year' | 'clubId' | 'rank' | 'wins' | 'draws' | 'losses' | 'championId'>;

export function nrlCareerRecord(history: readonly NrlCareerRecordYear[]) {
  const first = history[0];
  if (!first) return null;
  const empty = { seasons: 0, wins: 0, draws: 0, losses: 0, premierships: 0 };
  const totals = { ...empty, finalsTrips: 0, minorPremierships: 0 };
  const clubs = new Map<string, { clubId: string; firstYear: number } & typeof empty>();
  let bestFinish = { rank: first.rank, year: first.year, clubId: first.clubId };

  for (const { year, clubId, rank, wins, draws, losses, championId } of history) {
    const club = clubs.get(clubId) ?? { ...empty, clubId, firstYear: year };
    for (const record of [totals, club]) {
      record.seasons++;
      record.wins += wins;
      record.draws += draws;
      record.losses += losses;
      record.premierships += Number(championId === clubId);
    }
    totals.finalsTrips += Number(rank <= NRL_FINALS_SPOTS);
    totals.minorPremierships += Number(rank === 1);
    club.firstYear = Math.min(club.firstYear, year);
    clubs.set(clubId, club);
    if (rank < bestFinish.rank || (rank === bestFinish.rank && year < bestFinish.year)) bestFinish = { rank, year, clubId };
  }
  const played = totals.wins + totals.draws + totals.losses;
  return {
    ...totals, bestFinish, winRate: Math.round(100 * totals.wins / played),
    clubs: [...clubs.values()].sort((a, b) => a.firstYear - b.firstYear),
  };
}

function careerFrom(season: NrlManagerState, openingYear: NrlYear, legacySeason: boolean,
  openingRoster?: { kind: NonNullable<NrlCareerState['openingRoster']>; teams: Readonly<Record<string, readonly NrlOpeningRosterPlayer[]>> }): NrlCareerState {
  const { year, clubId, squad, seed } = season;
  const names = new Set(openingRoster ? Object.values(openingRoster.teams).flatMap(team => team.map(([, name]) => name))
    : squad.map(player => player.name));
  const players = nrlSeasonPlan(year).clubs.flatMap(club =>
    initialSquad(club, year, seed, names, club.id === clubId ? squad : [], openingRoster?.teams[club.id]));
  const fullSquad = players.filter(player => player.contract?.clubId === clubId).map(playerView);
  const matchday = openingRoster?.kind === 'matchday-2026' ? {
    ...season,
    lineup: Object.fromEntries(NRL_ROLES.map((role, index) => [role, fullSquad[index].id])) as NrlManagerState['lineup'],
    bench: fullSquad.slice(NRL_ROLES.length, NRL_ROLES.length + NRL_BENCH_SIZE).map(player => player.id),
  } : openingRoster ? repairMatchday({ ...season, squad: fullSquad }, true) : season;
  const finance = bookFrom(OPENING_CASH, season.phase === 'complete' ? season.round + 1 : season.round);
  const state: NrlCareerState = {
    version: 2, openingYear,
    ...(openingRoster ? { openingRoster: openingRoster.kind } : {}),
    season: {
      ...matchday, squad: fullSquad, bench: nrlBench({ ...matchday, squad: fullSquad }),
      ...(legacySeason ? {} : { injuryTracking: true as const, kickerId: matchday.lineup.Halfback }),
    },
    players: [...players, ...newMarket(seed, year, names)], history: [], finance, legacySeason,
  };
  if (season.phase === 'complete') state.history.push(seasonReceipt(state));
  return state;
}

export function createNrlCareer(clubId: string, seed: number, openingYear: NrlYear = 2026, boardChallenge = false, judiciaryChallenge = false): NrlCareerState {
  const career = careerFrom(createNrlSeason(clubId, seed, openingYear), openingYear, false);
  if (judiciaryChallenge) career.season.judiciary = {};
  return boardChallenge ? { ...career, boardChallenge: true } : career;
}

export function createNrlOpeningMatchdayCareer(clubId: string, seed: number, roster: NrlOpeningMatchdayRoster, boardChallenge = false): NrlCareerState {
  const career = careerFrom(createNrlSeason(clubId, seed, 2026), 2026, false, { kind: 'matchday-2026', teams: roster });
  return boardChallenge ? { ...career, boardChallenge: true } : career;
}

export async function loadNrlOpeningMatchdayCareer(clubId: string, seed: number, boardChallenge: boolean): Promise<NrlCareerState> {
  const { NRL_OPENING_MATCHDAY_2026 } = await import('@/data/nrlOpeningMatchday2026');
  return createNrlOpeningMatchdayCareer(clubId, seed, NRL_OPENING_MATCHDAY_2026, boardChallenge);
}

export async function loadNrlPerthSigningsCareer(seed: number, boardChallenge: boolean): Promise<NrlCareerState> {
  const { NRL_PERTH_SIGNINGS_2027 } = await import('@/data/nrlPerthSignings2027');
  const bears = NRL_PERTH_SIGNINGS_2027.map(([id, name, role]) => [id, name, undefined, role] as const);
  const career = careerFrom(createNrlSeason('bears', seed, 2027), 2027, false, { kind: 'perth-signings-2027', teams: { bears } });
  return boardChallenge ? { ...career, boardChallenge: true } : career;
}

function hasHomeGate(fixture: NrlFixture, clubId: string): boolean {
  return fixture.homeId === clubId && fixture.tieId !== 'GF';
}

function concessionsFromPastSeason({ history, season }: NrlCareerState): boolean {
  return history.some(row => row.clubId === season.clubId && row.year < season.year
    && row.finance?.concessionsUpgradeRound !== undefined);
}

function concessionsActive(finance: NrlCareerBook, round: number, inherited: boolean): boolean {
  return inherited || (finance.concessionsUpgradeRound !== undefined && finance.concessionsUpgradeRound < round);
}

function scheduledClubFixtures(season: NrlManagerState): NrlFixture[] {
  const { year, phase, round } = season;
  if (phase === 'complete') return [];
  const end = phase === 'regular' ? nrlRegularRounds(year) : round;
  const fixtures: NrlFixture[] = [];
  for (let next = round; next <= end; next++) {
    const { clubMatch } = nrlNextRound({ ...season, round: next });
    if (clubMatch) fixtures.push(clubMatch);
  }
  return fixtures;
}

export function nrlConcessionsQuote(state: NrlCareerState) {
  const { finance, season } = state;
  const inherited = concessionsFromPastSeason(state);
  const installed = inherited || finance.concessionsUpgradeRound !== undefined;
  const active = concessionsActive(finance, season.round, inherited);
  const income = state.history.reduce((sum, row) => row.clubId === season.clubId && row.year < season.year
    ? sum + (row.finance?.concessionReceipts ?? 0) : sum, finance.concessionReceipts ?? 0);
  const matchesToPayBack = Math.max(0, Math.ceil((CONCESSIONS_UPGRADE_COST - income) / CONCESSIONS_HOME_INCOME));
  const home = scheduledClubFixtures(season).filter(match => hasHomeGate(match, season.clubId)
    && (installed ? concessionsActive(finance, match.round, inherited) : match.round > season.round));
  const reason = installed ? 'This club already has the upgrade.'
    : state.retired ? 'The manager has retired.'
    : state.legacySeason || !season.kickerId ? 'Concessions open after this imported season.'
    : season.phase !== 'regular' ? 'Purchases open during the regular season.'
    : season.live ? 'Finish the live match first.'
    : facilityPurchaseRefusal(finance, lastRound(season.year), CONCESSIONS_UPGRADE_COST);
  return {
    installed, active, income, reason, cost: CONCESSIONS_UPGRADE_COST, perHomeMatch: CONCESSIONS_HOME_INCOME,
    matchesToPayBack, remainingHomeMatches: home.length, projectedIncome: home.length * CONCESSIONS_HOME_INCOME,
    paybackRound: matchesToPayBack ? home[matchesToPayBack - 1]?.round : undefined,
  };
}

function homeGateReceipt(fixture: NrlFixture, homeWin: boolean, tier: NrlTicketTier) {
  const changes = NRL_TICKET_GATE_CHANGES[tier];
  return 240_000 + (homeWin ? 30_000 : 0) + (fixture.finalsRound ? 120_000 : 0)
    + changes[fixture.finalsRound ? 'homeFinal' : homeWin ? 'regularWin' : 'regularNonWin'];
}

function payThroughRound(annual: number, round: number, ticks: number) {
  return Math.floor(annual * round / ticks);
}

export function nrlTicketPricingRefusal({ season, legacySeason }: Pick<NrlCareerState, 'season' | 'legacySeason'>): string | null {
  if (legacySeason) return 'Ticket pricing opens next season for this imported career.';
  if (season.phase !== 'regular' || season.results.some(fixture => hasHomeGate(fixture, season.clubId))) {
    return 'Ticket pricing is locked until next season.';
  }
  return season.live ? 'Ticket pricing is unavailable during a live match.' : null;
}

export function nrlSponsorRefusal({ season, finance, legacySeason }: NrlCareerState): string | null {
  if (finance.sponsor) return 'Your sponsor is signed for this season.';
  if (legacySeason) return 'Sponsor offers open next season for this imported career.';
  if (season.phase !== 'regular' || season.round !== 1 || season.live) {
    return 'Sponsor offers close when Round 1 starts.';
  }
  return null;
}

function isSponsorOffer(offer: unknown): offer is NrlSponsorOffer {
  return offer === 'fixed' || offer === 'finals';
}

export function nrlBoardPathwaysQuote({ season, players, finance, legacySeason }: NrlCareerState) {
  const accepted = finance.pathways !== undefined;
  const progress = accepted ? nrlBoardPathwaysProgress(season, players) : [];
  const reason = accepted ? 'The board objective is already agreed.'
    : legacySeason || !season.kickerId ? 'Board pathways opens after this imported season.'
    : season.phase !== 'regular' || season.round !== 1 || season.live ? 'The offer closes when Round 1 starts.'
    : nrlBoardPathwaysEligible(season, players).length < NRL_BOARD_PATHWAYS.players ? 'Your club needs at least three eligible players.'
    : null;
  return { accepted, progress, reason, bonus: NRL_BOARD_PATHWAYS.bonus };
}

function pathwaysSettlement(season: NrlManagerState, players: NrlCareerPlayer[]): NrlCareerBook['pathways'] {
  const earnedBy = nrlBoardPathwaysProgress(season, players).filter(row => row.apps >= NRL_BOARD_PATHWAYS.appearances)
    .map(row => row.id).sort().slice(0, NRL_BOARD_PATHWAYS.players);
  return earnedBy.length === NRL_BOARD_PATHWAYS.players ? { earnedBy } : {};
}

function settlePathways(book: NrlCareerBook, season: NrlManagerState, round: number, players: NrlCareerPlayer[]): NrlCareerBook {
  if (!book.pathways || round !== nrlRegularRounds(season.year)) return book;
  return { ...book, pathways: pathwaysSettlement(season, players) };
}

export function nrlBoardRecruitmentQuote(state: NrlCareerState) {
  const { season, finance } = state;
  const { year, clubId, phase, round, live } = season;
  const objective = finance.boardRecruitment;
  const closed = phase !== 'regular';
  const unavailable = state.legacySeason || !season.kickerId ? 'This objective opens after the imported season.'
    : year === NRL_LAST_YEAR ? 'There is no next season to recruit for.'
      : state.retired || round !== 1 || live || closed ? 'The offer closes when Round 1 starts.' : null;
  const nextYear = year + 1;
  const nextSquad = !objective && !unavailable ? nrlCareerSquad(state, nextYear) : [];
  const showTargets = !objective ? !unavailable : !closed && !objective.signed;
  const market = showTargets ? nrlCareerMarket(state).filter(entry => entry.kind !== 'renewal'
    && entry.startYear === nextYear && checkContractOffer(state, entry, entry.askingSalary, 1).ok) : [];
  const roles = !objective && !unavailable ? NRL_ROLES.map(role => ({
    role, count: nextSquad.filter(player => player.role === role).length,
  })).filter(({ role, count }) => count <= 1 && !nextSquad.some(player =>
    player.role === role && player.contract?.clubId !== clubId)).sort((a, b) => a.count - b.count) : [];
  const role = objective?.role ?? roles.find(entry => market.filter(candidate => candidate.player.role === entry.role).length >= 2)?.role;
  return { role, targets: market.filter(entry => entry.player.role === role), objective, closed, bonus: BOARD_RECRUITMENT_BONUS,
    reason: objective ? 'The board objective is already agreed.' : unavailable ?? (role ? null : 'No position has two affordable external options.') };
}

function settleBoardRecruitment(book: NrlCareerBook, year: number, round: number): NrlCareerBook {
  const objective = book.boardRecruitment;
  return objective?.signed && round === nrlRegularRounds(year)
    ? { ...book, boardRecruitment: { ...objective, paid: true } } : book;
}

function tickBooks(finance: NrlCareerBook, season: NrlManagerState, round: number, results: NrlMatchResult[], cap: NrlCareerCap, inheritedConcessions: boolean): NrlCareerBook {
  const ticks = lastRound(season.year);
  const installment = (annual: number) => payThroughRound(annual, round, ticks) - payThroughRound(annual, round - 1, ticks);
  const fixture = results.find(result => result.homeId === season.clubId || result.awayId === season.clubId);
  const home = fixture && hasHomeGate(fixture, season.clubId);
  const gate = home ? homeGateReceipt(fixture, fixture.homeScore > fixture.awayScore, finance.ticketTier ?? 'standard') : 0;
  const concessions = home && concessionsActive(finance, round, inheritedConcessions);
  const earnsSponsorBonus = finance.sponsor?.offer === 'finals' && round === nrlRegularRounds(season.year)
    && nrlLadder(season).slice(0, NRL_FINALS_SPOTS).some(row => row.clubId === season.clubId);
  return {
    ...finance,
    centralFunding: finance.centralFunding + installment(cap.cap),
    wagesPaid: finance.wagesPaid + installment(cap.committed),
    gateReceipts: finance.gateReceipts + gate,
    operatingCosts: finance.operatingCosts + ROUND_OPERATING_COST + (fixture && !home ? TRAVEL_COST : 0),
    ...(concessions ? { concessionReceipts: (finance.concessionReceipts ?? 0) + CONCESSIONS_HOME_INCOME } : {}),
    ...(finance.coachHire ? { coachHire: { ...finance.coachHire, paidRounds: finance.coachHire.paidRounds + 1 } } : {}),
    ...(earnsSponsorBonus ? { sponsor: { offer: 'finals', bonusPaid: true } } : {}),
  };
}

export function nrlFinanceForecast(state: NrlCareerState) {
  const { season, finance } = state;
  const { year, phase, round, clubId } = season;
  if (phase === 'complete') return null;
  const ticks = lastRound(year);
  const roundsLeft = ticks - round + 1;
  const inherited = concessionsFromPastSeason(state);
  const tier = finance.ticketTier ?? 'standard';
  let homeMatches = 0;
  let trips = 0;
  let gateLow = 0;
  let gateHigh = 0;
  let projectedConcessions = 0;
  for (const clubMatch of scheduledClubFixtures(season)) {
    if (hasHomeGate(clubMatch, clubId)) {
      homeMatches++;
      const win = homeGateReceipt(clubMatch, true, tier);
      const nonWin = homeGateReceipt(clubMatch, false, tier);
      gateLow += Math.min(win, nonWin);
      gateHigh += Math.max(win, nonWin);
      if (concessionsActive(finance, clubMatch.round, inherited)) projectedConcessions += CONCESSIONS_HOME_INCOME;
    } else trips++;
  }
  const cap = nrlCareerCap(state);
  const remaining = (annual: number) => annual - payThroughRound(annual, round - 1, ticks);
  const funding = remaining(cap.cap);
  const playerWages = remaining(cap.committed);
  const assistantWages = coachWageReserve(finance, ticks);
  const operatingCosts = roundsLeft * ROUND_OPERATING_COST + trips * TRAVEL_COST;
  const cashNow = nrlCareerFinance(state).cash;
  const cashBeforeGates = cashNow + funding - playerWages - assistantWages - operatingCosts;
  return { roundsLeft, homeMatches, trips, funding, playerWages, assistantWages, operatingCosts,
    cashNow, gateLow, gateHigh, projectedConcessions,
    closingLow: cashBeforeGates + gateLow + projectedConcessions, closingHigh: cashBeforeGates + gateHigh + projectedConcessions };
}

function opponentRatings(state: NrlCareerState) {
  const { year, clubId } = state.season;
  const ratings = new Map<string, Map<NrlRole, number>>();
  for (const player of state.players) {
    const contract = contractIn(player, year);
    if (!contract || contract.clubId === clubId) continue;
    const roles = ratings.get(contract.clubId) ?? new Map<NrlRole, number>();
    roles.set(player.role, Math.max(roles.get(player.role) ?? 0, player.rating));
    ratings.set(contract.clubId, roles);
  }
  return ratings;
}

function planRivalRatings(season: NrlManagerState, ratings: ReturnType<typeof opponentRatings>) {
  if (!season.kickerId || !season.bench || season.phase === 'complete') return undefined;
  const fixture = nrlNextRound(season).clubMatch;
  const rival = fixture && ratings.get(fixture.homeId === season.clubId ? fixture.awayId : fixture.homeId);
  return rival?.size === NRL_ROLES.length ? rival : undefined;
}

function careerMatchday(state: NrlCareerState) {
  // The imported season uses the original lineups and opponent ratings.
  if (state.legacySeason) return { matchday: { ...state.season, bench: undefined } };
  const ratings = opponentRatings(state);
  const opponentStrength = new Map([...ratings].map(([id, roles]) =>
    [id, [...roles.values()].reduce((sum, rating) => sum + rating, 0) / NRL_ROLES.length]));
  return {
    matchday: state.season,
    opponentStrength,
    planRatings: state.season.attackPlan && state.season.attackPlan !== 'counter' ? planRivalRatings(state.season, ratings) : undefined,
  };
}

export function nrlAttackPlanPreview(state: NrlCareerState) {
  if (state.legacySeason || state.retired || state.season.live) return null;
  const rival = planRivalRatings(state.season, opponentRatings(state));
  return rival ? nrlPlanAdjustments(state.season, rival) : null;
}

export function nrlCounterPlanPreview({ season, legacySeason, retired }: NrlCareerState) {
  if (legacySeason || retired || season.live || !season.kickerId || !season.bench) return null;
  const { clubMatch } = nrlNextRound(season);
  return clubMatch ? nrlCounterPlan(season, clubMatch) : null;
}

export interface NrlOppositionReport {
  opponentId: string;
  ladderRank: number | null;
  recent: { round: number; rivalId: string; scored: number; conceded: number; outcome: 'W' | 'D' | 'L' }[];
  attackEdge: number;
  defenseEdge: number;
  style?: ReturnType<typeof nrlCounterPlan>['style'];
}

export function nrlOppositionReport(state: NrlCareerState): NrlOppositionReport | null {
  const { season } = state;
  if (season.live) return null;
  const { clubMatch } = nrlNextRound(season);
  if (!clubMatch) return null;
  const opponentId = clubMatch.homeId === season.clubId ? clubMatch.awayId : clubMatch.homeId;
  const ladder = nrlLadder(season);
  const index = ladder.findIndex(row => row.clubId === opponentId);
  const ladderRank = ladder[index]?.played ? index + 1 : null;
  const recent = season.results.filter(match => match.homeId === opponentId || match.awayId === opponentId)
    .slice(-3).reverse().map<NrlOppositionReport['recent'][number]>(match => {
      const home = match.homeId === opponentId;
      const scored = home ? match.homeScore : match.awayScore;
      const conceded = home ? match.awayScore : match.homeScore;
      return {
        round: match.round, rivalId: home ? match.awayId : match.homeId, scored, conceded,
        outcome: scored > conceded ? 'W' : scored < conceded ? 'L' : 'D',
      };
    });
  const { matchday, opponentStrength, planRatings } = careerMatchday(state);
  const style = nrlCounterPlanPreview(state)?.style;
  return { opponentId, ladderRank, recent, ...(style && { style }), ...nrlMatchupEdges(matchday, clubMatch, opponentStrength, {
    ...nrlCoachTactics(state.finance), planRivalRatings: planRatings,
  }) };
}

function advanceCareer(state: NrlCareerState, action: Extract<NrlAction, { type: 'advance' | 'finishLive' | 'finishMinute60' }>): NrlCareerState {
  const previous = state.season;
  if (judiciaryNeedsResponse(previous) && nrlNextRound(previous).clubMatch) return state;
  const { matchday, opponentStrength, planRatings } = careerMatchday(state);
  const played = reduceNrlSeason(matchday, action, opponentStrength, {
    medicalReduction: nrlMedicalLevel(state) - 1, ...nrlCoachTactics(state.finance), planRivalRatings: planRatings,
  });
  if (played === matchday) return state;
  const newResults = played.results.slice(previous.results.length);
  const review = nrlNewJudiciaryCase(previous, newResults);
  const season = review ? { ...played, judiciary: { ...played.judiciary, case: review } }
    : state.legacySeason ? { ...played, bench: previous.bench } : played;
  const fitness = new Map(season.squad.map(player => [player.id, player.fitness]));
  const players = state.players.map(player => {
    const nextFitness = fitness.get(player.id);
    return nextFitness === undefined || nextFitness === player.fitness ? player : { ...player, fitness: nextFitness };
  });
  const book = tickBooks(state.finance, season, previous.round, newResults, nrlCareerCap(state), concessionsFromPastSeason(state));
  const finance = settleBoardRecruitment(settlePathways(book, season, previous.round, players), season.year, previous.round);
  let next = { ...state, season, players, finance };
  const course = nrlPositionTraining(next);
  if (course && course.remaining === 0) {
    const { positionTraining, ...trained } = next;
    const qualify = <Player extends NrlPlayer>(player: Player): Player =>
      player.id === course.playerId ? { ...player, secondaryRole: course.role } : player;
    next = { ...trained, players: players.map(qualify), season: { ...season, squad: season.squad.map(qualify) } };
  }
  if (previous.reserveGrade && nrlReserveGradeRemaining(previous) === 1) {
    const { playerId } = previous.reserveGrade;
    const develop = <Player extends NrlPlayer>(player: Player): Player =>
      player.id === playerId ? { ...player, rating: player.rating + 1 } : player;
    next = { ...next, players: next.players.map(develop), season: { ...next.season, squad: next.season.squad.map(develop) } };
  }
  next = settleContractApproach(next, previous.round);
  if (season.phase !== 'complete') return next;
  const receipt = seasonReceipt(next);
  const { summerApplication, ...finished } = next;
  if (!summerApplication) return { ...next, history: [...next.history, receipt] };
  const application = settleSummerApplication(next, summerApplication);
  return { ...finished, history: [...finished.history, { ...receipt, summerApplication: application }] };
}

function agedRating(player: NrlCareerPlayer, year: number, seed: number): number {
  const age = player.age + 1;
  const rng = rngFor(seed, `growth|${year}|${player.id}`);
  const growth = age <= 24 ? Math.floor(rng() * 3) : age >= 30 ? -Math.floor(rng() * 3) : 0;
  return clampi(player.rating + growth, 40, player.potential);
}

function developmentGains(state: NrlCareerState): Set<string> {
  const gains = new Set<string>();
  const { developmentFocus, season: { year, clubId, seed } } = state;
  if (!developmentFocus || state.legacySeason || year >= NRL_LAST_YEAR) return gains;
  for (const player of nrlCareerSquad(state)) {
    if (contractIn(player, year + 1)?.clubId !== clubId) continue;
    const age = player.age + 1;
    const rating = agedRating(player, year + 1, seed);
    if (developmentFocus === 'youth' ? age <= 24 && rating < player.potential : age >= 30 && rating < player.rating) {
      gains.add(player.id);
    }
  }
  return gains;
}

export function nrlDevelopmentPreview(state: NrlCareerState): number {
  return developmentGains(state).size;
}

export function nrlDevelopmentAssistantProgress(state: NrlCareerState) {
  const { season, finance: { coachHire } } = state;
  if (coachHire?.role !== 'development') return [];
  const { year, clubId, seed } = season;
  const eligible = new Set(nrlCareerSquad(state).filter(player => player.age + 1 <= NRL_DEVELOPMENT_ASSISTANT.nextAge
    && contractIn(player, year + 1)?.clubId === clubId && agedRating(player, year + 1, seed) < player.potential).map(player => player.id));
  const { rows } = nrlSquadSeasonStats({ ...season, results: season.results.filter(match => match.round >= coachHire.round) }, 'regular');
  return rows.filter(row => eligible.has(row.id)).sort((a, b) => b.apps - a.apps || a.id.localeCompare(b.id));
}

function advancePlayer(player: NrlCareerPlayer, year: number, seed: number, extraPoint: boolean): NrlCareerPlayer {
  const active = contractIn(player, year);
  const next = active === player.futureContract ? null : player.futureContract;
  return {
    ...player, age: player.age + 1, rating: agedRating(player, year, seed) + Number(extraPoint),
    fitness: 100, contract: active, futureContract: next,
  };
}

function nextRole(squad: NrlCareerPlayer[]): NrlRole {
  const counts = new Map(NRL_ROLES.map(role => [role, 0]));
  for (const player of squad) counts.set(player.role, counts.get(player.role)! + 1);
  return NRL_ROLES.reduce((least, role) => counts.get(role)! < counts.get(least)! ? role : least);
}

function completeSquads(players: NrlCareerPlayer[], state: NrlCareerState, year: number, names: Set<string>): NrlCareerPlayer[] {
  const { clubId: managed, seed } = state.season;
  const { clubs, cap, minimumSalary } = nrlSeasonPlan(year);
  const activeById = new Map(players.map(player => [player.id, player]));
  const freeAgents = players.filter(player => !player.contract && !player.futureContract).sort(byRating);
  for (const club of clubs) {
    const squad = players.filter(player => player.contract?.clubId === club.id);
    let wages = squad.reduce((sum, player) => sum + player.contract!.salary, 0);
    const rng = rngFor(seed, `academy|${year}|${club.id}`);
    while (squad.length < SQUAD_SIZE) {
      const role = nextRole(squad);
      const available = cap - wages - (SQUAD_SIZE - squad.length - 1) * minimumSalary;
      const recruit = club.id !== managed ? freeAgents.find(player => player.role === role
        && !activeById.get(player.id)!.contract && baseSalary(player.rating, year) <= available) : undefined;
      const player = recruit ?? makePlayer(`nrl-academy-${club.id}-${year}-${squad.length}`, role,
        clampi(club.strength - 13 + rng() * 8, 40, 98), rng, names, true);
      const salary = recruit ? baseSalary(player.rating, year) : minimumSalary;
      const signed = { ...player, contract: { clubId: club.id, startYear: year, endYear: year, salary } };
      activeById.set(signed.id, signed);
      squad.push(signed);
      wages += salary;
    }
  }
  return [...activeById.values()];
}

export function nrlOffseasonClubs({ season, retired }: Pick<NrlCareerState, 'season' | 'retired'>): readonly NrlClub[] {
  if (retired || season.phase !== 'complete' || season.year === NRL_LAST_YEAR) return [];
  return nrlSeasonPlan(season.year + 1).clubs.filter(club => club.id !== season.clubId);
}

type NrlOffseasonOpportunity = { clubId: string; nextTarget: string } & (
  { reason: 'expansion' } | { reason: 'missed'; rank: number; missedBy: number }
);
type NrlOffseasonAppointment = Pick<NrlOffseasonOpportunity, 'clubId' | 'reason'>;
type NrlSummerApplication = { clubId: string; round: number };
type NrlSummerApplicationReceipt = NrlSummerApplication & { response: 'offered' | 'declined' | 'vacancy-closed' };
interface NrlLeagueRecruitmentDeal { playerId: string; playerName: string; clubId: string; annualSalary: number }
export const NRL_SUMMER_FIRST_ROUND = 14;
export const nrlSummerLastRound = (year: number) => nrlRegularRounds(year) - 5;

export function nrlOffseasonOpportunities(state: NrlCareerState): NrlOffseasonOpportunity[] {
  const { season } = state;
  const clubs = nrlOffseasonClubs(state);
  if (!clubs.length) return [];
  const { year, results } = season;
  const { draw } = nrlSeasonPlan(year);
  let matchIndex = 0;
  const fullDraw = draw.every((round, index) => round.every(([homeId, awayId]) => {
    const result = results[matchIndex++];
    return result?.round === index + 1 && result.homeId === homeId && result.awayId === awayId;
  }));
  return nrlJobOpenings(state, clubs, fullDraw);
}

function nrlJobOpenings({ season, history }: Pick<NrlCareerState, 'season' | 'history'>, clubs: readonly NrlClub[], includeRivals: boolean): NrlOffseasonOpportunity[] {
  const { year } = season;
  const current = nrlSeasonPlan(year).clubs;
  const available = new Set(clubs.map(club => club.id));
  const openings: NrlOffseasonOpportunity[] = clubs.filter(club => !current.some(known => known.id === club.id)).map(club => ({
    clubId: club.id, reason: 'expansion', nextTarget: nrlBoardBenchmark(year + 1, club.id)!.label,
  }));
  if (!includeRivals) return openings;
  const misses = nrlLadder(season).flatMap(({ clubId }, index) => {
    if (!available.has(clubId) || clubId === season.championId) return [];
    const previousPlace = history.find(row => row.year === year - 1 && row.clubId === clubId)?.rank;
    const missedBy = index + 1 - nrlBoardBenchmark(year, clubId, previousPlace)!.targetRank;
    return missedBy > 0 ? [{ clubId, rank: index + 1, missedBy }] : [];
  });
  return [...openings, ...misses.sort((a, b) => b.missedBy - a.missedBy || a.rank - b.rank).slice(0, 2).map(row => ({
    ...row, reason: 'missed' as const, nextTarget: nrlBoardBenchmark(year + 1, row.clubId)!.label,
  }))];
}

export function nrlProjectedSummerOpenings({ season, history, retired, legacySeason }: NrlCareerState): NrlOffseasonOpportunity[] {
  if (retired || legacySeason || !season.kickerId || season.year === NRL_LAST_YEAR || season.phase !== 'regular'
    || season.round < NRL_SUMMER_FIRST_ROUND || season.round > nrlSummerLastRound(season.year)) return [];
  const clubs = nrlSeasonPlan(season.year + 1).clubs.filter(club => club.id !== season.clubId);
  return nrlJobOpenings({ season, history }, clubs, true);
}

export const NRL_FAST_FORWARD_ROUNDS = 4;
export type NrlFastForwardRequest = { year: number; clubId: string; round: number; through: number };
export type NrlFastForwardStop = 'injury' | 'lineup' | 'academy' | 'development' | 'applications' | 'finals' | 'judiciary' | 'contract-approach';

export function runNrlFastForward(initial: NrlCareerState, request: NrlFastForwardRequest): {
  state: NrlCareerState; stop: NrlFastForwardStop | null;
} {
  const { year, clubId, round, phase, live } = initial.season;
  if (initial.retired || live || phase !== 'regular' || request.year !== year || request.clubId !== clubId
    || request.round !== round || !intIn(request.through, round + 1, Math.min(round + NRL_FAST_FORWARD_ROUNDS - 1, nrlRegularRounds(year)))) {
    return { state: initial, stop: null };
  }
  let state = initial;
  while (state.season.round <= request.through) {
    const { season } = state;
    if (judiciaryNeedsResponse(season)) return { state, stop: 'judiciary' };
    if (!state.summerApplication && (season.round === nrlSummerLastRound(year)
      || (state !== initial && season.round === NRL_SUMMER_FIRST_ROUND)) && nrlProjectedSummerOpenings(state).length) {
      return { state, stop: 'applications' };
    }
    if (nrlNextRound(season).clubMatch) {
      const unavailable = nrlUnavailable(season);
      const named = [...Object.values(season.lineup), ...nrlBench(season)];
      if (new Set(named).size !== NRL_ROLES.length + NRL_BENCH_SIZE || named.some(id => unavailable.has(id))) {
        return { state, stop: 'lineup' };
      }
    }
    const next = advanceCareer(state, { type: 'advance' });
    if (judiciaryNeedsResponse(next.season)) return { state: next, stop: 'judiciary' };
    if (!state.contractApproach?.destinationId && next.contractApproach?.destinationId) return { state: next, stop: 'contract-approach' };
    if (next.season.results.slice(season.results.length).some(result => result.injury)) return { state: next, stop: 'injury' };
    if (state.academy?.some(report => !reportReady(season, report) && reportReady(next.season, report))) {
      return { state: next, stop: 'academy' };
    }
    if ((state.positionTraining && !next.positionTraining)
      || (nrlReserveGradeRemaining(season) === 1)
      || (state.finance.coachCourseRound !== undefined && nrlCoachCourseQuote(state).remaining === 1)) {
      return { state: next, stop: 'development' };
    }
    if (next.season.phase !== 'regular') return { state: next, stop: 'finals' };
    state = next;
  }
  return { state, stop: null };
}

function offseasonOffer(state: NrlCareerState, reason: NrlOffseasonOpportunity['reason']): boolean {
  return reason === 'expansion' || state.season.championId === state.season.clubId || nrlBoardTarget(state)?.result === 'met';
}

function settleSummerApplication(state: NrlCareerState, application: NrlSummerApplication): NrlSummerApplicationReceipt {
  const vacancy = nrlOffseasonOpportunities({ ...state, retired: undefined }).find(job => job.clubId === application.clubId);
  return { ...application, response: vacancy ? offseasonOffer(state, vacancy.reason) ? 'offered' : 'declined' : 'vacancy-closed' };
}

export function nrlSummerApplication(state: NrlCareerState) {
  if (state.summerApplication) return { ...state.summerApplication, response: 'pending' as const };
  const receipt = state.history.at(-1);
  if (receipt?.year !== state.season.year || !receipt.summerApplication) return null;
  const application = receipt.summerApplication;
  const reason = nrlSeasonPlan(receipt.year).clubs.some(club => club.id === application.clubId) ? 'missed' as const : 'expansion' as const;
  return { ...application, reason };
}

function validSummerApplication(value: unknown, year: number, clubId: string): value is NrlSummerApplication {
  return year < NRL_LAST_YEAR && record(value)
    && intIn(value.round, NRL_SUMMER_FIRST_ROUND, nrlSummerLastRound(year))
    && value.clubId !== clubId && nrlSeasonPlan(year + 1).clubs.some(club => club.id === value.clubId);
}

function wasSummerOpening(state: NrlCareerState, { clubId, round }: NrlSummerApplication): boolean {
  const season: NrlManagerState = { ...state.season, round, phase: 'regular', championId: null,
    results: state.season.results.filter(match => match.round < round) };
  return nrlProjectedSummerOpenings({ ...state, season, retired: undefined }).some(job => job.clubId === clubId);
}

export function nrlOffseasonApplication(state: NrlCareerState) {
  const { offseasonApplication } = state;
  if (!offseasonApplication || state.legacySeason) return null;
  const opening = nrlOffseasonOpportunities(state).find(job => job.clubId === offseasonApplication);
  if (!opening) return null;
  const offered = offseasonOffer(state, opening.reason);
  return { ...opening, response: offered ? 'offered' as const : 'declined' as const };
}

function offseasonSquads(state: NrlCareerState) {
  const { season } = state;
  const year = season.year + 1;
  const focusGains = developmentGains(state);
  const coachDevelopment = state.finance.coachHire?.role === 'development'
    ? nrlDevelopmentAssistantProgress(state).filter(row => row.apps >= NRL_DEVELOPMENT_ASSISTANT.appearances && !focusGains.has(row.id))
      .slice(0, NRL_DEVELOPMENT_ASSISTANT.players).map(row => row.id)
    : undefined;
  const gains = coachDevelopment?.length ? new Set([...focusGains, ...coachDevelopment]) : focusGains;
  const players = state.players.map(player => advancePlayer(player, year, season.seed, gains.has(player.id)))
    .filter(player => player.contract || player.futureContract || player.age < RETIREMENT_AGE);
  const names = new Set(players.map(player => player.name));
  const priorClubs = new Set(nrlSeasonPlan(season.year).clubs.map(club => club.id));
  for (const club of nrlSeasonPlan(year).clubs) {
    if (!priorClubs.has(club.id)) players.push(...initialSquad(club, year, season.seed, names));
  }
  players.push(...newMarket(season.seed, year, names));
  const settled = completeSquads(players, state, year, names);
  return { settled, focusGains, coachDevelopment };
}

function leagueRecruitmentAvailable({ season, retired, legacySeason }: NrlCareerState): boolean {
  return !retired && !legacySeason && Boolean(season.kickerId) && season.phase === 'complete' && season.year + 2 <= NRL_LAST_YEAR;
}

function leagueRecruitmentDeals(state: NrlCareerState, settled: NrlCareerPlayer[], nextClubId: string): NrlLeagueRecruitmentDeal[] {
  const { year, clubId } = state.season;
  const expiring = new Set(state.players.filter(player => player.contract?.endYear === year && !player.futureContract).map(player => player.id));
  return nrlSeasonPlan(year + 1).clubs.flatMap(club => {
    if (club.id === clubId || club.id === nextClubId) return [];
    const candidate = settled.filter(player => player.contract?.clubId === club.id && player.contract.startYear === year + 1
      && player.contract.endYear === year + 1 && expiring.has(player.id)).sort(byRating).find(player =>
        !contractCapacityRefusal(settled, player, { clubId: club.id, startYear: year + 2, endYear: year + 2, salary: player.contract!.salary }));
    return candidate ? [{ playerId: candidate.id, playerName: candidate.name, clubId: club.id, annualSalary: candidate.contract!.salary }] : [];
  });
}

export function nrlLeagueRecruitmentPreview(state: NrlCareerState, destinationId = state.season.clubId): NrlLeagueRecruitmentDeal[] | null {
  if (!leagueRecruitmentAvailable(state) || (destinationId !== state.season.clubId
    && !nrlOffseasonClubs(state).some(club => club.id === destinationId))) return null;
  return leagueRecruitmentDeals(state, offseasonSquads(state).settled, destinationId);
}

function rolloverCareer(state: NrlCareerState, move?: { fromYear: number; clubId: string }, appointment?: NrlOffseasonAppointment): NrlCareerState {
  const { season } = state;
  if (season.phase !== 'complete' || season.year === NRL_LAST_YEAR || judiciaryNeedsResponse(season)) return state;
  if (!move && nrlBoardChallengeStatus(state) === 'must-move') return state;
  if (move && (move.fromYear !== season.year || !nrlOffseasonClubs(state).some(club => club.id === move.clubId))) return state;
  const { developmentFocus, shortlist, savedLineup, positionTraining, offseasonApplication, leagueRecruitment, coachRetention, contractApproach, ...career } = state;
  const year = season.year + 1;
  const clubId = move?.clubId ?? season.clubId;
  const { settled, focusGains, coachDevelopment } = offseasonSquads(state);
  const freeAgents = settled.filter(player => !player.contract && !player.futureContract).sort(byRating);
  const releasedId = state.finance.mutualRelease?.playerId;
  const pool = NRL_ROLES.flatMap(role => {
    const available = freeAgents.filter(player => player.role === role);
    const top = available.slice(0, MARKET_PER_ROLE);
    const released = releasedId && available.find(player => player.id === releasedId);
    return released && !top.includes(released) ? [...top.slice(0, MARKET_PER_ROLE - 1), released] : top;
  });
  const deals = leagueRecruitment ? leagueRecruitmentDeals(state, settled, clubId) : null;
  const extensions = deals && new Set(deals.map(deal => deal.playerId));
  const contracted = settled.filter(player => player.contract || player.futureContract);
  const world = [...(extensions ? contracted.map(player => extensions.has(player.id)
    ? { ...player, contract: { ...player.contract!, endYear: year + 1 } } : player) : contracted), ...pool];
  const squad = squadAt(world, clubId, year).sort(byRating);
  const lineup = { ...season.lineup };
  for (const role of NRL_ROLES) {
    if (move || !squad.some(player => player.id === lineup[role] && player.role === role)) {
      lineup[role] = squad.find(player => player.role === role)!.id;
    }
  }
  const { reserveGrade, judiciary, ...lastSeason } = season;
  const outstanding = !move && judiciary ? [...nrlJudiciaryBans(season)].find(([id]) => squad.some(player => player.id === id)) : undefined;
  const carried = outstanding && { playerId: outstanding[0], matches: outstanding[1] };
  const nextSeason: NrlManagerState = {
    ...lastSeason, clubId, year, round: 1, phase: 'regular', championId: null,
    results: [], squad: squad.map(playerView), lineup, preparation: null, injuryTracking: true,
    ...(move ? { bench: undefined, tactic: 'balanced' } : {}),
    kickerId: !move && season.kickerId && Object.values(lineup).includes(season.kickerId) ? season.kickerId : lineup.Halfback,
    ...(judiciary && { judiciary: carried ? { carried } : {} }),
  };
  const playerSeasons = archiveNrlPlayerSeasons(season);
  const review = nrlJudiciaryCase(season);
  const coachHire = !move && coachRetention && state.finance.coachHire
    ? { role: state.finance.coachHire.role, round: 1, paidRounds: 0, retained: true as const,
      ...(state.finance.coachCourseRound !== undefined && { qualified: true as const }) } : undefined;
  const history = state.history.map(row => row.year === season.year ? {
    ...row, finals: archiveNrlFinals(season),
    ...(playerSeasons && { playerSeasons }),
    ...(developmentFocus ? { development: { focus: developmentFocus, affected: focusGains.size } } : {}),
    ...(coachDevelopment ? { coachDevelopment } : {}),
    ...(appointment ? { appointment } : {}),
    ...(deals && { leagueRecruitment: deals }),
    ...(coachHire && { coachRetained: true as const }),
    ...(review && { judiciary: { case: review, matchesAfter: nrlJudiciaryMatchesAfter(season, review.round) } }),
    ...(carried && { judiciaryCarry: carried }),
  } : row);
  const openingCash = move
    ? history.reduce((cash, receipt) => receipt.clubId === clubId && receipt.finance ? receipt.finance.cash : cash, OPENING_CASH)
    : nrlCareerFinance(state).cash;
  const finance = bookFrom(openingCash);
  const next = {
    ...career, players: world, history, legacySeason: false, academy: undefined,
    finance: coachHire ? { ...finance, coachHire } : finance,
    season: carried ? repairMatchday(nextSeason) : { ...nextSeason, bench: nrlBench(nextSeason) },
  };
  return move || !shortlist ? next : withShortlist(next, shortlist.filter(id => isRecruitmentTarget(next, id)));
}

const worldCupAppointmentSeed = (seed: number) => hashLabel(`nrl-world-cup-appointment-v1|${seed}`);

export function nrlWorldCupAppointmentAvailable({ retired, legacySeason, worldCup, season }: NrlCareerState): boolean {
  return !retired && !legacySeason && !worldCup && season.year === 2026 && season.phase === 'complete';
}

export function reduceNrlCareer(state: NrlCareerState, action: NrlCareerAction): NrlCareerState {
  if (state.retired || (state.season.live && action.type !== 'finishLive' && action.type !== 'reachMinute60' && action.type !== 'finishMinute60')) return state;
  switch (action.type) {
    case 'resolveJudiciary': {
      const { season } = state;
      const review = nrlJudiciaryCase(season);
      if (!review || review.decision || action.year !== season.year || action.clubId !== season.clubId || action.caseRound !== review.round
        || (action.decision !== 'plea' && action.decision !== 'contest')) return state;
      const decided = { ...review, decision: action.decision, decidedRound: season.round,
        ...(season.phase === 'complete' && { settledAfterMatch: true as const }) };
      const next = { ...season, judiciary: { ...season.judiciary, case: decided } };
      return { ...state, season: nrlJudiciaryPenalty(season, decided) ? repairMatchday(next) : next };
    }
    case 'startWorldCupAppointment': {
      if (!nrlWorldCupAppointmentAvailable(state) || !isNrlWorldCupNation(action.nation)) return state;
      return { ...state, worldCup: createNrlWorldCup(worldCupAppointmentSeed(state.season.seed), action.nation) };
    }
    case 'playWorldCupAppointment': {
      const { previous, next } = action;
      if (!state.worldCup || state.worldCup !== previous || !isNrlWorldCupRun(next)
        || next.seed !== previous.seed || next.nation !== previous.nation
        || next.tactics.length !== previous.tactics.length + 1
        || !previous.tactics.every((tactic, index) => {
          const before = previous.lineups?.[index + 1], after = next.lineups?.[index + 1];
          return tactic === next.tactics[index] && before?.swap === after?.swap && before?.firstReserve === after?.firstReserve;
        })) return state;
      return { ...state, worldCup: next };
    }
    case 'startOrigin': {
      const { origin, season } = state;
      if (action.year !== season.year || (origin && (origin.year >= action.year || !nrlOriginComplete(origin)))) return state;
      const players = state.players.filter(player => contractIn(player, season.year));
      const { nominationId } = action;
      if (nominationId !== undefined && (nrlOriginEligibility(nominationId) !== action.side || !players.some(player =>
        player.id === nominationId && contractIn(player, season.year)?.clubId === season.clubId))) return state;
      const next = createNrlOriginSeries(players, season.year, action.side,
        nominationId === undefined ? undefined : { clubId: season.clubId, playerId: nominationId });
      return next ? { ...state, origin: next } : state;
    }
    case 'selectOriginStarter':
    case 'selectOriginReserve':
    case 'setOriginTactic':
    case 'playOriginMatch': {
      const { origin } = state;
      if (!origin || action.year !== origin.year || action.side !== origin.side || action.game !== origin.matches.length + 1) return state;
      const next = action.type === 'selectOriginStarter' ? selectNrlOriginStarter(origin, action.role, action.playerId)
        : action.type === 'selectOriginReserve' ? selectNrlOriginReserve(origin, action.slot, action.playerId)
        : action.type === 'setOriginTactic' ? setNrlOriginTactic(origin, action.tactic)
        : playNrlOriginMatch(origin, state.season.seed, action.game);
      return next === origin ? state : { ...state, origin: next };
    }
    case 'setAttackPlan': {
      const { season } = state;
      if (action.year !== season.year || action.clubId !== season.clubId || action.round !== season.round) return state;
      if (action.attackPlan === 'standard') {
        if (!season.attackPlan) return state;
        const { attackPlan, ...standard } = season;
        return { ...state, season: standard };
      }
      if (action.attackPlan === season.attackPlan || !NRL_ATTACK_PLANS.includes(action.attackPlan) || state.legacySeason) return state;
      if (action.attackPlan === 'counter' ? !nrlCounterPlanPreview(state) : !planRivalRatings(season, opponentRatings(state))) return state;
      return { ...state, season: { ...season, attackPlan: action.attackPlan } };
    }
    case 'retireCareer': {
      const { phase, year, clubId } = state.season;
      if (phase !== 'complete' || action.year !== year || action.clubId !== clubId || judiciaryNeedsResponse(state.season)) return state;
      const { offseasonApplication, leagueRecruitment, coachRetention, contractApproach, ...career } = state;
      return { ...career, retired: true };
    }
    case 'setCoachRetention': {
      const { year, clubId } = state.season;
      if (action.year !== year || action.clubId !== clubId || typeof action.enabled !== 'boolean'
        || action.enabled === Boolean(state.coachRetention) || nrlCoachRetentionQuote(state).reason !== null) return state;
      if (action.enabled) return { ...state, coachRetention: true };
      const { coachRetention, ...career } = state;
      return career;
    }
    case 'startCoachCourse': {
      const { year, clubId, round } = state.season;
      if (action.year !== year || action.clubId !== clubId || action.round !== round || nrlCoachCourseQuote(state).reason !== null) return state;
      return { ...state, finance: { ...state.finance, coachCourseRound: round } };
    }
    case 'setLeagueRecruitment': {
      const { year, clubId } = state.season;
      if (action.year !== year || action.clubId !== clubId || !leagueRecruitmentAvailable(state)
        || typeof action.enabled !== 'boolean' || action.enabled === Boolean(state.leagueRecruitment)) return state;
      if (action.enabled) return { ...state, leagueRecruitment: true };
      const { leagueRecruitment, ...career } = state;
      return career;
    }
    case 'applyForOffseasonJob': {
      const { season, legacySeason, offseasonApplication } = state;
      if (legacySeason || offseasonApplication || nrlSummerApplication(state) || action.year !== season.year || action.clubId !== season.clubId
        || !nrlOffseasonOpportunities(state).some(job => job.clubId === action.destinationId)) return state;
      return { ...state, offseasonApplication: action.destinationId };
    }
    case 'applyForSummerJob': {
      const { season } = state;
      if (state.summerApplication || action.year !== season.year || action.clubId !== season.clubId || action.round !== season.round
        || !nrlProjectedSummerOpenings(state).some(job => job.clubId === action.destinationId)) return state;
      return { ...state, summerApplication: { clubId: action.destinationId, round: action.round } };
    }
    case 'acceptOffseasonJob': {
      const { year, clubId } = state.season;
      if (action.year !== year || action.clubId !== clubId) return state;
      const job = nrlOffseasonApplication(state) ?? nrlSummerApplication(state);
      return job?.response === 'offered' && action.destinationId === job.clubId
        ? rolloverCareer(state, { fromYear: year, clubId: job.clubId }, { clubId: job.clubId, reason: job.reason })
        : state;
    }
    case 'startNextSeason':
      return rolloverCareer(state, action.move);
    case 'upgradeMedical': {
      const { nextLevel, reason } = nrlMedicalUpgradeQuote(state);
      if (nextLevel === null || action.level !== nextLevel || reason !== null) return state;
      return { ...state, finance: addMedicalUpgrade(state.finance, { level: nextLevel, round: state.season.round }) };
    }
    case 'upgradeAcademy': {
      const { year, clubId, round } = state.season;
      if (action.year !== year || action.clubId !== clubId || action.round !== round
        || nrlAcademyFacilityQuote(state).reason !== null) return state;
      return { ...state, finance: { ...state.finance, academyUpgradeRound: round } };
    }
    case 'upgradeConcessions': {
      const { year, clubId, round } = state.season;
      if (action.year !== year || action.clubId !== clubId || action.round !== round || nrlConcessionsQuote(state).reason !== null) return state;
      return { ...state, finance: { ...state.finance, concessionsUpgradeRound: round } };
    }
    case 'hireCoach': {
      const { year, clubId, round } = state.season;
      if (action.year !== year || action.round !== round || !isCoachRole(action.role)
        || (action.role === 'development' && (action.clubId !== clubId || !state.season.kickerId || !canHireDevelopmentAssistant(year, clubId, round)))
        || coachHireRefusal(state, coachTermWages(round, lastRound(year))) !== null) return state;
      return { ...state, finance: { ...state.finance, coachHire: { role: action.role, round, paidRounds: 0 } } };
    }
    case 'setTicketTier': {
      const { year, round } = state.season;
      if (action.year !== year || action.round !== round || nrlTicketPricingRefusal(state) !== null) return state;
      const { ticketTier, ...finance } = state.finance;
      if (activeTicketTier(action.tier) && ticketTier !== action.tier) {
        return { ...state, finance: { ...state.finance, ticketTier: action.tier } };
      }
      return action.tier === 'standard' && ticketTier ? { ...state, finance } : state;
    }
    case 'signSponsor': {
      if (action.year !== state.season.year || action.clubId !== state.season.clubId
        || !isSponsorOffer(action.offer) || nrlSponsorRefusal(state) !== null) return state;
      return { ...state, finance: { ...state.finance, sponsor: { offer: action.offer } } };
    }
    case 'acceptBoardPathways': {
      const { year, clubId } = state.season;
      if (action.year !== year || action.clubId !== clubId || nrlBoardPathwaysQuote(state).reason !== null) return state;
      return { ...state, finance: { ...state.finance, pathways: {} } };
    }
    case 'acceptBoardRecruitment': {
      const { year, clubId } = state.season;
      if (action.year !== year || action.clubId !== clubId) return state;
      const { role, reason } = nrlBoardRecruitmentQuote(state);
      if (reason !== null || role === undefined || role !== action.role) return state;
      return { ...state, finance: { ...state.finance, boardRecruitment: { role } } };
    }
    case 'setDevelopmentFocus': {
      if (state.legacySeason || state.season.year === NRL_LAST_YEAR || action.focus === state.developmentFocus) return state;
      if (activeDevelopmentFocus(action.focus)) return { ...state, developmentFocus: action.focus };
      if (action.focus !== 'balanced' || !state.developmentFocus) return state;
      const { developmentFocus, ...balanced } = state;
      return balanced;
    }
    case 'setShortlist': {
      const { playerId, saved, year } = action;
      const ids = state.shortlist ?? [];
      if (year !== state.season.year || ids.includes(playerId) === saved) return state;
      if (!saved) return withShortlist(state, ids.filter(id => id !== playerId));
      if (ids.length >= NRL_SHORTLIST_LIMIT || !isRecruitmentTarget(state, playerId)) return state;
      return withShortlist(state, [...ids, playerId]);
    }
    case 'startPositionTraining': {
      const { year, clubId, round } = state.season;
      if (action.year !== year || action.clubId !== clubId || action.round !== round) return state;
      const player = nrlPositionTrainingCandidates(state).find(candidate => candidate.id === action.playerId);
      if (!player || !nrlRetrainingRoles(player.role).includes(action.role)) return state;
      return { ...state, positionTraining: { playerId: player.id, role: action.role, startedRound: round } };
    }
    case 'cancelPositionTraining': {
      const { positionTraining, ...next } = state;
      return positionTraining && state.season.phase === 'regular' && action.year === state.season.year && action.clubId === state.season.clubId
        && action.playerId === positionTraining.playerId && action.role === positionTraining.role
        && action.startedRound === positionTraining.startedRound ? next : state;
    }
    case 'startReserveGrade':
    case 'recallReserveGrade': {
      const { season } = state;
      const { year, clubId, round, reserveGrade } = season;
      if (action.year !== year || action.clubId !== clubId || action.round !== round) return state;
      if (action.type === 'startReserveGrade') {
        const player = nrlReserveGradeCandidates(state).find(candidate => candidate.id === action.playerId);
        if (!player) return state;
        const next = { ...season, reserveGrade: { playerId: player.id, startedRound: round, startingRating: player.rating } };
        return { ...state, season: season.individualRecoveryId === player.id ? repairMatchday(next) : next };
      }
      if (!reserveGrade || reserveGrade.playerId !== action.playerId || !nrlReserveGradeRemaining(season)) return state;
      return { ...state, season: repairMatchday({ ...season, reserveGrade: { ...reserveGrade, recalledRound: round } }) };
    }
    case 'saveLineup': {
      const { season } = state;
      if (state.legacySeason || action.year !== season.year || action.clubId !== season.clubId) return state;
      const savedLineup = nrlMatchdaySelection(season);
      return savedLineup && JSON.stringify(savedLineup) !== JSON.stringify(state.savedLineup) ? { ...state, savedLineup } : state;
    }
    case 'applySavedLineup': {
      if (state.legacySeason || !state.savedLineup) return state;
      const preview = nrlSavedLineupPreview(state.season, state.savedLineup);
      return preview?.changed && preview.key === action.previewKey ? { ...state, season: preview.next } : state;
    }
    case 'arrangeTakeover': {
      const { year, clubId } = state.season;
      if (action.year !== year || action.clubId !== clubId) return state;
      const futureContract = nrlTakeoverOffers(state, action.playerId).find(offer => offer.clubId === action.destinationId);
      if (!futureContract) return state;
      return applyTakeover(state, action.playerId, futureContract);
    }
    case 'inviteContractApproach': {
      const { year, clubId, round } = state.season;
      if (action.year !== year || action.clubId !== clubId || action.round !== round || action.permission !== true) return state;
      const player = nrlContractApproachCandidates(state).find(candidate => candidate.id === action.playerId);
      return player ? { ...state, contractApproach: { playerId: player.id, listedRound: round, endYear: player.contract!.endYear } } : state;
    }
    case 'answerContractApproach': {
      const { year, clubId } = state.season;
      const reply = nrlContractApproach(state);
      if (action.year !== year || action.clubId !== clubId || !reply || reply.status !== 'offered'
        || action.playerId !== reply.playerId || action.listedRound !== reply.listedRound || action.destinationId !== reply.destinationId) return state;
      if (action.decision === 'decline') return { ...state, contractApproach: { ...state.contractApproach!, outcome: 'declined' } };
      if (action.decision !== 'accept' || !reply.contract) return state;
      return { ...applyTakeover(state, reply.playerId, reply.contract), contractApproach: { ...state.contractApproach!, outcome: 'accepted' } };
    }
    case 'agreeMutualRelease': {
      const { year, clubId } = state.season;
      if (action.year !== year || action.clubId !== clubId || !nrlMutualReleaseQuote(state, action.playerId).ok) return state;
      const player = state.players.find(candidate => candidate.id === action.playerId)!;
      const mutualRelease = { playerId: player.id, playerName: player.name, annualSalary: player.contract!.salary };
      const finance = { ...state.finance, mutualRelease };
      return { ...state, finance,
        players: state.players.map(candidate => candidate === player
          ? { ...player, contract: { ...player.contract!, endYear: year } } : candidate),
        history: state.history.map(row => row.year === year ? { ...row, finance: nrlCareerFinance({ finance }) } : row),
      };
    }
    case 'offerContract':
    case 'acceptCounteroffer': {
      const quote = action.type === 'offerContract'
        ? nrlContractOffer(state, action.playerId, action.salary, action.years)
        : nrlContractCounteroffer(state, action.playerId, action.offeredSalary);
      if (!quote.ok) return state;
      if (action.type === 'acceptCounteroffer' && (action.year !== state.season.year
        || action.contract.clubId !== quote.contract.clubId || action.contract.startYear !== quote.contract.startYear
        || action.contract.endYear !== quote.contract.endYear || action.contract.salary !== quote.contract.salary)) return state;
      const players = state.players.map(player =>
        player.id === action.playerId ? { ...player, futureContract: quote.contract } : player);
      const objective = state.finance.boardRecruitment;
      const { year, clubId, phase, round } = state.season;
      const player = objective && !objective.signed && phase === 'regular' && quote.contract.startYear === year + 1
        ? state.players.find(candidate => candidate.id === action.playerId && candidate.role === objective.role
          && candidate.contract?.clubId !== clubId && !candidate.id.startsWith(academyPrefix(state.season))) : undefined;
      const finance = player && objective ? {
        ...state.finance, boardRecruitment: { ...objective, signed: { id: player.id, name: player.name, round, salary: quote.contract.salary } },
      } : state.finance;
      const next = { ...state, players, finance };
      return state.shortlist?.includes(action.playerId)
        ? withShortlist(next, state.shortlist.filter(id => id !== action.playerId))
        : next;
    }
    case 'scoutAcademy':
      return scoutAcademy(state, action.role);
    case 'promoteAcademy': {
      const quote = nrlAcademyOffer(state, action.playerId);
      if (!quote.ok) return state;
      const report = state.academy!.find(candidate => candidate.player.id === action.playerId)!;
      return { ...state, players: [...state.players, { ...report.player, futureContract: quote.contract }] };
    }
    case 'advance':
    case 'finishLive':
    case 'finishMinute60':
      return advanceCareer(state, action);
    default: {
      if (action.type === 'startLive' && judiciaryNeedsResponse(state.season)) return state;
      const match = (action.type === 'startLive' || action.type === 'reachMinute60') && state.season.kickerId ? careerMatchday(state) : null;
      const season = reduceNrlSeason(state.season, action, match?.opponentStrength, {
        ...nrlCoachTactics(state.finance), planRivalRatings: match?.planRatings,
      });
      return season === state.season ? state : { ...state, season };
    }
  }
}

function validContract(value: unknown): value is NrlContract {
  if (!record(value) || typeof value.clubId !== 'string' || !intIn(value.startYear, 2026, NRL_LAST_YEAR)
    || !intIn(value.endYear, value.startYear, Math.min(NRL_LAST_YEAR, value.startYear + MAX_CONTRACT_YEARS - 1))) return false;
  const { minimumSalary, cap } = nrlSeasonPlan(value.endYear);
  return intIn(value.salary, minimumSalary, cap) && nrlSeasonPlan(value.startYear).clubs.some(club => club.id === value.clubId);
}

function validPlayer(value: unknown, year: number): value is NrlCareerPlayer {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !value.name
    || !NRL_ROLES.includes(value.role as NrlRole) || !intIn(value.rating, 40, 98)
    || !intIn(value.fitness, 0, 100) || !intIn(value.age, 18, 50) || !intIn(value.potential, value.rating, 98)
    || (value.secondaryRole !== undefined && !nrlRetrainingRoles(value.role as NrlRole).includes(value.secondaryRole as NrlRole))) return false;
  const { contract, futureContract } = value;
  if (contract !== null && (!validContract(contract) || contract.startYear > year || contract.endYear < year)) return false;
  if (futureContract === null) return true;
  if (!validContract(futureContract) || futureContract.startYear <= year || futureContract.startYear > year + MAX_CONTRACT_YEARS) return false;
  return contract === null ? futureContract.startYear === year + 1
    : validContract(contract) && futureContract.startYear === contract.endYear + 1;
}

function validMedicalUpgrades(value: unknown, fromRound: number, roundLimit: number): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) return false;
  let previousRound = fromRound;
  for (const purchase of value) {
    if (!record(purchase) || (purchase.level !== 2 && purchase.level !== 3)
      || !intIn(purchase.round, previousRound, roundLimit)) return false;
    previousRound = purchase.round;
  }
  return true;
}

function validBook(value: unknown, roundLimit: number): value is NrlCareerBook {
  return record(value) && intIn(value.fromRound, 1, roundLimit)
    && intIn(value.openingCash, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    && [value.centralFunding, value.gateReceipts, value.wagesPaid, value.operatingCosts]
      .every(amount => intIn(amount, 0, Number.MAX_SAFE_INTEGER))
    && validMedicalUpgrades(value.medicalUpgrades, value.fromRound, roundLimit)
    && (value.mutualRelease === undefined || (record(value.mutualRelease) && Object.keys(value.mutualRelease).length === 3
      && typeof value.mutualRelease.playerId === 'string' && Boolean(value.mutualRelease.playerId)
      && typeof value.mutualRelease.playerName === 'string' && Boolean(value.mutualRelease.playerName)
      && intIn(value.mutualRelease.annualSalary, 1, Number.MAX_SAFE_INTEGER)))
    && (value.academyUpgradeRound === undefined || (value.fromRound === 1 && intIn(value.academyUpgradeRound, 1, roundLimit)))
    && (value.concessionsUpgradeRound === undefined || (value.fromRound === 1 && intIn(value.concessionsUpgradeRound, 1, roundLimit)))
    && (value.concessionReceipts === undefined || (value.fromRound === 1
      && intIn(value.concessionReceipts, CONCESSIONS_HOME_INCOME, (roundLimit - 1) * CONCESSIONS_HOME_INCOME)
      && value.concessionReceipts % CONCESSIONS_HOME_INCOME === 0))
    && (value.coachCourseRound === undefined || (value.fromRound === 1 && intIn(value.coachCourseRound, 1, roundLimit)))
    && (value.pathways === undefined || (value.fromRound === 1 && record(value.pathways)
      && Object.keys(value.pathways).length === (value.pathways.earnedBy === undefined ? 0 : 1)
      && (value.pathways.earnedBy === undefined || (Array.isArray(value.pathways.earnedBy)
        && value.pathways.earnedBy.length === NRL_BOARD_PATHWAYS.players
        && value.pathways.earnedBy.every((id, index, ids) => typeof id === 'string' && Boolean(id) && (!index || ids[index - 1] < id))))))
    && (value.boardRecruitment === undefined || (value.fromRound === 1 && validBoardRecruitment(value.boardRecruitment, roundLimit)))
    && (value.ticketTier === undefined || (value.fromRound === 1 && activeTicketTier(value.ticketTier)))
    && (value.sponsor === undefined || (value.fromRound === 1 && record(value.sponsor)
      && isSponsorOffer(value.sponsor.offer)
      && Object.keys(value.sponsor).length === (value.sponsor.bonusPaid === undefined ? 1 : 2)
      && (value.sponsor.bonusPaid === undefined || (value.sponsor.offer === 'finals' && value.sponsor.bonusPaid === true))))
    && (value.coachHire === undefined || (record(value.coachHire) && isCoachRole(value.coachHire.role)
      && intIn(value.coachHire.round, value.fromRound, roundLimit)
      && (value.coachHire.retained === undefined || (value.coachHire.retained === true && value.coachHire.round === 1))
      && (value.coachHire.qualified === undefined || (value.coachHire.qualified === true && value.coachHire.retained === true
        && value.coachHire.role !== 'development'))
      && intIn(value.coachHire.paidRounds, 0, roundLimit - value.coachHire.round + 1)));
}

function validBoardRecruitment(value: unknown, roundLimit: number): value is NrlBoardRecruitment {
  if (!record(value) || !NRL_ROLES.includes(value.role as NrlRole)
    || Object.keys(value).length !== 1 + Number(value.signed !== undefined) + Number(value.paid !== undefined)
    || (value.paid !== undefined && (value.paid !== true || value.signed === undefined))) return false;
  const { signed } = value;
  return signed === undefined || (record(signed) && Object.keys(signed).length === 4
    && typeof signed.id === 'string' && Boolean(signed.id) && typeof signed.name === 'string' && Boolean(signed.name)
    && intIn(signed.round, 1, roundLimit) && intIn(signed.salary, 1, Number.MAX_SAFE_INTEGER));
}

function validReceipt(value: unknown, year: number): value is NrlCareerHistoryRow {
  if (!record(value) || value.year !== year) return false;
  const { clubs } = nrlSeasonPlan(year);
  if (typeof value.clubId !== 'string' || !clubs.some(club => club.id === value.clubId)
    || !intIn(value.rank, 1, clubs.length) || !clubs.some(club => club.id === value.championId)
    || !intIn(value.wins, 0, 24) || !intIn(value.draws, 0, 24) || !intIn(value.losses, 0, 24)
    || value.wins + value.draws + value.losses !== 24
    || (value.scoring !== undefined && !validNrlScoringArchive(value.scoring))) return false;
  const scoring = value.scoring as NrlSeasonScoringTotal[] | undefined;
  const judiciary = value.judiciary;
  if (judiciary !== undefined && (!record(judiciary) || Object.keys(judiciary).length !== 2
    || judiciary.case === undefined || !isNrlJudiciary({ case: judiciary.case })
    || !intIn(judiciary.matchesAfter, 0, 28))) return false;
  if (value.judiciaryCarry !== undefined && (judiciary === undefined || !isNrlJudiciary({ carried: value.judiciaryCarry }))) return false;
  if (value.reserveGrade !== undefined) {
    const spell = value.reserveGrade;
    if (!record(spell) || Object.keys(spell).length !== 4 || typeof spell.playerId !== 'string' || typeof spell.playerName !== 'string'
      || !intIn(spell.rounds, 0, NRL_RESERVE_GRADE_ROUNDS) || spell.ratingGain !== Number(spell.rounds === NRL_RESERVE_GRADE_ROUNDS)) return false;
  }
  if (value.development !== undefined && (!record(value.development) || !activeDevelopmentFocus(value.development.focus)
    || !intIn(value.development.affected, 0, SQUAD_SIZE))) return false;
  if (value.appointment !== undefined) {
    const job = value.appointment;
    if (!record(job) || Object.keys(job).length !== 2 || value.finance === null || value.scoring === undefined
      || year === NRL_LAST_YEAR || !nrlSeasonPlan(year + 1).clubs.some(club => club.id === job.clubId)
      || job.clubId === value.clubId || job.reason !== (clubs.some(club => club.id === job.clubId) ? 'missed' : 'expansion')) return false;
  }
  if (value.summerApplication !== undefined) {
    const application = value.summerApplication;
    if (!validSummerApplication(application, year, value.clubId) || Object.keys(application).length !== 3
      || value.finance === null || value.scoring === undefined
      || !['offered', 'declined', 'vacancy-closed'].includes((application as NrlSummerApplicationReceipt).response)) return false;
  }
  if (value.leagueRecruitment !== undefined) {
    const deals = value.leagueRecruitment;
    if (year + 2 > NRL_LAST_YEAR || !Array.isArray(deals) || value.finance === null || value.scoring === undefined) return false;
    const next = nrlSeasonPlan(year + 1);
    if (deals.length >= next.clubs.length || new Set(deals.map(deal => deal?.clubId)).size !== deals.length
      || new Set(deals.map(deal => deal?.playerId)).size !== deals.length
      || !deals.every(deal => record(deal) && Object.keys(deal).length === 4
        && typeof deal.playerId === 'string' && Boolean(deal.playerId) && typeof deal.playerName === 'string' && Boolean(deal.playerName)
        && deal.clubId !== value.clubId && next.clubs.some(club => club.id === deal.clubId)
        && intIn(deal.annualSalary, next.minimumSalary, next.cap))) return false;
  }
  if (value.finals !== undefined) {
    const finals = nrlArchivedFinals(value.finals, year);
    if (!finals || finals.championId !== value.championId
      || finals.seeds.findIndex(id => id === value.clubId) !== (value.rank <= NRL_FINALS_SPOTS ? value.rank - 1 : -1)) return false;
    if (value.playerSeasons !== undefined) {
      const matches = finals.matches.filter(match => match.homeId === value.clubId || match.awayId === value.clubId);
      const points = matches.reduce((sum, match) => sum + (match.homeId === value.clubId ? match.homeScore : match.awayScore), 0);
      if (!scoring || !validNrlPlayerSeasonArchive(value.playerSeasons, scoring, matches.length, points)) return false;
    }
  } else if (value.playerSeasons !== undefined) {
    return false;
  }
  if (value.finance === null) return value.coachDevelopment === undefined;
  if (!record(value.finance) || !validBook(value.finance, lastRound(year))) return false;
  const finance = nrlCareerFinance({ finance: value.finance });
  if (!validCoachCourse(finance, year, lastRound(year)) || (finance.coachCourseRound !== undefined && value.scoring === undefined)) return false;
  if (finance.coachHire?.role === 'development'
    && (value.scoring === undefined || !canHireDevelopmentAssistant(year, value.clubId, finance.coachHire.round))) return false;
  if (value.coachDevelopment !== undefined) {
    const ids = value.coachDevelopment;
    const seasons = value.playerSeasons as NrlSeasonPlayerArchive | undefined;
    if (finance.coachHire?.role !== 'development' || !seasons || !Array.isArray(ids)
      || (record(value.development) && value.development.focus === 'youth' && ids.length !== 0)
      || ids.length > NRL_DEVELOPMENT_ASSISTANT.players || new Set(ids).size !== ids.length
      || ids.some(id => typeof id !== 'string' || !seasons.some(row => row[0] === id
        && row[3] + row[4] >= NRL_DEVELOPMENT_ASSISTANT.appearances))) return false;
  }
  if (finance.academyUpgradeRound !== undefined && (year === NRL_LAST_YEAR || value.scoring === undefined)) return false;
  if (finance.mutualRelease && (year === NRL_LAST_YEAR || value.scoring === undefined || finance.cash < 0
    || !intIn(finance.mutualRelease.annualSalary, nrlSeasonPlan(year + 1).minimumSalary, nrlSeasonPlan(year + 1).cap))) return false;
  if (finance.pathways && value.scoring === undefined) return false;
  if (finance.boardRecruitment) {
    const { signed, paid } = finance.boardRecruitment;
    if (year === NRL_LAST_YEAR || value.scoring === undefined || Boolean(paid) !== Boolean(signed)) return false;
    const nextPlan = nrlSeasonPlan(year + 1);
    if (signed && (signed.round > nrlRegularRounds(year) || !intIn(signed.salary, nextPlan.minimumSalary, nextPlan.cap)
      || signed.id.startsWith(academyPrefix({ clubId: value.clubId, year }))
      || (value.playerSeasons as NrlSeasonPlayerArchive | undefined)?.some(row => row[0] === signed.id))) return false;
  }
  if (finance.pathways && value.finals !== undefined) {
    const playerSeasons = value.playerSeasons as NrlSeasonPlayerArchive | undefined;
    if (!playerSeasons || finance.pathways.earnedBy?.some(id => !playerSeasons.some(row =>
      row[0] === id && row[3] + row[4] >= NRL_BOARD_PATHWAYS.appearances))) return false;
  }
  if (finance.coachHire && (finance.fromRound !== 1 || finance.coachHire.paidRounds !== lastRound(year) - finance.coachHire.round + 1)) return false;
  if (value.coachRetained !== undefined && (value.coachRetained !== true || year >= NRL_LAST_YEAR
    || !finance.coachHire || finance.coachHire.retained || finance.cash < coachTermWages(1, lastRound(year + 1)))) return false;
  if (finance.sponsor?.offer === 'finals' && Boolean(finance.sponsor.bonusPaid) !== (value.rank <= NRL_FINALS_SPOTS)) return false;
  return value.finance.cash === finance.cash && value.finance.profit === finance.profit;
}

function booksMatch(a: NrlCareerBook, b: NrlCareerBook): boolean {
  const first = a.medicalUpgrades ?? [];
  const second = b.medicalUpgrades ?? [];
  return a.fromRound === b.fromRound && a.openingCash === b.openingCash
    && a.centralFunding === b.centralFunding && a.gateReceipts === b.gateReceipts
    && a.wagesPaid === b.wagesPaid && a.operatingCosts === b.operatingCosts
    && a.academyUpgradeRound === b.academyUpgradeRound
    && a.concessionsUpgradeRound === b.concessionsUpgradeRound && a.concessionReceipts === b.concessionReceipts
    && a.coachHire?.role === b.coachHire?.role && a.coachHire?.round === b.coachHire?.round
    && a.coachHire?.paidRounds === b.coachHire?.paidRounds && a.coachHire?.retained === b.coachHire?.retained
    && a.coachHire?.qualified === b.coachHire?.qualified && a.coachCourseRound === b.coachCourseRound
    && a.mutualRelease?.playerId === b.mutualRelease?.playerId && a.mutualRelease?.playerName === b.mutualRelease?.playerName
    && a.mutualRelease?.annualSalary === b.mutualRelease?.annualSalary
    && a.ticketTier === b.ticketTier
    && a.sponsor?.offer === b.sponsor?.offer && a.sponsor?.bonusPaid === b.sponsor?.bonusPaid
    && JSON.stringify(a.pathways) === JSON.stringify(b.pathways)
    && a.boardRecruitment?.role === b.boardRecruitment?.role && a.boardRecruitment?.paid === b.boardRecruitment?.paid
    && a.boardRecruitment?.signed?.id === b.boardRecruitment?.signed?.id
    && a.boardRecruitment?.signed?.name === b.boardRecruitment?.signed?.name
    && a.boardRecruitment?.signed?.round === b.boardRecruitment?.signed?.round
    && a.boardRecruitment?.signed?.salary === b.boardRecruitment?.signed?.salary
    && first.length === second.length && first.every((purchase, index) =>
      purchase.round === second[index].round && purchase.level === second[index].level);
}

function validCoachCourse(book: NrlCareerBook, year: number, through: number): boolean {
  const { coachCourseRound, coachHire } = book;
  return coachCourseRound === undefined || (year < NRL_LAST_YEAR && Boolean(coachHire && !coachHire.retained
    && coachHire.role !== 'development' && coachCourseRound >= coachHire.round && coachCourseRound <= through
    && coachCourseRound + COACH_COURSE_ROUNDS - 1 <= nrlRegularRounds(year)));
}

function validWorld(state: NrlCareerState): boolean {
  const { year, clubId, squad } = state.season;
  if (new Set(state.players.map(player => player.id)).size !== state.players.length) return false;
  if (new Set(state.players.map(player => player.name)).size !== state.players.length) return false;
  const named = state.players.filter(player => isNrlNamedPlayer(player.id));
  if (!state.openingRoster && named.length > 0) return false;
  const activeClubs = new Set(nrlSeasonPlan(year).clubs.map(club => club.id));
  if (state.openingRoster === 'matchday-2026' && (named.some(player => player.id.startsWith('nrl-real-perth-'))
    || year === 2026 && (named.length !== activeClubs.size * (NRL_ROLES.length + NRL_BENCH_SIZE)
      || [...activeClubs].some(id => named.filter(player => player.contract?.clubId === id).length !== NRL_ROLES.length + NRL_BENCH_SIZE)))) return false;
  if (state.openingRoster === 'perth-signings-2027' && (named.length > PERTH_SIGNINGS_COUNT
    || year === 2027 && (clubId !== 'bears' || named.length !== PERTH_SIGNINGS_COUNT
      || named.some(player => player.contract?.clubId !== 'bears')))) return false;
  if (state.players.some(player => player.futureContract && !activeClubs.has(player.futureContract.clubId))) return false;
  const own = new Map(squadAt(state.players, clubId, year).map(player => [player.id, player]));
  if (squad.length !== SQUAD_SIZE || !squad.every(player => {
    const stored = own.get(player.id);
    return stored && player.role === stored.role && player.name === stored.name
      && player.rating === stored.rating && player.fitness === stored.fitness && player.secondaryRole === stored.secondaryRole;
  })) return false;

  const lastContractYear = state.players.reduce((latest, player) =>
    Math.max(latest, player.futureContract?.endYear ?? player.contract?.endYear ?? year), year);
  for (let contractYear = year; contractYear <= lastContractYear; contractYear++) {
    for (const club of nrlSeasonPlan(contractYear).clubs) {
      const cap = capFor(state.players, club.id, contractYear);
      if (cap.slots > SQUAD_SIZE || cap.available < 0 || (contractYear === year && cap.slots !== SQUAD_SIZE)
        || missingRoles(squadAt(state.players, club.id, contractYear)).length > cap.openSlots) return false;
    }
  }
  return true;
}

function validCareerBooks(state: NrlCareerState): boolean {
  const { season, history, finance, legacySeason, openingYear } = state;
  const complete = season.phase === 'complete';
  const played = complete ? season.round : season.round - 1;
  const finalRound = lastRound(season.year);
  if (finance.fromRound > played + 1 || (finance.fromRound !== 1 && !legacySeason)
    || (legacySeason && (finance.ticketTier !== undefined || finance.sponsor !== undefined
      || finance.concessionsUpgradeRound !== undefined || finance.concessionReceipts !== undefined || finance.boardRecruitment !== undefined))) return false;
  const coach = finance.coachHire;
  const release = finance.mutualRelease;
  if (!validCoachCourse(finance, season.year, season.round)
    || (finance.coachCourseRound !== undefined && (legacySeason || !season.kickerId))) return false;
  if (release) {
    const player = state.players.find(candidate => candidate.id === release.playerId);
    if (legacySeason || !complete || !season.kickerId || season.year === NRL_LAST_YEAR || !player
      || player.name !== release.playerName || player.contract?.clubId !== season.clubId || player.contract.endYear !== season.year
      || player.contract.salary !== release.annualSalary || player.futureContract || player.age + 1 >= RETIREMENT_AGE
      || !nrlCareerSquad(state, season.year + 1).some(teammate => teammate.role === player.role)) return false;
  }
  if (coach) {
    if (legacySeason) return false;
    if (coach.role === 'development' && (!season.kickerId || !canHireDevelopmentAssistant(season.year, season.clubId, coach.round))) return false;
    if (coach.round > nrlRegularRounds(season.year) && nrlNextRound({
      ...season, round: coach.round, phase: 'finals', results: season.results.filter(match => match.round < coach.round),
    }).clubStatus === 'eliminated') return false;
  }
  if (history.length !== season.year - openingYear + Number(complete)) return false;
  const firstBook = { cash: OPENING_CASH, medicalLevel: 1, academyInstalled: false, concessionsInstalled: false };
  const clubs = new Map<string, typeof firstBook>();
  for (const [index, receipt] of history.entries()) {
    const year = openingYear + index;
    if (!validReceipt(receipt, year) || (receipt.finance === null && index !== 0)) return false;
    const previous = clubs.get(receipt.clubId) ?? firstBook;
    if (receipt.finance && receipt.finance.openingCash !== previous.cash) return false;
    if (receipt.coachRetained) {
      const incoming = history[index + 1];
      const nextClub = incoming?.clubId ?? season.clubId;
      const nextCoach = incoming ? incoming.finance?.coachHire : coach;
      if (year === season.year || nextClub !== receipt.clubId || !nextCoach?.retained
        || nextCoach.role !== receipt.finance?.coachHire?.role
        || Boolean(nextCoach.qualified) !== (receipt.finance?.coachCourseRound !== undefined)) return false;
    }
    if (receipt.judiciary) {
      const { case: review, matchesAfter } = receipt.judiciary;
      const finals = receipt.finals && nrlArchivedFinals(receipt.finals, year);
      const rounds = nrlSeasonPlan(year).draw.flatMap((fixtures, index) => fixtures.some(pair => pair.includes(receipt.clubId)) ? [index + 1] : []);
      for (const match of finals?.matches ?? []) {
        if (match.homeId === receipt.clubId || match.awayId === receipt.clubId) rounds.push(match.round);
      }
      if (!season.judiciary || year === season.year || !review.decision || !rounds.includes(review.round)
        || !intIn(review.decidedRound, Math.min(review.round + 1, lastRound(year)),
          rounds.find(round => round > review.round) ?? lastRound(year))
        || (review.settledAfterMatch && review.decidedRound !== lastRound(year))
        || matchesAfter !== rounds.filter(round => round > review.round).length
        || !receipt.playerSeasons?.some(row => row[0] === review.playerId && row[3] + row[4] + row[5] + row[6] > 0)) return false;
      const carry = receipt.judiciaryCarry;
      const incoming = history[index + 1]?.clubId ?? season.clubId;
      if (carry && (incoming !== receipt.clubId || carry.playerId !== review.playerId
        || carry.matches !== nrlJudiciaryPenalty({ ...season, year, clubId: receipt.clubId }, review) - matchesAfter)) return false;
    }
    if (receipt.finance?.coachHire?.retained && !history[index - 1]?.coachRetained) return false;
    if (receipt.leagueRecruitment) {
      const incoming = history[index + 1]?.clubId ?? season.clubId;
      if (year === season.year || receipt.leagueRecruitment.some(deal => deal.clubId === incoming)) return false;
      if (year === season.year - 1 && receipt.leagueRecruitment.some(deal => {
        const player = state.players.find(candidate => candidate.id === deal.playerId);
        const contract = player?.contract;
        return !player || player.name !== deal.playerName || contract?.clubId !== deal.clubId
          || contract.startYear !== season.year || contract.endYear !== season.year + 1 || contract.salary !== deal.annualSalary;
      })) return false;
    }
    if (receipt.appointment || receipt.summerApplication) {
      const previousPlace = history[index - 1]?.clubId === receipt.clubId ? history[index - 1].rank : undefined;
      const target = nrlBoardBenchmark(year, receipt.clubId, previousPlace);
      const met = receipt.championId === receipt.clubId || Boolean(target && receipt.rank <= target.targetRank);
      const application = receipt.summerApplication;
      if (application) {
        const expansion = !nrlSeasonPlan(year).clubs.some(club => club.id === application.clubId);
        if ((expansion && application.response !== 'offered')
          || (!expansion && application.response !== 'vacancy-closed' && (application.response === 'offered') !== met)) return false;
        if (year === season.year && (!wasSummerOpening(state, application)
          || settleSummerApplication(state, application).response !== application.response)) return false;
      }
      if (receipt.appointment) {
        const nextClubId = history[index + 1]?.clubId ?? season.clubId;
        if (year === season.year || receipt.appointment.clubId !== nextClubId
          || (receipt.appointment.reason === 'missed' && !met)
          || (application && (application.clubId !== nextClubId || application.response !== 'offered'))) return false;
      }
    }
    const academyPurchased = receipt.finance?.academyUpgradeRound !== undefined;
    if (academyPurchased && previous.academyInstalled) return false;
    const concessionRound = receipt.finance?.concessionsUpgradeRound;
    if (concessionRound !== undefined && (previous.concessionsInstalled || concessionRound > nrlRegularRounds(year)
      || receipt.scoring === undefined)) return false;
    if (year === season.year) {
      const expected = seasonReceipt(state);
      if (receipt.clubId !== expected.clubId || receipt.rank !== expected.rank || receipt.wins !== expected.wins
        || receipt.draws !== expected.draws || receipt.losses !== expected.losses || receipt.championId !== expected.championId
        || receipt.development !== undefined || receipt.coachDevelopment !== undefined || receipt.finals !== undefined || receipt.playerSeasons !== undefined
        || JSON.stringify(receipt.scoring) !== JSON.stringify(expected.scoring)
        || JSON.stringify(receipt.reserveGrade) !== JSON.stringify(expected.reserveGrade)
        || (receipt.finance === null) !== (expected.finance === null)
        || (receipt.finance && expected.finance && !booksMatch(receipt.finance, expected.finance))) return false;
    } else if (receipt.finance) {
      const recruitment = receipt.finance.boardRecruitment;
      if (recruitment?.signed && year + 1 === season.year) {
        const signed = recruitment.signed;
        const player = state.players.find(candidate => candidate.id === signed.id);
        if (!player?.contract || player.name !== signed.name || player.role !== recruitment.role || player.contract.salary !== signed.salary
          || player.contract.clubId !== receipt.clubId || player.contract.startYear !== season.year) return false;
      }
      const activeAfter = previous.concessionsInstalled ? 0 : concessionRound;
      if (activeAfter !== undefined) {
        const finals = receipt.finals && nrlArchivedFinals(receipt.finals, year);
        if (!finals) return false;
        const regularMatches = nrlSeasonPlan(year).draw.filter((fixtures, index) =>
          index + 1 > activeAfter && fixtures.some(([home]) => home === receipt.clubId)).length;
        const finalsMatches = finals.matches.filter(match => hasHomeGate(match, receipt.clubId)).length;
        const expectedIncome = (regularMatches + finalsMatches) * CONCESSIONS_HOME_INCOME;
        if (expectedIncome !== (receipt.finance.concessionReceipts ?? 0)) return false;
      } else if (receipt.finance.concessionReceipts !== undefined) return false;
      if (receipt.finance.coachHire?.role === 'development'
        && (!receipt.playerSeasons || receipt.coachDevelopment === undefined)) return false;
      if (receipt.finance.pathways && !receipt.playerSeasons) return false;
      const upgrades = receipt.finance.medicalUpgrades ?? [];
      if (!upgrades.every((purchase, index) => purchase.level === previous.medicalLevel + index + 1)) return false;
      clubs.set(receipt.clubId, { cash: receipt.finance.cash, medicalLevel: upgrades.at(-1)?.level ?? previous.medicalLevel,
        academyInstalled: previous.academyInstalled || academyPurchased,
        concessionsInstalled: activeAfter !== undefined });
    }
  }
  const currentClub = clubs.get(season.clubId) ?? firstBook;
  const previous = history[season.year - openingYear - 1];
  const review = previous?.judiciary?.case;
  const player = review && state.players.find(candidate => candidate.id === review.playerId);
  const carried = season.judiciary?.carried;
  const due = previous?.clubId === season.clubId && review && player?.contract?.clubId === season.clubId
    && player.contract.endYear >= season.year
    ? nrlJudiciaryPenalty({ ...season, year: previous.year }, review) - previous.judiciary!.matchesAfter : 0;
  if (due > 0 ? carried?.playerId !== review?.playerId || carried?.matches !== due : carried !== undefined) return false;
  if (JSON.stringify(carried) !== JSON.stringify(previous?.judiciaryCarry)) return false;
  if (coach?.retained && !history[season.year - openingYear - 1]?.coachRetained) return false;
  let expected = bookFrom(currentClub.cash, finance.fromRound);
  if (finance.ticketTier) expected.ticketTier = finance.ticketTier;
  if (finance.sponsor) expected.sponsor = { offer: finance.sponsor.offer };
  if (finance.pathways) {
    if (legacySeason || !season.kickerId
      || nrlBoardPathwaysEligible(season, state.players).length < NRL_BOARD_PATHWAYS.players) return false;
    expected.pathways = {};
  }
  const recruitment = finance.boardRecruitment;
  if (recruitment) {
    if (!season.kickerId || season.year === NRL_LAST_YEAR) return false;
    const signed = recruitment.signed;
    if (signed) {
      const player = state.players.find(candidate => candidate.id === signed.id);
      if (!player || player.name !== signed.name || player.role !== recruitment.role || player.contract?.clubId === season.clubId
        || signed.id.startsWith(academyPrefix(season)) || player.futureContract?.clubId !== season.clubId
        || player.futureContract.startYear !== season.year + 1 || player.futureContract.salary !== signed.salary
        || signed.round > Math.min(season.round, nrlRegularRounds(season.year))) return false;
    }
    expected.boardRecruitment = { role: recruitment.role, ...(signed && { signed }) };
  }
  const cap = nrlCareerCap(state);
  const purchases = finance.medicalUpgrades ?? [];
  if (finance.academyUpgradeRound !== undefined && (legacySeason || !season.kickerId || currentClub.academyInstalled
    || season.year === NRL_LAST_YEAR)) return false;
  if (finance.concessionsUpgradeRound !== undefined && (!season.kickerId || currentClub.concessionsInstalled
    || finance.concessionsUpgradeRound > nrlRegularRounds(season.year))) return false;
  if ((!season.injuryTracking && purchases.length)
    || !purchases.every((purchase, index) => purchase.level === currentClub.medicalLevel + index + 1)) return false;
  let nextPurchase = 0;
  for (let round = finance.fromRound; round <= played + Number(!complete); round++) {
    // Same-round hires and purchases reserve the same total cash in either order.
    if (coach?.round === round) {
      if (nrlCareerFinance({ finance: expected }).cash < (coach.retained ? 0 : COACH_SIGNING_FEE) + coachTermWages(round, finalRound)) return false;
      expected = { ...expected, coachHire: { role: coach.role, round, paidRounds: 0, ...(coach.retained && { retained: true as const }),
        ...(coach.qualified && { qualified: true as const }) } };
    }
    while (purchases[nextPurchase]?.round === round) {
      const purchase = purchases[nextPurchase++];
      if (facilityPurchaseRefusal(expected, finalRound, MEDICAL_UPGRADE_COST[purchase.level])) return false;
      expected = addMedicalUpgrade(expected, purchase);
    }
    if (finance.academyUpgradeRound === round) {
      if (facilityPurchaseRefusal(expected, finalRound, ACADEMY_UPGRADE_COST)) return false;
      expected = { ...expected, academyUpgradeRound: round };
    }
    if (finance.coachCourseRound === round) {
      if (facilityPurchaseRefusal(expected, finalRound, COACH_COURSE_FEE)) return false;
      expected = { ...expected, coachCourseRound: round };
    }
    if (finance.concessionsUpgradeRound === round) {
      if (facilityPurchaseRefusal(expected, finalRound, CONCESSIONS_UPGRADE_COST)) return false;
      expected = { ...expected, concessionsUpgradeRound: round };
    }
    if (round <= played) {
      expected = tickBooks(expected, season, round, season.results.filter(result => result.round === round), cap, currentClub.concessionsInstalled);
      expected = settlePathways(expected, season, round, state.players);
      expected = settleBoardRecruitment(expected, season.year, round);
    }
  }
  if (release) {
    if (nrlCareerFinance({ finance: expected }).cash < nrlMutualReleaseSpend(finance)) return false;
    expected = { ...expected, mutualRelease: release };
  }
  return nextPurchase === purchases.length && booksMatch(expected, finance);
}

function validAcademy(state: NrlCareerState): boolean {
  const { academy, players, season } = state;
  const prefix = academyPrefix(season);
  if (academy === undefined) return !players.some(player => player.id.startsWith(prefix));
  if (season.year === NRL_LAST_YEAR || !Array.isArray(academy) || academy.length > NRL_ROLES.length) return false;
  const activePlayers = new Map(players.map(player => [player.id, player]));
  const activeNames = new Set(players.map(player => player.name));
  const knownIds = new Set<string>();
  const names = new Set<string>();
  let lastAssignment = 0;
  for (const report of academy) {
    if (!record(report) || !intIn(report.startedRound, lastAssignment + 1, season.round) || !validPlayer(report.player, season.year)) return false;
    const { player } = report;
    if (player.id !== academyId(season, player.role) || knownIds.has(player.id) || names.has(player.name)
      || player.contract || player.futureContract || player.secondaryRole || player.fitness !== 100 || !intIn(player.age, 18, 21)
      || !intIn(player.rating, 49, 66) || !intIn(player.potential,
        player.rating + 8 + (academyFacilitiesActive(state, report.startedRound) ? ACADEMY_UPGRADE_POTENTIAL : 0), 90)) return false;
    lastAssignment = report.startedRound;
    knownIds.add(player.id);
    names.add(player.name);

    const signed = activePlayers.get(player.id);
    if (!signed) {
      if (activeNames.has(player.name)) return false;
      continue;
    }
    const year = season.year + 1;
    const contract = signed.futureContract;
    if (!reportReady(season, report) || signed.name !== player.name || signed.role !== player.role
      || signed.secondaryRole || signed.rating !== player.rating || signed.potential !== player.potential || signed.age !== player.age
      || signed.fitness !== player.fitness || signed.contract || !contract || contract.clubId !== season.clubId
      || contract.startYear !== year || contract.endYear !== year || contract.salary !== nrlSeasonPlan(year).minimumSalary) return false;
  }
  return players.every(player => !player.id.startsWith(prefix) || knownIds.has(player.id));
}

function validShortlist(state: NrlCareerState): boolean {
  const { shortlist } = state;
  return shortlist === undefined || (Array.isArray(shortlist) && shortlist.length > 0 && shortlist.length <= NRL_SHORTLIST_LIMIT
    && new Set(shortlist).size === shortlist.length && shortlist.every(id => typeof id === 'string' && isRecruitmentTarget(state, id)));
}

function validSavedLineup(value: unknown, season: NrlManagerState): boolean {
  if (value === undefined) return true;
  if (!season.kickerId || !record(value) || value.year !== season.year || Object.keys(value).length !== 4) return false;
  const { lineup, bench, kickerId } = value;
  if (!record(lineup) || Object.keys(lineup).length !== NRL_ROLES.length || !Array.isArray(bench) || bench.length !== NRL_BENCH_SIZE) return false;
  const starters = NRL_ROLES.map(role => lineup[role]);
  const selected = [...starters, ...bench];
  const squad = new Set(season.squad.map(player => player.id));
  return starters.includes(kickerId) && new Set(selected).size === selected.length
    && selected.every(id => typeof id === 'string' && squad.has(id));
}

function validPositionTraining(value: unknown, season: NrlManagerState, legacySeason: boolean): boolean {
  if (value === undefined) return true;
  if (legacySeason || !season.injuryTracking || !season.kickerId || season.phase !== 'regular' || !record(value) || Object.keys(value).length !== 3
    || !intIn(value.startedRound, Math.max(1, season.round - NRL_POSITION_TRAINING_ROUNDS + 1),
      Math.min(season.round, nrlRegularRounds(season.year) - NRL_POSITION_TRAINING_ROUNDS + 1))) return false;
  const player = season.squad.find(candidate => candidate.id === value.playerId);
  if (!player || player.secondaryRole || !nrlRetrainingRoles(player.role).includes(value.role as NrlRole)) return false;
  const priorResults = season.results.filter(result => result.round < (value.startedRound as number));
  return !nrlInjuries({ ...season, round: value.startedRound, results: priorResults }).has(player.id)
    && (!season.judiciary || !nrlJudiciaryBannedBefore(season, player.id, value.startedRound));
}

function validContractApproach(state: NrlCareerState): boolean {
  const value = state.contractApproach;
  if (value === undefined) return true;
  const { season: { year, clubId, round }, legacySeason, retired } = state;
  if (legacySeason || retired || year === NRL_LAST_YEAR || !record(value)
    || Object.keys(value).length !== 3 + Number(value.destinationId !== undefined) + Number(value.outcome !== undefined)
    || typeof value.playerId !== 'string'
    || !intIn(value.listedRound, 1, Math.min(round, nrlContractApproachLastRound(year)))
    || !intIn(value.endYear, year + 1, Math.min(NRL_LAST_YEAR, year + MAX_CONTRACT_YEARS - 1))) return false;
  const player = state.players.find(candidate => candidate.id === value.playerId);
  if (player?.contract?.clubId !== clubId) return false;
  if (value.destinationId !== undefined && (round <= value.listedRound || value.destinationId === clubId
    || !nrlSeasonPlan(year).clubs.some(club => club.id === value.destinationId))) return false;
  if (value.outcome !== undefined && (!value.destinationId || (value.outcome !== 'accepted' && value.outcome !== 'declined'))) return false;
  const { contract, futureContract } = player;
  if (value.outcome === 'accepted') return contract.endYear === year && futureContract?.clubId === value.destinationId
    && futureContract.startYear === year + 1 && futureContract.endYear === value.endYear && futureContract.salary === contract.salary;
  return contract.endYear === value.endYear || (contract.endYear === year
    && ((futureContract?.startYear === year + 1 && futureContract.endYear === value.endYear && futureContract.salary === contract.salary)
      || (value.endYear === year + 1 && state.finance.mutualRelease?.playerId === player.id)));
}

export function isNrlCareerState(value: unknown): value is NrlCareerState {
  if (!record(value) || value.version !== 2 || !isNrlOpeningYear(value.openingYear)
    || !isNrlSeasonProgress(value.season) || value.season.year < value.openingYear
    || typeof value.legacySeason !== 'boolean'
    || (value.openingRoster !== undefined && (value.legacySeason || value.openingRoster !== (value.openingYear === 2026 ? 'matchday-2026' : 'perth-signings-2027')))
    || (value.retired !== undefined && (value.retired !== true || value.season.phase !== 'complete'))
    || (value.boardChallenge !== undefined && (value.boardChallenge !== true || value.legacySeason))
    || (value.developmentFocus !== undefined && (!activeDevelopmentFocus(value.developmentFocus)
      || value.legacySeason || value.season.year === NRL_LAST_YEAR))
    || (value.legacySeason && (value.season.year !== value.openingYear || value.season.kickerId || value.season.injuryTracking || value.season.results.some(match => match.benchUsed !== undefined)))
    || !validSavedLineup(value.savedLineup, value.season)
    || !validPositionTraining(value.positionTraining, value.season, value.legacySeason)
    || !Array.isArray(value.players) || value.players.length > 650
    || !Array.isArray(value.history) || !validBook(value.finance, value.season.round + 1)) return false;
  const { year } = value.season;
  if (!value.players.every(player => validPlayer(player, year) && (!value.legacySeason || !player.secondaryRole))) return false;
  const state = value as unknown as NrlCareerState;
  if (state.season.judiciary && (state.openingRoster || state.legacySeason || (state.retired && judiciaryNeedsResponse(state.season)))) return false;
  if (state.coachRetention !== undefined && (state.coachRetention !== true || nrlCoachRetentionQuote(state).reason !== null)) return false;
  if (state.leagueRecruitment !== undefined && (state.leagueRecruitment !== true || !leagueRecruitmentAvailable(state))) return false;
  if (state.origin !== undefined && (!isNrlOriginSeries(state.origin, state.season.seed)
    || state.origin.year < state.openingYear || state.origin.year > year
    || (!state.openingRoster && Object.values(state.origin.pools).some(pool => pool.some(player => isNrlNamedPlayer(player.id)))))) return false;
  const spell = state.season.reserveGrade;
  if (spell) {
    const player = state.players.find(candidate => candidate.id === spell.playerId);
    if (!player || !intIn(player.age, 18, 23) || spell.startingRating >= player.potential) return false;
    const training = state.positionTraining;
    const spellEnd = spell.recalledRound ?? spell.startedRound + NRL_RESERVE_GRADE_ROUNDS;
    if (training?.playerId === spell.playerId && training.startedRound < spellEnd
      && training.startedRound + NRL_POSITION_TRAINING_ROUNDS > spell.startedRound) return false;
  }
  if (!validWorld(state) || !validCareerBooks(state) || !validAcademy(state) || !validShortlist(state) || !validContractApproach(state)) return false;
  if (state.worldCup !== undefined && (!isNrlWorldCupRun(state.worldCup) || state.openingYear !== 2026 || state.legacySeason
    || state.worldCup.seed !== worldCupAppointmentSeed(state.season.seed)
    || (year === 2026 ? state.season.phase !== 'complete' : !state.history.some(receipt => receipt.year === 2026)))) return false;
  if (state.origin?.nomination) {
    const { year: originYear, nomination } = state.origin;
    if (originYear === year) {
      if (nomination.clubId !== state.season.clubId || !state.season.squad.some(player => player.id === nomination.playerId)) return false;
    } else if (state.history.find(receipt => receipt.year === originYear)?.clubId !== nomination.clubId) return false;
  }
  if (value.summerApplication !== undefined && (state.legacySeason || state.retired || state.season.phase === 'complete'
    || !validSummerApplication(value.summerApplication, year, state.season.clubId) || Object.keys(value.summerApplication).length !== 2
    || value.summerApplication.round > state.season.round || !wasSummerOpening(state, value.summerApplication))) return false;
  if (value.offseasonApplication !== undefined
    && (typeof value.offseasonApplication !== 'string' || nrlSummerApplication(state) || !nrlOffseasonApplication(state))) return false;
  if (!state.season.live && !state.season.attackPlan) return true;
  const { opponentStrength, planRatings } = careerMatchday(state);
  return (!state.season.attackPlan || (state.season.attackPlan === 'counter' ? !state.legacySeason : Boolean(planRatings)))
    && validNrlLiveScore(state.season, opponentStrength, { ...nrlCoachTactics(state.finance), planRivalRatings: planRatings });
}

export function readNrlCareerSave(raw: string | null): NrlCareerState | null {
  if (!raw || raw.length > NRL_SAVE_MAX_CHARS) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (isNrlCareerState(value)) {
      return value.season.bench ? value : { ...value, season: { ...value.season, bench: nrlBench(value.season) } };
    }
    return isNrlManagerState(value) && isNrlOpeningYear(value.year) ? careerFrom(value, value.year, true) : null;
  } catch {
    return null;
  }
}
