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
