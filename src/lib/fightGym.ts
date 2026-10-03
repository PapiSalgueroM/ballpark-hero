/**
 * Round 625: Fight Gym, the second role on the Round 620 fight model.
 *
 * The owner asked for the thing he liked about a well known independent
 * studio's boxing game: that you can fight a career, or sign fighters and run
 * a gym, or promote. Round 620 built the career. This is the gym, and it is
 * deliberately NOT a second engine. Fighters, attributes, styles, the bout
 * itself, damage, ageing and retirement all come from `fightCareer.ts`
 * unchanged. What is new here is whose problem it is.
 *
 * THE DIFFERENCE THAT MAKES IT A DIFFERENT GAME. In the career you carry your
 * own damage and you feel every decision in your own body. In the gym the
 * damage lands on somebody else and the money lands on you, and that is the
 * entire design. A fighter who is half finished still sells tickets. Nothing
 * stops you putting him in again except what it does to him, and to what people
 * think of your gym.
 *
 * Every fighter here is generated, as in Round 620. No real boxer is signed,
 * trained, damaged or retired anywhere in this game, and there is no wagering.
 */

import { rngFrom, hashLabel, clamp, clampi } from '@/lib/careerEngine';
import {
  makeFighter, ratingOf, simBout, weightById, WEIGHT_CLASSES,
  type Fighter, type WeightId, type Tactic, type BoutResult, type Method,
} from '@/lib/fightCareer';

/* ─────────────────────────── state ─────────────────────────── */

export interface Prospect {
  id: string;
  fighter: Fighter;
  /** Signing fee in millions. */
  fee: number;
  /** What the scout will say out loud. Never a promise, because scouts are wrong. */
  word: string;
}

export interface GymFightLine {
  week: number;
  fighter: string;
  opponent: string;
  result: 'W' | 'L' | 'D';
  method: Method;
  purse: number;
  cut: number;
  title: boolean;
}

export interface GymOffer {
  id: string;
  opponent: Fighter;
  purse: number;
  rounds: number;
  rankGain: number;
  title: boolean;
  label: string;
}

export interface GymState {
  version: 1;
  name: string;
  week: number;
  /** Millions. Below zero at the end of a week and the gym closes. */
  money: number;
  /** 0 to 100. Buys better prospects and bigger purses. */
  reputation: number;
  roster: Fighter[];
  prospects: Prospect[];
  history: GymFightLine[];
  titles: number;
  /** Men who left, and how. The gym is judged on this too. */
  alumni: { name: string; record: string; damage: number; titles: number }[];
  closed: boolean;
  log: string[];
  seed: number;
  rngTick: number;
  /**
   * Round 955: how the gym ended. Absent while it is open. An old save that is
   * closed without one went broke, because until this round that was the only
   * way a gym could close.
   */
  exit?: GymExit;
  /** Round 955: what the buyer paid, in millions, when the gym was sold. */
  soldFor?: number;
  /** Round 955: per fighter, the week of his last block and the work since his last fight. */
  training?: Record<string, GymCamp>;
}

export type GymExit = 'sold' | 'broke';

/** Round 955: what a training block works on. The same four areas as a career camp. */
export type TrainFocus = 'conditioning' | 'power' | 'defence' | 'speed';
export const TRAIN_FOCI: TrainFocus[] = ['conditioning', 'power', 'defence', 'speed'];

export interface GymCamp {
  /** The week of his last block, which is what holds the one block a week limit. */
  week: number;
  /** Blocks since his last fight, by focus. Cleared when he fights. */
  blocks: Record<TrainFocus, number>;
}

/** Weekly overhead in millions: rent, coaches, and everybody who eats. */
export function weeklyCost(g: GymState): number {
  return Math.round((0.012 + g.roster.length * 0.009) * 1000) / 1000;
}

/** The gym's cut of a purse. A gym that has done nothing takes less. */
export function cutRate(g: GymState): number {
  return 0.2 + (g.reputation / 100) * 0.15;
}

const SCOUT_WORDS = [
  'Hands like nobody his age.',
  'Raw, but he can take it.',
  'Been in the gym since he was nine.',
  'Everyone else passed on him.',
  'Will be a problem in two years.',
  'Fights like he has something to prove.',
  'Nothing special, but he turns up.',
  'Body of a man, head of a boy.',
];

