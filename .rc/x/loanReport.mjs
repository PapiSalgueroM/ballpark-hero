// Runner only: summarise a simSoccerLoanMinutes output folder (status, failure ids by kind, and the bundle's appearance facts).
// usage: node loanReport.mjs <SOCCER_LOAN_MINUTES_OUT>
import fs from 'node:fs';
import path from 'node:path';
const out = process.argv[2];
const file = path.join(out, 'report.json');
if (!fs.existsSync(file)) { console.log(`NO REPORT at ${file}`); process.exit(3); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`status ${report.status}; error ${report.error ? report.error.message.slice(0, 160) : 'none'}`);
const failures = report.failures ?? [];
const kinds = {};
for (const f of failures) { const kind = String(f.id).split('/').slice(-1)[0]; kinds[kind] = (kinds[kind] ?? 0) + 1; }
console.log(`failures ${failures.length}: ${JSON.stringify(kinds)}`);
const law = failures.filter(f => String(f.id).endsWith('/law')).flatMap(f => f.detail ?? []);
const groups = {};
for (const g of law) groups[g.group] = (groups[g.group] ?? 0) + 1;
console.log(`law groups on the current arm: ${JSON.stringify(groups)}; first ids ${failures.filter(f => String(f.id).endsWith('/law')).slice(0, 4).map(f => f.id).join(', ')}`);
const control = (report.controls ?? [])[0];
if (control) console.log(`remove-filter control: findings ${control.failures}, effective ${control.effective}`);
console.log(`summary ${JSON.stringify(report.summary ?? null)}`);
for (const id of ['original', 'current']) {
  const meta = path.join(out, 'bundles', id, 'metafile.json');
  const compiled = path.join(out, 'bundles', id, 'compiled.cjs');
  if (!fs.existsSync(meta)) { console.log(`${id}: no metafile`); continue; }
  const inputs = Object.keys(JSON.parse(fs.readFileSync(meta, 'utf8')).inputs);
  const code = fs.readFileSync(compiled, 'utf8');
  console.log(`${id}: ${inputs.length} inputs; appearance bundled ${inputs.some(n => n.endsWith('soccerCareerAppearance.ts'))}; compiled holds "imaginary baby cradle" ${code.includes('imaginary baby cradle')}, "newest member of the family" ${code.includes('newest member of the family')}`);
}
