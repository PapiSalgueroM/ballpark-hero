/**
 * Round 647: one season ledger for the four front offices (NFL, NBA, MLB,
 * NHL) and the two dynasties (CFB, CBB).
 *
 * WHAT WAS WRONG. All six boards recorded through the same line:
 *
 *   useGameCompletion(slug, wonTitleNow, titles * 100 + seasonsPlayed * 5)
 *
 * Three defects, found by the 2026-09-19 points audit and all in that line.
 *
 *  1. Only a title season recorded anything. The completion fired on
 *     wonTitleNow, so a 14-3 season that lost the conference final, or a
 *     Cinderella run to the Final Four, was worth exactly nothing, while
 *     a first round exit after a title season had already been paid for.
 *  2. Every title re-scored the whole history. The number was cumulative,
 *     so the second title recorded 200 plus 5 a season, the third 300 plus,
 *     and each ring paid for every ring before it again. The profile's all
 *     time total (Round 648) adds records, so a three title run was paid
 *     100 + 200 + 300 for three titles.
 *  3. Nothing about the number was about the season. Titles were the only
 *     input, and which team you picked decided most of that: the roster
 *     strength the pick hands you, not what you did with it.
 *
 * WHAT THIS IS. The Club Manager model (clubManagerScore.ts, Round 633):
 * every completed season is scored on that season alone, appended as ONE
 * row to a ledger kept in the save, and recorded ONCE, at the whistle, as
 * its own number. The recorded total of a career is therefore the ledger
 * sum: each row once, no row twice, a title season and a mid table season
 * alike. The leaderboard ranks the day's best reading against a cap
 * (public.global_leaderboard, max(least(score, max_score)) per player per
 * game per day), so a per season number is the only shape that fits it: a
 * running total would hit the cap on the second good season and pay the
 * cap for every season after, which is the free points shape Round 645
 * spent a round removing.
 *
 * THE SCORE IS RESULTS ONLY. Two terms, both a share of what the season
 * offered, so the size of the league cancels the way it does in Club
 * Manager:
 *
 *   form      0..W_FORM     your wins over the games your season had
 *   playoffs  0..W_TITLE    a ladder: in the field, won a round, reached
 *                           the final, won it all
 *
 * No prestige, no mandate grade, no roster strength, no team name. The
 * pick of team changes nothing: two teams with the same record and the
 * same postseason score the same, and scoreSeason ignores r.team on
 * purpose (the row carries it for the recap and nothing else). The owner's
 * mandate is graded against the pick already (foOwnerMandate.ts) and that
 * is where "you were expected to" belongs; the score says what happened.
 *
 * THE CEILING IS 100, and only a perfect title season reaches it: every
 * game won and the title. Round 646 sets each game_score_caps row to its
 * engine's exported ceiling, and seasonCeiling() is that export for all six
 * games. Until that migration lands the caps still hold the old cumulative
 * scale, so a perfect season pays less than 100 leaderboard points; that is
 * 646's job and it is claimed beside this round.
 *
 * OLDER SAVES. A save written before this round has no ledger. It opens
 * with an empty one and earns no retroactive points: titles and
 * seasonsPlayed stay as they were for the recap, and the next season the
 * player closes is the first row. Nothing is reconstructed, because the
 * old save holds no per season record to reconstruct from.
 *
 * ONE MODULE, SIX BOARDS. The boards build a SeasonResult from their own
 * postseason shape (nflPostseason and seriesPostseason for the GM boards,
 * cfbSeasonResult and cbbSeasonResult in the college engines) and call
 * appendSeason. The scoring, the row shape, the refusal of a season already
 * in the ledger and the sum live here and nowhere else.
 *
 * Pure: no clock, no Math.random, no storage, no imports. scripts/
 * simSeasonLedger.mjs drives it headless and runs the six boards' vitest
 * rows; its controls double count a title and score the pick.
 */

/** What one season produced, as the score reads it. */
export interface SeasonResult {
  /** The season's year, the key a ledger refuses a second row for. */
  season: number;
  /** The team run that season. Carried for the recap, never scored. */
  team: string;
  wins: number;
  /** wins + losses (+ OT losses in the NHL): the season's own length. */
  games: number;
  madePlayoffs: boolean;
  /** Postseason games (NFL, CFB, CBB) or series (NBA, MLB, NHL) won. */
  roundsWon: number;
  /** Played in the final, whatever the sport calls it. */
  reachedFinal: boolean;
  wonTitle: boolean;
}

