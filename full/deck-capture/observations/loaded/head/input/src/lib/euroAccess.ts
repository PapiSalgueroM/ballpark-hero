/**
 * Round 1509: who plays the Europa League in today's world (2026-27 on), and so who the board can say qualified.
 *
 * Until this round the Europa League was a board label graded by table position (leagueDemand in clubManager.ts)
 * that no season read again. From here one rule fills the competition the save follows from the Cups panel and
 * grades the board's European rungs: a league's Europa League places (the places below its Champions League ones,
 * up to its LEAGUE_RULES row), its cup winner, and the cup's place passed down the league when the winner is
 * already in. The Europa League winner goes into next season's Champions League.
 *
 * THE DATA. Every number below that is a real fact is a verified row of scripts/data/cmEuroAccess.json, and
 * scripts/simWorldEuro.mjs section 0 fails if a constant here and its row disagree. A league whose real 2026/27
 * access is not the game's LEAGUE_RULES row (a European Performance Spot, a fourth place sent to Champions League
 * qualifying, an association whose only Europa League club is its cup winner), or whose row stands on one
 * publisher, is named in EURO_ACCESS_PARTIAL: the game keeps its own places for that league and the screen calls
 * them the game's simplification. LEAGUE_RULES is never edited from here.
 *
 * Pure: nothing from Math.random, no clock, types only from the engine.
 */

/** Ledger rows the game does not stand on as real (the CM_PARTIAL shape): each is recorded and marked. The A rows
 *  named here are leagues whose Europa League places are the game's simplification; U5 and U6 are the bracket
 *  and the table order, which the Champions League's library plays in their place. */
export const EURO_ACCESS_PARTIAL: readonly string[] = [
  'A1', 'A3', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15', 'U5', 'U6',
];

/** The routes the rule plays (rows Q2, Q3, Q4 and C0 of UEFA's 2026/27 Europa League regulations, Article 3). */
export const EURO_ACCESS_RULES = {
  /** Q2: every association with a Europa League place enters its domestic cup winner. */
  cupWinnerEnters: true,
  /** Q3: a cup winner already qualified hands the cup's place down its league. */
  cupPassDown: true,
  /** Q4: the Europa League titleholder goes into the next Champions League. */
  uelHolderToUcl: true,
  /** C0: the Conference League titleholder goes into the next Europa League. */
  ueclHolderToUel: true,
} as const;

/**
 * Rows K1 to K15: the real 2025-26 domestic cup winners as the game spells them, by the league id of the nation's
 * European league, read by season one of a 2026-27 career. Null where the winner is not a club of this game's
 * world (Torreense, from Portugal's second tier, row K7): that cup's place passes to the next league place.
 */
export const SEASON_ONE_CUP_WINNERS: Readonly<Record<string, string | null>> = {
  premier: 'Manchester City',
  seriea: 'Inter Milan',
  laliga: 'Real Sociedad',
  bundesliga: 'Bayern Munich',
  ligue1: 'Lens',
  eredivisie: 'AZ Alkmaar',
  primeira: null,
  scottish: 'Celtic',
  superlig: 'Trabzonspor',
  proleague: 'Union Saint-Gilloise',
  austria: 'LASK',
  greece: 'OFI',
  denmark: 'FC Midtjylland',
  switzerland: 'St. Gallen',
  croatia: 'Dinamo Zagreb',
};

/** Row K16 with C0: the 2025-26 Conference League winner, in season one's Europa League. */
export const SEASON_ONE_UECL_HOLDER = 'Crystal Palace';

/** Row U-legs: two legs from the knockout play-offs to the semi-finals, then a one match final. */
export const UEL_LEGS = { PO: 2, R16: 2, QF: 2, SF: 2, F: 1 } as const;

/** Row U7: the months of the seventeen nights of 2026/27, in order (MD1 to MD8, the play-offs, the round of 16,
 *  the quarter-finals, the semi-finals, the final). The game's dates are its own; this holds their order. */
export const UEL_NIGHT_MONTHS: readonly number[] = [9, 10, 10, 11, 11, 12, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5];

/** Where the final sits, as a fraction of the league season: the game's own, not a fact. Before the season's
 *  last league round, so the winner is known before the season ends (the real final is ten days before the
 *  Champions League's). */
export const UEL_FINAL_MARK = 0.95;

/* ---------- THE RULE (step 3): who is in, over plain finishing orders ---------- */

/**
 * How an entrant got in, one character each so a slice can keep one per club cheaply: a league place (L), a
 * domestic cup winner (C), a cup's place passed down its league because the winner was already in or has no
 * place to take (P), the Conference League titleholder (H, row C0, season one only), the fill (F).
 */
export type EuroRoute = 'L' | 'C' | 'P' | 'H' | 'F';

