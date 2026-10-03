/**
 * Round 978: international duty.
 *
 * In real football the international windows take a club's best players away
 * and send them back tired, sometimes hurt. Before this round nobody in Club
 * Manager ever left: "international" in the engine was only the manager's own
 * national team job. This module holds the whole of the new rule, and the
 * engine calls it from a handful of thin hooks (see the Round 978 notes in
 * src/lib/clubManager.ts).
 *
 * THE WINDOWS. FIFA's men's calendar sets the dates, and from 2026 it has
 * three windows inside a club season: one sixteen day window across late
 * September and early October with up to four matches, then nine days in
 * November and nine days in March with up to two each. Before 2026 it was four
 * nine day windows (September, October, November, March). One rule covers each
 * shape (intlWindowsFor) and the seasons whose dates two sources confirm are
 * pinned in VERIFIED_WINDOWS, which scripts/simCmInternationals.mjs holds the
 * rule to. Every other season, the era seasons included, uses the rule as a
 * STRUCTURE only and reads as partial (intlDatesPartial), the same honesty
 * rule as the rosters' CM_PARTIAL, so the screen can say its dates are
 * approximate.
 *
 * Sources, read 2026-10-03:
 *  - FIFA, "Men's International Match Calendar 2023-2030" (the April 2026
 *    edition), digitalhub.fifa.com/m/3123d37097318f7f/original/
 *    Men-s-International-Match-Calendar-2023-2030_EN.pdf. 2026: 21 September
 *    to 6 October (4 matches), 9 to 17 November. 2027: 22 to 30 March, 20
 *    September to 5 October, 8 to 16 November. 2028: 20 to 28 March.
 *  - notjustok.com, "FIFA makes major change to international breaks ahead of
 *    2026/27 season": September 21 to October 6, November 9 to 17, March 22
 *    to 30 for 2026-27.
 *  - beIN Sports, "When Is the Next FIFA International Break and Why Is It
 *    Longer Than Usual?" (2026-08-24): 21 September to 6 October 2026 and
 *    9 to 17 November 2026.
 *  - Groundhopper Soccer Guides, "When Are the Next International Breaks in
 *    English and European Football?": the blank club weekends of 2027-28 are
 *    25 September and 2 October 2027, 13 November 2027 and 25 March 2028, each
 *    inside the FIFA range above, which is the second source for 2027-28.
 *  - FIFA media release, "FIFA Council approves international match
 *    calendars": the three in season windows and their lengths from 2026.
 * The rule below reproduces every FIFA in season date for 2026-27 through
 * 2029-30 and, in the older shape, 2023-24 and 2024-25 exactly (2025-26's
 * March window it puts a week early). That is why seasons past 2027-28 and
 * every era season are structure only.
 *
 * WHO GOES. A man is called up when the nationality map knows his country
 * (src/data/playerNationalities.ts, through nationalityOf) and his rating
 * reaches his country's bar: the rating of the CALL_UP_SIZE-th best man of
 * that country in this world's squads (or the country's last man when it has
 * fewer, never below CALL_UP_FLOOR). Nobody the map does not know is ever
 * called, so a generated or academy player never goes. An injured man stays
 * home, which is what happens in real life too.
 *
 * WHAT IT COSTS. Each man who goes comes back with a fitness cost and a small
 * chance of a knock. The cost is bigger for a four match window and for a man
 * whose country plays on another continent from his club (the long trips).
 * Nothing here draws from Math.random: every amount and every knock is hashed
 * off the save, the window and the man, so the engine's seeded stream is
 * untouched and reloading a save cannot reroll a knock.
 *
 * THE DECISION. The break lands between two of your matches. Your assistant
 * names who went in the inbox and asks whether to start them in the match
 * they come back for, or rest them for that one game (they are then picked
 * only off the bench). The rest lasts exactly one match and needs no undoing.
 *
 * Old saves: a save from before this round has no `intl` block, and a missing
 * block means no windows. startCareer and startNextSeason write one, so an old
 * save plays its current season exactly as before and gets windows from its
 * next season on. A damaged block is dropped (that block alone).
 */
