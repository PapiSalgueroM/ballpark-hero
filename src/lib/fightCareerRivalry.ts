/**
 * Round 916: the Fight Career rival, a binding on careerRivalryEvents.ts and
 * careerRivalryChoices.ts.
 *
 * The roll, the "never the same beat twice running" rule, the forced beat on
 * retirement, the pending slot and the choice card are the shared ones. What
 * is boxing's own is the rival himself (a generated fighter in your weight
 * class with a record, a ranking and maybe a belt, who fights on while you
 * do), the table of beats, and the table of choices.
 *
 * LEGAL SHAPE. The rival is always generated, named off the two banks every
 * boxer in this game comes from. Every line narrates him and none quotes him.
 *
 * A BEAT IS NOT A DECISION, so a beat can only move things that cannot reach
 * a fight (fans, the feud). A choice can do more, and every choice card
 * carries one option that cannot, the same rule the deck follows.
 */

import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent,
  type RivalryEventDef, type RivalryEvent,
} from '@/lib/careerRivalryEvents';
import {
  rollRivalryChoice, resolveRivalryChoice,
  type RivalryChoiceDef, type RivalryChoiceOption,
} from '@/lib/careerRivalryChoices';
import { keyedRng } from '@/lib/keyedRng';
import type { FightCareerState } from '@/lib/fightCareer';
import {
  applyLifeEffect, describeLifeEffect, cloneForLife, pushLifeFeed, isBoutNeutral,
  type FightLife, type FightRival, type LifeEffect,
} from '@/lib/fightCareerLife';

type Live = FightCareerState & { life: FightLife };

const round2 = (v: number): number => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/* ─────────────────────────── the rival fights on ─────────────────────────── */

/** The level a man at this ranking is being matched at. */
const levelAt = (rank: number): number => (rank >= 99 ? 50 : rank === 0 ? 88 : 86 - Math.min(rank, 20) * 1.2);

/**
 * One fight window for the rival: he ages with you, grows toward his ceiling
 * until 29 and fades after 32, and most windows he fights somebody at his own
 * level. Mutates `life.rival`. Returns a feed line for the nights that matter.
 */
export function rivalFightNight(st: FightCareerState, life: FightLife): string | null {
  const r = life.rival;
  if (!r || r.retired) return null;
  const rng = keyedRng(`${st.seed}|${st.fightNo}|fight-rival`);
  r.age = round2(r.age + 0.34);
  const drift = r.age < 29 ? Math.min(1.2, (r.potential - r.rating) * 0.12) : r.age < 32 ? 0 : -0.8;
  r.rating = clamp(Math.round((r.rating + drift) * 10) / 10, 30, 97);
  if (r.age >= 36.5 || (r.age >= 32 && r.rating < 55)) {
    r.retired = true;
    r.champion = false;
    return `${r.name} has retired at ${r.wins} and ${r.losses}.`;
  }
  if (rng() < 0.2) return null;
  const won = rng() < clamp(0.55 + (r.rating - levelAt(r.champion ? 0 : r.rank)) / 40, 0.2, 0.9);
  const cur = r.rank >= 99 ? 20 : r.rank;
  if (won) {
    r.wins += 1;
    if (rng() < 0.4) r.kos += 1;
    if (r.champion) return null;
    if (r.rank === 1) {
      r.champion = true;
      return `${r.name} won a world title.`;
    }
    r.rank = Math.max(1, cur - 2);
    return null;
  }
  r.losses += 1;
  if (r.champion) {
    r.champion = false;
    r.rank = 2;
    return `${r.name} lost his title.`;
  }
  r.rank = cur + 3 > 20 ? 99 : cur + 3;
  return null;
}

/** The grudge fight happened: settle the record between you. Mutates. */
export function settleGrudge(life: FightLife, youWon: boolean, drawn: boolean): void {
  const r = life.rival;
  if (!r || drawn) return;
  if (youWon) { r.h2hWins += 1; r.losses += 1; } else { r.h2hLosses += 1; r.wins += 1; }
}

