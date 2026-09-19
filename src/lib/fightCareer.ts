/**
 * Round 620: Fight Career, the sport binding on top of `careerEngine.ts`.
 *
 * Contract: `docs/design/round-620-fight-career-contract.md`.
 *
 * TWO DECISIONS TAKEN HERE RATHER THAN DISCOVERED LATE.
 *
 * 1. Every fighter in this game is generated. No real boxer is simulated,
 *    ranked, aged, damaged or beaten anywhere in it. That closes the likeness
 *    question and the invented deeds question in one move (a real name with
 *    factual stats is reporting; a real name with a fictional career is not),
 *    and it is also the only reason a custom roster is possible at all.
 * 2. There are no gambling mechanics. A boxing game drifts toward a betting
 *    screen without anybody deciding to add one. Purses and offers are
 *    contracts, not bets, and there is nothing here to wager on.
 *
 * Titles are generic and invented. No sanctioning body, promotion or real belt
 * is named, and none may be added later.
 */

import {
  rngFrom, hashLabel, clamp, clampi, genPersonName, declineAt,
  legacyTier, type LegacyVerdict,
} from '@/lib/careerEngine';

/* ─────────────────────────── the sport ─────────────────────────── */

export type WeightId =
  | 'fly' | 'bantam' | 'feather' | 'light'
  | 'welter' | 'middle' | 'lightheavy' | 'heavy';

export interface WeightClass { id: WeightId; label: string; lbs: number; koBias: number }

/**
 * koBias scales how often power ends a fight. It rises with the weight, which
 * is the one thing about boxing everybody already knows and the thing a player
 * will immediately call wrong if it is missing.
 */
export const WEIGHT_CLASSES: WeightClass[] = [
  { id: 'fly', label: 'Flyweight', lbs: 112, koBias: 0.62 },
  { id: 'bantam', label: 'Bantamweight', lbs: 118, koBias: 0.7 },
  { id: 'feather', label: 'Featherweight', lbs: 126, koBias: 0.78 },
  { id: 'light', label: 'Lightweight', lbs: 135, koBias: 0.88 },
  { id: 'welter', label: 'Welterweight', lbs: 147, koBias: 1 },
  { id: 'middle', label: 'Middleweight', lbs: 160, koBias: 1.12 },
  { id: 'lightheavy', label: 'Light Heavyweight', lbs: 175, koBias: 1.24 },
  { id: 'heavy', label: 'Heavyweight', lbs: 200, koBias: 1.42 },
];

export function weightById(id: WeightId): WeightClass {
  return WEIGHT_CLASSES.find(w => w.id === id) ?? WEIGHT_CLASSES[4];
}

export type FightStyle = 'outboxer' | 'swarmer' | 'slugger' | 'counter';
export type Tactic = 'box' | 'press' | 'counter' | 'brawl';

export const STYLES: { id: FightStyle; label: string; blurb: string }[] = [
  { id: 'outboxer', label: 'Out-Boxer', blurb: 'Long, busy, and gone before you land. Wins rounds, not highlight reels.' },
  { id: 'swarmer', label: 'Swarmer', blurb: 'Lives on your chest and never stops. Drowns you in volume.' },
  { id: 'slugger', label: 'Slugger', blurb: 'Slow feet, terrible intentions. One shot ends the night.' },
  { id: 'counter', label: 'Counter-Puncher', blurb: 'Waits, reads you, and makes you pay for your own punch.' },
];

export const TACTICS: { id: Tactic; label: string; blurb: string }[] = [
  { id: 'box', label: 'Box', blurb: 'Stay long, stick the jab, take the round off the aggressor.' },
  { id: 'press', label: 'Pressure', blurb: 'Walk him down and take his room away.' },
  { id: 'counter', label: 'Counter', blurb: 'Give him the first shot and punish it.' },
  { id: 'brawl', label: 'Brawl', blurb: 'Stop thinking. Throw until one of you stops.' },
];

/**
 * The rock paper scissors under the whole game, and the thing that makes a
 * round a decision instead of a dice roll.
 *
 *   Pressure beats an out-boxer, because you take his room.
 *   Boxing beats a swarmer, because he cannot swarm what he cannot reach.
 *   Countering beats a slugger, because he is slow and he commits.
 *   Brawling beats a counter-puncher, because he needs time to read you.
 *
 * And it closes into a cycle, so no tactic is simply the best one:
 *
 *   An out-boxer beats a brawler, a swarmer beats a counter-puncher,
 *   a slugger beats pressure, a counter-puncher beats boxing.
 */
const TACTIC_EDGE: Record<Tactic, Record<FightStyle, number>> = {
  box: { outboxer: 0, swarmer: 1, slugger: 0, counter: -1 },
  press: { outboxer: 1, swarmer: 0, slugger: -1, counter: 0 },
  counter: { outboxer: 0, swarmer: -1, slugger: 1, counter: 0 },
  brawl: { outboxer: -1, swarmer: 0, slugger: 0, counter: 1 },
};

export function tacticEdge(t: Tactic, against: FightStyle): number {
  return TACTIC_EDGE[t][against];
}

/** What a fighter of each style tends to do when it is his turn to choose. */
const STYLE_HABIT: Record<FightStyle, Tactic[]> = {
  outboxer: ['box', 'box', 'counter', 'press'],
  swarmer: ['press', 'press', 'brawl', 'box'],
  slugger: ['brawl', 'press', 'brawl', 'counter'],
  counter: ['counter', 'counter', 'box', 'brawl'],
};

/* ─────────────────────────── fighters ─────────────────────────── */

