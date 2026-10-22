// One shot (Round 1539 fix pass, never committed): the run reviewer's finalline mutation. The card's
// "the final matchday is waiting for you" line stops drawing when one matchday is left.
import fs from 'node:fs';
const file = 'src/pages/StadiumTycoon.tsx';
const src = fs.readFileSync(file, 'utf8');
const from = 'standing.left <= 1';
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutFinal1539 ABORTED: "${from}" found ${n} times, expected 1`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, 'standing.left < 1'));
console.log('mutFinal1539: finalline applied once');
