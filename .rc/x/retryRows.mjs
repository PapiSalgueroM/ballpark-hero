// Reviewer's runner helper: after a plain run of scripts/simUsCareerSaveRetry.mjs, print what each copied control
// did, in particular the two rows the Release AX merge moved (career, reset): the mutation's from text, the
// mapped case and the first line of the failure it stopped on.
import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync('us-career-save-recovery-artifacts/outcomes/summary.json', 'utf8'));
console.log(`status ${s.status}; normal passed ${s.normal?.passed} failed ${s.normal?.failed}; controls ${s.controls.length}`);
for (const c of s.controls) {
  const msg = (c.failure?.failureMessages ?? []).join(' ').replace(/\s+/g, ' ').slice(0, 170);
  const wide = c.name === 'career' || c.name === 'reset';
  console.log(`${c.name}: ${c.status} passed ${c.passed} failed ${c.failed} | case "${c.intended}" | ${msg}`);
  if (wide) console.log(`   from ${JSON.stringify(c.mutation.from)}\n   to   ${JSON.stringify(c.mutation.to)}`);
}
const bad = s.controls.filter(c => c.status !== 'assertion-failed' || !/AssertionError/.test((c.failure?.failureMessages ?? []).join(' ')));
console.log(bad.length ? `retryRows: ${bad.length} control(s) did not stop on an AssertionError` : `retryRows: all ${s.controls.length} controls stopped on an AssertionError of their mapped case`);
process.exit(bad.length ? 1 : 0);
