/**
 * Round 943: the books for every GM seat. The owner, 2026-10-02: "a realistic
 * rebuild or GM position". A real front office runs a business beside the
 * cap, and until this round the only money in the four GM sims beyond the
 * cap was the NBA's tax bill.
 *
 * The model is Club Manager's books (src/lib/clubManagerFinances.ts: the
 * season ledger, the ticket policy, projectFinances), read and NOT edited.
 * This module is sport neutral: a sport comes in as a descriptor (how many
 * periods a season has, how many home games), and every money figure is a
 * share of that league's cap, which the engines already carry. Nothing here
 * is a real club's revenue and nothing claims to be.
 *
 * Two accounts, kept apart on purpose:
 *
 *   THE KITTY. The franchise's money since you took the job. Every line of
 *   the ledger moves it by exactly its own amount the moment it is booked,
 *   so a closed season balances to the thousand dollars: income less costs
 *   equals the change in the kitty. All amounts are whole thousands of
 *   dollars ($k) inside, so the arithmetic is exact, and read in $M outside.
 *
 *   THE OPERATIONS BUDGET. What ownership lets you spend on the building and
 *   the people in it this season: staff, scouting, facility upkeep and new
 *   facilities. It is set at each summer from the market tier and ownership's
 *   trust (foOwnerMandate), and what you do not spend carries. It is NOT the
 *   salary cap and it never buys a player: payroll, tax and dead money are
 *   the cap's business and are charged to the kitty without touching it.
 *
 * Market tier comes from the opening payrolls the engines already compute
 * (top third big, middle third middle, bottom third small), so no market
 * size is typed for any real franchise.
 *
 * The ticket price is the business lever, three tiers mirroring Club
 * Manager's TICKET_TIERS numbers (scripts/simGmBooks.mjs fences the two
 * together), moving the gate's mood slowly the way a crowd moves, with
 * ownership's reaction narrated, never quoted.
 */
import type { FacilityPack, GmFacilitiesState } from '@/lib/gmFacilities';
import { facilityDef, facilityUpgradeCost, startUpgrade, upkeepPerPeriod } from '@/lib/gmFacilities';
import type { MarketTier } from '@/lib/gmFacilities';

export type { MarketTier };

export interface GmBooksSport {
  id: string;
  /** Ticks in a regular season: 18 weeks in the NFL, 20 rounds in the NBA and NHL, 27 in MLB. */
  periods: number;
  /** Regular season home games. */
  homeGames: number;
  /** What a tick is called on screen. */
  period: string;
}

/* The engines' own season shapes: frontOffice REGULAR_WEEKS 17 plus a bye,
   NBA_ROUNDS x GAMES_PER_ROUND = 80, NHL_FO_ROUNDS x NHL_GAMES_PER_ROUND = 80,
   MLB_ROUNDS x MLB_GAMES_PER_ROUND = 162, half of each at home (the NFL's odd
   game makes 8 or 9; the books use 8.5 as the season's even split). */
export const GM_BOOKS_SPORTS: Record<string, GmBooksSport> = {
  nfl: { id: 'nfl', periods: 18, homeGames: 8.5, period: 'week' },
  nba: { id: 'nba', periods: 20, homeGames: 40, period: 'round' },
  nhl: { id: 'nhl', periods: 20, homeGames: 40, period: 'round' },
  mlb: { id: 'mlb', periods: 27, homeGames: 81, period: 'round' },
};

export type GmTicketTier = 0 | 1 | 2;

/** Club Manager's TICKET_TIERS numbers, kept equal by scripts/simGmBooks.mjs. */
export const GM_TICKET_TIERS = [
  { label: 'Fair prices', emoji: '\u{1F39F}️', priceMult: 0.8, crowdMult: 1.06, blurb: 'Cheaper seats, fuller building, a louder night.' },
  { label: 'Standard', emoji: '\u{1F3AB}', priceMult: 1.0, crowdMult: 1.0, blurb: 'The going rate. Nobody writes in about it.' },
  { label: 'Premium', emoji: '\u{1F4BC}', priceMult: 1.3, crowdMult: 0.91, blurb: 'More per seat, a few empty ones up top.' },
] as const;

