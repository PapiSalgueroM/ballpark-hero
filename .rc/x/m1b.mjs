/* Fixer, Round 1540, FOR THE LEAD'S RULING ON M1 ONLY (never committed): option (b) tried on a runner. A draftee
   with three seasons or fewer is restricted at the end of his first deal with whatever Bird tier he holds (the
   full Bird requirement dropped from gmContracts.ts nbaRestricted). The line that runs this swaps in 822bd75d's
   earned desk replay of simNbaGmDesk and restores src and scripts with git checkout afterwards. */
import fs from 'node:fs';

const file = 'src/lib/gmContracts.ts';
const from = "  if (service == null || birdTier(ledger, league, man) !== 'full') return false;";
const to = '  if (service == null) return false;';
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`M1B: anchor found ${n} times in ${file}, nothing changed`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`M1B APPLIED in ${file}`);
