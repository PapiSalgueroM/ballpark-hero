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
   subject twice inside the rest), wordings (texts, picked by a keyed draw,
   never the deck's), and a season clock (a between seasons deck counts its
   cooldowns in seasons, careerEventDeck's rule), and expiry (a card left
   open too long is settled on its neutral option, moving nothing, so a busy
   desk never freezes the deck). gmPackProblems is the one place every pack
   check lives; bindGmInbox refuses a pack with any.

   Round 1332 adds what a Club Manager or Soccer Career card needs, again
   each an optional field: a seat effect registry (an option's `fx` moves a
   key the seat registered once, with its words and how it lands, so the
   button prints exactly what the answer does), name slots ({player} filled
   from a fact at deal time), conduct and private tags (such a card is held
   unless every man it is about or moves is a generated person, so nothing
   about discipline or a private life ever lands on a real player), and a
   compact desk (a pack's opt in: a pruned cooldown book, short keys, and
   messages saved as numbers and rebuilt from the pack on read). A role is
   resolved when the seat is asked: a binding whose role holder can change
   between a card's deal and its answer keeps the man fixed (a person slot)
   or answers in the week it deals.

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
import { ledgerKey, onCooldown } from './careerEventDeck';
import { keyedRng } from './keyedRng';

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

/** A registered effect's value on an option (Round 1332): a plain number
 *  for a key that names no one, `{ who, v }` (who a key of the pack's
 *  targets) for one that names a man. */
export type GmFxValue = number | { who: string; v: number };

/** One answer. karma is owner trust, popularity is fans, cash is budget. */
export interface GmChoiceDef extends InboxChoiceDef {
  /** One man, named by role, misses this many weeks. */
  out?: { who: string; weeks: number };
  /** One man's rating moves by this much. */
  rating?: { who: string; delta: number };
  /** A recruit's interest in your program moves by this much. */
  recruit?: number;
  /** Round 1332: what else it moves, each key one the seat registered. */
  fx?: Record<string, GmFxValue>;
}

/* ─── Round 1332: the seat effect registry ───────────────────────────────────

   The seven built in effects (trust, fans, budget, the room, out, rating,
   recruit) are what a GM desk moves. A seat that moves more (board
   confidence, a club suspension) registers each key once: its words and
   how it lands. The button's words and the answer read the same entry, so
   a card can never print a promise it does not keep, and `read` is how a
   harness proves it. */

/** What choiceEffects needs of a registered effect: its words. */
export interface GmFxWords {
  label: string;
  /** 'signed' (the default) prints +3, 'money' as the budget prints,
   *  'weeks' as "2 weeks". */
  fmt?: 'signed' | 'money' | 'weeks';
  /** The key names a man: its values are `{ who, v }`. */
  who?: true;
}
export interface GmFxDef<S> extends GmFxWords {
  apply: (s: S, v: number, who?: string) => void;
  read: (s: S, who?: string) => number;
}
export type GmFxRegistry<S> = Record<string, GmFxDef<S>>;

/** The built in effects: no registry key may take one of these names. */
export const GM_BUILT_IN_FX: readonly string[] = ['karma', 'popularity', 'cash', 'morale', 'out', 'rating', 'recruit'];

/** One fx value as its man (if any) and its amount. */
const fxParts = (raw: GmFxValue): { who?: string; v: number } =>
  (typeof raw === 'number' ? { v: raw } : { who: raw?.who, v: raw?.v });

/** Whether an option moves anything through a registered key. */
const gmFxMoves = (c: GmChoiceDef): boolean => Object.values(c.fx ?? {}).some(raw => fxParts(raw).v !== 0);

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
  /** More wordings of the same card: text is wording 0, these are 1 to n.
   *  The words only, never an option or a number. */
  texts?: string[];
  /** Ticks it may sit open before the desk's staff settle it on its neutral
   *  option, moving nothing. Needs a neutral option. */
  expires?: number;
  /** Round 1332: a card about a man's conduct (discipline, a fine) or his
   *  private life (family, faith, his own health off the pitch). It is dealt
   *  only when its subject, every person slot and every man an option moves
   *  are generated people: never a real one. */
  tag?: 'conduct' | 'private';
}

/** A delivered message. Only a card that expires carries w (the tick it
 *  arrived) and, once settled for you, auto. */