/** All money in whole thousands of dollars ($k). */
export interface GmLedger {
  periods: number;
  homeGames: number;
  playoffHomeGames: number;
  /* income */
  gate: number;
  localMedia: number;
  leagueShare: number;
  playoffGate: number;
  /* costs */
  payroll: number;
  tax: number;
  deadMoney: number;
  staff: number;
  scouting: number;
  upkeep: number;
  facilities: number;
  /** The kitty when the season opened, so the close can prove the balance. */
  kittyAtOpen: number;
}

export interface GmClosedLedger extends GmLedger {
  income: number;
  spend: number;
  result: number;
  kittyAtClose: number;
}

export interface GmBooks {
  v: number;
  sport: string;
  marketTier: MarketTier;
  ticketTier: GmTicketTier;
  /** How full the building is running, 0 to 100, 50 is neutral. Drives the gate and nothing else. */
  gateMood: number;
  /** $k since you took the job. */
  kitty: number;
  /** $k ownership set for this season's operations. */
  opsBudget: number;
  /** $k of last season's operations budget left unspent and carried. */
  opsCarry: number;
  season: GmLedger;
  lastSeason: GmClosedLedger | null;
}

export const GM_BOOKS_VERSION = 1;
export const GATE_MOOD_START = 50;

/* Every income line as a share of the league's cap, a game assumption and
   not a reading of any real league's accounts. A middle market club on
   standard prices at a level gate takes 1.2 caps a season; the payroll it
   is allowed is about one cap, so a run of the mill season makes a little
   money and a big market makes more, which is the shape the brief asks for. */
export const LEAGUE_SHARE = 0.6;
export const LOCAL_MEDIA_SHARE = 0.25;
export const GATE_SHARE = 0.35;
/** A playoff home game takes half again a regular season gate. */
export const PLAYOFF_GATE_MULT = 1.5;
/** Big, middle, small. */
export const MARKET_MULT: Record<MarketTier, number> = { 1: 1.5, 2: 1.0, 3: 0.65 };
/** Operations budget as a share of the cap, by market. */
export const OPS_SHARE: Record<MarketTier, number> = { 1: 0.12, 2: 0.09, 3: 0.065 };
/** Of the operations budget: front office staff wages, and scouts on the road. */
export const STAFF_SHARE = 0.35;
export const SCOUTING_SHARE = 0.1;
/** Trust at which the budget reads exactly its market share (foOwnerMandate FO_TRUST_START). */
export const OPS_TRUST_PIVOT = 60;

const TICKET_MOOD = [8, 0, -8];
const MOOD_DRIFT = 0.15;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const round1 = (n: number): number => Math.round(n * 10) / 10;
/** $M to whole $k. */
export const toK = (m: number): number => Math.round(m * 1000);
/** Whole $k to $M, for the screen. */
export const toM = (k: number): number => Math.round(k) / 1000;
const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/**
 * Market tier from the opening payrolls the engine already computes: the
 * clubs paying more than you count against you, the top third is big, the
 * bottom third small. Ties share the better tier.
 */
export function marketTierFromPayrolls(mine: number, all: number[]): MarketTier {
  const n = all.length;
  if (n === 0) return 2;
  const above = all.filter(p => p > mine).length;
  if (above < n / 3) return 1;
  if (above < (2 * n) / 3) return 2;
  return 3;
}

/** Ownership's operations budget in $k: market share of the cap, 0.7x at no trust to 1.2x at full. */
export function opsBudgetFor(tier: MarketTier, trust: number, cap: number): number {
  const t = clamp(Number.isFinite(trust) ? trust : OPS_TRUST_PIVOT, 0, 100);
  const mult = 1 + 0.5 * ((t - OPS_TRUST_PIVOT) / 100);
  return toK(OPS_SHARE[tier] * cap * mult);
}

export function emptyGmLedger(kittyAtOpen: number): GmLedger {
  return {
    periods: 0, homeGames: 0, playoffHomeGames: 0,
    gate: 0, localMedia: 0, leagueShare: 0, playoffGate: 0,
    payroll: 0, tax: 0, deadMoney: 0, staff: 0, scouting: 0, upkeep: 0, facilities: 0,
    kittyAtOpen,
  };
}

export function newGmBooks(sport: GmBooksSport, tier: MarketTier, trust: number, cap: number): GmBooks {
  return {
    v: GM_BOOKS_VERSION, sport: sport.id, marketTier: tier, ticketTier: 1, gateMood: GATE_MOOD_START,
    kitty: 0, opsBudget: opsBudgetFor(tier, trust, cap), opsCarry: 0,
    season: emptyGmLedger(0), lastSeason: null,
  };
}

