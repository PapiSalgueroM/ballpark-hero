/**
 * Score Predictor's saved daily guess, read back safely.
 *
 * Round 661 put the real home side first on nine matches, which swapped the
 * two sides on the card (and each side's score with it). A daily save used to
 * hold only the two numbers, guessHome and guessAway, meaning "the side shown
 * first" and "the side shown second" on the day it was typed. A player who
 * guessed one of those nine and reloaded after the release would have seen
 * their guess against the other team: a 2-1 for Greece shown as 2-1 for
 * Portugal.
 *
 * So a save now carries the two sides it was typed against, and reading one
 * back goes through restoreDailyGuess:
 *   - sides match the card            the guess as saved
 *   - sides are the card reversed     the two numbers swapped to follow them
 *   - sides are some other match      discarded (a guess about another game)
 *   - no sides (a save from before)   typed against the old order, so the
 *                                     nine swapped matches swap it and every
 *                                     other match keeps it
 *   - anything malformed              discarded
 * The score is kept as saved in every case it is kept: swapping both the
 * guess and the result gives the same score, so it is still the right one.
 *
 * scripts/simTriviaFacts.mjs section 7 checks the nine ids against the order
 * the verification record says each match had before Round 661, and runs
 * every case above.
 */

export interface DailyGuess {
  guessHome: number;
  guessAway: number;
  score: number;
}

interface Sides {
  id: string;
  homeTeam: string;
  awayTeam: string;
}

/** The matches Round 661 turned round so the real home side shows first. */
export const SIDES_SWAPPED_IN_ROUND_661: readonly string[] = [
  'sp-11', 'sp-13', 'sp-15', 'nba-1', 'nba-2', 'nba-5', 'nba-7', 'nba-8', 'nba-9',
];

const isGoals = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

export function restoreDailyGuess(raw: unknown, puzzle: Sides): DailyGuess | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const { guessHome, guessAway, score } = r;
  if (!isGoals(guessHome) || !isGoals(guessAway)) return null;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  const kept: DailyGuess = { guessHome, guessAway, score };
  const turned: DailyGuess = { guessHome: guessAway, guessAway: guessHome, score };
  if (typeof r.homeTeam === 'string' || typeof r.awayTeam === 'string') {
    if (r.homeTeam === puzzle.homeTeam && r.awayTeam === puzzle.awayTeam) return kept;
    if (r.homeTeam === puzzle.awayTeam && r.awayTeam === puzzle.homeTeam) return turned;
    return null;
  }
  return SIDES_SWAPPED_IN_ROUND_661.includes(puzzle.id) ? turned : kept;
}

/** What a daily save holds from now on: the guess and the sides it was typed against. */
export function dailyGuessRecord(guess: DailyGuess, puzzle: Sides) {
  return { ...guess, id: puzzle.id, homeTeam: puzzle.homeTeam, awayTeam: puzzle.awayTeam };
}
