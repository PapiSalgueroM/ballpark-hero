/* Round 1500: what to do with dirty money, one desk for every career that can hold it.

   Player report (/nba-my-career, 2026-10-16): "i got shady money and i want to wash it". The four US My Careers
   deal dirty money (millions nobody can explain) from their corruption decks, and every season it is held the
   heat rises until a suspension seizes it. The only way out was three one time washers at the back of the shop,
   and the one card about it ("The money has nowhere to live") offered to launder it, added heat and left every
   dollar dirty. This module is the way out, in four plain choices that print their cost before you choose:

     Come clean    pay it all back plus a fine. Heat falls a little, karma rises a little.
     Give it away  it all goes to charity. Karma rises, heat stays where it is.
     Keep it quiet nothing changes, and it keeps burning.
     Wash it       heat +10 now and a chance of getting caught that grows with the heat, printed as a whole
                   percent and drawn against that same whole percent. Caught: the money is seized and you are
                   suspended. Not caught: 70 percent of it comes out as clean money.

   NEVER A HEAT ERASER OR A KARMA FARM (the critic's correction 2, binding). The amounts are capped and scale with
   the money, so no corrupt choice followed by the desk ever leaves the heat lower than before that choice, and the
   heat and karma the desk hands back never add up to more than the choice cost in heat. The smallest heat any
   corruption card charges for dirty money is 9; two life cards pay some too, NFL's cousin at the register (0.6M for
   heat 8, the floor that binds: 5 heat and 3 karma is exactly 8) and NHL's brewery stake (0.05M for no heat, under
   the whole million any hand back needs). scripts/simUsDirtyMoney.mjs section 7 deals all of them, proves both on a
   fleet and fails if any other file starts paying dirty money. Come clean hands back at most 5 heat and 3 karma,
   Give it away at most 6 karma, and at heat 100 nothing
   cools (a card taken at the top of the meter added less than it printed). The one time card's own declare
   option stays the bigger, rarer deal.

   HONEST ABOUT A BAN (correction 3, binding). The preview plays the season ends the way the four engines do
   (nbaMyCareer.ts 917 to 931 and its three copies: with no dirty money held heat cools 9 a season, and at 90 or
   more the league suspends you once nothing is pending) and prints the seasons it will cost, so a wash at the top
   of the meter says it ends in a suspension whether or not you are caught.

   KEYED, NEVER Math.random. The wash is decided by one keyedRng draw on the career's own key (its summer salt or
   its name, the year, the seasons played and the money in tenths), so a reload cannot re-roll it and the season's
   stream is left exactly where it was. Pure apart from launderDirtyMoney, which mutates because the deck cards'
   contract is to mutate and return the feed line (nbaCareerCorruption.ts 20 to 21).

   TWO FILES, ONE RULE. This file is what the four corruption decks, the board and the pages' help need at first
   load: the numbers, the apply, the draw and the card. The desk's button words and its apply on a copy
   (wayLines, previewDirty, dealWithDirtyMoney) are in careerDirtyMoneyDesk.ts, which only the lazy desk imports,
   so they stay out of the four pages' first load; they run this file's numbers and add no rule.

   The fields are the US careers' (src/lib/usCareerSport.ts UsCareerCore); a career that names them differently
   binds through an adapter, so Soccer Career's own laundering can join later without a rename. No sport is
   imported here: the board and the four corruption decks import this, never the reverse. */
import { keyedRng } from '@/lib/keyedRng';

export type DirtyWay = 'clean' | 'give' | 'quiet' | 'wash';
/** In the order the desk draws them. */
export const DIRTY_WAYS: readonly DirtyWay[] = ['clean', 'give', 'quiet', 'wash'];

/** What the desk reads and writes on a career. */
export interface DirtyMoneyHost {
  name: string;
  year: number;
  seasons: readonly unknown[];
  retired?: boolean;
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  fanbase: number;
  morale: number;
  karma?: number;
  suspendedSeasons?: number;
  summerSalt?: string;
}

/* The tuning. Every number a button prints comes from here, through wayNumbers. */
export const CLEAN_FINE_RATE = 0.1;
export const CLEAN_HEAT_CAP = 5;
export const CLEAN_KARMA_CAP = 3;
export const GIVE_KARMA_CAP = 6;
export const WASH_KEEP = 0.7;
export const WASH_HEAT = 10;
export const WASH_CATCH_FLOOR = 0.15;
export const WASH_CATCH_CEIL = 0.55;
export const CAUGHT_FANBASE = 30;
export const CAUGHT_MORALE = 25;
/* The four engines' season end, read here and never changed (see the header). */
const SEASON_COOL = 9;
const BAN_HEAT = 90;

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
/** Money as the desk prints it: a tenth of a million, or a hundredth when the amount holds one (the NHL keeps
 *  hundredths, and its brewery pays 0.05M, which must not read as 0.1M). */
