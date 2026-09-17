/**
 * Round 627: Fight Promoter, the third role on the Round 620 fight model.
 *
 * Career is Round 620, the gym is Round 625, and this is the last of the three
 * the owner pointed at. Fighters, attributes, styles, the bout, damage and
 * ageing all come from `fightCareer.ts` unchanged, and the venue economics take
 * the shape Stadium Tycoon already uses. Nothing here is a third copy of any of
 * it.
 *
 * WHAT MAKES IT A DIFFERENT GAME FROM THE OTHER TWO. In the career you carry
 * the damage. In the gym you answer for it. Here you do neither: you sell
 * tickets. The two ways to fill a building pull against each other and that is
 * the whole design.
 *
 *   A MISMATCH sells on the name. Put a known fighter in with somebody who
 *   cannot live with him and the house is full, the purse is cheap and nobody
 *   remembers it a week later.
 *
 *   A REAL FIGHT sells on the fight. Two men who genuinely cannot be separated
 *   cost you both purses, and half the time your draw walks out beaten and
 *   worth less next time.
 *
 * So the money says mismatch and the reputation says make the fight, and a
 * promoter who only ever does one of them loses. That claim is the one the
 * harness has to prove, because without it this is a spreadsheet.
 *
 * Every fighter is generated, as in Rounds 620 and 625. No real boxer is
 * matched, paid, beaten or promoted anywhere in it. There is no wagering.
 */

import { rngFrom, hashLabel, clamp, clampi } from '@/lib/careerEngine';
import {
  makeFighter, ratingOf, simBout, weightById, WEIGHT_CLASSES,
  type Fighter, type WeightId, type Tactic, type BoutResult, type Method,
} from '@/lib/fightCareer';

/* ─────────────────────────── venues ─────────────────────────── */

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  /** Hire cost in millions, whether anybody turns up or not. */
  rent: number;
  /** Reputation you need before they will take your booking. */
  needs: number;
}

/** Generic rooms. No real arena is named anywhere in this game. */
export const VENUES: Venue[] = [
  { id: 'hall', name: 'The Leisure Centre', capacity: 1200, rent: 0.006, needs: 0 },
  { id: 'town', name: 'Town Hall', capacity: 3000, rent: 0.018, needs: 12 },
  { id: 'ballroom', name: 'The Ballroom', capacity: 6000, rent: 0.05, needs: 26 },
  { id: 'arena', name: 'City Arena', capacity: 16000, rent: 0.17, needs: 45 },
  { id: 'dome', name: 'The Dome', capacity: 42000, rent: 0.62, needs: 68 },
  { id: 'stadium', name: 'National Stadium', capacity: 78000, rent: 1.45, needs: 86 },
];

export function venueById(id: string): Venue {
  return VENUES.find(v => v.id === id) ?? VENUES[0];
}

/* ─────────────────────────── state ─────────────────────────── */

export interface Booking {
  /** Two fighters from the pool, by id. */
  aId: string;
  bId: string;
  rounds: number;
  title: boolean;
}

export interface ShowBout {
  a: Fighter;
  b: Fighter;
  result: BoutResult;
  rounds: number;
  title: boolean;
  /** How good the fight turned out to be, 0 to 100. Not the same as how it sold. */
  quality: number;
}

export interface ShowResult {
  venue: Venue;
  attendance: number;
  ticketPrice: number;
  gate: number;
  purses: number;
  rent: number;
  profit: number;
  bouts: ShowBout[];
  repDelta: number;
  headline: string;
}

export interface PromoterState {
  version: 1;
  name: string;
  show: number;
  /** Millions. Below zero after a show and you are out of the business. */
  money: number;
  /** 0 to 100. Opens rooms, and makes fighters take your calls. */
  reputation: number;
  /** Everyone who will work for you, carried between shows with their damage. */
  pool: Fighter[];
  history: { show: number; venue: string; attendance: number; profit: number; best: string }[];
  log: string[];
  closed: boolean;
  seed: number;
  rngTick: number;
}

const POOL_TARGET = 10;

