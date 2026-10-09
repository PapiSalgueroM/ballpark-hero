/**
 * Round 1104, the fix pass: the lines NFL My Career's "?" adds for the rules
 * this round changed.
 *
 * WHY THIS FILE. The round wrote its new rules into the page's howToPlay
 * steps, and those render nowhere: GameSeoContent only falls back to a page's
 * own steps when the game has no guide, and this game has one. The guide
 * (src/data/gameContent/football.ts) is held by the other lane, so its
 * sentences are owed, not written. Until they land, the page hands these
 * lines to GameHelp's extraRules, the same road the Hall of Fame lines take.
 * GameHelp skips a line the guide already carries word for word.
 *
 * Every number is read off the engine and the tables, never typed here, so a
 * line cannot drift from the game: the first and last slot from rookieDeal,
 * the kicker's round from the pick offset, the season lengths and the year
 * they change from the season ledger.
 */
import { NFL_ROOKIE_SCALE } from '@/data/nflRookieScale';
import { NFL_KICKER_PICK_OFFSET, nflSeasonLength } from '@/lib/nflMyCareer';
import { US_BANK_HELP_RULE } from '@/lib/usCareerBank';
import { NFL_PICKS_A_ROUND, NFL_ROUNDS, rookieDeal } from '@/lib/usCareerRookieDeal';

const ROUND_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const THROWBACK_START = 2005;

export function nflTruthHelpRules(): string[] {
  const first = rookieDeal('nfl', 'now', 1)!;
  const last = rookieDeal('nfl', 'now', NFL_PICKS_A_ROUND * NFL_ROUNDS)!;
  const kickerRound = NFL_KICKER_PICK_OFFSET / NFL_PICKS_A_ROUND + 1;
  const throwbackGames = nflSeasonLength(THROWBACK_START);
  /* The first season that is not the throwback's length: the year the schedule grew. */
  let grew = THROWBACK_START;
  while (grew < THROWBACK_START + 60 && nflSeasonLength(grew) === throwbackGames) grew += 1;
  return [
    `A rookie signs for ${ROUND_WORDS[first.years] ?? first.years} years and is paid by his draft slot: in ${NFL_ROOKIE_SCALE.now.season} money the first pick makes $${first.salary}M a year and the last pick about $${last.salary}M. The 2005 throwback pays the same slot scaled to 2005 money.`,
    `In this game a kicker goes in round ${ROUND_WORDS[kickerRound] ?? kickerRound} or later.`,
    `Throwback seasons are ${throwbackGames} games, the way the league played them until ${grew}. From ${grew} on a season is ${nflSeasonLength(grew)} games.`,
    US_BANK_HELP_RULE,
  ];
}
