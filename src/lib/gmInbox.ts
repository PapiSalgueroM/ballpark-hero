/* ─── Round 940: the GM inbox, one deck of events for every manager seat ─────

   Club Manager has an inbox full of decisions. The four GM sims had a six
   line feed, and the college, gym and Australian football seats had nothing.
   This file is ONE inbox engine for all of them, and every seat's messages
   are data under src/data/gmInbox/.

   It is careerInbox.ts's contract bound to a desk instead of a player:

     mood        is owner trust (the job security meter)
     popularity  is fan mood
     cash        is the operations budget, in the seat's own money
     morale      is the room

   so a GmEventDef IS an InboxMessageDef and a GmChoiceDef IS an
   InboxChoiceDef, the answer goes through careerInbox's answerInboxMessage,
   and the panel is us-career/InboxPanel.tsx by import. On top of that a
   choice may carry the three things a desk has that a player's phone does
   not: one man out for some weeks, one man's rating nudged, and a recruit's
   interest.

   THE RULES THIS DECK LIVES BY.

   1. An event arrives on its calendar beat, and only when every condition it
      declares holds over the plain facts the seat hands in (a number, a yes
      or no, a word). Conditions are data, not functions, so a harness can
      read them, flip one, and prove the deck obeys.
   2. A one shot event comes once a save (phoneUsedIds, the field
      careerInbox already uses for that). Any other event waits out its
      cooldown, counted on the seat's own week clock (gmInboxLast).
   3. At most `perWeek` new events a week, and never more than
      GM_INBOX_OPEN unanswered at once: Club Manager's rule.
   4. The list is capped at GM_INBOX_MAX, like Club Manager's. The oldest
      ANSWERED message drops first, so an open decision is never lost.
   5. Every option moves exactly what its card says, up to the end of the
      meter: trust, the room and fan mood live on 0 to 100, so at trust 97
      a card that says +6 lands on 100. The card's effect line is written by
      choiceEffects from the same fields the answer applies, so the words
      and the effect cannot drift apart.
   6. Nothing here calls Math.random. Same seed, same deck.

   A seat delivers through gmInboxWeek, never through careerInbox's own
   receive or deliver: those know nothing of conditions or cooldowns and
   would deal the whole pack. The seat satisfies InboxSport so the answer
   flow and the panel can be shared, not so the player's phone tick can be.

   LEGAL SHAPE. Every voice in every pack is a role (ownership, your
   capologist, his camp, the athletic director) and every person an event is
   about is a role too (your franchise quarterback, a fighter on your card).
   Nothing is quoted. scripts/simGmInbox.mjs scans every pack for quote
   marks, first person speech and any real name off the rosters. */

import { answerInboxMessage } from './careerInbox';
import type { InboxBeat, InboxChoiceDef, InboxHost, InboxMessage, InboxMessageDef, InboxSport } from './careerInbox';

/** Club Manager's caps: a list of eight, three left open at most. */
export const GM_INBOX_MAX = 8;
export const GM_INBOX_OPEN = 3;

/* ─── the pack, as data ──────────────────────────────────────────────────── */

export type GmFactValue = number | boolean | string;
/** The plain facts a seat hands in on a week: cap space, a win percentage,
 *  whether a star is in the last year of his deal. */
export type GmFacts = Record<string, GmFactValue>;

export type GmCondOp = '<' | '<=' | '>' | '>=' | '==' | '!=';
/** One condition over one fact. All of an event's conditions must hold. */
export interface GmCond { fact: string; op: GmCondOp; value: GmFactValue }

/** What a pack says about one fact, so a harness can draw honest values. */
export type GmFactSpec =
  | { kind: 'num'; min: number; max: number; per: 'season' | 'week' }
  | { kind: 'bool'; p: number; per: 'season' | 'week' };

/** One answer. karma is owner trust, popularity is fans, cash is budget. */
export interface GmChoiceDef extends InboxChoiceDef {
  /** One man, named by role, misses this many weeks. */
  out?: { who: string; weeks: number };
  /** One man's rating moves by this much. */
  rating?: { who: string; delta: number };
  /** A recruit's interest in your program moves by this much. */
  recruit?: number;
}

/** One event in a pack. The phase and age gates of a player's phone mean
 *  nothing at a desk, so a pack leaves them out and gmPool fills them in. */