export function newGym(name: string, seedLabel?: string): GymState {
  const seed = hashLabel(seedLabel ?? `gym|${name}`);
  const rng = rngFrom(seed);
  const g: GymState = {
    version: 1,
    name: name.trim() || 'The Gym',
    week: 1,
    money: 0.6,
    reputation: 8,
    roster: [],
    prospects: [],
    history: [],
    titles: 0,
    alumni: [],
    closed: false,
    log: ['You open the doors. Two kids are already waiting outside.'],
    seed,
    rngTick: 0,
  };
  /* Two on the books from day one, because an empty gym has no way to earn and
     the first decision should be which fight to take, not whether to exist. */
  for (let i = 0; i < 2; i += 1) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, 44 + rng() * 8, w);
    f.age = clampi(19 + rng() * 3, 19, 23);
    g.roster.push(f);
  }
  g.prospects = prospectsFor(g);
  return g;
}

function stream(g: GymState): { rng: () => number; done: (used: number) => void } {
  const rng = rngFrom(g.seed + g.rngTick * 7919);
  return { rng, done: (n: number) => { g.rngTick += Math.max(1, n); } };
}

/**
 * Who walks through the door this week.
 *
 * Reputation is the whole gate. A gym nobody has heard of gets whoever nobody
 * else wanted, and the fee is small because the risk is yours. A gym with belts
 * on the wall gets shown real prospects and pays for them.
 */
export function prospectsFor(g: GymState): Prospect[] {
  const { rng, done } = stream(g);
  const out: Prospect[] = [];
  const tier = 38 + (g.reputation / 100) * 34;
  for (let i = 0; i < 3; i += 1) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, clamp(tier + (rng() - 0.4) * 14, 30, 88), w);
    f.age = clampi(18 + rng() * 6, 18, 26);
    const fee = Math.round((0.02 + (ratingOf(f) / 100) ** 2.4 * 0.72) * 1000) / 1000;
    out.push({
      id: `p${g.week}-${i}`,
      fighter: f,
      fee,
      word: SCOUT_WORDS[Math.floor(rng() * SCOUT_WORDS.length)],
    });
  }
  done(9);
  return out;
}

export function signProspect(g: GymState, id: string): GymState | null {
  if (g.closed) return null;
  const p = g.prospects.find(x => x.id === id);
  if (!p) return null;
  if (p.fee > g.money) return null;
  if (g.roster.length >= 6) return null;
  const next: GymState = {
    ...g,
    money: Math.round((g.money - p.fee) * 1000) / 1000,
    roster: [...g.roster, p.fighter],
    prospects: g.prospects.filter(x => x.id !== id),
    log: [`Signed ${p.fighter.name}, ${weightById(guessWeight(p.fighter)).label}, for ${p.fee.toFixed(3)}m.`, ...g.log],
  };
  return next;
}

/* A fighter carries no weight class of his own on the Round 620 model, because
   there a career has exactly one. A gym has men at several, so the class is
   derived from the man rather than stored twice and allowed to disagree. */
export function guessWeight(f: Fighter): WeightId {
  const idx = Math.abs(hashLabel(f.id)) % WEIGHT_CLASSES.length;
  return WEIGHT_CLASSES[idx].id;
}

/**
 * A training block. Costs money, moves a fighter toward his ceiling, and the
 * closer he already is the less it buys, exactly as camp does in the career.
 *
 * Round 955: ONE BLOCK PER FIGHTER PER WEEK, AND IT WORKS ON ONE THING. Before
 * this a block bumped all four areas and could be bought as many times a week
 * as the money allowed, so training was a button you pressed until the cash
 * ran low rather than a decision. Now each block picks a focus, that area alone
 * grows, and the work also carries into his next fight: see campQualityFor.
 */
export const TRAIN_COST = 0.035;

/** Growth per block in the focus area, at full headroom. The career camp's figure. */
const FOCUS_GAIN = 2.4;

const FOCUS_ATTR: Record<TrainFocus, 'stamina' | 'power' | 'defence' | 'speed'> = {
  conditioning: 'stamina',
  power: 'power',
  defence: 'defence',
  speed: 'speed',
};

const FOCUS_LINE: Record<TrainFocus, string> = {
  conditioning: 'ran the hills and did the rounds on the bags',
  power: 'spent the week on the heavy bag',
  defence: 'spent the week slipping and blocking',
  speed: 'spent the week on the pads and the rope',
};

