// Release AV scratch (sent to the runner as .rc/x/realfixReport.mjs, never committed): read the report a walk of
// playCmRealFixtures.mjs leaves and say, case by case, whether it passed and the first lines of its error.
// usage: node realfixReport.mjs <report.json>
import fs from 'node:fs';
const file = process.argv[2];
if (!fs.existsSync(file)) { console.log(`no report at ${file}`); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const cases = report.cases ?? [];
console.log(`cases ${cases.length}, passed ${cases.filter(c => c.passed).length}; controls ${(report.controls ?? []).length}; source held ${report.sourceHeld}`);
for (const c of cases) {
  const id = c.id ?? `${c.kind ?? '?'}-${c.width ?? c.viewport?.width ?? '?'}`;
  console.log(`CASE ${id}: ${c.passed ? 'passed' : 'FAILED'}; console errors ${(c.errors ?? []).length}; asset errors ${(c.assetErrors ?? []).length}; shots ${(c.screenshots ?? []).join(' ')}`);
  if (!c.passed) {
    console.log(String(c.error ?? 'no error text').split('\n').slice(0, 14).map(l => `    ${l.slice(0, 400)}`).join('\n'));
    for (const e of (c.errors ?? []).slice(0, 4)) console.log(`    console: ${String(e).slice(0, 300)}`);
    for (const e of (c.assetErrors ?? []).slice(0, 4)) console.log(`    asset: ${String(e).slice(0, 300)}`);
  }
}
const keys = Object.keys(report).filter(k => !['cases', 'controls'].includes(k));
console.log(`report keys: ${keys.join(', ')}`);