export function newPromoter(name: string, seedLabel?: string): PromoterState {
  const seed = hashLabel(seedLabel ?? `promoter|${name}`);
  const rng = rngFrom(seed);
  const st: PromoterState = {
    version: 1,
    name: name.trim() || 'Small Hall Promotions',
    show: 1,
    money: 0.12,
    reputation: 5,
    pool: [],
    history: [],
    log: ['You book your first room. Nobody has heard of you.'],
    closed: false,
    seed,
    rngTick: 0,
  };
  for (let i = 0; i < POOL_TARGET; i += 1) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, 38 + rng() * 18, w);
    f.wins = Math.floor(rng() * 8);
    f.losses = Math.floor(rng() * 4);
    st.pool.push(f);
  }
  return st;
}

function stream(st: PromoterState): { rng: () => number; done: (n: number) => void } {
  const rng = rngFrom(st.seed + st.rngTick * 7919);
  return { rng, done: (n: number) => { st.rngTick += Math.max(1, n); } };
}

/** A fighter's weight class, derived rather than stored twice. */
export function weightOf(f: Fighter): WeightId {
  return WEIGHT_CLASSES[Math.abs(hashLabel(f.id)) % WEIGHT_CLASSES.length].id;
}

/**
 * What a fighter's name is worth on a poster.
 *
 * Record and knockouts, and it does NOT fall when he is damaged, which is the
 * same trap the gym runs on: a faded name still sells.
 */
export function drawOf(f: Fighter): number {
  /* Round 627: A LOSS COSTS A NAME MORE THAN A WIN BUILDS IT, and that is the
     whole reason feeding a mismatch is tempting rather than merely cheap.
     At a penalty of 0.7 a defeat barely dented a fighter's draw, so matching
     two good men had no downside at all and making real fights beat feeding
     names on the money as well as on the reputation, which left no decision in
     the matchmaking. Put two of your draws in together and one of them comes
     out worth much less, every time. Protecting a record is not cowardice in
     this sport, it is arithmetic, and the mode has to let the player feel that
     before asking them not to do it. */
  return clamp(f.wins * 1.5 + f.kos * 1.1 - f.losses * 2.4, 0, 40);
}

/**
 * How appealing a matchup looks BEFORE anybody throws a punch, which is what
 * sells the ticket. The crowd buys two things: names they know, and a fight
 * they cannot call.
 */
export function appealOf(a: Fighter, b: Fighter, title: boolean): number {
  const names = drawOf(a) + drawOf(b);
  const gap = Math.abs(ratingOf(a) - ratingOf(b));
  /* An even fight is the draw. A gap of twenty is a workout nobody pays for,
     and the crowd can read a record. */
  const evenness = clamp(1 - gap / 22, 0, 1);
  /* Round 627: the NAMES carry a card and the matchup seasons it, which is the
     right way round and was not how this started. At 0.9 on the names against
     26 flat for evenness, competitiveness was worth more than half of what sold
     a ticket, so an even fight between two unknowns outsold a star, and making
     real fights beat feeding names on the money as well as the reputation. A
     crowd turns up for somebody it has heard of and stays for the fight. */
  return clamp(names * 1.3 + evenness * 14 + (title ? 22 : 0), 0, 100);
}

/** Whether the two men can legally and sensibly be matched at all. */
export function legalMatch(a: Fighter, b: Fighter): boolean {
  if (a.id === b.id) return false;
  if (weightOf(a) !== weightOf(b)) return false;
  if (a.damage >= 80 || b.damage >= 80) return false;
  return true;
}

/** What the two of them cost you, whatever happens on the night. */
export function purseFor(a: Fighter, b: Fighter, title: boolean): number {
  /* Round 627: measured down from 0.0042 and 0.004. At those rates three
     bouts cost more than a full small hall could take at the door, so seven
     promotions in ten went under inside a few shows whatever they did, which
     is not a difficulty curve, it is a closed door. */
  const base = (drawOf(a) + drawOf(b)) * 0.0011 + 0.0006;
  return Math.round(base * (title ? 2.4 : 1) * 1000) / 1000;
}

export interface ShowPlan {
  venueId: string;
  ticketPrice: number;
  bookings: Booking[];
}

