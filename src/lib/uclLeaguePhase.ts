/**
 * Round 1228: the Champions League as it has been played since 2024-25, as rules and nothing else.
 *
 * 36 clubs in one table, eight matches each, 1st to 8th straight to the round of 16, 9th to 24th into a
 * two legged play-off, then a bracket fixed by league position all the way to the final. Every number in
 * this file is a row of scripts/data/cmUclFormat.json, read on two publishers, and
 * scripts/simCmLeaguePhase.mjs section 0 fails if a constant here and its row disagree. The bracket's
 * shape (which play-off pairing feeds which seeded pair, which ties meet next) is not typed from memory
 * either: section 0 derives it from the two seasons that have been played and compares.
 *
 * The slate itself is drawn by leagueSlate.ts, which knows no football. Nothing in the game imports this
 * file yet: binding it to Club Manager is a later round's work.
 *
 * WHAT STANDS IN, said here so a later round's screens can say it too. The real pots go by a five year
 * club coefficient, which the game does not keep: the caller hands in a strength instead. The real table
 * has two last steps (cards, then that coefficient) the game does not keep for other clubs: a tie that
 * survives the eight steps below is listed by name.
 */
import { hash32, mulberry32 } from './leagueCore';
import { swissSlate } from './leagueSlate';
import { keyedRng } from './keyedRng';

export interface LeaguePhaseShape {
  clubs: number; pots: number; potSize: number; perPot: number; games: number; home: number; away: number;
  direct: number; playoffTo: number; capPerAssociation: number;
}

/** The three European cups since 2024-25 (ledger rows F1, F2, F3, F5, F15a, F15b, F15c). The Europa League
 *  is the Champions League's shape exactly. The Conference League is not: six matches, six pots of six, one
 *  opponent from each pot, so leagueSlate.ts as it stands (two from each pot) cannot draw it. */
export const LEAGUE_PHASE_SHAPES: Readonly<Record<'ucl' | 'uel' | 'uecl', LeaguePhaseShape>> = {
  ucl: { clubs: 36, pots: 4, potSize: 9, perPot: 2, games: 8, home: 4, away: 4, direct: 8, playoffTo: 24, capPerAssociation: 2 },
  uel: { clubs: 36, pots: 4, potSize: 9, perPot: 2, games: 8, home: 4, away: 4, direct: 8, playoffTo: 24, capPerAssociation: 2 },
  uecl: { clubs: 36, pots: 6, potSize: 6, perPot: 1, games: 6, home: 3, away: 3, direct: 8, playoffTo: 24, capPerAssociation: 2 },
};

export const UCL_LEAGUE = { ...LEAGUE_PHASE_SHAPES.ucl, winPoints: 3, drawPoints: 1 } as const;

/** The order of a run of clubs level on points (row F6), as far as the game can follow it. */
export const LEAGUE_PHASE_STEPS = [
  'goalDifference', 'goalsFor', 'awayGoalsFor', 'wins', 'awayWins',
  'opponentsPoints', 'opponentsGoalDifference', 'opponentsGoalsFor',
] as const;
export type LeaguePhaseStep = typeof LEAGUE_PHASE_STEPS[number];

/** A saved slate: plain data, 36 names and 144 numbers. */
export interface UclLeagueSlate {
  v: 1;
  seed: number;
  /** 36 names in pot order: Math.floor(index / 9) is the pot. */
  clubs: string[];
  /** matchday * 1296 + home * 36 + away, matchdays counted from 0, in rising order. */
  fx: number[];
  /** Matches between two clubs of one association, and opponents over the cap of two. 0 and 0 is a draw
   *  inside both rules. Anything else was forced by the field or, with `fallback`, by the search. */
  breaks: number;
  overCap: number;
  /** Set when the search gave up and the recorded pattern was seated. */
  fallback?: true;
}

/** The pots: the holders first, then by the strength handed in, then by name. Null unless the field is 36
 *  different clubs. */
export function leaguePhasePots(field: readonly string[], holder: string | null, strengthOf: (club: string) => number): string[][] | null {
  const { clubs, pots, potSize } = UCL_LEAGUE;
  if (field.length !== clubs || new Set(field).size !== clubs) return null;
  const strength = new Map(field.map(c => [c, strengthOf(c)]));
  const order = [...field].sort((a, b) => Number(b === holder) - Number(a === holder)
    || (strength.get(b) as number) - (strength.get(a) as number) || a.localeCompare(b));
  return Array.from({ length: pots }, (_, p) => order.slice(p * potSize, (p + 1) * potSize));
}

/** Draw a season's league phase. One seed in, the same slate out every time. Null when the field is not 36
 *  different clubs each with an association: a caller must then play something else, never pad. */