const COUNT_KEYS = ['periods', 'homeGames', 'playoffHomeGames'] as const;
export const GM_INCOME_KEYS = ['gate', 'localMedia', 'leagueShare', 'playoffGate'] as const;
export const GM_COST_KEYS = ['payroll', 'tax', 'deadMoney', 'staff', 'scouting', 'upkeep', 'facilities'] as const;
export type GmIncomeKey = typeof GM_INCOME_KEYS[number];
export type GmCostKey = typeof GM_COST_KEYS[number];

function isLedger(l: unknown): l is GmLedger {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return false;
  const o = l as Record<string, unknown>;
  return [...COUNT_KEYS, ...GM_INCOME_KEYS, ...GM_COST_KEYS].every(k => isInt(o[k]) && (o[k] as number) >= 0)
    && isInt(o.kittyAtOpen);
}

function isClosed(l: unknown): l is GmClosedLedger {
  if (!isLedger(l)) return false;
  const o = l as unknown as Record<string, unknown>;
  return ['income', 'spend', 'result', 'kittyAtClose'].every(k => isInt(o[k]));
}

/** True when the block is exactly the shape this round writes. */
export function isValidGmBooks(b: unknown): b is GmBooks {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
  const o = b as Record<string, unknown>;
  return o.v === GM_BOOKS_VERSION
    && typeof o.sport === 'string' && !!GM_BOOKS_SPORTS[o.sport]
    && (o.marketTier === 1 || o.marketTier === 2 || o.marketTier === 3)
    && (o.ticketTier === 0 || o.ticketTier === 1 || o.ticketTier === 2)
    && typeof o.gateMood === 'number' && Number.isFinite(o.gateMood) && o.gateMood >= 0 && o.gateMood <= 100
    && isInt(o.kitty) && isInt(o.opsBudget) && o.opsBudget >= 0 && isInt(o.opsCarry) && o.opsCarry >= 0
    && isLedger(o.season) && (o.lastSeason === null || isClosed(o.lastSeason));
}

/** The books for this seat, fresh when the block is missing or mangled. Only this block resets. */
export function gmBooksOf(b: unknown, sport: GmBooksSport, tier: MarketTier, trust: number, cap: number): GmBooks {
  return isValidGmBooks(b) && b.sport === sport.id ? b : newGmBooks(sport, tier, trust, cap);
}

/* ---------- what the engine hands the books each tick ---------- */

export interface GmBooksContext {
  sport: GmBooksSport;
  /** This season's cap in $M. */
  cap: number;
  /** The roster's salaries in $M, WITHOUT dead money (payrollWithDeadCap adds it; pass the two apart). */
  payroll: number;
  /** This season's dead money in $M. */
  deadMoney: number;
  /** The seat's buildings, when it has them. */
  facilities?: { pack: FacilityPack; state: GmFacilitiesState };
  /** The league's money against its opening season (cap / opening cap), so a building costs the same share later. */
  scale?: number;
}

/** A season total split so the periods add up to it exactly: the share of period i. */
function periodShare(totalK: number, i: number, periods: number): number {
  return Math.floor((totalK * (i + 1)) / periods) - Math.floor((totalK * i) / periods);
}

function cloneBooks(b: GmBooks): GmBooks {
  return { ...b, season: { ...b.season }, lastSeason: b.lastSeason ? { ...b.lastSeason } : null };
}

/** Book one line: the ledger and the kitty move together, by the same whole $k. */
function book(b: GmBooks, key: GmIncomeKey | GmCostKey, k: number): void {
  const amount = Math.max(0, Math.round(k));
  if (amount === 0) return;
  b.season[key] += amount;
  b.kitty += (GM_INCOME_KEYS as readonly string[]).includes(key) ? amount : -amount;
}

/** The gate's crowd factor from its mood: 0.9 on the floor, exactly 1 at 50, 1.1 on the ceiling. */
export function gateCrowdMult(b: GmBooks): number {
  return 0.9 + 0.2 * (b.gateMood / 100);
}

/** One regular season home gate in $k at today's price and mood. */
export function homeGateK(b: GmBooks, ctx: GmBooksContext): number {
  const t = GM_TICKET_TIERS[b.ticketTier];
  const perGame = (GATE_SHARE * ctx.cap * MARKET_MULT[b.marketTier]) / ctx.sport.homeGames;
  return toK(perGame * t.priceMult * t.crowdMult * gateCrowdMult(b));
}

