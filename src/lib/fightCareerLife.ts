/**
 * Round 916: the life between fights in Fight Career.
 *
 * Before this round the game was an offer, a camp, a bout and a record: two
 * decisions between fights, nothing to spend a purse on, nobody writing to
 * you and nobody to measure yourself against. This file is the layer that
 * sits between two fights, in boxing's own terms: a trainer and a manager, a
 * deck of cards, an inbox, a rival, a bank and a camp shop, and badges.
 *
 * HOW IT IS BUILT, and why it is built this way.
 *
 * 1. IT WRAPS, IT DOES NOT REWRITE. fightCareer.ts gained three optional
 *    seams (camp mods, fight mods, the `life` field) and is otherwise the file
 *    it was. Everything here calls it. This file imports its values, it
 *    imports only a type from here, so there is no cycle. Fight Gym and Fight
 *    Promoter share that engine and are not touched.
 * 2. THE LIFE HAS ITS OWN SEEDED STREAM. Every draw here comes from the save's
 *    seed and `life.tick`, never from `rngTick`, which is the bout's. So a
 *    career that answers every card with its neutral option fights the same
 *    fights, to the punch, as a career with no life layer at all.
 *    scripts/simFightCareer.mjs section 7 asserts exactly that.
 * 3. WORDS ARE GENERATED FROM NUMBERS. An option is a LifeEffect, the text on
 *    its button is describeLifeEffect of that effect, and tapping it runs
 *    applyLifeEffect on the same object. A button cannot promise one thing and
 *    do another, and the harness reads the numbers back out of the words.
 * 4. NOTHING HERE IS A WAGER. No option risks money on an outcome, and there
 *    is no coin inside any card.
 * 5. EVERYBODY IS GENERATED. The trainer, the manager and the rival are named
 *    off the same two banks as every boxer (genFighterName), which
 *    scripts/simInventedNames.mjs already checks. No sanctioning body,
 *    promoter, venue or belt is named anywhere.
 */

import { rngFrom, clamp } from '@/lib/careerEngine';
import {
  WEIGHT_CLASSES, offersFor, genFighterName, makeFighter, ratingOf, campGain,
  type FightCareerState, type Fighter, type Offer, type CampPlan, type FightMods,
  type WeightId, type FightStyle,
} from '@/lib/fightCareer';
import { round2, upgradeLevel, purseAfterCuts, UPGRADES, type UpgradeId } from '@/lib/fightCareerMoney';
import type { InboxMessage } from '@/lib/careerInbox';
import type { RivalryEvent } from '@/lib/careerRivalryEvents';
import type { RivalryChoiceCard } from '@/lib/careerRivalryChoices';

/* ─────────────────────────── the corner ─────────────────────────── */

export type TrainerId = 'allround' | 'puncher' | 'slick' | 'engine';
export type ManagerId = 'family' | 'dealmaker' | 'matchmaker';

export interface TrainerDef {
  id: TrainerId;
  label: string;
  /** His share of every purse, a fraction. */
  cut: number;
  grow: Partial<Record<keyof CampPlan, number>>;
  /** Sharpness he adds to every fight night, whole points. */
  sharp: number;
}

export interface ManagerDef {
  id: ManagerId;
  label: string;
  cut: number;
  /** Multiplies every purse he brings you. */
  purseMul: number;
  /** Extra places on a win that is not for a title. */
  rankBonus: number;
  /** Extra fans after every fight, win or lose. */
  fansPerFight: number;
}

export const TRAINERS: TrainerDef[] = [
  { id: 'allround', label: 'The all-rounder', cut: 0.1, grow: {}, sharp: 0 },
  { id: 'puncher', label: "The puncher's coach", cut: 0.1, grow: { power: 1.25, defence: 0.85 }, sharp: 0 },
  { id: 'slick', label: 'The defensive mind', cut: 0.1, grow: { defence: 1.2, speed: 1.2, power: 0.85 }, sharp: 0 },
  { id: 'engine', label: 'The conditioner', cut: 0.1, grow: { conditioning: 1.25, speed: 0.85 }, sharp: 1 },
];

export const MANAGERS: ManagerDef[] = [
  { id: 'family', label: 'The family friend', cut: 0.05, purseMul: 1, rankBonus: 0, fansPerFight: 0 },
  { id: 'dealmaker', label: 'The dealmaker', cut: 0.25, purseMul: 1.25, rankBonus: 0, fansPerFight: 1 },
  { id: 'matchmaker', label: 'The matchmaker', cut: 0.15, purseMul: 1, rankBonus: 1, fansPerFight: 0 },
];

export const trainerDef = (id: TrainerId): TrainerDef => TRAINERS.find(t => t.id === id) ?? TRAINERS[0];
export const managerDef = (id: ManagerId): ManagerDef => MANAGERS.find(m => m.id === id) ?? MANAGERS[0];

const pct = (frac: number): string => `${Math.round(frac * 100)}%`;
const AREA_LABEL: Record<keyof CampPlan, string> = {
  conditioning: 'conditioning', power: 'power', defence: 'defence', speed: 'speed',
};

/** The setup screen's line for a trainer, generated from his numbers. */
export function describeTrainer(t: TrainerDef): string {
  const parts: string[] = [];
  for (const k of Object.keys(AREA_LABEL) as (keyof CampPlan)[]) {
    const m = t.grow[k];
    if (m === undefined || m === 1) continue;
    const by = Math.round(Math.abs(m - 1) * 100);
    parts.push(`${AREA_LABEL[k]} weeks worth ${by}% ${m > 1 ? 'more' : 'less'}`);
  }
  if (t.sharp) parts.push(`${t.sharp} point${t.sharp === 1 ? '' : 's'} sharper on every fight night`);
  if (parts.length === 0) parts.push('no specialty, every camp week is worth what it is worth');
  const line = parts.join(', ');
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}. Takes ${pct(t.cut)} of every purse.`;
}

/** The setup screen's line for a manager, generated from his numbers. */
export function describeManager(m: ManagerDef): string {
  const parts: string[] = [];
  if (m.purseMul !== 1) parts.push(`purses ${Math.round((m.purseMul - 1) * 100)}% bigger`);
  if (m.rankBonus) parts.push(`a win that is not for a title is worth ${m.rankBonus} more place${m.rankBonus === 1 ? '' : 's'}`);
  if (m.fansPerFight) parts.push(`${m.fansPerFight} more fan${m.fansPerFight === 1 ? '' : 's'} after every fight`);
  if (parts.length === 0) parts.push('purses as they come');
  const line = parts.join(', ');
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}. Takes ${pct(m.cut)} of every purse.`;
}

/* ─────────────────────────── the save block ─────────────────────────── */

/** The rival: a generated fighter in your class, climbing beside you. */
export interface FightRival {
  name: string;
  style: FightStyle;
  age: number;
  rating: number;
  potential: number;
  wins: number;
  losses: number;
  kos: number;
  /** 1 is the number one contender, 99 is unranked, the way yours is. */
  rank: number;
  champion: boolean;
  retired: boolean;
  /** Your record against him. */
  h2hWins: number;
  h2hLosses: number;
}

