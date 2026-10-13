// Round 1327, for the lead: PR249's routine delivery proof varies only Math.random's seed, and a keyed deck pick
// ignores it. The one line fix: vary the career's name per trial, the deck key's moving part. Applied to a scratch
// merge on a runner only, never pushed.
import fs from 'node:fs';
const p = 'scripts/simSoccerCareerRoutineEvents.mjs';
const s = fs.readFileSync(p, 'utf8');
const from = 'const actual = draw(found.state, 12000 + id * 2048 + seed);';
const to = 'const actual = draw({ ...found.state, playerName: `${found.state.playerName} ${seed}` }, 12000 + id * 2048 + seed);';
if (s.split(from).length !== 2) { console.error('fix249: the line is not in the file exactly once'); process.exit(2); }
fs.writeFileSync(p, s.replace(from, () => to));
console.log('fix249 applied');
