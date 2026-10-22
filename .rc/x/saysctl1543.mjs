// One shot proof that the controls' "says" check can fail (runner only, from the repo root):
// rewrites the bonus control's expected words in scripts/simTycoonScorelines.mjs to words S9b never
// prints; the caller then runs SCORELINES_CONTROL=bonus, which must exit 3 "did not fire for its own reason".
import fs from 'node:fs';

const F = 'scripts/simTycoonScorelines.mjs';
const from = "says: { S9b: ['ACH_BONUS is 0.021'] }";
const to = "says: { S9b: ['ACH_BONUS is 0.03'] }";
const text = fs.readFileSync(F, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`SAYSCTL ABORT: expected 1 occurrence, found ${n}`); process.exit(2); }
fs.writeFileSync(F, text.replace(from, to));
console.log('SAYSCTL APPLIED: the bonus control now expects words S9b never prints');
