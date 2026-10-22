// Round 1535 runner probe: print each calendar case's error from the walk's own report. Never committed.
import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync('career-programme-artifacts/calendar-native/report.json', 'utf8'));
for (const row of report.cases) console.log(`case ${row.id}: ok=${row.ok} ${row.ok ? '' : String(row.error).split('\n')[0].slice(0, 300)}`);
console.log(`checks ${report.checks}, controls ${report.controls.length}`);
