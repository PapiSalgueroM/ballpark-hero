/* ─── Round 1334: Soccer Career's binding of the shared deck ────────────────

   The shared deck (src/lib/gmInbox.ts, Rounds 1324 and 1332) deals the GM
   seats' cards. This file binds it to Soccer Career's between seasons batch:
   at most one card a summer, about the player's own position or where his
   career stands, dealt FIRST in the batch from its own keyed stream, added to
   the old catalog's cards and never replacing one.

   LAZY. This module, src/data/soccerDeck/* and gmInbox.ts are one lazy chunk.
   The engine and the page reach it only through src/lib/soccerDeckGate.ts
   (eager, no runtime import), which holds the loaded module. Until something
   calls loadSoccerDeck the gate answers [] to both of its questions, so a
   career that never loads the deck plays today's game to the byte.

   THE DEAL (dealSoccerDeck, called by the engine's generateRandomEvents just
   before its stamp loop). The facts are the save's own (soccerDeckFacts);
   none (null) means no card. The eligible cards are gmEligible's on the
   pack's one beat over the save's own cooldown ledger (eventLastFired, the
   season clock: careerEventDeck's onCooldown, the engine's isEventOnCooldown
   rule), minus a card whose training could not land (the hold, below), minus
   a card whose ledger key a card of the old batch holds, minus lastEventId.
   One gmTake draw from keyedRng(key), never Math.random. The engine puts the
   card first: the old batch keeps its order behind it, and the last card
   answered stays the old batch's last.

   THE CEILING. A training key never lands past momentsRoom
   (season/soccerMoments.ts), the moments' room under his ceiling, which counts
   the boosts already queued for next season. The drills' room
   (careerDrills.ts applyDrillResult: drillHeadroom minus momentsPaid) does
   not count queued boosts, so a deck boost and a drill in one summer can pass
   the ceiling together; that drill rule is owed to the drills, not fixed here.
   The hold: a card is never dealt when an option's training adds up to more
   than the room at the deal. The clamp: if the room shrank between the deal
   and the answer (a training session banked in between), the key lands what
   fits, and the season log line says what landed.

   WHAT LANDED. Every option that moves something appends ONE line to the
   season log naming what landed, which can be less than the button printed
   only at a bound (training at the ceiling, morale at 0 or 100), e.g.
   "Shooting next season +0, you are at your ceiling". The option that moves
   nothing returns the state untouched and logs nothing.

   THE REGISTRY. Built in: morale (CareerState.morale, 0 to 100). Registered
   (SOCCER_FX): integrity (integrityBonus, signed, no bound) and thirteen
   training keys, six outfield and seven keeper, each worded as the attribute
   screen's family for its stat (src/data/soccerDeck/words.ts). Refused, each a
   ruling, so the next pack round does not rediscover them:
     karma        stays 0 on every option (the field is required by
                  InboxChoiceDef; the save's karma is the phone's mood);
     popularity, cash and followers: no soccer pack moves them until the
                  money and fame meters are rebalanced (the runaway the
                  Soccer Career hunt names);
     out, rating, recruit: a desk's effects, nothing a career has;
     a selection or a match line: the Season Centre derives every game from
                  the saved row, so a between seasons card has no match to
                  land on;
     the rehab road, a phone contact, the reduced role: other screens' and
                  the other lane's ground.
   And the pack shape: no story (a story stamp would hold the old catalog's
   cards out), no per card chance (the slot rolls nothing, so a chance would
   deal at rate 1 here and at its chance in the kit), a pack chance of 1, no
   wordings, slots, tags, subjects, expiry or one shots (each needs a reader
   the save does not have yet). soccerDeckProblems refuses every one, and a
   pack with a problem deals nothing.

   Nothing here reads a clock or calls Math.random. */
import type { CareerState, EventChoice, RandomEvent } from './soccerCareerEngine';
import {
  choiceEffects, gmEligible, gmNeutralIndex, gmPackProblems, gmTake,
  type GmChoiceDef, type GmCond, type GmEventDef, type GmFacts, type GmFxRegistry, type GmInboxPack,
} from './gmInbox';
import { ledgerKey } from './careerEventDeck';
import { keyedRng } from './keyedRng';
import { drillForPosition } from './careerDrills';
import { momentsRoom } from '@/lib/season/soccerMoments';
import { readSeasonDerbies } from './soccerCareerDerby';
import { SOCCER_DECK_PACKS } from '@/data/soccerDeck';
import { SOCCER_FX_WORDS, SOCCER_TRAINING_KEYS } from '@/data/soccerDeck/words';

/** A soccer pack: a deck pack plus each card's title and card kind (the
 *  kind picks the card's colour and label on the page). */
export interface SoccerDeckPack extends GmInboxPack {
  titles: Record<string, string>;
  kinds: Record<string, RandomEvent['category']>;
}

