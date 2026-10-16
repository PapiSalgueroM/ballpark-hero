/* Review (runner lens) of Round 1343: make the record's one engine call a no-op, to attribute a moved recording. */
import fs from 'node:fs';
const file = 'src/lib/clubManager.ts';
const from = "  if (state.matchRules !== 'base') {\n    noteHighestScoring(";
const to = "  if (false) {\n    noteHighestScoring(";
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`GATEOFF: anchor found ${n} times, not once; nothing changed`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log('GATEOFF APPLIED: the record call never runs');
