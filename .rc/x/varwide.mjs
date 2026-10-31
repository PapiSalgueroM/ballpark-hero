// Release BV probe (never committed): widen clubManagerVarScreen's seed searches from 2,500 to argv[2] in this
// checkout, so its own STALE HINT lines name the halves that hold each case on the joined engine.
import fs from 'node:fs';
const f = 'src/test/clubManagerVarScreen.test.tsx';
const n = Number(process.argv[2] || 60000);
const s = fs.readFileSync(f, 'utf8');
const from = 'Array.from({ length: 2500 }, (_, i) => 1700 + i)';
const k = s.split(from).length - 1;
if (k !== 3) { console.log(`varwide: the search stands ${k} times, not 3, refusing`); process.exit(2); }
fs.writeFileSync(f, s.split(from).join(`Array.from({ length: ${n} }, (_, i) => 1700 + i)`));
console.log(`varwide: 3 searches widened to ${n} seeds`);