export interface GmEventDef extends Omit<InboxMessageDef, 'phase' | 'choices' | 'beat'> {
  beat: string;
  choices: GmChoiceDef[];
  /** Every one must hold. Absent means the beat alone is enough. */
  when?: GmCond[];
  /** Once a save. */
  oneShot?: boolean;
  /** Weeks before a repeatable event may come again. Defaults to the pack's. */
  cooldown?: number;
  /** Chance it arrives on an eligible week. Defaults to the pack's. */
  chance?: number;
}

/** Words for the meters, so the card reads in the seat's own language. */
export interface GmMeters { trust: string; fans: string; money: string; morale: string; recruit?: string }

export interface GmInboxPack {
  seat: string;
  label: string;
  /** The seat's year, in the order it runs. */
  calendar: InboxBeat[];
  /** How many weekly ticks each beat spans in a typical season. */
  span: Record<string, number>;
  facts: Record<string, GmFactSpec>;
  /** Every `who` an option may name, with the role words the card prints. */
  targets: Record<string, string>;
  meters: GmMeters;
  /** Budget money: '$' and 'M' print -1.5 as -$1.5M. */
  money: { prefix: string; suffix: string };
  perWeek: number;
  cooldown: number;
  chance: number;
  events: GmEventDef[];
}

/* ─── what a desk save carries, and what a seat hands in ─────────────────── */

/** careerInbox's two fields (morale and the inbox) plus the cooldown book:
 *  event id to the week clock it last arrived on. All optional on a save. */
export interface GmInboxHost extends InboxHost {
  gmInboxLast?: Record<string, number>;
}

/** careerInbox's InboxSport bound to a desk, plus the three desk effects. */
export interface GmInboxSeat<S extends GmInboxHost> extends InboxSport<S> {
  pack: GmInboxPack;
  setOut: (s: S, who: string, weeks: number) => void;
  addRating: (s: S, who: string, delta: number) => void;
  addRecruit: (s: S, delta: number) => void;
}

export interface GmInboxBinding<S extends GmInboxHost> {
  /** Owner trust, 0 to 100. */
  moodOf: (s: S) => number;
  setMood: (s: S, v: number) => void;
  /** Fan mood, clamped inside the closure. */
  addPopularity: (s: S, delta: number) => void;
  /** The operations budget, in the pack's money. */
  addCash: (s: S, amount: number) => void;
  yearOf: (s: S) => number;
  setOut?: (s: S, who: string, weeks: number) => void;
  addRating?: (s: S, who: string, delta: number) => void;
  addRecruit?: (s: S, delta: number) => void;
}

/** The pack as careerInbox's pool: every event with the phase gate open. */
export function gmPool(pack: GmInboxPack): InboxMessageDef[] {
  return pack.events.map(e => ({ ...e, phase: 'any' as const }));
}

/** Which desk effects a pack's options use. */
export function gmEffectsUsed(pack: GmInboxPack): { out: boolean; rating: boolean; recruit: boolean } {
  const all = pack.events.flatMap(e => e.choices);
  return {
    out: all.some(c => c.out !== undefined),
    rating: all.some(c => c.rating !== undefined),
    recruit: all.some(c => c.recruit !== undefined),
  };
}

/**
 * Bind a pack to a desk. Throws when the pack has an option that moves
 * something the seat cannot move: a card that promised an effect nothing
 * applies would break rule 5, so it fails here, at bind time, not silently.
 */
export function bindGmInbox<S extends GmInboxHost>(pack: GmInboxPack, b: GmInboxBinding<S>): GmInboxSeat<S> {
  const used = gmEffectsUsed(pack);
  const missing = (['out', 'rating', 'recruit'] as const).filter(k =>
    used[k] && !(k === 'out' ? b.setOut : k === 'rating' ? b.addRating : b.addRecruit));
  if (missing.length > 0) throw new Error(`gmInbox: the ${pack.seat} pack moves ${missing.join(', ')} and the seat cannot`);
  const none = () => undefined;
  return {
    pack,
    pool: gmPool(pack),
    calendar: pack.calendar,
    moodOf: b.moodOf,
    setMood: b.setMood,
    addPopularity: b.addPopularity,
    addCash: b.addCash,
    yearOf: b.yearOf,
    ageOf: () => 0,
    maxInbox: GM_INBOX_MAX,
    wantPerSeason: pack.perWeek,
    setOut: b.setOut ?? none,
    addRating: b.addRating ?? none,
    addRecruit: b.addRecruit ?? none,
  };
}

/* ─── rule 1: conditions over plain facts ────────────────────────────────── */

