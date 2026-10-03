/*
   usCareerDeckC.ts, the one engine behind life deck C in all four US My
   Careers (Round 988).

   Rounds 917 to 920 each wrote a deck C of 36 cards for its sport, and each
   carried its own copy of the machinery: the clamps, the era money, the
   gamble, the trade, the words on the button and the words in the log. This
   file is that machinery once. A sport's deck file now holds its cards and a
   DeckCSport descriptor, and nothing else.

   What legitimately differs per sport is the descriptor, every field of
   which is something one of the four reviewed packs did on purpose:
     money      NBA, MLB and NHL pay to the cent; the NFL pays to the tenth
                and never less than a tenth.
     log        NBA, MLB and NHL report each stat that really moved, the
                rating with its new value; the NFL tallies what moved in one
                fixed order and says "No change" when nothing did.
     chip       NBA, MLB and NHL say which way a stat goes ("Rating up");
                the NFL prints the numbers ("Morale +5") and sells only even
                odds, as a "Coin flip".
     chipReadsSave  NBA and MLB leave a stat already at its limit off the
                button; the NHL's button does not read the save.
     ratingFloor    the NHL's drop stops at its deck A's 55, the rest at 50.
     tradeFans  an NBA trade starts the fans over at 44, decks A and B's move.

   THE WORDS ARE COMPUTED FROM THE EFFECT. An option is data (what moves and
   by how much); the button and the log line are both written from that data,
   so a card cannot say one thing and do another. scripts/simUsCareerDeckC.mjs
   checks it from the outside for all four sports at once, and replays every
   card against the digest recorded on the packs' own code before the lift.

   This file imports nothing from a sport, so it can never join the cycle
   between a sport's engine and its deck files.
*/

/** What an option moves. Money is in millions of today's dollars and is paid
 *  in the career's own era money: earned is pay (career earnings and net
 *  worth), netWorth is spending or a windfall and leaves earnings alone. */
export interface DeckCFx {
  rating?: number;
  morale?: number;
  fanbase?: number;
  health?: number;
  netWorth?: number;
  earned?: number;
}

/** Words fixed on the card, or written from the save it is dealt on. */
export type DeckCText<S> = string | ((c: S) => string);

/** move: 'trade' is a trade, 'claim' a waiver claim. Either way the contract
 *  goes with the player and only the team changes, inside the career's era. */
export interface DeckCOutcome<S> { say: DeckCText<S>; fx: DeckCFx; move?: 'trade' | 'claim' }
type Extra = { flag?: string };
export type DeckCSure<S> = { label: DeckCText<S> } & DeckCOutcome<S> & Extra;
export type DeckCGamble<S> = { label: DeckCText<S>; p: number; win: DeckCOutcome<S>; lose: DeckCOutcome<S> } & Extra;
export type DeckCOptionDef<S> = DeckCSure<S> | DeckCGamble<S>;

/** One card: its gate (when), its words and its options, as data, so a card
 *  can be rebuilt from its id on any save. */
export interface DeckCDef<S, K extends string = string> {
  id: string;
  category: K;
  cooldown: number;
  story?: string;
  when: (c: S) => boolean;
  title: DeckCText<S>;
  body: DeckCText<S>;
  options: DeckCOptionDef<S>[];
}

export interface DeckCOption<S> { label: string; effect: string; apply: (c: S, rng: () => number) => string }
export interface DeckCCard<S, K extends string = string> {
  id: string;
  category: K;
  cooldown: number;
  story?: string;
  title: string;
  body: string;
  options: DeckCOption<S>[];
}

/** The fields every sport's career carries and deck C moves. */
export interface DeckCCareer { morale: number; fanbase: number; health: number; ovr: number; pot: number }
/* Net worth, earnings, team and the flags exist on every sport's save but are
   typed differently (the NFL's net worth is optional and not on its type). */
type Loose = DeckCCareer & { netWorth?: number; earnings?: number; team?: string; lifeFlags?: Record<string, number> };
const loose = (c: DeckCCareer): Loose => c as Loose;

