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

   Round 1324 adds what a deck of hundreds of cards needs, each an optional
   field, so a pack without them deals exactly what it dealt before
   (scripts/simEventDeck.mjs replays the seven GM packs byte for byte):
   a weight (a share of the draw, never a rank), a story (cards of one story
   share one cooldown stamp, careerEventDeck's ledger key, and never land in
   one week), and a subject with the pack's subjectRest (no one man is the
   subject twice inside the rest). gmPackProblems is the one place every
   pack check lives; bindGmInbox refuses a pack with any.

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
import { ledgerKey } from './careerEventDeck';

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
  /** Its share of the draw among the cards that came up. Absent reads as 1. */
  weight?: number;
  /** Cards sharing a story share one cooldown stamp and one one shot. */
  story?: string;
  /** Who it is about: a key of the pack's targets, or a fact whose value
   *  is the man. A fact with no value this week holds the card back. */
  subject?: string | { fact: string };
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
  /** Ticks a subject rests after a card about him. Absent or 0: no rest. */
  subjectRest?: number;
  events: GmEventDef[];
}

/* ─── what a desk save carries, and what a seat hands in ─────────────────── */

/** careerInbox's two fields (morale and the inbox) plus the cooldown book:
 *  event id to the week clock it last arrived on. All optional on a save. */
