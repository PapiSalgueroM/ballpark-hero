// Round 1535 review, runner only: print each boxing forecast case's error from the walk's own report.
import fs from 'node:fs';
const file = 'boxing-show-forecast-artifacts/native/report.json';
if (!fs.existsSync(file)) { console.log('boxErr: no report.json'); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const row of report.cases ?? []) {
  const msg = row.error ? String(row.error.message).split('\n').slice(0, 3).join(' | ').slice(0, 300) : '';
  console.log(`boxErr case ${row.profile?.width ?? row.id ?? '?'}: complete=${!!row.complete} ${msg}`);
}