export interface DeckCSport<S extends DeckCCareer> {
  /** The era's money against today's: 1 in today's league. */
  moneyScale: (c: S) => number;
  /** 'cents': an amount is the era's money to the cent and net worth is kept
   *  to the cent. 'tenths': to the tenth, never under a tenth, and net worth
   *  kept to the tenth. */
  money: 'cents' | 'tenths';
  /** 'report': the story, then each stat that really moved ("Rating +1 to
   *  72, morale +3."), nothing when nothing moved. 'tally': the story, then
   *  what moved in one fixed order ("Morale +5, net worth -0.3M."), or "No
   *  change." */
  log: 'report' | 'tally';
  /** 'directions': "Rating up, money out", a gamble "Could go either way: x,
   *  or y". 'numbers': "Morale +5, health -2" in the order the card writes
   *  them, a gamble "Coin flip: x or y" (even odds only). */
  chip: 'directions' | 'numbers';
  /** A directions chip leaves out a stat already at its limit on the save. */
  chipReadsSave: boolean;
  /** The lowest a drop takes a rating; 50 when not given. */
  ratingFloor?: (before: number) => number;
  /** A traded player's fans start over at this number, and the line says so. */
  tradeFans?: number;
  /** The career's era's teams and their names, for a trade or a claim. */
  teamIds?: (c: S) => string[];
  teamLabel?: (id: string, c: S) => string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);
const capital = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lower = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);
const text = <S>(t: DeckCText<S>, c: S): string => (typeof t === 'function' ? t(c) : t);
const keep = <S extends DeckCCareer>(sport: DeckCSport<S>) => (sport.money === 'cents' ? round2 : r1);

/** One amount in the career's era money, rounded the sport's way. */
export function deckCMoney<S extends DeckCCareer>(sport: DeckCSport<S>, c: S, m: number): number {
  const scaled = sport.moneyScale(c) * m;
  if (sport.money === 'cents') return round2(scaled);
  return m === 0 ? 0 : Math.sign(m) * Math.max(0.1, r1(Math.abs(scaled)));
}

/** What really moved, after every clamp. */
interface Moved { rating: number; morale: number; fanbase: number; health: number; earned: number; netWorth: number; cash: number }

/** The one place deck C moves a career. Growth stays inside the potential
 *  headroom (pot + 1, the ceiling decks A and B use) and a raise never lowers
 *  a rating; the meters run 0 to 100. */
function land<S extends DeckCCareer>(sport: DeckCSport<S>, c: S, fx: DeckCFx): Moved {
  const s = loose(c);
  const keepTo = keep(sport);
  const nw0 = s.netWorth ?? 0;
  const m: Moved = { rating: 0, morale: 0, fanbase: 0, health: 0, earned: 0, netWorth: 0, cash: 0 };
  if (fx.rating) {
    const before = c.ovr;
    const next = fx.rating > 0 ? Math.max(before, Math.min(c.pot + 1, before + fx.rating)) : before + fx.rating;
    c.ovr = clamp(next, sport.ratingFloor ? sport.ratingFloor(before) : 50, 99);
    m.rating = c.ovr - before;
  }
  for (const key of ['morale', 'fanbase', 'health'] as const) {
    const d = fx[key];
    if (!d) continue;
    const before = c[key];
    c[key] = clamp(before + d, 0, 100);
    m[key] = c[key] - before;
  }
  if (fx.earned) {
    m.earned = deckCMoney(sport, c, fx.earned);
    s.earnings = keepTo((s.earnings ?? 0) + m.earned);
    s.netWorth = keepTo((s.netWorth ?? 0) + m.earned);
  }
  if (fx.netWorth) {
    m.netWorth = deckCMoney(sport, c, fx.netWorth);
    s.netWorth = keepTo((s.netWorth ?? 0) + m.netWorth);
  }
  m.cash = keepTo((s.netWorth ?? 0) - nw0);
  return m;
}

