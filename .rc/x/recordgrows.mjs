/* proof 3 (critic-1583 item 6): the NBA record only grows. Every man and field of the record as first committed in
   step 2 (5620589b4) equals the head's, field by field, by git (no network). RECORD_CONTROL=1 changes one career total
   of the head's record in memory first: it must be named and the run must exit 1. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const F = 'scripts/data/nbaConnectionsRecord-2026-10.json';
const a = JSON.parse(execFileSync('git', ['show', `5620589b4:${F}`], { maxBuffer: 1 << 26, encoding: 'utf8' })).men;
const b = JSON.parse(fs.readFileSync(F, 'utf8')).men;
if (process.env.RECORD_CONTROL === '1') {
  if (!b['Tony Parker']?.career?.PTS) { console.log('RECORD_CONTROL ABORTED: no career total to change'); process.exit(2); }
  b['Tony Parker'].career.PTS += 1;
  console.log('RECORD_CONTROL=1: Tony Parker career.PTS changed in memory; it must be named');
}
let n = 0;
const diffs = [];
for (const [k, m] of Object.entries(a)) for (const [x, v] of Object.entries(m)) { n += 1; if (JSON.stringify(b[k]?.[x]) !== JSON.stringify(v)) diffs.push(`${k}.${x}`); }
for (const d of diffs) console.log('DIFF ' + d);
console.log(`${n} fields of ${Object.keys(a).length} step 2 men compared, ${diffs.length} differences${diffs.length ? ': ' + diffs.join(', ') : ''}`);
process.exit(diffs.length ? 1 : 0);