/** A fact the seat did not hand in never satisfies anything: fail closed. */
export function gmCondHolds(c: GmCond, facts: GmFacts): boolean {
  if (!(c.fact in facts)) return false;
  const v = facts[c.fact];
  switch (c.op) {
    case '==': return v === c.value;
    case '!=': return v !== c.value;
    default: {
      if (typeof v !== 'number' || typeof c.value !== 'number') return false;
      if (c.op === '<') return v < c.value;
      if (c.op === '<=') return v <= c.value;
      if (c.op === '>') return v > c.value;
      return v >= c.value;
    }
  }
}

/** The events that may arrive this week, in pack order (rules 1 and 2). */
export function gmEligible(
  pack: GmInboxPack, beat: string, facts: GmFacts, usedIds: readonly string[],
  last: Readonly<Record<string, number>>, clock: number,
): GmEventDef[] {
  const used = new Set(usedIds);
  return pack.events.filter(e => {
    if (e.beat !== beat) return false;
    if (!(e.when ?? []).every(c => gmCondHolds(c, facts))) return false;
    if (e.oneShot) return !used.has(e.id);
    const at = last[e.id];
    return at === undefined || clock - at >= (e.cooldown ?? pack.cooldown);
  });
}

/* ─── the week ───────────────────────────────────────────────────────────── */

/**
 * One week of the deck. `beat` is where the seat's year stands, `facts` the
 * plain facts of the moment, `clock` the save's own week counter (it only
 * ever goes up). Every eligible event rolls its chance in pack order, then up
 * to `perWeek` of those that came up are drawn at random, never past
 * GM_INBOX_OPEN unanswered (rule 3). The draws all come from `rng`, so the
 * same seed deals the same deck. Returns what arrived.
 */
export function gmInboxWeek<S extends GmInboxHost>(
  s: S, seat: GmInboxSeat<S>, beat: string, facts: GmFacts, clock: number, rng: () => number,
): InboxMessage[] {
  const pack = seat.pack;
  const inbox = [...(s.phoneInbox ?? [])];
  const used = [...(s.phoneUsedIds ?? [])];
  const last = { ...(s.gmInboxLast ?? {}) };
  /* The clock only ever rises. A seat that hands in one that fell (a week of
     the season instead of a running count) leaves book entries in the
     future, which would keep their events away for good: read them as
     arriving now, so each waits one cooldown and comes back. */
  for (const [id, at] of Object.entries(last)) if (at > clock) last[id] = clock;
  const open = inbox.filter(m => m.answered === undefined).length;
  const want = Math.max(0, Math.min(pack.perWeek, GM_INBOX_OPEN - open));
  const came = gmEligible(pack, beat, facts, used, last, clock).filter(e => rng() < (e.chance ?? pack.chance));
  const year = seat.yearOf(s);
  const fresh: InboxMessage[] = [];
  while (fresh.length < want && came.length > 0) {
    const e = came.splice(Math.floor(rng() * came.length), 1)[0];
    /* A fallen clock could repeat a week, and two messages with one id would
       leave the second unanswerable, so a repeat gets a suffix. */
    let id = `${e.id}-${year}-w${clock}`;
    for (let n = 2; inbox.some(m => m.id === id); n++) id = `${e.id}-${year}-w${clock}-${n}`;
    const msg: InboxMessage = {
      id, defId: e.id, from: e.from, emoji: e.emoji, text: e.text,
      year, choices: e.choices, beat: e.beat,
    };
    inbox.push(msg);
    fresh.push(msg);
    if (e.oneShot) used.push(e.id);
    last[e.id] = clock;
  }
  /* Rule 4: oldest answered drops first. Rule 3 keeps the open ones under
     the cap, so this always lands at GM_INBOX_MAX or below. */
  while (inbox.length > GM_INBOX_MAX) {
    const idx = inbox.findIndex(m => m.answered !== undefined);
    if (idx === -1) break;
    inbox.splice(idx, 1);
  }
  s.phoneInbox = inbox;
  s.phoneUsedIds = used;
  s.gmInboxLast = last;
  return fresh;
}

/** The week by week beats of a typical season, from the pack's spans. */
export function gmSeasonWeeks(pack: GmInboxPack): string[] {
  return pack.calendar.flatMap(b => Array.from({ length: Math.max(0, pack.span[b.id] ?? 1) }, () => b.id));
}

/* ─── rule 5: the card's words come from the effects ─────────────────────── */

const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);