/**
 * How many turn up.
 *
 * The card's appeal and your name set the ceiling, and the ticket price decides
 * how much of it you actually sell. Price it high on a weak card and the room
 * is empty and paid for.
 */
export function expectedAttendance(st: PromoterState, plan: ShowPlan): number {
  const venue = venueById(plan.venueId);
  const bouts = plan.bookings
    .map(b => {
      const a = st.pool.find(f => f.id === b.aId);
      const c = st.pool.find(f => f.id === b.bId);
      return a && c ? appealOf(a, c, b.title) : 0;
    })
    .sort((x, y) => y - x);
  if (!bouts.length) return 0;
  /* The main event carries the card. The rest of it helps, with less weight the
     further down the bill it sits, which is how a fight card actually sells. */
  const cardAppeal = bouts.reduce((s, v, i) => s + v / (i + 1.6), 0);
  const pull = clamp((cardAppeal / 46) * (0.6 + st.reputation / 110), 0, 1.25);
  /* Price elasticity against what this card is worth. A cheap seat at a good
     show fills the room; the same seat at a bad one does not. */
  const fair = 0.00004 + (cardAppeal / 46) * 0.00026;
  const priceFactor = clamp(1.25 - (plan.ticketPrice / Math.max(1e-9, fair)) * 0.55, 0.05, 1.2);
  return clampi(venue.capacity * clamp(pull * priceFactor, 0, 1), 0, venue.capacity);
}

export interface HouseFill {
  /** Whole percent of the seats taken. Rounded down, so it never reads fuller than the room was. */
  percent: number;
  /** Every seat taken. A room with one empty seat is not sold out. */
  soldOut: boolean;
}

/**
 * How full the room was, for the result screen.
 *
 * Round 630 worked this out inside the render as a rounded percentage and
 * called anything from 99 up a sell out, so 15,853 in a room of 16,000 read
 * "99% of 16,000, sold out" with 147 seats empty and got the gold confetti.
 * It lives here so `simFightPromoter` can hold the screen to the seats: sold
 * out means attendance reached capacity, and 100 is only ever shown then.
 */
export function houseFill(attendance: number, capacity: number): HouseFill {
  const soldOut = attendance >= capacity;
  const percent = soldOut ? 100 : clamp(Math.floor((attendance / capacity) * 100), 0, 99);
  return { percent, soldOut };
}

/** How good the fight actually was, judged after the fact. */
export function qualityOf(res: BoutResult, rounds: number): number {
  /* Round 627: COMPETITIVENESS CARRIES THIS, and the drama only counts inside a
     fight that was actually a fight.

     The first version weighted punches landed, knockdowns and stoppages
     alongside how close it was, and a one sided beating delivers all three in
     quantity. So feeding a name a soft opponent scored as a GREAT fight,
     mismatches beat real fights on reputation as well as on money, and the mode
     had no decision in it at all. A blowout knockout is not a good fight, and
     the measure has to say so. */
  /* Closeness comes off ROUNDS WON, not the point spread, because the spread is
     far too weak a signal to carry this. A card moves ten to nine, so a total
     shutout over eight rounds is only eight points apart, and scoring that as
     41 points of penalty still left a blowout reading as competitive. Rounds
     won separates them properly: a shutout is zero and a fight nobody could
     split is a hundred. */
  const share = clamp(res.roundsWon / Math.max(1, res.rounds.length), 0, 1);
  const close = clampi(100 - Math.abs(share - 0.5) * 200, 0, 100);
  const action = Math.min(100, res.rounds.reduce((s, r) => s + r.playerLanded + r.oppLanded, 0) / Math.max(1, rounds) * 3.4);
  const competitive = close >= 45;
  const drama = competitive && res.rounds.some(r => r.knockdown) ? 16 : 0;
  const finish = competitive && (res.method === 'KO' || res.method === 'TKO') ? 12 : 0;
  return clampi(close * 0.62 + action * 0.26 + drama + finish, 0, 100);
}