export interface Attrs {
  power: number;
  chin: number;
  speed: number;
  stamina: number;
  defence: number;
  ringIq: number;
}

export interface Fighter {
  id: string;
  name: string;
  style: FightStyle;
  attrs: Attrs;
  age: number;
  wins: number;
  losses: number;
  draws: number;
  kos: number;
  /** Cumulative, permanent, and the whole point of the game. */
  damage: number;
  /**
   * The ceiling. Camp can move a fighter toward this and never past it, and the
   * closer he gets the less each camp is worth.
   *
   * Round 620, and this is not a new idea, it is a regression this repo has
   * already paid for twice and named: growth that ignores potential headroom
   * (Rounds 96 and 116). The first draft of this game had flat camp gains every
   * fight with no ceiling, so every fighter reached 99 in everything inside
   * twenty fights and a world title landed in 88 percent of careers. A ceiling
   * is what makes the man you rolled matter and what stops every career
   * converging on the same unbeatable fighter.
   */
  potential: number;
  /** 1 is the number one contender. 0 means he holds the title. 99 is unranked. */
  rank: number;
}

/* Generated names. Deliberately a wide international pool, and deliberately
   ordinary rather than colourful, because a roster of nicknames reads as a
   parody within three fights. */
const FIRST = [
  'Andre', 'Bakary', 'Cristian', 'Dmitri', 'Eze', 'Fabio', 'Gustavo', 'Hiroshi',
  'Ibrahim', 'Jonas', 'Kwame', 'Lucas', 'Miguel', 'Nikolai', 'Omar', 'Pavel',
  'Quentin', 'Rashid', 'Santiago', 'Tomas', 'Ugo', 'Viktor', 'Wesley', 'Yusuf',
  'Adan', 'Beniamin', 'Caleb', 'Dario', 'Emeka', 'Farid', 'Gideon', 'Hassan',
];
const LAST = [
  'Abara', 'Bellini', 'Costa', 'Draganov', 'Eze', 'Ferreira', 'Gallo', 'Haddad',
  'Ibori', 'Jovanovic', 'Kowalski', 'Laurent', 'Moreno', 'Nakamura', 'Oyelaran',
  'Petrov', 'Quintero', 'Rivas', 'Salgado', 'Toure', 'Ubaldi', 'Varga', 'Wolde',
  'Yilmaz', 'Zadrozny', 'Brandao', 'Cisse', 'Delgado', 'Farkas', 'Guerrero',
];

let seq = 0;
function nextId(): string {
  seq += 1;
  return `f${seq}`;
}

/**
 * A generated fighter at a quality tier.
 *
 * `tier` runs 0 (club fighter) to 100 (the best in the world). Attributes are
 * drawn around it and then pulled apart by the style, so an out-boxer really
 * is quicker and a slugger really does hit harder at the same tier. Without
 * that the styles would be labels on identical men.
 */
export function makeFighter(rng: () => number, tier: number, weight: WeightId, style?: FightStyle): Fighter {
  const st = style ?? STYLES[Math.floor(rng() * STYLES.length)].id;
  const base = clamp(tier, 20, 99);
  const jitter = () => (rng() - 0.5) * 10;
  const shape: Record<FightStyle, Partial<Attrs>> = {
    outboxer: { speed: 8, defence: 7, ringIq: 6, power: -10, chin: -3 },
    swarmer: { stamina: 10, power: 2, chin: 5, defence: -9, ringIq: -3 },
    slugger: { power: 13, chin: 4, speed: -9, stamina: -6, defence: -4 },
    counter: { ringIq: 11, defence: 8, speed: 3, stamina: -5, power: -2 },
  };
  const s = shape[st];
  const mk = (k: keyof Attrs) => clampi(base + (s[k] ?? 0) + jitter(), 15, 99);
  return {
    id: nextId(),
    name: genPersonName(rng, FIRST, LAST),
    style: st,
    attrs: {
      power: mk('power'), chin: mk('chin'), speed: mk('speed'),
      stamina: mk('stamina'), defence: mk('defence'), ringIq: mk('ringIq'),
    },
    age: clampi(21 + rng() * 12, 19, 37),
    wins: 0, losses: 0, draws: 0, kos: 0, damage: 0, rank: 99,
    potential: clampi(base + 10 + rng() * 16, 30, 99),
  };
}

/**
 * What a fighter actually brings tonight, once age and accumulated damage are
 * taken out of him.
 *
 * Damage hits the chin hardest, which is the honest version of what happens to
 * a fighter who has been in wars, and it is what makes an early war expensive
 * later rather than immediately. It never touches ring IQ: the one thing a
 * beaten up veteran keeps is knowing what he is doing.
 */
export function effectiveAttrs(f: Fighter): Attrs {
  const age = declineAt(f.age, 28, 31);
  const d = f.damage;
  const chinLoss = Math.min(38, d * 0.55);
  const staminaLoss = Math.min(24, d * 0.3);
  const speedLoss = Math.min(20, d * 0.22);
  return {
    power: clampi(f.attrs.power * clamp(age + 0.04, 0.5, 1), 10, 99),
    chin: clampi(f.attrs.chin * age - chinLoss, 5, 99),
    speed: clampi(f.attrs.speed * age - speedLoss, 8, 99),
    stamina: clampi(f.attrs.stamina * age - staminaLoss, 8, 99),
    defence: clampi(f.attrs.defence * age, 8, 99),
    ringIq: clampi(f.attrs.ringIq * clamp(age + 0.08, 0.6, 1.06), 10, 99),
  };
}

