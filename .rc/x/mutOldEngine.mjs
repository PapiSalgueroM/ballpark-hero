// Round 1331, runner only (never committed): play the head engine on the old rules everywhere,
// by forcing the two reads of state.matchRules to answer 'base'. With this on, the head must
// reproduce the committed (base) digest: the proof that the head differs ONLY in the parts the
// rule and the press move.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'src/lib/clubManager.ts';
let s = readFileSync(f, 'utf8');
function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.log('mutOldEngine ABORT: anchor count', n, 'for', a); process.exit(2); }
  s = s.replace(a, b);
}
rep("maybeAskPress(state, state.matchRules === 'base' ? undefined : live.week + 1);", 'maybeAskPress(state, undefined);');
rep("if (career.matchRules === 'base') return { subs: MAX_SUBS, stops: null, partial: false };", 'return { subs: MAX_SUBS, stops: null, partial: false };');
writeFileSync(f, s);
console.log('mutOldEngine: both matchRules reads now answer the old rules');