/** Where the gate's mood is heading: the price and the last five results. Never printed as a word. */
export function gateMoodTarget(b: GmBooks, form: readonly string[]): number {
  const ticket = TICKET_MOOD[b.ticketTier] ?? 0;
  const recent = form.slice(-5).reduce((s, f) => s + (f === 'W' ? 2 : f === 'L' ? -2 : 0), 0);
  return clamp(GATE_MOOD_START + ticket + recent, 0, 100);
}

/** Running costs a period in $k off the ops budget: [staff, scouting, upkeep]. */
export function opsRatesK(b: GmBooks, ctx: GmBooksContext, i: number): [number, number, number] {
  const P = ctx.sport.periods;
  const staff = periodShare(Math.round(b.opsBudget * STAFF_SHARE), i, P);
  const scoutsBase = periodShare(Math.round(b.opsBudget * SCOUTING_SHARE), i, P);
  let dept = 0, upkeep = 0;
  if (ctx.facilities) {
    const { pack, state } = ctx.facilities;
    const scale = ctx.scale ?? 1;
    dept = facilityDef(pack, 'scouting') ? toK(upkeepPerPeriod(pack, state, 'scouting', scale)) : 0;
    upkeep = toK(upkeepPerPeriod(pack, state, undefined, scale)) - dept;
  }
  return [staff, scoutsBase + dept, upkeep];
}

/**
 * One regular season period: the money that runs every period, the home
 * gates played in it, and the gate's mood drifting toward where the price
 * and the form put it. Pure; a period past the season's last books nothing
 * but the gates, so a stray extra tick cannot charge a thirteenth month.
 */
export function tickGmBooks(books: GmBooks, ctx: GmBooksContext, form: readonly string[], homeGames: number): GmBooks {
  const b = cloneBooks(books);
  const s = b.season;
  const P = ctx.sport.periods;
  if (s.periods < P) {
    const i = s.periods;
    book(b, 'leagueShare', periodShare(toK(LEAGUE_SHARE * ctx.cap), i, P));
    book(b, 'localMedia', periodShare(toK(LOCAL_MEDIA_SHARE * ctx.cap * MARKET_MULT[b.marketTier]), i, P));
    book(b, 'payroll', periodShare(toK(ctx.payroll), i, P));
    book(b, 'deadMoney', periodShare(toK(ctx.deadMoney), i, P));
    const [staff, scouting, upkeep] = opsRatesK(b, ctx, i);
    book(b, 'staff', staff);
    book(b, 'scouting', scouting);
    book(b, 'upkeep', upkeep);
    s.periods += 1;
  }
  const games = Math.max(0, Math.round(homeGames));
  for (let g = 0; g < games; g++) book(b, 'gate', homeGateK(b, ctx));
  s.homeGames += games;
  b.gateMood = clamp(round1(b.gateMood + (gateMoodTarget(b, form) - b.gateMood) * MOOD_DRIFT), 0, 100);
  return b;
}

/** A playoff home game: half again a regular gate at today's price and mood. */
export function notePlayoffHomeGame(books: GmBooks, ctx: GmBooksContext): GmBooks {
  const b = cloneBooks(books);
  book(b, 'playoffGate', Math.round(homeGateK(b, ctx) * PLAYOFF_GATE_MULT));
  b.season.playoffHomeGames += 1;
  return b;
}

/** A luxury tax cheque in $M (the NBA's today, any sport with a tax line tomorrow). */
export function noteTax(books: GmBooks, billM: number): GmBooks {
  const b = cloneBooks(books);
  book(b, 'tax', toK(Math.max(0, billM)));
  return b;
}

/* ---------- the operations budget ---------- */

/** $k of the operations budget spent so far this season. */
export function opsSpentK(b: GmBooks): number {
  const s = b.season;
  return s.staff + s.scouting + s.upkeep + s.facilities;
}

/**
 * $k free to start a building today: the budget and the carry, less what is
 * spent, less the staff, scouts and upkeep the rest of the season will still
 * cost at today's levels. Never below zero.
 */
export function opsFreeK(b: GmBooks, ctx: GmBooksContext): number {
  let committed = 0;
  for (let i = b.season.periods; i < ctx.sport.periods; i++) {
    const [staff, scouting, upkeep] = opsRatesK(b, ctx, i);
    committed += staff + scouting + upkeep;
  }
  return Math.max(0, b.opsBudget + b.opsCarry - opsSpentK(b) - committed);
}

