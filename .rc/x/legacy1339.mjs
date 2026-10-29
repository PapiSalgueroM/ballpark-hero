/* Runner only: puts main's old worldMarket line back into src/lib/clubManager.ts IN PLACE (restore with git checkout -- src). */
import fs from 'node:fs';
import { withLegacyToday } from '../../scripts/lib/cmOwnClubMarket1339.mjs';
const F = 'src/lib/clubManager.ts';
fs.writeFileSync(F, withLegacyToday(fs.readFileSync(F, 'utf8')));
console.log('legacy1339: the old line is back in', F);