export function drawUclLeaguePhase(input: {
  field: readonly string[]; holder: string | null; seed: number;
  strengthOf: (club: string) => number; assocOf: (club: string) => string | null | undefined;
}): UclLeagueSlate | null {
  const pots = leaguePhasePots(input.field, input.holder, input.strengthOf);
  if (!pots) return null;
  const clubs = pots.flat();
  const names = clubs.map(c => input.assocOf(c));
  if (names.some(a => !a)) return null;
  const ids = [...new Set(names)];
  const size = UCL_LEAGUE.potSize;
  const spec = { pots: pots.map((_, p) => Array.from({ length: size }, (__, i) => p * size + i)), assoc: names.map(a => ids.indexOf(a)), cap: UCL_LEAGUE.capPerAssociation };
  const slate = swissSlate(spec, mulberry32(hash32(input.seed, 1)));
  if (!slate) return null;
  const fx = slate.matches.map(([h, a, d]) => d * 1296 + h * 36 + a).sort((x, y) => x - y);
  return { v: 1, seed: input.seed, clubs, fx, breaks: slate.breaks, overCap: slate.overCap, ...(slate.fallback ? { fallback: true as const } : {}) };
}

const dayOf = (code: number) => Math.floor(code / 1296);
const homeOf = (code: number) => Math.floor(code / 36) % 36;
const awayOf = (code: number) => code % 36;

/** One matchday's fixtures, by name. */
export function slateFixtures(slate: UclLeagueSlate, matchday: number): [string, string][] {
  return slate.fx.filter(code => dayOf(code) === matchday).map(code => [slate.clubs[homeOf(code)], slate.clubs[awayOf(code)]]);
}

/** A club's match on a matchday, or null when it is not in the slate. */
export function slateFixtureOf(slate: UclLeagueSlate, club: string, matchday: number): { opponent: string; home: boolean } | null {
  const me = slate.clubs.indexOf(club);
  if (me < 0) return null;
  for (const code of slate.fx) {
    if (dayOf(code) !== matchday) continue;
    if (homeOf(code) === me) return { opponent: slate.clubs[awayOf(code)], home: true };
    if (awayOf(code) === me) return { opponent: slate.clubs[homeOf(code)], home: false };
  }
  return null;
}

/** A club's opponents in matchday order. Empty when the club is not in the slate. */
export function slateOpponents(slate: UclLeagueSlate, club: string): string[] {
  const out: string[] = [];
  for (let d = 0; d < UCL_LEAGUE.games; d += 1) { const f = slateFixtureOf(slate, club, d); if (f) out.push(f.opponent); }
  return out;
}

export function leaguePhaseZone(position: number): 'r16' | 'playoff' | 'out' {
  return position <= UCL_LEAGUE.direct ? 'r16' : position <= UCL_LEAGUE.playoffTo ? 'playoff' : 'out';
}

/** A table row as the engine keeps it (the same fields as Club Manager's TableRow). */
export interface LeaguePhaseRow { club: string; w: number; d: number; l: number; gf: number; ga: number; pts: number }

/**
 * The single table: points, then the eight steps of LEAGUE_PHASE_STEPS in order, then the club's name.
 * `results` is the season's league phase results by "home|away" as [home goals, away goals]: the away
 * goals, the away wins and each club's opponents are read off it, so nothing new has to be saved. A club's
 * opponents are the clubs it has met so far, so the three opponent steps count the same clubs the real
 * table counts once the phase is over. There is no head to head step: the real table has none either.
 * Pure: the rows and the results in, a new list out.
 */
export function sortedLeaguePhaseTable<T extends LeaguePhaseRow>(rows: readonly T[], results: Readonly<Record<string, readonly [number, number]>> = {}): T[] {
  const index = new Map(rows.map((r, i) => [r.club, i]));
  const away = rows.map(() => ({ goals: 0, wins: 0 }));
  const met: number[][] = rows.map(() => []);
  for (const [key, [hg, ag]] of Object.entries(results)) {
    const cut = key.indexOf('|');
    const h = index.get(key.slice(0, cut));
    const a = index.get(key.slice(cut + 1));
    if (cut < 0 || h === undefined || a === undefined) continue;
    away[a].goals += ag;
    if (ag > hg) away[a].wins += 1;
    met[h].push(a); met[a].push(h);
  }
  const sum = (i: number, of: (r: T) => number) => met[i].reduce((total, o) => total + of(rows[o]), 0);
  const lines = rows.map((r, i): Record<LeaguePhaseStep, number> => ({
    goalDifference: r.gf - r.ga, goalsFor: r.gf, awayGoalsFor: away[i].goals, wins: r.w, awayWins: away[i].wins,
    opponentsPoints: sum(i, o => o.pts), opponentsGoalDifference: sum(i, o => o.gf - o.ga), opponentsGoalsFor: sum(i, o => o.gf),
  }));
  const order = rows.map((_, i) => i);
  order.sort((x, y) => {
    if (rows[x].pts !== rows[y].pts) return rows[y].pts - rows[x].pts;
    for (const step of LEAGUE_PHASE_STEPS) {
      if (lines[x][step] !== lines[y][step]) return lines[y][step] - lines[x][step];
    }
    return rows[x].club.localeCompare(rows[y].club);
  });
  return order.map(i => rows[i]);
}