/** One number for "how good is he right now", used for matchmaking and ranking. */
export function ratingOf(f: Fighter): number {
  const a = effectiveAttrs(f);
  return Math.round(
    a.power * 0.2 + a.chin * 0.14 + a.speed * 0.18 +
    a.stamina * 0.14 + a.defence * 0.16 + a.ringIq * 0.18,
  );
}

/* ─────────────────────────── the bout ─────────────────────────── */

export interface RoundLog {
  round: number;
  tactic: Tactic;
  oppTactic: Tactic;
  /** How he actually fought this round, which is not always his known style. */
  stance: FightStyle;
  /** True when he moved off his known style to punish what you did last round. */
  switched: boolean;
  playerLanded: number;
  oppLanded: number;
  /** 10 to the winner, 9 or 8 to the loser, the way a real card is scored. */
  playerScore: number;
  oppScore: number;
  knockdown: 'player' | 'opp' | null;
  note: string;
}

export type Method = 'KO' | 'TKO' | 'UD' | 'SD' | 'MD' | 'D';

export interface BoutResult {
  rounds: RoundLog[];
  winner: 'player' | 'opp' | 'draw';
  method: Method;
  endedRound: number;
  playerCard: number;
  oppCard: number;
  damageTaken: number;
  damageDealt: number;
  roundsWon: number;
}

/* ───────────────── what the fight screen shows, Round 628 ─────────────────
   The bout already produced everything a viewer needs: punches landed both
   ways, knockdowns, a scored card. It was rendered as a list of sentences, so
   a twelve round war and a shutout read almost the same. These two bars are
   the fix, and they live HERE rather than in the component for one reason:
   a number computed inside a React render cannot be measured by a harness,
   and an unmeasured bar is decoration that is free to lie. */

/** How much condition one landed punch costs the man who took it. */
export const DRAIN_PER_PUNCH = 0.8;
/** What going down costs on top of the punches, which is most of a round. */
export const DRAIN_PER_KNOCKDOWN = 10;
/** A man still on his feet never reads empty, however wide the fight got. */
export const STANDING_FLOOR = 8;
/** Below this the bar stops draining in a straight line and eases toward the floor. */
export const SOFT_FLOOR_FROM = 40;

export interface ConditionPoint { round: number; player: number; opp: number }

/**
 * Round 636: what a man's bar reads after he has soaked up `drain` points of
 * punishment, for a man still on his feet.
 *
 * WHY THIS IS A CURVE AND NOT A CLAMP. Round 628 drained the bar in a straight
 * line and clamped it at the floor. That clamp was the defect. A straight
 * line runs out at 92 points of drain, 115 punches, and the men a good player
 * beats on points soak up far more than that: over eight seed bases of real
 * careers played with three looks that each answer what the opponent will
 * switch to (the game's own hint), the decision loser's drain sits at 77 to 80
 * at the median, 144 to 148 at p90 and 172 to 179 at p99. So 29 to 34 percent
 * of those losers read the floor, the same as a man who barely got through
 * and within a sliver of a man who was stopped. Random tactics, which is all
 * Round 628 measured, pinned 11 to 13 percent.
 *
 * The drain rate was not the lever. The damage behind it is sound: it is the
 * punches the engine landed, and none of this feeds lasting damage, which
 * comes from simBout's damageTaken. A slower straight line would still clip,
 * just later: at 0.6 a punch a good player's losers still pin 18 to 23
 * percent, and holding their p99 off the floor in a straight line takes about
 * 0.4, which lifts a random decision loser's median from 30 to 64 and erases
 * the gap the bar exists to show.
 *
 * So the bar reads exactly as Round 628 drew it down to SOFT_FLOOR_FROM, and
 * below that it keeps falling for every extra punch but ever more slowly, and
 * it never reaches the floor. The tail has the same slope as the line where
 * they meet, so there is no visible kink. Measured on the same bouts: a
 * decision loser reads the floor in 0 to 0.1 percent of fights for the good
 * player and the weak one, 0 to 0.4 for random tactics and 0.6 to 0.9 for a
 * player who holds one answer all night, and the median random loser moves
 * from 30 to 31. Above 40 nothing a Round 628 bar showed has changed.
 */
export function conditionShown(drain: number): number {
  const straight = 100 - drain;
  if (straight >= SOFT_FLOOR_FROM) return straight;
  const span = SOFT_FLOOR_FROM - STANDING_FLOOR;
  return STANDING_FLOOR + span * Math.exp((straight - SOFT_FLOOR_FROM) / span);
}

/**
 * Condition after each round, 100 down to 0, for both men.
 *
 * THE RATE IS MEASURED, NOT CHOSEN, AND IT MUST BE MEASURED ON BOUTS THE GAME
 * ACTUALLY PRODUCES. Over 7,233 bouts played through real careers, real offers
 * and real camps: a man lands 7.4 punches a round on average, a decision
 * winner absorbs 51 across the fight at the median and a decision loser
 * absorbs 82, with the loser's p90 at 108.
 *
 * THE MISTAKE THAT COST THIS TWICE, written down because the harness did not
 * catch it and the browser did. The first calibration sampled fighters built
 * straight from makeFighter at tiers 2 to 4, which gave 2.9 landed a round and
 * a rate of 1.6. Section 6 passed at 89.5 percent agreement because it drew
 * its bouts the same wrong way, so the check and the constant agreed with each
 * other and neither agreed with the game. Opening the page showed both men on
 * 10 and 8 after a ten round decision, every bar pinned, because real rounds
 * land two and a half times as many punches as the sample did. A harness that
 * samples a population the player never meets will confirm anything.
 *
 * The rate is set from the loser's p90: 85 points of drain over 108 punches is
 * 0.787, rounded to 0.8. That puts the median decision winner near 59 and the
 * median loser near 34, a gap you can see across a room.
 *
 * Round 628 said that also kept the floor rare. It did, for random tactics,
 * which is all it sampled, and for nobody who plays well: a player who reads
 * every fight left 29 to 34 percent of his decision losers on the floor. The
 * floor is kept rare by conditionShown now, not by the rate. See it above.
 *
 * The bar is not meant to agree with the cards every time. A man can win on
 * points while taking more punishment than he handed out, and a bar that
 * always matched the card would be drawing the card rather than the fight.
 *
 * The one hard claim, which `simFightCareer` section 6 asserts: a man who was
 * stopped ends at exactly 0 and a man still standing never does. The bar is
 * allowed to be approximate about how worn somebody looks. It is not allowed
 * to be wrong about whether he is still in the fight.
 */