import type { CareerState, CMPlayer, PlayerMessage } from '@/lib/clubManager';
import {
  careerLeagueOf, LEAGUE_NATIONS, entryInvolvesMe, fixtureFor, matchStrengthNow, effectiveXIWithSlots,
  CONDITION_PER_FITNESS, MATCH_FITNESS_COST, MATCH_FITNESS_SPREAD,
} from '@/lib/clubManager';
import { nationalityOf } from '@/data/playerNationalities';
import { NATION_CONFED } from '@/lib/soccerInternational';
import type { Confederation } from '@/lib/soccerInternational';
import { eraRosters } from '@/lib/clubManagerEras';
import { addDays, dateKey, dateOfEntries, dayOfWeek, shortDate, worldYearOf } from '@/lib/clubManagerCalendar';
import type { CalDate } from '@/lib/clubManagerCalendar';

/* ================================================================== */
/* Windows                                                            */
/* ================================================================== */

export interface IntlWindow {
  /** Stable id inside a season: "2026-sepoct", "2026-nov", "2027-mar". */
  id: string;
  /** First and last day, inclusive. */
  start: CalDate;
  end: CalDate;
  /** Most matches a country may play in it. */
  matches: number;
  /** True when VERIFIED_WINDOWS confirms these exact dates. */
  verified: boolean;
}

/** The Monday on or after a date. */
function mondayOnOrAfter(date: CalDate): CalDate {
  const dow = dayOfWeek(date.y, date.m, date.d);
  return addDays(date, (1 - dow + 7) % 7);
}

/** First season of FIFA's three window shape (the 2026-27 season). */
export const INTL_NEW_SHAPE_FROM = 2026;

/**
 * The windows inside the season that starts in `worldYear`, by the rule:
 *  - from 2026: Monday on or after 18 September for 16 days (4 matches),
 *    Monday on or after 8 November for 9 days, Monday on or after 18 March of
 *    the next year for 9 days;
 *  - before 2026: the first Monday of September, then five, ten and
 *    twenty eight weeks on, nine days each (2 matches).
 */
export function ruleWindows(worldYear: number): Omit<IntlWindow, 'verified'>[] {
  const y = worldYear;
  if (y >= INTL_NEW_SHAPE_FROM) {
    const sep = mondayOnOrAfter({ y, m: 9, d: 18 });
    const nov = mondayOnOrAfter({ y, m: 11, d: 8 });
    const mar = mondayOnOrAfter({ y: y + 1, m: 3, d: 18 });
    return [
      { id: `${y}-sepoct`, start: sep, end: addDays(sep, 15), matches: 4 },
      { id: `${y}-nov`, start: nov, end: addDays(nov, 8), matches: 2 },
      { id: `${y + 1}-mar`, start: mar, end: addDays(mar, 8), matches: 2 },
    ];
  }
  const sep = mondayOnOrAfter({ y, m: 9, d: 1 });
  const at = (weeks: number) => addDays(sep, weeks * 7);
  return [
    { id: `${y}-sep`, start: sep, end: addDays(sep, 8), matches: 2 },
    { id: `${y}-oct`, start: at(5), end: addDays(at(5), 8), matches: 2 },
    { id: `${y}-nov`, start: at(10), end: addDays(at(10), 8), matches: 2 },
    { id: `${y + 1}-mar`, start: at(28), end: addDays(at(28), 8), matches: 2 },
  ];
}

/**
 * The seasons whose in season window dates two sources confirm (see the
 * header), keyed by the year the season starts in. The rule above must give
 * exactly these; scripts/simCmInternationals.mjs holds it to them.
 */