/**
 * Start the next level of a building out of the operations budget. The cost
 * is booked as facilities spend the moment work starts. Null when the
 * facility engine refuses (busy site, top level, not enough free budget).
 */
export function buyFacility(
  books: GmBooks, ctx: GmBooksContext, id: string,
): { books: GmBooks; facilities: GmFacilitiesState; line: string } | null {
  if (!ctx.facilities) return null;
  const { pack, state } = ctx.facilities;
  const started = startUpgrade(pack, state, id, toM(opsFreeK(books, ctx)), ctx.scale ?? 1);
  if (!started) return null;
  const b = cloneBooks(books);
  book(b, 'facilities', toK(started.cost));
  return { books: b, facilities: started.state, line: started.line };
}

/** The price of the next level in $M, for the screen. */
export function nextFacilityCost(ctx: GmBooksContext, id: string): number | null {
  if (!ctx.facilities) return null;
  return facilityUpgradeCost(ctx.facilities.pack, ctx.facilities.state, id, ctx.scale ?? 1);
}

/* ---------- the ticket price, with ownership's reaction narrated ---------- */

export function ticketReactionGm(tier: GmTicketTier): { crowd: string; owner: string } {
  if (tier === 0) return { crowd: 'The building fills up over the weeks.', owner: 'Ownership takes a point of trust off the day you set it: cheaper seats are money left on the table.' };
  if (tier === 2) return { crowd: 'A few seats go empty over the weeks.', owner: 'Ownership adds a point of trust the day you set it: they like the bigger take a seat.' };
  return { crowd: 'Nobody notices.', owner: 'Ownership has no view.' };
}

/**
 * Change the price. The gate's mood jumps a little at once and then drifts;
 * ownership's trust moves a point, never below 1, because zero is the sack
 * and a price change is not a sacking (Club Manager's floor, same reason).
 */
export function setGmTicketTier(books: GmBooks, tier: GmTicketTier, trust: number): { books: GmBooks; trust: number; line: string | null } {
  if (tier === books.ticketTier) return { books, trust, line: null };
  const b = cloneBooks(books);
  b.ticketTier = tier;
  b.gateMood = clamp(round1(b.gateMood + (tier === 0 ? 3 : tier === 2 ? -4 : 0)), 0, 100);
  const delta = tier === 0 ? -1 : tier === 2 ? 1 : 0;
  const next = delta < 0 ? clamp(trust + delta, 1, 100) : clamp(trust + delta, 0, 100);
  const t = GM_TICKET_TIERS[tier];
  const line = delta === 0
    ? `${t.emoji} Tickets back to ${t.label.toLowerCase()}. Ownership has no view.`
    : `${t.emoji} Tickets set to ${t.label.toLowerCase()}. Ownership ${delta > 0 ? 'liked the bigger take a seat' : 'noticed the money left on the table'}: trust ${delta > 0 ? '+1' : '-1'}.`;
  return { books: b, trust: next, line };
}

/* ---------- the projection, Club Manager's projectFinances shape ---------- */

export interface GmProjectionLine {
  id: string;
  label: string;
  /** $M to date. */
  actual: number;
  /** $M projected to season end. */
  projected: number;
  /** True for the lines the operations budget pays. */
  ops: boolean;
  note?: string;
}

export interface GmFinanceProjection {
  periodsPlayed: number;
  periodsLeft: number;
  homeGamesLeft: number;
  income: GmProjectionLine[];
  spend: GmProjectionLine[];
  incomeActual: number;
  incomeProjected: number;
  spendActual: number;
  spendProjected: number;
  resultActual: number;
  resultProjected: number;
  opsBudget: number;
  opsFree: number;
  caveat: string;
}

/**
 * Actual to date plus the rest of the regular season at today's rates: the
 * same split of each season total the ticks use, the home games the season
 * still owes at today's gate, and the operations lines at today's levels.
 * Playoff gates and a tax bill are booked when they happen and never
 * projected, because nobody knows them yet, and the caveat says so.
 */