/**
 * Everything between fights. Every field has a default, so a block that came
 * back from storage short or wrong is repaired field by field (ensureLife),
 * and a save from before the round simply gets a fresh one.
 *
 * The meter names (morale, fanbase, karma, rivalryIntensity) and the inbox
 * names (phoneInbox, phoneUsedIds) are the ones every other career on the
 * site uses, so the shared modules bind with no adapter.
 */
export interface FightLife {
  v: 1;
  /** The life stream's position, so a reload never replays a deal. */
  tick: number;
  trainer: { kind: TrainerId; name: string };
  manager: { kind: ManagerId; name: string };
  /** Millions. A card can put it below zero: that is the tab, paid first. */
  bank: number;
  shop: Partial<Record<UpgradeId, number>>;
  /** 0 to 100. Feeds the purses, never the bout. */
  fanbase: number;
  /** 0 to 100, neutral 50. A happy camp is a slightly better camp. */
  morale: number;
  /** 0 to 100, neutral 50. The inbox's mood meter. */
  karma: number;
  rivalryIntensity: number;
  /** Card ids waiting to be answered, in the order they are shown. */
  pending: string[];
  /** Card id to the fight number it may come round again from. */
  cooldowns: Record<string, number>;
  /** Sharpness banked for the next fight night, then cleared by it. */
  sharp: number;
  /** The fraction of a point a specialty has earned and not yet paid. */
  carry: Partial<Record<keyof CampPlan, number>>;
  /** Fights left on an exclusive promoter deal. */
  promoterFights: number;
  /** The last man to beat you, kept for the rematch clause. */
  lastBeatenBy: Fighter | null;
  /** How many times you have changed weight class. */
  classMoves: number;
  /** Cards, texts and rival choices answered. */
  decisions: number;
  /** The newest lines first, capped. */
  feed: string[];
  rival: FightRival | null;
  pendingRivalryEvent: RivalryEvent | null;
  lastRivalryEventId: number | null;
  pendingRivalryChoice: RivalryChoiceCard | null;
  rivalryChoicesSeen: string[];
  phoneInbox: InboxMessage[];
  phoneUsedIds: string[];
}

export const FEED_MAX = 14;
export const START_FANS = 5;
export const PROMOTER_PURSE_MUL = 1.2;
export const GRUDGE_PURSE_MUL = 1.3;
export const REMATCH_RANK_GAIN = 4;
/** Fans to purse: half a percent a fan, so a full house is half as much again. */
export const FAN_PURSE_STEP = 0.005;
/** Morale to the night: every ten above or below 50 is a point of sharpness. */
export const MORALE_PER_SHARP = 10;
/** The most the life can add to or take from one night, in points. */
export const SHARP_CAP = 8;

/** The life stream: the save's seed, the life's own tick. Never rngTick. */
export function lifeStream(st: FightCareerState): { rng: () => number; done: () => void } {
  const life = st.life;
  const rng = rngFrom(((st.seed ^ 0x5bd1e995) >>> 0) + (life?.tick ?? 0) * 7919);
  return { rng, done: () => { if (life) life.tick += 1; } };
}

const pushFeed = (life: FightLife, line: string): void => {
  life.feed = [line, ...life.feed].slice(0, FEED_MAX);
};

/* ─────────────────────────── effects: the one currency ─────────────────────────── */

/**
 * Everything an option can do. A card option, a rival choice and a rival beat
 * are all written as one of these, so there is one describer and one applier.
 *
 * BOUT NEUTRAL fields are the ones that cannot reach a fight on their own:
 * cash, fans, heat and pursePct. Every card carries one option made only of
 * those (or of nothing), which is what "answered neutrally" means.
 */
export interface LifeEffect {
  /** Bank, millions, signed. */
  cash?: number;
  fans?: number;
  morale?: number;
  karma?: number;
  /** Rivalry intensity. */
  heat?: number;
  /** Permanent damage. Only ever positive: damage never heals. */
  damage?: number;
  /** Years out of the ring. */
  age?: number;
  /** Sharpness for the next fight night only: whole points on power, speed,
   *  stamina and defence. */
  sharp?: number;
  /** Percent change to every purse on the table right now. */
  pursePct?: number;
  /** Ranking places. Positive is DOWN the rankings. Ignored for a champion. */
  rank?: number;
  /** Change weight class: 1 up, -1 down. Unranked again, any belt stays behind. */
  moveClass?: 1 | -1;
  /** Fights of an exclusive promoter deal. */
  promoter?: number;
  /** The middle offer becomes the last man who beat you. */
  rematch?: boolean;
  /** The middle offer becomes your rival. */
  grudge?: boolean;
}

export const BOUT_NEUTRAL_KEYS: (keyof LifeEffect)[] = ['cash', 'fans', 'heat', 'pursePct'];

export function isBoutNeutral(e: LifeEffect): boolean {
  return (Object.keys(e) as (keyof LifeEffect)[]).every(k => BOUT_NEUTRAL_KEYS.includes(k) || !e[k]);
}

const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

/** The promise in words, generated from the numbers applyLifeEffect runs. */
export function describeLifeEffect(e: LifeEffect): string {
  const parts: string[] = [];
  if (e.cash) parts.push(`Bank ${e.cash > 0 ? '+' : '-'}${Math.abs(e.cash).toFixed(2)}m`);
  if (e.fans) parts.push(`Fans ${signed(e.fans)}`);
  if (e.morale) parts.push(`Morale ${signed(e.morale)}`);
  if (e.karma) parts.push(`Karma ${signed(e.karma)}`);
  if (e.heat) parts.push(`Feud ${signed(e.heat)}`);
  if (e.damage) parts.push(`Damage +${e.damage.toFixed(1)} for good`);
  if (e.age) parts.push(`${Math.round(e.age * 12)} months out of the ring`);
  if (e.sharp) parts.push(`Next fight ${signed(e.sharp)} sharpness`);
  if (e.pursePct) parts.push(`Purses on the table ${signed(e.pursePct)}%`);
  if (e.rank) parts.push(e.rank > 0 ? `Down ${e.rank} in the rankings` : `Up ${-e.rank} in the rankings`);
  if (e.moveClass) parts.push(`Move ${e.moveClass > 0 ? 'up' : 'down'} a weight class, unranked again, any belt stays behind`);
  if (e.promoter) parts.push(`Purses ${signed(Math.round((PROMOTER_PURSE_MUL - 1) * 100))}% for ${e.promoter} fights, the safest offer leaves the table`);
  if (e.rematch) parts.push(`The middle offer becomes the rematch, a win worth ${REMATCH_RANK_GAIN} places`);
  if (e.grudge) parts.push(`The middle offer becomes the grudge fight, purse ${signed(Math.round((GRUDGE_PURSE_MUL - 1) * 100))}%`);
  return parts.length ? parts.join('. ') + '.' : 'Nothing changes.';
}