export const VERIFIED_WINDOWS: Record<number, { start: CalDate; end: CalDate }[]> = {
  2026: [
    { start: { y: 2026, m: 9, d: 21 }, end: { y: 2026, m: 10, d: 6 } },
    { start: { y: 2026, m: 11, d: 9 }, end: { y: 2026, m: 11, d: 17 } },
    { start: { y: 2027, m: 3, d: 22 }, end: { y: 2027, m: 3, d: 30 } },
  ],
  2027: [
    { start: { y: 2027, m: 9, d: 20 }, end: { y: 2027, m: 10, d: 5 } },
    { start: { y: 2027, m: 11, d: 8 }, end: { y: 2027, m: 11, d: 16 } },
    { start: { y: 2028, m: 3, d: 20 }, end: { y: 2028, m: 3, d: 28 } },
  ],
};

/** True when a season's window dates are the rule's structure rather than confirmed dates. */
export function intlDatesPartial(worldYear: number): boolean {
  return !VERIFIED_WINDOWS[worldYear];
}

/** The windows of the season that starts in `worldYear`. */
export function intlWindowsFor(worldYear: number): IntlWindow[] {
  const verified = !intlDatesPartial(worldYear);
  return ruleWindows(worldYear).map(w => ({ ...w, verified }));
}

/** "21 Sep to 6 Oct". */
export function windowLabel(w: Pick<IntlWindow, 'start' | 'end'>): string {
  const day = (d: CalDate) => shortDate(d).split(' ').slice(1).join(' ');
  return `${day(w.start)} to ${day(w.end)}`;
}

/* ================================================================== */
/* Who goes                                                           */
/* ================================================================== */

/** How many of a country's best in this world set its bar. */
export const CALL_UP_SIZE = 23;
/** Nobody below this rating is called, however small his country. */
export const CALL_UP_FLOOR = 60;

const BAR_CACHE = new Map<string, Map<string, number>>();

/**
 * Each country's call up bar in a world: the rating of its CALL_UP_SIZE-th
 * best man across every squad of the world's bake, or of its last man when it
 * has fewer, and never below the floor. Built once per world. An era whose
 * squads are not loaded answers with an empty map, so nobody is called rather
 * than anybody being called against the wrong world.
 */
export function nationBars(eraId: string | undefined): Map<string, number> {
  const key = eraId ?? 'now';
  const hit = BAR_CACHE.get(key);
  if (hit) return hit;
  const byNation = new Map<string, number[]>();
  try {
    for (const list of Object.values(eraRosters(eraId))) {
      for (const b of list) {
        const nat = nationalityOf(eraId, b.n);
        if (!nat) continue;
        const arr = byNation.get(nat) ?? [];
        arr.push(b.r);
        byNation.set(nat, arr);
      }
    }
  } catch {
    return new Map();
  }
  const bars = new Map<string, number>();
  for (const [nat, ratings] of byNation) {
    ratings.sort((a, b) => b - a);
    const nth = ratings[Math.min(CALL_UP_SIZE, ratings.length) - 1];
    bars.set(nat, Math.max(CALL_UP_FLOOR, nth));
  }
  BAR_CACHE.set(key, bars);
  return bars;
}

/* Spellings the nationality map and the confederation table disagree on. */
const CONFED_ALIAS: Record<string, string> = {
  'United States': 'USA', 'Türkiye': 'Turkey', "Côte d'Ivoire": 'Ivory Coast',
  'Republic of Ireland': 'Ireland', 'Korea Republic': 'South Korea', 'Czechia': 'Czech Republic',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina', 'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Cabo Verde': 'Cape Verde', 'Gambia': 'The Gambia', 'Congo DR': 'DR Congo',
};

/** A country's confederation, or null when the table does not know it. */
export function confedOfNation(nation: string): Confederation | null {
  return NATION_CONFED[nation] ?? NATION_CONFED[CONFED_ALIAS[nation] ?? ''] ?? null;
}

