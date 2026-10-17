// Round 1500 probe (never committed): print each failed case of a native report.json, short.
import fs from 'node:fs';
const file = process.argv[2];
if (!fs.existsSync(file)) { console.log('NO REPORT at ' + file); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const cases = report.cases || [];
const failed = cases.filter(c => !c.passed);
console.log(`cases ${cases.length}, failed ${failed.length}, controls ${(report.controls || []).length}`);
for (const c of failed.slice(0, 8)) {
  const id = c.id || c.name || [c.sport, c.profile, c.viewport && c.viewport.width].filter(Boolean).join('/');
  const err = String(c.error || '').split('\n').filter(l => !/^\s+at /.test(l)).slice(0, 6).join(' | ');
  console.log(`FAILED ${id}: ${err.slice(0, 700)}`);
}