/** 'report' words: each stat that moved, the rating with its new value. */
function report(m: Moved, c: DeckCCareer): string {
  const parts: string[] = [];
  if (m.rating) parts.push(`rating ${signed(m.rating)} to ${c.ovr}`);
  if (m.morale) parts.push(`morale ${signed(m.morale)}`);
  if (m.fanbase) parts.push(`fanbase ${signed(m.fanbase)}`);
  if (m.health) parts.push(`health ${signed(m.health)}`);
  if (m.earned) parts.push(`earned ${m.earned}M`);
  if (m.netWorth) parts.push(`net worth ${signed(m.netWorth)}M`);
  return parts.length ? `${capital(parts.join(', '))}.` : '';
}

/** 'tally' words: what moved in one fixed order, or "No change". */
function tally(m: Moved): string {
  const bits: string[] = [];
  if (m.morale) bits.push(`morale ${signed(m.morale)}`);
  if (m.fanbase) bits.push(`fanbase ${signed(m.fanbase)}`);
  if (m.health) bits.push(`health ${signed(m.health)}`);
  if (m.rating) bits.push(`rating ${signed(m.rating)}`);
  if (m.cash) bits.push(`net worth ${signed(m.cash)}M`);
  return bits.length ? capital(bits.join(', ')) : 'No change';
}

/** Applies an effect and returns the 'report' words for what really moved
 *  (empty when nothing did). */
export function applyDeckCFx<S extends DeckCCareer>(sport: DeckCSport<S>, c: S, fx: DeckCFx): string {
  return report(land(sport, c, fx), c);
}

/** A trade under tradeFans moves the fans to that number, written as the
 *  move it makes on this save, so the chip and the log both see it. */
const fxOn = <S extends DeckCCareer>(sport: DeckCSport<S>, o: { fx: DeckCFx; move?: 'trade' | 'claim' }, c: S): DeckCFx =>
  (o.move === 'trade' && sport.tradeFans !== undefined ? { ...o.fx, fanbase: sport.tradeFans - c.fanbase } : o.fx);

/** Whether a stat can still move that way on this save, under the clamps
 *  land uses. */
function canMove<S extends DeckCCareer>(sport: DeckCSport<S>, c: S, key: 'rating' | 'morale' | 'fanbase' | 'health', d: number): boolean {
  if (key === 'rating') return d > 0 ? c.ovr < Math.min(c.pot + 1, 99) : c.ovr > (sport.ratingFloor ? sport.ratingFloor(c.ovr) : 50);
  return d > 0 ? c[key] < 100 : c[key] > 0;
}

/** The numbers, in the order the card writes them: "Morale +5, net worth -0.3M". */
function numbers<S extends DeckCCareer>(sport: DeckCSport<S>, fx: DeckCFx, c: S): string {
  const bits: string[] = [];
  for (const [k, v] of Object.entries(fx) as [keyof DeckCFx, number | undefined][]) {
    if (!v) continue;
    if (k === 'netWorth') bits.push(`net worth ${signed(deckCMoney(sport, c, v))}M`);
    else if (k === 'earned') bits.push(`earned ${deckCMoney(sport, c, v)}M`);
    else bits.push(`${k} ${signed(v)}`);
  }
  return bits.length ? capital(bits.join(', ')) : 'No change';
}

/** The short promise on a 'directions' button. Given the save it is shown
 *  on (and a sport whose chip reads it), a stat already at its ceiling or
 *  floor is left out, so "health up" is never shown to a player at 100. */