export const rivalRankLabel = (r: FightRival): string =>
  (r.retired ? 'Retired' : r.champion ? 'CHAMPION' : r.rank >= 99 ? 'Unranked' : `#${r.rank}`);

/* ─────────────────────────── the beats ─────────────────────────── */

export const RIVAL_RETIRED_EVENT_ID = 99;

type Beat = RivalryEventDef<Live, FightRival> & { effect: LifeEffect };

const beat = (
  id: number, emoji: string, title: string, effect: LifeEffect,
  when: (p: Live, r: FightRival) => boolean, description: (p: Live, r: FightRival) => string,
): Beat => ({
  id, emoji, title, description, when, effect,
  consequence: describeLifeEffect(effect),
  apply: s => applyLifeEffect(s, effect),
});

const youRank = (p: Live): number => (p.champion ? 0 : p.fighter.rank);
const hisRank = (r: FightRival): number => (r.champion ? 0 : r.rank);

export const FIGHT_RIVALRY_EVENTS: Beat[] = [
  beat(1, '📈', 'He keeps winning', { heat: 4 }, (_p, r) => r.wins >= 2,
    (_p, r) => `${r.name} won again while you were in camp, and the papers ran the two records side by side.`),
  beat(2, '🏆', 'He got there first', { heat: 8, fans: -1 }, (p, r) => r.champion && !p.champion,
    (_p, r) => `${r.name} has a world title round his waist before you do.`),
  beat(3, '📉', 'He was beaten', { heat: -3, fans: 1 }, (_p, r) => r.losses >= 1,
    (_p, r) => `${r.name} lost, and people asked what that says about the pair of you.`),
  beat(4, '🎪', 'The same bill', { heat: 6, fans: 2 }, p => p.fightNo >= 3,
    (_p, r) => `You and ${r.name} boxed on the same bill, and the crowd took sides.`),
  beat(5, '🗞️', 'He has been talking', { heat: 7 }, () => true,
    (_p, r) => `${r.name} let a reporter know he does not rate anybody you have beaten.`),
  beat(6, '📊', 'The comparison piece', { fans: 2, heat: 3 }, (p, r) => youRank(p) < 99 && hisRank(r) < 99,
    (_p, r) => `A long piece set your record beside ${r.name}'s, fight by fight.`),
  beat(7, '💰', 'A price on it', { fans: 3 }, p => p.life.rivalryIntensity >= 30,
    (_p, r) => `Promoters are openly pricing a fight between you and ${r.name}.`),
  beat(8, '🔄', 'He changed corners', { heat: 4 }, p => p.fightNo >= 5,
    (_p, r) => `${r.name} has a new trainer, one who has been studying your fights.`),
  beat(9, '⬆️', 'You are ranked above him', { fans: 1, heat: 2 }, (p, r) => youRank(p) < hisRank(r),
    (_p, r) => `The new rankings have you above ${r.name}, and his people say they are wrong.`),
  beat(10, '⬇️', 'He is ranked above you', { heat: 5 }, (p, r) => hisRank(r) < youRank(p),
    (_p, r) => `The new rankings have ${r.name} above you.`),
  beat(RIVAL_RETIRED_EVENT_ID, '👋', 'He hangs them up', { fans: 2 }, (_p, r) => r.retired,
    (_p, r) => `${r.name} has retired at ${r.wins} and ${r.losses}. Between the two of you it finished ${r.h2hWins} and ${r.h2hLosses} your way.`),
];

/* ─────────────────────────── the choices ─────────────────────────── */

type Choice = RivalryChoiceOption<Live, FightRival> & { effect: LifeEffect; neutral?: true };

/** One option written from an effect: the promise and the mutation are the
 *  same object, so the card cannot say one thing and do another. */
