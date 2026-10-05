/**
 * Round 1014: the competition shape the Aussie Rules Manager full season plays,
 * in the shape of nflPlayoffFormatHistory.ts. Every fact carries either the
 * ids of at least two sources from distinct publishers (never a wiki) or the
 * flag gameRule, which means the copy must call it this game's rule and never
 * the AFL's. The receipts live in docs/audits/AUSSIE-RULES-FORMAT-SOURCES-2026-10.md.
 *
 * The clubs and players stay fictional (see the header of aussieRulesLeague.ts
 * for why); only the shape of the competition is real.
 */
import type { FinalsTie } from '@/lib/finalsBracket';

export const AFL_FORMAT_VERIFIED_ON = '2026-10-05';

export interface AflFormatSource { id: string; publisher: string; title: string; url: string }

export const AFL_FORMAT_SOURCES: AflFormatSource[] = [
  { id: 'reg26', publisher: 'AFL', title: 'AFL Regulations, Final 11 February 2026', url: 'https://resources.afl.com.au/afl/document/2026/02/13/54c158af-15e9-483b-a195-62a0f4e33b11/AFL-Regulations-Final-11-February-2026-.pdf' },
  { id: 'aflwildcard', publisher: 'AFL', title: 'Biggest finals shake-up in 25 years as Wildcard Round introduced', url: 'https://www.afl.com.au/news/1451972/biggest-finals-shake-up-in-25-years-as-wildcard-round-introduced' },
  { id: 'aflwildcardexplained', publisher: 'AFL', title: 'What is Wildcard Round and how does it work?', url: 'https://www.afl.com.au/news/1589531/what-is-wildcard-round-and-how-does-it-work-rankings-system-explained-finals-history-and-more' },
  { id: 'aflfixture', publisher: 'AFL', title: '2026 Toyota AFL Premiership Fixture Confirmed', url: 'https://www.afl.com.au/news/1452366/2026-toyota-afl-premiership-fixture-confirmed' },
  { id: 'afldraftorder', publisher: 'AFL', title: 'Draft order, week of 2026-10-05', url: 'https://www.afl.com.au/news/1625557/draft-order-how-hawthorn-hawks-can-get-deals-done-for-ben-king-and-zach-merrett-melbourne-demons-hold-two-top-pi' },
  { id: 'abcwildcard', publisher: 'ABC News', title: 'AFL gives teams finishing 10th chance to win premiership through wildcard round in finals', url: 'https://www.abc.net.au/news/2025-11-10/afl-introduces-wildcard-round-to-finals/105990434' },
  { id: 'abc2026', publisher: 'ABC News', title: "From rule changes to new wildcard round, here's what's new in AFL for 2026", url: 'https://www.abc.net.au/news/2026-03-03/whats-new-in-the-afl-for-2026-rule-change-wildcard-round-sub/106376360' },
  { id: 'abcpercentage', publisher: 'ABC News', title: 'The maths that will decide the AFL finals', url: 'https://www.abc.net.au/news/2017-06-19/the-maths-that-will-decide-the-afl-finals/8630874' },
  { id: 'espnextratime', publisher: 'ESPN', title: 'AFL dumps golden score for tied finals', url: 'https://www.espn.com.au/afl/story/_/id/28323336/afl-dumps-golden-score-tied-finals' },
  { id: 'senfinaleight', publisher: 'SEN', title: '31 years of the final eight', url: 'https://www.sen.com.au/news/2025/11/12/afl-final-eight-when-did-it-start' },
  { id: 'zhladder', publisher: 'Zero Hanger', title: 'AFL Ladder 2026', url: 'https://www.zerohanger.com/afl/afl-ladder/' },
  { id: 'zhdraftorder', publisher: 'Zero Hanger', title: 'AFL Draft Order 2026', url: 'https://www.zerohanger.com/afl/afl-draft-order-2026/' },
  { id: 'afltables2026', publisher: 'AFL Tables', title: '2026 season page (documented statistics dataset)', url: 'https://afltables.com/afl/seas/2026.html' },
];

/** A fact is either two-sourced or this game's own rule. */
export type FormatFact = { verified: true; sources: string[]; value: string } | { gameRule: true; value: string };

const verified = (value: string, ...sources: string[]): FormatFact => ({ verified: true, sources, value });
const gameRule = (value: string): FormatFact => ({ gameRule: true, value });

/** Receipts with the line relied on and the read date: docs/audits/AUSSIE-RULES-FORMAT-SOURCES-2026-10.md. */
export const AFL_FORMAT_FACTS: Record<string, FormatFact> = {
  finals2026: verified('From 2026 the finals are a final ten: 7th hosts 10th and 8th hosts 9th in a Wildcard Round on the old pre-finals bye weekend, the higher ranked winner becomes the 7th seed and the lower the 8th, then the final eight runs as it has since 2000.', 'aflwildcard', 'abcwildcard'),
  finalEight: verified('Qualifying finals 1v4 and 2v3, elimination finals 5v8 and 6v7, semi finals loser QF1 v winner EF1 and loser QF2 v winner EF2, preliminary finals winner QF1 v winner SF2 and winner QF2 v winner SF1, then the Grand Final. The top four have the double chance.', 'aflwildcardexplained', 'senfinaleight'),
  extraTime: verified('A drawn final, the Grand Final included, plays two 3 minute periods of extra time; if still level, another two, repeated until there is a winner. No golden score.', 'reg26', 'espnextratime'),
  ladderPoints: verified('Four points for a win, two for a draw, none for a loss.', 'reg26', 'zhladder'),
  percentage: verified('Percentage is points for divided by points against, times 100, and splits clubs level on points.', 'reg26', 'abcpercentage'),
  ladderTiebreak: gameRule('Level on points and percentage, the club listed first in the club list ranks higher. The real ladder goes to head to head results and then a draw by lot.'),
  clubs: verified('Eighteen clubs.', 'aflfixture', 'zhladder'),
  games: verified('Twenty three home and away games for each club: 17 opponents once and 6 twice.', 'aflfixture', 'afltables2026'),
  season: gameRule('The games are played as 23 rounds with no byes. The real season has an Opening Round and 24 more rounds with two byes per club.'),
  draftOrder: verified('Clubs that missed the finals pick first in reverse ladder order, then the wildcard losers, the elimination final, semi final and preliminary final losers, each group in reverse ladder order, then the runner up and the premier.', 'afldraftorder', 'zhdraftorder'),
  draftRepeat: gameRule('The order repeats until every list is back to 36. Priority, father son, academy and compensation picks are not modelled.'),
  draftAge: gameRule('Draftees are 18. The real rule: 18 by 31 December of the draft year.'),
  listSize: gameRule('Thirty six players on every list.'),
};

