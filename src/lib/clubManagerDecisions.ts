/**
 * Round 979: the decisions desk. Two things land on the manager's desk
 * between matches now, and both sit in the inbox.
 *
 *  1. A red card appeal. Suspensions were real in the engine but a straight
 *     red was never a decision: the ban was written at the whistle and served.
 *     After a straight red the club secretary now puts an appeal on the desk
 *     with the odds stated in plain numbers. Win and the ban is wiped, lose
 *     and the panel adds a match, or accept it and nothing moves. A second
 *     yellow is not appealable (it is two bookings, not one decision), so it
 *     never gets a card.
 *  2. A small deck of situations, each with two or three answers. Every answer
 *     moves at most ONE number the engine already keeps (board patience, fan
 *     mood, press mood, one player's morale, the transfer budget) and its
 *     label is generated from that move, so the words on the button are the
 *     effect and cannot drift from it. One answer on every card moves nothing.
 *
 * Nothing in here draws from Math.random. Whether a situation is offered and
 * how an appeal goes are read off a hash of the save, the season, the week
 * and the card, so the match engine's random stream is exactly the stream it
 * was before this round, and a manager who never answers (or declines every
 * card) plays the season main would have played, to the byte, apart from this
 * block itself. scripts/simClubManagerDecisions.mjs holds that line.
 *
 * Every speaker is a role (the club secretary, the board, the head coach, the
 * supporters trust, the press officer). A squad player is only ever written
 * about, never quoted, and nothing here invents misconduct by a real man.
 *
 * The block is optional on the save: absent on every save from before the
 * round, read through deskOf so a damaged block reads as empty and is
 * replaced at the next write, and nothing else in the save is touched.
 */
import type { CareerState } from '@/lib/clubManager';
import { money } from '@/lib/clubManager';
import { isValidBooks } from '@/lib/clubManagerFinances';

/** A number the desk is allowed to move. One per answer, at most. */
export type DeskMeter = 'board' | 'fans' | 'press' | 'morale' | 'budget';

export type DeskEffect =
  | { kind: 'appeal' }
  | { kind: 'acceptBan' }
  | { kind: 'move'; meter: DeskMeter; delta: number }
  | { kind: 'none' };

export interface DeskOption {
  label: string;
  effect: DeskEffect;
}

export interface DeskItem {
  /** Always starts 'desk-', which is how answerMessage routes it here. */
  id: string;
  kind: 'appeal' | 'situation';
  season: number;
  /** state.week when the card was written, i.e. just after that match. */
  week: number;
  /** A role, never a real person. */
  from: string;
  text: string;
  options: DeskOption[];
  /** Set once answered or once the next match closes it. */
  resolved?: string;
  /** Appeal and morale cards: whose card it is. */
  playerId?: string;
  playerName?: string;
  /** Appeal: the ban as written at the whistle, in matches. */
  ban?: number;
  /** Appeal: the stated chance of winning, in whole percent. */
  odds?: number;
  /** Situation: which card of the deck. */
  deckId?: string;
  /** Appeal: how it went, once answered (for the screen and the harness). */
  outcome?: 'won' | 'lost' | 'accepted' | 'expired';
}

/** The desk keeps this many cards, newest first. */
export const DESK_CAP = 6;

/** Appeal odds by how many reds he has this season, this one included. */
export const APPEAL_ODDS = [40, 25, 15] as const;

/** A lost appeal adds this many matches. The harness control zeroes it. */
export const APPEAL_LOSS_EXTRA = 1;

/** Share of matches after which a situation lands, when the desk is clear. */
export const SITUATION_RATE = 0.3;

/* ---------- the validator ---------- */

function isValidEffect(e: unknown): e is DeskEffect {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  if (o.kind === 'appeal' || o.kind === 'acceptBan' || o.kind === 'none') return true;
  return o.kind === 'move'
    && ['board', 'fans', 'press', 'morale', 'budget'].includes(o.meter as string)
    && typeof o.delta === 'number' && Number.isFinite(o.delta);
}