/** Every effect an option moves, in the seat's own words. Zero is left out. */
export function choiceEffects(c: GmChoiceDef, pack: GmInboxPack): string[] {
  const m = pack.meters;
  const out: string[] = [];
  if (c.karma) out.push(`${m.trust} ${signed(c.karma)}`);
  if (c.popularity) out.push(`${m.fans} ${signed(c.popularity)}`);
  if (c.cash) out.push(`${m.money} ${c.cash > 0 ? '+' : '-'}${pack.money.prefix}${Math.abs(c.cash)}${pack.money.suffix}`);
  if (c.morale) out.push(`${m.morale} ${signed(c.morale)}`);
  if (c.out && c.out.weeks > 0) out.push(`${pack.targets[c.out.who] ?? c.out.who} out ${c.out.weeks} week${c.out.weeks === 1 ? '' : 's'}`);
  if (c.rating && c.rating.delta) out.push(`${pack.targets[c.rating.who] ?? c.rating.who} rating ${signed(c.rating.delta)}`);
  if (c.recruit) out.push(`${m.recruit ?? 'Recruit interest'} ${signed(c.recruit)}`);
  return out;
}

/** The option's words with its effects after them, as the button reads. */
export function gmChoiceLabel(c: GmChoiceDef, pack: GmInboxPack): string {
  const fx = choiceEffects(c, pack);
  return fx.length ? `${c.label} · ${fx.join(', ')}` : c.label;
}

/* ─── the answer ─────────────────────────────────────────────────────────── */

/**
 * Answer one message: careerInbox's answer flow moves trust, room, fans and
 * budget, then the desk effects follow. Null when the message is not there,
 * is already answered, or the option does not exist, and then nothing moves.
 */
export function answerGmInbox<S extends GmInboxHost>(
  s: S, msgId: string, choiceIdx: number, seat: GmInboxSeat<S>,
): string | null {
  const msg = (s.phoneInbox ?? []).find(m => m.id === msgId);
  if (!msg || msg.answered !== undefined) return null;
  const c = msg.choices[choiceIdx] as GmChoiceDef | undefined;
  if (!c) return null;
  if (answerInboxMessage(s, msgId, choiceIdx, seat) === null) return null;
  if (c.out && c.out.weeks > 0) seat.setOut(s, c.out.who, c.out.weeks);
  if (c.rating && c.rating.delta) seat.addRating(s, c.rating.who, c.rating.delta);
  if (c.recruit) seat.addRecruit(s, c.recruit);
  const fx = choiceEffects(c, seat.pack);
  return `📨 ${msg.from}: ${c.label}.${fx.length ? ` ${fx.join(', ')}.` : ''}`;
}

/** Open decisions sitting on the desk. */
export function gmInboxOpen(s: GmInboxHost): number {
  return (s.phoneInbox ?? []).filter(m => m.answered === undefined).length;
}

/* ─── old saves and broken ones ──────────────────────────────────────────── */

const isMsg = (m: unknown): m is InboxMessage => {
  const o = m as InboxMessage;
  return !!o && typeof o === 'object' && typeof o.id === 'string' && typeof o.defId === 'string'
    && typeof o.from === 'string' && typeof o.text === 'string' && typeof o.year === 'number'
    && Array.isArray(o.choices) && o.choices.length > 0
    && o.choices.every(c => !!c && typeof c.label === 'string' && typeof c.karma === 'number' && Number.isFinite(c.karma))
    && (o.answered === undefined || (Number.isInteger(o.answered) && o.answered >= 0 && o.answered < o.choices.length));
};

/**
 * A save from before this round has none of the three fields and is left
 * exactly as it is. A broken field resets that field alone: a bad cooldown
 * book never costs the inbox, a bad inbox never costs the one shot list.
 */
export function repairGmInbox<S extends GmInboxHost>(s: S): S {
  if (s.phoneInbox !== undefined && !(Array.isArray(s.phoneInbox) && s.phoneInbox.every(isMsg))) s.phoneInbox = [];
  if (s.phoneUsedIds !== undefined && !(Array.isArray(s.phoneUsedIds) && s.phoneUsedIds.every(x => typeof x === 'string'))) s.phoneUsedIds = [];
  const last = s.gmInboxLast as unknown;
  if (last !== undefined && !(last && typeof last === 'object' && !Array.isArray(last)
    && Object.values(last as Record<string, unknown>).every(v => typeof v === 'number' && Number.isFinite(v)))) s.gmInboxLast = {};
  return s;
}
