/* Review mutation C (a stale constant copied down a table): NHL_OVERTIME_BY_SEASON's 2012-13 row given
   1,230 games like its neighbours instead of the lockout season's 720. Expected: simUsSeasonLedger red at N12.
   Refuses (exit 2) when the row is not there once. */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'src/data/usSeasonLedgerNhl.ts';
const t = readFileSync(F, 'utf8');
const from = '2012: { games: 720, pastSixty: 162, shootouts: 97 },';
if (t.split(from).length !== 2) { console.log('MUTATION C ABORTED: the 2012 overtime row is not there once'); process.exit(2); }
writeFileSync(F, t.replace(from, '2012: { games: 1230, pastSixty: 162, shootouts: 97 },'));
console.log('mutation C applied: 2012 overtime row on 1230 games');