/** The confederation a save's club plays in: its league's country, Europe for a league with UEFA places. */
export function clubConfed(state: CareerState): Confederation | null {
  const league = careerLeagueOf(state);
  const country = LEAGUE_NATIONS[league.id];
  const fromCountry = country ? confedOfNation(country) : null;
  if (fromCountry) return fromCountry;
  return league.euro ? 'UEFA' : null;
}

/** A draw in [0, 1) hashed off a string (FNV-1a), never off Math.random. */
export function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 1000003) / 1000003;
}

export interface IntlCallUp {
  id: string;
  name: string;
  nation: string;
  /** Fitness the trip took off him. */
  cost: number;
  /** Weeks out with a knock picked up away, 0 when he came back whole. */
  injuredWeeks: number;
  /** His country plays on another continent from his club. */
  far: boolean;
  /** He started their games; false when he mostly sat on their bench. */
  starts: boolean;
}

/**
 * The men of a squad who would go in a window, best first. Pure: reads the
 * squad, the world's bars and the nationality map, and changes nothing.
 */
export function callUpsFor(state: CareerState, window: Pick<IntlWindow, 'id' | 'matches'>): IntlCallUp[] {
  const bars = nationBars(state.eraId);
  const home = clubConfed(state);
  const out: IntlCallUp[] = [];
  for (const p of state.squad) {
    if (p.injuryWeeks > 0) continue;
    const nation = nationalityOf(state.eraId, p.name);
    if (!nation) continue;
    const bar = bars.get(nation);
    if (bar === undefined || p.rating < bar) continue;
    const theirs = confedOfNation(nation);
    const far = !!home && !!theirs && theirs !== home;
    const seed = `${state.clubName}|${state.season}|${window.id}|${p.id}`;
    /* Not everybody who goes plays. The further a man sits above his
       country's bar, the likelier he started every game for them; the rest
       mostly watched from the bench and come back lighter. */
    const startChance = Math.max(0.2, Math.min(0.9, 0.35 + (p.rating - bar) / 20));
    const starts = hash01(`${seed}|starts`) < startChance;
    const four = window.matches >= 4;
    const cost = starts
      ? (far ? 24 : 14) + (four ? 10 : 0) + Math.floor(hash01(`${seed}|cost`) * 9)
      : (far ? 12 : 4) + Math.floor(hash01(`${seed}|cost`) * 5);
    const knock = starts ? (four ? 0.06 : 0.04) + (far ? 0.01 : 0) : 0.01;
    const injuredWeeks = hash01(`${seed}|knock`) < knock ? 1 + Math.floor(hash01(`${seed}|weeks`) * 3) : 0;
    out.push({ id: p.id, name: p.name, nation, cost, injuredWeeks, far, starts });
  }
  const rating = new Map(state.squad.map(p => [p.id, p.rating]));
  return out.sort((a, b) => (rating.get(b.id) ?? 0) - (rating.get(a.id) ?? 0));
}

/* ================================================================== */
/* The save block                                                     */
/* ================================================================== */

export interface IntlBreak {
  windowId: string;
  /** The calendar index it landed before: the next entry when it was played. */
  atWeek: number;
  /** "21 Sep to 6 Oct". */
  label: string;
  /** Calendar index of my first match after the break, -1 when none is left. */
  backWeek: number;
  /** The opponent of that match, for the copy. */
  backOpponent: string | null;
  called: IntlCallUp[];
}

/** Round 978: optional on CareerState. Absent means no windows this season. */
export interface IntlDuty {
  /** The season this block belongs to; a block from another season fires nothing. */
  season: number;
  /** Window ids already played this season. */
  fired: string[];
  /** The latest break. */
  last?: IntlBreak;
  /** One match rest: these ids start on the bench in calendar entry `week`. */
  rest?: { week: number; ids: string[] };
}

/** A fresh block for the season the save is starting. */
export function freshIntl(state: Pick<CareerState, 'season'>): IntlDuty {
  return { season: state.season, fired: [] };
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);

