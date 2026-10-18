/**
 * Round 1510: the one match cups a save follows or plays, pure and sport free (the match is injected), so a later
 * cup or another sport's preseason can bind the same code. The first is each country's domestic super cup
 * (CareerState.worldComps.dsc in Club Manager): England's FA Community Shield where the ledger proves it.
 *
 * Three shapes: 'one' (one match), 'two' (two legs, settled on aggregate, away goals where the row has them) and
 * 'four' (two semi finals on one night and a final on the next). A level match that settles the cup goes straight
 * to penalties ('pens') or to extra time first ('et'), as that cup did. Every followed match is drawn from its own
 * keyed stream over the strength snapshot the slice keeps, so a result once shown can never move; the
 * participant's own matches are the engine's own and come back as `mine`.
 *
 * Pure: nothing from Math.random, no clock, nothing from the engine but the one tie rule it shares
 * (worldCompetition.ts's settleTie).
 */
import { CM_ONE_OFF_PARTIAL, CM_ONE_OFF_ROWS } from '@/data/cmOneOffRows';
import type { OneOffDecider, OneOffDouble, OneOffEntry, OneOffPlace, OneOffRowTuple, OneOffShape, OneOffVenue } from '@/data/cmOneOffRows';
import { keyedRng } from '@/lib/keyedRng';
import { settleTie } from '@/lib/worldCompetition';
import type { SettleableTie } from '@/lib/worldCompetition';
import type { NightResult, NightWant } from '@/lib/worldNights';

export type { OneOffShape } from '@/data/cmOneOffRows';

/** One row of cmOneOffRows.ts, read out of its tuple. */
export interface OneOffRow {
  id: string; nation: string; year: number; name: string; shape: OneOffShape; decider: OneOffDecider;
  entry: OneOffEntry; double: OneOffDouble; place: OneOffPlace; venue: OneOffVenue; awayGoals: boolean;
  pairing: readonly [number, number, number, number] | null;
}

const rowOf = (t: OneOffRowTuple): OneOffRow => ({
  id: t[0], nation: t[1], year: t[2], name: t[3], shape: t[4], decider: t[5], entry: t[6], double: t[7], place: t[8],
  venue: t[9], awayGoals: t[10] === 1, pairing: t[11] ?? null,
});

/** The row a country plays in a format year, or null (no row: nothing is played there). */
export function oneOffRowFor(nation: string, year: number): OneOffRow | null {
  const t = CM_ONE_OFF_ROWS.find(r => r[1] === nation && r[2] === year);
  return t ? rowOf(t) : null;
}
export function oneOffRowById(id: string): OneOffRow | null {
  const t = CM_ONE_OFF_ROWS.find(r => r[0] === id);
  return t ? rowOf(t) : null;
}
/** The ledger id of a country's row for a year ('eng-2026'), whether or not the game stands on it. */
export function oneOffRowId(nation: string, year: number): string {
  return `${nation === 'spain' ? 'esp' : nation.slice(0, 3)}-${year}`;
}
/** True when the round looked at this country and year and could not stand on it (the tile says so). */
export function oneOffPartial(nation: string, year: number): boolean {
  return CM_ONE_OFF_PARTIAL.includes(oneOffRowId(nation, year));
}

/** Why a season's cup is not followed or not played: no finished season to read, a cup with no final, the manager
 *  arrived from another country this summer, an entrant that is not a club of this world, season one with my club
 *  in it, a mid season move into an entrant, or a two legged cup my club is in. */
export type OneOffSkip = 'unfinished' | 'noFinal' | 'moved' | 'notInWorld' | 'seasonOne' | 'joined' | 'legs';

/** A season of one cup as a save keeps it. A stub (`skip`) carries nothing else. */
export interface OneOffSlice {
  v: 1;
  /** The save's season it belongs to. */
  s: number;
  /** The cmOneOffRows row it stands on. */
  row: string;
  skip?: OneOffSkip;
  /** 'one' and 'two': [first, second] in the row's order; 'four': [league champions, league runners up, cup
   *  winners, cup runners up] after the double rule. */
  clubs?: string[];
  /** Each entrant's strength at the open, one decimal, same order: every followed match reads this. */
  str?: number[];
  seed?: number;
  /** The participant's own results by fixture index (src/lib/worldNights.ts). */
  mine?: Record<number, NightResult>;
  /** Nights already shown when the slice was carried across a mid season move: never taken back. */
  seen?: number;
}

/** What a finished season hands the next one: the top flight's final order and its cup final. */
export interface OneOffTables { table: readonly string[] | null; cupWinner: string | null; cupRunnerUp: string | null }

/**
 * The entrants of a row from a finished season, in the row's order, or why there are none. A place a club holds
 * twice goes by the row's double rule, never to a club already in: 'leagueRunnerUp' and 'nextLeague' take the next
 * league club not yet in, 'cupRunnerUp' the cup's runners up. Always distinct clubs, or a skip.
 */
