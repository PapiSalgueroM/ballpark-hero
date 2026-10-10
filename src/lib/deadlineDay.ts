/**
 * Round 721: Deadline Day (master spec, "New game idea: Deadline Day").
 *
 * You are the sporting director of a real club on the last day of the summer
 * window. There is a clock in game hours, a budget the board has left you,
 * three or four places in the XI the board want upgraded, and a queue of real
 * players who would fill them. Every bid, every offer of personal terms and
 * every sale costs an hour. Rival clubs move for the same players, and a deal
 * still on the table when the window shuts collapses.
 *
 * This is NOT a second transfer engine. The club, its squad and XI, the market
 * of real players, the seller's ask and patience, the closeness meter, the
 * valuation desk, the rival who hijacks a deal you dither on, the personal
 * terms table, the signing itself and the sale of one of your own players are
 * all src/lib/clubManager.ts and src/lib/clubManagerDeals.ts (Round 506's deal
 * desk), imported and driven unchanged. What is new here is only the frame:
 *
 *   1. THE BRIEF. The needs are the weakest places in the engine's own XI for
 *      the club that at least two men on the market could fill, each with the
 *      rating that would be an upgrade. The approaches
 *      are real players from the engine's market who can play that slot and
 *      clear that rating, and the budget is read off what they cost.
 *   2. THE CLOCK. Opening talks is a phone call and costs nothing. A bid, an
 *      offer of terms or a sale costs an hour, and the window shuts after
 *      DEADLINE_HOURS of them. Anything unfinished then collapses.
 *   3. THE RIVALS. Each hour other clubs can come in for a player in your
 *      queue. Ignore a player a rival is in for and they can close the deal
 *      inside the hour. A rival in for a man you are in talks with sits in the
 *      engine's own rivalBidder field, so your next bid has to beat it.
 *   4. THE GRADE. Needs filled, the fees against what the players were really
 *      worth (the number the valuation desk's band is always drawn around),
 *      and what is left in the budget once the job is done.
 *
 * Several deals run at once, and the engine holds one negotiation at a time,
 * so each target keeps its own engine Negotiation and the frame seats it on
 * the career for the length of one engine call, then lifts it off again.
 *
 * DETERMINISM. The engine draws from Math.random, so every engine call runs
 * inside Manager Hot Seat's withSeed (imported, not copied). Each target's
 * table draws from its own stream, keyed on the target and the number of bids
 * made on it, so the same bids on the same player meet the same dice however
 * the rest of the day went. The rivals draw one fixed set of numbers per
 * target per hour. A window is therefore a pure function of its seed and its
 * actions, which is what makes the daily the same day for everyone and lets a
 * refresh rebuild a window from nothing but the seed and the action list.
 *
 * THE SHARED ENGINE'S SESSION STATE. clubManager.ts keeps two module level
 * registrations that an open Club Manager save owns. Every engine call here
 * runs inside Manager Hot Seat's onStaticWorld, which puts them back after,
 * and scripts/simDeadlineDay.mjs section 5 holds that.
 *
 * Nothing here invents a fact. Every player, club, rating, age and value is
 * the engine's baked data; the needs and the budget are derived from it; the
 * voices are roles (the board, the selling club, his agent), never a named
 * real person, and the narration never quotes the player.
 */
import {
  REAL_LEAGUES,
  CM_FORMATIONS,
  acceptBid,
  buildMarket,
  canLeaveSquad,
  doorRefusal,
  isPartialClub,
  makeOffer,
  money,
  offerTerms,
  playableClubs,
  resolveXI,
  sellValue,
  startCareer,
  startNegotiation,
  walkAway,
  type CareerState,
  type MarketPlayer,
  type Negotiation,
} from '@/lib/clubManager';
import { MIN_TERMS_YEARS, askingTerms, dealCloseness, offerVerdict, termsCloseness, valuationBand, type PersonalTerms, type ValuationRead } from '@/lib/clubManagerDeals';
import { hotSeatPool, mixSeed, onStaticWorld, withSeed } from '@/lib/managerHotSeat';
import { mulberry32 } from '@/lib/leagueCore';
import { dailyIndex, dailyPrngSeed } from '@/lib/dateUtils';
import type { Position } from '@/types/game';

/* ---------------- the numbers ---------------- */

/** Game hours in the day. The window opens at START_HOUR and shuts at START_HOUR + DEADLINE_HOURS. */
export const DEADLINE_HOURS = 12;
export const START_HOUR = 11;
/** Approaches in the queue for each need. */
export const CANDIDATES_PER_NEED = 3;
/** How far above the need's line a candidate may be rated, so a small club is not offered the world. */
export const CANDIDATE_SPAN = 5;
/** The board's money for the day, as a share of what the cheapest man for each need would cost at his asking price plus his asking bonus. */
export const BUDGET_SHARE = 1.0;
/** The chance a rival comes in for a player in your queue in one hour, rising to BASE + LATE by the last hour. */
export const RIVAL_ENTER_BASE = 0.02;
export const RIVAL_ENTER_LATE = 0.04;
/** The chance a rival closes on a player you left alone for the hour. The engine's own dithering number. */
export const RIVAL_CLOSE = 0.3;
/** The grade: needs filled, value for money, budget left. Adds to 100. */
export const NEEDS_POINTS = 50;
export const VALUE_POINTS = 30;
export const BUDGET_POINTS = 20;
/** A fee at or under the player's real value scores full value points, and nothing at VALUE_CEIL times it. */
export const VALUE_FAIR = 1.0;
export const VALUE_CEIL = 1.5;

