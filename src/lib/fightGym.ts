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
 */
export const TRAIN_COST = 0.035;

export function trainFighter(g: GymState, fighterId: string): GymState | null {
  if (g.closed || g.money < TRAIN_COST) return null;
  const i = g.roster.findIndex(f => f.id === fighterId);
  if (i < 0) return null;
  const f = { ...g.roster[i], attrs: { ...g.roster[i].attrs } };
  const pot = f.potential;
  const bump = (cur: number) => clampi(cur + clamp((pot - cur) / 22, 0, 1) * 2.1, 15, 99);
  f.attrs.stamina = bump(f.attrs.stamina);
  f.attrs.defence = bump(f.attrs.defence);
  f.attrs.speed = bump(f.attrs.speed);
  f.attrs.power = bump(f.attrs.power);
  const roster = g.roster.slice();
  roster[i] = f;
  return {
    ...g,
    money: Math.round((g.money - TRAIN_COST) * 1000) / 1000,
    roster,
    log: [`${f.name} put in a hard block of work.`, ...g.log],
  };
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
    weight: guessWeight(fighter), tactics, campQuality: 0.5,
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

  const next: GymState = {
    ...g,
    roster,
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
  return {
    ...g,
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
  if (next.money < 0) {
    next = { ...next, closed: true, log: ['The rent went unpaid and the doors closed.', ...next.log] };
  }
  return next;
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
  const score = clampi(
    g.reputation * 0.5 +
    g.titles * 13 +
    g.history.filter(h => h.result === 'W').length * 0.7 +
    clean * 2 -
    wrecked * 5,
    0, 100,
  );
  const tier = score >= 88 ? 'A Great Gym'
    : score >= 70 ? 'Respected'
      : score >= 50 ? 'Getting Known'
        : score >= 28 ? 'Small Time'
          : 'A Room With Bags In It';
  return {
    score,
    tier,
    bullets: [
      `${g.history.filter(h => h.result === 'W').length} wins from ${g.history.length} fights over ${g.week} weeks.`,
      g.titles ? `${g.titles} world title${g.titles > 1 ? 's' : ''} out of this gym.` : 'No world titles.',
      `${g.alumni.length} fighters came through. ${clean} got out clean, ${wrecked} did not.`,
      `Reputation ${g.reputation.toFixed(0)} out of 100.`,
    ],
  };
}