export interface GmInboxMessage extends InboxMessage {
  w?: number;
  auto?: true;
  /** Round 1332, a compact pack's message only: the wording it was dealt
   *  (0 is `text`) and what its slots printed, so it can be rebuilt. */
  t?: number;
  sv?: Record<string, string>;
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
  /** New cards a tick: a week, or a season on the season clock. */
  perWeek: number;
  cooldown: number;
  chance: number;
  /** 'season': the seat calls once a season with the season as its clock,
   *  and a card sits out `cooldown` seasons (careerEventDeck's onCooldown).
   *  Absent is 'week': a card is back after `cooldown` weeks. */
  clock?: 'week' | 'season';
  /** A fact (a position) the kit reports reach by. The engine never reads it. */
  reachBy?: string;
  /** Ticks a subject rests after a card about him. Absent or 0: no rest. */
  subjectRest?: number;
  /** Round 1332: the name slots a wording may hold ({player}, {opponent}),
   *  each filled from a fact. A person slot's fact is a person's id, printed
   *  as the name the seat gives it; any other prints the fact as it is. */
  slots?: Record<string, { fact: string; person?: true }>;
  /** Round 1332: 'compact' opts in to a pruned cooldown book (on a rising
   *  clock only: a pruned entry is not rebased when a clock falls) and to
   *  messages saved as numbers by gmDeskSave. Absent is 'whole'. Its words
   *  are then frozen (scripts/data/eventDeckWords.json): a saved message is
   *  rebuilt from them. */
  store?: 'whole' | 'compact';
  events: GmEventDef[];
}

/** Round 1332: who a role or an id is, as only the seat knows. */
export type GmPersonRef = { role: string } | { id: string | number };
export interface GmPerson { name: string; real: boolean }

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
  keyOf?: (s: S) => string;
  /** Round 1332: the seat's registered effects. Absent reads as none. */
  fx?: GmFxRegistry<S>;
  /** Round 1332: the seat's only way to say who a role or an id is. */
  person?: (s: S, ref: GmPersonRef) => GmPerson | null;
}

export interface GmInboxBinding<S extends GmInboxHost> {
  /** The save's own key (a career, a slot and club), read by the wording
   *  pick. Absent reads as ''. */
  keyOf?: (s: S) => string;
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
  /** Round 1332: every key a pack's `fx` moves, declared once. */
  fx?: GmFxRegistry<S>;
  /** Round 1332: who a role or an id is ({ name, real }), or null when
   *  nobody. Needed by a pack with a tagged card or a person slot. */
  person?: (s: S, ref: GmPersonRef) => GmPerson | null;
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
  const problems = gmPackProblems(pack, b.fx);
  if (problems.length > 0) throw new Error(`gmInbox: the ${pack.seat} pack: ${problems[0]}`);
  /* Round 1332: a card about a person could never be dealt honestly by a
     seat that cannot say who anyone is. */
  const aboutSomeone = pack.events.some(e => e.tag !== undefined) || Object.values(pack.slots ?? {}).some(sl => sl.person);
  if (aboutSomeone && !b.person) throw new Error(`gmInbox: the ${pack.seat} pack has cards about people and the seat cannot say who anyone is`);
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
    keyOf: b.keyOf,
    fx: b.fx ?? {},
    person: b.person,
  };
}

/** The first option that moves nothing at all, or -1. Since Round 1332 a
 *  registered effect counts: an option is neutral only when every one of
 *  its fx values is zero or absent. */
