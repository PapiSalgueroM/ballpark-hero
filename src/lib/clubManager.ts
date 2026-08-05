import { foldSpecialLatin } from '@/lib/nameFold';
import type { Player, Position } from '@/types/game';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import type { Formation } from '@/lib/squadDeal';
import { players as RAW_POOL } from '@/data/players';

/**
 * Club Manager engine.
 *
 * Pure, JSON-serializable state machine consumed by useClubManager (which owns
 * React state + localStorage persistence) and the club-manager components.
 * Everything in CareerState must survive JSON.stringify/parse round trips —
 * no Dates, Maps, Sets, functions or class instances.
 *
 * Formations + the market-value -> rating curve are shared with Squad Deal
 * (see src/lib/squadDeal.ts) so the two games agree on how good a player is.
 */

/* ================================================================== */
/* Types                                                              */
/* ================================================================== */

export type Mentality = 'defensive' | 'balanced' | 'attacking';
export type FormResult = 'W' | 'D' | 'L';
export type Competition = 'league' | 'cup' | 'uclGroup' | 'uclKo';
export type CupRound = 'R16' | 'QF' | 'SF' | 'F';
export type CupState = CupRound | 'out' | 'won';
export type UclKoRound = 'QF' | 'SF' | 'F';
export type UclKoState = UclKoRound | 'out' | 'won' | null;

export { FORMATIONS };
export type { Formation };

export interface CMPlayer {
  id: string;
  name: string;
  position: Position;
  rating: number;
  age: number;
  /** 0-100 — drops when the player starts, recovers on weeks off. */
  fitness: number;
  /** 0-100 — swings with results. */
  morale: number;
  /** Weeks (calendar entries) remaining out injured. */
  injuryWeeks: number;
  /** Matches of ours remaining suspended. */
  suspendedMatches: number;
  isYouth: boolean;
  seasonGoals: number;
  seasonAssists: number;
}