export function entrantsFrom(row: Pick<OneOffRow, 'shape' | 'entry' | 'double'>, t: OneOffTables): { clubs: string[] } | { skip: OneOffSkip } {
  const table = t.table ?? [];
  if (table.length < 2) return { skip: 'unfinished' };
  if (!t.cupWinner) return { skip: 'noFinal' };
  const out: string[] = [];
  const nextLeague = (): string | null => table.find(c => !out.includes(c)) ?? null;
  /* A place: its club, or when that club is already in, the double rule's club (a cup place under 'cupRunnerUp'
     needs the cup's runners up and fails without them: never padded from the league). */
  const take = (club: string | null, isCup: boolean): boolean => {
    let c = club;
    if (!c || out.includes(c)) c = isCup && row.double === 'cupRunnerUp' ? t.cupRunnerUp : nextLeague();
    if (!c || out.includes(c)) return false;
    out.push(c);
    return true;
  };
  if (row.entry === 'champCup') {
    if (!take(table[0], false) || !take(t.cupWinner, true)) return { skip: 'unfinished' };
  } else {
    if (!t.cupRunnerUp) return { skip: 'noFinal' };
    if (!take(table[0], false) || !take(table[1], false) || !take(t.cupWinner, true) || !take(t.cupRunnerUp, true)) return { skip: 'unfinished' };
  }
  const want = row.shape === 'four' ? 4 : 2;
  return out.length === want && new Set(out).size === want ? { clubs: out } : { skip: 'unfinished' };
}

/** One fixture of a cup: its index, its night, the two clubs in its orientation, and whether it is on a neutral
 *  ground (else `home` is at home). A 'four' final's clubs are known only once both semi finals are settled. */
export interface OneOffFixture { n: number; night: number; home: string; away: string; neutral: boolean; leg?: 1 | 2; settles: boolean }

/** The nights a row's cup is played on, in order, as the placer wants them (src/lib/worldNights.ts). */
export function oneOffNightsOf(row: Pick<OneOffRow, 'shape' | 'place'>): NightWant[] {
  if (row.shape === 'two') return [{ place: 'open' }, { place: 'early' }];
  if (row.shape === 'four') return [{ place: row.place }, { place: row.place, afterLeague: 1 }];
  return [{ place: row.place }];
}

/** The fixtures known before anything is played: 'one' its match, 'two' its legs (leg one at the second named
 *  club's ground), 'four' its semi finals by the row's pairing (the final comes from the evaluation). */
export function oneOffFixturesOf(clubs: readonly string[], row: Pick<OneOffRow, 'shape' | 'venue' | 'pairing'>): OneOffFixture[] {
  const neutral = row.venue === 'n';
  if (row.shape === 'two') {
    return [
      { n: 0, night: 0, home: clubs[1], away: clubs[0], neutral: false, leg: 1, settles: false },
      { n: 1, night: 1, home: clubs[0], away: clubs[1], neutral: false, leg: 2, settles: true },
    ];
  }
  if (row.shape === 'four') {
    const p = row.pairing ?? [0, 3, 2, 1];
    return [
      { n: 0, night: 0, home: clubs[p[0]], away: clubs[p[1]], neutral, settles: true },
      { n: 1, night: 0, home: clubs[p[2]], away: clubs[p[3]], neutral, settles: true },
    ];
  }
  const [home, away] = row.venue === 'w' ? [clubs[1], clubs[0]] : [clubs[0], clubs[1]];
  return [{ n: 0, night: 0, home, away, neutral, settles: true }];
}

/** What the evaluation is handed: the watched match over two strengths drawn from `rand` and nothing else, and the
 *  scales the engine plays a decider's ninety minutes and its extra time at. */
export interface OneOffBind {
  sim(strHome: number, strAway: number, scale: number, rand: () => number): [number, number];
  /** The ninety minutes of a match that can go to extra time (the engine's ET_DEFLATOR); a 'pens' cup plays 1. */
  deciderScale: number;
  etScale: number;
}

/** A fixture as shown: its goals after any extra time, and how it ended. */
export interface OneOffFixtureView extends OneOffFixture { hg?: number; ag?: number; aet?: true; pens?: true; winner?: string; mine?: true }

export interface OneOffResult {
  row: string;
  /** Every night played and a winner crowned. */
  done: boolean;
  nightsDone: number;
  nights: number;
  /** In index order; a fixture not yet known (a 'four' final before its semi finals) is not listed. */
  fixtures: OneOffFixtureView[];
  /** A 'two': the aggregate in leg two's orientation, and whether away goals split it. */
  agg?: [number, number];
  byAwayGoals?: true;
  winner?: string;
  runnerUp?: string;
}

/**
 * The cup as far as `nightsDone` nights, derived from the slice alone: a PREFIX (the result at k nights is the first
 * k nights of the result at k + 1), since every fixture is a function of the slice and its index only. A fixture my
 * club played reads `slice.mine`; every other is drawn from its own keyed stream
 * (`oneoff|<row>|<seed>|<index>|<home>|<away>`, its coin on the same key plus `|coin`) over the snapshot, and a
 * settling one goes through settleTie with the row's rules. Null for a stub. Draws nothing from Math.random.
 */