/** Can this class move happen at all? There is nothing above heavyweight. */
export function classAfterMove(weight: WeightId, dir: 1 | -1): WeightId | null {
  const i = WEIGHT_CLASSES.findIndex(w => w.id === weight);
  return WEIGHT_CLASSES[i + dir]?.id ?? null;
}

/** A copy deep enough that nothing the life layer mutates is shared. */
export function cloneForLife(st: FightCareerState): FightCareerState & { life: FightLife } {
  const life = ensureLifeBlock(st);
  return {
    ...st,
    fighter: { ...st.fighter, attrs: { ...st.fighter.attrs } },
    offers: st.offers.map(o => ({ ...o })),
    history: [...st.history],
    log: [...st.log],
    life: {
      ...life,
      trainer: { ...life.trainer },
      manager: { ...life.manager },
      shop: { ...life.shop },
      carry: { ...life.carry },
      pending: [...life.pending],
      cooldowns: { ...life.cooldowns },
      feed: [...life.feed],
      rival: life.rival ? { ...life.rival } : null,
      rivalryChoicesSeen: [...life.rivalryChoicesSeen],
      phoneInbox: [...life.phoneInbox],
      phoneUsedIds: [...life.phoneUsedIds],
    },
  };
}

const meter = (v: number): number => clamp(Math.round(v), 0, 100);
const middleOf = (offers: Offer[]): number => Math.floor(offers.length / 2);

/** The rival as a man you can actually be matched with. Built from his own
 *  name, so the same rival is the same fighter every time he is drawn. */
export function rivalFighter(st: FightCareerState): Fighter | null {
  const r = st.life?.rival;
  if (!r || r.retired) return null;
  let h = 2166136261;
  for (let i = 0; i < r.name.length; i += 1) h = Math.imul(h ^ r.name.charCodeAt(i), 16777619);
  const f = makeFighter(rngFrom(h >>> 0), r.rating, st.weight, r.style);
  return { ...f, name: r.name, age: r.age, wins: r.wins, losses: r.losses, kos: r.kos, rank: r.rank };
}

/**
 * Dress a table of offers fresh out of offersFor: the manager's purse, the
 * crowd's purse, the matchmaker's extra place, and the promoter's terms.
 * Called exactly once per table, by the wrappers below.
 */
export function dressOffers(st: FightCareerState & { life: FightLife }): void {
  const life = st.life;
  const mgr = managerDef(life.manager.kind);
  const mul = mgr.purseMul * (1 + life.fanbase * FAN_PURSE_STEP);
  st.offers = st.offers.map(o => ({
    ...o,
    purse: round2(o.purse * mul),
    rankGain: !o.title && o.rankGain > 0 ? o.rankGain + mgr.rankBonus : o.rankGain,
  }));
  if (life.promoterFights > 0) promoterTable(st);
}

/** The promoter's table: the safest offer goes and the rest pay more. */
function promoterTable(st: FightCareerState): void {
  if (st.offers.length < 2) return;
  st.offers = st.offers.slice(1).map(o => ({ ...o, purse: round2(o.purse * PROMOTER_PURSE_MUL) }));
}

/**
 * Run one effect on a state. `st` must be a cloneForLife copy: this mutates.
 * Every line here is one field of LifeEffect and nothing else, which is what
 * lets the harness rebuild the expected state from the effect alone.
 */
export function applyLifeEffect(st: FightCareerState & { life: FightLife }, e: LifeEffect): void {
  const life = st.life;
  const f = st.fighter;
  if (e.cash) life.bank = round2(life.bank + e.cash);
  if (e.fans) life.fanbase = meter(life.fanbase + e.fans);
  if (e.morale) life.morale = meter(life.morale + e.morale);
  if (e.karma) life.karma = meter(life.karma + e.karma);
  if (e.heat) life.rivalryIntensity = meter(life.rivalryIntensity + e.heat);
  if (e.damage && e.damage > 0) f.damage = Math.round((f.damage + e.damage) * 10) / 10;
  if (e.age && e.age > 0) f.age = round2(f.age + e.age);
  if (e.sharp) life.sharp = clamp(Math.round(life.sharp + e.sharp), -SHARP_CAP, SHARP_CAP);
  if (e.pursePct) st.offers = st.offers.map(o => ({ ...o, purse: round2(o.purse * (1 + e.pursePct! / 100)) }));
  if (e.rank && !st.champion) {
    const cur = f.rank === 99 ? 20 : f.rank;
    f.rank = clamp(Math.round(cur + e.rank), 1, 99);
  }
  if (e.moveClass) {
    const to = classAfterMove(st.weight, e.moveClass);
    if (to) {
      st.weight = to;
      st.champion = false;
      f.rank = 99;
      life.classMoves += 1;
      st.offers = offersFor(st);
      dressOffers(st);
    }
  }
  if (e.promoter) {
    life.promoterFights = e.promoter;
    promoterTable(st);
  }
  if (e.rematch && life.lastBeatenBy && st.offers.length) {
    const i = middleOf(st.offers);
    const base = st.offers[i];
    st.offers[i] = {
      ...base, id: `${base.id}r`, opponent: { ...life.lastBeatenBy }, label: 'Rematch',
      rankGain: base.title ? 0 : REMATCH_RANK_GAIN,
    };
    life.lastBeatenBy = null;
  }
  if (e.grudge) {
    const him = rivalFighter(st);
    if (him && st.offers.length) {
      const i = middleOf(st.offers);
      const base = st.offers[i];
      st.offers[i] = { ...base, id: `${base.id}g`, opponent: him, label: GRUDGE_LABEL, purse: round2(base.purse * GRUDGE_PURSE_MUL) };
    }
  }
}

export const GRUDGE_LABEL = 'Grudge match';

/* ─────────────────────────── a fresh block, and a repaired one ─────────────────────────── */

const STYLE_IDS: FightStyle[] = ['outboxer', 'swarmer', 'slugger', 'counter'];

/**
 * The block a career starts with, or the one a save from before the round is
 * given the first time it is read. Named off the save's own seed, so the same
 * save always meets the same trainer, manager and rival.
 */