export const moneyText = (v: number): string => { const r = round2(v); return `${round1(r) === r ? r.toFixed(1) : r.toFixed(2)}M`; };
const m = moneyText;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Dirty money the career holds, as the board prints it. */
export function dirtyHeld(c: Pick<DirtyMoneyHost, 'dirtyMoney'>): number {
  return Math.max(0, c.dirtyMoney ?? 0);
}

/** Whether the desk has anything to do: dirty money held by a career still playing. */
export function canDealWithDirtyMoney(c: Pick<DirtyMoneyHost, 'dirtyMoney' | 'retired'>): boolean {
  return dirtyHeld(c) > 0 && !c.retired;
}

/** Heat the desk's Come clean cools: a point a whole million, at most CLEAN_HEAT_CAP, none at the top of the
 *  meter, and never below zero (a whole point, so a meter holding a fraction keeps it). */
export function cleanHeatRelief(dirty: number, heat: number): number {
  if (heat >= 100) return 0;
  return Math.max(0, Math.min(CLEAN_HEAT_CAP, Math.floor(dirty), Math.floor(heat)));
}

/** Karma Come clean adds: a point every two whole millions, at most CLEAN_KARMA_CAP. */
export function cleanKarma(dirty: number, karma: number): number {
  return Math.max(0, Math.min(CLEAN_KARMA_CAP, Math.floor(dirty / 2), 100 - karma));
}

/** Karma Give it away adds: a point a whole million, at most GIVE_KARMA_CAP. Nothing for a sliver. */
export function giveKarma(dirty: number, karma: number): number {
  return Math.max(0, Math.min(GIVE_KARMA_CAP, Math.floor(dirty), 100 - karma));
}

/** The chance a wash is caught at this heat (after its own +10), as the whole percent the button prints. */
export function washCaughtPct(heatAfter: number): number {
  const p = Math.max(WASH_CATCH_FLOOR, Math.min(WASH_CATCH_CEIL, WASH_CATCH_FLOOR + heatAfter / 250));
  return Math.round(p * 100);
}

/** Seasons served banned in the seasons ahead with no dirty money held, played the way the four engines play
 *  their season end: a banned year first takes one off the count, then the heat cools 9, and at 90 or more a new
 *  suspension starts once nothing is pending. Heat only falls with nothing held, so four seasons settle it. */
export function bannedAhead(heat: number, suspended: number): number {
  return banAhead(heat, suspended).seasons;
}

/** bannedAhead, with how many of those suspensions start at a season end (each start costs the fanbase and the
 *  morale the engines take; one already pending was paid for when it started). */
function banAhead(heat: number, suspended: number): { seasons: number; starts: number } {
  let h = heat;
  let s = Math.max(0, suspended);
  let banned = 0;
  let starts = 0;
  for (let i = 0; i < 4; i++) {
    if (s > 0) { s -= 1; banned += 1; }
    if (h > 0) {
      h = Math.max(0, Math.min(100, h - SEASON_COOL));
      if (h >= BAN_HEAT && s === 0) { s = 1; starts += 1; }
    }
  }
  return { seasons: banned + s, starts };
}

/** Every number one way changes, worked out once; the lines print these and the apply applies these. */
export interface DirtyNumbers {
  way: DirtyWay;
  /** The dirty money it deals with: all of it. */
  amount: number;
  /** Clean money a wash banks when it is not caught (WASH_KEEP of it). 0 for the other ways. */
  keep: number;
  /** Come clean's fine, out of the clean money. Never more than there is. */
  fine: number;
  /** True when the fine is cut to all the clean money there is. */
  fineIsAll: boolean;
  /** Heat change now: negative cools. A wash at the top of the meter adds what is left of it. */
  heat: number;
  /** Karma change now. */
  karma: number;
  /** A wash's chance of getting caught, the whole percent it prints and is drawn against. Null for the rest. */
  caughtPct: number | null;
  /** What a caught wash costs, as the positive amounts taken off. */
  caughtFanbase: number;
  caughtMorale: number;
  /** Seasons served banned ahead once it is done (a wash: when it is not caught). */
  bannedAfter: number;
  /** A wash: seasons served banned ahead when it is caught. */
  bannedIfCaught: number;
  /** How many suspensions start at a season end in bannedAfter, and (a wash) in bannedIfCaught after the one being
   *  caught starts: each costs the fanbase and the morale again. */
  startsAfter: number;
  startsIfCaught: number;
  /** Keep it quiet: whether the next season end suspends you and takes it all. */
  burnsToBan: boolean;
}