export interface GmInboxHost extends InboxHost {
  gmInboxLast?: Record<string, number>;
  /** Subject to the tick a card about him was dealt, only while resting.
   *  Written only by a pack with a subjectRest. */
  gmInboxRest?: Record<string, number>;
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
  const problems = gmPackProblems(pack);
  if (problems.length > 0) throw new Error(`gmInbox: the ${pack.seat} pack: ${problems[0]}`);
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

/** The first option that moves nothing at all, or -1. */
export function gmNeutralIndex(choices: readonly GmChoiceDef[]): number {
  return choices.findIndex(c => !c.karma && !c.popularity && !c.cash && !c.morale
    && !(c.out && c.out.weeks > 0) && !(c.rating && c.rating.delta) && !c.recruit);
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Every problem a pack has, in one place: bindGmInbox refuses the first,
 *  the kit lists them all. W1b adds its effect registry check here. */
export function gmPackProblems(pack: GmInboxPack): string[] {
  const out: string[] = [];
  const whole = (v: unknown, min: number) => typeof v === 'number' && Number.isInteger(v) && v >= min;
  if (pack.subjectRest !== undefined && !whole(pack.subjectRest, 0)) out.push(`subjectRest ${pack.subjectRest} is not a whole number`);
  for (const e of pack.events) {
    const w = e.weight;
    if (w !== undefined && !(typeof w === 'number' && Number.isFinite(w) && w > 0)) out.push(`${e.id} has weight ${w}`);
    if (e.story !== undefined && !(typeof e.story === 'string' && e.story.length > 0)) out.push(`${e.id} has an empty story`);
    const sub = e.subject;
    if (typeof sub === 'string' && !has(pack.targets, sub)) out.push(`${e.id} is about ${sub}, not a target`);
    if (sub !== undefined && typeof sub !== 'string' && !(sub && typeof sub.fact === 'string' && has(pack.facts, sub.fact))) {
      out.push(`${e.id} is about a fact the pack does not declare`);
    }
  }
  return out;
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

/** The cooldown book's key: the story, or the card's own id. */
const bookKey = (e: GmEventDef): string => ledgerKey(e);

/** The rest book's key for a card's subject this week ('role:' or 'id:'),
 *  undefined when it has none, null when its fact has no value (held). */
export function gmSubjectKey(e: GmEventDef, facts: GmFacts): string | null | undefined {
  const sub = e.subject;
  if (sub === undefined) return undefined;
  if (typeof sub === 'string') return `role:${sub}`;
  const v = facts[sub.fact];
  return (typeof v === 'string' && v !== '') || (typeof v === 'number' && Number.isFinite(v)) ? `id:${v}` : null;
}

/** The events that may arrive this week, in pack order (rules 1 and 2). */
export function gmEligible(
  pack: GmInboxPack, beat: string, facts: GmFacts, usedIds: readonly string[],
  last: Readonly<Record<string, number>>, clock: number, rest?: Readonly<Record<string, number>>,
): GmEventDef[] {
  const used = new Set(usedIds);
  const restFor = pack.subjectRest ?? 0;
  const cooled = (e: GmEventDef) => {
    const at = last[bookKey(e)];
    return at === undefined || clock - at >= (e.cooldown ?? pack.cooldown);
  };
  return pack.events.filter(e => {
    if (e.beat !== beat) return false;
    if (!(e.when ?? []).every(c => gmCondHolds(c, facts))) return false;
    const sk = gmSubjectKey(e, facts);
    if (sk === null) return false;
    const r = sk === undefined || restFor <= 0 ? undefined : rest?.[sk];
    if (r !== undefined && clock - r < restFor) return false;
    /* A story's one shot is once for the story, and waits out its stamp. */
    if (e.story) return !(e.oneShot && used.has(bookKey(e))) && cooled(e);
    if (e.oneShot) return !used.has(e.id);
    return cooled(e);
  });
}

const wt = (e: GmEventDef): number => e.weight ?? 1;

/** One card out of those that came up, one draw either way. Equal weights
 *  take the uniform line the deck has always used, to the draw; otherwise
 *  the draw lands on the running sum of the weights. */
function gmTake(came: GmEventDef[], rng: () => number): GmEventDef {
  if (came.every(x => wt(x) === wt(came[0]))) {
    const e = came.splice(Math.floor(rng() * came.length), 1)[0];
    return e;
  }
  const u = rng() * came.reduce((n, x) => n + wt(x), 0);
  let i = 0;
  let run = wt(came[0]);
  while (i < came.length - 1 && u >= run) { i++; run += wt(came[i]); }
  return came.splice(i, 1)[0];
}

const drop = (list: GmEventDef[], hit: (x: GmEventDef) => boolean) => {
  for (let i = list.length - 1; i >= 0; i--) if (hit(list[i])) list.splice(i, 1);
};

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
  /* The rest book is rebased the same way and born pruned: an entry whose
     rest is over goes. Only a pack with a subjectRest reads or writes it. */
  const restFor = pack.subjectRest ?? 0;
  let rest: Record<string, number> | undefined;
  if (restFor > 0 && s.gmInboxRest) {
    rest = {};
    for (const [k, at] of Object.entries(s.gmInboxRest)) if (clock - Math.min(at, clock) < restFor) rest[k] = Math.min(at, clock);
  }
  const open = inbox.filter(m => m.answered === undefined).length;
  const want = Math.max(0, Math.min(pack.perWeek, GM_INBOX_OPEN - open));
  const came = gmEligible(pack, beat, facts, used, last, clock, rest).filter(e => rng() < (e.chance ?? pack.chance));
  const year = seat.yearOf(s);
  const fresh: InboxMessage[] = [];
  while (fresh.length < want && came.length > 0) {
    const e = gmTake(came, rng);
    /* Never two of one story, or two about one resting subject, in a week.
       Neither draws anything. */
    if (e.story) drop(came, x => bookKey(x) === bookKey(e));
    const sk = restFor > 0 ? gmSubjectKey(e, facts) : undefined;
    if (sk) {
      rest = rest ?? {};
      rest[sk] = clock;
      drop(came, x => gmSubjectKey(x, facts) === sk);
    }
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
    if (e.oneShot) used.push(e.story ? bookKey(e) : e.id);
    last[bookKey(e)] = clock;
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
  if (rest !== undefined) s.gmInboxRest = rest;
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
  const isBook = (b: unknown) => !!b && typeof b === 'object' && !Array.isArray(b)
    && Object.values(b as Record<string, unknown>).every(v => typeof v === 'number' && Number.isFinite(v));
  if (s.gmInboxLast !== undefined && !isBook(s.gmInboxLast)) s.gmInboxLast = {};
  if (s.gmInboxRest !== undefined && !isBook(s.gmInboxRest)) delete s.gmInboxRest;
  return s;
}