export function conditionTrack(res: BoutResult): ConditionPoint[] {
  const stoppage = res.method === 'KO' || res.method === 'TKO';
  const loser = res.winner === 'player' ? 'opp' : res.winner === 'opp' ? 'player' : null;
  let playerDrain = 0;
  let oppDrain = 0;
  const out: ConditionPoint[] = [];
  res.rounds.forEach((r, i) => {
    /* knockdown: 'player' means the PLAYER scored it, so the OPPONENT went
       down. That reading is the engine's, see simBout where pDrops sets
       knockdown to 'player' and increments oppHurt. Getting it backwards
       would drain the wrong bar on the most visible moment in the fight. */
    playerDrain += r.oppLanded * DRAIN_PER_PUNCH + (r.knockdown === 'opp' ? DRAIN_PER_KNOCKDOWN : 0);
    oppDrain += r.playerLanded * DRAIN_PER_PUNCH + (r.knockdown === 'player' ? DRAIN_PER_KNOCKDOWN : 0);
    /* Drain only ever grows and conditionShown only ever falls as it grows,
       so a bar can never climb back up between rounds. */
    const player = conditionShown(playerDrain);
    const opp = conditionShown(oppDrain);
    const last = i === res.rounds.length - 1;
    out.push({
      round: r.round,
      player: stoppage && last && loser === 'player' ? 0 : Math.round(player),
      opp: stoppage && last && loser === 'opp' ? 0 : Math.round(opp),
    });
  });
  return out;
}

function habitTactic(style: FightStyle, rng: () => number): Tactic {
  const list = STYLE_HABIT[style];
  return list[Math.floor(rng() * list.length)];
}

/** The style that punishes a given tactic, which is the cycle read backwards. */
const STYLE_THAT_BEATS: Record<Tactic, FightStyle> = {
  box: 'counter',
  press: 'slugger',
  counter: 'swarmer',
  brawl: 'outboxer',
};

/**
 * What the opponent is actually doing THIS round, which is not always what he
 * is known for.
 *
 * Round 620, and this is the fix that turned the game into a game. In the first
 * draft a fighter's style was fixed for the whole bout, so a player who read it
 * once could pick the answering tactic every round for the rest of his career
 * and never be punished for it. Measured: 98.5 percent of careers won a world
 * title, and the correct strategy was to choose one tactic and never think
 * again. A ring IQ of any worth adjusts to a man who keeps doing the same
 * thing, so a smart opponent switches into the style that punishes whatever you
 * did last round. The counter to that is to vary, which is the decision the
 * round is supposed to contain.
 */
function oppStance(opp: Fighter, lastPlayerTactic: Tactic | null, rng: () => number): FightStyle {
  if (!lastPlayerTactic) return opp.style;
  const iq = effectiveAttrs(opp).ringIq;
  return rng() < 0.1 + (iq / 100) * 0.5 ? STYLE_THAT_BEATS[lastPlayerTactic] : opp.style;
}

/** Fatigue late in a fight, scaled by stamina. A gassed fighter stops landing. */
function freshnessAt(round: number, total: number, stamina: number, camp: number): number {
  const through = round / Math.max(1, total);
  const tank = 0.55 + (stamina / 100) * 0.45 + camp * 0.1;
  return clamp(1 - Math.max(0, through - tank) * 1.35, 0.45, 1);
}

export interface BoutInput {
  player: Fighter;
  opponent: Fighter;
  rounds: number;
  weight: WeightId;
  tactics: Tactic[];
  /** 0 to 1, how well the camp went. Raises the gas tank and sharpens output. */
  campQuality?: number;
}

/**
 * Simulate a bout round by round.
 *
 * Deterministic for a given rng, which is what lets the harness measure policy
 * outcomes over thousands of careers and what lets the daily hand everybody the
 * same fight.
 */