export function projectGmBooks(b: GmBooks, ctx: GmBooksContext): GmFinanceProjection {
  const s = b.season;
  const P = ctx.sport.periods;
  const left: Record<GmIncomeKey | GmCostKey, number> = {
    gate: 0, localMedia: 0, leagueShare: 0, playoffGate: 0,
    payroll: 0, tax: 0, deadMoney: 0, staff: 0, scouting: 0, upkeep: 0, facilities: 0,
  };
  for (let i = s.periods; i < P; i++) {
    left.leagueShare += periodShare(toK(LEAGUE_SHARE * ctx.cap), i, P);
    left.localMedia += periodShare(toK(LOCAL_MEDIA_SHARE * ctx.cap * MARKET_MULT[b.marketTier]), i, P);
    left.payroll += periodShare(toK(ctx.payroll), i, P);
    left.deadMoney += periodShare(toK(ctx.deadMoney), i, P);
    const [staff, scouting, upkeep] = opsRatesK(b, ctx, i);
    left.staff += staff; left.scouting += scouting; left.upkeep += upkeep;
  }
  const homeGamesLeft = Math.max(0, Math.round(ctx.sport.homeGames - s.homeGames));
  left.gate = homeGateK(b, ctx) * homeGamesLeft;
  const line = (id: GmIncomeKey | GmCostKey, label: string, ops: boolean, note?: string): GmProjectionLine => ({
    id, label, actual: toM(s[id]), projected: toM(s[id] + left[id]), ops, note,
  });
  const income = [
    line('gate', 'Gate', false, `${homeGamesLeft} home game${homeGamesLeft === 1 ? '' : 's'} left`),
    line('localMedia', 'Local media', false),
    line('leagueShare', 'League share', false, 'the same for every club'),
    line('playoffGate', 'Playoff gates', false, 'games played only'),
  ];
  const spend = [
    line('payroll', 'Payroll', false),
    line('deadMoney', 'Dead money', false),
    line('tax', 'Luxury tax', false, 'billed at the close, not projected'),
    line('staff', 'Staff', true),
    line('scouting', 'Scouting', true),
    line('upkeep', 'Upkeep', true),
    line('facilities', 'New facilities', true),
  ];
  const sum = (lines: GmProjectionLine[], k: 'actual' | 'projected') => toM(lines.reduce((n, l) => n + toK(l[k]), 0));
  const incomeActual = sum(income, 'actual');
  const incomeProjected = sum(income, 'projected');
  const spendActual = sum(spend, 'actual');
  const spendProjected = sum(spend, 'projected');
  return {
    periodsPlayed: s.periods, periodsLeft: Math.max(0, P - s.periods), homeGamesLeft,
    income, spend, incomeActual, incomeProjected, spendActual, spendProjected,
    resultActual: toM(toK(incomeActual) - toK(spendActual)),
    resultProjected: toM(toK(incomeProjected) - toK(spendProjected)),
    opsBudget: toM(b.opsBudget + b.opsCarry),
    opsFree: toM(opsFreeK(b, ctx)),
    caveat: 'Counts the regular season left at today\'s prices and payroll. Playoff gates and a tax bill land when they happen and are not guessed at.',
  };
}

/* ---------- the close ---------- */

/** Close the season's books into one record. Pure. */
export function closeGmLedger(b: GmBooks): GmClosedLedger {
  const s = b.season;
  const income = s.gate + s.localMedia + s.leagueShare + s.playoffGate;
  const spend = s.payroll + s.tax + s.deadMoney + s.staff + s.scouting + s.upkeep + s.facilities;
  return { ...s, income, spend, result: income - spend, kittyAtClose: b.kitty };
}

/** True when a closed season balances to the $k: income less costs is the change in the kitty. */
export function ledgerBalances(l: GmClosedLedger): boolean {
  return l.income - l.spend === l.kittyAtClose - l.kittyAtOpen;
}

/**
 * The summer. The season closes into lastSeason, the unspent operations
 * budget carries, and ownership sets next season's from the market and the
 * trust it has after the season's grade. Run AFTER the mandate is graded.
 */
export function closeGmSeason(b: GmBooks, trustAfter: number, nextCap: number): { books: GmBooks; closed: GmClosedLedger } {
  const closed = closeGmLedger(b);
  const carry = Math.max(0, b.opsBudget + b.opsCarry - opsSpentK(b));
  const books: GmBooks = {
    ...b,
    opsBudget: opsBudgetFor(b.marketTier, trustAfter, nextCap),
    opsCarry: carry,
    season: emptyGmLedger(b.kitty),
    lastSeason: closed,
  };
  return { books, closed };
}