/** The finals systems this game can play. The tie list is data for finalsBracket.ts. */
export type AussieFinalsFormat = 'final8' | 'wildcard';

const FINAL_EIGHT_WEEKS = (offset: number, ef1Away: FinalsTie['away'], ef2Away: FinalsTie['away']): FinalsTie[] => [
  { id: 'QF1', week: offset, home: { seed: 1 }, away: { seed: 4 } },
  { id: 'QF2', week: offset, home: { seed: 2 }, away: { seed: 3 } },
  { id: 'EF1', week: offset, home: { seed: 5 }, away: ef1Away },
  { id: 'EF2', week: offset, home: { seed: 6 }, away: ef2Away },
  { id: 'SF1', week: offset + 1, home: { loserOf: 'QF1' }, away: { winnerOf: 'EF1' } },
  { id: 'SF2', week: offset + 1, home: { loserOf: 'QF2' }, away: { winnerOf: 'EF2' } },
  { id: 'PF1', week: offset + 2, home: { winnerOf: 'QF1' }, away: { winnerOf: 'SF2' } },
  { id: 'PF2', week: offset + 2, home: { winnerOf: 'QF2' }, away: { winnerOf: 'SF1' } },
  { id: 'GF', week: offset + 3, home: { winnerOf: 'PF1' }, away: { winnerOf: 'PF2' } },
];

export const FINALS_PRESETS: Record<AussieFinalsFormat, { qualifiers: number; ties: FinalsTie[]; fact: string }> = {
  final8: { qualifiers: 8, ties: FINAL_EIGHT_WEEKS(0, { seed: 8 }, { seed: 7 }), fact: 'finalEight' },
  wildcard: {
    qualifiers: 10,
    ties: [
      { id: 'WC1', week: 0, home: { seed: 7 }, away: { seed: 10 } },
      { id: 'WC2', week: 0, home: { seed: 8 }, away: { seed: 9 } },
      // 5th meets the lower ranked wildcard winner, 6th the higher ranked one.
      ...FINAL_EIGHT_WEEKS(1, { rankedWinnerOf: ['WC1', 'WC2'], rank: 1 }, { rankedWinnerOf: ['WC1', 'WC2'], rank: 0 }),
    ],
    fact: 'finals2026',
  },
};

/** The format a new season starts under. A save keeps the format its season began with. */
export const CURRENT_FINALS_FORMAT: AussieFinalsFormat = 'wildcard';

/** Extra time in this game's dice minutes (a quarter is 20): blocks of two flat 3 minute periods, repeated until
 *  somebody leads. blockBound only guards the loop; simAussieRulesSeason shows it is never reached. */
export const EXTRA_TIME = { periods: 2, minutes: 3, blockBound: 20 };

/** How far a club went, from the id of the tie it lost. */
export type FinalsExit = 'missed' | 'wildcard' | 'elimination' | 'semi' | 'preliminary' | 'runnerUp' | 'premiers';
export function exitForTie(tieId: string): FinalsExit {
  if (tieId.startsWith('WC')) return 'wildcard';
  if (tieId.startsWith('EF') || tieId.startsWith('QF')) return 'elimination';
  if (tieId.startsWith('SF')) return 'semi';
  if (tieId.startsWith('PF')) return 'preliminary';
  return 'runnerUp';
}
export const EXIT_LABELS: Record<FinalsExit, string> = {
  missed: 'Missed the finals', wildcard: 'Out in the Wildcard Round', elimination: 'Out in week one', semi: 'Out in a semi final',
  preliminary: 'Out in a preliminary final', runnerUp: 'Runner up', premiers: 'Premiers',
};

/**
 * Club nicknames this game must never use: senior men's and women's clubs in the
 * AFL, AFLW, VFL, SANFL, WAFL and NRL. A guard against a fictional club wearing
 * a real one's name, not a claim about any of them.
 */
export const NICKNAME_DENY_LIST = [
  'Crows', 'Lions', 'Blues', 'Magpies', 'Bombers', 'Dockers', 'Cats', 'Suns', 'Giants', 'Hawks', 'Demons', 'Kangaroos', 'Roos',
  'Power', 'Tigers', 'Saints', 'Swans', 'Eagles', 'Bulldogs', 'Broncos', 'Raiders', 'Sharks', 'Dolphins', 'Titans', 'Sea Eagles',
  'Storm', 'Knights', 'Cowboys', 'Eels', 'Panthers', 'Rabbitohs', 'Dragons', 'Roosters', 'Warriors', 'Zebras', 'Seagulls', 'Bullants',
  'Redlegs', 'Bloods', 'Double Blues', 'Royals', 'Thunder', 'Falcons', 'Borough', 'Stingrays',
];
