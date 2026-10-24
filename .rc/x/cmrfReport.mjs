/* Round 1568 (never committed): prints each case of playCmRealFixtures' report, and the failing capture's last frame. */
import fs from 'node:fs';
const file = 'cm-real-fixture-artifacts/native/report.json';
if (!fs.existsSync(file)) { console.log('cmrfReport: no report'); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const row of report.cases || []) {
  console.log(`CASE ${row.id ?? row.kind ?? '?'} passed=${!!row.passed}`);
  if (row.error) console.log('  error: ' + String(row.error).split('\n').slice(0, 3).join(' | ').slice(0, 500));
  for (const [name, d] of Object.entries(row.captureDiagnostics || {})) {
    if (d.passed) continue;
    const last = d.frames.at(-1) || {};
    console.log(`  capture ${name} FAILED: box ${JSON.stringify(last.box)} viewport ${JSON.stringify(last.viewport)} readable ${last.readable}`);
  }
}
console.log(`cmrfReport: ${(report.cases || []).length} cases, controls ${JSON.stringify(report.controls)}`);