function validCallUp(c: unknown): boolean {
  if (!c || typeof c !== 'object') return false;
  const x = c as Record<string, unknown>;
  return isStr(x.id) && isStr(x.name) && isStr(x.nation) && isInt(x.cost) && isInt(x.injuredWeeks)
    && typeof x.far === 'boolean' && typeof x.starts === 'boolean';
}

/** True when a block has the shape this module writes. */
export function validIntl(block: unknown): block is IntlDuty {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;
  if (!isInt(b.season) || !Array.isArray(b.fired) || !b.fired.every(isStr)) return false;
  if (b.last !== undefined) {
    const l = b.last as Record<string, unknown> | null;
    if (!l || typeof l !== 'object' || !isStr(l.windowId) || !isStr(l.label) || !isInt(l.backWeek) || !isInt(l.atWeek)) return false;
    if (l.backOpponent !== null && !isStr(l.backOpponent)) return false;
    if (!Array.isArray(l.called) || !l.called.every(validCallUp)) return false;
  }
  if (b.rest !== undefined) {
    const r = b.rest as Record<string, unknown> | null;
    if (!r || typeof r !== 'object' || !isInt(r.week) || !Array.isArray(r.ids) || !r.ids.every(isStr)) return false;
  }
  return true;
}

/** A damaged block goes, and only that block: the save then has no windows until its next season. */
export function ensureIntl(state: CareerState): void {
  if (state.intl !== undefined && !validIntl(state.intl)) delete state.intl;
}

/** The block if it is whole and belongs to the season being played, else null. */
export function liveIntl(state: Pick<CareerState, 'intl' | 'season'>): IntlDuty | null {
  const b = state.intl;
  return b && validIntl(b) && b.season === state.season ? b : null;
}

/** Calendar index of my first match at or after `from`, or -1. */
function myNextMatchWeek(state: CareerState, from: number): number {
  for (let w = from; w < state.calendar.length; w++) {
    const entry = state.calendar[w];
    if (entry.type === 'window') continue;
    if (entryInvolvesMe(state, entry) && fixtureFor(state, entry)) return w;
  }
  return -1;
}

/* ================================================================== */
/* The break                                                          */
/* ================================================================== */

export type IntlMessage = Omit<PlayerMessage, 'id' | 'week'>;

const listNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** The assistant's note in the inbox. Narrated, never a quote: nobody real says anything here. */
export function breakMessage(brk: IntlBreak): IntlMessage | null {
  const going = brk.called;
  if (!going.length) return null;
  const byNation = new Map<string, string[]>();
  for (const c of going) byNation.set(c.nation, [...(byNation.get(c.nation) ?? []), c.name]);
  const who = [...byNation].map(([nation, names]) => `${nation}: ${listNames(names)}`).join('; ');
  const hurt = going.filter(c => c.injuredWeeks > 0);
  const fit = going.filter(c => c.injuredWeeks === 0);
  const back = brk.backOpponent ? `the ${brk.backOpponent} game` : 'the next game';
  const hurtLine = hurt.length
    ? ` ${listNames(hurt.map(c => c.name))} picked up a knock away and ${hurt.length === 1 ? 'is' : 'are'} out for a bit.`
    : '';
  const played = fit.filter(c => c.starts);
  const playedLine = played.length
    ? ` ${listNames(played.map(c => c.name))} started for ${played.length === 1 ? 'his country' : 'their countries'}, the rest mostly watched from the bench.`
    : ' Nobody started for his country, so the legs are mostly fine.';
  const longHaul = played.some(c => c.far) ? ' The long trips hurt most.' : '';
  const ask = fit.length
    ? ` Your assistant wants to know: start them against ${brk.backOpponent ?? 'the next lot'}, or rest the spent ones for that one game?`
    : '';
  return {
    kind: 'intlDuty',
    from: 'Your assistant',
    playerName: going[0].name,
    playerId: going[0].id,
    text: `🌍 International break, ${brk.label}. Away with their countries (${who}). They are back for ${back}.${fit.length ? playedLine : ''}${longHaul}${hurtLine}${ask}`,
    options: fit.length
      ? [
        { label: 'Rest the ones who are spent', effect: 'restIntl' },
        { label: 'Pick them anyway', effect: 'startIntl' },
      ]
      : [{ label: 'Noted', effect: 'startIntl' }],
  };
}

