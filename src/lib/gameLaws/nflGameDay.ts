/* Round 1224: what the NFL hands Game Day (src/lib/gmGameDay.ts) on top of
   its story law (./nfl.ts): how the hour is cut into quarters, the two
   numbers that name a game's shape, the sentence for each shape, and the
   words of the "?" a card opens.

   Real and two sourced, in the ledger (src/data/usLeagueShape.ts): what a
   scoring play is worth, and that a regular season game can end level. The
   clock of four quarters of 15 minutes is in the same ledger and is marked
   THIN there (one of its two reads was a spot check), so the "?" below says
   thin where it says real, in words a player can read. src/lib/gmGameDay.test.ts
   holds the quarters here to the law's clock label and to the ledger.
   OWED BEFORE A CARD SHOWS THE SHEET (the ledger is its owner's file, not
   this round's): complete the NFL_CLOCK row in src/data/usLeagueShape.ts with
   the league's own rulebook (Rule 4, Section 1, Article 1: sixty minutes in
   four periods of fifteen), then the sentence is "Real: four quarters of 15
   minutes." and the unit test's demand for the word thin goes with it.
   THIS SIM'S OWN: the 21 and the 10 below, every sentence, and that a game in
   a front office always has a winner.

   It imports ./nfl (the story half of the law), so it rides with a card and
   never with a board's press. */
import { NFL_GAME_MINUTES, NFL_STORY_LAW } from './nfl';
import { DRIVES } from './nflScore';
import type { GameDayLaw, StoryShape } from '../gmGameDay';
import type { HelpWords } from '@/components/season-centre/SeasonCentreHelp';

/** Four quarters of fifteen minutes (thin, see the header). */
export const NFL_QUARTERS = 4;
const QUARTER_MINUTES = NFL_GAME_MINUTES / NFL_QUARTERS;

/** THIS SIM'S OWN: a win by this many or more is a rout, and a win after being this many or more behind is a comeback. */
export const NFL_ROUT = 21;
export const NFL_COMEBACK = 10;

/** No final of the NFL's score law (./nflScore.ts) has a side above this:
 *  ten drives of seven, and the three a level game adds. (The law's own cap
 *  on touchdowns keeps a side at 69 or under; this bound needs only the
 *  number of drives.) Game Day tells no final above it. */
export const NFL_MAX_SCORE = 7 * DRIVES + 3;

/** One sentence for the shape of a game. Every verb reads the same for a club named in the singular or the plural. */
export function nflShapeWords(shape: StoryShape, winner: string, loser: string): string {
  switch (shape) {
    case 'rout': return `${winner} won going away, by ${NFL_ROUT} or more.`;
    case 'comeback': return `${winner} came back from ${NFL_COMEBACK} or more down.`;
    case 'late': return `${winner} took the lead for good in the fourth quarter.`;
    case 'wire': return `${winner} scored first and led the rest of the way.`;
    default: return `${winner} went ahead for good after ${loser} had led or drawn level.`;
  }
}

export const NFL_GAME_DAY: GameDayLaw = {
  story: NFL_STORY_LAW,
  maxScore: NFL_MAX_SCORE,
  periods: {
    count: NFL_QUARTERS,
    /* minute 15 is the last minute of the first quarter (the clock reads Q1 0:00), minute 16 is Q2 14:00 */
    of: minute => Math.min(NFL_QUARTERS - 1, Math.max(0, Math.ceil(minute / QUARTER_MINUTES) - 1)),
    name: i => `Q${i + 1}`,
  },
  shape: { rout: NFL_ROUT, comeback: NFL_COMEBACK, say: nflShapeWords },
};

/** The "?" of an NFL Game Day card: what is real, what is this sim's own, one worked example. */
export const NFL_GAME_DAY_HELP: HelpWords = {
  title: 'Game Day',
  intro: [
    'Real: a touchdown is 6, the kick after it 1, a two point try 2, a field goal 3 and a safety 2.',
    'Real: four quarters of 15 minutes. We mark that one thin, because only one of our two sources for it was a full read.',
    'Real: a regular season game can end level. Not here: every game in this front office has a winner.',
    "This sim's own: your roster and theirs decide who wins. The score and every scoring play are then drawn for that winner, so the same saved game always tells the same story.",
    `This sim's own: a win by ${NFL_ROUT} or more is called a rout, and a win from ${NFL_COMEBACK} or more down a comeback.`,
    'Scores are told about the clubs. No player is credited with one.',
  ],
  controls: 'Watch plays the game on the clock. 3x is faster and Results goes straight to the final.',
  examples: [
    {
      head: 'A worked example',
      body: 'The final is 24 to 17. The winners went 7, 7, 7 and 3 by quarter and the losers 7, 7, 0 and 3. It was level at 14 at the half, the winners went ahead for good with a touchdown in the third quarter, and that touchdown is the play the card calls the one that decided it.',
    },
  ],
  footnote: 'Who scored is not modelled yet, only which club did.',
};