export function wayNumbers(c: DirtyMoneyHost, way: DirtyWay): DirtyNumbers {
  const amount = dirtyHeld(c);
  const heat = c.heat ?? 0;
  const karma = c.karma ?? 50;
  const pending = Math.max(0, c.suspendedSeasons ?? 0);
  const now = banAhead(heat, pending);
  const n: DirtyNumbers = {
    way, amount, keep: 0, fine: 0, fineIsAll: false, heat: 0, karma: 0, caughtPct: null,
    caughtFanbase: 0, caughtMorale: 0, bannedAfter: now.seasons, bannedIfCaught: 0, startsAfter: now.starts, startsIfCaught: 0, burnsToBan: false,
  };
  if (way === 'clean') {
    const owed = Math.max(0.1, round1(amount * CLEAN_FINE_RATE));
    const cash = Math.floor(round2(Math.max(0, c.netWorth ?? 0)) * 100 + 1e-6) / 100;
    n.fine = Math.min(owed, cash);
    n.fineIsAll = n.fine < owed;
    const relief = cleanHeatRelief(amount, heat);
    n.heat = relief > 0 ? -relief : 0;
    n.karma = cleanKarma(amount, karma);
    const ahead = banAhead(heat + n.heat, pending);
    n.bannedAfter = ahead.seasons;
    n.startsAfter = ahead.starts;
  } else if (way === 'give') {
    n.karma = giveKarma(amount, karma);
  } else if (way === 'wash') {
    const after = Math.min(100, heat + WASH_HEAT);
    n.heat = round2(after - heat);
    n.keep = round1(amount * WASH_KEEP);
    n.caughtPct = washCaughtPct(after);
    n.caughtFanbase = Math.min(CAUGHT_FANBASE, Math.max(0, c.fanbase));
    n.caughtMorale = Math.min(CAUGHT_MORALE, Math.max(0, c.morale));
    const free = banAhead(after, pending);
    const held = banAhead(after, Math.max(1, pending));
    n.bannedAfter = free.seasons;
    n.startsAfter = free.starts;
    n.bannedIfCaught = held.seasons;
    n.startsIfCaught = held.starts;
  } else {
    /* The season end with the money still held: it climbs by up to 8, and at 90 the league takes it. */
    n.bannedAfter = 0;
    n.startsAfter = 0;
    const next = heat > 0 ? Math.min(100, heat + Math.min(8, 2 + amount * 0.5)) : heat;
    n.burnsToBan = heat > 0 && next >= BAN_HEAT && Math.max(0, pending - 1) === 0;
  }
  return n;
}

/** Seasons served, as the desk and the card print them. */
export const seasonsOut = (n: number): string => (n === 1 ? 'a season' : `${n} seasons`);
const sitOut = seasonsOut;

/** The key a wash is decided on. Changes with the season and with the money, so it is one decision a state. */
export function launderKey(c: DirtyMoneyHost): string {
  return `${c.summerSalt || c.name}|launder|${c.year}|${c.seasons.length}|${Math.round(dirtyHeld(c) * 10)}`;
}

/** The one draw a wash makes, against the whole percent it printed. */
export function washIsCaught(c: DirtyMoneyHost, caughtPct: number): boolean {
  return keyedRng(launderKey(c))() < caughtPct / 100;
}

/** Applies a way's numbers to the career, mutating it. Writes only the fields that change. The desk's copy
 *  (careerDirtyMoneyDesk.ts) and the card's wash both apply through this. */
export function applyDirtyNumbers(c: DirtyMoneyHost, n: DirtyNumbers, caught: boolean): void {
  c.dirtyMoney = 0;
  if (n.way === 'clean' && n.fine > 0) c.netWorth = round2((c.netWorth ?? 0) - n.fine);
  if (n.way === 'wash' && !caught) c.netWorth = round2((c.netWorth ?? 0) + n.keep);
  if (n.heat !== 0) c.heat = Math.max(0, Math.min(100, round2((c.heat ?? 0) + n.heat)));
  if (n.karma !== 0) c.karma = Math.max(0, Math.min(100, (c.karma ?? 50) + n.karma));
  if (n.way === 'wash' && caught) {
    c.fanbase -= n.caughtFanbase;
    c.morale -= n.caughtMorale;
    c.suspendedSeasons = Math.max(1, c.suspendedSeasons ?? 0);
  }
}

/** The feed line a way leaves, once applied. */
export function dirtyResultLine(n: DirtyNumbers, caught: boolean): string {
  const extras = [n.heat < 0 ? `heat ${n.heat}` : '', n.karma > 0 ? `karma +${n.karma}` : ''].filter(Boolean).join(', ');
  const tail = extras ? ` ${extras.charAt(0).toUpperCase()}${extras.slice(1)}.` : '';
  if (n.way === 'clean') return `You came clean and paid back ${m(n.amount)}${n.fine > 0 ? ` plus a ${m(n.fine)} fine` : ''}.${tail}`;
  if (n.way === 'give') return `You gave all ${m(n.amount)} to charity and kept none of it.${tail}`;
  return caught
    ? `Caught. All ${m(n.amount)} was seized and the league suspended you.`
    : n.keep > 0 ? `${m(n.keep)} came out clean.` : 'Too little of it came out to count.';
}

