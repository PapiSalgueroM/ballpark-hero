/* Round 1541 closing check: the run reviewer's knock mutation (finding 1), applied once with its anchor asserted.
   Usage: node .rc/x/mutknockv.mjs ; the request line restores the checkout with git checkout afterwards. */
import fs from 'node:fs';

const file = 'src/lib/careerIntl.ts';
const from = 'const hurt = rng() < bind.knockChance(c);';
const to = 'const hurt = rng() > bind.knockChance(c);';
const src = fs.readFileSync(file, 'utf8');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`knock mutation: ${file} holds the anchor ${hits} times, not once: ABORT`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`knock mutation applied to ${file}`);
