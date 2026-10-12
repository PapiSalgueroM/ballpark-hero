// Round 1314 reviewer (run lens): a copy of simHalftime that plays section 1 only (skip against watch, 60 an arm)
// and prints the three signed gaps in standard errors, so a fleet of seeds shows whether section 1's red on seed 4
// is a 3 SE tail or a real shift. Usage: node .rc/x/mkSec1.mjs <tag>, then SIM_SEED=N node scripts/htSec1-<tag>.mjs
import fs from 'node:fs';

const tag = process.argv[2] || 'x';
const src = fs.readFileSync('scripts/simHalftime.mjs', 'utf8').split('\r\n').join('\n');
const endOf1 = "  if (mean(skip.map(r => r.breaks)) > 0) fail('skipHalftime still stopped at halftime');\n}\n";
if (src.split(endOf1).length !== 2) { console.error('mkSec1: the end of section 1 is not where it was'); process.exit(3); }
const z = "  console.log(`Z points ${((wp - sp) / se).toFixed(2)} gf ${((wg - sg) / seG).toFixed(2)} ga ${((wa - sa) / seA).toFixed(2)}`);\n";
const stop = "console.log(`SECTION1 failures ${failures}`);\nprocess.exit(failures ? 1 : 0);\n";
fs.writeFileSync(`scripts/htSec1-${tag}.mjs`, src.replace(endOf1, endOf1.slice(0, -2) + z + '}\n' + stop));
console.log(`mkSec1: scripts/htSec1-${tag}.mjs written`);
