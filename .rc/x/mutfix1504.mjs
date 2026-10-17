/* The fixer's mutations for Round 1504 (review of 2026-10-17), applied on a runner checkout only and restored by
   git checkout in the same request line. guard: the page's second press guard deleted (the run reviewer's m-guard).
   onefree: one training option of the shipped pack loses its cost (the run reviewer's onefree). */
import fs from 'node:fs';

const MUTS = {
  guard: ['src/pages/SoccerCareer.tsx', '    if (press.at === career) return;\n', ''],
  onefree: ['src/data/soccerDeck/starter.ts', 'fx: { t_shooting: 1, t_dribbling: -1 } }', 'fx: { t_shooting: 1 } }'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`mutfix1504: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
let src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`mutfix1504: ${name}: its text is in ${file} ${hits} times, not once, refusing`); process.exit(2); }
src = src.replace(from, () => to);
fs.writeFileSync(file, src);
console.log(`mutfix1504: ${name} applied to ${file}`);
