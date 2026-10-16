// Fix of Round 1508: apply ONE named mutation to the runner's checkout so clubManagerAdoption.test.ts can be shown to
// catch it. Exit 2 if the anchor is not there exactly once, so a mutation that changes nothing never passes for red.
// The request line restores the checkout with git checkout HEAD -- src scripts.
import fs from 'node:fs';

const CM = 'src/lib/clubManager.ts';
const MUTS = {
  // the run review's minor 3: the adoption forgets the men out on loan from me
  adoptLoans: [CM, '...(career.loanedOut ?? []).map(l => l.player)]', ']'],
  // the run review's minor 4: the adoption records a man the projection lists at two clubs (takes the first)
  adoptTwoClubs: [CM, 'if (clubs.length !== 1 || clubs[0] === career.clubName) continue;', 'if (!clubs.length || clubs[0] === career.clubName) continue;'],
  // the run review's minor 2: signFreeAgent's ledger branch back to the seed only test
  freeAgent: [CM, '  if (!livingWorldOf(career)) return state;', '  if (worldSeedOf(career) === undefined) return state;'],
  // the read review's minor 5: the fix taken back (an era with no squads adopted with an empty ledger)
  eraWait: [CM, '  if (livingWorldOf(career) || !eraRostersLoaded(career.eraId)) return career;', '  if (livingWorldOf(career)) return career;'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`mut2: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mut2 ${name}: ABORT, anchor found ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mut2 ${name}: applied to ${file}`);