const noBlocks = (): Record<TrainFocus, number> => ({ conditioning: 0, power: 0, defence: 0, speed: 0 });

/** True when this fighter has already had his block this week. */
export function trainedThisWeek(g: GymState, fighterId: string): boolean {
  return g.training?.[fighterId]?.week === g.week;
}

export function trainFighter(g: GymState, fighterId: string, focus: TrainFocus): GymState | null {
  if (g.closed || g.money < TRAIN_COST) return null;
  if (!FOCUS_ATTR[focus]) return null;
  if (trainedThisWeek(g, fighterId)) return null;
  const i = g.roster.findIndex(f => f.id === fighterId);
  if (i < 0) return null;
  const f = { ...g.roster[i], attrs: { ...g.roster[i].attrs } };
  const key = FOCUS_ATTR[focus];
  f.attrs[key] = clampi(f.attrs[key] + clamp((f.potential - f.attrs[key]) / 22, 0, 1) * FOCUS_GAIN, 15, 99);
  const roster = g.roster.slice();
  roster[i] = f;
  const prev = g.training?.[fighterId];
  const blocks = { ...noBlocks(), ...(prev?.blocks ?? {}) };
  blocks[focus] += 1;
  return {
    ...g,
    money: Math.round((g.money - TRAIN_COST) * 1000) / 1000,
    roster,
    training: { ...(g.training ?? {}), [fighterId]: { week: g.week, blocks } },
    log: [`${f.name} ${FOCUS_LINE[focus]}.`, ...g.log],
  };
}

/**
 * How ready a man is for his next fight, 0 to 1, which simBout reads as the
 * camp. A man nobody has worked with comes in at the even 0.5 every gym fight
 * used before Round 955. Each block since his last fight adds a little, up to
 * four, and a conditioning block among them gives him gas for the late rounds.
 */
export function campQualityFor(g: GymState, fighterId: string): number {
  const b = g.training?.[fighterId]?.blocks;
  if (!b) return 0.5;
  const total = b.conditioning + b.power + b.defence + b.speed;
  return clamp(0.5 + Math.min(total, 4) * 0.05 + (b.conditioning > 0 ? 0.1 : 0), 0, 1);
}

/**
 * What is on the table for one of your fighters.
 *
 * Purses scale with the gym's reputation as well as the fighter's, because a
 * promoter pays for the name on the poster and the gym is half of it.
 */
export function offersForFighter(g: GymState, fighterId: string): GymOffer[] {
  const f = g.roster.find(x => x.id === fighterId);
  if (!f) return [];
  const { rng, done } = stream(g);
  const mine = ratingOf(f);
  const w = guessWeight(f);
  const contender = f.rank <= 1;
  const shapes = contender
    ? [
      { label: 'Vacant title', delta: -2, pay: 2, gain: 0, rounds: 12 },
      { label: 'Champion away from home', delta: 4, pay: 3, gain: 0, rounds: 12 },
      { label: 'Undisputed champion', delta: 9, pay: 4.6, gain: 0, rounds: 12 },
    ]
    : [
      { label: 'Six rounder', delta: -11, pay: 0.35, gain: 1, rounds: 6 },
      { label: 'Even money', delta: 1, pay: 1, gain: 3, rounds: 10 },
      { label: 'Step up', delta: 9, pay: 2.1, gain: 6, rounds: 10 },
    ];
  const rank = f.rank >= 99 ? 20 : f.rank;
  /* THE TEMPTATION, and without it this mode has no decision in it.
     A fighter's purse is not only what he can still do, it is what people
     remember him doing. A faded name sells tickets, which is why a wrecked
     veteran keeps getting offered real money long after he should have stopped.
     Measured before this existed: grinding men into the ground lost on every
     axis at once, scoring 39 against a careful gym's 89, so it was not a
     temptation at all, it was an obviously wrong button nobody would press.
     Name value comes off the record and never decays with damage, so the old
     man in the corner of your gym is worth more to you dead than alive, and the
     only thing stopping you is what it does to your name. */
  const nameValue = clamp(f.wins * 0.13 + f.kos * 0.09, 0, 4);
  const fame = (contender ? 5 : clamp((16 - Math.min(rank, 16)) / 3.4, 0.35, 4.6)) + nameValue;
  const out: GymOffer[] = shapes.map((s, i) => {
    const relative = clamp(mine + s.delta, 25, 97);
    const opp = makeFighter(rng, contender ? Math.max(relative, 80 + rng() * 15) : relative, w);
    opp.age = clampi(22 + rng() * 13, 20, 38);
    const purse = Math.round((0.04 + fame * 0.14 + (g.reputation / 100) * 0.18) * s.pay * 1000) / 1000;
    return {
      id: `g${g.week}-${i}`,
      opponent: opp,
      purse,
      rounds: s.rounds,
      rankGain: s.gain,
      title: contender,
      label: s.label,
    };
  });
  done(12);
  return out;
}