export function evaluateOneOff(slice: OneOffSlice, row: OneOffRow, nightsDone: number, bind: OneOffBind): OneOffResult | null {
  if (slice.skip || !slice.clubs || !slice.str || slice.seed === undefined) return null;
  const clubs = slice.clubs;
  const strOf = (c: string): number => slice.str![clubs.indexOf(c)] ?? 0;
  const nights = oneOffNightsOf(row).length;
  const k = Math.max(0, Math.min(nights, nightsDone));
  const rules = { legs: 1 as const, awayGoals: false, deciderScale: row.decider === 'et' ? bind.deciderScale : 1, etScale: bind.etScale, extraTime: row.decider === 'et' };
  const keyOf = (fx: OneOffFixture): string => `oneoff|${row.id}|${slice.seed}|${fx.n}|${fx.home}|${fx.away}`;
  const settle = (fx: OneOffFixture): OneOffFixtureView => {
    const own = slice.mine?.[fx.n];
    if (own) {
      const winner = own.pens ? (own.pens === 'h' ? fx.home : fx.away) : own.h === own.a ? undefined : own.h > own.a ? fx.home : fx.away;
      return { ...fx, hg: own.h, ag: own.a, ...(own.et ? { aet: true as const } : {}), ...(own.pens ? { pens: true as const } : {}), ...(fx.settles && winner ? { winner } : {}), mine: true };
    }
    const rand = keyedRng(keyOf(fx));
    const t: SettleableTie = { home: fx.home, away: fx.away, homeGoals: null, awayGoals: null, winner: null };
    settleTie(t, rules, (h, a, scale) => bind.sim(strOf(h), strOf(a), scale, rand), keyedRng(`${keyOf(fx)}|coin`));
    return { ...fx, hg: t.homeGoals as number, ag: t.awayGoals as number, ...(t.aet ? { aet: true as const } : {}), ...(t.pens ? { pens: true as const } : {}), winner: t.winner as string };
  };
  const out: OneOffResult = { row: row.id, done: false, nightsDone: k, nights, fixtures: [] };
  const known = oneOffFixturesOf(clubs, row);
  if (row.shape === 'two') {
    /* Both legs are one tie, settled once from the tie's own stream; a night shows its leg. Leg one is played at
       the second named club's ground, so the tie's home side is that club. */
    const [l1, l2] = known;
    const t: SettleableTie = { home: l1.home, away: l1.away, homeGoals: null, awayGoals: null, winner: null };
    const rand = keyedRng(keyOf(l1));
    settleTie(t, { legs: 2, awayGoals: row.awayGoals, deciderScale: rules.deciderScale, etScale: bind.etScale, extraTime: row.decider === 'et' },
      (h, a, scale) => bind.sim(strOf(h), strOf(a), scale, rand), keyedRng(`${keyOf(l1)}|coin`));
    if (k >= 1) out.fixtures.push({ ...l1, hg: t.leg1!.homeGoals, ag: t.leg1!.awayGoals });
    if (k >= 2) {
      /* settleTie keeps both legs in the tie's orientation (leg one's home side first); leg two is shown in its own. */
      out.fixtures.push({ ...l2, hg: t.leg2!.awayGoals, ag: t.leg2!.homeGoals, ...(t.aet ? { aet: true as const } : {}), ...(t.pens ? { pens: true as const } : {}), winner: t.winner as string });
      out.agg = [t.awayGoals as number, t.homeGoals as number];
      if (t.byAwayGoals) out.byAwayGoals = true;
    }
  } else {
    for (const fx of known) if (fx.night < k) out.fixtures.push(settle(fx));
    if (row.shape === 'four' && k >= 2) {
      const [a, b] = out.fixtures;
      if (a?.winner && b?.winner) out.fixtures.push(settle({ n: 2, night: 1, home: a.winner, away: b.winner, neutral: row.venue === 'n', settles: true }));
    }
  }
  const last = out.fixtures[out.fixtures.length - 1];
  if (k >= nights && last?.winner) {
    out.done = true;
    out.winner = last.winner;
    out.runnerUp = last.winner === last.home ? last.away : last.home;
  }
  return out;
}

/** The winner of a finished cup, else null. */
export function oneOffWinner(result: OneOffResult | null): string | null {
  return result?.done ? result.winner ?? null : null;
}

/** The fixture index my club plays at night `night`, or null (a 'four' semi final loser has no final). */
export function myOneOffFixture(result: OneOffResult | null, slice: OneOffSlice, row: OneOffRow, club: string, night: number): OneOffFixture | null {
  if (!slice.clubs || !slice.clubs.includes(club)) return null;
  if (row.shape === 'four' && night === 1) {
    const semis = result?.fixtures.filter(f => f.night === 0) ?? [];
    if (semis.length < 2 || !semis.every(f => f.winner) || !semis.some(f => f.winner === club)) return null;
    return { n: 2, night: 1, home: semis[0].winner as string, away: semis[1].winner as string, neutral: row.venue === 'n', settles: true };
  }
  return oneOffFixturesOf(slice.clubs, row).find(f => f.night === night && (f.home === club || f.away === club)) ?? null;
}