const option = (
  label: string, emoji: string, effect: LifeEffect, line: (rival: string) => string, neutral?: true,
): Choice => ({
  label, emoji, effect,
  consequence: describeLifeEffect(effect),
  ...(neutral ? { neutral } : {}),
  apply: (s, r) => {
    applyLifeEffect(s, effect);
    return line(r?.name ?? 'your rival');
  },
});

/** A table where the grudge fight can go: not when every offer is your own
 *  title shot, which is a fight you earned against a champion. */
const openTable = (p: Live): boolean => p.offers.length > 0 && (p.champion || !p.offers[0].title);

export interface FightChoiceDef extends Omit<RivalryChoiceDef<Live, FightRival>, 'choices'> {
  choices: Choice[];
}

export const FIGHT_RIVALRY_CHOICES: FightChoiceDef[] = [
  {
    id: 'fr-call-out', emoji: '📣', title: 'He calls you out',
    description: (_p, r) => `${r.name} used his post fight interview to ask for you by name.`,
    when: p => p.fightNo >= 3 && openTable(p),
    choices: [
      option('Take the fight', '🥊', { grudge: true, heat: 10 }, r => `Agreed to fight ${r}.`),
      option('Tell him to get in line', '🙄', { heat: 4, karma: -1 }, r => `Told ${r} to get in line.`),
      option('Say nothing', '🤐', {}, r => `Let ${r} shout.`, true),
    ],
  },
  {
    id: 'fr-face-off', emoji: '😤', title: 'Face to face',
    description: (_p, r) => `You and ${r.name} are on the same card, and the promoter has put you nose to nose for the cameras.`,
    when: () => true,
    choices: [
      option('Shove him', '💢', { fans: 3, karma: -3, heat: 8 }, r => `Shoved ${r} in front of the cameras.`),
      option('Stare and say nothing', '👁️', { heat: 3 }, r => `Stared ${r} down.`, true),
      option('Shake his hand', '🤝', { karma: 2, heat: -5 }, r => `Shook hands with ${r}.`),
    ],
  },
  {
    id: 'fr-sparring-ask', emoji: '🥋', title: 'His camp asks a favour',
    description: (_p, r) => `${r.name}'s camp is short of bodies and has asked to borrow your sparring partner for a week.`,
    when: () => true,
    choices: [
      option('Send him over', '👍', { karma: 3, heat: -6 }, r => `Lent ${r}'s camp a sparring partner.`),
      option('Refuse', '🚫', { heat: 4 }, r => `Refused to help ${r}'s camp.`),
      option('Leave it to the trainers', '🤷', {}, () => 'Left the sparring question to the trainers.', true),
    ],
  },
  {
    id: 'fr-joint-interview', emoji: '🎙️', title: 'A joint interview',
    description: (_p, r) => `A radio show wants you and ${r.name} on together.`,
    when: p => p.life.fanbase >= 10,
    choices: [
      option('Do it and be gracious', '😊', { fans: 2, karma: 2, heat: -3 }, r => `Did the show with ${r} and kept it friendly.`),
      option('Do it and needle him', '😏', { fans: 4, karma: -2, heat: 7 }, r => `Did the show with ${r} and got under his skin.`),
      option('Decline', '✋', {}, () => 'Turned the joint interview down.', true),
    ],
  },
  {
    id: 'fr-ducking', emoji: '🦆', title: 'The word is you are ducking him',
    description: (_p, r) => `It is going round that you want nothing to do with ${r.name}.`,
    when: p => p.life.rivalryIntensity >= 15 && p.fightNo >= 5 && openTable(p),
    choices: [
      option('Take the fight now', '🥊', { grudge: true, heat: 8 }, r => `Took the fight with ${r} to end the talk.`),
      option('Answer it in public', '📢', { fans: 2, heat: 6 }, r => `Answered the ducking talk about ${r} in public.`),
      option('Let your record answer', '📜', {}, () => 'Let the record do the talking.', true),
    ],
  },
  {
    id: 'fr-benefit-night', emoji: '🎗️', title: 'His benefit night',
    description: (_p, r) => `${r.name} is running a benefit night for his old gym and your name is on the list of people asked.`,
    when: () => true,
    choices: [
      option('Put money in', '💝', { cash: -0.03, karma: 4, heat: -4 }, r => `Gave to ${r}'s benefit night.`),
      option('Send a signed glove', '🧤', { fans: 1 }, r => `Sent a signed glove to ${r}'s benefit night.`, true),
      option('Ignore it', '🙈', { karma: -2, heat: 2 }, r => `Ignored ${r}'s benefit night.`),
    ],
  },
];

