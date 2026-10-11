/* Fixer, Release AW: one mutation on the RUNNER's checkout only. node .rc/x/fxMut.mjs <id>.
 * Exit 3 when the text is not there exactly once (the mutation could not be made, so the line proves nothing). */
import fs from 'node:fs';
const PAGE = 'src/pages/SoccerCareer.tsx';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const M = {
  banner: { file: PAGE, what: 'the old FINAL SEASON banner is drawn beside the farewell card again',
    from: '{career.isFinalSeason && !career.retired && !readSoccerFarewell(career) && (',
    to: '{career.isFinalSeason && !career.retired && (' },
  group: { file: 'src/lib/soccerCurrency.ts', what: 'the grouped money line stops grouping',
    from: 'return localizeMoney(text, cur).replace(BARE_EUROS,',
    to: 'return localizeMoney(text, cur).replace(/never-matches-anything/g,' },
  brief4b: { file: ENGINE, what: 'the brief offer gets no seasons (decision 4b undone, the reviewer\'s mutation B)',
    from: 'new Set([prev.currentClub]), prev.marketValue, prev.seasons, false, candidates);',
    to: 'new Set([prev.currentClub]), prev.marketValue, [], false, candidates);' },
  agerule: { file: 'src/components/soccer-career/SoccerOfferReview.tsx', what: 'the pay rule leaves the contract review help',
    from: '<p data-offer-review-age-rule>From 30,',
    to: '<p hidden>From 31,' },
  agepolicy: { file: 'src/lib/soccerCareerContracts.ts', what: 'a veteran outside the bands loses 20 percent, not the 15 the help says',
    from: ': (veteran ? 0.85 : 0.95) - (form !== undefined && form < 6.7 ? 0.05 : 0);',
    to: ': (veteran ? 0.8 : 0.95) - (form !== undefined && form < 6.7 ? 0.05 : 0);' },
};
const m = M[process.argv[2]];
if (!m) { console.error('MUTATION CANNOT RUN: unknown id ' + process.argv[2]); process.exit(3); }
const text = fs.readFileSync(m.file, 'utf8');
const n = text.split(m.from).length - 1;
if (n !== 1) { console.error('MUTATION CANNOT RUN: the text is in ' + m.file + ' ' + n + ' times'); process.exit(3); }
fs.writeFileSync(m.file, text.replace(m.from, () => m.to));
console.log('MUTATION APPLIED (' + process.argv[2] + '): ' + m.what);
