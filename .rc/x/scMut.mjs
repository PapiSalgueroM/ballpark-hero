/* Reviewer sc-engine, Release AW: one mutation of a pay or contract rule, on the RUNNER's checkout only.
 * node .rc/x/scMut.mjs <id>. Exit 3 when the line is not there exactly once (the mutation could not be made). */
import fs from 'node:fs';

const ENGINE = 'src/lib/soccerCareerEngine.ts', INVERSE = 'scripts/lib/careerVeteranPay1262.mjs';
const M = {
  /* PR230 in the merged makeOffer: the form of the last season no longer reaches the quote. */
  A: { file: ENGINE, what: 'makeOffer hands the quote no seasons',
    from: 'const terms = soccerTransferTerms({ age, overall, weeklyWage: wage, seasons }, wage, rand(1, 5));',
    to: 'const terms = soccerTransferTerms({ age, overall, weeklyWage: wage, seasons: [] }, wage, rand(1, 5));' },
  /* Decision 4b: the brief call passes prev.seasons seventh. Take it out again. */
  B: { file: ENGINE, what: 'the brief offer gets no seasons (decision 4b undone)',
    from: 'new Set([prev.currentClub]), prev.marketValue, prev.seasons, false, candidates);',
    to: 'new Set([prev.currentClub]), prev.marketValue, [], false, candidates);' },
  /* PR218 in the merged makeOffer: a brief offer is paid for the tier of the club picked, not the tier drawn. */
  C: { file: ENGINE, what: 'a brief offer is paid for the drawn tier, not the club tier',
    from: 'let wage = wageForTier(preferredCandidates ? club.tier : tier, overall);',
    to: 'let wage = wageForTier(tier, overall);' },
  /* PR228: the card promises the quote and the engine pays the old 20 percent. */
  D: { file: ENGINE, what: 'the contract talk pays 20 percent whatever the card says',
    from: "demand.hit, 'Relationship damaged')) { s.weeklyWage = demand.weeklyWage;",
    to: "demand.hit, 'Relationship damaged')) { s.weeklyWage = Math.round(s.weeklyWage * 1.2);" },
  /* The fifth inverse with one half missing: the recordings must notice on the final head. */
  E: { file: INVERSE, what: 'the inverse takes only the offers condition out',
    from: 'export const VETERAN_PAY_ADDITIONS = Object.keys(EDITS);', to: "export const VETERAN_PAY_ADDITIONS = ['offers'];" },
  F: { file: INVERSE, what: 'the inverse takes only the talks condition out',
    from: 'export const VETERAN_PAY_ADDITIONS = Object.keys(EDITS);', to: "export const VETERAN_PAY_ADDITIONS = ['talks'];" },
};
const m = M[process.argv[2]];
if (!m) { console.error(`MUTATION CANNOT RUN: unknown id ${process.argv[2]}`); process.exit(3); }
const text = fs.readFileSync(m.file, 'utf8');
const n = text.split(m.from).length - 1;
if (n !== 1) { console.error(`MUTATION CANNOT RUN: the line is in ${m.file} ${n} times`); process.exit(3); }
fs.writeFileSync(m.file, text.replace(m.from, () => m.to));
console.log(`MUTATION APPLIED (${process.argv[2]}): ${m.what}`);