export function runShow(st: PromoterState, plan: ShowPlan, tactics: Tactic[] = ['box', 'press', 'counter']): {
  state: PromoterState; result: ShowResult;
} | null {
  if (st.closed) return null;
  const venue = venueById(plan.venueId);
  if (venue.needs > st.reputation) return null;
  if (!plan.bookings.length) return null;
  const { rng, done } = stream(st);

  const attendance = expectedAttendance(st, plan);
  const gate = Math.round(attendance * plan.ticketPrice * 1000) / 1000;
  let purses = 0;
  const bouts: ShowBout[] = [];
  const pool = st.pool.map(f => ({ ...f, attrs: { ...f.attrs } }));

  for (const b of plan.bookings) {
    const ai = pool.findIndex(f => f.id === b.aId);
    const bi = pool.findIndex(f => f.id === b.bId);
    if (ai < 0 || bi < 0) continue;
    const a = pool[ai];
    const c = pool[bi];
    purses += purseFor(a, c, b.title);
    const res = simBout({
      player: a, opponent: c, rounds: b.rounds, weight: weightOf(a), tactics, campQuality: 0.5,
    }, rng);
    const quality = qualityOf(res, b.rounds);
    bouts.push({ a: { ...a }, b: { ...c }, result: res, rounds: b.rounds, title: b.title, quality });

    a.damage = Math.round((a.damage + res.damageTaken) * 10) / 10;
    c.damage = Math.round((c.damage + res.damageDealt) * 10) / 10;
    a.age = Math.round((a.age + 0.08) * 100) / 100;
    c.age = Math.round((c.age + 0.08) * 100) / 100;
    if (res.winner === 'player') { a.wins += 1; c.losses += 1; if (res.method === 'KO' || res.method === 'TKO') a.kos += 1; }
    else if (res.winner === 'opp') { c.wins += 1; a.losses += 1; if (res.method === 'KO' || res.method === 'TKO') c.kos += 1; }
    else { a.draws += 1; c.draws += 1; }
  }
  done(plan.bookings.length * 80 + 8);

  /* Round 627: A GUARANTEE OR A SHARE OF THE DOOR, WHICHEVER IS GREATER, which
     is how fighters are actually paid and also the only thing that stops this
     economy running away.
     With flat purses alone the gate grew with appeal on both terms at once
     (a better card draws more people AND justifies a dearer ticket) while the
     cost of the show barely moved, so forty shows banked 328m and every
     promotion survived. A share means the men on the card take the upside with
     you, so a big night is still a good night and never a windfall, and a room
     that does not fill still owes the guarantee. */
  const flat = Math.round(purses * 1000) / 1000;
  const share = Math.round(gate * 0.58 * 1000) / 1000;
  purses = Math.max(flat, share);
  const profit = Math.round((gate - purses - venue.rent) * 1000) / 1000;

  /* REPUTATION IS EARNED BY THE FIGHTS, NOT BY THE TAKINGS, and that is the
     whole counterweight to the money. A full house watching a mismatch is
     worth almost nothing to your name. */
  const best = bouts.reduce((m, b) => (b.quality > m ? b.quality : m), 0);
  const meanQ = bouts.length ? bouts.reduce((s, b) => s + b.quality, 0) / bouts.length : 0;
  const headroom = 1 - st.reputation / 100;
  const repDelta = Math.round(((meanQ - 46) / 11 + (best >= 78 ? 2.2 : 0)) * clamp(headroom * 1.6, 0.15, 1) * 10) / 10;

  const next: PromoterState = {
    ...st,
    show: st.show + 1,
    money: Math.round((st.money + profit) * 1000) / 1000,
    reputation: clamp(Math.round((st.reputation + repDelta) * 10) / 10, 0, 100),
    pool,
    history: [...st.history, {
      show: st.show, venue: venue.name, attendance, profit,
      best: bouts.length ? `${bouts[0].a.name} vs ${bouts[0].b.name}` : 'nothing',
    }],
    log: [
      `${venue.name}: ${attendance.toLocaleString()} in, gate ${gate.toFixed(3)}m, purses ${purses.toFixed(3)}m, ${profit >= 0 ? 'profit' : 'loss'} ${Math.abs(profit).toFixed(3)}m.`,
      ...st.log,
    ],
  };
  next.pool = refreshPool(next);
  if (next.money < 0) {
    next.closed = true;
    next.log = ['You cannot cover the next room. That is the business.', ...next.log];
  }
  const headline = bouts.length
    ? `${bouts[0].a.name} against ${bouts[0].b.name}, ${bouts[0].result.method}`
    : 'no fights';
  return { state: next, result: { venue, attendance, ticketPrice: plan.ticketPrice, gate, purses, rent: venue.rent, profit, bouts, repDelta, headline } };
}

