// Round 1516 probe (runner only, never committed): the round's single engine input to the league rules digest
// reverted, season one's UEFA Super Cup open at startCareer taken out, so the base digest must replay green.
import fs from 'node:fs';
const F = 'src/lib/clubManager.ts';
const src = fs.readFileSync(F, 'utf8');
const A = "  openOneOff(state, { tables: null, seasonOne: true }, 'usc');\n";
if (src.split(A).length !== 2) { console.log('mutLR: ABORTED, the anchor is not there exactly once'); process.exit(2); }
fs.writeFileSync(F, src.split(A).join(''));
console.log('mutLR: applied');