/** The deck's ids: 700 to 999 (600 to 699 are the other lane's routines). */
export const SOCCER_DECK_MIN_ID = 700;
export const SOCCER_DECK_MAX_ID = 999;

/* ─── the facts ─── */

const POS_GROUP: Record<string, number> = { gloves: 0, tackle: 1, throughball: 2, wallshot: 3 };

/**
 * The plain facts one summer's deal reads, all the save's own. Null (no card)
 * unless the career is live, at least 17, at a club, and the last row is a
 * playing season. pos is the drills' group (careerDrills.ts drillForPosition:
 * a CDM is a defender, LW and RW forwards).
 */
export function soccerDeckFacts(state: CareerState): GmFacts | null {
  const last = state.seasons[state.seasons.length - 1];
  if (state.retired || state.age < 17 || !state.currentClub || !state.currentClub.trim()) return null;
  if (!last || last.type !== 'playing') return null;
  let derbies = 0;
  for (const d of readSeasonDerbies(last)) for (const m of d.meetings) if (m.played) derbies++;
  return {
    pos: POS_GROUP[drillForPosition(state.position)],
    age: state.age,
    tier: state.currentClubTier,
    apps: last.apps,
    goals: last.goals,
    cleanSheets: last.cleanSheets,
    yellows: last.yellowCards,
    rating: last.rating,
    injuryWeeks: typeof last.injuryWeeks === 'number' && Number.isFinite(last.injuryWeeks) ? last.injuryWeeks : 0,
    derbies,
    room: momentsRoom(state),
    morale: state.morale,
    seniorSeasons: state.seasons.filter(r => r.type === 'playing').length,
    capped: (last.intApps ?? 0) > 0,
    captain: state.isClubCaptain === true && state.captainClub === state.currentClub,
    contractYear: state.contractYearsLeft === 1,
    sameClub: last.club === state.currentClub,
  };
}

/* ─── the registry ─── */

/** The soccer seat's registered effects: integrity and the training keys.
 *  Each apply writes a new object where it writes a nested one, never the
 *  shared one, and `read` is how a harness proves the button's words. Built
 *  at load from words.ts, a leaf module (a type import only), so no import
 *  cycle can hand it in half evaluated. */
export const SOCCER_FX: GmFxRegistry<CareerState> = {
  integrity: {
    ...SOCCER_FX_WORDS.integrity,
    apply: (s, v) => { s.integrityBonus = (s.integrityBonus ?? 0) + v; },
    read: s => s.integrityBonus ?? 0,
  },
};
for (const [key, { stat }] of Object.entries(SOCCER_TRAINING_KEYS)) {
  SOCCER_FX[key] = {
    ...SOCCER_FX_WORDS[key],
    apply: (s, v) => {
      const add = Math.max(0, Math.min(v, momentsRoom(s)));
      if (add > 0) s.statBoostNextSeason = { ...(s.statBoostNextSeason ?? {}), [stat]: (s.statBoostNextSeason?.[stat] ?? 0) + add };
    },
    read: s => s.statBoostNextSeason?.[stat] ?? 0,
  };
}

/* ─── the bind check ─── */

const KINDS: readonly RandomEvent['category'][] = ['positive', 'negative', 'international', 'life'];
const isTraining = (k: string) => Object.prototype.hasOwnProperty.call(SOCCER_TRAINING_KEYS, k);
const posConds = (when: readonly GmCond[] | undefined) => (when ?? []).filter(c => c.fact === 'pos' && typeof c.value === 'number');
/** The card's conditions hold pos below 1 (a keeper only). */
const keeperOnly = (when: readonly GmCond[] | undefined) => posConds(when).some(c => {
  const v = c.value as number;
  return (c.op === '<' && v <= 1) || (c.op === '<=' && v < 1) || (c.op === '==' && v < 1);
});
/** The card's conditions hold pos at 1 or above (an outfield player only). */
const outfieldOnly = (when: readonly GmCond[] | undefined) => posConds(when).some(c => {
  const v = c.value as number;
  return ((c.op === '>=' || c.op === '>' || c.op === '==') && v >= 1);
});

/**
 * Every problem a soccer pack has: gmPackProblems over the soccer words
 * first, then the soccer rules, each its own message. A pack with any deals
 * nothing (the slot fails closed).
 */
