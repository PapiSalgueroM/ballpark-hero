/* Review mutation A (one source misread): Hockey Reference's receipt prints PIT over NYR 4-2 in the 2015-16
   first round, the league's still 4-1. Expected: simUsSeasonLedger red at N10 (the receipts print different
   series). Refuses (exit 2) when the series is not there once. */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'scripts/data/usSeasonSources1312.json';
const j = JSON.parse(readFileSync(F, 'utf8'));
const r = j.sources['hr-playoffs-1312'].values.series['2015'][0];
const i = r.indexOf('PIT NYR 4-1');
if (i < 0 || r.lastIndexOf('PIT NYR 4-1') !== i) { console.log('MUTATION A ABORTED: PIT NYR 4-1 not there once'); process.exit(2); }
r[i] = 'PIT NYR 4-2';
writeFileSync(F, JSON.stringify(j, null, 2) + '\n');
console.log('mutation A applied: hr-playoffs-1312 2015 round 1 PIT NYR 4-2');
