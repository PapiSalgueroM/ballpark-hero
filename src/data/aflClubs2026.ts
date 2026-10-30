/**
 * Round 1572: the 18 AFL clubs of 2026, by name, for Aussie Rules Manager.
 *
 * NAMES ONLY. Never a logo, crest, colour, guernsey or mascot (CLAUDE.md's legal
 * rules), and no player: every player, rating and result in the game is made up
 * by the game. The nickname deny list in aussieRulesFormat.ts guards the invented
 * club set and does not apply here.
 *
 * THE RULE: every string the game prints is printed by two independent non wiki
 * publishers, compared case insensitively with spaces and punctuation exact.
 * AFL.com.au and every club site are ONE publisher (the club sites carry the
 * AFL's copyright). A full form with one source falls back to the short form and
 * a short form with one source to the full form. The receipts, with each page's
 * address and the line as it printed, are in scripts/data/aflClubNames2026.json,
 * and scripts/simAflClubNames.mjs section 0 holds this file to them.
 *
 * ladder2026 is the club's place on the 2026 final home and away ladder, read
 * from AFL Tables and Zero Hanger. Nothing else here is typed: which club id,
 * style and tier a club takes is derived from this place by clubIdentities() in
 * src/lib/aussieRulesLeague.ts. Data only: this file imports nothing.
 */
export const AFL_CLUBS_VERIFIED_ON = '2026-10-29';

export interface AflClubSource { id: string; publisher: string }
export const AFL_CLUB_SOURCES: AflClubSource[] = [
  { id: 'afl', publisher: 'AFL' },
  { id: 'austadiums', publisher: 'Austadiums' },
  { id: 'afltables', publisher: 'AFL Tables' },
  { id: 'zerohanger', publisher: 'Zero Hanger' },
  { id: 'abc-score', publisher: 'ABC News' },
  { id: 'abc-article', publisher: 'ABC News' },
  { id: 'foxsports', publisher: 'Fox Sports Australia' },
];

export interface AflClub2026 { full: string; short: string; ladder2026: number; fullSources: string[]; shortSources: string[]; ladderSources: string[] }
/** In 2026 ladder order. No ids here: they are derived (clubIdentities). */
export const AFL_CLUBS_2026: AflClub2026[] = [
  { full: 'Fremantle', short: 'Fremantle', ladder2026: 1, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Sydney Swans', short: 'Sydney', ladder2026: 2, fullSources: ['afl', 'austadiums'], shortSources: ['afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Brisbane Lions', short: 'Brisbane', ladder2026: 3, fullSources: ['austadiums', 'afltables'], shortSources: ['afl', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Hawthorn', short: 'Hawthorn', ladder2026: 4, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Geelong Cats', short: 'Geelong', ladder2026: 5, fullSources: ['austadiums', 'abc-score', 'foxsports'], shortSources: ['afl', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Adelaide Crows', short: 'Adelaide', ladder2026: 6, fullSources: ['afl', 'austadiums'], shortSources: ['afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Melbourne', short: 'Melbourne', ladder2026: 7, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Western Bulldogs', short: 'Western Bulldogs', ladder2026: 8, fullSources: ['afl', 'austadiums', 'afltables'], shortSources: ['afl', 'austadiums', 'afltables'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Collingwood', short: 'Collingwood', ladder2026: 9, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Carlton', short: 'Carlton', ladder2026: 10, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'St Kilda', short: 'St Kilda', ladder2026: 11, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'GWS Giants', short: 'GWS', ladder2026: 12, fullSources: ['afl', 'austadiums', 'abc-score', 'foxsports'], shortSources: ['zerohanger', 'abc-article'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Gold Coast Suns', short: 'Gold Coast', ladder2026: 13, fullSources: ['afl', 'austadiums'], shortSources: ['afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'North Melbourne', short: 'North Melbourne', ladder2026: 14, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Port Adelaide', short: 'Port Adelaide', ladder2026: 15, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'West Coast Eagles', short: 'West Coast', ladder2026: 16, fullSources: ['afl', 'austadiums'], shortSources: ['afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Richmond', short: 'Richmond', ladder2026: 17, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
  { full: 'Essendon', short: 'Essendon', ladder2026: 18, fullSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], shortSources: ['afl', 'austadiums', 'afltables', 'zerohanger'], ladderSources: ['afltables', 'zerohanger'] },
];