/**
 * Plays every window the save has reached: a window is reached when the next
 * calendar entry is dated on or after its first day. Each one sends its men
 * away and back (fitness cost, maybe a knock), records the break and returns
 * the assistant's note for the engine to post. A season with no block, or a
 * block from another season, plays nothing. Mutates `state`, which is the
 * engine's own working copy.
 */
export function fireDueBreaks(state: CareerState): IntlMessage[] {
  const intl = liveIntl(state);
  if (!intl || state.week >= state.calendar.length) return [];
  const worldYear = worldYearOf(state);
  const dates = dateOfEntries(worldYear, state.calendar);
  const nextKey = dateKey(dates[state.week]);
  const out: IntlMessage[] = [];
  for (const w of intlWindowsFor(worldYear)) {
    if (intl.fired.includes(w.id) || dateKey(w.start) > nextKey) continue;
    intl.fired.push(w.id);
    const called = callUpsFor(state, w);
    const byId = new Map(called.map(c => [c.id, c]));
    state.squad = state.squad.map((p: CMPlayer) => {
      const c = byId.get(p.id);
      if (!c) return p;
      const fitness = Math.max(20, Math.min(100, p.fitness - c.cost));
      return { ...p, fitness, injuryWeeks: Math.max(p.injuryWeeks, c.injuredWeeks) };
    });
    const backWeek = myNextMatchWeek(state, state.week);
    const fx = backWeek >= 0 ? fixtureFor(state, state.calendar[backWeek]) : null;
    const brk: IntlBreak = { windowId: w.id, atWeek: state.week, label: windowLabel(w), backWeek, backOpponent: fx ? fx.opponent : null, called };
    intl.last = brk;
    delete intl.rest;
    const msg = breakMessage(brk);
    if (msg) out.push(msg);
  }
  return out;
}

/* ================================================================== */
/* The decision                                                       */
/* ================================================================== */

/** The ids resting for the match they come back for: empty outside that match. */
export function restingIds(state: Pick<CareerState, 'intl' | 'season' | 'week'>): Set<string> {
  const intl = liveIntl(state);
  if (!intl?.rest || state.week > intl.rest.week) return new Set();
  return new Set(intl.rest.ids);
}

/** The men just back from duty, while the match they came back for is still ahead. */
export function backFromDuty(state: Pick<CareerState, 'intl' | 'season' | 'week'>): IntlCallUp[] {
  const intl = liveIntl(state);
  const last = intl?.last;
  if (!last || last.backWeek < 0 || state.week > last.backWeek) return [];
  return last.called;
}

/**
 * What a man rested now is worth in the match after next, in strength: he
 * skips the legs a match takes out of him (the engine's own mean,
 * MATCH_FITNESS_COST plus half the spread), capped by how far he can still
 * climb, and one man's legs count for one eleventh of the side's condition
 * (CONDITION_PER_FITNESS, the rule myMatchStrength uses).
 */
function legsLaterWorth(fitness: number): number {
  const saved = Math.min(MATCH_FITNESS_COST + MATCH_FITNESS_SPREAD / 2, Math.max(0, 100 - fitness));
  return (CONDITION_PER_FITNESS * saved) / 11;
}

/**
 * Who your assistant would rest: the men back from duty for whom sitting out
 * is the better bet over the two matches the trip touches. The match they
 * come back for is priced by the engine itself (matchStrengthNow, the rule
 * the match is played on, with a rested man's slot going to the freshest
 * value man); the match after it by the legs he keeps (legsLaterWorth).
 * Greedy, most worn first, keeping a rest only when the sum goes up, so the
 * answer can be nobody when every deputy is far worse than tired legs.
 */
