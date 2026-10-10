/** Restore only the engine behavior changed by contracts and club moves.
 * The bundle asserts every source needle exists and was applied. Full save
 * comparisons must keep every field, including wages, events and fees.
 */
export const SOCCER_CONTRACT_1177_BASELINE_PATCHES = [
  {
    file: 'src/lib/soccerCareerEngine.ts',
    from: "    const quote = soccerExtensionQuote(s, 'renewal');\n    s.contractYearsLeft = quote.contractYears ?? rand(2, 4);\n    s.weeklyWage = quote.weeklyWage;",
    to: '    s.contractYearsLeft = rand(2, 4);',
  },
  {
    file: 'src/lib/soccerCareerEngine.ts',
    from: '  const quote = soccerExtensionQuote(s);\n  const extraYears = quote.contractYears ?? rand(2, 4);\n  s.contractYearsLeft = extraYears;\n  s.weeklyWage = quote.weeklyWage;',
    to: '  const extraYears = rand(2, 4);\n  s.contractYearsLeft = extraYears;\n  s.weeklyWage = Math.round(s.weeklyWage * 1.15);',
  },
  {
    file: 'src/lib/soccerCareerEngine.ts',
    from: '    Object.assign(s, completeClubVerdictMove(s));',
    to: '',
  },
];