export interface TableRow {
  club: string;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface ClubDef {
  name: string;
  tier: 1 | 2 | 3 | 4;
  color: string;
  /** Starting transfer budget in £m. */
  budget: number;
  /** Board's expected league finish ("Top N"). */
  expectation: number;
}

export interface TierInfo { label: string; emoji: string; blurb: string; }

export interface MentalityDef { id: Mentality; label: string; emoji: string; desc: string; }

export interface MarketPlayer {
  name: string;
  club: string;
  position: Position;
  age: number;
  rating: number;
  /** Asking price in £m. */
  price: number;
}

export interface TransferRecord { dir: 'in' | 'out'; name: string; fee: number; }

export interface Trophy { name: string; emoji: string; season: number; }

export interface ScorerLine { name: string; minute: number; }

export interface OtherResult { home: string; away: string; hg: number; ag: number; }

export interface MatchWeekReport {
  competition: Competition;
  compLabel: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  won: boolean;
  drawn: boolean;
  decidedBy: 'regular' | 'pens';
  myScorers: ScorerLine[];
  oppScorers: ScorerLine[];
  events: string[];
  trophyWon: string | null;
  myPosition: number;
  confidence: number;
  confidenceDelta: number;
  otherResults: OtherResult[];
}

export interface CalendarEntry {
  type: Competition | 'window';
  /** League round index 0-37, or UCL group matchday index 0-5. 0 otherwise. */
  round: number;
  cupRound?: CupRound;
  uclRound?: UclKoRound;
}

export interface UclGroupState {
  /** The 3 other clubs in my group. */
  opponents: string[];
  table: TableRow[];
  /** Group matchdays already played (0-6). */
  matchday: number;
}

export interface SeasonRecord {
  season: number;
  club: string;
  position: number;
  points: number;
  trophies: string[];
}

export interface CareerStats { played: number; wins: number; draws: number; losses: number; }

export interface JobOffer { club: string; blurb: string; }

export interface SeasonSummary {
  season: number;
  club: string;
  position: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  verdictGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  verdict: string;
  champion: string;
  trophies: string[];
  topScorer: { name: string; goals: number } | null;
  topAssister: { name: string; assists: number } | null;
  qualifiedUcl: boolean;
  signings: TransferRecord[];
  offers: JobOffer[];
  /** min(130, league points + 10 per trophy this season). */
  seasonScore: number;
}

export interface CareerState {
  saveVersion: number;
  clubName: string;
  season: number;
  /** Index into calendar of the next entry to play. */
  week: number;
  budget: number;
  boardConfidence: number;
  sacked: boolean;
  squad: CMPlayer[];
  /** One id (or null) per formation slot. */
  xiIds: (string | null)[];
  formationIndex: number;
  mentality: Mentality;
  /** The 20 league clubs in scheduling order (shuffled each season). */
  leagueClubs: string[];
  table: TableRow[];
  /** Last 5 results, oldest first. */
  form: FormResult[];
  calendar: CalendarEntry[];
  /** Per-season strength rating for every club (league + UCL flavor clubs). */
  clubStrengths: Record<string, number>;
  transferWindow: 'summer' | 'january' | null;
  aiHeadlines: string[];
  /** Names no longer purchasable (bought by me or by AI clubs this season). */
  goneNames: string[];
  seasonSignings: TransferRecord[];
  cupRound: CupState;
  cupDraw: Partial<Record<CupRound, string>>;
  uclGroup: UclGroupState | null;
  uclKoRound: UclKoState;
  uclDraw: Partial<Record<UclKoRound, string>>;
  trophies: Trophy[];
  history: SeasonRecord[];
  careerStats: CareerStats;
  /** Set by finishSeason so a reload mid-review can resume the summary. */
  pendingSummary: SeasonSummary | null;
}

export type NextFixtureInfo =
  | {
      kind: 'match';
      competition: Competition;
      compLabel: string;
      opponent: string;
      /** true home, false away, null neutral venue. */
      home: boolean | null;
      oppStrength: number;
    }
  | { kind: 'window' }
  | { kind: 'seasonOver' };

export interface PlayResult {
  state: CareerState;
  kind: 'window' | 'match' | 'seasonOver';
  report?: MatchWeekReport;
}

/* ================================================================== */
/* Static data                                                        */
/* ================================================================== */

export const TIER_INFO: Record<number, TierInfo> = {
  1: { label: 'Elite', emoji: '👑', blurb: 'Huge budgets, zero patience: anything short of the title is a crisis.' },
  2: { label: 'Contenders', emoji: '🥇', blurb: 'Big spenders expected to challenge on every front.' },
  3: { label: 'Challengers', emoji: '⚔️', blurb: 'Strong squads fighting for the European places.' },
  4: { label: 'Underdogs', emoji: '🐺', blurb: 'Small budgets, low bar: every scalp is a story.' },
};

export const CLUBS: ClubDef[] = [
  { name: 'Real Madrid', tier: 1, color: '#f0c243', budget: 180, expectation: 1 },
  { name: 'Manchester City', tier: 1, color: '#6cabdd', budget: 175, expectation: 2 },
  { name: 'Barcelona', tier: 1, color: '#a50044', budget: 170, expectation: 2 },
  { name: 'Liverpool', tier: 1, color: '#c8102e', budget: 165, expectation: 2 },
  { name: 'Bayern Munich', tier: 1, color: '#dc052d', budget: 160, expectation: 3 },
  { name: 'PSG', tier: 2, color: '#004170', budget: 130, expectation: 4 },
  { name: 'Chelsea', tier: 2, color: '#034694', budget: 125, expectation: 5 },
  { name: 'Arsenal', tier: 2, color: '#ef0107', budget: 120, expectation: 4 },
  { name: 'Inter Milan', tier: 2, color: '#0068a8', budget: 95, expectation: 5 },
  { name: 'Juventus', tier: 2, color: '#d5d5d5', budget: 90, expectation: 6 },
  { name: 'Manchester United', tier: 3, color: '#da291c', budget: 80, expectation: 7 },
  { name: 'Tottenham', tier: 3, color: '#9bb3d4', budget: 75, expectation: 8 },
  { name: 'Atlético Madrid', tier: 3, color: '#cb3524', budget: 72, expectation: 7 },
  { name: 'AC Milan', tier: 3, color: '#fb090b', budget: 70, expectation: 8 },
  { name: 'Borussia Dortmund', tier: 3, color: '#fde100', budget: 65, expectation: 9 },
  { name: 'Newcastle', tier: 4, color: '#a0a6ad', budget: 40, expectation: 12 },
  { name: 'Aston Villa', tier: 4, color: '#95bfe5', budget: 38, expectation: 12 },
  { name: 'Napoli', tier: 4, color: '#12a0d7', budget: 35, expectation: 11 },
  { name: 'Roma', tier: 4, color: '#8e1f2f', budget: 30, expectation: 13 },
  { name: 'Marseille', tier: 4, color: '#2faee0', budget: 25, expectation: 14 },
];

export const MENTALITIES: MentalityDef[] = [
  { id: 'defensive', label: 'Defensive', emoji: '🛡️', desc: 'Sit deep, frustrate them, protect the point' },
  { id: 'balanced', label: 'Balanced', emoji: '⚖️', desc: 'Keep your shape and pick your moments' },
  { id: 'attacking', label: 'Attacking', emoji: '⚔️', desc: 'Throw bodies forward and chase goals' },
];

/** European flavor clubs used for UCL groups/knockouts (not in the league). */
const EURO_CLUBS = [
  'Benfica', 'Porto', 'Sporting CP', 'Ajax', 'PSV', 'Feyenoord', 'Celtic', 'Rangers',
  'Galatasaray', 'Fenerbahçe', 'Club Brugge', 'RB Salzburg', 'Olympiacos', 'RB Leipzig',
  'Bayer Leverkusen', 'Monaco', 'Lille', 'Atalanta', 'Lazio', 'Sevilla',
];

const CUP_ORDER: CupRound[] = ['R16', 'QF', 'SF', 'F'];
const CUP_LABELS: Record<CupRound, string> = {
  R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', F: 'Final',
};
const UCL_ORDER: UclKoRound[] = ['QF', 'SF', 'F'];
const UCL_LABELS: Record<UclKoRound, string> = {
  QF: 'Quarter-final', SF: 'Semi-final', F: 'Final',
};

const SAVE_KEY = 'dukb-club-manager-save';
const SAVE_VERSION = 1;

/* ================================================================== */
/* Small utilities                                                    */
/* ================================================================== */

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const ri = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slug(name: string): string {
  return foldSpecialLatin(name.toLowerCase()).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
}

/** £-formatted money in millions: money(180) -> '£180m', money(0.6) -> '£600k'. */
export function money(n: number): string {
  if (n >= 1000) {
    const bn = n / 1000;
    return `£${Number.isInteger(bn) ? bn : bn.toFixed(1)}bn`;
  }
  if (n >= 1) {
    const m = Math.round(n * 10) / 10;
    return `£${Number.isInteger(m) ? m : m.toFixed(1)}m`;
  }
  return `£${Math.max(0, Math.round(n * 1000))}k`;
}

export function confidenceLabel(conf: number): string {
  if (conf >= 80) return 'Untouchable';
  if (conf >= 60) return 'Secure';
  if (conf >= 45) return 'Steady';
  if (conf >= 30) return 'Under pressure';
  if (conf >= 15) return 'On the brink';
  return 'Dead man walking';
}

/* ================================================================== */
/* Player pool + squads                                               */
/* ================================================================== */

let POOL_CACHE: Player[] | null = null;

/** players.ts deduplicated by name (first entry wins). */
function getPool(): Player[] {
  if (!POOL_CACHE) {
    const seen = new Set<string>();
    POOL_CACHE = RAW_POOL.filter(p => {
      if (!p.name || seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }
  return POOL_CACHE;
}

export function clubByName(name: string): ClubDef | null {
  return CLUBS.find(c => c.name === name) ?? null;
}

/** Average rating of the club's best XI (padded with 66-rated youth). */
export function clubPreviewRating(clubName: string): number {
  const ratings = getPool()
    .filter(p => p.club === clubName)
    .map(playerRating)
    .sort((a, b) => b - a)
    .slice(0, 11);
  while (ratings.length < 11) ratings.push(66);
  return Math.round(ratings.reduce((s, r) => s + r, 0) / 11);
}

const POS_DEF: Position[] = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
const POS_MID: Position[] = ['CDM', 'CM', 'CAM', 'LM', 'RM'];
const POS_ATT: Position[] = ['LW', 'RW', 'ST', 'CF'];

type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

function groupOf(pos: Position): PosGroup {
  if (pos === 'GK') return 'GK';
  if (POS_DEF.includes(pos)) return 'DEF';
  if (POS_MID.includes(pos)) return 'MID';
  return 'ATT';
}

const YOUTH_FIRST = [
  'Jamie', 'Leo', 'Sam', 'Alfie', 'Marco', 'Theo', 'Noah', 'Kofi', 'Mats', 'Diego',
  'Enzo', 'Luca', 'Tyler', 'Oscar', 'Ravi', 'Jude', 'Milo', 'Andres', 'Yusuf', 'Kaan',
];
const YOUTH_LAST = [
  'Weston', 'Okafor', 'Silva', 'Berg', 'Keane', 'Moretti', 'Dubois', 'Novak', 'Ferreira', 'Vargas',
  'Sato', 'Hansen', 'Adeyemi', 'Costa', 'Petrov', 'Walsh', 'Kimura', 'Marchetti', 'Diallo', 'Reyes',
];

let youthSeq = 0;

function makeYouth(position: Position, minRating = 62, maxRating = 72): CMPlayer {
  youthSeq += 1;
  const name = `${pick(YOUTH_FIRST)} ${pick(YOUTH_LAST)} (Youth)`;
  return {
    id: `youth-${Date.now().toString(36)}-${youthSeq}-${ri(100, 999)}`,
    name,
    position,
    rating: ri(minRating, maxRating),
    age: ri(17, 19),
    fitness: 100,
    morale: 72,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: true,
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

function toCMPlayer(p: Player): CMPlayer {
  return {
    id: `p-${slug(p.name)}`,
    name: p.name,
    position: p.position,
    rating: playerRating(p),
    age: p.age || 25,
    fitness: 100,
    morale: 70,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: false,
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

/** Tops a squad up with youth so it has positional coverage + at least 16 players. */
function ensureSquadCoverage(squad: CMPlayer[]): CMPlayer[] {
  const out = [...squad];
  const need: Record<PosGroup, number> = { GK: 2, DEF: 5, MID: 5, ATT: 4 };
  const fill: Record<PosGroup, Position[]> = {
    GK: ['GK'],
    DEF: ['CB', 'CB', 'RB', 'LB', 'CB'],
    MID: ['CM', 'CDM', 'CAM', 'CM', 'CM'],
    ATT: ['ST', 'RW', 'LW', 'ST'],
  };
  (['GK', 'DEF', 'MID', 'ATT'] as PosGroup[]).forEach(gr => {
    let count = out.filter(p => groupOf(p.position) === gr).length;
    let i = 0;
    while (count < need[gr]) {
      out.push(makeYouth(fill[gr][i % fill[gr].length]));
      count += 1;
      i += 1;
    }
  });
  while (out.length < 16) {
    out.push(makeYouth(pick([...POS_DEF, ...POS_MID, ...POS_ATT])));
  }
  return out;
}

function buildSquad(clubName: string): CMPlayer[] {
  const real = getPool().filter(p => p.club === clubName).map(toCMPlayer);
  return ensureSquadCoverage(real);
}

/* ================================================================== */
/* Availability, XI + table helpers                                   */
/* ================================================================== */

export function isAvailable(p: CMPlayer): boolean {
  return p.injuryWeeks <= 0 && p.suspendedMatches <= 0;
}

export function autoPickXI(squad: CMPlayer[], formation: Formation): (string | null)[] {
  const used = new Set<string>();
  const xi: (string | null)[] = [];
  for (const slot of formation.slots) {
    const fits = squad
      .filter(p => isAvailable(p) && !used.has(p.id) && slot.allowed.includes(p.position))
      .sort((a, b) => b.rating - a.rating);
    let chosen: CMPlayer | null = fits[0] ?? null;
    if (!chosen) {
      const any = squad
        .filter(p => isAvailable(p) && !used.has(p.id))
        .sort((a, b) => b.rating - a.rating);
      chosen = any[0] ?? null;
    }
    if (chosen) {
      used.add(chosen.id);
      xi.push(chosen.id);
    } else {
      xi.push(null);
    }
  }
  return xi;
}

export function resolveXI(career: CareerState): (CMPlayer | null)[] {
  return career.xiIds.map(id => (id ? career.squad.find(p => p.id === id) ?? null : null));
}

export function xiAverageRating(career: CareerState): number {
  const ps = resolveXI(career).filter((p): p is CMPlayer => !!p);
  if (!ps.length) return 0;
  return Math.round(ps.reduce((s, p) => s + p.rating, 0) / ps.length);
}

function emptyRow(club: string): TableRow {
  return { club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

export function sortedTable(rows: TableRow[]): TableRow[] {
  return [...rows].sort((a, b) =>
    b.pts - a.pts ||
    (b.gf - b.ga) - (a.gf - a.ga) ||
    b.gf - a.gf ||
    a.club.localeCompare(b.club));
}

export function leaguePosition(career: CareerState): number {
  return sortedTable(career.table).findIndex(r => r.club === career.clubName) + 1;
}

/* ================================================================== */
/* Transfer market                                                    */
/* ================================================================== */

/**
 * £m value from rating + age. The rating half inverts squadDeal's
 * playerRating log-curve so value round-trips with the source data;
 * age then scales it (prospects premium, veterans discount).
 */
function baseValue(rating: number, age: number): number {
  const mv = Math.pow(10, ((rating - 35) * Math.log10(1001)) / 64) - 1;
  const ageF =
    age <= 21 ? 1.3 :
    age <= 24 ? 1.15 :
    age <= 28 ? 1.0 :
    age <= 31 ? 0.7 :
    age <= 34 ? 0.4 : 0.2;
  return Math.max(0.5, mv * ageF);
}

function priceOf(rating: number, age: number): number {
  return Math.max(1, Math.round(baseValue(rating, age) * 1.15));
}

/** What we bank when selling, 90% of value (youth products fetch less). */
export function sellValue(p: CMPlayer): number {
  const youthF = p.isYouth ? 0.4 : 1;
  return Math.max(1, Math.round(baseValue(p.rating, p.age) * 0.9 * youthF));
}

/**
 * Deterministic view of who is purchasable right now: the whole real-player
 * pool minus my squad and minus anyone already transferred (goneNames).
 * Called from a useMemo on every career change, so it must be pure.
 */
export function buildMarket(career: CareerState): MarketPlayer[] {
  const squadNames = new Set(career.squad.map(p => p.name));
  const gone = new Set(career.goneNames);
  return getPool()
    .filter(p => !squadNames.has(p.name) && !gone.has(p.name))
    .map(p => {
      const rating = playerRating(p);
      return {
        name: p.name,
        club: p.club,
        position: p.position,
        age: p.age || 25,
        rating,
        price: priceOf(rating, p.age || 25),
      };
    })
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
}

/** Returns the new state, or null if the deal is not allowed. */
export function buyPlayer(career: CareerState, mp: MarketPlayer): CareerState | null {
  if (career.transferWindow === null) return null;
  if (mp.price > career.budget) return null;
  if (career.squad.length >= 30) return null;
  if (career.squad.some(p => p.name === mp.name)) return null;
  const player: CMPlayer = {
    id: `sign-${slug(mp.name)}-s${career.season}`,
    name: mp.name,
    position: mp.position,
    rating: mp.rating,
    age: mp.age,
    fitness: 90,
    morale: 78,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: false,
    seasonGoals: 0,
    seasonAssists: 0,
  };
  return {
    ...career,
    budget: Math.round((career.budget - mp.price) * 10) / 10,
    squad: [...career.squad, player],
    goneNames: [...career.goneNames, mp.name],
    seasonSignings: [...career.seasonSignings, { dir: 'in', name: mp.name, fee: mp.price }],
  };
}

/** Returns the new state, or null if the sale is not allowed. */
export function sellPlayer(career: CareerState, playerId: string): CareerState | null {
  if (career.transferWindow === null) return null;
  if (career.squad.length <= 14) return null;
  const p = career.squad.find(x => x.id === playerId);
  if (!p) return null;
  const gkCount = career.squad.filter(x => x.position === 'GK').length;
  if (p.position === 'GK' && gkCount <= 1) return null;
  const fee = sellValue(p);
  return {
    ...career,
    budget: Math.round((career.budget + fee) * 10) / 10,
    squad: career.squad.filter(x => x.id !== playerId),
    xiIds: career.xiIds.map(id => (id === playerId ? null : id)),
    seasonSignings: [...career.seasonSignings, { dir: 'out', name: p.name, fee }],
  };
}

/**
 * 3-6 AI transfers between the other clubs. Each headline removes that player
 * from the market for the rest of the season. Mutates state (internal use).
 */
function generateHeadlines(state: CareerState): void {
  const market = buildMarket(state);
  const count = Math.min(ri(3, 6), market.length);
  const candidates = shuffle(market.slice(0, 120)).slice(0, count);
  const heads: string[] = [];
  for (const mp of candidates) {
    const buyers = CLUBS.map(c => c.name).filter(n => n !== state.clubName && n !== mp.club);
    const buyer = pick(buyers);
    const fee = Math.max(1, Math.round(mp.price * (0.9 + Math.random() * 0.25)));
    heads.push(`${buyer} sign ${mp.name} from ${mp.club} for ${money(fee)}.`);
    state.goneNames.push(mp.name);
  }
  state.aiHeadlines = heads;
}

/* ================================================================== */
/* Season scaffolding: strengths, fixtures, calendar, cup + UCL       */
/* ================================================================== */

/** Per-season strength for every club we might face (with a little jitter). */
function genClubStrengths(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CLUBS) {
    out[c.name] = clamp(clubPreviewRating(c.name) + ri(-2, 2), 55, 92);
  }
  for (const e of EURO_CLUBS) {
    if (out[e] !== undefined) continue;
    const base = Math.max(clubPreviewRating(e), 66);
    out[e] = clamp(base + ri(-2, 2), 60, 88);
  }
  return out;
}

function strengthOf(state: CareerState, club: string): number {
  return state.clubStrengths[club] ?? Math.max(clubPreviewRating(club), 64);
}

/**
 * Double round robin via the circle method: rounds 0-18 are the first half,
 * 19-37 mirror them with venues swapped. Pure function of (clubs, round).
 */
function roundPairs(clubs: string[], round: number): [string, string][] {
  const n = clubs.length;
  const r = round % (n - 1);
  const rest = clubs.slice(1);
  const rot = [...rest.slice(r), ...rest.slice(0, r)];
  const arr = [clubs[0], ...rot];
  const pairs: [string, string][] = [];
  for (let i = 0; i < n / 2; i++) {
    let h = arr[i];
    let a = arr[n - 1 - i];
    if ((r + i) % 2 === 1) [h, a] = [a, h];
    if (round >= n - 1) [h, a] = [a, h];
    pairs.push([h, a]);
  }
  return pairs;
}

/**
 * 52-entry season calendar: 38 league rounds with the domestic cup, UCL group
 * matchdays, UCL knockouts and the January window interleaved between them.
 */
function buildCalendar(): CalendarEntry[] {
  const cal: CalendarEntry[] = [];
  let md = 0;
  for (let r = 0; r < 38; r++) {
    cal.push({ type: 'league', round: r });
    if ([2, 5, 8, 10, 12, 15].includes(r)) {
      cal.push({ type: 'uclGroup', round: md });
      md += 1;
    }
    if (r === 6) cal.push({ type: 'cup', round: 0, cupRound: 'R16' });
    if (r === 14) cal.push({ type: 'cup', round: 0, cupRound: 'QF' });
    if (r === 18) cal.push({ type: 'window', round: 0 });
    if (r === 22) cal.push({ type: 'uclKo', round: 0, uclRound: 'QF' });
    if (r === 26) cal.push({ type: 'cup', round: 0, cupRound: 'SF' });
    if (r === 29) cal.push({ type: 'uclKo', round: 0, uclRound: 'SF' });
    if (r === 33) cal.push({ type: 'cup', round: 0, cupRound: 'F' });
    if (r === 35) cal.push({ type: 'uclKo', round: 0, uclRound: 'F' });
  }
  return cal;
}

function initUclGroup(qualified: boolean, myClub: string): UclGroupState | null {
  if (!qualified) return null;
  const opponents = shuffle(EURO_CLUBS.filter(c => c !== myClub)).slice(0, 3);
  return {
    opponents,
    table: [myClub, ...opponents].map(emptyRow),
    matchday: 0,
  };
}

function drawCupOpponent(state: CareerState): string {
  const others = state.leagueClubs.filter(c => c !== state.clubName);
  return pick(others);
}

function drawUclKoOpponent(state: CareerState): string {
  const already = new Set<string>([
    state.clubName,
    ...(state.uclGroup ? state.uclGroup.opponents : []),
    ...Object.values(state.uclDraw).filter((c): c is string => !!c),
  ]);
  const bigLeague = CLUBS.filter(c => c.tier <= 2).map(c => c.name);
  const pool = [...EURO_CLUBS, ...bigLeague].filter(c => !already.has(c));
  return pool.length ? pick(pool) : 'Galacticos XI';
}

/** Cup/UCL venue pattern (deterministic so previews match played matches). */
function cupVenue(round: CupRound): boolean | null {
  return round === 'R16' ? true : round === 'QF' ? false : round === 'SF' ? true : null;
}
function uclKoVenue(round: UclKoRound): boolean | null {
  return round === 'QF' ? true : round === 'SF' ? false : null;
}

/** Does this calendar entry involve my club right now? */
function entryInvolvesMe(state: CareerState, entry: CalendarEntry): boolean {
  switch (entry.type) {
    case 'league': return true;
    case 'window': return true;
    case 'cup': return state.cupRound === entry.cupRound;
    case 'uclGroup': return state.uclGroup !== null && state.uclKoRound === null;
    case 'uclKo': return state.uclKoRound === entry.uclRound;
    default: return false;
  }
}

/* ================================================================== */
/* Match engine                                                       */
/* ================================================================== */

const MENT_MOD: Record<Mentality, { atk: number; def: number }> = {
  defensive: { atk: -0.38, def: -0.32 },
  balanced: { atk: 0, def: 0 },
  attacking: { atk: 0.42, def: 0.34 },
};

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > L);
  return Math.min(k - 1, 7);
}

/** Score for A vs B given strengths + extra xG boosts for each side. */
function simScore(sA: number, sB: number, boostA: number, boostB: number): [number, number] {
  const lA = clamp(1.25 + (sA - sB) * 0.055 + boostA, 0.12, 4.2);
  const lB = clamp(1.25 + (sB - sA) * 0.055 + boostB, 0.12, 4.2);
  return [poisson(lA), poisson(lB)];
}

/** Quick AI-vs-AI league result (small home edge). */
function simAiMatch(state: CareerState, home: string, away: string): [number, number] {
  return simScore(strengthOf(state, home), strengthOf(state, away), 0.2, -0.08);
}

/**
 * The XI that actually takes the field: the picked XI with unavailable or
 * missing players auto-replaced by the best available fit for that slot.
 */
function effectiveXI(state: CareerState): CMPlayer[] {
  const formation = FORMATIONS[state.formationIndex] ?? FORMATIONS[0];
  const used = new Set<string>();
  const out: CMPlayer[] = [];
  formation.slots.forEach((slot, i) => {
    const id = state.xiIds[i];
    let p = id ? state.squad.find(x => x.id === id) : undefined;
    if (!p || !isAvailable(p) || used.has(p.id)) {
      p = state.squad
        .filter(x => isAvailable(x) && !used.has(x.id))
        .sort((a, b) =>
          (slot.allowed.includes(b.position) ? 1 : 0) - (slot.allowed.includes(a.position) ? 1 : 0) ||
          b.rating - a.rating)[0];
    }
    if (p) {
      used.add(p.id);
      out.push(p);
    }
  });
  return out;
}

/** Match-day strength: XI ratings scaled by fitness + morale, plus form. */
function myMatchStrength(state: CareerState, xi: CMPlayer[]): number {
  if (!xi.length) return 40;
  const avg = xi.reduce((s, p) =>
    s + p.rating * (0.8 + 0.2 * (p.fitness / 100)) * (0.94 + 0.06 * (p.morale / 100)), 0) / xi.length;
  const formBonus = state.form.reduce((s, f) => s + (f === 'W' ? 0.7 : f === 'L' ? -0.7 : 0), 0);
  return avg + formBonus;
}

function scorerWeight(p: CMPlayer): number {
  const pos = p.position;
  const base =
    pos === 'ST' || pos === 'CF' ? 5 :
    pos === 'LW' || pos === 'RW' ? 3.6 :
    pos === 'CAM' ? 3 :
    pos === 'LM' || pos === 'RM' ? 2.2 :
    pos === 'CM' ? 1.6 :
    pos === 'CDM' ? 0.9 :
    pos === 'GK' ? 0.02 : 0.55;
  return base * Math.pow(p.rating / 70, 2);
}

function weightedPick(xi: CMPlayer[], weight: (p: CMPlayer) => number): CMPlayer | null {
  if (!xi.length) return null;
  const weights = xi.map(weight);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return pick(xi);
  let roll = Math.random() * total;
  for (let i = 0; i < xi.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return xi[i];
  }
  return xi[xi.length - 1];
}

/** Generates my scorers, bumps their season tallies, credits some assists. */
function generateMyScorers(state: CareerState, xi: CMPlayer[], goals: number): ScorerLine[] {
  const minutes = Array.from({ length: goals }, () => ri(1, 90)).sort((a, b) => a - b);
  const lines: ScorerLine[] = [];
  for (let g = 0; g < goals; g++) {
    const scorer = weightedPick(xi, scorerWeight);
    if (!scorer) break;
    lines.push({ name: scorer.name, minute: minutes[g] });
    const sq = state.squad.find(p => p.id === scorer.id);
    if (sq) {
      sq.seasonGoals += 1;
      sq.morale = clamp(sq.morale + 3, 5, 99);
    }
    if (Math.random() < 0.7) {
      const others = xi.filter(p => p.id !== scorer.id && p.position !== 'GK');
      const assister = weightedPick(others, p => scorerWeight(p) * 0.6 + 0.5);
      if (assister) {
        const aq = state.squad.find(p => p.id === assister.id);
        if (aq) aq.seasonAssists += 1;
      }
    }
  }
  return lines;
}

function generateOppScorers(opp: string, goals: number): ScorerLine[] {
  const minutes = Array.from({ length: goals }, () => ri(1, 90)).sort((a, b) => a - b);
  const oppPool = getPool().filter(p =>
    p.club === opp && (groupOf(p.position) === 'ATT' || groupOf(p.position) === 'MID'));
  const lines: ScorerLine[] = [];
  for (let g = 0; g < goals; g++) {
    const name = oppPool.length ? pick(oppPool).name : `${opp} No. ${ri(7, 11)}`;
    lines.push({ name, minute: minutes[g] });
  }
  return lines;
}

/** Weekly recovery tick: injuries count down, everyone else freshens up. */
function tickWeek(state: CareerState, playedIds: Set<string> | null): void {
  state.squad = state.squad.map(p => {
    const played = playedIds ? playedIds.has(p.id) : false;
    const fitness = clamp(p.fitness + (played ? -(16 + ri(0, 8)) : 24), 15, 100);
    const injuryWeeks = Math.max(0, p.injuryWeeks - 1);
    return { ...p, fitness, injuryWeeks };
  });
}

function applyResult(table: TableRow[], home: string, away: string, hg: number, ag: number): void {
  const h = table.find(r => r.club === home);
  const a = table.find(r => r.club === away);
  if (h) {
    h.gf += hg; h.ga += ag;
    if (hg > ag) { h.w += 1; h.pts += 3; }
    else if (hg === ag) { h.d += 1; h.pts += 1; }
    else h.l += 1;
  }
  if (a) {
    a.gf += ag; a.ga += hg;
    if (ag > hg) { a.w += 1; a.pts += 3; }
    else if (hg === ag) { a.d += 1; a.pts += 1; }
    else a.l += 1;
  }
}

interface MyFixture {
  competition: Competition;
  compLabel: string;
  opponent: string;
  home: boolean | null;
}

/** Resolves what my club is playing for a given entry (null if not involved). */
function fixtureFor(state: CareerState, entry: CalendarEntry): MyFixture | null {
  if (!entryInvolvesMe(state, entry)) return null;
  if (entry.type === 'league') {
    const pairs = roundPairs(state.leagueClubs, entry.round);
    const mine = pairs.find(([h, a]) => h === state.clubName || a === state.clubName);
    if (!mine) return null;
    const home = mine[0] === state.clubName;
    return {
      competition: 'league',
      compLabel: `World Super League · Round ${entry.round + 1}`,
      opponent: home ? mine[1] : mine[0],
      home,
    };
  }
  if (entry.type === 'cup' && entry.cupRound) {
    const opponent = state.cupDraw[entry.cupRound];
    if (!opponent) return null;
    return {
      competition: 'cup',
      compLabel: `Domestic Cup · ${CUP_LABELS[entry.cupRound]}`,
      opponent,
      home: cupVenue(entry.cupRound),
    };
  }
  if (entry.type === 'uclGroup' && state.uclGroup) {
    const idx = entry.round % 3;
    const opponent = state.uclGroup.opponents[idx];
    if (!opponent) return null;
    const home = entry.round < 3 ? idx !== 1 : idx === 1;
    return {
      competition: 'uclGroup',
      compLabel: `Champions League · Group MD${entry.round + 1}`,
      opponent,
      home,
    };
  }
  if (entry.type === 'uclKo' && entry.uclRound) {
    const opponent = state.uclDraw[entry.uclRound];
    if (!opponent) return null;
    return {
      competition: 'uclKo',
      compLabel: `Champions League · ${UCL_LABELS[entry.uclRound]}`,
      opponent,
      home: uclKoVenue(entry.uclRound),
    };
  }
  return null;
}

/**
 * Plays my match for this entry, mutating state (tables, squad, cups, board)
 * and returning the report. state must already be a private copy.
 */
function playMyMatch(state: CareerState, entry: CalendarEntry): MatchWeekReport {
  const fx = fixtureFor(state, entry)!;
  const club = clubByName(state.clubName) ?? CLUBS[0];
  const isKnockout = fx.competition === 'cup' || fx.competition === 'uclKo';

  const suspendedNow = state.squad.filter(p => p.suspendedMatches > 0).map(p => p.id);
  const xi = effectiveXI(state);
  const mine = myMatchStrength(state, xi);
  const oppS = strengthOf(state, fx.opponent);
  const ment = MENT_MOD[state.mentality] ?? MENT_MOD.balanced;
  const homeAtk = fx.home === true ? 0.28 : fx.home === false ? -0.12 : 0.08;
  const oppAtk = fx.home === true ? -0.12 : fx.home === false ? 0.28 : 0.08;

  let [myGoals, oppGoals] = simScore(mine, oppS, ment.atk + homeAtk, ment.def + oppAtk);

  let decidedBy: 'regular' | 'pens' = 'regular';
  let won = myGoals > oppGoals;
  let drawn = myGoals === oppGoals;
  let advanced = won;
  if (isKnockout && drawn) {
    decidedBy = 'pens';
    const penWin = Math.random() < clamp(0.5 + (mine - oppS) * 0.012, 0.2, 0.8);
    won = penWin;
    drawn = false;
    advanced = penWin;
  }

  const events: string[] = [];
  let trophyWon: string | null = null;

  const myScorers = generateMyScorers(state, xi, myGoals);
  const oppScorers = generateOppScorers(fx.opponent, oppGoals);
  const tally = new Map<string, number>();
  for (const sc of myScorers) tally.set(sc.name, (tally.get(sc.name) ?? 0) + 1);
  tally.forEach((count, name) => {
    if (count >= 3) events.push(`⚽ ${name} bagged a hat-trick!`);
  });
  if (decidedBy === 'pens') {
    events.push(won ? '🥅 Nerves of steel. You win the shootout.' : '🥅 Heartbreak from the spot: shootout defeat.');
  }

  /* ----- competition bookkeeping + other results ----- */
  const otherResults: OtherResult[] = [];
  let confDelta = won ? 4 : drawn ? 0.5 : -4.5;

  if (fx.competition === 'league') {
    const pairs = roundPairs(state.leagueClubs, entry.round);
    for (const [h, a] of pairs) {
      if (h === state.clubName || a === state.clubName) {
        const hg = fx.home ? myGoals : oppGoals;
        const ag = fx.home ? oppGoals : myGoals;
        applyResult(state.table, h, a, hg, ag);
      } else {
        const [hg, ag] = simAiMatch(state, h, a);
        applyResult(state.table, h, a, hg, ag);
        otherResults.push({ home: h, away: a, hg, ag });
      }
    }
    const pos = leaguePosition(state);
    confDelta += clamp((club.expectation - pos) * 0.25, -2, 2);
  }

  if (fx.competition === 'uclGroup' && state.uclGroup) {
    const group = state.uclGroup;
    const idx = entry.round % 3;
    const myHome = fx.home === true;
    applyResult(group.table,
      myHome ? state.clubName : fx.opponent,
      myHome ? fx.opponent : state.clubName,
      myHome ? myGoals : oppGoals,
      myHome ? oppGoals : myGoals);
    const others = group.opponents.filter((_, i) => i !== idx);
    if (others.length === 2) {
      const [hg, ag] = simAiMatch(state, others[0], others[1]);
      applyResult(group.table, others[0], others[1], hg, ag);
      otherResults.push({ home: others[0], away: others[1], hg, ag });
    }
    group.matchday = Math.min(6, group.matchday + 1);
    if (group.matchday >= 6) {
      const pos = sortedTable(group.table).findIndex(r => r.club === state.clubName) + 1;
      if (pos <= 2) {
        state.uclKoRound = 'QF';
        state.uclDraw.QF = drawUclKoOpponent(state);
        events.push(`⭐ Through to the Champions League quarter-finals. You'll face ${state.uclDraw.QF}.`);
        confDelta += 3;
      } else {
        state.uclKoRound = 'out';
        events.push('💤 Out of the Champions League at the group stage.');
        confDelta -= 4;
      }
    }
  }

  if (fx.competition === 'cup') {
    if (advanced) {
      const i = CUP_ORDER.indexOf(entry.cupRound!);
      if (entry.cupRound === 'F') {
        state.cupRound = 'won';
        trophyWon = 'Domestic Cup';
        state.trophies.push({ name: 'Domestic Cup', emoji: '🏅', season: state.season });
        events.push('🏅 The Domestic Cup is yours!');
        confDelta += 12;
      } else {
        const next = CUP_ORDER[i + 1];
        state.cupRound = next;
        state.cupDraw[next] = drawCupOpponent(state);
        events.push(`🎟️ Into the cup ${CUP_LABELS[next].toLowerCase()}, drawn against ${state.cupDraw[next]}.`);
        confDelta += 2;
      }
    } else {
      state.cupRound = 'out';
      events.push('❌ Knocked out of the Domestic Cup.');
      confDelta -= entry.cupRound === 'R16' ? 3 : 4.5;
    }
  }

  if (fx.competition === 'uclKo') {
    if (advanced) {
      const i = UCL_ORDER.indexOf(entry.uclRound!);
      if (entry.uclRound === 'F') {
        state.uclKoRound = 'won';
        trophyWon = 'Champions League';
        state.trophies.push({ name: 'Champions League', emoji: '⭐', season: state.season });
        events.push('⭐ CHAMPIONS OF EUROPE!');
        confDelta += 18;
      } else {
        const next = UCL_ORDER[i + 1];
        state.uclKoRound = next;
        state.uclDraw[next] = drawUclKoOpponent(state);
        events.push(`⭐ Into the Champions League ${UCL_LABELS[next].toLowerCase()}. ${state.uclDraw[next]} await.`);
        confDelta += 4;
      }
    } else {
      state.uclKoRound = 'out';
      events.push(`❌ Champions League run ends at the ${UCL_LABELS[entry.uclRound!].toLowerCase()}.`);
      confDelta -= 4;
    }
  }

  /* ----- squad after-effects ----- */
  const moraleShift = won ? 5 : drawn ? -1 : -6;
  state.squad = state.squad.map(p => ({ ...p, morale: clamp(p.morale + moraleShift, 5, 99) }));

  for (const id of suspendedNow) {
    const p = state.squad.find(x => x.id === id);
    if (p) p.suspendedMatches = Math.max(0, p.suspendedMatches - 1);
  }

  if (xi.length && Math.random() < 0.22) {
    const victim = pick(xi);
    const p = state.squad.find(x => x.id === victim.id);
    if (p) {
      p.injuryWeeks = ri(1, 5);
      events.push(`🩹 ${p.name} limped off, out for ~${p.injuryWeeks} week${p.injuryWeeks > 1 ? 's' : ''}.`);
    }
  }
  if (xi.length && Math.random() < 0.08) {
    const hothead = pick(xi.filter(p => p.position !== 'GK').length ? xi.filter(p => p.position !== 'GK') : xi);
    const p = state.squad.find(x => x.id === hothead.id);
    if (p && p.injuryWeeks === 0) {
      p.suspendedMatches = ri(1, 2);
      events.push(`🟥 ${p.name} was sent off, suspended for ${p.suspendedMatches} match${p.suspendedMatches > 1 ? 'es' : ''}.`);
    }
  }

  const res: FormResult = won ? 'W' : drawn ? 'D' : 'L';
  state.form = [...state.form, res].slice(-5);
  state.careerStats = {
    played: state.careerStats.played + 1,
    wins: state.careerStats.wins + (won ? 1 : 0),
    draws: state.careerStats.draws + (drawn ? 1 : 0),
    losses: state.careerStats.losses + (!won && !drawn ? 1 : 0),
  };

  /* ----- board confidence ----- */
  const patience = club.tier === 1 ? 1.3 : club.tier === 2 ? 1.15 : club.tier === 3 ? 1 : 0.85;
  if (confDelta < 0) confDelta *= patience;
  confDelta = Math.round(confDelta * 10) / 10;
  state.boardConfidence = clamp(state.boardConfidence + confDelta, 0, 100);
  if (state.boardConfidence <= 0) {
    state.sacked = true;
    events.push('📉 The board has seen enough. You are relieved of your duties.');
  } else if (state.boardConfidence < 22) {
    events.push('📉 The board is running out of patience. Results, now.');
  }

  tickWeek(state, new Set(xi.map(p => p.id)));
  state.transferWindow = null;

  const iAmHome = fx.home !== false; // neutral finals list us first
  return {
    competition: fx.competition,
    compLabel: fx.compLabel,
    home: iAmHome ? state.clubName : fx.opponent,
    away: iAmHome ? fx.opponent : state.clubName,
    homeGoals: iAmHome ? myGoals : oppGoals,
    awayGoals: iAmHome ? oppGoals : myGoals,
    won,
    drawn,
    decidedBy,
    myScorers,
    oppScorers,
    events,
    trophyWon,
    myPosition: leaguePosition(state),
    confidence: state.boardConfidence,
    confidenceDelta: confDelta,
    otherResults,
  };
}

/* ================================================================== */
/* Career lifecycle                                                   */
/* ================================================================== */

export function startCareer(clubName: string): CareerState {
  const club = clubByName(clubName) ?? CLUBS[0];
  const squad = buildSquad(club.name);
  const leagueClubs = shuffle(CLUBS.map(c => c.name));
  const state: CareerState = {
    saveVersion: SAVE_VERSION,
    clubName: club.name,
    season: 1,
    week: 0,
    budget: club.budget,
    boardConfidence: 60,
    sacked: false,
    squad,
    xiIds: [],
    formationIndex: 0,
    mentality: 'balanced',
    leagueClubs,
    table: leagueClubs.map(emptyRow),
    form: [],
    calendar: buildCalendar(),
    clubStrengths: genClubStrengths(),
    transferWindow: 'summer',
    aiHeadlines: [],
    goneNames: [],
    seasonSignings: [],
    cupRound: 'R16',
    cupDraw: {},
    uclGroup: initUclGroup(club.tier <= 2, club.name),
    uclKoRound: null,
    uclDraw: {},
    trophies: [],
    history: [],
    careerStats: { played: 0, wins: 0, draws: 0, losses: 0 },
    pendingSummary: null,
  };
  state.cupDraw.R16 = drawCupOpponent(state);
  state.xiIds = autoPickXI(state.squad, FORMATIONS[state.formationIndex]);
  generateHeadlines(state);
  return state;
}

/**
 * Advances the calendar: skips entries that no longer involve us (cup/UCL
 * ties after elimination), opens the January window, or plays my next match.
 * Never mutates the input state.
 */
export function playNextEntry(career: CareerState): PlayResult {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  while (state.week < state.calendar.length) {
    const entry = state.calendar[state.week];
    if (entry.type === 'window') {
      state.week += 1;
      tickWeek(state, null);
      state.transferWindow = 'january';
      generateHeadlines(state);
      return { state, kind: 'window' };
    }
    if (!entryInvolvesMe(state, entry) || !fixtureFor(state, entry)) {
      state.week += 1;
      tickWeek(state, null);
      continue;
    }
    const report = playMyMatch(state, entry);
    state.week += 1;
    return { state, kind: 'match', report };
  }
  return { state, kind: 'seasonOver' };
}

/** Preview of the next thing on the calendar that involves my club. */
export function nextFixture(career: CareerState): NextFixtureInfo {
  for (let w = career.week; w < career.calendar.length; w++) {
    const entry = career.calendar[w];
    if (entry.type === 'window') return { kind: 'window' };
    const fx = fixtureFor(career, entry);
    if (fx) {
      return {
        kind: 'match',
        competition: fx.competition,
        compLabel: fx.compLabel,
        opponent: fx.opponent,
        home: fx.home,
        oppStrength: Math.round(strengthOf(career, fx.opponent)),
      };
    }
  }
  return { kind: 'seasonOver' };
}

/** min(130, current league points + 10 per trophy won this season). */
export function currentSeasonScore(career: CareerState): number {
  const row = career.table.find(r => r.club === career.clubName);
  const pts = row ? row.pts : 0;
  const seasonTrophies = career.trophies.filter(t => t.season === career.season).length;
  return Math.min(130, pts + seasonTrophies * 10);
}

const VERDICTS: Record<'A' | 'B' | 'C' | 'D' | 'F', string[]> = {
  A: [
    'A sensational season. The fans are painting murals of you.',
    'The board is thrilled. Statues have been commissioned.',
  ],
  B: [
    'Solid work. The board is satisfied and the fans are onside.',
    'Expectations met. Quietly impressive management.',
  ],
  C: [
    'Acceptable, just. The board expects more next season.',
    'A middling year: you survive, but the leash is shorter.',
  ],
  D: [
    'Well below expectations. The board is openly frustrated.',
    'A poor season. One more like that and you are gone.',
  ],
  F: [
    'A disaster from August to May. The fans want blood.',
    'Catastrophic. Only the compensation clause saved your job this long.',
  ],
};

/**
 * Wraps up the season: final standings, league title check, verdict, awards,
 * job offers, history entry. Stores the summary on state.pendingSummary so a
 * reload mid-review resumes cleanly. Does not mutate the input.
 */
export function finishSeason(career: CareerState): { state: CareerState; summary: SeasonSummary } {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  const club = clubByName(state.clubName) ?? CLUBS[0];
  const table = sortedTable(state.table);
  const myRow = table.find(r => r.club === state.clubName) ?? emptyRow(state.clubName);
  const position = Math.max(1, table.findIndex(r => r.club === state.clubName) + 1);

  if (position === 1 && !state.trophies.some(t => t.season === state.season && t.name === 'League Title')) {
    state.trophies.push({ name: 'League Title', emoji: '🏆', season: state.season });
  }
  const seasonTrophies = state.trophies.filter(t => t.season === state.season).map(t => t.name);
  const overshoot = club.expectation - position;

  let verdictGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (seasonTrophies.includes('Champions League') || position === 1 || overshoot >= 3 || seasonTrophies.length >= 2) {
    verdictGrade = 'A';
  } else if (overshoot >= 0 || seasonTrophies.length >= 1) {
    verdictGrade = 'B';
  } else if (overshoot >= -3) {
    verdictGrade = 'C';
  } else if (overshoot >= -6) {
    verdictGrade = 'D';
  } else {
    verdictGrade = 'F';
  }
  const verdict = pick(VERDICTS[verdictGrade]);

  const byGoals = [...state.squad].sort((a, b) => b.seasonGoals - a.seasonGoals);
  const byAssists = [...state.squad].sort((a, b) => b.seasonAssists - a.seasonAssists);
  const topScorer = byGoals[0] && byGoals[0].seasonGoals > 0
    ? { name: byGoals[0].name, goals: byGoals[0].seasonGoals }
    : null;
  const topAssister = byAssists[0] && byAssists[0].seasonAssists > 0
    ? { name: byAssists[0].name, assists: byAssists[0].seasonAssists }
    : null;

  const offers: JobOffer[] = [];
  if (overshoot >= 2 || seasonTrophies.length > 0) {
    const suitors = shuffle(CLUBS.filter(c => c.tier < club.tier && c.name !== state.clubName));
    for (const s of suitors.slice(0, ri(1, 2))) {
      offers.push({
        club: s.name,
        blurb: `${TIER_INFO[s.tier].emoji} ${TIER_INFO[s.tier].label} club · ${money(s.budget)} budget · board expects Top ${s.expectation}`,
      });
    }
  }

  const summary: SeasonSummary = {
    season: state.season,
    club: state.clubName,
    position,
    points: myRow.pts,
    wins: myRow.w,
    draws: myRow.d,
    losses: myRow.l,
    gf: myRow.gf,
    ga: myRow.ga,
    verdictGrade,
    verdict,
    champion: table[0] ? table[0].club : state.clubName,
    trophies: seasonTrophies,
    topScorer,
    topAssister,
    qualifiedUcl: position <= 4,
    signings: state.seasonSignings,
    offers,
    seasonScore: Math.min(130, myRow.pts + seasonTrophies.length * 10),
  };

  state.history = [
    ...state.history.filter(h => h.season !== state.season),
    { season: state.season, club: state.clubName, position, points: myRow.pts, trophies: seasonTrophies },
  ];
  state.pendingSummary = summary;
  return { state, summary };
}

/** One season older: rating drift, fresh legs, wiped season stats. */
function agePlayer(p: CMPlayer): CMPlayer {
  const age = p.age + 1;
  let drift = 0;
  if (age <= 20) drift = ri(1, 3);
  else if (age <= 23) drift = ri(0, 2);
  else if (age >= 33) drift = -ri(1, 3);
  else if (age >= 30) drift = -ri(0, 2);
  return {
    ...p,
    age,
    rating: clamp(p.rating + drift, 40, 95),
    fitness: 100,
    morale: 70,
    injuryWeeks: 0,
    suspendedMatches: 0,
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

/**
 * Rolls the career into the next season — optionally at a new club if a job
 * offer was accepted. Ages the squad, runs the youth intake, resets the
 * competitions and reopens the summer window.
 */
export function startNextSeason(career: CareerState, acceptOfferClub?: string): CareerState {
  const summary = career.pendingSummary;
  const prevPos = summary ? summary.position : Math.max(1, leaguePosition(career));
  const moving = !!(acceptOfferClub && clubByName(acceptOfferClub) && acceptOfferClub !== career.clubName);
  const clubName = moving && acceptOfferClub ? acceptOfferClub : career.clubName;
  const club = clubByName(clubName) ?? CLUBS[0];
  const season = career.season + 1;

  let squad: CMPlayer[];
  if (moving) {
    squad = buildSquad(clubName);
  } else {
    squad = career.squad.map(agePlayer).filter(p => p.age < 38 || p.rating >= 70);
    const intake = ri(2, 3);
    for (let i = 0; i < intake; i++) {
      squad.push(makeYouth(pick([...POS_DEF, ...POS_MID, ...POS_ATT, 'GK' as Position])));
    }
    squad = ensureSquadCoverage(squad);
  }

  const seasonTrophyCount = career.trophies.filter(t => t.season === career.season).length;
  const budget = moving
    ? Math.round(club.budget * 1.1)
    : Math.max(10, Math.round(club.budget + (club.expectation - prevPos) * 2 + seasonTrophyCount * 12));
  const qualifiedUcl = summary ? summary.qualifiedUcl : prevPos <= 4;
  const leagueClubs = shuffle(CLUBS.map(c => c.name));

  const state: CareerState = {
    ...JSON.parse(JSON.stringify(career)) as CareerState,
    clubName,
    season,
    week: 0,
    budget,
    boardConfidence: moving ? 62 : clamp(55 + (club.expectation - prevPos) * 1.5, 40, 78),
    sacked: false,
    squad,
    xiIds: [],
    leagueClubs,
    table: leagueClubs.map(emptyRow),
    form: [],
    calendar: buildCalendar(),
    clubStrengths: genClubStrengths(),
    transferWindow: 'summer',
    aiHeadlines: [],
    goneNames: [],
    seasonSignings: [],
    cupRound: 'R16',
    cupDraw: {},
    uclGroup: initUclGroup(qualifiedUcl, clubName),
    uclKoRound: null,
    uclDraw: {},
    pendingSummary: null,
  };
  state.cupDraw.R16 = drawCupOpponent(state);
  state.xiIds = autoPickXI(state.squad, FORMATIONS[state.formationIndex] ?? FORMATIONS[0]);
  generateHeadlines(state);
  return state;
}

/* ================================================================== */
/* Persistence (localStorage)                                         */
/* ================================================================== */

export function saveCareer(career: CareerState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(career));
  } catch {
    /* quota/private mode — the run just won't persist */
  }
}

export function loadCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerState;
    if (
      !parsed ||
      parsed.saveVersion !== SAVE_VERSION ||
      typeof parsed.clubName !== 'string' ||
      !Array.isArray(parsed.squad) ||
      !Array.isArray(parsed.calendar) ||
      !Array.isArray(parsed.xiIds) ||
      !Array.isArray(parsed.table)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCareer(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}


