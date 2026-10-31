// Reviewer mutation (rBVG-cm-bv): a Europa League deciding second leg reacts to the NIGHT again, the Champions
// League keeps the tie reading. If simCmDecidingLeg's bind 3 measures Europa League legs, it must go red.
// Run from the repo root on the runner; restore with git checkout -- src afterwards.
import fs from 'node:fs';
const file = 'src/lib/clubManager.ts';
const from = '  const tieJudged = judgedByTie(state, tieLine);';
const to = '  const tieJudged = judgedByTie(state, tieLine) && uelLeg !== 2;';
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`rvMutUel: anchor stands ${n} times, refusing`); process.exit(9); }
fs.writeFileSync(file, src.replace(from, to));
console.log('rvMutUel: applied (Europa League deciding legs judged by the night)');