/** The deck card's wash, the desk's rule on the card's own career: MUTATES and returns the feed line (the deck
 *  contract). `done` is the line the card has always said; the outcome is added to it. */
export function launderDirtyMoney(c: DirtyMoneyHost, done: string): string {
  if (!canDealWithDirtyMoney(c)) return done;
  const n = wayNumbers(c, 'wash');
  const caught = washIsCaught(c, n.caughtPct ?? 0);
  applyDirtyNumbers(c, n, caught);
  return caught ? dirtyResultLine(n, true) : `${done} ${dirtyResultLine(n, false)}`;
}

/** The card's effect line, built from the career it is dealt to, so the words are the effect. The card applies on
 *  one tap, so it prints both branches the desk prints: what a clean wash still costs at this heat, and what being
 *  caught costs (all of it seized, the fanbase and morale, and every season served, two at the top of the meter). */
export function launderEffectText(c: DirtyMoneyHost): string {
  const n = wayNumbers(c, 'wash');
  const ban = n.bannedAfter > 0 ? `, and at this heat you sit out ${sitOut(n.bannedAfter)} either way` : '';
  const caught = `Caught: all of it seized, fanbase -${n.caughtFanbase}, morale -${n.caughtMorale}, ${sitOut(n.bannedIfCaught)} out`;
  const heat = n.heat >= WASH_HEAT ? `heat +${n.heat}` : n.heat > 0 ? 'heat to the top of the meter' : 'heat already at the top';
  return `Keep ${Math.round(WASH_KEEP * 100)} percent, ${heat}, ${n.caughtPct} percent chance you are caught${ban}. ${caught}`;
}

/** A shop item, as far as the washers go. */
export interface DirtyShopItem { id: string; requiresDirty?: boolean; effect?: string }

/** The washers in a sport's own shop: the items that need dirty money and say they wash it. Read from the
 *  binding's catalogue, so the sport keeps its own ids and the desk names none. */
export function washerIds(stock: readonly DirtyShopItem[]): string[] {
  return stock.filter(i => i.requiresDirty && (i.effect ?? '').startsWith('Washes ')).map(i => i.id);
}

/** How many washers the career has not bought yet (each is bought once). */
export function washersLeft(stock: readonly DirtyShopItem[], purchased: readonly string[] | undefined): number {
  const owned = new Set(purchased ?? []);
  return washerIds(stock).filter(id => !owned.has(id)).length;
}

/** The heat meter's sentence once every washer is owned. Until then it keeps its own, byte for byte. */
export const DIRTY_SENTENCE_NO_WASHERS = 'Nothing in the Shady aisle can move it now. Deal with it here, or it keeps burning.';

/** The rule in a player's words, for the four US pages' "?" (GameHelp extraRules). Every number is the module's
 *  own, worked out by the functions the desk runs, so the help cannot disagree with a button. */
export const US_DIRTY_MONEY_HELP_RULE = ((): string => {
  const example: DirtyMoneyHost = { name: 'Example', year: 2030, seasons: [], netWorth: 20, dirtyMoney: 6, heat: 40, fanbase: 50, morale: 50, karma: 50 };
  const clean = wayNumbers(example, 'clean');
  const give = wayNumbers(example, 'give');
  const wash = wayNumbers(example, 'wash');
  return `Once your heat is above zero, dirty money raises it every season you hold it. Press Deal with it under the heat meter and every way prints its cost before you choose: come clean (pay it all back plus a ${Math.round(CLEAN_FINE_RATE * 100)} percent fine, never under ${m(0.1)}, heat falls a little and karma rises a little), give it away (it all goes, karma rises, heat stays), keep it quiet (nothing changes and it keeps burning) or wash it (heat +${WASH_HEAT} now and a chance of getting caught that grows with your heat, from ${Math.round(WASH_CATCH_FLOOR * 100)} to ${Math.round(WASH_CATCH_CEIL * 100)} percent: caught, the money is seized and you are suspended; not caught, ${Math.round(WASH_KEEP * 100)} percent of it comes out clean). The card about cash businesses is its own one time deal. For example: ${m(example.dirtyMoney ?? 0)} of dirty money comes clean for a ${m(clean.fine)} fine with heat ${clean.heat} and karma +${clean.karma}, goes to charity for karma +${give.karma}, or washes into ${m(wash.keep)} with a ${wash.caughtPct} percent chance of getting caught when the meter has just turned FLAGGED.`;
})();