export function isValidDeskItem(x: unknown): x is DeskItem {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === 'string' && o.id.startsWith('desk-')
    && (o.kind === 'appeal' || o.kind === 'situation')
    && Number.isInteger(o.season) && Number.isInteger(o.week)
    && typeof o.from === 'string' && typeof o.text === 'string'
    && Array.isArray(o.options)
    && (o.options as unknown[]).every(op => !!op && typeof op === 'object'
      && typeof (op as DeskOption).label === 'string' && isValidEffect((op as DeskOption).effect))
    && (o.resolved === undefined || typeof o.resolved === 'string')
    && (o.kind !== 'appeal' || (typeof o.playerId === 'string' && Number.isInteger(o.ban) && Number.isInteger(o.odds)));
}

/** The desk for reading. A damaged block reads as empty, nothing else moves. */
export function deskOf(state: Pick<CareerState, 'decisions'>): DeskItem[] {
  const d = state.decisions;
  return Array.isArray(d) && d.every(isValidDeskItem) ? d : [];
}

/** Cards still waiting on an answer. */
export function pendingDecisions(state: Pick<CareerState, 'decisions'>): DeskItem[] {
  return deskOf(state).filter(d => !d.resolved);
}

/* ---------- the desk's own dice ---------- */

/** FNV-1a over the key, then a mulberry style finaliser, to a number in [0, 1). */
export function deskRoll(key: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let t = (h + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function saveKey(state: Pick<CareerState, 'clubName' | 'manager'>): string {
  return `${state.clubName}|${state.manager?.name ?? ''}`;
}

/** The stated odds for a man on his nth red of the season (this one counted). */
export function appealOddsFor(seasonReds: number): number {
  const n = Math.max(1, Math.floor(seasonReds || 1));
  return APPEAL_ODDS[Math.min(n, APPEAL_ODDS.length) - 1];
}

/** How an appeal goes. Read off the card and the save, never off Math.random. */
export function appealWins(item: Pick<DeskItem, 'id' | 'odds'>, state: Pick<CareerState, 'clubName' | 'manager'>): boolean {
  return deskRoll(`${item.id}|${saveKey(state)}|verdict`) < (item.odds ?? 0) / 100;
}

/* ---------- the words on the button ---------- */

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 'es'}`;
const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

/** The effect in words. Every label on the desk ends in exactly this. */
export function effectWords(effect: DeskEffect, state?: CareerState): string {
  if (effect.kind !== 'move') return 'nothing changes';
  switch (effect.meter) {
    case 'board': return `board patience ${signed(effect.delta)}`;
    case 'fans': return `fan mood ${signed(effect.delta)}`;
    case 'press': return `press mood ${signed(effect.delta)}`;
    case 'morale': return `his morale ${signed(effect.delta)}`;
    case 'budget':
      return effect.delta >= 0
        ? `${money(effect.delta, state)} into the transfer budget`
        : `${money(-effect.delta, state)} out of the transfer budget`;
  }
}

/* ---------- the deck ---------- */

export interface DeckCard {
  id: string;
  from: string;
  /** Whether the numbers this card moves exist on this save right now. */
  fits: (state: CareerState) => boolean;
  /** The card needs a squad player to be about, and this is who. */
  who?: (state: CareerState) => { id: string; name: string; morale: number } | null;
  text: (state: CareerState, who: { name: string; morale: number } | null) => string;
  options: { verb: string; effect: DeskEffect }[];
}

const hasFans = (s: CareerState): boolean => isValidBooks(s.books);
const hasPress = (s: CareerState): boolean => !!s.press && typeof s.press.mood === 'number' && Number.isFinite(s.press.mood);
const move = (meter: DeskMeter, delta: number): DeskEffect => ({ kind: 'move', meter, delta });
const NONE: DeskEffect = { kind: 'none' };

/** The man whose head has dropped furthest, if anybody's has. */
function lowestMorale(s: CareerState): { id: string; name: string; morale: number } | null {
  const p = s.squad
    .filter(x => !x.isYouth && x.morale < 55)
    .sort((a, b) => a.morale - b.morale || a.id.localeCompare(b.id))[0];
  return p ? { id: p.id, name: p.name, morale: Math.round(p.morale) } : null;
}

/**
 * The deck. Each answer moves one number or none, and the last answer on
 * every card moves none, so declining is always on the table and always free.
 */
export const DECK: DeckCard[] = [
  {
    id: 'promoShoot', from: 'The commercial team', fits: hasFans,
    text: s => `A sponsor wants the squad at a photo shoot on the day off and will pay ${money(0.2, s)} for the afternoon. The supporters trust has asked for the same afternoon for an open day at the training ground.`,
    options: [
      { verb: 'Do the shoot', effect: move('budget', 0.2) },
      { verb: 'Give the afternoon to the fans', effect: move('fans', 4) },
      { verb: 'Give the squad the day off', effect: NONE },
    ],
  },
  {
    id: 'investorsNight', from: 'The board', fits: hasPress,
    text: () => 'The board want you at an investors dinner on Thursday. A paper has asked for a long sit down interview the same evening.',
    options: [
      { verb: 'Go to the dinner', effect: move('board', 3) },
      { verb: 'Do the interview', effect: move('press', 4) },
      { verb: 'Do neither', effect: NONE },
    ],
  },
  {
    id: 'quietWord', from: 'The head coach', fits: () => true, who: lowestMorale,
    text: (_s, who) => `The head coach flags ${who?.name ?? 'one of the squad'}: his morale is down at ${who?.morale ?? 0}, the lowest in the first team squad, and a word from the manager would help.`,
    options: [
      { verb: 'Take him for a coffee', effect: move('morale', 6) },
      { verb: 'Leave it to the coach', effect: NONE },
    ],
  },
  {
    id: 'schoolVisit', from: 'The community department', fits: hasFans,
    text: () => 'A local school has asked for a first team visit, and the community department would like the manager to front it.',
    options: [
      { verb: 'Go yourself', effect: move('fans', 3) },
      { verb: 'Send a signed shirt instead', effect: NONE },
    ],
  },
  {
    id: 'columnist', from: 'The press officer', fits: hasPress,
    text: () => 'A columnist has written that your side has no plan. The press officer wants to know whether you will answer it.',
    options: [
      { verb: 'Answer it calmly at the next presser', effect: move('press', 3) },
      { verb: 'Say nothing', effect: NONE },
    ],
  },
  {
    id: 'spareFunds', from: 'The board', fits: () => true,
    text: s => `There is ${money(0.2, s)} left in this year's facilities budget. The board will move it to the transfer pot if you ask, though they would rather it stayed where it is.`,
    options: [
      { verb: 'Move it to the transfer pot', effect: move('budget', 0.2) },
      { verb: 'Leave it where it is', effect: move('board', 2) },
      { verb: 'Tell them it is their call', effect: NONE },
    ],
  },
  {
    id: 'finesKitty', from: 'The head coach', fits: hasFans,
    text: s => `The squad's fines kitty has ${money(0.1, s)} in it from late arrivals and phones in meetings. The head coach asks where it should go.`,
    options: [
      { verb: "Give it to the club's community partner", effect: move('fans', 2) },
      { verb: 'Put it in the transfer pot', effect: move('budget', 0.1) },
      { verb: 'Leave it in the kitty', effect: NONE },
    ],
  },
];