export function soccerDeckProblems(pack: SoccerDeckPack): string[] {
  const out = gmPackProblems(pack, SOCCER_FX_WORDS);
  if (pack.seat !== 'soccer') out.push(`seat ${pack.seat} is not soccer`);
  if (pack.calendar.length !== 1 || pack.calendar[0]?.id !== 'summer') out.push('the soccer deck has one beat, summer');
  if (pack.clock !== 'season') out.push('the soccer deck counts its cooldowns in seasons (clock: season)');
  if (pack.store !== 'compact') out.push('the soccer deck freezes its words (store: compact)');
  if (pack.perWeek !== 1) out.push(`perWeek ${pack.perWeek}: the soccer deck deals at most one card a summer`);
  if (pack.chance !== 1) out.push(`chance ${pack.chance}: the soccer slot rolls nothing, so the pack chance is 1`);
  if (pack.slots !== undefined) out.push('slots are not bound for soccer yet');
  if (Object.keys(pack.targets).length > 0) out.push('targets are not bound for soccer yet (no card names a man)');
  const seen = new Set<string>();
  for (const e of pack.events) {
    const n = Number(e.id);
    if (!(Number.isInteger(n) && String(n) === e.id && n >= SOCCER_DECK_MIN_ID && n <= SOCCER_DECK_MAX_ID)) out.push(`${e.id} is not a whole number from ${SOCCER_DECK_MIN_ID} to ${SOCCER_DECK_MAX_ID}`);
    if (seen.has(e.id)) out.push(`${e.id} is in the pack twice`);
    seen.add(e.id);
    if (!(typeof pack.titles[e.id] === 'string' && pack.titles[e.id].trim().length > 0)) out.push(`${e.id} has no title`);
    if (!KINDS.includes(pack.kinds[e.id])) out.push(`${e.id} has no card kind`);
    if (e.beat !== 'summer') out.push(`${e.id} is on beat ${e.beat}, not summer`);
    for (const c of e.when ?? []) if (!Object.prototype.hasOwnProperty.call(pack.facts, c.fact)) out.push(`${e.id} reads ${c.fact}, a fact the pack does not declare`);
    if (e.story !== undefined) out.push(`${e.id} has a story, which would hold the old catalog's cards out`);
    if (e.chance !== undefined) out.push(`${e.id} has its own chance, which the soccer slot never rolls`);
    if (e.texts !== undefined) out.push(`${e.id} has wordings, not bound for soccer yet`);
    if (e.tag !== undefined) out.push(`${e.id} has a tag, not bound for soccer yet`);
    if (e.subject !== undefined) out.push(`${e.id} has a subject, not bound for soccer yet`);
    if (e.expires !== undefined) out.push(`${e.id} expires, not bound for soccer yet`);
    if (e.oneShot !== undefined) out.push(`${e.id} is a one shot, not bound for soccer yet (a once a career card uses cooldown 99)`);
    if (gmNeutralIndex(e.choices) < 0) out.push(`${e.id} has no option that moves nothing`);
    const keeper = keeperOnly(e.when);
    const outfield = outfieldOnly(e.when);
    for (const c of e.choices) {
      if (c.karma !== 0) out.push(`${e.id}: "${c.label}" moves karma`);
      if (c.popularity !== undefined) out.push(`${e.id}: "${c.label}" moves popularity`);
      if (c.cash !== undefined) out.push(`${e.id}: "${c.label}" moves cash`);
      if (c.out !== undefined || c.rating !== undefined || c.recruit !== undefined) out.push(`${e.id}: "${c.label}" moves a desk effect (out, rating or recruit)`);
      for (const [k, raw] of Object.entries(c.fx ?? {})) {
        if (!isTraining(k)) continue;
        if (!(typeof raw === 'number' && Number.isInteger(raw) && raw > 0)) out.push(`${e.id}: "${c.label}" trains ${k} by ${JSON.stringify(raw)}, not a whole number above 0`);
        if (SOCCER_TRAINING_KEYS[k].keeper && !keeper) out.push(`${e.id}: "${c.label}" trains a keeper skill (${k}) on a card an outfield player can be dealt`);
        if (!SOCCER_TRAINING_KEYS[k].keeper && !outfield) out.push(`${e.id}: "${c.label}" trains an outfield skill (${k}) on a card a keeper can be dealt`);
      }
    }
  }
  return out;
}

/** Memoised per pack, on first use, never at module scope. */
const PROBLEMS = new WeakMap<SoccerDeckPack, string[]>();
const problemsOf = (pack: SoccerDeckPack): string[] => {
  let p = PROBLEMS.get(pack);
  if (p === undefined) { p = soccerDeckProblems(pack); PROBLEMS.set(pack, p); }
  return p;
};

/* ─── the adapter ─── */

const plus = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
/** The training an option adds up to (the hold reads it). */
const trainingOf = (c: GmChoiceDef) => Object.entries(c.fx ?? {})
  .reduce((n, [k, raw]) => n + (isTraining(k) && typeof raw === 'number' && raw > 0 ? raw : 0), 0);

/** One option answered: what it moves, landed, and one season log line
 *  saying what landed. Only ever called for an option that moves something. */
