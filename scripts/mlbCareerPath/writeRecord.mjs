// Wrap the built players into the committed record.
import fs from 'node:fs';
import { WORK } from './paths.mjs';
const { players, abbrMap, abbrConflicts } = JSON.parse(fs.readFileSync(new URL('record.players.json', WORK), 'utf8'));
if (abbrConflicts.length) throw new Error('abbreviation conflicts: ' + abbrConflicts.join('; '));
const bad = players.filter((p) => !p.position || !p.draftInfo || !p.teams || p.stats.length < 3 || p.awards.length < 2);
if (bad.length) throw new Error('incomplete rows: ' + bad.map((p) => p.id).join(','));
const record = {
  about: 'Round 924. Every line MLB Career Path (/baseball-career) shows a player, read on 2026-10-03 from two sources on two different hosts: the league\'s own data service (statsapi.mlb.com, the people endpoint with awards, draft and career and season by season stats) and baseball-reference.com (the player page: the Positions and Draft lines, the career row of the standard tables, the season rows and the award list at the top). Wikipedia and other wikis are never a source. A line ships only where both sources give the same value; anything they disagree on is listed under held and kept off the card. scripts/simMlbCareerPathFacts.mjs holds src/data/baseballCareerPlayers.ts to this record line for line.',
  rules: {
    position: 'baseball-reference\'s first listed position, which must also be the position with the most career games in the field in the league data (outfield grouped when baseball-reference groups it). A pitcher is a Starting Pitcher when at least half his games were starts in both sources, else a Relief Pitcher. A second listed Pitcher with 100 or more games pitched makes it Hitter / Pitcher.',
    draftInfo: 'the last draft both sources list (the one he signed). The overall pick is shown only where baseball-reference prints it too. With no draft in either source: Before the draft (first season Y) when his first big league season is before the first draft in 1965, else Not drafted (first season Y).',
    teams: 'every big league club in order of first appearance, named as the league data names that club in that season (so Florida Marlins, Cleveland Indians, Brooklyn Dodgers), checked one for one against baseball-reference\'s season rows. Negro Leagues seasons that MLB recognises as major league count, in both sources, which is why Willie Mays starts with the Birmingham Black Barons in 1948 and Jackie Robinson with the Kansas City Monarchs in 1945.',
    stats: 'regular season career totals, identical in both sources. Hitters: AVG, HR, and Hits when 3,000 or more (or when the two disagree on RBI), else RBI. Pitchers: W (SV for a closer with 300 or more), ERA, SO. For a player still active a count is shown as a floor (rounded down to 10, or to 5 under 100) with a plus, true for every later season; a rate (AVG, ERA) carries asOf, the last day of the 2026 regular season (2026-09-27, the league\'s own regularSeasonEndDate).',
    awards: 'at most four, in the order MVP, Cy Young, World Series titles, World Series MVP, Rookie of the Year, Hall of Fame, All-Star, Gold Glove, Silver Slugger, and only where the league\'s award list and baseball-reference\'s count agree. All-Star counts selections (two games a year from 1959 to 1962). Hall of Fame is the induction class year, the same in both. A line on an active player carries asOf because November awards can move a count.',
    titles: 'wsTitles is the league\'s own World Series Championship list for the player, with the club he played for that season. titleExceptions lists every season a pool teammate won it with him on the roster while his own sources leave it out; the harness fails on any teammate disagreement not listed here.',
    currentTeam: 'for an active player, his 2026 club in the league data, which must match scripts/data/mlbRosters2026.json (the 40 man rosters on the last day of the 2026 regular season).',
  },
  read: '2026-10-03',
  seasonEnd: '2026-09-27',
  removedDuplicates: ['bc-028 Ken Griffey Jr. (second copy of bc-015)', 'bc-029 Mariano Rivera (second copy of bc-006)', 'bc-032 Pedro Martinez (second copy of bc-008)'],
  bbrefAbbreviations: abbrMap,
  players,
};
fs.writeFileSync(new URL('../data/mlbCareerPathVerified2026-10.json', import.meta.url), JSON.stringify(record, null, 1) + '\n');
console.log('wrote record', players.length, 'players');