export function gmNeutralIndex(choices: readonly GmChoiceDef[]): number {
  return choices.findIndex(c => !c.karma && !c.popularity && !c.cash && !c.morale
    && !(c.out && c.out.weeks > 0) && !(c.rating && c.rating.delta) && !c.recruit
    && !gmFxMoves(c));
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Round 1332: a name slot in a wording, `{player}`. */
const SLOT_RE = /\{(\w+)\}/g;
/** The slot names a wording holds, in order, each once. */
const slotNames = (t: string): string[] => [...new Set([...t.matchAll(SLOT_RE)].map(m => m[1]))];

/** Every problem a pack has, in one place: bindGmInbox refuses the first,
 *  the kit lists them all. Round 1332's effect registry check is the
 *  `fx` loop: a key the registry does not hold (with no registry, every
 *  key), a registry key named like a built in, a man given to a plain key
 *  or a bare number to a key that names one, a man off the targets, and a
 *  value that is not a finite number. */
export function gmPackProblems(pack: GmInboxPack, fx?: Readonly<Record<string, GmFxWords>>): string[] {
  const out: string[] = [];
  const reg = fx ?? {};
  for (const k of Object.keys(reg)) if (GM_BUILT_IN_FX.includes(k)) out.push(`the seat registers ${k}, the name of a built in effect`);
  /* Round 1332: a slot's fact is declared and names someone or something. */
  const slots = pack.slots ?? {};
  for (const [name, sl] of Object.entries(slots)) {
    if (!(sl && has(pack.facts, sl.fact))) out.push(`slot ${name} reads a fact the pack does not declare`);
    else if (pack.facts[sl.fact].kind === 'bool') out.push(`slot ${name} reads a yes or no fact, which names nobody`);
  }
  for (const [k, t] of Object.entries(pack.targets)) if (/[{}]/.test(t)) out.push(`target ${k} holds a brace`);
  if (pack.store !== undefined && pack.store !== 'whole' && pack.store !== 'compact') out.push(`store ${pack.store} is neither whole nor compact`);
  if (pack.store === 'compact') {
    /* A compact save keeps ids and book keys short: two may never share one. */
    const seen = new Map<string, string>();
    for (const k of new Set(pack.events.flatMap(e => [e.id, bookKey(e)]))) {
      const sk = gmShortKey(k);
      const other = seen.get(sk);
      if (other !== undefined) out.push(`${k} and ${other} share the short key ${sk}`);
      else seen.set(sk, k);
    }
  }
  const whole = (v: unknown, min: number) => typeof v === 'number' && Number.isInteger(v) && v >= min;
  if (pack.subjectRest !== undefined && !whole(pack.subjectRest, 0)) out.push(`subjectRest ${pack.subjectRest} is not a whole number`);
  if (pack.clock !== undefined && pack.clock !== 'week' && pack.clock !== 'season') out.push(`clock ${pack.clock} is neither week nor season`);
  if (pack.reachBy !== undefined && !has(pack.facts, pack.reachBy)) out.push(`reachBy ${pack.reachBy} is not a declared fact`);
  for (const e of pack.events) {
    if (e.expires !== undefined && !whole(e.expires, 1)) out.push(`${e.id} expires after ${e.expires}`);
    else if (e.expires !== undefined && gmNeutralIndex(e.choices) < 0) out.push(`${e.id} expires with no option that moves nothing`);
    if (e.texts !== undefined && !(Array.isArray(e.texts) && e.texts.every(t => typeof t === 'string' && t.length > 0))) out.push(`${e.id} has an empty wording`);
    const w = e.weight;
    if (w !== undefined && !(typeof w === 'number' && Number.isFinite(w) && w > 0)) out.push(`${e.id} has weight ${w}`);
    if (e.story !== undefined && !(typeof e.story === 'string' && e.story.length > 0)) out.push(`${e.id} has an empty story`);
    const sub = e.subject;
    if (typeof sub === 'string' && !has(pack.targets, sub)) out.push(`${e.id} is about ${sub}, not a target`);
    if (sub !== undefined && typeof sub !== 'string' && !(sub && typeof sub.fact === 'string' && has(pack.facts, sub.fact))) {
      out.push(`${e.id} is about a fact the pack does not declare`);
    } else if (sub !== undefined && typeof sub !== 'string' && pack.facts[sub.fact].kind === 'bool') {
      /* A yes or no names nobody, so gmSubjectKey would hold the card forever. */
      out.push(`${e.id} is about a yes or no fact, which names nobody`);
    }
    /* Round 1332: a {slot} only where words are dealt, and only a declared one. */
    for (const t of [e.text, ...(Array.isArray(e.texts) ? e.texts : [])]) {
      if (typeof t !== 'string') continue;
      for (const name of slotNames(t)) if (!has(slots, name)) out.push(`${e.id} names {${name}}, not a declared slot`);
      if (/[{}]/.test(t.replace(SLOT_RE, ''))) out.push(`${e.id} has a brace outside a slot`);
    }
    if ([e.from, e.beat, ...e.choices.flatMap(c => [c.label, c.reply])].some(t => typeof t === 'string' && /[{}]/.test(t))) {
      out.push(`${e.id} has a brace where no slot is filled (its voice, beat, a label or a reply)`);
    }
    if (e.tag !== undefined && e.tag !== 'conduct' && e.tag !== 'private') out.push(`${e.id} has tag ${e.tag}, neither conduct nor private`);
    for (const c of e.choices) {
      for (const [k, raw] of Object.entries(c.fx ?? {})) {
        const def = has(reg, k) ? reg[k] : undefined;
        if (!def) { out.push(`${e.id}: "${c.label}" moves ${k}, which the seat has not registered`); continue; }
        const { who, v } = fxParts(raw);
        if (!(typeof v === 'number' && Number.isFinite(v))) out.push(`${e.id}: "${c.label}" moves ${k} by ${v}, not a finite number`);
        if (def.who && typeof raw === 'number') out.push(`${e.id}: ${k} names a man and "${c.label}" gives it a bare number`);
        if (!def.who && typeof raw !== 'number') out.push(`${e.id}: ${k} names nobody and "${c.label}" gives it a man`);
        if (typeof raw !== 'number' && !(typeof who === 'string' && has(pack.targets, who))) out.push(`${e.id}: "${c.label}" moves ${k} for ${who}, not a target`);
      }
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

/** A fact value that can fill a slot or name a man: a word or a number. */
const named = (v: GmFactValue | undefined): v is string | number =>
  (typeof v === 'string' && v !== '') || (typeof v === 'number' && Number.isFinite(v));

/** Every slot any wording of a card holds. */
const cardSlots = (e: GmEventDef): string[] =>
  [...new Set([e.text, ...(e.texts ?? [])].flatMap(slotNames))];

/**
 * Round 1332, the hold (step 4b): whether a card may be dealt this week.
 * Every slot in any wording of it has a value (a word or a number) and every
 * person slot names somebody. And a tagged card (conduct, private) only when
 * its subject, every person slot and the man every option's out, rating and
 * targeted fx lands on are generated people (`real: false`): nothing about a
 * man's conduct or private life ever lands on a real one. A card with no
 * slot and no tag is safe without asking anything.
 */
export function gmCardSafe<S extends GmInboxHost>(e: GmEventDef, s: S, seat: GmInboxSeat<S>, facts: GmFacts): boolean {
  const slots = seat.pack.slots;
  if (!e.tag && !slots) return true;
  const used = slots ? cardSlots(e) : [];
  if (!e.tag && used.length === 0) return true;
  const who = (ref: GmPersonRef) => (seat.person ? seat.person(s, ref) : null);
  const people: GmPersonRef[] = [];
  for (const name of used) {
    const sl = slots?.[name];
    const v = sl ? facts[sl.fact] : undefined;
    if (!sl || !named(v)) return false;
    if (sl.person) {
      if (!who({ id: v })) return false;
      people.push({ id: v });
    }
  }
  if (!e.tag) return true;
  const sub = e.subject;
  if (typeof sub === 'string') people.push({ role: sub });
  else if (sub !== undefined) {
    const v = facts[sub.fact];
    if (!named(v)) return false;
    people.push({ id: v });
  }
  for (const c of e.choices) {
    if (c.out) people.push({ role: c.out.who });
    if (c.rating) people.push({ role: c.rating.who });
    for (const raw of Object.values(c.fx ?? {})) if (typeof raw !== 'number') people.push({ role: raw.who });
  }
  return people.every(ref => who(ref)?.real === false);
}

/** Round 1332: what each slot of one wording prints, by slot name, or
 *  undefined for a wording with none. A slot with no value is left out, so
 *  it stays a brace (the hold makes sure that never happens). */
function gmSlotValues<S extends GmInboxHost>(words: string, s: S, seat: GmInboxSeat<S>, facts: GmFacts): Record<string, string> | undefined {
  const names = slotNames(words);
  if (names.length === 0) return undefined;
  const slots = seat.pack.slots ?? {};
  const sv: Record<string, string> = {};
  for (const name of names) {
    const sl = has(slots, name) ? slots[name] : undefined;
    const v = sl ? facts[sl.fact] : undefined;
    if (!sl || !named(v)) continue;
    const p = sl.person ? seat.person?.(s, { id: v }) : undefined;
    if (sl.person && !p) continue;
    sv[name] = p ? p.name : String(v);
  }
  return sv;
}

/** A wording with its slots filled; a slot with no value stays as it is. */
const gmFill = (words: string, sv: Readonly<Record<string, string>>): string =>
  words.replace(SLOT_RE, (all: string, k: string) => (has(sv, k) ? sv[k] : all));

/** The events that may arrive this week, in pack order (rules 1 and 2).
 *  Round 1332: `safe`, when handed in, holds a card it refuses (step 4b). */
export function gmEligible(
  pack: GmInboxPack, beat: string, facts: GmFacts, usedIds: readonly string[],
  last: Readonly<Record<string, number>>, clock: number, rest?: Readonly<Record<string, number>>,
  safe?: (e: GmEventDef) => boolean,
): GmEventDef[] {
  const used = new Set(usedIds);
  const restFor = pack.subjectRest ?? 0;
  const cooled = (e: GmEventDef) => {
    if (pack.clock === 'season') return !onCooldown(last, e, clock, pack.cooldown);
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
    if (safe && !safe(e)) return false;
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
 * One week of the deck (one tick: a season, on a season clock). `beat` is
 * where the seat's year stands, `facts` the plain facts of the moment,
 * `clock` the save's own tick counter, which a seat may hand in falling (the
 * week of its season), so the books are rebased. The steps, in this order:
 * (1) rebase the cooldown book and the rest book from the future, pruning
 * the rest book; (2) settle the expired cards; (3) count the open ones and
 * `want`; (4) the eligible events (beat, conditions, subject rest, story,
 * one shots, cooldowns); (4b) the safety hold (gmCardSafe: a slot with no
 * value, a tagged card about a real man); (5) one chance roll per eligible
 * event in pack order; (6) up to `perWeek` picks, never past GM_INBOX_OPEN
 * unanswered (rule 3), each dropping its story and subject siblings with no
 * draw; (7) each pick's wording, from a keyed draw, never `rng`; (7b) its
 * slots filled; (8) the kept cap; (8b) a compact pack's book pruned to the
 * entries still cooling.
 * The deck's draws all come from `rng`, so the same seed deals the same
 * deck. Returns what arrived. A seat that hands in `settled` gets every card
 * step (2) settled pushed onto it, even one the kept cap then drops, so it
 * can show gmExpiredLine for each; it changes nothing else.
 */
export function gmInboxWeek<S extends GmInboxHost>(
  s: S, seat: GmInboxSeat<S>, beat: string, facts: GmFacts, clock: number, rng: () => number,
  settled?: InboxMessage[],
): InboxMessage[] {
  const pack = seat.pack;
  const inbox: GmInboxMessage[] = [...(s.phoneInbox ?? [])];
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
  /* Expiry: a card left open its `expires` ticks is settled on its neutral
     option and nothing moves (not through the answer flow, whose clamp could
     move a meter). It counts as answered from here on, so its slot is free
     this week. A card whose def is gone or no longer expires stays open, and
     a tick from the future is rebased like the book. */
  for (let i = 0; i < inbox.length; i++) {
    const m = inbox[i];
    if (m.answered !== undefined || m.w === undefined) continue;
    const w = Math.min(m.w, clock);
    const ttl = pack.events.find(e => e.id === m.defId)?.expires;
    const n = gmNeutralIndex(m.choices);
    if (ttl !== undefined && clock - w >= ttl && n >= 0) inbox[i] = { ...m, w, answered: n, auto: true };
    else if (w !== m.w) inbox[i] = { ...m, w };
    if (inbox[i].auto && !m.auto) settled?.push(inbox[i]);
  }
  const open = inbox.filter(m => m.answered === undefined).length;
  const want = Math.max(0, Math.min(pack.perWeek, GM_INBOX_OPEN - open));
  const came = gmEligible(pack, beat, facts, used, last, clock, rest, e => gmCardSafe(e, s, seat, facts)).filter(e => rng() < (e.chance ?? pack.chance));
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
    /* The wording: a keyed draw on the save key, card, year and clock, never
       the deck's rng, so adding wordings never moves which cards are dealt.
       The picked words are saved whole. */
    const alt = e.texts?.length ?? 0;
    const pick = alt > 0 ? Math.floor(keyedRng(`${seat.keyOf?.(s) ?? ''}|${e.id}|${year}|${clock}`)() * (1 + alt)) : 0;
    /* (7b) Round 1332: the picked wording's slots, filled from this week's
       facts (step 4b made sure each has a value); a person slot prints the
       name the seat gives him. */
    const words = pick > 0 ? e.texts![pick - 1] : e.text;
    const sv = pack.slots ? gmSlotValues(words, s, seat, facts) : undefined;
    const msg: GmInboxMessage = {
      id, defId: e.id, from: e.from, emoji: e.emoji, text: sv ? gmFill(words, sv) : words,
      year, choices: e.choices, beat: e.beat,
    };
    if (e.expires !== undefined) msg.w = clock;
    if (pack.store === 'compact') {
      msg.t = pick;
      if (sv && Object.keys(sv).length > 0) msg.sv = sv;
    }
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
  /* (8b) Round 1332: a compact pack's book keeps only what still cools. */
  if (pack.store === 'compact') gmPruneBook(pack, last, clock);
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

/** Every effect an option moves, in the seat's own words. Zero is left out.
 *  Round 1332: then one entry per nonzero registered key, in the option's
 *  key order, from the registry's words; a key with no entry prints its own
 *  name and value, so a label can never hide an effect. */
export function choiceEffects(c: GmChoiceDef, pack: GmInboxPack, fx?: Readonly<Record<string, GmFxWords>>): string[] {
  const m = pack.meters;
  const out: string[] = [];
  if (c.karma) out.push(`${m.trust} ${signed(c.karma)}`);
  if (c.popularity) out.push(`${m.fans} ${signed(c.popularity)}`);
  if (c.cash) out.push(`${m.money} ${c.cash > 0 ? '+' : '-'}${pack.money.prefix}${Math.abs(c.cash)}${pack.money.suffix}`);
  if (c.morale) out.push(`${m.morale} ${signed(c.morale)}`);
  if (c.out && c.out.weeks > 0) out.push(`${pack.targets[c.out.who] ?? c.out.who} out ${c.out.weeks} week${c.out.weeks === 1 ? '' : 's'}`);
  if (c.rating && c.rating.delta) out.push(`${pack.targets[c.rating.who] ?? c.rating.who} rating ${signed(c.rating.delta)}`);
  if (c.recruit) out.push(`${m.recruit ?? 'Recruit interest'} ${signed(c.recruit)}`);
  for (const [k, raw] of Object.entries(c.fx ?? {})) {
    const { who, v } = fxParts(raw);
    if (!v) continue;
    const def = fx && has(fx, k) ? fx[k] : undefined;
    const man = who === undefined ? '' : `${pack.targets[who] ?? who} `;
    if (!def) { out.push(`${man}${k} ${signed(v)}`); continue; }
    const amount = def.fmt === 'money' ? `${v > 0 ? '+' : '-'}${pack.money.prefix}${Math.abs(v)}${pack.money.suffix}`
      : def.fmt === 'weeks' ? `${v} week${v === 1 ? '' : 's'}` : signed(v);
    out.push(`${man}${def.label} ${amount}`);
  }
  return out;
}

/** The option's words with its effects after them, as the button reads. */
export function gmChoiceLabel(c: GmChoiceDef, pack: GmInboxPack, fx?: Readonly<Record<string, GmFxWords>>): string {
  const fx2 = choiceEffects(c, pack, fx);
  return fx2.length ? `${c.label} · ${fx2.join(', ')}` : c.label;
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
  /* Round 1332: an effect the seat never registered could not land, so
     the answer fails closed and nothing moves. */
  const reg = seat.fx ?? {};
  if (c.fx && Object.keys(c.fx).some(k => !has(reg, k))) return null;
  if (answerInboxMessage(s, msgId, choiceIdx, seat) === null) return null;
  if (c.out && c.out.weeks > 0) seat.setOut(s, c.out.who, c.out.weeks);
  if (c.rating && c.rating.delta) seat.addRating(s, c.rating.who, c.rating.delta);
  if (c.recruit) seat.addRecruit(s, c.recruit);
  for (const [k, raw] of Object.entries(c.fx ?? {})) {
    const { who, v } = fxParts(raw);
    if (v) reg[k].apply(s, v, who);
  }
  const fx = choiceEffects(c, seat.pack, reg);
  return `📨 ${msg.from}: ${c.label}.${fx.length ? ` ${fx.join(', ')}.` : ''}`;
}

/** The line a seat shows for a card the staff settled, null for any other.
 *  The voice and the label are read off the saved message, so a later edit
 *  of the pack never rewrites a line already on a desk. A card the assistant
 *  sent names the assistant once, not twice. */
export function gmExpiredLine(msg: InboxMessage): string | null {
  const m = msg as GmInboxMessage;
  const c = m.auto && m.answered !== undefined ? m.choices[m.answered] : undefined;
  if (!c) return null;
  return /^your assistant\b/i.test(m.from.trim())
    ? `📨 ${m.from} dealt with it (${c.label}).`
    : `📨 ${m.from}: your assistant dealt with it (${c.label}).`;
}

/** Open decisions sitting on the desk. */
export function gmInboxOpen(s: GmInboxHost): number {
  return (s.phoneInbox ?? []).filter(m => m.answered === undefined).length;
}

/* ─── old saves and broken ones ──────────────────────────────────────────── */

const isMsg = (m: unknown): m is InboxMessage => {
  const o = m as InboxMessage;
  const g = m as GmInboxMessage;
  return !!o && typeof o === 'object' && typeof o.id === 'string' && typeof o.defId === 'string'
    && typeof o.from === 'string' && typeof o.text === 'string' && typeof o.year === 'number'
    && Array.isArray(o.choices) && o.choices.length > 0
    && o.choices.every(c => !!c && typeof c.label === 'string' && typeof c.karma === 'number' && Number.isFinite(c.karma))
    && (o.answered === undefined || (Number.isInteger(o.answered) && o.answered >= 0 && o.answered < o.choices.length))
    && (g.w === undefined || (typeof g.w === 'number' && Number.isFinite(g.w)))
    && (g.auto === undefined || (g.auto === true && o.answered !== undefined));
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

/* ─── Round 1332: the compact desk ───────────────────────────────────────────

   A Club Manager save has little room, and a desk dealt forty five cards a
   season would grow its book every season and save every message whole. A
   pack that opts in (`store: 'compact'`) keeps a pruned book (step 8b) and
   is saved by gmDeskSave as numbers: short keys for ids and book keys, and
   each message as its card, year, clock, wording and slot values, rebuilt
   from the pack by gmDeskLoad. Its words are frozen once shipped
   (scripts/data/eventDeckWords.json), so a rebuilt message reads exactly as
   it was dealt. Nothing calls the codec yet: the binding rounds will, at
   save and load. It holds no answer or cap logic. */

/** A ledger key or id as a short key: FNV 1a, 32 bit, in base 36. */
export function gmShortKey(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/* The pack's cards by book key and by short key, built once a deck. */
const KEY_INDEX = new WeakMap<GmEventDef[], Map<string, GmEventDef[]>>();
const SHORT_INDEX = new WeakMap<GmEventDef[], Map<string, string>>();
const keyIndex = (pack: GmInboxPack): Map<string, GmEventDef[]> => {
  let m = KEY_INDEX.get(pack.events);
  if (!m) {
    m = new Map();
    for (const e of pack.events) m.set(bookKey(e), [...(m.get(bookKey(e)) ?? []), e]);
    KEY_INDEX.set(pack.events, m);
  }
  return m;
};
const shortIndex = (pack: GmInboxPack): Map<string, string> => {
  let m = SHORT_INDEX.get(pack.events);
  if (!m) {
    m = new Map();
    for (const e of pack.events) for (const k of [e.id, bookKey(e)]) m.set(gmShortKey(k), k);
    SHORT_INDEX.set(pack.events, m);
  }
  return m;
};

/** Step 8b: an entry goes once every card sharing its key has cooled at
 *  this clock (the week rule, or careerEventDeck's on a season clock), or
 *  when no card holds its key. On a rising clock a cooled entry and an
 *  absent one deal the same. */
function gmPruneBook(pack: GmInboxPack, last: Record<string, number>, clock: number): void {
  const byKey = keyIndex(pack);
  for (const [k, at] of Object.entries(last)) {
    const sharing = byKey.get(k) ?? [];
    if (sharing.every(e => (pack.clock === 'season' ? !onCooldown(last, e, clock, pack.cooldown) : clock - at >= (e.cooldown ?? pack.cooldown)))) delete last[k];
  }
}

/** One message as numbers: its card's short key, year, clock, the id's
 *  repeat suffix, wording, slot values, arrival, answer and auto. */
export interface GmCompactMsg { d: string; y: number; c: number; n?: number; t?: number; s?: Record<string, string>; w?: number; a?: number; x?: 1 }
/** A desk's four inbox fields as saved. */
export interface GmDeskBlock { v: 1; l?: Record<string, number>; u?: string[]; r?: Record<string, number>; m?: (GmCompactMsg | InboxMessage)[] }
/** The four host fields a block reads back to. */
export interface GmDeskFields { phoneInbox?: InboxMessage[]; phoneUsedIds?: string[]; gmInboxLast?: Record<string, number>; gmInboxRest?: Record<string, number> }

const ID_TAIL = /^(\d+)(?:-(\d+))?$/;
const isNumBook = (b: unknown): b is Record<string, number> => !!b && typeof b === 'object' && !Array.isArray(b)
  && Object.values(b as Record<string, unknown>).every(v => typeof v === 'number' && Number.isFinite(v));
const isWordBook = (b: unknown): b is Record<string, string> => !!b && typeof b === 'object' && !Array.isArray(b)
  && Object.values(b as Record<string, unknown>).every(v => typeof v === 'string');

/** A compact pack's message as numbers, or null to save it whole: a message
 *  whose id does not parse as `${defId}-${year}-w${clock}` (and `-${n}`),
 *  whose card is gone, or that was not dealt compact (no wording index). */
function compactOf(m: InboxMessage, pack: GmInboxPack): GmCompactMsg | null {
  const g = m as GmInboxMessage;
  if (typeof g.t !== 'number' || !pack.events.some(e => e.id === m.defId)) return null;
  const head = `${m.defId}-${m.year}-w`;
  const tail = m.id.startsWith(head) ? ID_TAIL.exec(m.id.slice(head.length)) : null;
  if (!tail) return null;
  const out: GmCompactMsg = { d: gmShortKey(m.defId), y: m.year, c: Number(tail[1]) };
  if (tail[2] !== undefined) out.n = Number(tail[2]);
  if (g.t) out.t = g.t;
  if (g.sv) out.s = g.sv;
  if (g.w !== undefined) out.w = g.w;
  if (m.answered !== undefined) out.a = m.answered;
  if (g.auto) out.x = 1;
  return out;
}

/** A desk's four inbox fields as a block for the save: a compact pack's as
 *  numbers, any other pack's as they are. */
export function gmDeskSave(s: GmInboxHost, pack: GmInboxPack): GmDeskBlock {
  const compact = pack.store === 'compact';
  const out: GmDeskBlock = { v: 1 };
  if (s.gmInboxLast) {
    const l: Record<string, number> = {};
    for (const [k, at] of Object.entries(s.gmInboxLast)) l[compact ? gmShortKey(k) : k] = at;
    out.l = l;
  }
  if (s.phoneUsedIds) out.u = compact ? s.phoneUsedIds.map(gmShortKey) : [...s.phoneUsedIds];
  if (s.gmInboxRest) out.r = { ...s.gmInboxRest };
  if (s.phoneInbox) out.m = s.phoneInbox.map(m => (compact ? compactOf(m, pack) ?? m : m));
  return out;
}

/** A compact message rebuilt from its card, or null when its card or its
 *  wording is gone or a field is broken. */
function rebuild(c: GmCompactMsg, pack: GmInboxPack): GmInboxMessage | null {
  const whole = (v: unknown, min: number) => typeof v === 'number' && Number.isInteger(v) && v >= min;
  const id = typeof c.d === 'string' ? shortIndex(pack).get(c.d) : undefined;
  const e = id === undefined ? undefined : pack.events.find(x => x.id === id);
  if (!e || !whole(c.y, 0) || !whole(c.c, 0) || !(c.n === undefined || whole(c.n, 2))) return null;
  const t = c.t ?? 0;
  const words = !whole(t, 0) ? undefined : t === 0 ? e.text : e.texts?.[t - 1];
  if (words === undefined) return null;
  if (c.s !== undefined && !isWordBook(c.s)) return null;
  if (c.w !== undefined && !(typeof c.w === 'number' && Number.isFinite(c.w))) return null;
  if (c.a !== undefined && !(whole(c.a, 0) && c.a < e.choices.length)) return null;
  if (c.x !== undefined && !(c.x === 1 && c.a !== undefined)) return null;
  const msg: GmInboxMessage = {
    id: `${e.id}-${c.y}-w${c.c}${c.n === undefined ? '' : `-${c.n}`}`, defId: e.id, from: e.from, emoji: e.emoji,
    text: c.s ? gmFill(words, c.s) : words, year: c.y, choices: e.choices, beat: e.beat,
  };
  if (c.w !== undefined) msg.w = c.w;
  msg.t = t;
  if (c.s) msg.sv = c.s;
  if (c.a !== undefined) msg.answered = c.a;
  if (c.x === 1) msg.auto = true;
  return msg;
}

/**
 * A saved block back to the desk's four fields. It fails closed field by
 * field, like repairGmInbox: a block that is not `v: 1` reads as an empty
 * desk, a broken field resets alone, a compact message whose card or
 * wording is gone is dropped and counted, and a whole message from an older
 * build is kept when it reads as a message.
 */
export function gmDeskLoad(block: unknown, pack: GmInboxPack): { host: GmDeskFields; dropped: number } {
  const b = block as Partial<GmDeskBlock> | null;
  if (!b || typeof b !== 'object' || b.v !== 1) return { host: { phoneInbox: [], phoneUsedIds: [], gmInboxLast: {} }, dropped: 0 };
  const compact = pack.store === 'compact';
  const keys = shortIndex(pack);
  const host: GmDeskFields = {};
  let dropped = 0;
  if (b.m !== undefined) {
    const list: InboxMessage[] = [];
    if (Array.isArray(b.m)) {
      for (const raw of b.m as unknown[]) {
        const isCompact = !!raw && typeof raw === 'object' && 'd' in raw && !('id' in raw);
        const m = isCompact ? (compact ? rebuild(raw as GmCompactMsg, pack) : null) : (isMsg(raw) ? raw : null);
        if (m && isMsg(m)) list.push(m);
        else dropped++;
      }
    }
    host.phoneInbox = list;
  }
  if (b.u !== undefined) {
    const u: unknown = b.u;
    const ok = Array.isArray(u) && u.every(x => typeof x === 'string');
    host.phoneUsedIds = !ok ? [] : compact
      ? (u as string[]).map(k => keys.get(k)).filter((k): k is string => k !== undefined) : [...(u as string[])];
  }
  if (b.l !== undefined) {
    const l: Record<string, number> = {};
    if (isNumBook(b.l)) {
      for (const [k, at] of Object.entries(b.l)) {
        const full = compact ? keys.get(k) : k;
        if (full !== undefined) l[full] = at;
      }
    }
    host.gmInboxLast = l;
  }
  if (b.r !== undefined && isNumBook(b.r)) host.gmInboxRest = { ...b.r };
  return { host, dropped };
}
