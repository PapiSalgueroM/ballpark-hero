// Review of Round 1579 (runner lens): one small plausible mutation, applied on the runner and restored by the
// request line itself (git checkout -- src scripts). Never committed. Usage: node .rc/x/review-run-mut.mjs <name>
// Exits 2 when the anchor is not in the file exactly once, so a mutation that did not apply cannot pass as green.
import fs from 'node:fs';

const LIB = 'src/lib/sportsMillionaire.ts';
const PAGE = 'src/pages/SportsMillionaire.tsx';
const MUTATIONS = {
  // off by one at the bottom: the refusal set loses rung 1
  offby1: [LIB, '  const onLadder = new Set(ladder.map((q) => q.question));', '  const onLadder = new Set(ladder.slice(1).map((q) => q.question));'],
  // off by one at the top: the refusal set loses rung 15
  lastrung: [LIB, '  const onLadder = new Set(ladder.map((q) => q.question));', '  const onLadder = new Set(ladder.slice(0, -1).map((q) => q.question));'],
  // stale constant: the bound 1573 replaced (eight draws) instead of LADDER_ATTEMPTS
  stale8: [LIB, '  for (let attempt = 0; attempt < LADDER_ATTEMPTS; attempt++) {', '  for (let attempt = 0; attempt < 8 && LADDER_ATTEMPTS > 0; attempt++) {'],
  // the page hands the swap only the rungs already asked (a dropped filter on the rungs to come)
  asked: [PAGE, '    const swapped = swapQuestion(pool, question, ladder);', '    const swapped = swapQuestion(pool, question, ladder.slice(0, currentIndex));'],
  // the page hands the swap only the question on screen and the rungs to come (a dropped filter on the rungs asked)
  tocome: [PAGE, '    const swapped = swapQuestion(pool, question, ladder);', '    const swapped = swapQuestion(pool, question, ladder.slice(currentIndex));'],
  // the swap draws one band easier than the question on screen (an off by one on the difficulty)
  easier: [LIB, '    const candidate = generateQuestion(pool, current.difficulty, rng);', '    const candidate = generateQuestion(pool, Math.max(1, current.difficulty - 1), rng);'],
};
const name = process.argv[2];
const m = MUTATIONS[name];
if (!m) { console.log(`review-run-mut: no mutation named ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`review-run-mut: ${name}: the anchor is in ${file} ${n} times, not once, so it was NOT applied`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`review-run-mut: ${name} applied to ${file}: ${to.trim()}`);
