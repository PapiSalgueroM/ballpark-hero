/**
 * Round 467: the books. His words: "Finances: ticket and concession pricing
 * with fan and board reactions, sponsor offers (good and bad brands, local
 * or global, negotiable), a full projected finances screen: player wages,
 * staff wages, travel, transfer income, everything a club spends and earns."
 *
 * What was already here and is kept: Round 171's ticket policy, gate and
 * ground, Round 200's three sponsor shapes, Round 436's summer carry. This
 * module adds, on top of them and in one block on the save (`books`):
 *
 *   CONCESSIONS. Food and drink money per head, three prices, folded into
 *   gatePricePerFan so the gate identity simFinance holds (a home gate is
 *   exactly crowd times money a head, nothing else touches the kitty on a
 *   match day) keeps holding. The stadium facility lifts the per head figure.
 *
 *   FAN MOOD. One number, 0 to 100, opening on 50. Every week it moves 15
 *   percent of the way to a target built from your prices, your sponsor and
 *   the last five results, and it reaches exactly 50 on standard prices, a
 *   clean sponsor and level form, which is where the crowd multiplier reads
 *   exactly 1. Fair prices and cheap food lift it, premium anything costs
 *   it, a bad sponsor drags on it, and it feeds the home crowd (0.9x on the
 *   floor, 1.1x on the ceiling). Round 465 builds the meter; this is the
 *   number under it.
 *
 *   THE BOARD reads money: premium prices buy a point of confidence when
 *   set, fair prices cost one, and a bad sponsor's cheque buys one.
 *
 *   SPONSORS. The three shapes stay, and every offer now carries a reach
 *   (local or global) and a hidden ceiling you can push at: each push asks
 *   six percent more, the brand walks when the ask passes its ceiling, and
 *   a walked brand stays walked for the season. A fourth offer comes from a
 *   bad brand (bookmakers, lenders, the like, every one invented and checked
 *   against real companies by simSponsors): it pays 1.35x the safe cheque,
 *   costs the fans eight points of mood every week it runs, and the shirt
 *   says so on the desk.
 *
 *   THE LEDGER. Player wages (the weekly bill the contracts desk already
 *   prices, charged per calendar week), staff wages (from the academy's
 *   coaching, recruitment and building levels and the scouts on the road),
 *   travel (per away trip, dearer for a bigger club and for Europe), the
 *   gate split into tickets and concessions, sponsor money as it lands, and
 *   transfers in and out from the season's deals. Wages and travel are the
 *   club's running costs and the screen says so: the engine has never taken
 *   them out of the transfer kitty (the board sets the kitty with them
 *   covered, and the wage ceiling is the board's patience, not a deduction),
 *   so the ledger reports them without inventing a second account.
 *
 *   THE PROJECTION. Actual to date plus the rest of the season at today's
 *   rates: the wage bill times the weeks left, the average home gate so far
 *   (or a stature estimate before the first) times the home games the
 *   fixture list is certain of, travel for the away trips it is certain of.
 *   Certain means league fixtures plus the one cup or European tie already
 *   drawn; later rounds depend on results nobody has yet and are left out,
 *   which the screen says. scripts/simClubManagerFinances.mjs measures how
 *   far the projection at week N lands from the season's closed ledger.
 */
import type { CareerState, Competition, SponsorOffer } from '@/lib/clubManager';
import {
  TICKET_TIERS, clubDefFor, eraClubDefFor, fixtureFor, gatePricePerFan, isHistoricEra,
  money, signSponsorWith, sponsorOffers, wageBill,
} from '@/lib/clubManager';
import { facilityLevel, facilitiesOf, stadiumConcessionMult } from '@/lib/clubManagerFacilities';

export type ConcessionTier = 0 | 1 | 2;

export const CONCESSION_TIERS = [
  { label: 'Cheap food', emoji: '\u{1F35F}', priceMult: 0.7, blurb: 'Pies at cost. The fans love you for it.' },
  { label: 'Standard', emoji: '\u{1F964}', priceMult: 1.0, blurb: 'Ground prices. Nobody cheers, nobody moans.' },
  { label: 'Premium', emoji: '\u{1F37E}', priceMult: 1.4, blurb: 'Hospitality margins. The fans notice the bill.' },
] as const;