export function takeGymFight(g: GymState, fighterId: string, offer: GymOffer, tactics: Tactic[]): {
  state: GymState; result: BoutResult;
} | null {
  if (g.closed) return null;
  const i = g.roster.findIndex(x => x.id === fighterId);
  if (i < 0) return null;
  const { rng, done } = stream(g);
  const fighter = g.roster[i];
  const result = simBout({
    player: fighter, opponent: offer.opponent, rounds: offer.rounds,
    weight: guessWeight(fighter), tactics, campQuality: campQualityFor(g, fighterId),
  }, rng);
  done(offer.rounds * 6 + 4);

  const f = { ...fighter, attrs: { ...fighter.attrs } };
  f.damage = Math.round((f.damage + result.damageTaken) * 10) / 10;
  f.age = Math.round((f.age + 0.06) * 100) / 100;
  const won = result.winner === 'player';
  const drew = result.winner === 'draw';
  if (won) f.wins += 1; else if (drew) f.draws += 1; else f.losses += 1;
  if (won && (result.method === 'KO' || result.method === 'TKO')) f.kos += 1;
  if (offer.title && won) f.rank = 0;
  else if (won) f.rank = clampi(Math.min(f.rank === 99 ? 20 : f.rank, 20) - offer.rankGain, 1, 99);
  else if (!drew) f.rank = clampi((f.rank === 99 ? 20 : f.rank) + 4, 1, 99);

  const cut = Math.round(offer.purse * cutRate(g) * 1000) / 1000;
  const roster = g.roster.slice();
  roster[i] = f;

  /* Reputation moves on results, and it moves further on what the result cost.
     A win is a win, a beating taken in a losing cause is not nothing, and a man
     stopped while already carrying damage is the thing that gets a gym talked
     about for the wrong reason. */
  /* Reputation gains run against headroom, so a name is hard to finish
     building and easy to lose. Flat gains saturated it: a carefully run gym
     ended at 86 out of 100 almost every time, which made a great gym the
     default rather than an achievement. Losses are NOT scaled, because a
     reputation falls faster than it climbs, which is both true and the thing
     that gives the grinding decision its teeth. */
  const headroom = 1 - g.reputation / 100;
  const gained = (offer.title ? 9 : 2.2) * clamp(headroom * 1.5, 0.12, 1);
  let rep = g.reputation + (won ? gained : drew ? 0.3 * headroom : -1.4);
  /* THE MATCHMAKING COST, and it is charged on the decision rather than on the
     result, because that is where it belongs.
     Without this the mode did not say what it claimed to say. Its negative
     control removed every reputation cost of wrecking men and section 2 stayed
     green, which proved the cost was never load bearing: grinding lost only
     because damaged fighters lose fights and losing costs reputation. That
     makes the mode about winning, not about stewardship, and it is a different
     and much less interesting game. Putting a visibly hurt man in is noticed by
     everyone in the building whatever happens to him afterwards, so it is
     charged here, on the act. */
  if (fighter.damage >= 55) rep -= 1.7;
  if (fighter.damage >= 70) rep -= 2.6;
  if (!won && (result.method === 'KO' || result.method === 'TKO') && fighter.damage > 45) rep -= 3.2;

  /* The camp is spent on the night. The week stays, so the weekly limit still holds. */
  const camp = g.training?.[fighterId];
  const training = camp ? { ...g.training, [fighterId]: { week: camp.week, blocks: noBlocks() } } : g.training;

  const next: GymState = {
    ...g,
    roster,
    training,
    money: Math.round((g.money + cut) * 1000) / 1000,
    reputation: clamp(Math.round(rep * 10) / 10, 0, 100),
    titles: g.titles + (offer.title && won ? 1 : 0),
    history: [...g.history, {
      week: g.week, fighter: f.name, opponent: offer.opponent.name,
      result: won ? 'W' : drew ? 'D' : 'L', method: result.method,
      purse: offer.purse, cut, title: offer.title,
    }],
    log: [
      `${f.name} ${won ? 'beat' : drew ? 'drew with' : 'lost to'} ${offer.opponent.name} by ${result.method}. The gym takes ${cut.toFixed(3)}m.`,
      ...g.log,
    ],
  };
  return { state: next, result };
}

