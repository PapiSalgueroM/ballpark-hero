import { isNrlOpeningYear, nrlSeasonPlan, NRL_LAST_YEAR, type NrlClub } from '@/data/nrlManagerSeasons';
import { clampi, hashLabel, rngFrom } from '@/lib/careerEngine';
import { uniqueName } from '@/lib/foNames';
import { nrlBoardChallengeStatus } from '@/lib/nrlBoardTarget';
import { archiveNrlScoring, validNrlScoringArchive, type NrlSeasonScoringTotal } from '@/lib/nrlPlayerScoring';
import {
  createNrlSeason, isNrlManagerState, isNrlSeasonProgress, nrlBench, nrlLadder, nrlMatchupEdges, nrlNextRound, nrlRegularRounds,
  NRL_FINALS_SPOTS, NRL_ROLES, reduceNrlSeason, validNrlLiveScore, type NrlAction, type NrlCoachRole, type NrlFixture, type NrlManagerState, type NrlMatchResult,
  type NrlPlayer, type NrlRole, type NrlYear,
} from '@/lib/nrlManager';

const SQUAD_SIZE = 30;
const MAX_CONTRACT_YEARS = 4;
const OPENING_CASH = 2_500_000;
const MARKET_PER_ROLE = 4;
const RETIREMENT_AGE = 36;
const MEDICAL_UPGRADE_COST = { 2: 800_000, 3: 2_600_000 } as const;
const ROUND_OPERATING_COST = 75_000;
const TRAVEL_COST = 45_000;
export const NRL_TICKET_GATE_CHANGES = {
  value: { regularNonWin: 18_000, regularWin: -22_000, homeFinal: -36_000 },
  standard: { regularNonWin: 0, regularWin: 0, homeFinal: 0 },
  premium: { regularNonWin: -24_000, regularWin: 18_000, homeFinal: 36_000 },
} as const;

const COACH_SIGNING_FEE = 120_000;
const COACH_ROUND_WAGE = 18_000;
const COACH_ROLES = ['attack', 'defense'] as const;
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
interface NrlCoachHire { role: NrlCoachRole; round: number; paidRounds: number }
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
  coachHire?: NrlCoachHire;
  ticketTier?: ActiveTicketTier;
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
  development?: { focus: ActiveDevelopmentFocus; affected: number };
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
export interface NrlCareerState {
  version: 2;
  openingYear: NrlYear;
  season: NrlManagerState;
  players: NrlCareerPlayer[];
  history: NrlCareerHistoryRow[];
  finance: NrlCareerBook;
  legacySeason: boolean;
  boardChallenge?: true;
  academy?: NrlAcademyAssignment[];
  developmentFocus?: ActiveDevelopmentFocus;
}
export type NrlCareerAction = NrlAction
  | { type: 'offerContract'; playerId: string; salary: number; years: number }
  | { type: 'scoutAcademy'; role: NrlRole }
  | { type: 'promoteAcademy'; playerId: string }
  | { type: 'setDevelopmentFocus'; focus: NrlDevelopmentFocus }
  | { type: 'upgradeMedical'; level: MedicalUpgradeLevel }
  | { type: 'hireCoach'; role: NrlCoachRole; year: number; round: number }
  | { type: 'setTicketTier'; tier: NrlTicketTier; year: number; round: number }
  | { type: 'startNextSeason'; move?: { fromYear: number; clubId: string } };

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
const isCoachRole = (value: unknown): value is NrlCoachRole => value === 'attack' || value === 'defense';
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

function enrichPlayer(player: NrlPlayer, rng: () => number, rookie = false): NrlCareerPlayer {
  const age = rookie ? 18 + Math.floor(rng() * 4) : 20 + Math.floor(rng() * 14);
  const potential = clampi(player.rating + rng() * (age <= 24 ? 12 : 4), player.rating, 98);
  return { ...player, age, potential, contract: null, futureContract: null };
}