/* ---------------- the shapes ---------------- */

export interface DeadlineNeed {
  /** The XI slot in the club's formation. */
  slot: number;
  label: string;
  allowed: Position[];
  /** Who starts there now, with his engine rating, or null for an empty slot. */
  incumbent: string | null;
  incumbentRating: number | null;
  /** The rating that fills the need. */
  min: number;
}

export type DealStatus = 'idle' | 'talks' | 'terms' | 'signed' | 'gone' | 'collapsed' | 'walked';

export interface DeadlineTarget {
  mp: MarketPlayer;
  /** The need this approach is for. */
  need: number;
  status: DealStatus;
  /** The engine's own table for this man, held between pushes. */
  neg: Negotiation | null;
  /** A rival in for him outside the fee table (before talks, or at the terms stage). */
  rival: { club: string; offer: number } | null;
  /** Hours the frame has charged on this deal, for the screen. */
  hours: number;
  /** What happened last, in the frame's words. */
  note: string;
  fee?: number;
  bonus?: number;
  wage?: number;
  lostTo?: string;
}

export interface DeadlineSale {
  playerId: string;
  name: string;
  position: Position;
  rating: number;
  age: number;
  club: string;
  offer: number;
  done: boolean;
}

export interface DeadlineSetup {
  club: string;
  seed: number;
  /** The Eastern day this is the daily for, or absent in free play. */
  daily?: string;
}

export type DeadlineAction =
  | { t: 'open'; i: number }
  | { t: 'bid'; i: number; amt: number }
  | { t: 'terms'; i: number; wage: number; years: number; bonus: number }
  | { t: 'walk'; i: number }
  | { t: 'sell'; i: number }
  | { t: 'end' };

export interface DeadlineSigning { name: string; club: string; position: Position; rating: number; fee: number; value: number; bonus: number; wage: number }

export type GradeLetter = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface DeadlineGrade {
  score: number;
  letter: GradeLetter;
  needs: number;
  filled: number;
  /** For each need, the signing that filled it, or null. */
  filledBy: (string | null)[];
  needsPts: number;
  valuePts: number;
  budgetPts: number;
  signings: DeadlineSigning[];
  budgetLeft: number;
  startBudget: number;
}

export interface TickerLine { hour: number; text: string }

export interface DeadlineRun {
  setup: DeadlineSetup;
  state: CareerState;
  needs: DeadlineNeed[];
  targets: DeadlineTarget[];
  sales: DeadlineSale[];
  startBudget: number;
  /** Hours used, 0 to DEADLINE_HOURS. */
  hour: number;
  actions: DeadlineAction[];
  /** Newest first. */
  ticker: TickerLine[];
  grade: DeadlineGrade | null;
}

/* ---------------- words ---------------- */

const SLOT_WORDS: Record<string, string> = {
  GK: 'goalkeeper', CB: 'centre back', RB: 'right back', LB: 'left back', RWB: 'right wing back', LWB: 'left wing back',
  CDM: 'holding midfielder', CM: 'central midfielder', CAM: 'attacking midfielder', RM: 'right midfielder', LM: 'left midfielder',
  RW: 'right winger', LW: 'left winger', ST: 'striker', CF: 'centre forward',
};

export function slotWord(label: string): string {
  return SLOT_WORDS[label] ?? label;
}