export function simBout(input: BoutInput, rng: () => number): BoutResult {
  const { player, opponent, rounds, weight } = input;
  const camp = clamp(input.campQuality ?? 0.5, 0, 1);
  const pa = effectiveAttrs(player);
  const oa = effectiveAttrs(opponent);
  const koBias = weightById(weight).koBias;

  const log: RoundLog[] = [];
  let playerCard = 0;
  let oppCard = 0;
  let damageTaken = 0;
  let damageDealt = 0;
  let roundsWon = 0;
  let stopped: 'player' | 'opp' | null = null;
  let endedRound = rounds;
  /* Hurt carries between rounds: a man dropped in round 4 is easier to drop in
     round 5. Without this a knockdown is a scoring event and nothing more. */
  let playerHurt = 0;
  let oppHurt = 0;
  /* What you did last round is public information to the man in front of you. */
  let lastPlayerTactic: Tactic | null = null;

  for (let r = 1; r <= rounds; r += 1) {
    /* The plan CYCLES rather than holding its last entry, so a three tactic
       game plan is a rotation and not "two rounds then the same thing for the
       next ten". Against an opponent who adjusts to what you did last round,
       holding one tactic is the worst thing a player can do, and a screen that
       asks for three tactics should not quietly turn them into one. */
    const tactic = input.tactics.length
      ? input.tactics[(r - 1) % input.tactics.length]
      : 'box';
    const stance = oppStance(opponent, lastPlayerTactic, rng);
    const switched = stance !== opponent.style;
    const oppTactic = habitTactic(stance, rng);

    const edge = tacticEdge(tactic, stance) - tacticEdge(oppTactic, player.style);
    const pFresh = freshnessAt(r, rounds, pa.stamina, camp);
    const oFresh = freshnessAt(r, rounds, oa.stamina, 0.5);

    const pOut = (pa.speed * 0.34 + pa.ringIq * 0.33 + pa.power * 0.33) * pFresh;
    const oOut = (oa.speed * 0.34 + oa.ringIq * 0.33 + oa.power * 0.33) * oFresh;

    const pLanded = Math.max(0, Math.round(
      (pOut - oa.defence * 0.45) / 4.2 + edge * 2.6 + oppHurt * 1.8 + (rng() - 0.5) * 5,
    ));
    const oLanded = Math.max(0, Math.round(
      (oOut - pa.defence * 0.45) / 4.2 - edge * 2.6 + playerHurt * 1.8 + (rng() - 0.5) * 5,
    ));

    /* A knockdown needs power against a chin, and the tactical edge is what
       creates the opening. Scaled by the weight class, because a flyweight
       war and a heavyweight war do not end the same way. */
    const pKd = clamp((pa.power - oa.chin + 18 + edge * 9 + oppHurt * 12) / 460, 0, 0.42) * koBias;
    const oKd = clamp((oa.power - pa.chin + 18 - edge * 9 + playerHurt * 12) / 460, 0, 0.42) * koBias;
    const pDrops = rng() < pKd;
    const oDrops = !pDrops && rng() < oKd;

    let ps = 10;
    let os = 10;
    let knockdown: 'player' | 'opp' | null = null;
    if (pDrops) {
      knockdown = 'player';
      os = 8;
      oppHurt += 1;
    } else if (oDrops) {
      knockdown = 'opp';
      ps = 8;
      playerHurt += 1;
    }
    if (!knockdown) {
      if (pLanded > oLanded) os = 9;
      else if (oLanded > pLanded) ps = 9;
      else if (rng() < 0.5) os = 9;
      else ps = 9;
    } else if (knockdown === 'player') {
      ps = 10;
    } else {
      os = 10;
    }

    playerCard += ps;
    oppCard += os;
    if (ps > os) roundsWon += 1;
    /* Round 620: these factors are measured, not chosen. The first draft used
       0.16, which put roughly 25 damage on a fighter per bout and retired every
       career of every policy pinned at the damage ceiling inside nine fights.
       That did not make the game hard, it deleted the decision: when every
       road ends in the same place at the same time, the choice between them is
       decoration. At 0.022 a quiet night costs about 2 and a war costs about 6,
       so a ceiling of 82 is a career of roughly 25 to 40 fights and the
       difference between the two roads is visible in the record. */
    damageTaken += oLanded * 0.022 + (oDrops ? 1.2 : 0);
    damageDealt += pLanded * 0.022 + (pDrops ? 1.2 : 0);

    log.push({
      round: r, tactic, oppTactic, stance, switched, playerLanded: pLanded, oppLanded: oLanded,
      playerScore: ps, oppScore: os, knockdown,
      note: knockdown === 'player'
        ? `${opponent.name} is down.`
        : knockdown === 'opp'
          ? 'You are down.'
          : switched
            ? 'He has changed how he is fighting.'
            : edge > 0 ? 'The tactic is working.' : edge < 0 ? 'He has your number this round.' : '',
    });
    lastPlayerTactic = tactic;

    /* A second knockdown in the same fight, against a man already hurt, ends
       it. Three is always over. */
    if (oppHurt >= 2 && rng() < 0.55 + oppHurt * 0.12) { stopped = 'player'; endedRound = r; break; }
    if (playerHurt >= 2 && rng() < 0.55 + playerHurt * 0.12) { stopped = 'opp'; endedRound = r; break; }
  }

  if (stopped) {
    const hurt = stopped === 'player' ? oppHurt : playerHurt;
    return {
      rounds: log, winner: stopped, method: hurt >= 3 ? 'KO' : 'TKO', endedRound,
      playerCard, oppCard, damageTaken, damageDealt, roundsWon,
    };
  }

  let winner: 'player' | 'opp' | 'draw';
  let method: Method;
  const gap = playerCard - oppCard;
  if (gap === 0) { winner = 'draw'; method = 'D'; }
  else {
    winner = gap > 0 ? 'player' : 'opp';
    const margin = Math.abs(gap);
    method = margin >= 5 ? 'UD' : margin >= 3 ? 'MD' : 'SD';
  }
  return { rounds: log, winner, method, endedRound, playerCard, oppCard, damageTaken, damageDealt, roundsWon };
}

/* ─────────────────────────── the career ─────────────────────────── */

