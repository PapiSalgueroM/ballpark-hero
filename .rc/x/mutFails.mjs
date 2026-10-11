// MUTATION PROBE, never committed. Edits src/test/clubManagerVarScreen.test.tsx on the runner, in one of two ways:
//   crash    a helper the KNOWN OPEN kick cases call throws (a crash that has nothing to do with the defect).
//            A case marked `fails` reads that as green. A plain case that asserts the defect itself must go red.
//   mended   the row whose pitch IS quiet and whose kick IS played (league match 2, hint 2287) is marked OPEN on
//            both counts, so the KNOWN OPEN cases run on a half where the defect is not there: the day it is mended.
//            Both must go red, each on its own sentence.
// The request line restores the file with git checkout.
import fs from 'node:fs';
const FILE = 'src/test/clubManagerVarScreen.test.tsx';
const mode = process.argv[2];
let src = fs.readFileSync(FILE, 'utf8').split('\r\n').join('\n');
const swap = (from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`mutFails ${mode}: ABORT, anchor found ${n} times, wanted once: ${from}`); process.exit(3); }
  src = src.replace(from, () => to);
};
if (mode === 'crash') {
  swap('const kickPlayed = ({ frames, last, whistle }: AwardedRun) => {\n', "const kickPlayed = ({ frames, last, whistle }: AwardedRun) => {\n    if (frames.length >= 0) throw new Error('probe: a crash in a helper, nothing to do with the defect');\n");
} else if (mode === 'mended') {
  swap("match: 1, hint: 2287, under: 'quiet', kick: 'played',", "match: 1, hint: 2287, under: 'OPEN', kick: 'OPEN',");
} else { console.error('mutFails: ABORT, mode must be crash or mended'); process.exit(3); }
fs.writeFileSync(FILE, src);
console.log(`mutFails ${mode}: the test file is mutated`);