export function deckCChip<S extends DeckCCareer>(sport: DeckCSport<S>, o: { fx: DeckCFx; move?: 'trade' | 'claim' }, c?: S): string {
  const save = sport.chipReadsSave ? c : undefined;
  const fx = save ? fxOn(sport, o, save) : o.fx;
  const bits: string[] = [];
  const dir = (name: string, key: 'rating' | 'morale' | 'fanbase' | 'health') => {
    const d = fx[key];
    if (d && (!save || canMove(sport, save, key, d))) bits.push(`${name} ${d > 0 ? 'up' : 'down'}`);
  };
  dir('rating', 'rating');
  dir('morale', 'morale');
  dir('fans', 'fanbase');
  dir('health', 'health');
  const cash = save
    ? deckCMoney(sport, save, fx.earned ?? 0) + deckCMoney(sport, save, fx.netWorth ?? 0)
    : (fx.earned ?? 0) + (fx.netWorth ?? 0);
  if (cash) bits.push(cash > 0 ? 'money in' : 'money out');
  if (o.move) bits.push('new team');
  return bits.length ? bits.join(', ') : 'no change';
}

/** Plays one outcome on the career and returns the line the player reads. */
function settle<S extends DeckCCareer>(sport: DeckCSport<S>, cc: S, r: () => number, o: DeckCOutcome<S>): string {
  const story = text(o.say, cc);
  const fx = fxOn(sport, o, cc);
  let moved = '';
  if (o.move) {
    /* inside the career's own era, and the contract goes with the player:
       salary and years are not touched */
    const s = loose(cc);
    const pool = (sport.teamIds ? sport.teamIds(cc) : []).filter(id => id !== s.team);
    const next = pool[Math.floor(r() * pool.length)];
    s.team = next;
    const where = sport.teamLabel ? sport.teamLabel(next, cc) : next;
    moved = `${o.move === 'claim' ? 'Claimed by' : 'Traded to'} ${where}${sport.tradeFans !== undefined ? ', where the fans start over' : ''}.`;
  }
  const m = land(sport, cc, fx);
  const words = sport.log === 'tally' ? `${tally(m)}.` : report(m, cc);
  return [story, moved, words].filter(Boolean).join(' ');
}

const bump = (c: DeckCCareer, k: string) => {
  const s = loose(c);
  s.lifeFlags = { ...(s.lifeFlags || {}), [k]: ((s.lifeFlags || {})[k] || 0) + 1 };
};

/** One button, for the save it is shown on. */
export function deckCOption<S extends DeckCCareer>(sport: DeckCSport<S>, o: DeckCOptionDef<S>, c: S): DeckCOption<S> {
  const say = (x: { fx: DeckCFx; move?: 'trade' | 'claim' }) => (sport.chip === 'numbers' ? numbers(sport, x.fx, c) : deckCChip(sport, x, c));
  if ('p' in o) {
    const effect = sport.chip === 'numbers'
      ? `Coin flip: ${lower(say(o.win))} or ${lower(say(o.lose))}`
      : `Could go either way: ${say(o.win)}, or ${say(o.lose)}`;
    return {
      label: text(o.label, c),
      effect,
      apply: (cc, r) => {
        if (o.flag) bump(cc, o.flag);
        return settle(sport, cc, r, r() < o.p ? o.win : o.lose);
      },
    };
  }
  return {
    label: text(o.label, c),
    effect: capital(say(o)),
    apply: (cc, r) => {
      if (o.flag) bump(cc, o.flag);
      return settle(sport, cc, r, o);
    },
  };
}

/** One card, built for this career: its words are written from this save.
 *  Works on any save, eligible or not. */
export function buildDeckCCard<S extends DeckCCareer, K extends string>(sport: DeckCSport<S>, def: DeckCDef<S, K>, c: S): DeckCCard<S, K> {
  return {
    id: def.id,
    category: def.category,
    cooldown: def.cooldown,
    ...(def.story ? { story: def.story } : {}),
    title: text(def.title, c),
    body: text(def.body, c),
    options: def.options.map(o => deckCOption(sport, o, c)),
  };
}

/** The cards of a catalog whose gate holds on this save. Draws nothing from
 *  the rng, so adding a deck moves nothing in the stream before the pick. */
export function dealDeckC<S extends DeckCCareer, K extends string>(sport: DeckCSport<S>, catalog: DeckCDef<S, K>[], c: S): DeckCCard<S, K>[] {
  return catalog.filter(d => d.when(c)).map(d => buildDeckCCard(sport, d, c));
}
