// Review of Round 1508 (run lens): apply ONE named mutation to the runner's checkout. Exit 2 if its anchor is not
// found exactly once (so a mutation that changes nothing can never pass for a green). The request line restores the
// checkout with git checkout -- src scripts after the harnesses run.
import fs from 'node:fs';

const CM = 'src/lib/clubManager.ts';
const CAL = 'src/lib/clubManagerCalendar.ts';
const MUTS = {
  // the rival close guard back to the seed only test (an adopted career stops refusing a close the ledger refuses)
  rivalClose: [CM, '  return livingWorldOf(career) && recordAiDeal(career, deal, career) === career;',
    '  return worldSeedOf(career) !== undefined && recordAiDeal(career, deal, career) === career;'],
  // signFreeAgent's ledger branch back to the seed only test
  freeAgent: [CM, '  if (!livingWorldOf(career)) return state;', '  if (worldSeedOf(career) === undefined) return state;'],
  // joinClubNow's carry back to the seed only test
  joinCarry: [CAL, '...(!livingWorldOf(departed) ? {} : seededJoinCarry(career, s, movedElsewhere)),',
    '...(worldSeedOf(departed) === undefined ? {} : seededJoinCarry(career, s, movedElsewhere)),'],
  // off by one in the adoption's projection year: no man of mine matches his projected listing
  adoptYear: [CM, "projectedWorldFor(career.eraId ?? 'now', yearsOn(career))", "projectedWorldFor(career.eraId ?? 'now', yearsOn(career) + 1)"],
  // the adoption forgets the men out on loan from me
  adoptLoans: [CM, '...(career.loanedOut ?? []).map(l => l.player)]', ']'],
  // generateHeadlines back to the seed only test
  headlines: [CM, '  const seen = livingWorldOf(state) ? state : null;', '  const seen = worldSeedOf(state) === undefined ? null : state;'],
  // the adoption records a man the projection lists at two clubs (takes the first)
  adoptTwoClubs: [CM, 'if (clubs.length !== 1 || clubs[0] === career.clubName) continue;', 'if (!clubs.length || clubs[0] === career.clubName) continue;'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`mut: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mut ${name}: ABORT, anchor found ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mut ${name}: applied to ${file}`);