export function restPlan(state: CareerState): string[] {
  const intl = liveIntl(state);
  const last = intl?.last;
  if (!intl || !last || last.backWeek < 0 || state.week > last.backWeek) return [];
  /* Only a man who would start can be rested: resting a man on the bench
     changes nothing now and saves him no legs later. */
  const starting = new Set(effectiveXIWithSlots({ ...state, intl: { ...intl, rest: undefined } }).map(x => x.p.id));
  const pool = last.called.filter(c => c.injuredWeeks === 0 && starting.has(c.id)).sort((a, b) => b.cost - a.cost);
  const fitness = new Map(state.squad.map(p => [p.id, p.fitness]));
  const value = (ids: string[]): number =>
    matchStrengthNow({ ...state, intl: { ...intl, rest: { week: last.backWeek, ids } } })
    + ids.reduce((s, id) => s + legsLaterWorth(fitness.get(id) ?? 100), 0);
  let chosen: string[] = [];
  let best = value(chosen);
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const c of pool) {
      if (chosen.includes(c.id)) continue;
      const trial = [...chosen, c.id];
      const v = value(trial);
      if (v > best + 0.005) { chosen = trial; best = v; moved = true; }
    }
    if (!moved) break;
  }
  return chosen;
}

/**
 * The answer to the assistant: rest the men restPlan picks for that one
 * match, or start them all. Returns the new block and the line the inbox
 * shows. Null when there is nothing left to decide (the match has gone).
 */
export function answerBreak(state: CareerState, rest: boolean): { intl: IntlDuty; resolved: string } | null {
  const intl = liveIntl(state);
  const last = intl?.last;
  if (!intl || !last || last.backWeek < 0 || state.week > last.backWeek) return null;
  const vs = last.backOpponent ? ` against ${last.backOpponent}` : '';
  const { rest: _dropped, ...kept } = intl;
  if (!rest) return { intl: kept, resolved: `They start${vs}. Tired legs, but your best eleven.` };
  const ids = restPlan(state);
  if (!ids.length) {
    return { intl: kept, resolved: `Your assistant ran the numbers: nobody on the bench beats tired legs this time, so they start${vs}.` };
  }
  const names = ids.map(id => last.called.find(c => c.id === id)?.name ?? '').filter(Boolean);
  const one = names.length === 1;
  return {
    intl: { ...intl, rest: { week: last.backWeek, ids } },
    resolved: `${listNames(names)} ${one ? 'sits' : 'sit'} out${vs} and ${one ? 'comes' : 'come'} back into the side fresh after it. Still on the bench if you need ${one ? 'him' : 'them'}.`,
  };
}

/* ================================================================== */
/* The calendar                                                       */
/* ================================================================== */

export interface IntlMark {
  window: IntlWindow;
  /** dateKey of the window's first day, where the grid draws it. */
  key: number;
  label: string;
  /** The dates are the rule's structure, not confirmed ones. */
  partial: boolean;
  /** Already played this season. */
  done: boolean;
}

/** The season's windows for the grid; none on a save whose current season has no block. */
export function intlMarks(state: CareerState): IntlMark[] {
  const intl = liveIntl(state);
  if (!intl) return [];
  const worldYear = worldYearOf(state);
  return intlWindowsFor(worldYear).map(w => ({
    window: w,
    key: dateKey(w.start),
    label: windowLabel(w),
    partial: !w.verified,
    done: intl.fired.includes(w.id),
  }));
}

/** One line for a window's day on the calendar. */
export function intlMarkLine(mark: IntlMark): string {
  const games = `up to ${mark.window.matches} games for each country`;
  const when = mark.done ? 'Played.' : 'Your internationals go away and come back tired for your next match.';
  const dates = mark.partial ? ' Dates for this season are approximate.' : '';
  return `International break, ${mark.label} (${games}). ${when}${dates}`;
}
