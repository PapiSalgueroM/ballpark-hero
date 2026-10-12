/* Review mutation B (an off by one at a window's edge in the generator that wrote the receipts): the season
   2012-13, the last of the 2006 window, is missing from BOTH season by season receipts (series, rounds).
   Expected: simUsSeasonLedger red at N9 and N10. Refuses (exit 2) when 2012 is not there in both. */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'scripts/data/usSeasonSources1312.json';
const j = JSON.parse(readFileSync(F, 'utf8'));
for (const k of ['nhl-records-playoffs', 'hr-playoffs-1312']) {
  const v = j.sources[k].values;
  if (!v.series?.['2012'] || !v.rounds?.['2012']) { console.log(`MUTATION B ABORTED: ${k} has no 2012`); process.exit(2); }
  delete v.series['2012']; delete v.rounds['2012'];
}
writeFileSync(F, JSON.stringify(j, null, 2) + '\n');
console.log('mutation B applied: 2012 taken out of both season by season receipts');
