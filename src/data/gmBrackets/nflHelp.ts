/* Round 1224: the words of the "?" a bracket card opens for the NFL
   postseason. They sit apart from the bracket data (./nfl.ts) because a
   press and a save validator need the data in the board's own chunk and only
   a card that is drawn needs these sentences, and a module is never split
   across chunks.

   Every fact said to be real here is sourced in the header of ./nfl.ts, two
   publishers that are not a wiki for each. What is this sim's own is said to
   be: the lean of the title game (the engine's own arithmetic, held to the
   engine by src/lib/gmBracket.test.ts), the seeding, and that the injury
   clock stops after the regular season. The round that draws the card reads
   these sentences against it: the `controls` line names what a press does,
   and the last line of the intro is the bind's to keep true. */
import { NFL_BRACKET_SEASONS, NFL_TITLE_GAME_LEAN } from './nfl';
import type { HelpWords } from '@/components/season-centre/SeasonCentreHelp';

/** The "?" of the NFL bracket: what is real, what is this sim's own, one worked example. */
export const NFL_BRACKET_HELP: HelpWords = {
  title: 'The playoffs',
  intro: [
    `Real, the format as it stood in ${NFL_BRACKET_SEASONS.asOf} (in use since the ${NFL_BRACKET_SEASONS.from} season): 14 clubs, seven a conference. The four division winners are seeds 1 to 4 and three wild cards are seeds 5 to 7. Only the top seed sits out the Wild Card round.`,
    'Real: the Wild Card round is 2 against 7, 3 against 6 and 4 against 5. After it the top seed meets the lowest seed left, and the better seed hosts every game through the conference championships.',
    'Real: the Super Bowl is played at a site picked beforehand, so neither club hosts it by its seed.',
    `This sim's own: the title game here is not level ground. The engine gives the club it names first a small edge and it names the AFC champion first, so a level title game goes to the AFC champion about ${NFL_TITLE_GAME_LEAN} times in 100.`,
    "This sim's own: the seeds are frozen when the bracket opens, and they come from this game's own standings (record, then roster strength), not the league's tiebreakers.",
    "This sim's own: the injury clock only runs in the regular season. Nobody heals and nobody is hurt between playoff rounds.",
  ],
  controls: 'One press plays one round. Sim the rest plays every round that is left.',
  examples: [
    {
      head: 'A worked example',
      body: 'Seed 7 wins at seed 2, seed 3 beats seed 6 and seed 5 wins at seed 4. In the Divisional round seed 1 hosts seed 7, the lowest seed left, and seed 3 hosts seed 5.',
    },
  ],
  footnote: `The real format can change in a later season. This is the one in use in ${NFL_BRACKET_SEASONS.asOf}.`,
};