/** The order in words, and what the last resort is. */
export function leaguePhaseFootnote(): string {
  return 'Level on points goes to goal difference, then goals scored, away goals scored, wins and away wins. '
    + 'Still level, it goes to the clubs each side has played: their points together, then their goal difference, then their goals. '
    + 'The real competition then counts cards and club ranking, which the game does not keep for other clubs, so a tie that survives all of that is listed by name.';
}

/** The play-off pairings by league position (row F7): the first pair is seeded and hosts the second leg. */
export const PLAYOFF_PAIRS = [[[9, 10], [23, 24]], [[11, 12], [21, 22]], [[13, 14], [19, 20]], [[15, 16], [17, 18]]] as const;

/** The four seeded lines of the round of 16 (row F8): the two positions that share a line, and the play-off
 *  pairing (an index into PLAYOFF_PAIRS) whose two winners they meet. */
export const BRACKET_LINES = [
  { seeds: [1, 2], playoff: 3 }, { seeds: [3, 4], playoff: 2 }, { seeds: [5, 6], playoff: 1 }, { seeds: [7, 8], playoff: 0 },
] as const;

/** The lines in slot order inside one half of the bracket (row F9): slots 2i and 2i + 1 meet in the next
 *  round, so the 1 or 2 line meets the 7 or 8 line, the 3 or 4 line meets the 5 or 6 line, and those two
 *  quarter-finals meet in the semi-final. The other half is the same again, so 1st and 2nd can only meet
 *  in the final. */
export const HALF_SLOTS = [0, 3, 1, 2] as const;

export interface UclKnockoutDraw {
  /** The top eight club in each of the eight bracket slots: half one is slots 0 to 3, half two 4 to 7. */
  seeds: string[];
  /** The play-off whose winner meets seeds[slot]. `home` finished 17th to 24th and hosts the first leg,
   *  `away` finished 9th to 16th and hosts the second. */
  playoffs: { home: string; away: string }[];
}

/**
 * The knockout draw from a final (or a standing) order. League position fixes everything but three coin
 * tosses a line: which of its two seeded clubs goes in half one, which play-off club meets which inside the
 * pairing, and which of the two play-off ties goes in half one. Each line's tosses are keyed on the seed
 * and on that line's own six clubs, so the projection during the phase and the draw at its end are the
 * same function, and a pairing only moves when one of its own positions changes hands.
 * Null when the order is shorter than 24 clubs.
 */
export function drawUclKnockout(order: readonly string[], seed: number): UclKnockoutDraw | null {
  if (order.length < UCL_LEAGUE.playoffTo) return null;
  const at = (position: number) => order[position - 1];
  const seeds: string[] = new Array(8);
  const playoffs: { home: string; away: string }[] = new Array(8);
  BRACKET_LINES.forEach((line, li) => {
    const [high, low] = PLAYOFF_PAIRS[line.playoff];
    const six = [...line.seeds, ...high, ...low].map(at);
    const toss = keyedRng(`${seed}|${li}|${six.join('|')}`);
    const flipSeeds = toss() < 0.5;
    const flipPairs = toss() < 0.5;
    const flipTies = toss() < 0.5;
    const ties = [
      { home: at(low[flipPairs ? 1 : 0]), away: at(high[0]) },
      { home: at(low[flipPairs ? 0 : 1]), away: at(high[1]) },
    ];
    const slot = HALF_SLOTS.indexOf(li as 0 | 1 | 2 | 3);
    for (let half = 0; half < 2; half += 1) {
      seeds[half * 4 + slot] = at(line.seeds[(half === 0) === flipSeeds ? 1 : 0]);
      playoffs[half * 4 + slot] = ties[(half === 0) === flipTies ? 1 : 0];
    }
  });
  return { seeds, playoffs };
}

/**
 * The next round's tie from the winners of a round, in slot order: winners 2i and 2i + 1 meet, and the
 * even slot's winner is `away`, the side at home in the second leg. In this slot order the even slot
 * always carries the higher seeded line, so this one positional rule is rows F9 and F10 together: seeds 1
 * to 4 are at home in the quarter-final return, seeds 1 and 2 in the semi-final return, and a seed passes
 * to whoever knocks its holder out. For the round of 16 itself the tie is { home: the play-off winner of
 * the slot, away: seeds[slot] }.
 */
export function nextRoundTie<T>(winners: readonly T[], i: number): { home: T; away: T } {
  return { home: winners[2 * i + 1], away: winners[2 * i] };
}