/** One European league of the season just finished, in world order: its clubs in finishing order, its nation,
 *  how many Champions League places it has (uclPlacesIn) and its last Europa League league place (EURO_SLOTS'
 *  uel, a position: 5 means fifth is the last). */
export interface EuroTable { leagueId: string; nationId: string; clubs: readonly string[]; uclPlaces: number; uelLast: number }

export interface EuroFieldInput {
  tables: readonly EuroTable[];
  /** Each nation's cup, by nation id: a winner (a club of this world), null when the cup's place passes down
   *  its league (no winner this game plays, or another nation's cup from season two, the stand in), and left
   *  out when the cup is not decided yet (before its final), so it gives no place at all. */
  cups: Readonly<Record<string, string | null | undefined>>;
  /** The Champions League the season really plays: no club is in both. */
  uclEntrants: readonly string[];
  /** Row C0, season one only: the Conference League titleholder. */
  ueclHolder?: string | null;
  /** Kept out of every route (my club, which is never an entrant yet): a place it would take passes on. */
  exclude?: readonly string[];
  /** Never taken by the fill (my club when the rule runs without the exclusion, for the route it earned). */
  noFill?: readonly string[];
  /** The field's size (36). */
  size: number;
}

export interface EuroField {
  /** The entrants in the order the rule took them. */
  clubs: string[];
  /** How each got in. */
  via: Record<string, EuroRoute>;
  /** Cup places passed down a league, and fill places taken: printed by the harness. */
  passed: number;
  filled: number;
}

/** Release AV's comparison: plain text, the same on every device. */
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The field, rows Q2 to Q4 and C0 as this game plays them. In world order, each European league's Europa League
 * league places (the clubs below its Champions League places down to its last Europa League place), a club the
 * Champions League already has (or one kept out) skipped and the place taken by the next club of that league;
 * then each nation's cup, its winner, or when the winner is already in or kept out or there is none to place,
 * the next club of its league that is not (row Q3); then the Conference League titleholder; then the fill to
 * `size` from the leagues with the most Champions League places, deepest first, each its next placed club. No
 * club twice, none in the Champions League, none kept out, and the fill never takes a club `noFill` names.
 * Pure: plain text order everywhere, nothing from Math.random.
 */
export function euroFieldFromTables(input: EuroFieldInput): EuroField {
  const ucl = new Set(input.uclEntrants);
  const out = new Set(input.exclude ?? []);
  const noFill = new Set(input.noFill ?? []);
  const clubs: string[] = [];
  const via: Record<string, EuroRoute> = Object.create(null);
  let passed = 0;
  let filled = 0;
  const free = (c: string | null | undefined): c is string => !!c && !ucl.has(c) && !out.has(c) && via[c] === undefined;
  const take = (c: string, route: EuroRoute): void => { clubs.push(c); via[c] = route; };
  /* Each league's next club below its Champions League places that is free, read from where the last one stood. */
  const cursor = new Map(input.tables.map(t => [t.leagueId, Math.max(0, t.uclPlaces)]));
  const next = (t: EuroTable, skip?: Set<string>): string | null => {
    let i = cursor.get(t.leagueId) ?? 0;
    while (i < t.clubs.length && (!free(t.clubs[i]) || skip?.has(t.clubs[i]))) i += 1;
    if (i >= t.clubs.length) { cursor.set(t.leagueId, i); return null; }
    cursor.set(t.leagueId, i + 1);
    return t.clubs[i];
  };
  for (const t of input.tables) {
    for (let k = 0; k < t.uelLast - t.uclPlaces && clubs.length < input.size; k += 1) {
      const c = next(t);
      if (c) take(c, 'L');
    }
  }
  for (const t of input.tables) {
    if (input.cups[t.nationId] === undefined || clubs.length >= input.size) continue;
    const winner = input.cups[t.nationId];
    if (free(winner)) { take(winner, 'C'); continue; }
    const c = next(t);
    if (c) { take(c, 'P'); passed += 1; }
  }
  if (free(input.ueclHolder) && clubs.length < input.size) take(input.ueclHolder, 'H');
  const byDepth = [...input.tables].filter(t => t.clubs.length).sort((a, b) => (b.uclPlaces - a.uclPlaces) || byText(a.leagueId, b.leagueId));
  for (let round = 0; clubs.length < input.size && round < 8; round += 1) {
    for (const t of byDepth) {
      if (clubs.length >= input.size) break;
      const c = next(t, noFill);
      if (c) { take(c, 'F'); filled += 1; }
    }
  }
  return { clubs, via, passed, filled };
}

/** The route `club` earned by the rule, or null: the rule run WITHOUT the exclusion, the fill never taking it. */
export function euroRouteOf(input: Omit<EuroFieldInput, 'exclude' | 'noFill'>, club: string): EuroRoute | null {
  const field = euroFieldFromTables({ ...input, exclude: [], noFill: [club] });
  return field.via[club] ?? null;
}