/** A button's words: what you do, then exactly what it moves. */
export function optionLabel(verb: string, effect: DeskEffect, state?: CareerState): string {
  return `${verb} (${effectWords(effect, state)})`;
}

/* ---------- the whistle: close the old cards, write the new ones ---------- */

function capDesk(desk: DeskItem[]): DeskItem[] {
  if (desk.length <= DESK_CAP) return desk;
  /* Never drop a card still waiting on an answer; the oldest answered go first. */
  const keep = new Set(desk.filter(d => !d.resolved).map(d => d.id));
  for (const d of desk) {
    if (keep.size >= DESK_CAP) break;
    keep.add(d.id);
  }
  return desk.filter(d => keep.has(d.id));
}

/** An appeal card for a man just sent off with a straight red, or null. */
export function appealCard(state: CareerState, playerId: string, opponent: string): DeskItem | null {
  const p = state.squad.find(x => x.id === playerId);
  if (!p || p.suspendedMatches <= 0) return null;
  const ban = p.suspendedMatches;
  const odds = appealOddsFor(p.seasonReds ?? 1);
  const worse = ban + APPEAL_LOSS_EXTRA;
  const record = (p.seasonReds ?? 1) > 1 ? ` It is his ${ordinal(p.seasonReds ?? 1)} red of the season, which the panel will not ignore.` : '';
  return {
    id: `desk-${state.season}-${state.week}-appeal-${p.id}`,
    kind: 'appeal', season: state.season, week: state.week,
    from: 'The club secretary',
    text: `${p.name} was shown a straight red against ${opponent} and is banned for ${plural(ban, 'match')}. The club secretary rates an appeal at ${odds} percent.${record} Win and the ban is wiped. Lose and the panel makes it ${plural(worse, 'match')}. It has to go in before the next match.`,
    options: [
      { label: `Appeal (${odds}% to wipe the ban, or it becomes ${plural(worse, 'match')})`, effect: { kind: 'appeal' } },
      { label: `Accept the ban (${plural(ban, 'match')}, nothing changes)`, effect: { kind: 'acceptBan' } },
    ],
    playerId: p.id, playerName: p.name, ban, odds,
  };
}

