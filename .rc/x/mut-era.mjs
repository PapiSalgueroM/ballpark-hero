/* Review of Round 1301 (runner only, never committed): a MEASUREMENT switch, not a mutation of a rule.
   A career with no era named starts in the sport's throwback era, so the Hall harness's own loop and fleet play it.
   usage: node mut-era.mjs <nfl|nba|mlb|nhl>     (from the root of the tree; restore with git checkout -- src) */
import { readFileSync, writeFileSync } from 'node:fs';
const sport = process.argv[2];
const U = { nfl: 'NFL', nba: 'NBA', mlb: 'MLB', nhl: 'NHL' }[sport];
if (!U) { console.error('mut-era: ABORTED, name a sport'); process.exit(2); }
const file = `src/lib/${sport}MyCareer.ts`;
const was = `return ${U}_ERAS.find(e => e.id === id) ?? ${U}_ERAS[0];`, now = `return ${U}_ERAS.find(e => e.id === id) ?? ${U}_ERAS[1];`;
const src = readFileSync(file, 'utf8');
const n = src.split(was).length - 1;
if (n !== 1) { console.error(`mut-era ${sport}: ABORTED, the line is in ${file} ${n} times, wanted exactly 1`); process.exit(2); }
writeFileSync(file, src.replace(was, now));
console.log(`mut-era ${sport}: careers with no era named now start in the throwback era`);