function landChoice(prev: CareerState, emoji: string, title: string, c: GmChoiceDef): CareerState {
  const s: CareerState = { ...prev };
  const said: string[] = [];
  if (c.morale) {
    const before = s.morale;
    s.morale = Math.max(0, Math.min(100, before + c.morale));
    const moved = s.morale - before;
    said.push(moved === 0 ? `Morale stays at ${s.morale}` : moved === c.morale ? `Morale ${plus(moved)}` : `Morale ${plus(moved)}, now at ${s.morale}`);
  }
  for (const [k, raw] of Object.entries(c.fx ?? {})) {
    const def = Object.prototype.hasOwnProperty.call(SOCCER_FX, k) ? SOCCER_FX[k] : undefined;
    if (!def || typeof raw !== 'number' || raw === 0) continue;
    const before = def.read(s);
    def.apply(s, raw);
    const moved = def.read(s) - before;
    said.push(moved === raw ? `${def.label} ${plus(moved)}` : `${def.label} ${plus(moved)}, you are at your ceiling`);
  }
  s.events = [...s.events, `${emoji} ${title}: ${c.reply} ${said.join(', ')}.`];
  return s;
}

/**
 * Deck cards as the between seasons batch's cards (the save validator's shape:
 * a number id, a title, words, and each choice's label and consequence). The
 * consequence is choiceEffects' words over the soccer registry, or "Nothing
 * changes" on the option that moves nothing, which returns the state untouched.
 */
export function deckToRandomEvents(pack: SoccerDeckPack, defs: readonly GmEventDef[]): RandomEvent[] {
  return defs.map(def => {
    const title = pack.titles[def.id];
    const choices: EventChoice[] = def.choices.map(c => {
      const still = gmNeutralIndex([c]) === 0;
      const trains = trainingOf(c) > 0;
      return {
        label: c.label,
        emoji: still ? '✋' : trains ? '📋' : '🤝',
        color: still ? 'bg-gray-800' : trains ? 'bg-blue-600' : 'bg-emerald-600',
        consequence: choiceEffects(c, pack, SOCCER_FX_WORDS).join(', ') || 'Nothing changes',
        apply: still ? (s: CareerState) => s : (s: CareerState) => landChoice(s, def.emoji, title, c),
      };
    });
    return { id: Number(def.id), emoji: def.emoji, title, description: def.text, category: pack.kinds[def.id], cooldown: def.cooldown ?? pack.cooldown, choices };
  });
}

/* ─── the slot and the pending reader ─── */

/**
 * At most one card of `pack` for this summer: [] when the pack has a problem,
 * the facts are null or nothing is eligible; else one gmTake draw from
 * keyedRng(key). `taken` is the old batch: a card sharing a ledger key with
 * one of its cards is never dealt beside it.
 */
export function dealFromPack(pack: SoccerDeckPack, state: CareerState, season: number, key: string, taken: readonly RandomEvent[]): RandomEvent[] {
  if (problemsOf(pack).length > 0) return [];
  const facts = soccerDeckFacts(state);
  if (!facts) return [];
  const room = facts.room as number;
  const inBatch = new Set(taken.map(e => ledgerKey(e)));
  const eligible = gmEligible(pack, 'summer', facts, [], state.eventLastFired ?? {}, season)
    .filter(e => e.choices.every(c => trainingOf(c) <= room) && !inBatch.has(ledgerKey(e)) && Number(e.id) !== state.lastEventId);
  if (eligible.length === 0) return [];
  return deckToRandomEvents(pack, [gmTake(eligible, keyedRng(key))]);
}

/**
 * The deck cards a saved batch holds, rebuilt from `pack` whatever the facts
 * say now (a saved card resolves by its id, the routines' rule), so the
 * engine's applyEventChoice finds the apply after a reload. [] outside the
 * random_events phase, so a deal never reads one.
 */
export function pendingFromPack(pack: SoccerDeckPack, state: CareerState): RandomEvent[] {
  if (state.phase !== 'random_events' || problemsOf(pack).length > 0) return [];
  const ids = new Set((state.pendingEvents ?? []).map(e => e.id).filter(id => id >= SOCCER_DECK_MIN_ID && id <= SOCCER_DECK_MAX_ID));
  if (ids.size === 0) return [];
  return deckToRandomEvents(pack, pack.events.filter(e => ids.has(Number(e.id))));
}

/** The shipped pack's slot: what the gate's soccerDeckSlot calls once loaded. */
export function dealSoccerDeck(state: CareerState, season: number, key: string, taken: readonly RandomEvent[]): RandomEvent[] {
  return dealFromPack(SOCCER_DECK_PACKS.soccer, state, season, key, taken);
}

/** The shipped pack's pending reader: what the gate's soccerDeckPending calls once loaded. */
export function pendingSoccerDeck(state: CareerState): RandomEvent[] {
  return pendingFromPack(SOCCER_DECK_PACKS.soccer, state);
}
