// Fixer's helper (runner only, never committed): print the Luton proof report's status and errors, cut short.
import fs from 'node:fs';
const file = process.argv[2];
if (!fs.existsSync(file)) { console.log(`fixErrs: no report at ${file}`); process.exit(0); }
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`fixErrs: status ${r.status}, arms ${(r.arms ?? []).map(a => `${a.id ?? '?'}:${a.status}`).join(' ')}, comparisons ${(r.comparisons ?? []).map(c => `${c.id}:${c.status}`).join(' ')}`);
for (const e of r.errors ?? []) console.log(`fixErrs: stage ${e.stage}: ${String(e.error).split('\n').slice(0, 12).join(' | ').slice(0, 1500)}`);
