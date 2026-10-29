/* fix3 scratch (never committed; sent as .rc/x/mutR2.mjs): put back the one replay visible input of the fix3
   pass, the fans' conduct gate in src/lib/careerSocial.ts (lead ruling R2). With the gate taken out every
   ladder reads exactly as on 2ee79c595. The anchor must be there exactly once, or the run refuses. */
import fs from 'node:fs';
const f = 'src/lib/careerSocial.ts';
const src = fs.readFileSync(f, 'utf8');
const a = 'if (f.conduct === false) {';
const n = src.split(a).length - 1;
if (n !== 1) { console.log(`mutR2 ABORT: "${a}" found ${n} times in ${f}`); process.exit(2); }
fs.writeFileSync(f, src.replace(a, 'if (false) {'));
console.log('mutR2 applied: the fans conduct gate taken out');
