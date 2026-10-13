// Round 1328 control for src/test/useArrivalTop.test.tsx: drop the readable test from the hook.
// The "a top that is already readable moves nothing" case must then fail.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'src/hooks/useArrivalTop.ts';
const src = readFileSync(f, 'utf8');
const needle = 'if (rect.top >= readTop - 2 && visible >= needed) return;';
if (!src.includes(needle)) { console.log('CONTROL ABORTED: the readable test is not in the hook'); process.exit(3); }
writeFileSync(f, src.replace(needle, '/* control: readable test removed */'));
console.log('CONTROL APPLIED: readable test removed from ' + f);
