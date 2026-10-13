// Check of scripts/lib/careerNoAgentLoanLineBA.mjs: it turns a7c6befe's engine back into its parent's byte for byte,
// edits this head's engine once, refuses main's engine (no such line) and leaves any other file alone.
import { execFileSync } from 'node:child_process';
import { inverseNoAgentLoanLine } from '../../scripts/lib/careerNoAgentLoanLineBA.mjs';
const show = rev => execFileSync('git', ['show', `${rev}:src/lib/soccerCareerEngine.ts`], { encoding: 'utf8', maxBuffer: 64 << 20 });
const F = 'src/lib/soccerCareerEngine.ts';
let bad = 0;
const want = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) bad += 1; };
const receipt = [];
const head = show('HEAD');
want(inverseNoAgentLoanLine(F, head, receipt) !== head.split('\r\n').join('\n') && receipt.length === 1, 'this head: one edit, one receipt row');
want(inverseNoAgentLoanLine(F, show('a7c6befe'), []) === show('a7c6befe~1').split('\r\n').join('\n'), 'a7c6befe inverted equals its parent byte for byte');
let refused = false;
try { inverseNoAgentLoanLine(F, show('8fea14e2'), []); } catch { refused = true; }
want(refused, 'refuses main 8fea14e2, whose engine has no such line');
want(inverseNoAgentLoanLine('src/lib/x.ts', 'abc', []) === 'abc', 'any other file comes back as it was');
console.log(bad ? `checkInverse: ${bad} failure(s)` : 'checkInverse: all 4 checks passed');
process.exit(bad ? 1 : 0);