/**
 * Fighters come and go. Anybody finished leaves, and your name decides who
 * replaces him: a promoter nobody rates gets whoever is left.
 */
function refreshPool(st: PromoterState): Fighter[] {
  const { rng, done } = stream(st);
  const alive = st.pool.filter(f => f.damage < 82 && f.age < 39);
  const out = alive.slice();
  /* Round 627: FIGHTERS LEAVE A PROMOTER NOBODY RATES, and they take the top of
     your card with them.
     Without this the pool only ever lost men who were physically finished,
     which is slow, so after fourteen shows a promotion with a name of 92 and
     one with a name of 5 held almost identical fighters (measured 48.5 against
     46.0) and reputation bought nothing at all. Churn is the mechanism that
     makes a name worth having, and losing your best man to somebody bigger is
     what it feels like from underneath. */
  const leaveChance = 0.55 * (1 - st.reputation / 100);
  if (out.length > 4 && rng() < leaveChance) {
    let bi = 0;
    for (let i = 1; i < out.length; i += 1) if (ratingOf(out[i]) > ratingOf(out[bi])) bi = i;
    out.splice(bi, 1);
  }
  /* And the other direction, which the first version missed entirely and which
     is the half that actually makes a name worth having. Departures were the
     only way anybody new arrived, and departures fall as reputation rises, so a
     promoter with a name of 92 simply KEPT the ordinary fighters he started
     with while the one with no name churned through people. The pool barely
     moved either way. A promotion people want to be on replaces its weakest man
     with somebody better, and that is what the name buys. */
  const upgradeChance = 0.12 + (st.reputation / 100) * 0.55;
  if (out.length >= POOL_TARGET && rng() < upgradeChance) {
    /* The man who goes is the one who does not SELL, judged on his draw rather
       than on what he has left. Dropping the lowest rated man instead meant
       dropping whoever was most damaged, every time, so nobody was ever on the
       books long enough to wear out and the fighters became props. A battered
       veteran with a name is exactly the man a promoter keeps, which is the
       whole uncomfortable point of this mode. */
    let wi = 0;
    for (let i = 1; i < out.length; i += 1) if (drawOf(out[i]) < drawOf(out[wi])) wi = i;
    out.splice(wi, 1);
  }
  const tier = 36 + (st.reputation / 100) * 36;
  while (out.length < POOL_TARGET) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, clamp(tier + (rng() - 0.45) * 15, 28, 92), w);
    f.wins = Math.floor(rng() * 6);
    out.push(f);
  }
  done(POOL_TARGET * 3);
  return out;
}

export interface PromoterVerdict { score: number; tier: string; bullets: string[] }

export function promoterVerdict(st: PromoterState): PromoterVerdict {
  const shows = st.history.length;
  const profitable = st.history.filter(h => h.profit > 0).length;
  const crowd = shows ? st.history.reduce((s, h) => s + h.attendance, 0) / shows : 0;
  const score = clampi(
    st.reputation * 0.62 +
    Math.min(24, st.money * 5) +
    Math.min(14, profitable * 0.9),
    0, 100,
  );
  const tier = score >= 86 ? 'The Big Time'
    : score >= 68 ? 'A Real Promoter'
      : score >= 48 ? 'Making a Living'
        : score >= 26 ? 'Small Hall'
          : 'A Man With a Ring';
  return {
    score,
    tier,
    bullets: [
      `${shows} show${shows === 1 ? '' : 's'}, ${profitable} of them in profit.`,
      `Average house ${Math.round(crowd).toLocaleString()}.`,
      `Name ${st.reputation.toFixed(0)} out of 100, ${st.money.toFixed(3)}m in the bank.`,
    ],
  };
}