export interface FightLine {
  no: number;
  opponent: string;
  result: 'W' | 'L' | 'D';
  method: Method;
  round: number;
  rounds: number;
  purse: number;
  title: boolean;
  /**
   * Round 620: what he was worth, and what you were worth, on the night.
   *
   * Legacy used to judge the quality of a win by its purse being at least a
   * million. That counter was unreachable: the purse formula caps below 0.8 for
   * anybody who is not already champion, so every quality win by every climbing
   * fighter counted as zero and the measure was silently dead. Recording the
   * two ratings makes the judgement independent of whatever the money scale
   * happens to be this round.
   */
  oppRating: number;
  myRating: number;
}

export interface Offer {
  id: string;
  opponent: Fighter;
  purse: number;
  rounds: number;
  /** How far up the rankings a win moves you. */
  rankGain: number;
  title: boolean;
  label: string;
}

export interface CampPlan {
  conditioning: number;
  power: number;
  defence: number;
  speed: number;
}

export interface FightCareerState {
  version: 1;
  fighter: Fighter;
  weight: WeightId;
  /** Fights taken, which is the clock this game runs on rather than seasons. */
  fightNo: number;
  champion: boolean;
  titleDefences: number;
  earnings: number;
  history: FightLine[];
  retired: boolean;
  offers: Offer[];
  camp: CampPlan | null;
  campQuality: number;
  /** The seed stream position, so a reloaded save does not replay luck. */
  rngTick: number;
  seed: number;
  log: string[];
}

const CAMP_WEEKS = 6;

export function newFightCareer(name: string, weight: WeightId, style: FightStyle, seedLabel?: string): FightCareerState {
  const seed = hashLabel(seedLabel ?? `${name}|${weight}|${style}`);
  const rng = rngFrom(seed);
  const me = makeFighter(rng, 52, weight, style);
  me.name = name.trim() || me.name;
  me.age = 21;
  me.rank = 99;
  const st: FightCareerState = {
    version: 1,
    fighter: me,
    weight,
    fightNo: 0,
    champion: false,
    titleDefences: 0,
    earnings: 0,
    history: [],
    retired: false,
    offers: [],
    camp: null,
    campQuality: 0.5,
    rngTick: 0,
    seed,
    log: ['You turn professional. Nobody is watching yet.'],
  };
  st.offers = offersFor(st);
  return st;
}

/** The generator for this save, advanced past whatever has already happened. */
function streamFor(st: FightCareerState): { rng: () => number; done: (used: number) => void } {
  const rng = rngFrom(st.seed + st.rngTick * 7919);
  return { rng, done: (used: number) => { st.rngTick += Math.max(1, used); } };
}

/**
 * Three offers, and they are the central decision of the game.
 *
 * A tune up is safe, pays little and barely moves you. A step up pays and
 * ranks you fast and can take years off the end of your career. The middle one
 * is the honest fight. Damage is permanent, so the player is always choosing
 * between the career he has now and the one he will have at 33.
 */
export function offersFor(st: FightCareerState): Offer[] {
  const { rng, done } = streamFor(st);
  const mine = ratingOf(st.fighter);
  const rank = st.champion ? 0 : st.fighter.rank;
  const out: Offer[] = [];

  /* Round 620: three situations, not two.
     The first draft had only champion and climbing, and pinned the title shot
     to the most dangerous offer slot. A player who climbed patiently reached
     the number one ranking and was then never offered the fight, because his
     policy never picked that slot: 260 careers produced zero titles. Being the
     mandatory challenger is not a fight you go looking for, it is one you have
     earned, so at number one EVERY offer on the table is for the belt and the
     only question left is which champion you take. */
  const contender = !st.champion && rank <= 1;
  const shapes: { label: string; delta: number; pay: number; gain: number; rounds: number }[] = st.champion
    ? [
      { label: 'Voluntary defence', delta: -8, pay: 1.5, gain: 0, rounds: 12 },
      { label: 'Mandatory challenger', delta: 2, pay: 2.4, gain: 0, rounds: 12 },
      { label: 'Unification', delta: 7, pay: 4.2, gain: 0, rounds: 12 },
    ]
    : contender
      ? [
        { label: 'Vacant title', delta: -2, pay: 2, gain: 0, rounds: 12 },
        { label: 'Champion away from home', delta: 4, pay: 3, gain: 0, rounds: 12 },
        { label: 'Undisputed champion', delta: 9, pay: 4.6, gain: 0, rounds: 12 },
      ]
      : [
        { label: 'Tune up', delta: -11, pay: 0.35, gain: 1, rounds: 8 },
        { label: 'Even money', delta: 1, pay: 1, gain: 3, rounds: 10 },
        { label: 'Step up', delta: 9, pay: 2.1, gain: 6, rounds: 10 },
      ];

  for (const s of shapes) {
    /* Round 620: a world champion is one of the best fighters alive, not simply
       a little better than whoever is in front of him. Drawing him relative to
       the challenger made the belt track the player's own level, so climbing to
       number one was the whole difficulty and the title fight itself was a
       formality: 86 percent of patient careers walked in and took it. A title
       opponent is therefore drawn near the top of the sport in absolute terms,
       and the relative figure only applies when it is higher still. */
    const titleFight = st.champion || contender;
    const relative = clamp(mine + s.delta, 25, 97);
    const opp = makeFighter(rng, titleFight ? Math.max(relative, 80 + rng() * 15) : relative, st.weight);
    opp.age = clampi(23 + rng() * 12, 20, 38);
    const fame = st.champion ? 5.5 : clamp((16 - Math.min(rank, 16)) / 3.4, 0.35, 4.6);
    const purse = Math.round((0.05 + fame * 0.16) * s.pay * 100) / 100;
    out.push({
      id: `o${st.fightNo}-${out.length}`,
      opponent: opp,
      purse,
      rounds: s.rounds,
      rankGain: s.gain,
      title: st.champion || contender,
      label: s.label,
    });
  }
  done(12);
  return out;
}