export function newLife(st: FightCareerState, trainer: TrainerId = 'allround', manager: ManagerId = 'family'): FightLife {
  const rng = rngFrom(((st.seed ^ 0x2c1b3c6d) >>> 0));
  const trainerName = genFighterName(rng);
  let managerName = genFighterName(rng);
  for (let i = 0; i < 8 && managerName === trainerName; i += 1) managerName = genFighterName(rng);
  let rivalName = genFighterName(rng);
  for (let i = 0; i < 8 && [st.fighter.name, trainerName, managerName].includes(rivalName); i += 1) rivalName = genFighterName(rng);
  /* A career already under way (a save from before the round) meets a rival
     who has been fighting as long as it has, about level with it. */
  const fights = st.fightNo;
  const wins = Math.round(fights * 0.75);
  const mine = fights > 0 ? ratingOf(st.fighter) : 52;
  const rival: FightRival = {
    name: rivalName,
    style: STYLE_IDS[Math.floor(rng() * STYLE_IDS.length)],
    age: Math.round((st.fighter.age + Math.floor(rng() * 3) - 1) * 100) / 100,
    rating: clamp(Math.round(mine - 2 + rng() * 5), 30, 95),
    potential: clamp(Math.round(74 + rng() * 20), 60, 97),
    wins, losses: fights - wins, kos: Math.round(wins * 0.4),
    rank: st.champion ? 3 : st.fighter.rank === 99 ? 99 : clamp(st.fighter.rank + 2, 1, 20),
    champion: false, retired: false, h2hWins: 0, h2hLosses: 0,
  };
  return {
    v: 1, tick: 0,
    trainer: { kind: trainerDef(trainer).id, name: trainerName },
    manager: { kind: managerDef(manager).id, name: managerName },
    bank: 0, shop: {}, fanbase: START_FANS, morale: 50, karma: 50, rivalryIntensity: 0,
    pending: [], cooldowns: {}, sharp: 0, carry: {}, promoterFights: 0, lastBeatenBy: null,
    classMoves: 0, decisions: 0, feed: [],
    rival, pendingRivalryEvent: null, lastRivalryEventId: null,
    pendingRivalryChoice: null, rivalryChoicesSeen: [],
    phoneInbox: [], phoneUsedIds: [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numOr = (v: unknown, d: number, lo: number, hi: number): number =>
  (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * The life block of a save, repaired. A save with no block (version 1, before
 * the round) or with one that is not a block gets a fresh one and keeps its
 * fighter and its record exactly. A block with one bad field keeps the rest.
 */
export function ensureLifeBlock(st: FightCareerState): FightLife {
  const raw: unknown = st.life;
  const fresh = newLife(st);
  if (!isObj(raw) || raw.v !== 1) return fresh;
  const corner = (v: unknown, ok: (id: string) => boolean): v is { kind: string; name: string } =>
    isObj(v) && typeof v.kind === 'string' && ok(v.kind) && typeof v.name === 'string' && v.name.length > 0;
  const shop: Partial<Record<UpgradeId, number>> = {};
  if (isObj(raw.shop)) for (const u of UPGRADES) shop[u.id] = upgradeLevel({ bank: 0, shop: raw.shop as Partial<Record<UpgradeId, number>> }, u.id);
  const carry: Partial<Record<keyof CampPlan, number>> = {};
  if (isObj(raw.carry)) for (const k of Object.keys(AREA_LABEL) as (keyof CampPlan)[]) carry[k] = numOr(raw.carry[k], 0, -1, 1);
  const cooldowns: Record<string, number> = {};
  if (isObj(raw.cooldowns)) for (const [k, v] of Object.entries(raw.cooldowns)) if (typeof v === 'number' && Number.isFinite(v)) cooldowns[k] = v;
  const rival = isObj(raw.rival) && typeof raw.rival.name === 'string' && STYLE_IDS.includes(raw.rival.style as FightStyle)
    ? { ...fresh.rival!, ...(raw.rival as unknown as FightRival) } : raw.rival === null ? null : fresh.rival;
  const beaten = isObj(raw.lastBeatenBy) && typeof raw.lastBeatenBy.name === 'string' && isObj(raw.lastBeatenBy.attrs)
    ? raw.lastBeatenBy as unknown as Fighter : null;
  return {
    v: 1,
    tick: numOr(raw.tick, 0, 0, 1e9),
    trainer: corner(raw.trainer, id => TRAINERS.some(t => t.id === id)) ? raw.trainer as FightLife['trainer'] : fresh.trainer,
    manager: corner(raw.manager, id => MANAGERS.some(m => m.id === id)) ? raw.manager as FightLife['manager'] : fresh.manager,
    bank: round2(numOr(raw.bank, 0, -1000, 100000)),
    shop,
    fanbase: numOr(raw.fanbase, START_FANS, 0, 100),
    morale: numOr(raw.morale, 50, 0, 100),
    karma: numOr(raw.karma, 50, 0, 100),
    rivalryIntensity: numOr(raw.rivalryIntensity, 0, 0, 100),
    pending: strings(raw.pending).filter(id => LIFE_CARDS.some(c => c.id === id)),
    cooldowns,
    sharp: Math.round(numOr(raw.sharp, 0, -SHARP_CAP, SHARP_CAP)),
    carry,
    promoterFights: Math.floor(numOr(raw.promoterFights, 0, 0, 20)),
    lastBeatenBy: beaten,
    classMoves: Math.floor(numOr(raw.classMoves, 0, 0, 99)),
    decisions: Math.floor(numOr(raw.decisions, 0, 0, 1e6)),
    feed: strings(raw.feed).slice(0, FEED_MAX),
    rival,
    pendingRivalryEvent: isObj(raw.pendingRivalryEvent) && typeof raw.pendingRivalryEvent.id === 'number'
      ? raw.pendingRivalryEvent as unknown as RivalryEvent : null,
    lastRivalryEventId: typeof raw.lastRivalryEventId === 'number' ? raw.lastRivalryEventId : null,
    pendingRivalryChoice: isObj(raw.pendingRivalryChoice) && typeof raw.pendingRivalryChoice.id === 'string' && Array.isArray(raw.pendingRivalryChoice.choices)
      ? raw.pendingRivalryChoice as unknown as RivalryChoiceCard : null,
    rivalryChoicesSeen: strings(raw.rivalryChoicesSeen),
    phoneInbox: Array.isArray(raw.phoneInbox)
      ? (raw.phoneInbox as unknown[]).filter((m): m is InboxMessage => isObj(m) && typeof m.id === 'string' && Array.isArray(m.choices))
      : [],
    phoneUsedIds: strings(raw.phoneUsedIds),
  };
}

/** A save with its life block in place: what the board loads through. */
export function ensureLife(st: FightCareerState): FightCareerState & { life: FightLife } {
  return { ...st, life: ensureLifeBlock(st) };
}

/* ─────────────────────────── the deck ─────────────────────────── */

export interface LifeOption {
  label: string;
  effect: LifeEffect;
  /** The line the feed keeps once it is picked. */
  line: string;
  /** The option that cannot reach a fight. Every card has exactly one. */
  neutral?: true;
}

type Live = FightCareerState & { life: FightLife };

export interface LifeCardDef {
  id: string;
  emoji: string;
  title: string;
  text: string;
  /** Fights before it can come round again. */
  cooldown: number;
  when?: (st: Live) => boolean;
  options: LifeOption[];
}

const ranked = (st: Live): boolean => !st.champion && st.fighter.rank < 99;
const climbing = (st: Live): boolean => !st.champion && st.fighter.rank > 1;

/* The body: weight, hands, cuts, the things a camp does to a fighter. */
const BODY_CARDS: LifeCardDef[] = [
  {
    id: 'weight-cut', emoji: '⚖️', title: 'Four pounds over', cooldown: 6,
    text: 'A week out and the scale says four pounds too many. There are three ways this goes.',
    when: st => st.weight !== 'heavy',
    options: [
      { label: 'Hire the nutritionist', effect: { cash: -0.02 }, line: 'Paid a nutritionist and made the weight easily.', neutral: true },
      { label: 'Sweat it out the old way', effect: { sharp: -3 }, line: 'Boiled down in the sauna and felt it for days.' },
      { label: 'Come in heavy and pay the fine', effect: { pursePct: -15, sharp: 1 }, line: 'Missed the weight, paid the fine, kept the strength.' },
    ],
  },
  {
    id: 'move-up', emoji: '⬆️', title: 'The class above', cooldown: 14,
    text: 'Your trainer thinks you have outgrown the division. Up there punches end fights more often, and nobody knows your name.',
    when: st => st.fightNo >= 6 && classAfterMove(st.weight, 1) !== null,
    options: [
      { label: 'Move up', effect: { moveClass: 1 }, line: 'Moved up a weight class and started again from the bottom of it.' },
      { label: 'Stay where you are', effect: {}, line: 'Stayed at the weight.', neutral: true },
    ],
  },
  {
    id: 'move-down', emoji: '⬇️', title: 'The class below', cooldown: 14,
    text: 'Your manager thinks the money and the openings are a division down. The cut is hard and fights there go the distance more.',
    when: st => st.fightNo >= 6 && classAfterMove(st.weight, -1) !== null,
    options: [
      { label: 'Move down', effect: { moveClass: -1, sharp: -2 }, line: 'Dropped a weight class and felt the cut.' },
      { label: 'Stay where you are', effect: {}, line: 'Stayed at the weight.', neutral: true },
    ],
  },
  {
    id: 'hand-injury', emoji: '🤕', title: 'The right hand', cooldown: 10,
    text: 'A knuckle came up like an egg after sparring. It is not broken, but it is not right.',
    options: [
      { label: 'See the hand specialist', effect: { cash: -0.04 }, line: 'Paid the specialist and the hand came good.', neutral: true },
      { label: 'Tape it and fight', effect: { damage: 1.5 }, line: 'Taped the hand and fought on it anyway.' },
      { label: 'Rest it properly', effect: { age: 0.34 }, line: 'Sat out four months to let the hand heal.' },
    ],
  },
  {
    id: 'scar-tissue', emoji: '🩸', title: 'Scar tissue', cooldown: 10,
    text: 'The old cut over your eye opened again in the gym. It will open on the night too unless somebody fixes it.',
    when: st => st.fighter.damage >= 12,
    options: [
      { label: 'Pay to have it fixed', effect: { cash: -0.05 }, line: 'Had the scar tissue seen to properly.', neutral: true },
      { label: 'Leave it to the corner', effect: { damage: 1 }, line: 'Left the cut for the corner to deal with on the night.' },
    ],
  },
  {
    id: 'gym-war', emoji: '💥', title: 'A gym war', cooldown: 6,
    text: 'Sparring with a bigger man turned into a real fight. Your trainer is looking at you to see what you want.',
    options: [
      { label: 'Stop it there', effect: {}, line: 'Called time on the sparring before it got silly.', neutral: true },
      { label: 'Finish the rounds', effect: { damage: 0.8, sharp: 2 }, line: 'Finished the rounds, took some, learned some.' },
    ],
  },
  {
    id: 'bug-in-camp', emoji: '🤒', title: 'A bug in camp', cooldown: 8,
    text: 'Half the gym is ill and you can feel it coming.',
    options: [
      { label: 'Pay the doctor to get you right', effect: { cash: -0.02 }, line: 'Got the doctor in early and it passed.', neutral: true },
      { label: 'Train through it', effect: { sharp: -3 }, line: 'Trained through the bug and had a flat camp.' },
      { label: 'Push the date back', effect: { age: 0.17, fans: -1 }, line: 'Put the fight back two months to get well.' },
    ],
  },
  {
    id: 'doctors-letter', emoji: '📄', title: "The doctor's letter", cooldown: 12,
    text: 'After the wars you have been in, the ringside doctor wants extra scans before your licence is renewed.',
    when: st => st.fighter.damage >= 40,
    options: [
      { label: 'Pay for the scans', effect: { cash: -0.03 }, line: 'Paid for the scans and was cleared.', neutral: true },
      { label: 'Wait for the free ones', effect: { age: 0.34 }, line: 'Waited four months for the scans to come round.' },
    ],
  },
  {
    id: 'overcooked', emoji: '🥵', title: 'Left it in the gym', cooldown: 7,
    text: 'You have been flat for a week. Your trainer says fighters overtrain more often than they undertrain.',
    when: st => st.fightNo >= 3,
    options: [
      { label: 'Keep the schedule', effect: {}, line: 'Kept to the schedule.', neutral: true },
      { label: 'Take the week off', effect: { sharp: -1, morale: 3 }, line: 'Took a week off and came back smiling.' },
      { label: 'Double sessions', effect: { sharp: 2, damage: 0.5 }, line: 'Doubled the sessions and paid for the sharpness.' },
    ],
  },
];

/* The business: who promotes you, who you fight, and what it pays. */
const BUSINESS_CARDS: LifeCardDef[] = [
  {
    id: 'promoter-deal', emoji: '🖊️', title: 'An exclusive deal', cooldown: 10,
    text: 'A promoter wants you on his shows and nobody else\'s. He pays better, and he does not put on easy nights.',
    when: st => st.fightNo >= 4 && st.life.promoterFights === 0,
    options: [
      { label: 'Sign it', effect: { promoter: 4 }, line: 'Signed an exclusive promoter deal for four fights.' },
      { label: 'Stay a free agent', effect: {}, line: 'Turned the exclusive deal down.', neutral: true },
    ],
  },
  {
    id: 'rematch-clause', emoji: '🔁', title: 'The rematch clause', cooldown: 3,
    text: 'There was a rematch clause in the contract for the one you lost. Your manager can invoke it today.',
    when: st => !!st.life.lastBeatenBy && climbing(st) && st.offers.length > 0 && !st.offers[0].title,
    options: [
      { label: 'Invoke it', effect: { rematch: true }, line: 'Invoked the rematch clause.' },
      { label: 'Let it go', effect: {}, line: 'Let the rematch clause lapse.', neutral: true },
    ],
  },
  {
    id: 'hometown-card', emoji: '🏠', title: 'The hometown card', cooldown: 8,
    text: 'A hall in the town you grew up in wants you top of the bill. The gate is small and every seat is somebody you know.',
    options: [
      { label: 'Fight at home', effect: { fans: 5, pursePct: -15 }, line: 'Took the hometown card for less money.' },
      { label: 'Stay on the road', effect: {}, line: 'Passed on the hometown card.', neutral: true },
    ],
  },
  {
    id: 'short-notice', emoji: '⏱️', title: 'Short notice', cooldown: 6,
    text: 'A main event lost a fighter and the date is two weeks away. The money is better because the camp is not a camp.',
    options: [
      { label: 'Take the date', effect: { pursePct: 25, sharp: -4 }, line: 'Took a fight on two weeks notice.' },
      { label: 'Keep your own date', effect: {}, line: 'Turned down the short notice date.', neutral: true },
    ],
  },
  {
    id: 'tv-slot', emoji: '📺', title: 'A television slot', cooldown: 8,
    text: 'You can open a big televised card for less, or headline a small one that nobody films.',
    options: [
      { label: 'Open the big card', effect: { fans: 4, pursePct: -10 }, line: 'Opened a televised card and the audience found you.' },
      { label: 'Headline the small one', effect: {}, line: 'Headlined a small show.', neutral: true },
    ],
  },
  {
    id: 'glove-deal', emoji: '🧤', title: 'A glove deal', cooldown: 10,
    text: 'An equipment maker will pay you to wear their gloves. They are not the gloves you like.',
    options: [
      { label: 'Wear theirs', effect: { cash: 0.03, morale: -2 }, line: 'Signed the glove deal and missed the old pair.' },
      { label: 'Keep your own', effect: {}, line: 'Kept your own gloves.', neutral: true },
    ],
  },
  {
    id: 'advance', emoji: '💵', title: 'An advance', cooldown: 8,
    text: 'Your manager can get you some of the next purse today. It comes off the fight, and then some.',
    options: [
      { label: 'Take the advance', effect: { cash: 0.05, pursePct: -20 }, line: 'Took an advance against the next purse.' },
      { label: 'Wait for the purse', effect: {}, line: 'Waited for the purse.', neutral: true },
    ],
  },
  {
    id: 'tax-letter', emoji: '🧾', title: 'The tax letter', cooldown: 12,
    text: 'A brown envelope about last year. Nobody told you a purse was income.',
    when: st => st.earnings >= 0.4,
    options: [
      { label: 'Pay it', effect: { cash: -0.05 }, line: 'Paid the tax bill in full.', neutral: true },
      { label: 'Argue it down', effect: { cash: -0.02, morale: -3 }, line: 'Argued the tax bill down and lost sleep over it.' },
    ],
  },
  {
    id: 'step-aside', emoji: '🚪', title: 'Step aside money', cooldown: 9,
    text: 'A promoter wants his man to jump the queue, and he will pay you to stand still while it happens.',
    when: st => ranked(st) && st.fighter.rank > 1 && st.fighter.rank <= 8,
    options: [
      { label: 'Take the money', effect: { cash: 0.1, rank: 2 }, line: 'Took step aside money and slipped down the rankings.' },
      { label: 'Keep your place', effect: {}, line: 'Refused to step aside.', neutral: true },
    ],
  },
  {
    id: 'press-conference', emoji: '🎤', title: 'The press conference', cooldown: 5,
    text: 'The room is full and the cameras are waiting for somebody to say something.',
    options: [
      { label: 'Give them a show', effect: { fans: 3, karma: -3 }, line: 'Gave the press a show.' },
      { label: 'Say your piece and sit down', effect: {}, line: 'Kept it short at the press conference.', neutral: true },
      { label: 'Praise the other man', effect: { karma: 3 }, line: 'Had nothing but respect at the press conference.' },
    ],
  },
  {
    id: 'undercard-favour', emoji: '🤝', title: 'A favour for the gym', cooldown: 9,
    text: 'The gym owner wants a stablemate on your undercard. The promoter will only do it if it comes out of your end.',
    options: [
      { label: 'Give up some of the purse', effect: { pursePct: -8, karma: 4 }, line: 'Got a stablemate onto the undercard out of your own end.' },
      { label: 'Not your problem', effect: {}, line: 'Left the undercard to the promoter.', neutral: true },
    ],
  },
  {
    id: 'ticket-seller', emoji: '🎟️', title: 'Selling tickets', cooldown: 7,
    text: 'Early in a career you are paid partly in tickets you sell yourself. Your phone is full of people who said they would come.',
    when: st => st.fighter.rank > 10,
    options: [
      { label: 'Spend the week selling', effect: { cash: 0.02, sharp: -1 }, line: 'Sold tickets all week instead of training.' },
      { label: 'Let the promoter sell them', effect: {}, line: 'Left the tickets to the promoter.', neutral: true },
    ],
  },
  {
    id: 'belt-parade', emoji: '🎉', title: 'The parade', cooldown: 10,
    text: 'The town wants to put you on an open bus with the belt.',
    when: st => st.champion,
    options: [
      { label: 'Do the parade', effect: { fans: 6, sharp: -1 }, line: 'Rode the bus through town with the belt.' },
      { label: 'Back to the gym', effect: {}, line: 'Skipped the parade and went back to work.', neutral: true },
    ],
  },
];

/* The camp and the corner: what the next six weeks are going to be like. */
const CAMP_CARDS: LifeCardDef[] = [
  {
    id: 'trainer-row', emoji: '🗯️', title: 'A row with your trainer', cooldown: 7,
    text: 'He wants the camp run his way and you want it run yours. Somebody has to give.',
    options: [
      { label: 'Do it his way', effect: { sharp: 2, morale: -2 }, line: 'Ran the camp the way the trainer wanted.' },
      { label: 'Do it your way', effect: { sharp: -2, morale: 2 }, line: 'Ran the camp your own way.' },
      { label: 'Split the difference', effect: {}, line: 'Met the trainer halfway.', neutral: true },
    ],
  },
  {
    id: 'sparring-import', emoji: '✈️', title: 'A sparring partner in town', cooldown: 5,
    text: 'A good fighter with the same style as your next man is in town for a fortnight, and he charges by the round.',
    options: [
      { label: 'Pay for the rounds', effect: { cash: -0.03, sharp: 2 }, line: 'Paid for two weeks of proper sparring.' },
      { label: 'Use the gym regulars', effect: {}, line: 'Sparred with the regulars.', neutral: true },
    ],
  },
  {
    id: 'tape-study', emoji: '🎞️', title: 'Tape', cooldown: 5,
    text: 'There is film of your next opponent going back years. Somebody could cut it up for you.',
    options: [
      { label: 'Pay an analyst', effect: { cash: -0.02, sharp: 1 }, line: 'Paid for a proper breakdown of the tape.' },
      { label: 'Watch it yourself', effect: {}, line: 'Watched the tape on your own.', neutral: true },
    ],
  },
  {
    id: 'mountain-camp', emoji: '⛰️', title: 'Camp in the mountains', cooldown: 6,
    text: 'Thin air, no phone signal and nothing to do but run. It is not cheap and it is not fun.',
    options: [
      { label: 'Book it', effect: { cash: -0.06, sharp: 3, morale: -2 }, line: 'Took the camp up into the mountains.' },
      { label: 'Stay home', effect: {}, line: 'Kept the camp at home.', neutral: true },
    ],
  },
  {
    id: 'camp-cook', emoji: '🍲', title: 'The cook', cooldown: 6,
    text: 'You have been living on whatever is quick. A cook for the camp would sort that out.',
    options: [
      { label: 'Hire a cook', effect: { cash: -0.02, sharp: 1 }, line: 'Hired a cook for the camp.' },
      { label: 'Cook for yourself', effect: {}, line: 'Kept cooking for yourself.', neutral: true },
    ],
  },
  {
    id: 'bigger-gym', emoji: '🏢', title: 'A bigger gym', cooldown: 12,
    text: 'A gym across town has better kit and better bodies to work with. Your own gym has known you since you were a kid.',
    options: [
      { label: 'Train across town this camp', effect: { cash: -0.04, sharp: 2, morale: -2 }, line: 'Trained across town and felt like a visitor.' },
      { label: 'Stay loyal', effect: { morale: 2 }, line: 'Stayed at the old gym.' },
      { label: 'Think about it next time', effect: {}, line: 'Put the gym question off.', neutral: true },
    ],
  },
  {
    id: 'camera-crew', emoji: '🎥', title: 'A camera crew', cooldown: 8,
    text: 'A film crew wants to follow your camp for a behind the scenes piece. They get in the way of everything.',
    when: st => st.life.fanbase >= 12,
    options: [
      { label: 'Let them in', effect: { fans: 4, sharp: -1 }, line: 'Let a camera crew into camp.' },
      { label: 'Closed camp', effect: {}, line: 'Kept the camp closed.', neutral: true },
    ],
  },
  {
    id: 'wedding', emoji: '💒', title: 'A wedding in camp week', cooldown: 10,
    text: 'A family wedding lands right in the middle of the hard weeks.',
    options: [
      { label: 'Go, and enjoy it', effect: { sharp: -1, morale: 4 }, line: 'Went to the wedding and danced.' },
      { label: 'Send a gift and stay in camp', effect: { cash: -0.01 }, line: 'Sent a gift and stayed in camp.', neutral: true },
      { label: 'Skip it and say nothing', effect: { morale: -3, karma: -2 }, line: 'Missed the wedding without a word.' },
    ],
  },
];

/* The rest of it: money, people, and what a fighter does with a free week. */
const HOME_CARDS: LifeCardDef[] = [
  {
    id: 'the-car', emoji: '🚗', title: 'The car', cooldown: 14,
    text: 'You have wanted one since you were fourteen and there it is in the showroom.',
    when: st => st.life.bank >= 0.1,
    options: [
      { label: 'Buy it', effect: { cash: -0.08, morale: 5 }, line: 'Bought the car.' },
      { label: 'Keep the old one', effect: {}, line: 'Walked out of the showroom.', neutral: true },
    ],
  },
  {
    id: 'old-friends', emoji: '👥', title: 'Old friends', cooldown: 10,
    text: 'Friends from home want jobs in the camp. None of them can hold pads.',
    options: [
      { label: 'Put them on the payroll', effect: { cash: -0.03, morale: 4 }, line: 'Put old friends on the camp payroll.' },
      { label: 'Buy them dinner and leave it', effect: { cash: -0.01 }, line: 'Bought dinner and kept the camp small.', neutral: true },
      { label: 'Tell them no', effect: { karma: -2 }, line: 'Told old friends there was no job.' },
    ],
  },
  {
    id: 'amateur-club', emoji: '🏚️', title: 'The amateur club', cooldown: 12,
    text: 'The club where you learned to box needs a new ring and has no money for one.',
    options: [
      { label: 'Pay for the ring', effect: { cash: -0.05, fans: 3, karma: 4 }, line: 'Paid for a new ring at the old amateur club.' },
      { label: 'Send signed gloves for the raffle', effect: { fans: 1 }, line: 'Sent signed gloves to the amateur club.', neutral: true },
      { label: 'Not this year', effect: { karma: -1 }, line: 'Turned the amateur club down.' },
    ],
  },
  {
    id: 'night-out', emoji: '🌃', title: 'A night out', cooldown: 5,
    text: 'The fight is done and your phone will not stop. Everybody is already out.',
    options: [
      { label: 'Go out', effect: { morale: 3, karma: -2, fans: 1 }, line: 'Had the night out and was seen having it.' },
      { label: 'Stay in', effect: {}, line: 'Stayed in.', neutral: true },
    ],
  },
  {
    id: 'kids-session', emoji: '🧒', title: 'The kids at the gym', cooldown: 6,
    text: 'The junior class has asked whether you would take a session.',
    options: [
      { label: 'Take the session', effect: { karma: 3, fans: 1 }, line: 'Took the junior class for an afternoon.' },
      { label: 'Not this week', effect: {}, line: 'Passed on the junior class.', neutral: true },
    ],
  },
  {
    id: 'hospital-visit', emoji: '🏥', title: 'A hospital visit', cooldown: 9,
    text: 'The local ward has asked for a visit. Your manager wants to bring a photographer.',
    options: [
      { label: 'Go quietly', effect: { karma: 4 }, line: 'Visited the ward with nobody watching.' },
      { label: 'Go with the photographer', effect: { fans: 3, karma: -1 }, line: 'Visited the ward and made the papers.' },
      { label: 'Send a signed glove', effect: { fans: 1 }, line: 'Sent a signed glove to the ward.', neutral: true },
    ],
  },
  {
    id: 'house-for-mum', emoji: '🏡', title: 'A house for your mother', cooldown: 60,
    text: 'You said you would do it with the first real money. This is the first real money.',
    when: st => st.life.bank >= 0.3,
    options: [
      { label: 'Buy the house', effect: { cash: -0.25, morale: 8, karma: 3 }, line: 'Bought your mother a house.' },
      { label: 'Not yet', effect: {}, line: 'Put the house off.', neutral: true },
    ],
  },
  {
    id: 'signing', emoji: '✍️', title: 'A signing', cooldown: 6,
    text: 'A shop in town will pay you to sit at a table for two hours and sign things.',
    when: st => st.life.fanbase >= 10,
    options: [
      { label: 'Sit for it', effect: { cash: 0.02, fans: 1 }, line: 'Sat for a signing in town.' },
      { label: 'Skip it', effect: {}, line: 'Skipped the signing.', neutral: true },
    ],
  },
  {
    id: 'the-prospect', emoji: '🌱', title: 'A prospect asks for advice', cooldown: 8,
    text: 'A kid turning professional next month wants to know what you wish somebody had told you.',
    when: st => st.fightNo >= 8,
    options: [
      { label: 'Give him the afternoon', effect: { karma: 3 }, line: 'Spent an afternoon with a young prospect.' },
      { label: 'Too busy this week', effect: {}, line: 'Had no time for the prospect.', neutral: true },
    ],
  },
  {
    id: 'after-the-fight', emoji: '📲', title: 'Your phone after the fight', cooldown: 4,
    text: 'The clip is everywhere. You could say something while people are still looking.',
    options: [
      { label: 'Call out your rival', effect: { fans: 3, heat: 6, karma: -1 }, line: 'Called out your rival while the clip was hot.' },
      { label: 'Thank the people who came', effect: { fans: 1 }, line: 'Thanked the crowd and logged off.', neutral: true },
      { label: 'Say nothing at all', effect: { karma: 1 }, line: 'Stayed off the phone.' },
    ],
  },
];

export const LIFE_CARDS: LifeCardDef[] = [...BODY_CARDS, ...BUSINESS_CARDS, ...CAMP_CARDS, ...HOME_CARDS];

export const lifeCardById = (id: string): LifeCardDef | undefined => LIFE_CARDS.find(c => c.id === id);

/* ─────────────────────────── dealing and answering ─────────────────────────── */

/** Two things happen between any two fights. */
export const CARDS_PER_FIGHT = 2;

/** Cards whose gate is open and whose cooldown has run out. */
export function eligibleCards(st: Live): LifeCardDef[] {
  return LIFE_CARDS.filter(c =>
    (st.life.cooldowns[c.id] ?? 0) <= st.fightNo &&
    !st.life.pending.includes(c.id) &&
    (!c.when || c.when(st)));
}

/**
 * Deal the cards for this gap onto the save, as ids, in the order they will
 * be shown. One advance of the life stream per deal, so a reload after the
 * deal reads the same ids back rather than drawing again. `st` is a
 * cloneForLife copy: this mutates.
 */
export function dealLifeCards(st: Live): string[] {
  const { rng, done } = lifeStream(st);
  const pool = eligibleCards(st);
  const dealt: string[] = [];
  while (dealt.length < CARDS_PER_FIGHT && pool.length > 0) {
    const card = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    dealt.push(card.id);
    st.life.cooldowns[card.id] = st.fightNo + card.cooldown;
  }
  st.life.pending = [...st.life.pending, ...dealt];
  done();
  return dealt;
}

/** The card waiting to be answered, or null. */
export function pendingLifeCard(st: FightCareerState): LifeCardDef | null {
  const id = st.life?.pending?.[0];
  return (id && lifeCardById(id)) || null;
}

/**
 * Answer the card at the front of the queue. Returns the new state and the
 * feed line, or null when nothing is waiting or the option does not exist, so
 * a double tap changes nothing.
 */
export function answerLifeCard(st: FightCareerState, optionIdx: number): { state: Live; line: string } | null {
  const next = cloneForLife(st);
  const card = pendingLifeCard(next);
  const option = card?.options[optionIdx];
  if (!card || !option) return null;
  applyLifeEffect(next, option.effect);
  next.life.pending = next.life.pending.slice(1);
  next.life.decisions += 1;
  pushFeed(next.life, `${card.emoji} ${option.line}`);
  return { state: next, line: option.line };
}

/* ─────────────────────────── what the life does to a camp and a fight ─────────────────────────── */

const stepOf = (id: UpgradeId): number => UPGRADES.find(u => u.id === id)?.step ?? 0;

const AREA_ATTR: Record<keyof CampPlan, 'stamina' | 'power' | 'defence' | 'speed'> = {
  conditioning: 'stamina', power: 'power', defence: 'defence', speed: 'speed',
};
const AREA_UPGRADE: Record<keyof CampPlan, UpgradeId> = {
  conditioning: 'roadwork', power: 'strength', defence: 'padman', speed: 'padman',
};

/** What a camp week in one area is multiplied by: the trainer's specialty
 *  times the shop's coach. Exactly 1 with the all-rounder and an empty shop. */
export function campGrowthMul(st: Live, area: keyof CampPlan): number {
  const up = AREA_UPGRADE[area];
  return (trainerDef(st.life.trainer.kind).grow[area] ?? 1) * (1 + upgradeLevel(st.life, up) * stepOf(up));
}

/**
 * The specialty, paid in whole points.
 *
 * Attributes are whole numbers and runCamp rounds a camp's gain onto them, so
 * a week "worth 12% more" would round away to nothing on most camps and the
 * shop would be selling a label. The first draft of this round did exactly
 * that, by multiplying inside the camp, and levels one and two of every coach
 * changed no attribute at all. So the extra is worked out from the same gain
 * runCamp used (campGain), banked per area as a fraction, and paid as a point
 * each time it reaches one. A slower area runs the other way: the debt takes
 * back a point this camp just gave and never one from before it, so a camp
 * still cannot lower an attribute, and the ceiling still holds because a
 * banked point is only paid below it.
 *
 * `before` is the state that went into the camp, `after` the one runCamp
 * returned. Mutates `after`.
 */
export function settleCampCarry(before: Live, after: Live, plan: CampPlan): void {
  const pot = Math.min(99, before.fighter.potential);
  for (const area of Object.keys(AREA_ATTR) as (keyof CampPlan)[]) {
    const mul = campGrowthMul(before, area);
    if (mul === 1) continue;
    const attr = AREA_ATTR[area];
    const was = before.fighter.attrs[attr];
    let carry = (after.life.carry[area] ?? 0) + campGain(was, pot, plan[area]) * (mul - 1);
    while (carry >= 1 && after.fighter.attrs[attr] < pot) { after.fighter.attrs[attr] += 1; carry -= 1; }
    while (carry <= -1 && after.fighter.attrs[attr] > was) { after.fighter.attrs[attr] -= 1; carry += 1; }
    after.life.carry[area] = clamp(Math.round(carry * 1000) / 1000, -1, 1);
  }
}

/**
 * Tonight's sharpness in whole points: what the cards banked, the trainer,
 * the sparring partners and the mood, capped. Zero with the all-rounder, no
 * sparring partners, nothing banked and morale within ten of 50.
 */
export function lifeSharpness(st: Live): number {
  const mood = Math.trunc((st.life.morale - 50) / MORALE_PER_SHARP);
  const total = st.life.sharp + trainerDef(st.life.trainer.kind).sharp +
    upgradeLevel(st.life, 'sparring') * stepOf('sparring') + mood;
  return clamp(Math.round(total), -SHARP_CAP, SHARP_CAP);
}

/** The cut man and the sharpness. With neither, this is empty and the bout
 *  is the bout takeFight always ran. */
export function lifeFightMods(st: Live): FightMods {
  const mods: FightMods = {};
  const lvl = upgradeLevel(st.life, 'cutman');
  if (lvl > 0) mods.damageMul = 1 - lvl * stepOf('cutman');
  const sharp = lifeSharpness(st);
  if (sharp) mods.sharp = sharp;
  return mods;
}

/** What every purse is multiplied by before it reaches the table. */
export function lifePurseMul(st: Live): number {
  return managerDef(st.life.manager.kind).purseMul * (1 + st.life.fanbase * FAN_PURSE_STEP) *
    (st.life.promoterFights > 0 ? PROMOTER_PURSE_MUL : 1);
}

/** What a purse leaves in the bank once the trainer and the manager are paid. */
export function lifeTakeHome(st: Live, purse: number): number {
  return purseAfterCuts(purse, [trainerDef(st.life.trainer.kind).cut, managerDef(st.life.manager.kind).cut]);
}

export { pushFeed as pushLifeFeed };
