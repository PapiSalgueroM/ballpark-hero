// Round 1319 probe: the closing summary of usCareerSaveRecovery1084's native report, the same
// assertions its workflow makes (us-career-save-recovery.yml 130 to 142). Never committed.
import fs from 'node:fs';
import path from 'node:path';
const r = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'us-career-save-recovery-artifacts/native/report.json'), 'utf-8'));
const ok = r.complete === true && r.cases.length === 12 && r.deletions.length === 4
  && r.cases.concat(r.deletions).every(x => x.complete) && r.controls.length === 9 && r.forwardedWrites === 0
  && JSON.stringify(r.sourceAfter) === JSON.stringify(r.sourceBefore);
console.log(`RECOVERY REPORT complete=${r.complete} cases=${r.cases.length} deletions=${r.deletions.length} controls=${r.controls.length} forwardedWrites=${r.forwardedWrites}: ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