export const BOOKS_VERSION = 1;
export const FAN_MOOD_START = 50;

export interface SeasonLedger {
  /** Calendar weeks charged so far. */
  weeks: number;
  homeGames: number;
  awayTrips: number;
  /** All in millions. */
  tickets: number;
  concessions: number;
  sponsor: number;
  playerWages: number;
  staffWages: number;
  travel: number;
}

/** A closed season: the ledger plus the lines the engine already keeps elsewhere. */
export interface ClosedLedger extends SeasonLedger {
  transferIn: number;
  transferOut: number;
  facilities: number;
  income: number;
  spend: number;
  result: number;
}

export interface ClubBooks {
  v: number;
  concessionTier: ConcessionTier;
  fanMood: number;
  season: SeasonLedger;
  lastSeason: ClosedLedger | null;
  /** Sponsor offer id to how many times you pushed it this season. */
  pushed: Record<string, number>;
  /** Sponsor offer ids that pulled their offer after one push too many. */
  walked: string[];
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const ERA_MONEY = 0.75;

function eraHistOf(state: Pick<CareerState, 'eraId'>): boolean {
  return !!state.eraId && isHistoricEra(state.eraId);
}

function careerTier(state: Pick<CareerState, 'clubName' | 'eraId'>): 1 | 2 | 3 | 4 {
  return (eraHistOf(state) ? eraClubDefFor(state.clubName, state.eraId) : clubDefFor(state.clubName)).tier;
}

export function emptyLedger(): SeasonLedger {
  return { weeks: 0, homeGames: 0, awayTrips: 0, tickets: 0, concessions: 0, sponsor: 0, playerWages: 0, staffWages: 0, travel: 0 };
}

const LEDGER_KEYS: (keyof SeasonLedger)[] = ['weeks', 'homeGames', 'awayTrips', 'tickets', 'concessions', 'sponsor', 'playerWages', 'staffWages', 'travel'];

function isLedger(l: unknown): l is SeasonLedger {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return false;
  const o = l as Record<string, unknown>;
  return LEDGER_KEYS.every(k => typeof o[k] === 'number' && Number.isFinite(o[k] as number) && (o[k] as number) >= 0);
}

function isClosed(l: unknown): l is ClosedLedger {
  if (!isLedger(l)) return false;
  const o = l as unknown as Record<string, unknown>;
  return ['transferIn', 'transferOut', 'facilities', 'income', 'spend', 'result']
    .every(k => typeof o[k] === 'number' && Number.isFinite(o[k] as number));
}

/** True when the block on the save is exactly the shape this round writes. */
export function isValidBooks(b: unknown): b is ClubBooks {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
  const o = b as Record<string, unknown>;
  return o.v === BOOKS_VERSION
    && (o.concessionTier === 0 || o.concessionTier === 1 || o.concessionTier === 2)
    && typeof o.fanMood === 'number' && Number.isFinite(o.fanMood) && o.fanMood >= 0 && o.fanMood <= 100
    && isLedger(o.season)
    && (o.lastSeason === null || isClosed(o.lastSeason))
    && !!o.pushed && typeof o.pushed === 'object' && !Array.isArray(o.pushed)
    && Object.values(o.pushed as Record<string, unknown>).every(n => Number.isInteger(n) && (n as number) >= 0)
    && Array.isArray(o.walked) && (o.walked as unknown[]).every(s => typeof s === 'string');
}

function defaultBooks(): ClubBooks {
  return { v: BOOKS_VERSION, concessionTier: 1, fanMood: FAN_MOOD_START, season: emptyLedger(), lastSeason: null, pushed: {}, walked: [] };
}

/** The books, repaired in place when missing or mangled. Fails closed on shape. */
export function ensureBooks(state: CareerState): ClubBooks {
  if (!isValidBooks(state.books)) state.books = defaultBooks();
  return state.books as ClubBooks;
}

/** The books for reading, never writing. */
export function booksOf(state: CareerState): ClubBooks {
  return isValidBooks(state.books) ? state.books : defaultBooks();
}

/** A private copy of the books to write into, so a caller never mutates the state it was handed. */
function cloneBooks(state: CareerState): ClubBooks {
  const b = booksOf(state);
  return { ...b, season: { ...b.season }, pushed: { ...b.pushed }, walked: [...b.walked], lastSeason: b.lastSeason ? { ...b.lastSeason } : null };
}

/* ---------- money a head ---------- */

/** Food and drink per fan in pounds: stature, your concession price, the stadium, and era money. */
export function concessionPerFan(state: CareerState): number {
  const base = [8, 6.5, 5.5, 4][careerTier(state) - 1] ?? 4;
  const tier = CONCESSION_TIERS[booksOf(state).concessionTier];
  return round2(base * tier.priceMult * stadiumConcessionMult(facilityLevel(state, 'stadium')) * (eraHistOf(state) ? ERA_MONEY : 1));
}

/** The ticket half of the money a head, which is what gatePricePerFan read before this round. */
export function ticketPerFan(state: CareerState): number {
  return round2(gatePricePerFan(state) - concessionPerFan(state));
}

/* ---------- the fans ---------- */

/** The home crowd's multiplier from mood: 0.9 on the floor, exactly 1 at 50, 1.1 on the ceiling. */
export function fanCrowdMult(state: CareerState): number {
  return 0.9 + 0.2 * (booksOf(state).fanMood / 100);
}

const TICKET_MOOD = [8, 0, -8];
const CONCESSION_MOOD = [5, 0, -6];
export const BAD_SPONSOR_MOOD = -8;

/** Where the mood is heading: prices, the shirt and the last five results. */
export function fanMoodTarget(state: CareerState): number {
  const books = booksOf(state);
  const ticket = TICKET_MOOD[state.finance?.ticketTier ?? 1] ?? 0;
  const food = CONCESSION_MOOD[books.concessionTier] ?? 0;
  const shirt = state.sponsor?.rep === 'bad' ? BAD_SPONSOR_MOOD : 0;
  const form = (state.form ?? []).reduce((s, f) => s + (f === 'W' ? 2 : f === 'L' ? -2 : 0), 0);
  return clamp(FAN_MOOD_START + ticket + food + shirt + form, 0, 100);
}

export function fanMoodLabel(mood: number): string {
  if (mood >= 75) return 'Singing your name';
  if (mood >= 60) return 'Onside';
  if (mood >= 45) return 'Waiting to see';
  if (mood >= 30) return 'Grumbling';
  return 'Furious';
}

/** What the fans and the board make of a ticket price, for the screen. */
export function ticketReaction(tier: 0 | 1 | 2): { fans: string; board: string } {
  if (tier === 0) return { fans: 'Fans warm to it (+8 on the mood target, +3 the day you set it).', board: 'The board docks a point of confidence the day you set it.' };
  if (tier === 2) return { fans: 'Fans cool on it (-8 on the mood target, -4 the day you set it).', board: 'The board adds a point of confidence the day you set it.' };
  return { fans: 'Fans are neutral.', board: 'The board are neutral.' };
}

export function concessionReaction(tier: ConcessionTier): { fans: string; board: string } {
  if (tier === 0) return { fans: 'Fans warm to it (+5 on the mood target, +2 the day you set it).', board: 'The board shrug.' };
  if (tier === 2) return { fans: 'Fans cool on it (-6 on the mood target, -3 the day you set it).', board: 'The board shrug.' };
  return { fans: 'Fans are neutral.', board: 'The board are neutral.' };
}

/** Change the ticket price with the reactions on top of Round 171's free switch. */
export function setTicketPolicy(career: CareerState, tier: 0 | 1 | 2): CareerState {
  const prev = career.finance?.ticketTier ?? 1;
  const state: CareerState = { ...career };
  const fin = career.finance ?? { ticketTier: 1 as const, groundUpgrades: 0, seasonGate: 0, lastGate: null };
  state.finance = { ...fin, ticketTier: tier };
  if (tier === prev) return state;
  const books = cloneBooks(state);
  books.fanMood = clamp(round1(books.fanMood + (tier === 0 ? 3 : tier === 2 ? -4 : 0)), 0, 100);
  state.books = books;
  state.boardConfidence = clamp(state.boardConfidence + (tier === 0 ? -1 : tier === 2 ? 1 : 0), 0, 100);
  return state;
}

export function setConcessionTier(career: CareerState, tier: ConcessionTier): CareerState {
  const prev = booksOf(career).concessionTier;
  const state: CareerState = { ...career };
  const books = cloneBooks(state);
  books.concessionTier = tier;
  if (tier !== prev) books.fanMood = clamp(round1(books.fanMood + (tier === 0 ? 2 : tier === 2 ? -3 : 0)), 0, 100);
  state.books = books;
  return state;
}

/* ---------- the running costs ---------- */

/** Staff wages a week in thousands: the academy's people and the scouts on the road. */
export function staffWagesWeekly(state: CareerState): number {
  const a = state.academy;
  const coaching = a?.coaching ?? 8;
  const recruitment = a?.recruitment ?? 8;
  const building = a?.facilities ?? 8;
  const scouts = a?.scouts?.length ?? 0;
  const k = 20 + 3 * coaching + 2 * recruitment + 2 * building + 6 * scouts;
  return Math.round(k * (eraHistOf(state) ? ERA_MONEY : 1));
}

/** One away trip in millions: dearer for a bigger club, dearer again for Europe. */
export function travelCost(state: CareerState, competition: Competition): number {
  const base = [0.12, 0.09, 0.06, 0.04][careerTier(state) - 1] ?? 0.04;
  const europe = competition === 'uclGroup' || competition === 'uclKo' ? 2.5 : 1;
  return round3(base * europe * (eraHistOf(state) ? ERA_MONEY : 1));
}

/* ---------- the ledger, written from the engine's private copy ---------- */

/** Every calendar week: wages, staff, and the fans drifting to where the prices put them. */
export function tickBooks(state: CareerState): void {
  const books = ensureBooks(state);
  const s = books.season;
  s.weeks += 1;
  s.playerWages = round3(s.playerWages + wageBill(state) / 1000);
  s.staffWages = round3(s.staffWages + staffWagesWeekly(state) / 1000);
  const target = fanMoodTarget(state);
  books.fanMood = clamp(round1(books.fanMood + (target - books.fanMood) * 0.15), 0, 100);
}

/** A home gate just landed in the kitty: split it into tickets and food, on the crowd that paid it. */
export function noteHomeGate(state: CareerState, attendance: number, gate: number): void {
  const s = ensureBooks(state).season;
  const food = round2(Math.min(gate, (attendance * concessionPerFan(state)) / 1e6));
  s.homeGames += 1;
  s.concessions = round2(s.concessions + food);
  s.tickets = round2(s.tickets + (gate - food));
}

/** An away day: the coach, the flight, the hotel. */
export function noteAwayTrip(state: CareerState, competition: Competition): void {
  const s = ensureBooks(state).season;
  s.awayTrips += 1;
  s.travel = round3(s.travel + travelCost(state, competition));
}

/** Sponsor money that just landed in the kitty, at signing or at the summer. */
export function noteSponsorIncome(state: CareerState, amount: number): void {
  if (!(amount > 0)) return;
  const s = ensureBooks(state).season;
  s.sponsor = round2(s.sponsor + amount);
}

/* ---------- the projection ---------- */

export interface ProjectionLine {
  id: string;
  label: string;
  /** Millions to date. */
  actual: number;
  /** Millions projected to season end. */
  projected: number;
  /** True when the line moves the transfer kitty; false for the club's running costs. */
  kitty: boolean;
  note?: string;
}

export interface FinanceProjection {
  weeksPlayed: number;
  weeksLeft: number;
  homeGamesLeft: number;
  awayTripsLeft: number;
  income: ProjectionLine[];
  spend: ProjectionLine[];
  incomeActual: number;
  incomeProjected: number;
  spendActual: number;
  spendProjected: number;
  resultActual: number;
  resultProjected: number;
  /** The sponsor bonus that would pay at the summer if the season earns it. Not in any total. */
  possibleBonus: number;
  /** What the projection does not count, said plainly. */
  caveat: string;
}

/** The home games and away trips the fixture list is certain of from this week. */
export function certainFixturesLeft(state: CareerState): { home: number; away: number; euroAway: number } {
  let home = 0, away = 0, euroAway = 0;
  /* fixtureFor answers null for a cup or knockout round that has not been
     drawn yet and for a competition the club is out of, so walking the
     calendar with it counts exactly the fixtures the club is certain of. */
  for (let i = state.week; i < state.calendar.length; i++) {
    const entry = state.calendar[i];
    if (entry.type === 'window') continue;
    const fx = fixtureFor(state, entry);
    if (!fx) continue;
    if (fx.home === true) home += 1;
    else if (fx.home === false) { away += 1; if (entry.type === 'uclGroup' || entry.type === 'uclKo') euroAway += 1; }
  }
  return { home, away, euroAway };
}

/** A stature estimate of one home crowd, for a projection made before the first gate. */
export function expectedHomeCrowd(state: CareerState): number {
  const custom = state.customClub && state.clubName === state.customClub.name ? state.customClub : null;
  const ticket = TICKET_TIERS[state.finance?.ticketTier ?? 1].crowdMult;
  if (custom && custom.capacity) {
    const cap = custom.capacity + (state.finance?.groundUpgrades ?? 0) * 6000;
    return Math.min(cap, Math.round(cap * 0.87 * ticket * fanCrowdMult(state)));
  }
  const mid = [67000, 46000, 28500, 15000][careerTier(state) - 1] ?? 15000;
  const ground = 1 + 0.12 * (state.finance?.groundUpgrades ?? 0);
  return Math.min(78000, Math.round(mid * ticket * ground * fanCrowdMult(state)));
}

export function projectFinances(state: CareerState): FinanceProjection {
  const books = booksOf(state);
  const s = books.season;
  const weeksLeft = Math.max(0, state.calendar.length - state.week);
  const left = certainFixturesLeft(state);
  const perFan = gatePricePerFan(state);
  const food = concessionPerFan(state);
  const gateSoFar = s.tickets + s.concessions;
  const perHome = s.homeGames >= 3
    ? gateSoFar / s.homeGames
    : (expectedHomeCrowd(state) * perFan) / 1e6;
  const foodShare = perFan > 0 ? food / perFan : 0;
  const ticketsLeft = round2(perHome * (1 - foodShare) * left.home);
  const foodLeft = round2(perHome * foodShare * left.home);
  const wagesLeft = round2((wageBill(state) / 1000) * weeksLeft);
  const staffLeft = round2((staffWagesWeekly(state) / 1000) * weeksLeft);
  const travelLeft = round2(travelCost(state, 'league') * (left.away - left.euroAway) + travelCost(state, 'uclGroup') * left.euroAway);
  const signings = state.seasonSignings ?? [];
  const transferIn = round2(signings.filter(t => t.dir === 'out').reduce((n, t) => n + t.fee, 0));
  const transferOut = round2(signings.filter(t => t.dir === 'in').reduce((n, t) => n + t.fee, 0));
  const facilities = facilitiesOf(state).seasonSpend;

  const income: ProjectionLine[] = [
    { id: 'tickets', label: 'Tickets', actual: round2(s.tickets), projected: round2(s.tickets + ticketsLeft), kitty: true, note: `${left.home} certain home game${left.home === 1 ? '' : 's'} left` },
    { id: 'concessions', label: 'Food and drink', actual: round2(s.concessions), projected: round2(s.concessions + foodLeft), kitty: true },
    { id: 'sponsor', label: 'Sponsor', actual: round2(s.sponsor), projected: round2(s.sponsor), kitty: true, note: state.sponsor ? 'guaranteed money, landed' : 'no deal' },
    { id: 'transferIn', label: 'Players sold', actual: transferIn, projected: transferIn, kitty: true, note: 'assumes no more deals' },
  ];
  const spend: ProjectionLine[] = [
    { id: 'playerWages', label: 'Player wages', actual: round2(s.playerWages), projected: round2(s.playerWages + wagesLeft), kitty: false, note: `${money(wageBill(state) / 1000)} a week` },
    { id: 'staffWages', label: 'Staff wages', actual: round2(s.staffWages), projected: round2(s.staffWages + staffLeft), kitty: false, note: `${money(staffWagesWeekly(state) / 1000)} a week` },
    { id: 'travel', label: 'Travel', actual: round2(s.travel), projected: round2(s.travel + travelLeft), kitty: false, note: `${left.away} certain away trip${left.away === 1 ? '' : 's'} left` },
    { id: 'transferOut', label: 'Players bought', actual: transferOut, projected: transferOut, kitty: true, note: 'assumes no more deals' },
    { id: 'facilities', label: 'Facilities', actual: round2(facilities), projected: round2(facilities), kitty: true },
  ];
  const sum = (lines: ProjectionLine[], k: 'actual' | 'projected') => round2(lines.reduce((n, l) => n + l[k], 0));
  const incomeActual = sum(income, 'actual');
  const incomeProjected = sum(income, 'projected');
  const spendActual = sum(spend, 'actual');
  const spendProjected = sum(spend, 'projected');
  return {
    weeksPlayed: s.weeks,
    weeksLeft,
    homeGamesLeft: left.home,
    awayTripsLeft: left.away,
    income,
    spend,
    incomeActual,
    incomeProjected,
    spendActual,
    spendProjected,
    resultActual: round2(incomeActual - spendActual),
    resultProjected: round2(incomeProjected - spendProjected),
    possibleBonus: state.sponsor?.bonus ?? 0,
    caveat: 'Counts league fixtures and the one cup or European tie already drawn. Later rounds depend on results and are left out, and so are deals you have not done.',
  };
}

/** Close the season's books into one honest record. Pure. */
export function closeLedger(state: CareerState): ClosedLedger {
  const s = booksOf(state).season;
  const signings = state.seasonSignings ?? [];
  const transferIn = round2(signings.filter(t => t.dir === 'out').reduce((n, t) => n + t.fee, 0));
  const transferOut = round2(signings.filter(t => t.dir === 'in').reduce((n, t) => n + t.fee, 0));
  const facilities = round2(facilitiesOf(state).seasonSpend);
  const income = round2(s.tickets + s.concessions + s.sponsor + transferIn);
  const spend = round2(s.playerWages + s.staffWages + s.travel + transferOut + facilities);
  return { ...s, transferIn, transferOut, facilities, income, spend, result: round2(income - spend) };
}

/**
 * The summer. The books are the club's, like the ground and the sponsor:
 * stay and the season's ledger closes into lastSeason with the fans and
 * the prices carried; move and the new club opens fresh books. Must run
 * BEFORE the sponsor block in startNextSeason, so the new season's sponsor
 * money lands in the new season's ledger.
 */
export function rolloverBooks(state: CareerState, career: CareerState, moving: boolean): void {
  if (moving || !isValidBooks(career.books)) { state.books = undefined; return; }
  state.books = {
    ...career.books,
    season: emptyLedger(),
    lastSeason: closeLedger(career),
    pushed: {},
    walked: [],
  };
}

/* ---------- sponsors: reach, reputation, and the push ---------- */

export type SponsorReach = 'local' | 'global';
export type SponsorRep = 'good' | 'bad';

/* Invented, like SPONSOR_BRANDS in the engine. simSponsors reads this bank
   too and fails on any real company. The shapes are the ones a supporters'
   trust writes to the paper about: bookmakers, lenders, vapes, a crypto
   exchange. */
export const BAD_SPONSOR_BRANDS = [
  'Lucky Ninety Bets', 'Fastcash Loans', 'Vapour Lane', 'Redline Crypto Exchange',
  'Goldrush Casino', 'Quickfire Wagers', 'Nightowl Energy Drinks', 'Skyhigh Payday',
];

export interface SponsorTableOffer extends SponsorOffer {
  reach: SponsorReach;
  rep: SponsorRep;
  /** Times you have pushed this offer this season. */
  pushed: number;
  /** Pushes the brand will take before it walks, 1 to 3. Not shown. */
  ceilingRounds: number;
  /** What the offer paid before any push, for the desk. */
  basePerSeason: number;
}

export const SPONSOR_PUSH_STEP = 0.06;
export const BAD_SPONSOR_MULT = 1.35;

function seedOf(key: string): number {
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = ((seed * 31) + key.charCodeAt(i)) >>> 0;
  return seed;
}

/**
 * The offers on the desk this season: the engine's three shapes with reach
 * and a hidden ceiling, plus the bad brand, each priced up by the pushes
 * you have made, minus any brand that walked. Deterministic per club and
 * season, so a reload cannot reroll it.
 */
export function sponsorTable(state: CareerState): SponsorTableOffer[] {
  const books = booksOf(state);
  const base = sponsorOffers(state);
  const seed = seedOf(`${state.clubName}|${state.season}|reach`);
  const tier = careerTier(state);
  const safe = base.find(o => o.shape === 'safe') ?? base[0];
  const bad: SponsorOffer = {
    id: 'bad',
    brand: BAD_SPONSOR_BRANDS[seed % BAD_SPONSOR_BRANDS.length],
    shape: 'safe',
    perSeason: round1(safe.perSeason * BAD_SPONSOR_MULT),
    bonus: 0,
    bonusFor: null,
    years: 2,
    pitch: 'The biggest cheque on the table, and the supporters will hate the shirt.',
  };
  const all = [...base, bad];
  return all
    .filter(o => !books.walked.includes(o.id))
    .map((o, i) => {
      const pushed = books.pushed[o.id] ?? 0;
      const reach: SponsorReach = o.id === 'bad' ? 'global'
        : o.shape === 'safe' ? 'global'
          : o.shape === 'performance' ? (tier <= 2 ? 'global' : 'local')
            : 'local';
      const ceilingRounds = 1 + ((seed >>> (i * 3)) % 3);
      return {
        ...o,
        reach,
        rep: o.id === 'bad' ? 'bad' : 'good',
        pushed,
        ceilingRounds,
        basePerSeason: o.perSeason,
        perSeason: round1(o.perSeason * Math.pow(1 + SPONSOR_PUSH_STEP, pushed)),
      };
    });
}

/** Ask the brand for six percent more. Past its ceiling it walks for the season. */
export function pushSponsor(career: CareerState, offerId: string): CareerState | null {
  if (career.sponsor) return null;
  const offer = sponsorTable(career).find(o => o.id === offerId);
  if (!offer) return null;
  const state: CareerState = { ...career };
  const books = cloneBooks(state);
  const pushed = offer.pushed + 1;
  if (pushed > offer.ceilingRounds) {
    books.walked = [...books.walked, offerId];
    delete books.pushed[offerId];
    state.aiHeadlines = [
      `\u{1F6AA} ${offer.brand} have pulled their offer. One ask too many.`,
      ...state.aiHeadlines,
    ].slice(0, 8);
  } else {
    books.pushed[offerId] = pushed;
    const next = round1(offer.basePerSeason * Math.pow(1 + SPONSOR_PUSH_STEP, pushed));
    state.aiHeadlines = [
      `\u{1F4B1} ${offer.brand} came up to ${money(next)} a season.`,
      ...state.aiHeadlines,
    ].slice(0, 8);
  }
  state.books = books;
  return state;
}

/** Sign the offer as it stands on the desk today, pushes and all. */
export function acceptSponsor(career: CareerState, offerId: string): CareerState | null {
  if (career.sponsor) return null;
  const offer = sponsorTable(career).find(o => o.id === offerId);
  if (!offer) return null;
  const signed = signSponsorWith(career, offer);
  const state: CareerState = { ...signed };
  if (state.sponsor) state.sponsor = { ...state.sponsor, rep: offer.rep, reach: offer.reach };
  const books = cloneBooks(state);
  books.season = { ...books.season, sponsor: round2(books.season.sponsor + offer.perSeason) };
  if (offer.rep === 'bad') {
    books.fanMood = clamp(round1(books.fanMood - 6), 0, 100);
    state.boardConfidence = clamp(state.boardConfidence + 1, 0, 100);
  }
  state.books = books;
  return state;
}
