/* Round 1301, the cause (runner only, never committed): the ONE input put back.
   The NHL ledger's 84 games from 2026-27 become 82 again (the row and the formula),
   so the engine plays the season origin/main plays. Refuses to run when either
   string is not there exactly once, so a run that changed nothing cannot pass for a proof. */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/data/usSeasonLedgerNhl.ts';
const EDITS = [
  ['{ year: 2026, games: 84, teams: 32,', '{ year: 2026, games: 82, teams: 32,'],
  ['from: 2026, games: 84,', 'from: 2026, games: 82,'],
];
let src = readFileSync(FILE, 'utf8');
for (const [was, now] of EDITS) {
  const n = src.split(was).length - 1;
  if (n !== 1) { console.error(`mut84: ABORTED, "${was}" is there ${n} times, wanted exactly 1`); process.exit(2); }
  src = src.replace(was, now);
}
writeFileSync(FILE, src);
console.log(`mut84: ${EDITS.length} edits made in ${FILE}`);