/**
 * When a fighter is finished, on the same clauses the career uses, plus the one
 * the career cannot have: a man can be let go.
 */
export function gymShouldRetire(f: Fighter): boolean {
  if (f.age >= 39) return true;
  if (f.damage >= 82) return true;
  if (f.age >= 34 && f.damage >= 58) return true;
  return false;
}

export function releaseFighter(g: GymState, fighterId: string): GymState | null {
  const f = g.roster.find(x => x.id === fighterId);
  if (!f) return null;
  return retireOut(g, f, 'let go');
}

function retireOut(g: GymState, f: Fighter, how: string): GymState {
  /* Sending a man out badly damaged costs the gym its name, and that is the
     only thing stopping the obvious exploit: fight the broken ones until they
     stop earning and sign new ones. */
  const penalty = f.damage >= 70 ? 4.5 : f.damage >= 50 ? 1.8 : 0;
  let training = g.training;
  if (training && training[f.id]) {
    training = { ...training };
    delete training[f.id];
  }
  return {
    ...g,
    training,
    roster: g.roster.filter(x => x.id !== f.id),
    reputation: clamp(Math.round((g.reputation - penalty) * 10) / 10, 0, 100),
    alumni: [...g.alumni, {
      name: f.name,
      record: `${f.wins}-${f.losses}${f.draws ? `-${f.draws}` : ''}`,
      damage: f.damage,
      titles: f.rank === 0 ? 1 : 0,
    }],
    log: [`${f.name} is ${how} at ${Math.floor(f.age)}, ${f.wins}-${f.losses}, carrying ${f.damage.toFixed(0)} damage.`, ...g.log],
  };
}

/** One week passes: everybody ages a little, the bills land, the door opens. */
export function advanceWeek(g: GymState): GymState {
  if (g.closed) return g;
  let next: GymState = { ...g, roster: g.roster.map(f => ({ ...f, age: Math.round((f.age + 0.02) * 100) / 100 })) };
  for (const f of next.roster.slice()) {
    if (gymShouldRetire(f)) next = retireOut(next, f, 'finished');
  }
  const bill = weeklyCost(next);
  next = {
    ...next,
    week: next.week + 1,
    money: Math.round((next.money - bill) * 1000) / 1000,
    /* A gym nobody is talking about gets forgotten. */
    reputation: clamp(Math.round((next.reputation - 0.08) * 10) / 10, 0, 100),
  };
  next.prospects = prospectsFor(next);
  if (next.money < 0) next = closeBroke(next);
  return next;
}

/** The only way a gym closed before Round 955, and still the way it closes when the rent goes unpaid. */
export function closeBroke(g: GymState): GymState {
  return { ...g, closed: true, exit: 'broke', log: ['The rent went unpaid and the doors closed.', ...g.log] };
}

/**
 * Round 955: GOING OUT ON TOP. Until this round a gym could only end by going
 * broke, so a well run one never saw its verdict and never finished. Selling
 * is the deliberate ending, open once the gym has been going long enough to be
 * worth something.
 */
export const SELL_MIN_WEEKS = 26;

/**
 * What a buyer pays for the gym, in millions: the name above the door, the
 * belts on the wall, and the men still under contract, each worth less for
 * what he is carrying.
 */
export function salePrice(g: GymState): number {
  const name = (clamp(g.reputation, 0, 100) / 100) ** 1.5 * 2.5;
  const belts = g.titles * 0.3;
  const men = g.roster.reduce((s, f) => s + (ratingOf(f) / 100) ** 2 * 0.6 * (1 - clamp(f.damage, 0, 100) / 100), 0);
  return Math.round((0.2 + name + belts + men) * 1000) / 1000;
}

export function canSellGym(g: GymState): boolean {
  return !g.closed && g.week >= SELL_MIN_WEEKS;
}

