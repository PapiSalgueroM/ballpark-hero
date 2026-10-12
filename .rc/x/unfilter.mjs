// Runner only: remove PR235's loan filter from the engine in this checkout (the inverse proven equal to merge c's first
// parent). The request line restores src with git checkout afterwards.
import fs from 'node:fs';
const F = 'src/lib/soccerCareerEngine.ts';
const FILTER = ' && projectLeagueApps(state.overall, c.tier, c.name, 0).min >= 20);';
const src = fs.readFileSync(F, 'utf8');
if (src.split(FILTER).length !== 2) { console.error('unfilter: anchor must stand once'); process.exit(2); }
fs.writeFileSync(F, src.replace(FILTER, ');'));
console.log('unfilter: the loan filter is out of the engine');
