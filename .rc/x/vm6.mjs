/* Scratch, never committed. Closing check of review-run finding 2 (mutation m6): on the runner's throwaway
   checkout only, send the last round HE played (not the bracket's last round) to the other conference.
   This is the reviewer's own mutation, the same line the harness control conf patches. Refuses when the
   needle is not there exactly once. Runs from the repo root. */
import fs from 'node:fs';

const file = 'src/lib/season/us.ts';
const from = '      const slot = r === bind.rounds.length - 1 ? other[0] : conf[r];';
const to = '      const slot = r === n - 1 ? other[0] : conf[r];';
const src = fs.readFileSync(file, 'utf8');
const hits = src.split(from).length - 1;
if (hits !== 1) {
  console.error(`VM6 REFUSED: needle seen ${hits} times in ${file}, wanted 1`);
  process.exit(2);
}
fs.writeFileSync(file, src.split(from).join(to));
const after = fs.readFileSync(file, 'utf8');
if (!after.includes(to) || after.includes(from)) {
  console.error('VM6 REFUSED: the patch did not land');
  process.exit(2);
}
console.log(`VM6 PATCHED ${file}: the mutation is in place`);
