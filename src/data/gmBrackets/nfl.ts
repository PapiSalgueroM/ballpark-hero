/* Round 1224: the NFL postseason as bracket DATA (src/lib/gmBracket.ts plays
   it, src/lib/finalsBracket.ts resolves it). Seeds are listed AFC 1 to 7 and
   then NFC 1 to 7, so seed 8 is the NFC's top seed.

   WHICH SEASONS THIS IS TRUE FOR: the 2020 season on, as the format stood in
   2025 (read 2026-10-10). The front office plays 2026, 2027 and on with it;
   a later real change is not known here and the "?" says so.

   THE FACTS, each read on two publishers that are not a wiki:
   A. 14 clubs, seven a conference: four division winners seeded 1 to 4 and
      three wild cards seeded 5 to 7; only the top seed of each conference
      sits out the Wild Card round, which pairs 2 with 7, 3 with 6 and 4 with
      5; one game a round, lose and you are out. Already in the repo's
      ledgers, not read again here: src/lib/nflPlayoffFormatHistory.ts
      (period `fourteen-teams`: Chicago Bears, "History of how NFL playoffs
      have expanded"; NFL, "Owners approve expanding postseason to 14 teams")
      and src/data/usLeagueShape.ts (NBC Sports and Sports Illustrated).
   B. After the Wild Card round the top seed meets the LOWEST seed left, and
      the other two winners meet each other (some call that reseeding and one
      of these says it is not; they describe the same pairings).
      1. NBC Sports, "How do the 2025-26 NFL playoffs work? Teams, first-round
         byes, bracket, reseeding" (7 January 2026).
      2. Sports Illustrated, "Does the NFL Reseed After Each Round? Playoff
         Format Explained" (10 January 2026).
      Also read: Fox Sports, "NFL Playoff Format: How does the NFL postseason
      work?" (updated 22 December 2025), and the Rochester Democrat and
      Chronicle, "How NFL playoffs work: Schedule, bracket, format in 2024-25
      postseason" (6 January 2025, read as carried by Yahoo Sports).
   C. The better seed hosts every game through the conference championships.
      1. NBC Sports (as in B): the better seed hosts in the Wild Card round,
         the Divisional round and the conference championship games.
      2. The Democrat and Chronicle (as in B): the same three rounds.
   D. The Super Bowl is played at a site picked beforehand, so neither club
      hosts it by its seed.
      1. NBC Sports (as in B) calls it a neutral site game between the two
         conference champions.
      2. The Democrat and Chronicle (as in B) calls it a predetermined site.
      The two do not use the same word. What both support, and all the "?"
      claims, is a site settled before the two clubs are known.

   THIS SIM'S OWN, said in the "?": the engine (src/lib/frontOffice.ts,
   `runPlayoffs`) names the AFC champion first in the title game and its
   `winProb` gives the first club two points, so a level title game goes to
   the AFC champion 58 times in 100 (1 / (1 + 10^(-2/14)); the unit test
   holds the figure to the engine and scripts/simGmGameDay.mjs prints the
   share over its fleet). `neutral` below is for a card's words only. The
   seeding is the engine's own (record, then roster strength: not the
   league's tiebreakers), and nobody heals or is hurt between rounds.

   scripts/simGmGameDay.mjs holds this data to the engine's one press
   postseason, game for game and draw for draw, against a recorded fixture. */
import type { BracketFormat, BracketTie } from '../../lib/gmBracket';
import type { HelpWords } from '@/components/season-centre/SeasonCentreHelp';

/** The seasons the format below is the real one for (`to` null: still in use when it was read). */
export const NFL_BRACKET_SEASONS = { from: 2020, to: null as number | null, asOf: 2025, readOn: '2026-10-10' } as const;

const conference = (conf: 'AFC' | 'NFC', top: number): BracketTie[] => {
  const wc = [`${conf}-WC-1`, `${conf}-WC-2`, `${conf}-WC-3`];
  const div = [`${conf}-DIV-1`, `${conf}-DIV-2`];
  return [
    { id: wc[0], week: 1, round: `${conf} Wild Card`, home: { seed: top + 1 }, away: { seed: top + 6 } },
    { id: wc[1], week: 1, round: `${conf} Wild Card`, home: { seed: top + 2 }, away: { seed: top + 5 } },
    { id: wc[2], week: 1, round: `${conf} Wild Card`, home: { seed: top + 3 }, away: { seed: top + 4 } },
    /* the top seed against the lowest seed left, then the other two winners, the better seed at home */
    { id: div[0], week: 2, round: `${conf} Divisional`, home: { seed: top }, away: { rankedWinnerOf: wc, rank: 2 } },
    { id: div[1], week: 2, round: `${conf} Divisional`, home: { rankedWinnerOf: wc, rank: 0 }, away: { rankedWinnerOf: wc, rank: 1 } },
    { id: `${conf}-CC`, week: 3, round: `${conf} Championship`, home: { rankedWinnerOf: div, rank: 0 }, away: { rankedWinnerOf: div, rank: 1 } },
  ];
};
const afc = conference('AFC', 1);
const nfc = conference('NFC', 8);

/** Fourteen clubs, one bye a conference, one game a round. List order inside a week is the AFC and then the NFC, the engine's own order. */
export const NFL_BRACKET: BracketFormat = {
  id: 'nfl-14',
  qualifiers: 14,
  ties: [
    ...[1, 2, 3].flatMap(week => [...afc.filter(t => t.week === week), ...nfc.filter(t => t.week === week)]),
    { id: 'SB', week: 4, round: 'Super Bowl', home: { winnerOf: 'AFC-CC' }, away: { winnerOf: 'NFC-CC' }, neutral: true },
  ],
  winsNeeded: { 1: 1, 2: 1, 3: 1, 4: 1 },
};

/** The bracket a front office season is played with, or null for a season before this format. */
export function nflBracketFor(season: number): BracketFormat | null {
  return Number.isInteger(season) && season >= NFL_BRACKET_SEASONS.from ? NFL_BRACKET : null;
}

/** THIS SIM'S OWN: how often the club named first wins a level title game, in 100 (see the header). */
export const NFL_TITLE_GAME_LEAN = 58;

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
