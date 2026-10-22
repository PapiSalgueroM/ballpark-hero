/* Round 1523 fix2 probe (not committed): the lever reading for the lead's ruling on decision 2.
   Takes the rating tenth out of the morale step (soccerMoraleRating returns 0) and leaves the league game step as
   it is, so section 4's shift reads what the league games alone are worth. Run on a runner only, then
   git checkout -- src restores the file. */
import fs from 'node:fs';
const FILE = 'src/lib/careerForm.ts';
const WAS = 'return soccerMoraleStep(morale) / 10;';
const NOW = process.argv[2] === 'half' ? 'return soccerMoraleStep(morale) / 20;' : 'return 0;';
const text = fs.readFileSync(FILE, 'utf8');
if (text.split(WAS).length !== 2) { console.log(`ABORT: ${FILE} does not hold ${WAS} once`); process.exit(1); }
fs.writeFileSync(FILE, text.replace(WAS, NOW));
console.log(`mut-r0: ${FILE} now says ${NOW}`);