/* ─────────────────────────── the tick, and the answers ─────────────────────────── */

/** How often a gap with no beat brings a choice instead. */
export const RIVALRY_CHOICE_CHANCE = 0.5;

/**
 * One fight's rival roll: the forced retirement beat, else the shared beat
 * roll, else the shared choice roll, and never two cards in one gap. Draws
 * from its own keyed stream. Mutates `st.life`; `st` is a cloneForLife copy.
 */
export function fightRivalryTick(st: Live): void {
  const life = st.life;
  const r = life.rival;
  if (!r || life.pendingRivalryEvent || life.pendingRivalryChoice) return;
  const forced = forcedRetirementEvent(st, r, life.lastRivalryEventId, FIGHT_RIVALRY_EVENTS, RIVAL_RETIRED_EVENT_ID);
  if (forced) { life.pendingRivalryEvent = forced; return; }
  const rng = keyedRng(`${st.seed}|${st.fightNo}|${life.rivalryChoicesSeen.length}|fight-rivalry`);
  const event = rollRivalryEvent(st, r, life.lastRivalryEventId, FIGHT_RIVALRY_EVENTS, rng);
  if (event) { life.pendingRivalryEvent = event; return; }
  const card = rollRivalryChoice(st, r, life.rivalryChoicesSeen, FIGHT_RIVALRY_CHOICES, RIVALRY_CHOICE_CHANCE, rng);
  if (card) {
    life.pendingRivalryChoice = card;
    life.rivalryChoicesSeen = [...life.rivalryChoicesSeen, card.id];
  }
}

/** Read the pending beat and run it. Null when nothing is pending. */
export function dismissFightRivalryEvent(st: FightCareerState): Live | null {
  const next = cloneForLife(st);
  const event: RivalryEvent | null = next.life.pendingRivalryEvent;
  if (!event || !next.life.rival) return null;
  applyRivalryEvent(next, next.life.rival, event, FIGHT_RIVALRY_EVENTS, () => 0.5, line => pushLifeFeed(next.life, line));
  next.life.pendingRivalryEvent = null;
  next.life.lastRivalryEventId = event.id;
  return next;
}

/** Answer the pending choice. Null when nothing is pending or the option
 *  does not exist, so a double tap changes nothing. */
export function answerFightRivalryChoice(st: FightCareerState, choiceIdx: number): { state: Live; line: string } | null {
  const next = cloneForLife(st);
  const card = next.life.pendingRivalryChoice;
  if (!card) return null;
  const line = resolveRivalryChoice(next, next.life.rival, card.id, choiceIdx, FIGHT_RIVALRY_CHOICES, () => 0.5);
  if (line === null) return null;
  next.life.pendingRivalryChoice = null;
  next.life.decisions += 1;
  pushLifeFeed(next.life, `${card.emoji} ${line}`);
  return { state: next, line };
}

/** The option on a pending choice that cannot reach a fight. */
export function neutralRivalryChoice(cardId: string): number {
  const def = FIGHT_RIVALRY_CHOICES.find(d => d.id === cardId);
  return def ? def.choices.findIndex(c => c.neutral && isBoutNeutral(c.effect)) : -1;
}