/**
 * Six camp weeks across four areas. Overloading one area buys a sharp edge in
 * it and a flat fighter everywhere else, which is the tradeoff the screen has
 * to make legible before the player commits.
 */
export function runCamp(st: FightCareerState, plan: CampPlan): FightCareerState {
  const total = plan.conditioning + plan.power + plan.defence + plan.speed;
  const weeks = clamp(total, 0, CAMP_WEEKS);
  const spread = weeks === 0 ? 0 : 1 - Math.max(
    plan.conditioning, plan.power, plan.defence, plan.speed,
  ) / Math.max(1, weeks);
  const next = { ...st, fighter: { ...st.fighter, attrs: { ...st.fighter.attrs } } };
  /* Growth against headroom, never flat. A camp is worth a lot to a raw
     fighter and almost nothing to one already at his ceiling, and it can never
     take him past it. Headroom reaches zero at the ceiling, so this can only
     ever raise an attribute and never lower one a fighter was generated with. */
  const pot = next.fighter.potential;
  const grow = (cur: number, weeks: number) => {
    const headroom = clamp((pot - cur) / 22, 0, 1);
    return clampi(cur + (weeks / CAMP_WEEKS) * 2.4 * headroom, 15, 99);
  };
  next.fighter.attrs.stamina = grow(next.fighter.attrs.stamina, plan.conditioning);
  next.fighter.attrs.power = grow(next.fighter.attrs.power, plan.power);
  next.fighter.attrs.defence = grow(next.fighter.attrs.defence, plan.defence);
  next.fighter.attrs.speed = grow(next.fighter.attrs.speed, plan.speed);
  next.camp = plan;
  /* A balanced camp leaves a fighter ready everywhere; a lopsided one leaves
     him sharp in one thing and short of gas. */
  next.campQuality = clamp(0.25 + (weeks / CAMP_WEEKS) * 0.5 + spread * 0.32, 0, 1);
  return next;
}

export function takeFight(st: FightCareerState, offerId: string, tactics: Tactic[]): {
  state: FightCareerState; result: BoutResult; offer: Offer;
} | null {
  if (st.retired) return null;
  const offer = st.offers.find(o => o.id === offerId);
  if (!offer) return null;
  const { rng, done } = streamFor(st);
  const result = simBout({
    player: st.fighter, opponent: offer.opponent, rounds: offer.rounds,
    weight: st.weight, tactics, campQuality: st.campQuality,
  }, rng);
  done(offer.rounds * 6 + 4);
  return { state: applyResult(st, offer, result), result, offer };
}

export function applyResult(st: FightCareerState, offer: Offer, res: BoutResult): FightCareerState {
  const f = { ...st.fighter, attrs: { ...st.fighter.attrs } };
  const next: FightCareerState = { ...st, fighter: f, history: [...st.history], log: [...st.log] };

  f.damage = Math.round((f.damage + res.damageTaken) * 10) / 10;
  next.fightNo += 1;
  /* Fighters age on the calendar, not on wins. Roughly three fights a year is
     an active career, so age moves a third of a year per fight. */
  f.age = Math.round((f.age + 0.34) * 100) / 100;

  const won = res.winner === 'player';
  const drew = res.winner === 'draw';
  if (won) f.wins += 1; else if (drew) f.draws += 1; else f.losses += 1;
  if (won && (res.method === 'KO' || res.method === 'TKO')) f.kos += 1;

  if (offer.title) {
    if (won) {
      if (st.champion) next.titleDefences += 1;
      else { next.champion = true; f.rank = 0; next.titleDefences = 0; }
    } else if (!drew && st.champion) {
      next.champion = false;
      f.rank = 2;
    }
  } else if (won) {
    /* Round 620: beating a man well below you proves nothing once you are
       ranked, and the game has to say so or the safe road is simply the best
       road. Measured before this existed: a policy of nothing but tune ups ran
       47 fights, climbed to number one on volume alone and took the title, and
       beat every other policy by 81 legacy points. Padding a record is a real
       thing fighters do and it is supposed to stall, not win. */
    const gap = ratingOf(offer.opponent) - ratingOf(st.fighter);
    const cur = f.rank === 99 ? 20 : f.rank;
    const earned = cur <= 10 && gap < -6 ? 0 : offer.rankGain;
    f.rank = clampi(Math.min(cur, 20) - earned, 1, 99);
  } else if (!drew) {
    f.rank = clampi((f.rank === 99 ? 20 : f.rank) + 4, 1, 99);
  }

  next.earnings = Math.round((next.earnings + offer.purse) * 100) / 100;
  next.history.push({
    no: next.fightNo,
    opponent: offer.opponent.name,
    result: won ? 'W' : drew ? 'D' : 'L',
    method: res.method,
    round: res.endedRound,
    rounds: offer.rounds,
    purse: offer.purse,
    title: offer.title,
    oppRating: ratingOf(offer.opponent),
    myRating: ratingOf(st.fighter),
  });
  next.log.unshift(
    `${won ? 'Beat' : drew ? 'Drew with' : 'Lost to'} ${offer.opponent.name} by ${res.method}` +
    `${res.method === 'KO' || res.method === 'TKO' ? ` in round ${res.endedRound}` : ''}.`,
  );
  next.camp = null;
  next.campQuality = 0.5;
  next.retired = shouldRetire(next);
  next.offers = next.retired ? [] : offersFor(next);
  return next;
}

