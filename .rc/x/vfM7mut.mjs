// Closing check for Round 1046, finding 1: the reviewer's mutation m7, applied to a COPY of the tree.
// node vfM7mut.mjs <path to SoccerSeasonCentre.tsx in the copy>
import fs from 'node:fs';

const file = process.argv[2];
const FROM = '((canPlay || held) && plan ? planMoments';
const TO = '(canPlay && plan ? planMoments';
const src = fs.readFileSync(file, 'utf8');
const n = src.split(FROM).length - 1;
if (n !== 1) {
  console.log(`m7 refused: the line is in the file ${n} times, expected exactly 1`);
  process.exit(3);
}
const out = src.replace(FROM, TO);
if (out === src) {
  console.log('m7 refused: the rewrite changed nothing');
  process.exit(3);
}
fs.writeFileSync(file, out);
const line = out.split('\n').find(l => l.includes(TO)) ?? '';
console.log(`m7 applied once. The line now reads: ${line.trim().slice(0, 200)}`);