function initialSquad(club: NrlClub, year: number, seed: number, taken: Set<string>, starting: NrlPlayer[] = []): NrlCareerPlayer[] {
  const rng = rngFor(seed, `squad|${club.id}|${year}`);
  const players = starting.map(player => enrichPlayer(player, rng));
  for (let index = players.length; index < SQUAD_SIZE; index++) {
    const role = NRL_ROLES[index % NRL_ROLES.length];
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

function marketEntry(state: NrlCareerState, player: NrlCareerPlayer): NrlCareerMarketEntry | null {
  if (player.futureContract || player.age >= RETIREMENT_AGE || state.season.year === NRL_LAST_YEAR) return null;
  const { contract } = player;
  const { clubId, year } = state.season;
  const own = contract?.clubId === clubId;
  if (contract && !own && contract.endYear !== year) return null;
  const startYear = (contract?.endYear ?? year) + 1;
  if (startYear > NRL_LAST_YEAR) return null;
  const askingSalary = Math.max(baseSalary(player.rating, startYear), own ? Math.floor(contract!.salary * 0.94) : 0);
  return { player, startYear, askingSalary, kind: own ? 'renewal' : contract ? 'rival' : 'freeAgent' };
}

export function nrlCareerMarket(state: NrlCareerState): NrlCareerMarketEntry[] {
  return state.players.slice().sort(byRating).flatMap(player => {
    const entry = marketEntry(state, player);
    return entry ? [entry] : [];
  });
}

const missingRoles = (squad: NrlCareerPlayer[]) => NRL_ROLES.filter(role => !squad.some(player => player.role === role));

export function nrlContractOffer(state: NrlCareerState, playerId: string, salary: number, years: number): NrlContractQuote {
  const player = state.players.find(candidate => candidate.id === playerId);
  const entry = player ? marketEntry(state, player) : null;
  return entry ? checkContractOffer(state, entry, salary, years) : { ok: false, reason: 'This player is unavailable.' };
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
  for (let year = contract.startYear; year <= contract.endYear; year++) {
    const cap = capFor(state.players, clubId, year);
    if (!cap.openSlots) return { ok: false, reason: `The ${year} squad already has 30 contracts.` };
    if (salary > cap.available + cap.minimumSalary) return { ok: false, reason: `This offer exceeds the ${year} salary cap.` };
    const projected = squadAt(state.players, clubId, year);
    if (missingRoles([...projected, entry.player]).length >= cap.openSlots) {
      return { ok: false, reason: `Keep enough ${year} squad places to cover every starting position.` };
    }
  }
  return { ok: true, contract };
}

const academyPrefix = ({ clubId, year }: NrlManagerState) => `nrl-prospect-${clubId}-${year}-`;
const academyId = (season: NrlManagerState, role: NrlRole) => `${academyPrefix(season)}${NRL_ROLES.indexOf(role)}`;
const reportReady = (season: NrlManagerState, assignment: NrlAcademyAssignment) =>
  season.phase === 'complete' || season.round > assignment.startedRound;

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
  const potential = clampi(player.rating + 8 + rng() * 14, player.rating, 90);
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

function playerView(player: NrlCareerPlayer): NrlPlayer {
  const { id, name, role, rating, fitness } = player;
  return { id, name, role, rating, fitness };
}

function bookFrom(openingCash: number, fromRound = 1): NrlCareerBook {
  return { fromRound, openingCash, centralFunding: 0, gateReceipts: 0, wagesPaid: 0, operatingCosts: 0 };
}

export function nrlMedicalSpend(book: NrlCareerBook): number {
  return book.medicalUpgrades?.reduce((total, upgrade) => total + MEDICAL_UPGRADE_COST[upgrade.level], 0) ?? 0;
}

export function nrlCoachSpend(book: NrlCareerBook) {
  return book.coachHire ? { signingFee: COACH_SIGNING_FEE, wages: book.coachHire.paidRounds * COACH_ROUND_WAGE }
    : { signingFee: 0, wages: 0 };
}

function coachTermWages(firstRound: number, finalRound: number): number {
  return (finalRound - firstRound + 1) * COACH_ROUND_WAGE;
}

function coachWageReserve(book: NrlCareerBook, finalRound: number): number {
  return book.coachHire ? coachTermWages(book.coachHire.round, finalRound) - nrlCoachSpend(book).wages : 0;
}

export function nrlCareerFinance(state: Pick<NrlCareerState, 'finance'>): NrlCareerFinance {
  const { openingCash, centralFunding, gateReceipts, wagesPaid, operatingCosts } = state.finance;
  const { signingFee, wages } = nrlCoachSpend(state.finance);
  const profit = centralFunding + gateReceipts - wagesPaid - operatingCosts - nrlMedicalSpend(state.finance) - signingFee - wages;
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

export function nrlCoachQuote(state: NrlCareerState) {
  const { seed, year, clubId, round, phase } = state.season;
  const rng = rngFor(seed, `coach|${year}|${clubId}`);
  const usedNames = new Set<string>();
  const candidates = COACH_ROLES.map(role => ({ role, name: uniqueName(rng, COACH_FIRST, COACH_LAST, usedNames) }));
  const current = candidates.find(candidate => candidate.role === state.finance.coachHire?.role) ?? null;
  const remainingWages = current ? coachWageReserve(state.finance, lastRound(year))
    : phase === 'complete' ? 0 : coachTermWages(round, lastRound(year));
  return { candidates, current, fee: COACH_SIGNING_FEE, wagePerRound: COACH_ROUND_WAGE, remainingWages,
    reason: coachHireRefusal(state, remainingWages) };
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

export function nrlMedicalUpgradeQuote(state: NrlCareerState) {
  const level = nrlMedicalLevel(state);
  const nextLevel: MedicalUpgradeLevel | null = level === 1 ? 2 : level === 2 ? 3 : null;
  const cost = nextLevel === null ? null : MEDICAL_UPGRADE_COST[nextLevel];
  const cash = nrlCareerFinance(state).cash;
  const reason = cost === null ? 'Both upgrades are installed.'
    : !state.season.injuryTracking ? 'Upgrades open when injury tracking starts next season.'
      : state.season.phase === 'complete' ? 'Start the next season to buy an upgrade.'
        : state.season.live ? 'Finish the live match first.'
          : cash < cost ? 'The club needs more cash for this upgrade.'
            : cash - coachWageReserve(state.finance, lastRound(state.season.year)) < cost ? 'Club cash is reserved for the assistant’s wages.' : null;
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
  return {
    year: season.year, clubId: season.clubId, rank, wins, draws, losses, championId: season.championId!, finance,
    ...(season.kickerId ? { scoring: archiveNrlScoring(season) } : {}),
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

function careerFrom(season: NrlManagerState, openingYear: NrlYear, legacySeason: boolean): NrlCareerState {
  const { year, clubId, squad, seed } = season;
  const names = new Set(squad.map(player => player.name));
  const players = nrlSeasonPlan(year).clubs.flatMap(club =>
    initialSquad(club, year, seed, names, club.id === clubId ? squad : []));
  const fullSquad = players.filter(player => player.contract?.clubId === clubId).map(playerView);
  const finance = bookFrom(OPENING_CASH, season.phase === 'complete' ? season.round + 1 : season.round);
  const state: NrlCareerState = {
    version: 2, openingYear,
    season: {
      ...season, squad: fullSquad, bench: nrlBench({ ...season, squad: fullSquad }),
      ...(legacySeason ? {} : { injuryTracking: true as const, kickerId: season.lineup.Halfback }),
    },
    players: [...players, ...newMarket(seed, year, names)], history: [], finance, legacySeason,
  };
  if (season.phase === 'complete') state.history.push(seasonReceipt(state));
  return state;
}

export function createNrlCareer(clubId: string, seed: number, openingYear: NrlYear = 2026, boardChallenge = false): NrlCareerState {
  const career = careerFrom(createNrlSeason(clubId, seed, openingYear), openingYear, false);
  return boardChallenge ? { ...career, boardChallenge: true } : career;
}

function hasHomeGate(fixture: NrlFixture, clubId: string): boolean {
  return fixture.homeId === clubId && fixture.tieId !== 'GF';
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

function tickBooks(finance: NrlCareerBook, season: NrlManagerState, round: number, results: NrlMatchResult[], cap: NrlCareerCap): NrlCareerBook {
  const ticks = lastRound(season.year);
  const installment = (annual: number) => payThroughRound(annual, round, ticks) - payThroughRound(annual, round - 1, ticks);
  const fixture = results.find(result => result.homeId === season.clubId || result.awayId === season.clubId);
  const home = fixture && hasHomeGate(fixture, season.clubId);
  const gate = home ? homeGateReceipt(fixture, fixture.homeScore > fixture.awayScore, finance.ticketTier ?? 'standard') : 0;
  return {
    ...finance,
    centralFunding: finance.centralFunding + installment(cap.cap),
    wagesPaid: finance.wagesPaid + installment(cap.committed),
    gateReceipts: finance.gateReceipts + gate,
    operatingCosts: finance.operatingCosts + ROUND_OPERATING_COST + (fixture && !home ? TRAVEL_COST : 0),
    ...(finance.coachHire ? { coachHire: { ...finance.coachHire, paidRounds: finance.coachHire.paidRounds + 1 } } : {}),
  };
}

export function nrlFinanceForecast(state: NrlCareerState) {
  const { season, finance } = state;
  const { year, phase, round, clubId } = season;
  if (phase === 'complete') return null;
  const ticks = lastRound(year);
  const roundsLeft = ticks - round + 1;
  const lastScheduledRound = phase === 'regular' ? nrlRegularRounds(year) : round;
  const tier = finance.ticketTier ?? 'standard';
  let homeMatches = 0;
  let trips = 0;
  let gateLow = 0;
  let gateHigh = 0;
  for (let next = round; next <= lastScheduledRound; next++) {
    const { clubMatch } = nrlNextRound({ ...season, round: next });
    if (!clubMatch) continue;
    if (hasHomeGate(clubMatch, clubId)) {
      homeMatches++;
      const win = homeGateReceipt(clubMatch, true, tier);
      const nonWin = homeGateReceipt(clubMatch, false, tier);
      gateLow += Math.min(win, nonWin);
      gateHigh += Math.max(win, nonWin);
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
    cashNow, gateLow, gateHigh, closingLow: cashBeforeGates + gateLow, closingHigh: cashBeforeGates + gateHigh };
}

function opponentStrengths(state: NrlCareerState): Map<string, number> {
  const { year, clubId } = state.season;
  const ratings = new Map<string, Map<NrlRole, number>>();
  for (const player of state.players) {
    const contract = contractIn(player, year);
    if (!contract || contract.clubId === clubId) continue;
    const roles = ratings.get(contract.clubId) ?? new Map<NrlRole, number>();
    roles.set(player.role, Math.max(roles.get(player.role) ?? 0, player.rating));
    ratings.set(contract.clubId, roles);
  }
  return new Map([...ratings].map(([id, roles]) => [id, [...roles.values()].reduce((sum, rating) => sum + rating, 0) / NRL_ROLES.length]));
}

function careerMatchday(state: NrlCareerState) {
  // The imported season uses the original lineups and opponent ratings.
  return state.legacySeason
    ? { matchday: { ...state.season, bench: undefined }, opponentStrength: undefined }
    : { matchday: state.season, opponentStrength: opponentStrengths(state) };
}

export interface NrlOppositionReport {
  opponentId: string;
  ladderRank: number | null;
  recent: { round: number; rivalId: string; scored: number; conceded: number; outcome: 'W' | 'D' | 'L' }[];
  attackEdge: number;
  defenseEdge: number;
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
  const { matchday, opponentStrength } = careerMatchday(state);
  return { opponentId, ladderRank, recent, ...nrlMatchupEdges(matchday, clubMatch, opponentStrength, state.finance.coachHire?.role) };
}

function advanceCareer(state: NrlCareerState, action: Extract<NrlAction, { type: 'advance' | 'finishLive' }>): NrlCareerState {
  const previous = state.season;
  const { matchday, opponentStrength } = careerMatchday(state);
  const played = reduceNrlSeason(matchday, action, opponentStrength, {
    medicalReduction: nrlMedicalLevel(state) - 1, coachRole: state.finance.coachHire?.role,
  });
  if (played === matchday) return state;
  const season = state.legacySeason ? { ...played, bench: previous.bench } : played;
  const fitness = new Map(season.squad.map(player => [player.id, player.fitness]));
  const players = state.players.map(player => {
    const nextFitness = fitness.get(player.id);
    return nextFitness === undefined || nextFitness === player.fitness ? player : { ...player, fitness: nextFitness };
  });
  const finance = tickBooks(state.finance, season, previous.round, season.results.slice(previous.results.length), nrlCareerCap(state));
  const next = { ...state, season, players, finance };
  return season.phase === 'complete' ? { ...next, history: [...next.history, seasonReceipt(next)] } : next;
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

export function nrlOffseasonClubs({ season }: Pick<NrlCareerState, 'season'>): readonly NrlClub[] {
  if (season.phase !== 'complete' || season.year === NRL_LAST_YEAR) return [];
  return nrlSeasonPlan(season.year + 1).clubs.filter(club => club.id !== season.clubId);
}

function rolloverCareer(state: NrlCareerState, move?: { fromYear: number; clubId: string }): NrlCareerState {
  const { season } = state;
  if (season.phase !== 'complete' || season.year === NRL_LAST_YEAR) return state;
  if (!move && nrlBoardChallengeStatus(state) === 'must-move') return state;
  if (move && (move.fromYear !== season.year || !nrlOffseasonClubs(state).some(club => club.id === move.clubId))) return state;
  const { developmentFocus, ...career } = state;
  const year = season.year + 1;
  const clubId = move?.clubId ?? season.clubId;
  const gains = developmentGains(state);
  const players = state.players.map(player => advancePlayer(player, year, season.seed, gains.has(player.id)))
    .filter(player => player.contract || player.futureContract || player.age < RETIREMENT_AGE);
  const names = new Set(players.map(player => player.name));
  const priorClubs = new Set(nrlSeasonPlan(season.year).clubs.map(club => club.id));
  for (const club of nrlSeasonPlan(year).clubs) {
    if (!priorClubs.has(club.id)) players.push(...initialSquad(club, year, season.seed, names));
  }
  players.push(...newMarket(season.seed, year, names));
  const settled = completeSquads(players, state, year, names);
  const freeAgents = settled.filter(player => !player.contract && !player.futureContract).sort(byRating);
  const pool = NRL_ROLES.flatMap(role => freeAgents.filter(player => player.role === role).slice(0, MARKET_PER_ROLE));
  const world = [...settled.filter(player => player.contract || player.futureContract), ...pool];
  const squad = squadAt(world, clubId, year).sort(byRating);
  const lineup = { ...season.lineup };
  for (const role of NRL_ROLES) {
    if (move || !squad.some(player => player.id === lineup[role] && player.role === role)) {
      lineup[role] = squad.find(player => player.role === role)!.id;
    }
  }
  const nextSeason: NrlManagerState = {
    ...season, clubId, year, round: 1, phase: 'regular', championId: null,
    results: [], squad: squad.map(playerView), lineup, preparation: null, injuryTracking: true,
    ...(move ? { bench: undefined, tactic: 'balanced' } : {}),
    kickerId: !move && season.kickerId && Object.values(lineup).includes(season.kickerId) ? season.kickerId : lineup.Halfback,
  };
  const history = developmentFocus ? state.history.map(row => row.year === season.year
    ? { ...row, development: { focus: developmentFocus, affected: gains.size } } : row) : state.history;
  const openingCash = move
    ? history.reduce((cash, receipt) => receipt.clubId === clubId && receipt.finance ? receipt.finance.cash : cash, OPENING_CASH)
    : nrlCareerFinance(state).cash;
  return {
    ...career, players: world, history, legacySeason: false, academy: undefined, finance: bookFrom(openingCash),
    season: { ...nextSeason, bench: nrlBench(nextSeason) },
  };
}

export function reduceNrlCareer(state: NrlCareerState, action: NrlCareerAction): NrlCareerState {
  if (state.season.live && action.type !== 'finishLive') return state;
  switch (action.type) {
    case 'startNextSeason':
      return rolloverCareer(state, action.move);
    case 'upgradeMedical': {
      const { nextLevel, reason } = nrlMedicalUpgradeQuote(state);
      if (nextLevel === null || action.level !== nextLevel || reason !== null) return state;
      return { ...state, finance: addMedicalUpgrade(state.finance, { level: nextLevel, round: state.season.round }) };
    }
    case 'hireCoach': {
      const { year, round } = state.season;
      if (action.year !== year || action.round !== round || !isCoachRole(action.role)
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
    case 'setDevelopmentFocus': {
      if (state.legacySeason || state.season.year === NRL_LAST_YEAR || action.focus === state.developmentFocus) return state;
      if (activeDevelopmentFocus(action.focus)) return { ...state, developmentFocus: action.focus };
      if (action.focus !== 'balanced' || !state.developmentFocus) return state;
      const { developmentFocus, ...balanced } = state;
      return balanced;
    }
    case 'offerContract': {
      const quote = nrlContractOffer(state, action.playerId, action.salary, action.years);
      if (!quote.ok) return state;
      const players = state.players.map(player =>
        player.id === action.playerId ? { ...player, futureContract: quote.contract } : player);
      return { ...state, players };
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
      return advanceCareer(state, action);
    default: {
      const strength = action.type === 'startLive' && state.season.kickerId ? opponentStrengths(state) : undefined;
      const season = reduceNrlSeason(state.season, action, strength, { coachRole: state.finance.coachHire?.role });
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
    || !intIn(value.fitness, 0, 100) || !intIn(value.age, 18, 50) || !intIn(value.potential, value.rating, 98)) return false;
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
    && (value.ticketTier === undefined || (value.fromRound === 1 && activeTicketTier(value.ticketTier)))
    && (value.coachHire === undefined || (record(value.coachHire) && isCoachRole(value.coachHire.role)
      && intIn(value.coachHire.round, value.fromRound, roundLimit)
      && intIn(value.coachHire.paidRounds, 0, roundLimit - value.coachHire.round + 1)));
}

function validReceipt(value: unknown, year: number): value is NrlCareerHistoryRow {
  if (!record(value) || value.year !== year) return false;
  const { clubs } = nrlSeasonPlan(year);
  if (!clubs.some(club => club.id === value.clubId)
    || !intIn(value.rank, 1, clubs.length) || !clubs.some(club => club.id === value.championId)
    || !intIn(value.wins, 0, 24) || !intIn(value.draws, 0, 24) || !intIn(value.losses, 0, 24)
    || value.wins + value.draws + value.losses !== 24
    || (value.scoring !== undefined && !validNrlScoringArchive(value.scoring))) return false;
  if (value.development !== undefined && (!record(value.development) || !activeDevelopmentFocus(value.development.focus)
    || !intIn(value.development.affected, 0, SQUAD_SIZE))) return false;
  if (value.finance === null) return true;
  if (!record(value.finance) || !validBook(value.finance, lastRound(year))) return false;
  const finance = nrlCareerFinance({ finance: value.finance });
  if (finance.coachHire && (finance.fromRound !== 1 || finance.coachHire.paidRounds !== lastRound(year) - finance.coachHire.round + 1)) return false;
  return value.finance.cash === finance.cash && value.finance.profit === finance.profit;
}

function booksMatch(a: NrlCareerBook, b: NrlCareerBook): boolean {
  const first = a.medicalUpgrades ?? [];
  const second = b.medicalUpgrades ?? [];
  return a.fromRound === b.fromRound && a.openingCash === b.openingCash
    && a.centralFunding === b.centralFunding && a.gateReceipts === b.gateReceipts
    && a.wagesPaid === b.wagesPaid && a.operatingCosts === b.operatingCosts
    && a.coachHire?.role === b.coachHire?.role && a.coachHire?.round === b.coachHire?.round
    && a.coachHire?.paidRounds === b.coachHire?.paidRounds
    && a.ticketTier === b.ticketTier
    && first.length === second.length && first.every((purchase, index) =>
      purchase.round === second[index].round && purchase.level === second[index].level);
}

function validWorld(state: NrlCareerState): boolean {
  const { year, clubId, squad } = state.season;
  if (new Set(state.players.map(player => player.id)).size !== state.players.length) return false;
  if (new Set(state.players.map(player => player.name)).size !== state.players.length) return false;
  const own = new Map(squadAt(state.players, clubId, year).map(player => [player.id, player]));
  if (squad.length !== SQUAD_SIZE || !squad.every(player => {
    const stored = own.get(player.id);
    return stored && player.role === stored.role && player.name === stored.name
      && player.rating === stored.rating && player.fitness === stored.fitness;
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
    || (legacySeason && finance.ticketTier !== undefined)) return false;
  const coach = finance.coachHire;
  if (coach) {
    if (legacySeason) return false;
    if (coach.round > nrlRegularRounds(season.year) && nrlNextRound({
      ...season, round: coach.round, phase: 'finals', results: season.results.filter(match => match.round < coach.round),
    }).clubStatus === 'eliminated') return false;
  }
  if (history.length !== season.year - openingYear + Number(complete)) return false;
  const firstBook = { cash: OPENING_CASH, medicalLevel: 1 };
  const clubs = new Map<string, typeof firstBook>();
  for (const [index, receipt] of history.entries()) {
    const year = openingYear + index;
    if (!validReceipt(receipt, year) || (receipt.finance === null && index !== 0)) return false;
    const previous = clubs.get(receipt.clubId) ?? firstBook;
    if (receipt.finance && receipt.finance.openingCash !== previous.cash) return false;
    if (year === season.year) {
      const expected = seasonReceipt(state);
      if (receipt.clubId !== expected.clubId || receipt.rank !== expected.rank || receipt.wins !== expected.wins
        || receipt.draws !== expected.draws || receipt.losses !== expected.losses || receipt.championId !== expected.championId
        || receipt.development !== undefined
        || JSON.stringify(receipt.scoring) !== JSON.stringify(expected.scoring)
        || (receipt.finance === null) !== (expected.finance === null)
        || (receipt.finance && expected.finance && !booksMatch(receipt.finance, expected.finance))) return false;
    } else if (receipt.finance) {
      const upgrades = receipt.finance.medicalUpgrades ?? [];
      if (!upgrades.every((purchase, index) => purchase.level === previous.medicalLevel + index + 1)) return false;
      clubs.set(receipt.clubId, { cash: receipt.finance.cash, medicalLevel: upgrades.at(-1)?.level ?? previous.medicalLevel });
    }
  }
  const currentClub = clubs.get(season.clubId) ?? firstBook;
  let expected = bookFrom(currentClub.cash, finance.fromRound);
  if (finance.ticketTier) expected.ticketTier = finance.ticketTier;
  const cap = nrlCareerCap(state);
  const purchases = finance.medicalUpgrades ?? [];
  if ((!season.injuryTracking && purchases.length)
    || !purchases.every((purchase, index) => purchase.level === currentClub.medicalLevel + index + 1)) return false;
  let nextPurchase = 0;
  for (let round = finance.fromRound; round <= played + Number(!complete); round++) {
    // A hire and a medical purchase in the same round reserve the same total cash in either order.
    if (coach?.round === round) {
      if (nrlCareerFinance({ finance: expected }).cash < COACH_SIGNING_FEE + coachTermWages(round, finalRound)) return false;
      expected = { ...expected, coachHire: { role: coach.role, round, paidRounds: 0 } };
    }
    while (purchases[nextPurchase]?.round === round) {
      const purchase = purchases[nextPurchase++];
      const spendable = nrlCareerFinance({ finance: expected }).cash - coachWageReserve(expected, finalRound);
      if (spendable < MEDICAL_UPGRADE_COST[purchase.level]) return false;
      expected = addMedicalUpgrade(expected, purchase);
    }
    if (round <= played) expected = tickBooks(expected, season, round, season.results.filter(result => result.round === round), cap);
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
      || player.contract || player.futureContract || player.fitness !== 100 || !intIn(player.age, 18, 21)
      || !intIn(player.rating, 49, 66) || !intIn(player.potential, player.rating + 8, 90)) return false;
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
      || signed.rating !== player.rating || signed.potential !== player.potential || signed.age !== player.age
      || signed.fitness !== player.fitness || signed.contract || !contract || contract.clubId !== season.clubId
      || contract.startYear !== year || contract.endYear !== year || contract.salary !== nrlSeasonPlan(year).minimumSalary) return false;
  }
  return players.every(player => !player.id.startsWith(prefix) || knownIds.has(player.id));
}

export function isNrlCareerState(value: unknown): value is NrlCareerState {
  if (!record(value) || value.version !== 2 || !isNrlOpeningYear(value.openingYear)
    || !isNrlSeasonProgress(value.season) || value.season.year < value.openingYear
    || typeof value.legacySeason !== 'boolean'
    || (value.boardChallenge !== undefined && (value.boardChallenge !== true || value.legacySeason))
    || (value.developmentFocus !== undefined && (!activeDevelopmentFocus(value.developmentFocus)
      || value.legacySeason || value.season.year === NRL_LAST_YEAR))
    || (value.legacySeason && (value.season.year !== value.openingYear || value.season.kickerId || value.season.injuryTracking || value.season.results.some(match => match.benchUsed !== undefined)))
    || !Array.isArray(value.players) || value.players.length > 650
    || !Array.isArray(value.history) || !validBook(value.finance, value.season.round + 1)) return false;
  const { year } = value.season;
  if (!value.players.every(player => validPlayer(player, year))) return false;
  const state = value as unknown as NrlCareerState;
  return validWorld(state) && validCareerBooks(state) && validAcademy(state)
    && (!state.season.live || validNrlLiveScore(state.season, opponentStrengths(state), state.finance.coachHire?.role));
}

export function readNrlCareerSave(raw: string | null): NrlCareerState | null {
  if (!raw || raw.length > 550_000) return null;
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