export function sellGym(g: GymState): GymState | null {
  if (!canSellGym(g)) return null;
  const price = salePrice(g);
  return {
    ...g,
    money: Math.round((g.money + price) * 1000) / 1000,
    closed: true,
    exit: 'sold',
    soldFor: price,
    log: [`You sell the gym in week ${g.week} for ${price.toFixed(3)}m and hand over the keys.`, ...g.log],
  };
}

/** True for a gym that closed because the money ran out, old saves included. */
export function wentBroke(g: GymState): boolean {
  return g.closed && g.exit !== 'sold';
}

/** Verdict points a sale is worth on top of the record, and what going under costs. */
const SALE_BONUS_CAP = 8;
export const BROKE_PENALTY = 12;

/**
 * Round 955: THE ROUND 955 SAVE CHECK. The three blocks this round added are
 * optional, and a block that does not read right is dropped on its own so the
 * rest of the gym loads. Everything older is left exactly as it was saved.
 */
export function sanitizeGym(g: GymState): GymState {
  const out: GymState = { ...g };
  if (out.exit !== undefined && out.exit !== 'sold' && out.exit !== 'broke') delete out.exit;
  if (out.soldFor !== undefined && !(typeof out.soldFor === 'number' && Number.isFinite(out.soldFor))) delete out.soldFor;
  if (out.training !== undefined) {
    const t = out.training as unknown;
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      delete out.training;
    } else {
      const clean: Record<string, GymCamp> = {};
      for (const [id, raw] of Object.entries(t as Record<string, unknown>)) {
        const c = raw as { week?: unknown; blocks?: Record<string, unknown> } | null;
        if (!c || typeof c.week !== 'number' || !c.blocks || typeof c.blocks !== 'object') continue;
        const blocks = noBlocks();
        let okBlocks = true;
        for (const k of TRAIN_FOCI) {
          const v = c.blocks[k];
          if (v === undefined) continue;
          if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) { okBlocks = false; break; }
          blocks[k] = Math.floor(v);
        }
        if (okBlocks) clean[id] = { week: c.week, blocks };
      }
      out.training = clean;
    }
  }
  return out;
}

export interface GymVerdict { score: number; tier: string; bullets: string[] }

/**
 * What the gym is remembered for. Titles and reputation carry it, and men sent
 * out wrecked take from it, which is the whole moral argument of the mode
 * expressed as a number.
 */
export function gymVerdict(g: GymState): GymVerdict {
  const wrecked = g.alumni.filter(a => a.damage >= 70).length;
  const clean = g.alumni.filter(a => a.damage < 45).length;
  /* Round 955: how it ended counts. A gym sold as a going concern is worth
     something to somebody, and a gym that ran out of rent is not. */
  const sold = g.closed && g.exit === 'sold';
  const broke = wentBroke(g);
  const exitPoints = sold
    ? Math.min(SALE_BONUS_CAP, (g.soldFor ?? 0) * 3)
    : broke ? -BROKE_PENALTY : 0;
  const score = clampi(
    g.reputation * 0.5 +
    g.titles * 13 +
    g.history.filter(h => h.result === 'W').length * 0.7 +
    clean * 2 -
    wrecked * 5 +
    exitPoints,
    0, 100,
  );
  const ending = sold
    ? `Sold in week ${g.week} for ${(g.soldFor ?? 0).toFixed(3)}m. Going out on your own terms.`
    : broke
      ? `The rent went unpaid in week ${g.week}. Going under costs the gym ${BROKE_PENALTY} points.`
      : null;
  const tier = score >= 88 ? 'A Great Gym'
    : score >= 70 ? 'Respected'
      : score >= 50 ? 'Getting Known'
        : score >= 28 ? 'Small Time'
          : 'A Room With Bags In It';
  return {
    score,
    tier,
    bullets: [
      ...(ending ? [ending] : []),
      `${g.history.filter(h => h.result === 'W').length} wins from ${g.history.length} fights over ${g.week} weeks.`,
      g.titles ? `${g.titles} world title${g.titles > 1 ? 's' : ''} out of this gym.` : 'No world titles.',
      `${g.alumni.length} fighters came through. ${clean} got out clean, ${wrecked} did not.`,
      `Reputation ${g.reputation.toFixed(0)} out of 100.`,
    ],
  };
}