/** The clock on the wall after `hour` hours, as 11am, 2pm, 11pm. */
export function clockLabel(hour: number): string {
  const h = START_HOUR + hour;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${h >= 12 && h < 24 ? 'pm' : 'am'}`;
}

/* ---------------- the clubs and the daily ---------------- */

/** Today's window: one club and one seed for everybody, keyed on the Eastern day. */
export function dailyDeadlineDay(date: string): DeadlineSetup & { leagueName: string; daily: string } {
  /* Round 1044: the day's pool from the dailies' ledger, never the live list,
     so a league joining later cannot re-deal a day already played. */
  const pool = hotSeatPool(date);
  /* Half a pool on from Manager Hot Seat's pick, so the two dailies are not
     the same club on the same day. */
  const at = (dailyIndex(date, pool.length) + Math.floor(pool.length / 2)) % pool.length;
  const pick = pool[Math.max(0, Math.min(pool.length - 1, at))];
  return { club: pick.club, leagueName: pick.leagueName, seed: mixSeed(dailyPrngSeed(date), 721), daily: date };
}

/* ---------------- seeds ---------------- */

const SEED_START = 0;
const SEED_BRIEF = 1;
const SEED_OPEN = 300000;
const SEED_BID = 100000;
const SEED_TERMS = 200000;
const SEED_WALK = 400000;
const SEED_HOUR = 500000;

/* ---------------- the brief ---------------- */

/**
 * Round 1044: what a daily may deal from on its day. A daily's market and
 * rivals keep to the clubs and leagues in the dailies' ledger for that day
 * (src/data/dailyClubPool.json, read through Manager Hot Seat's pool), so a
 * league joining the engine cannot change a day already dealt: its players
 * stay off the list, and its clubs out of the buyers and the hourly rivals,
 * until the ledger's join date. Not held: the engine's own bidding war rival
 * (makeOffer in clubManager.ts) is drawn from every REAL_LEAGUES club, so a
 * daily's table can still name a club from a league the day does not hold.
 * Free play (no daily) reads the whole engine. What this cannot hold
 * still is the data: a roster re-bake can still change a day's candidates,
 * prices and needs, because the club and the seed never move but the players
 * at the clubs do. That is the data changing, not the day being re-dealt.
 */
function dailyReach(daily: string | undefined): { clubs: Set<string>; leagues: Set<string> } | null {
  if (!daily) return null;
  const pool = hotSeatPool(daily);
  return { clubs: new Set(pool.map(c => c.club)), leagues: new Set(pool.map(c => c.leagueId)) };
}

/* `daily` is required on purpose: a call that drops it would let a pre-join
   daily's rivals come from leagues the ledger has not added yet. */
function rivalPool(state: CareerState, daily: string | undefined): string[] {
  const reach = dailyReach(daily);
  return REAL_LEAGUES.filter(l => !reach || reach.leagues.has(l.id))
    .flatMap(l => playableClubs(l.id).slice(0, 6).map(c => c.name))
    .filter(n => n !== state.clubName);
}

/** The places in the engine's XI, weakest first, one per slot label. The day takes the first three or four the market can fill. */
function readNeeds(state: CareerState): DeadlineNeed[] {
  const formation = CM_FORMATIONS[state.formationIndex] ?? CM_FORMATIONS[0];
  const xi = resolveXI(state);
  const rated = xi.map(p => p?.rating).filter((r): r is number => typeof r === 'number');
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 70;
  const slots = formation.slots.map((slot, i) => {
    const p = xi[i] ?? null;
    return { i, slot, p, r: p ? p.rating : Math.round(avg) - 4 };
  });
  slots.sort((a, b) => a.r - b.r || a.i - b.i);
  const out: DeadlineNeed[] = [];
  const seen = new Set<string>();
  for (const s of slots) {
    if (seen.has(s.slot.label)) continue;
    seen.add(s.slot.label);
    out.push({
      slot: s.i,
      label: s.slot.label,
      allowed: [...s.slot.allowed],
      incumbent: s.p ? s.p.name : null,
      incumbentRating: s.p ? s.p.rating : null,
      min: s.r + 1,
    });
  }
  return out;
}

/** Real players who can play the slot and clear its line: a cheap one, a middling one and a dear one. */
function readCandidates(state: CareerState, need: DeadlineNeed, market: MarketPlayer[], taken: Set<string>, rng: () => number, clubs: Set<string> | null): MarketPlayer[] {
  let fits: MarketPlayer[] = [];
  /* The market is the top divisions, so a small club's weakest starter can sit
     under everybody on it. The line stays where it is and the window widens
     upward until there is a real choice. */
  for (let span = CANDIDATE_SPAN; span <= CANDIDATE_SPAN + 20; span += 3) {
    fits = market.filter(m => need.allowed.includes(m.position)
      && m.rating >= need.min && m.rating <= need.min + span
      && m.age <= 33 && !taken.has(m.name) && m.club !== state.clubName
      && !isPartialClub(m.club) && (!clubs || clubs.has(m.club)) && (m.value ?? m.price) > 0);
    if (fits.length >= CANDIDATES_PER_NEED * 3) break;
  }
  fits.sort((a, b) => (a.value ?? a.price) - (b.value ?? b.price) || a.name.localeCompare(b.name));
  const out: MarketPlayer[] = [];
  const n = fits.length;
  for (let k = 0; k < CANDIDATES_PER_NEED && n > 0; k++) {
    const lo = Math.floor((k * n) / CANDIDATES_PER_NEED);
    const hi = Math.max(lo + 1, Math.floor(((k + 1) * n) / CANDIDATES_PER_NEED));
    const pick = fits[Math.min(n - 1, lo + Math.floor(rng() * (hi - lo)))];
    if (!out.includes(pick)) out.push(pick);
  }
  return out;
}

/** What a target would cost at his asking price plus his asking bonus. */
function stickerOf(mp: MarketPlayer): number {
  return mp.price + askingTerms(mp).bonus;
}

/**
 * Opens the day: the engine's club, its XI and its market, read into needs,
 * approaches, sales and a budget. One startCareer call, so cheap enough to
 * run on every replay.
 */
export function startDeadlineDay(setup: DeadlineSetup): DeadlineRun {
  return onStaticWorld(() => {
    const state0 = withSeed(mixSeed(setup.seed, SEED_START), () => startCareer(setup.club));
    /* Release AT: a daily never carries the real fixture list (see startOnStaticWorld in
       managerHotSeat.ts). Deadline Day plays no match, so the key was inert here; it comes off so the
       day's state is the shape it was before Round 1184. scripts/simDailyDeals.mjs holds it. */
    delete state0.realLeagueFixtures;
    const rng = mulberry32(mixSeed(setup.seed, SEED_BRIEF));
    const count = rng() < 0.5 ? 3 : 4;
    const market = buildMarket(state0);
    const reach = dailyReach(setup.daily);
    const taken = new Set<string>();
    const targets: DeadlineTarget[] = [];
    const needs: DeadlineNeed[] = [];
    let kitty = 0;
    /* Weakest place first. A place nobody on the market clears is not a need
       anybody could fill today (a top side's keeper, say), so the board look
       at the next one rather than send you after nobody. */
    for (const need of readNeeds(state0)) {
      if (needs.length >= count) break;
      const picks = readCandidates(state0, need, market, taken, rng, reach?.clubs ?? null);
      if (picks.length < 2) continue;
      const ni = needs.length;
      needs.push(need);
      picks.forEach(mp => taken.add(mp.name));
      kitty += Math.min(...picks.map(stickerOf));
      for (const mp of picks) targets.push({ mp, need: ni, status: 'idle', neg: null, rival: null, hours: 0, note: '' });
    }
    /* Order the queue by need, then by price, so the screen reads cheap to dear. */
    targets.sort((a, b) => a.need - b.need || (a.mp.value ?? a.mp.price) - (b.mp.value ?? b.mp.price));
    const startBudget = Math.max(1, Math.round(kitty * BUDGET_SHARE * 2) / 2);
    /* Bench men a club will take off your hands today, at a deadline day discount. */
    const xiIds = new Set(state0.xiIds.filter((id): id is string => !!id));
    const buyers = rivalPool(state0, setup.daily);
    const bench = state0.squad
      .filter(p => !xiIds.has(p.id) && canLeaveSquad(state0, p) && sellValue(p) >= 0.3)
      .sort((a, b) => sellValue(b) - sellValue(a) || a.name.localeCompare(b.name))
      .slice(0, 3);
    const sales: DeadlineSale[] = bench.map(p => ({
      playerId: p.id,
      name: p.name,
      position: p.position,
      rating: p.rating,
      age: p.age,
      club: buyers[Math.floor(rng() * buyers.length)] ?? 'A rival club',
      offer: Math.max(0.1, Math.round(sellValue(p) * (0.75 + 0.2 * rng()) * 10) / 10),
      done: false,
    }));
    const state: CareerState = { ...state0, budget: startBudget, negotiation: null, incomingBids: [] };
    return {
      setup,
      state,
      needs,
      targets,
      sales,
      startBudget,
      hour: 0,
      actions: [],
      ticker: [{ hour: 0, text: `The board have left you ${money(startBudget)} for the day. The window shuts at ${clockLabel(DEADLINE_HOURS)}.` }],
      grade: null,
    };
  });
}

/* ---------------- reading the desk ---------------- */

/** What your recruitment desk says he is worth: the engine's band, which always contains the truth. */
export function deskRead(run: DeadlineRun, i: number): ValuationRead | null {
  const t = run.targets[i];
  return t ? valuationBand(run.state, t.mp) : null;
}

/** The closeness meter for a bid you are typing, off the engine's own two functions. */
export function bidMeter(run: DeadlineRun, i: number, amt: number): { closeness: number; verdict: ReturnType<typeof offerVerdict> } | null {
  const neg = run.targets[i]?.neg;
  if (!neg || run.targets[i].status !== 'talks') return null;
  return { closeness: dealCloseness(amt, neg.theirAsk), verdict: offerVerdict(amt, neg.theirAsk) };
}

/** What his agent is asking for, at the terms table. */
export function termsWanted(run: DeadlineRun, i: number): PersonalTerms | null {
  const t = run.targets[i];
  return t?.status === 'terms' ? t.neg?.terms?.want ?? null : null;
}

/**
 * The terms the board will put to his agent. The wage and the length cost
 * nothing in a one day game (there is no wage bill and no season after it),
 * and the engine's termsScore lets either stand in for the signing bonus, so
 * before this a zero bonus on a bigger wage signed every man first time and
 * the bonus, the one term the budget pays, never had to be paid. Neither may
 * go above what his agent is asking now. The bonus is not capped, because it
 * is paid for.
 */
export function boardTerms(want: PersonalTerms, offer: { wage: number; years: number; bonus: number }): PersonalTerms {
  return {
    years: Math.max(MIN_TERMS_YEARS, Math.min(want.years, Math.round(offer.years))),
    wage: Math.max(1, Math.min(want.wage, Math.round(offer.wage))),
    bonus: Math.max(0, Math.round(offer.bonus * 10) / 10),
    role: want.role,
  };
}

export function termsMeter(run: DeadlineRun, i: number, offer: { wage: number; years: number; bonus: number }): number | null {
  const want = termsWanted(run, i);
  return want ? termsCloseness(want, boardTerms(want, offer)) : null;
}

/** Why the selling club would not pick up for this man right now, in the engine's own words, or null. */
export function openRefusal(run: DeadlineRun, i: number): string | null {
  const t = run.targets[i];
  if (!t || t.status !== 'idle') return null;
  return onStaticWorld(() => doorRefusal({ ...run.state, negotiation: null }, t.mp, 'talk'));
}

/** The hours left on the clock. */
export function hoursLeft(run: DeadlineRun): number {
  return Math.max(0, DEADLINE_HOURS - run.hour);
}

export function isOver(run: DeadlineRun): boolean {
  return run.grade !== null;
}

/* ---------------- the frame ---------------- */

function cloneRun(run: DeadlineRun): DeadlineRun {
  return {
    ...run,
    targets: run.targets.map(t => ({ ...t, neg: t.neg ? { ...t.neg } : null, rival: t.rival ? { ...t.rival } : null })),
    sales: run.sales.map(s => ({ ...s })),
    actions: [...run.actions],
    ticker: [...run.ticker],
  };
}

function say(run: DeadlineRun, text: string): void {
  run.ticker = [{ hour: run.hour, text }, ...run.ticker].slice(0, 40);
}

const LIVE: DealStatus[] = ['idle', 'talks', 'terms'];

/** The rival in for a target right now, from either seat. */
export function rivalOn(t: DeadlineTarget): { club: string; offer: number } | null {
  if (t.status === 'talks' && t.neg?.rivalBidder && t.neg.rivalOffer !== null) return { club: t.neg.rivalBidder, offer: t.neg.rivalOffer };
  return t.rival;
}

function loseTo(run: DeadlineRun, t: DeadlineTarget, club: string, fee: number): void {
  t.status = 'gone';
  t.lostTo = club;
  t.rival = null;
  t.note = `${club} signed him for ${money(fee)}.`;
  if (!run.state.goneNames.includes(t.mp.name)) run.state = { ...run.state, goneNames: [...run.state.goneNames, t.mp.name] };
  say(run, `${club} complete the signing of ${t.mp.name} for ${money(fee)}.`);
}

/**
 * One hour passes: rivals come in for players in the queue and close on the
 * ones you left alone. Four draws per target per hour whatever its state, so
 * one target's hour never shifts another's dice.
 */
function passHour(run: DeadlineRun, pushed: number | null): void {
  run.hour += 1;
  const rng = mulberry32(mixSeed(run.setup.seed, SEED_HOUR + run.hour));
  const pool = rivalPool(run.state, run.setup.daily);
  const enter = RIVAL_ENTER_BASE + RIVAL_ENTER_LATE * (run.hour / DEADLINE_HOURS);
  run.targets.forEach((t, i) => {
    const a = rng(), b = rng(), c = rng(), d = rng();
    if (!LIVE.includes(t.status)) return;
    const on = rivalOn(t);
    if (on) {
      if (i !== pushed && b < RIVAL_CLOSE) loseTo(run, t, on.club, on.offer);
      return;
    }
    if (a >= enter) return;
    const clubs = pool.filter(n => n !== t.mp.club);
    const club = clubs[Math.floor(c * clubs.length)] ?? 'A rival club';
    const ask = t.neg ? t.neg.theirAsk : t.mp.price;
    const offer = Math.max(0.1, Math.round(ask * (0.92 + 0.12 * d) * 10) / 10);
    if (t.status === 'talks' && t.neg) {
      t.neg = { ...t.neg, rivalBidder: club, rivalOffer: offer };
      t.note = `${club} are in at ${money(offer)}. Beat it or lose him.`;
    } else {
      t.rival = { club, offer };
      t.note = t.status === 'idle'
        ? `${club} have asked about him. Leave it an hour and they could close.`
        : `${club} have put an offer to his agent. Get his terms done.`;
    }
    say(run, `${club} move for ${t.mp.name}.`);
  });
  if (run.hour >= DEADLINE_HOURS) shutWindow(run);
}

/** The window shuts: anything unfinished collapses, then the grade. */
function shutWindow(run: DeadlineRun): void {
  run.hour = DEADLINE_HOURS;
  for (const t of run.targets) {
    if (t.status === 'talks' || t.status === 'terms') {
      t.status = 'collapsed';
      t.note = 'The window shut with his deal unfinished. It collapsed.';
      say(run, `The ${t.mp.name} deal was not done in time. It collapsed.`);
    }
  }
  run.state = { ...run.state, negotiation: null, transferWindow: null };
  run.grade = gradeWindow(run);
  say(run, `The window is shut. Grade: ${run.grade.letter}.`);
}

/** Seats one target's table on the career, runs one engine call, and lifts the table off again. */
function atTable(run: DeadlineRun, t: DeadlineTarget, seed: number, fn: (s: CareerState) => CareerState | null): Negotiation | null | undefined {
  const seated: CareerState = { ...run.state, negotiation: t.neg };
  const next = withSeed(seed, () => fn(seated));
  if (!next) return undefined;
  run.state = { ...next, negotiation: null };
  return next.negotiation ?? null;
}

/* ---------------- the actions ---------------- */

/** Phone the selling club. Costs no time; their ask is on the table after. */
export function openTalks(prev: DeadlineRun, i: number): DeadlineRun {
  const t0 = prev.targets[i];
  if (prev.grade || !t0 || t0.status !== 'idle') return prev;
  return onStaticWorld(() => {
    const run = cloneRun(prev);
    const t = run.targets[i];
    const neg = atTable(run, t, mixSeed(run.setup.seed, SEED_OPEN + i), s => startNegotiation(s, t.mp));
    /* Refused at the door: nothing happened, so nothing is recorded. The
       screen asks openRefusal for the engine's reason. */
    if (!neg) return prev;
    t.neg = t.rival ? { ...neg, rivalBidder: t.rival.club, rivalOffer: t.rival.offer } : neg;
    t.rival = null;
    t.status = 'talks';
    t.note = `${t.mp.club} want ${money(neg.theirAsk)}.`;
    run.actions.push({ t: 'open', i });
    say(run, `You call ${t.mp.club} about ${t.mp.name}. They want ${money(neg.theirAsk)}.`);
    return run;
  });
}

/** A cash bid at the fee table, through the engine's makeOffer. One hour. */
export function placeBid(prev: DeadlineRun, i: number, amount: number): DeadlineRun {
  const t0 = prev.targets[i];
  if (prev.grade || !t0 || t0.status !== 'talks' || !t0.neg) return prev;
  const amt = Math.round(amount * 10) / 10;
  /* A bid the budget cannot cover is refused before the hour is spent. */
  if (!(amt > 0) || amt > prev.state.budget) return prev;
  return onStaticWorld(() => {
    const run = cloneRun(prev);
    const t = run.targets[i];
    const askBefore = t.neg!.theirAsk;
    const rivalBefore = rivalOn(t);
    const neg = atTable(run, t, mixSeed(run.setup.seed, SEED_BID + i * 64 + t.neg!.stage), s => makeOffer(s, amt));
    if (!neg) return prev;
    t.neg = neg;
    t.hours += 1;
    run.actions.push({ t: 'bid', i, amt });
    if (neg.status === 'hijacked') {
      loseTo(run, t, neg.rivalBidder ?? rivalBefore?.club ?? 'A rival club', neg.rivalOffer ?? rivalBefore?.offer ?? amt);
    } else if (neg.status === 'collapsed') {
      t.status = 'collapsed';
      t.note = offerVerdict(amt, askBefore) === 'walkout'
        ? `${money(amt)} was so far off that ${t.mp.club} ended the talks.`
        : `${t.mp.club} ran out of patience and ended the talks.`;
      say(run, `${t.mp.club} end talks over ${t.mp.name}.`);
    } else if (neg.phase === 'terms') {
      t.status = 'terms';
      /* The clubs have shaken hands, so the rival at the fee table is beaten. */
      t.neg = { ...neg, rivalBidder: null, rivalOffer: null };
      t.note = `Fee agreed at ${money(amt)}. Now his agent.`;
      say(run, `Fee agreed with ${t.mp.club} for ${t.mp.name}: ${money(amt)}.`);
    } else if (rivalBefore && amt <= rivalBefore.offer) {
      t.note = `${rivalBefore.club} are still ahead at ${money(rivalBefore.offer)}.`;
    } else if (neg.rivalBidder && !rivalBefore) {
      t.note = `${neg.rivalBidder} just came in at ${money(neg.rivalOffer ?? 0)}. Bidding war.`;
      say(run, `${neg.rivalBidder} move for ${t.mp.name}.`);
    } else if (neg.theirAsk > askBefore) {
      t.note = `They took that as an insult. The ask went up to ${money(neg.theirAsk)}.`;
    } else {
      t.note = `They came down to ${money(neg.theirAsk)}. ${neg.patience} more ${neg.patience === 1 ? 'round' : 'rounds'} before they stop talking.`;
    }
    passHour(run, i);
    return run;
  });
}

/** An offer of personal terms through the engine's offerTerms. One hour. */
export function offerPersonalTerms(prev: DeadlineRun, i: number, offer: { wage: number; years: number; bonus: number }): DeadlineRun {
  const t0 = prev.targets[i];
  if (prev.grade || !t0 || t0.status !== 'terms' || !t0.neg?.terms) return prev;
  const fee = t0.neg.agreedFee ?? 0;
  const terms = boardTerms(t0.neg.terms.want, offer);
  const bonus = terms.bonus;
  /* The fee and the bonus come out of one budget; refused before the hour. */
  if (fee + bonus > prev.state.budget) return prev;
  if (prev.state.squad.length >= 30) return prev;
  return onStaticWorld(() => {
    const run = cloneRun(prev);
    const t = run.targets[i];
    const want = t.neg!.terms!.want;
    const patienceBefore = t.neg!.terms!.patience;
    const neg = atTable(run, t, mixSeed(run.setup.seed, SEED_TERMS + i * 64 + (3 - patienceBefore)), s => offerTerms(s, terms));
    if (!neg) return prev;
    /* Nothing moved (an engine refusal with a note): no hour, no action. */
    if (neg.status === 'open' && neg.terms && neg.terms.patience === patienceBefore && neg.terms.want === want) return prev;
    t.neg = neg;
    t.hours += 1;
    run.actions.push({ t: 'terms', i, wage: terms.wage, years: terms.years, bonus: terms.bonus });
    if (neg.status === 'agreed') {
      const signed = run.state.squad.find(p => p.name === t.mp.name);
      t.status = 'signed';
      t.rival = null;
      t.fee = fee;
      t.bonus = bonus;
      t.wage = signed?.wage ?? terms.wage;
      t.note = `Signed: ${money(fee)} to ${t.mp.club}, ${terms.years} years at ${t.wage}k a week.`;
      say(run, `Done deal. ${t.mp.name} joins from ${t.mp.club} for ${money(fee)}.`);
    } else if (neg.status === 'collapsed') {
      t.status = 'collapsed';
      t.note = 'His agent walked. The deal is off.';
      say(run, `The ${t.mp.name} deal falls through at the terms stage.`);
    } else {
      const now = neg.terms!;
      t.note = now.want.wage < want.wage
        ? `His agent came down to ${now.want.wage}k a week. ${now.patience} more ${now.patience === 1 ? 'try' : 'tries'}.`
        : `His agent says that is short. ${now.patience} more ${now.patience === 1 ? 'try' : 'tries'}.`;
    }
    passHour(run, i);
    return run;
  });
}

/** Walk away from a table. Costs no time; a rival who was circling usually takes him. */
export function walkFrom(prev: DeadlineRun, i: number): DeadlineRun {
  const t0 = prev.targets[i];
  if (prev.grade || !t0 || (t0.status !== 'talks' && t0.status !== 'terms')) return prev;
  return onStaticWorld(() => {
    const run = cloneRun(prev);
    const t = run.targets[i];
    const goneBefore = run.state.goneNames.length;
    /* At the terms table the rival lives on the frame (the fee table's rival
       was beaten when the fee was agreed), so he is seated where the engine's
       walkAway looks for him, and the same rule holds at both tables. */
    if (t.status === 'terms' && t.rival && t.neg) t.neg = { ...t.neg, rivalBidder: t.rival.club, rivalOffer: t.rival.offer };
    atTable(run, t, mixSeed(run.setup.seed, SEED_WALK + i), s => walkAway(s));
    run.actions.push({ t: 'walk', i });
    const rival = rivalOn(t);
    if (run.state.goneNames.length > goneBefore && rival) {
      loseTo(run, t, rival.club, rival.offer);
    } else {
      t.status = 'walked';
      t.note = 'You walked away.';
    }
    return run;
  });
}

/** Take a club's offer for one of your bench players, through the engine's acceptBid. One hour. */
export function sellPlayer(prev: DeadlineRun, k: number): DeadlineRun {
  const sale = prev.sales[k];
  if (prev.grade || !sale || sale.done) return prev;
  const p = prev.state.squad.find(x => x.id === sale.playerId);
  if (!p || !canLeaveSquad(prev.state, p)) return prev;
  return onStaticWorld(() => {
    const run = cloneRun(prev);
    const s = run.sales[k];
    const withBid: CareerState = {
      ...run.state,
      incomingBids: [{ playerId: s.playerId, playerName: s.name, club: s.club, offer: s.offer, status: 'open' }],
    };
    const next = acceptBid(withBid, s.playerId);
    if (!next) return prev;
    run.state = { ...next, incomingBids: [] };
    s.done = true;
    run.actions.push({ t: 'sell', i: k });
    say(run, `${s.name} leaves for ${s.club}. ${money(next.budget - prev.state.budget)} into the budget.`);
    passHour(run, null);
    return run;
  });
}

/** Close the laptop: the rest of the day passes and the window shuts. */
export function endDay(prev: DeadlineRun): DeadlineRun {
  if (prev.grade) return prev;
  return onStaticWorld(() => {
    const run = cloneRun(prev);
    run.actions.push({ t: 'end' });
    shutWindow(run);
    return run;
  });
}

/** Applies one recorded action, or returns the run unchanged when it no longer fits. */
export function applyAction(run: DeadlineRun, a: DeadlineAction): DeadlineRun {
  switch (a.t) {
    case 'open': return openTalks(run, a.i);
    case 'bid': return placeBid(run, a.i, a.amt);
    case 'terms': return offerPersonalTerms(run, a.i, a);
    case 'walk': return walkFrom(run, a.i);
    case 'sell': return sellPlayer(run, a.i);
    case 'end': return endDay(run);
  }
}

/**
 * A window rebuilt from its seed and its actions, which is how a refresh picks
 * up where it left off. An action that no longer fits stops the replay there
 * rather than inventing a different one.
 */
export function replayDeadlineDay(setup: DeadlineSetup, actions: DeadlineAction[]): DeadlineRun {
  let run = startDeadlineDay(setup);
  for (const a of actions) {
    if (run.grade) break;
    const next = applyAction(run, a);
    if (next === run) break;
    run = next;
  }
  return run;
}

/* ---------------- the grade ---------------- */

/** The share of value points one signing earns: full at or under his real value, none at VALUE_CEIL times it. */
export function valueShare(fee: number, value: number): number {
  if (!(value > 0)) return 0;
  const r = fee / value;
  return Math.max(0, Math.min(1, (VALUE_CEIL - r) / (VALUE_CEIL - VALUE_FAIR)));
}

export function letterFor(score: number): GradeLetter {
  return score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F';
}

/** Which signing fills which need, matched so the most needs are filled. */
function matchNeeds(needs: DeadlineNeed[], signings: DeadlineSigning[]): (string | null)[] {
  const owner: (number | null)[] = signings.map(() => null);
  const fits = (n: number, s: number) => needs[n].allowed.includes(signings[s].position) && signings[s].rating >= needs[n].min;
  const tryNeed = (n: number, seen: Set<number>): boolean => {
    for (let s = 0; s < signings.length; s++) {
      if (!fits(n, s) || seen.has(s)) continue;
      seen.add(s);
      if (owner[s] === null || tryNeed(owner[s] as number, seen)) { owner[s] = n; return true; }
    }
    return false;
  };
  needs.forEach((_, n) => { tryNeed(n, new Set()); });
  return needs.map((_, n) => {
    const s = owner.indexOf(n);
    return s >= 0 ? signings[s].name : null;
  });
}

export function gradeWindow(run: DeadlineRun): DeadlineGrade {
  const signings: DeadlineSigning[] = run.targets
    .filter(t => t.status === 'signed')
    .map(t => ({
      name: t.mp.name, club: t.mp.club, position: t.mp.position, rating: t.mp.rating,
      fee: t.fee ?? 0, value: t.mp.value ?? t.mp.price, bonus: t.bonus ?? 0, wage: t.wage ?? 0,
    }));
  const filledBy = matchNeeds(run.needs, signings);
  const filled = filledBy.filter(Boolean).length;
  const needs = run.needs.length;
  const share = needs ? filled / needs : 0;
  const needsPts = NEEDS_POINTS * share;
  const valuePts = signings.length ? VALUE_POINTS * (signings.reduce((a, s) => a + valueShare(s.fee, s.value), 0) / signings.length) : 0;
  const budgetLeft = Math.max(0, Math.round(run.state.budget * 10) / 10);
  /* Money left is only worth something once the job is done, so it is scaled
     by the share of needs filled: a window that signs nobody scores nothing. */
  const budgetPts = BUDGET_POINTS * Math.max(0, Math.min(1, budgetLeft / Math.max(0.1, run.startBudget))) * share;
  const score = Math.round(needsPts + valuePts + budgetPts);
  return {
    score, letter: letterFor(score), needs, filled, filledBy,
    needsPts: Math.round(needsPts * 10) / 10, valuePts: Math.round(valuePts * 10) / 10, budgetPts: Math.round(budgetPts * 10) / 10,
    signings, budgetLeft, startBudget: run.startBudget,
  };
}

/** The share line, numbers only. */
export function shareText(run: DeadlineRun): string {
  const g = run.grade;
  const head = run.setup.daily ? `Deadline Day ${run.setup.daily}` : 'Deadline Day';
  if (!g) return `${head}\n${run.state.clubName}: still on the phones\ndouknowball.com/deadline-day`;
  return `${head}\n${run.state.clubName}: grade ${g.letter} (${g.score}/100)\n${needBoxes(g)} ${g.filled} of ${g.needs} needs, ${money(g.budgetLeft)} left\ndouknowball.com/deadline-day`;
}

/** One box a need: green filled, red not. The share text and the result card's grid. */
export function needBoxes(g: DeadlineGrade): string {
  return g.filledBy.map(f => (f ? '🟩' : '🟥')).join('');
}
