// Review probe (runner only, never committed): take the saved pool of generated rivals out of
// simCareerStory's "rest", the one change 9aabebe5 made to src/test/careerStory.test.tsx, and nothing else.
import fs from 'node:fs';
const file = 'scripts/simCareerStory.mjs';
const src = fs.readFileSync(file, 'utf8');
const from = 'rest: bytesOf({ ...s, leagueWorld: undefined, seasons:';
const to = 'rest: bytesOf({ ...s, leagueWorld: undefined, generatedBallonPool: undefined, seasons:';
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`MUTATION ABORTED: anchor found ${n} times`); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log('MUTATION APPLIED: the pool is out of the rest');