export interface SeasonRow extends SeasonResult {
  score: number;
}

/** Your wins as a share of the games your season had. */
export const W_FORM = 50;
/**
 * The postseason ladder, indexed by playoffLevel: out, in the field, won a
 * round, reached the final, won it all. Same rungs in every sport, because
 * the front offices' mandate already reads the postseason on exactly this
 * ladder (gradeSeason in foOwnerMandate.ts).
 */
export const PLAYOFF_POINTS: readonly number[] = [0, 10, 18, 26, 50];
export const W_TITLE = PLAYOFF_POINTS[4];

/** The most one season can score: every game won and the title. */
export const SEASON_CEILING = W_FORM + W_TITLE;

const int = (n: unknown, lo: number, hi: number): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
};

/** Where the postseason ended, 0..4. */
export function playoffLevel(r: Pick<SeasonResult, 'madePlayoffs' | 'roundsWon' | 'reachedFinal' | 'wonTitle'>): number {
  if (r.wonTitle) return 4;
  if (r.reachedFinal) return 3;
  if (r.roundsWon >= 1) return 2;
  if (r.madePlayoffs) return 1;
  return 0;
}

/**
 * The season's score, 0..SEASON_CEILING. Reads the record and the
 * postseason and nothing else: not r.team, not r.season.
 */
export function scoreSeason(r: SeasonResult): number {
  const games = Math.max(1, int(r.games, 1, 500));
  const wins = Math.min(games, int(r.wins, 0, 500));
  const form = Math.round(W_FORM * (wins / games));
  const playoffs = PLAYOFF_POINTS[playoffLevel(r)];
  return int(form + playoffs, 0, SEASON_CEILING);
}

/** The number Round 646's cap fence reads for all six games. */
export function seasonCeiling(): number {
  return SEASON_CEILING;
}

/**
 * A save's ledger, cleaned. Anything that is not an array of rows with a
 * season and a score comes back EMPTY, which is what a save from before
 * this round gets: no rows, no retroactive points. A stored score is kept
 * as stored (clamped to the ceiling), not recomputed, because the ledger is
 * a record of what was recorded and a weight change must not re-date it.
 */
export function ledgerOf(raw: unknown): SeasonRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: SeasonRow[] = [];
  for (const e of raw.slice(0, 500)) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if (!Number.isFinite(o.season) || !Number.isFinite(o.score)) continue;
    rows.push({
      season: int(o.season, 0, 9999),
      team: typeof o.team === 'string' ? o.team : '',
      wins: int(o.wins, 0, 500),
      games: int(o.games, 0, 500),
      madePlayoffs: !!o.madePlayoffs,
      roundsWon: int(o.roundsWon, 0, 99),
      reachedFinal: !!o.reachedFinal,
      wonTitle: !!o.wonTitle,
      score: int(o.score, 0, SEASON_CEILING),
    });
  }
  return rows;
}

/**
 * Close a season into the ledger. Returns the new ledger and the row it
 * added, or the SAME ledger and null when a row for that season is already
 * there: a replayed final week, a double click, a stale recap restored and
 * played again. That refusal is what "replaying a title adds nothing"
 * rests on when a board's own closed season guard is not in the way.
 */
export function appendSeason(ledger: SeasonRow[], r: SeasonResult): { ledger: SeasonRow[]; row: SeasonRow | null } {
  if (ledger.some(x => x.season === r.season)) return { ledger, row: null };
  const row: SeasonRow = { ...r, score: scoreSeason(r) };
  return { ledger: [...ledger, row], row };
}

/** The career's recorded total: every row once. */
export function ledgerTotal(ledger: SeasonRow[]): number {
  return ledger.reduce((n, r) => n + int(r.score, 0, SEASON_CEILING), 0);
}

/** The row for a given season, for the recap after a reload. */
export function ledgerRow(ledger: SeasonRow[], season: number): SeasonRow | null {
  return ledger.find(r => r.season === season) ?? null;
}