function ordinal(n: number): string {
  return n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`;
}

/** A situation card off the deck for this week, or null when none lands. */
export function situationCard(state: CareerState, desk: DeskItem[]): DeskItem | null {
  const key = `${saveKey(state)}|${state.season}|${state.week}`;
  if (deskRoll(`${key}|offer`) >= SITUATION_RATE) return null;
  const last = desk.find(d => d.kind === 'situation')?.deckId;
  const open = DECK.filter(c => c.id !== last && c.fits(state) && (!c.who || !!c.who(state)));
  if (!open.length) return null;
  return buildSituation(state, open[Math.floor(deskRoll(`${key}|pick`) * open.length)]);
}

/** One deck card written for this save and week. Exported for the harness,
 *  which walks every answer of every card from real mid season states. */
export function buildSituation(state: CareerState, card: DeckCard): DeskItem {
  const who = card.who ? card.who(state) : null;
  return {
    id: `desk-${state.season}-${state.week}-${card.id}`,
    kind: 'situation', season: state.season, week: state.week,
    from: card.from,
    text: card.text(state, who),
    options: card.options.map(o => ({ label: optionLabel(o.verb, o.effect, state), effect: o.effect })),
    deckId: card.id,
    ...(who ? { playerId: who.id, playerName: who.name } : {}),
  };
}

/**
 * Called once at the end of every match you play, with the ids of your men
 * shown a straight red in it. Anything still open from before this match is
 * closed with nothing moved (an appeal not lodged is a ban served), then the
 * new appeals go on the desk, then maybe one situation. Writes state.decisions
 * and nothing else, and draws nothing from Math.random.
 */
export function settleDecisionDesk(state: CareerState, straightReds: string[], opponent: string): void {
  const before = deskOf(state);
  let desk: DeskItem[] = before.map(d => {
    if (d.resolved) return d;
    return d.kind === 'appeal'
      ? { ...d, outcome: 'expired' as const, resolved: `No appeal went in before the next match, so the ${plural(d.ban ?? 0, 'match')} ban stood.` }
      : { ...d, resolved: 'Nobody answered before the next match, so nothing changed.' };
  });
  const fresh: DeskItem[] = [];
  for (const id of straightReds) {
    const card = appealCard(state, id, opponent);
    if (card && !desk.some(d => d.id === card.id)) fresh.push(card);
  }
  const situation = situationCard(state, desk);
  if (situation && !desk.some(d => d.id === situation.id)) fresh.push(situation);
  desk = capDesk([...fresh, ...desk]);
  if (desk.length || state.decisions !== undefined) state.decisions = desk;
}

/* ---------- the answer ---------- */

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Answer a desk card. Pure: hands back a new state, or the same one when the
 * card is gone, already answered, or the option does not exist. An appeal
 * moves only that man's suspendedMatches, a situation answer moves only the
 * one number its label names, and a decline moves nothing but the card.
 */
export function answerDecision(career: CareerState, id: string, optionIdx: number): CareerState {
  const desk = deskOf(career);
  const item = desk.find(d => d.id === id);
  if (!item || item.resolved) return career;
  const opt = item.options[optionIdx];
  if (!opt) return career;
  const close = (resolved: string, outcome?: DeskItem['outcome'], extra: Partial<CareerState> = {}): CareerState => ({
    ...career,
    ...extra,
    decisions: desk.map(d => (d.id === id ? { ...d, resolved, ...(outcome ? { outcome } : {}) } : d)),
  });
  const effect = opt.effect;

  if (effect.kind === 'acceptBan') {
    return close(`Accepted. ${item.playerName ?? 'He'} serves the ${plural(item.ban ?? 0, 'match')} ban.`, 'accepted');
  }
  if (effect.kind === 'appeal') {
    const p = career.squad.find(x => x.id === item.playerId);
    /* The ban he is appealing is the ban as written. If it has started being
       served, or he has gone, there is nothing left to appeal. */
    if (!p || p.suspendedMatches !== item.ban) {
      return close('Too late to appeal. The ban stands as it was.', 'expired');
    }
    const won = appealWins(item, career);
    const next = won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA;
    const squad = career.squad.map(x => (x.id === p.id ? { ...x, suspendedMatches: next } : x));
    return won
      ? close(`Appeal won. The ban is wiped and ${p.name} is available for the next match.`, 'won', { squad })
      : close(`Appeal lost. The panel made it ${plural(next, 'match')}.`, 'lost', { squad });
  }
  if (effect.kind === 'none') return close('Noted. Nothing changed.');

  const { meter, delta } = effect;
  if (meter === 'board') {
    const boardConfidence = clamp(career.boardConfidence + delta, 1, 100);
    return close(`Done. Board patience ${signed(round1(boardConfidence - career.boardConfidence))}.`, undefined, { boardConfidence });
  }
  if (meter === 'fans') {
    if (!isValidBooks(career.books)) return close('Noted. Nothing changed.');
    const fanMood = clamp(round1(career.books.fanMood + delta), 0, 100);
    return close(`Done. Fan mood ${signed(round1(fanMood - career.books.fanMood))}.`, undefined, { books: { ...career.books, fanMood } });
  }
  if (meter === 'press') {
    if (!career.press) return close('Noted. Nothing changed.');
    const mood = clamp(career.press.mood + delta, 0, 100);
    return close(`Done. Press mood ${signed(round1(mood - career.press.mood))}.`, undefined, { press: { ...career.press, mood } });
  }
  if (meter === 'morale') {
    const p = career.squad.find(x => x.id === item.playerId);
    if (!p) return close('He has moved on, so nothing changed.');
    const morale = clamp(p.morale + delta, 5, 99);
    const squad = career.squad.map(x => (x.id === p.id ? { ...x, morale } : x));
    return close(`Done. ${p.name}'s morale ${signed(round1(morale - p.morale))}.`, undefined, { squad });
  }
  /* Exactly the stated amount: a budget can carry hundredths, so snapping the
     sum to a tenth could move it by more or less than the button says. */
  const budget = Math.round((career.budget + delta) * 1000) / 1000;
  return close(`Done. ${effectWords({ kind: 'move', meter: 'budget', delta: round1(budget - career.budget) }, career)}.`, undefined, { budget });
}