/**
 * When a fighter is finished.
 *
 * Damage is the first clause and it is the one that matters: a man who took
 * every war is done years before a man who did not, which is the entire point
 * of the tradeoff the offers present.
 */
export function shouldRetire(st: FightCareerState): boolean {
  const f = st.fighter;
  if (f.age >= 41) return true;
  if (f.damage >= 82) return true;
  if (f.age >= 35 && f.damage >= 58) return true;
  /* Three straight losses and no ranking left is the end of a career whatever
     the birth certificate says. */
  const last3 = st.history.slice(-3);
  if (last3.length === 3 && last3.every(h => h.result === 'L') && f.rank > 12) return true;
  return false;
}

export function legacyOf(st: FightCareerState): LegacyVerdict {
  const f = st.fighter;
  const titleWins = st.history.filter(h => h.title && h.result === 'W').length;
  /* A win over a man at least as good as you were that night. Judged on rating
     rather than money, for the reason recorded on FightLine.oppRating. */
  const bigWins = st.history.filter(h => h.result === 'W' && h.oppRating >= h.myRating - 3).length;
  /* Round 620: titles carry this, not volume.
     The first weighting paid 1.5 a win, so a long quiet career of beating
     nobodies scored 94 out of 100 and rated as an all time great while never
     fighting anyone. What a fighter is remembered for is who he beat and what
     he won, so a win is worth little on its own and a world title is worth
     about eighteen of them. */
  /* Stoppages of men worth stopping. Counting all knockouts rewarded a padded
     record twice over, once through the win rate and again through the finishes
     it produced, which is how a career of beating nobodies out-scored a career
     of beating contenders. */
  const qualityKos = st.history.filter(h =>
    h.result === 'W' && (h.method === 'KO' || h.method === 'TKO') && h.oppRating >= h.myRating - 3).length;
  const total = f.wins + f.losses + f.draws;
  const winPct = total ? f.wins / total : 0;
  const score = clampi(
    /* A clean record counts for something, but only something. An unbeaten
       fighter who never met anybody is a trivia answer, not a great. */
    18 * winPct +
    /* Who you beat. A win over somebody worth paying for is worth something and
       a win over a late replacement is not, which is why this counts purse
       rather than wins. Counting raw wins paid a long quiet career of beating
       nobodies 94 out of 100, and then subtracting losses at nearly twice a
       win's value scored an honest even record at zero. Both were wrong in the
       same way: they measured how many nights, not what happened on them. */
    bigWins * 2.4 +
    qualityKos * 0.6 +
    titleWins * 12 +
    st.titleDefences * 7 -
    Math.max(0, f.damage - 50) * 0.22,
    0, 100,
  );
  const { tier, hof } = legacyTier(score);
  const bullets: string[] = [
    `${f.wins} and ${f.losses}${f.draws ? ` and ${f.draws}` : ''}, with ${f.kos} inside the distance.`,
  ];
  if (titleWins) bullets.push(`${titleWins} world title win${titleWins > 1 ? 's' : ''} and ${st.titleDefences} defence${st.titleDefences === 1 ? '' : 's'}.`);
  else bullets.push('Never won a world title.');
  bullets.push(`Career purse ${st.earnings.toFixed(2)}m.`);
  bullets.push(
    f.damage >= 70 ? 'He left it all in there, and it shows.'
      : f.damage >= 40 ? 'He took his share and walked out on his own feet.'
        : 'He got out clean, which almost nobody does.',
  );
  return { score, tier, hof, bullets };
}

/* ─────────────────────────── the daily ─────────────────────────── */

export interface DailyFight {
  player: Fighter;
  opponent: Fighter;
  weight: WeightId;
  rounds: number;
}

/**
 * One seeded bout per Eastern day, the same for everybody, three rounds, no
 * career attached. It is a tactics puzzle rather than a career: you are handed
 * a fighter and an opponent whose style is readable, and you choose three
 * tactics.
 *
 * Both fighters are drawn against a FIXED difficulty target rather than freely,
 * so a Tuesday is not harder than a Monday. The harness checks that target
 * holds across a year of seeds, because "the daily is winnable" is exactly the
 * kind of thing that is true on the day somebody checks and false in March.
 */
export function dailyFight(dayKey: string): DailyFight {
  const rng = rngFrom(hashLabel(`fight-career-daily|${dayKey}`));
  const weight = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
  const player = makeFighter(rng, 70, weight);
  const opponent = makeFighter(rng, 70, weight);
  player.age = 27;
  opponent.age = 27;
  player.damage = 0;
  opponent.damage = 0;
  return { player, opponent, weight, rounds: 3 };
}

export const DAILY_MAX = 100;

/**
 * The daily score, on the sitewide 100 scale, written before the UI existed so
 * it could not drift into whatever the screen happened to make easy.
 *
 *   win the bout                                  50
 *   each round won on the cards, capped           8 each, max 24
 *   finish inside the distance                    12
 *   every tactic correct against his style        14
 *   damage taken, scaled                          0 to minus 14
 */
export function scoreDaily(res: BoutResult, tactics: Tactic[], oppStyle: FightStyle): number {
  let s = 0;
  if (res.winner === 'player') s += 50;
  s += Math.min(24, res.roundsWon * 8);
  if (res.method === 'KO' || res.method === 'TKO') s += 12;
  const right = tactics.filter(t => tacticEdge(t, oppStyle) > 0).length;
  s += Math.round((right / Math.max(1, tactics.length)) * 14);
  s -= Math.min(14, Math.round(res.damageTaken * 0.7));
  return clampi(s, 0, DAILY_MAX);
}
