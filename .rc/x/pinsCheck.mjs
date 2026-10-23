// Fixer's probe (runner only, never committed): every byte pin the PR278 workflow and proof hold must match the
// checked out tree. Reads the pin arrays out of the files as text and evaluates only those array literals.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const YML = '.github/workflows/career-historical-opponent-labels.yml';
const PROOF = 'scripts/qa/soccerHistoricalOpponentDisplayProof.mjs';
const COMPONENT = 'src/components/soccer-career/SoccerSeasonCentre.tsx', UNIT = 'src/test/historicalOpponentLabels.test.ts';
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const grab = (text, re, label) => { const m = text.match(re); if (!m) { console.log(`pinsCheck: ABORT ${label} not found`); process.exit(3); } return m[1]; };
const yml = fs.readFileSync(YML, 'utf8'), proof = fs.readFileSync(PROOF, 'utf8');
const sets = [
  ['yml pins (line 53)', grab(yml, /const pins=(\[\[.*?\]\]);/, 'yml pins')],
  ['yml PINS (line 140)', grab(yml, /const PINS=(\[\[.*?\]\]);/, 'yml PINS')],
  ['proof pins (line 31)', grab(proof, /const pins = (\[[\s\S]*?\n\]);/, 'proof pins')],
];
let bad = 0, n = 0;
for (const [label, literal] of sets) {
  const rows = new Function('COMPONENT', 'UNIT', `return ${literal};`)(COMPONENT, UNIT);
  for (const [file, bytes, digest] of rows) {
    n++;
    const size = fs.readFileSync(file).length, actual = sha(file);
    const ok = size === bytes && actual === digest;
    if (!ok) bad++;
    console.log(`pinsCheck: ${ok ? 'ok  ' : 'BAD '} ${label}: ${file} pinned ${bytes} ${digest.slice(0, 12)}, tree ${size} ${actual.slice(0, 12)}`);
  }
}
const helper = grab(yml, /x\.file===HELPER\)\)\),'([0-9a-f]{64})'/, 'yml HELPER hash');
n++;
if (helper !== sha(PROOF)) { bad++; console.log(`pinsCheck: BAD  yml HELPER hash (line 145) ${helper.slice(0, 12)}, tree ${sha(PROOF).slice(0, 12)}`); }
else console.log(`pinsCheck: ok   yml HELPER hash (line 145) ${helper.slice(0, 12)}`);
console.log(`pinsCheck: ${n} pins read, ${bad} differ from the tree`);
process.exit(bad ? 1 : 0);
