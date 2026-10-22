// Runner only: the fee helper moves earnings only (the walk's nobank control). Restored by git checkout in the same line.
import fs from 'node:fs';
const file = 'src/lib/usCareerAnnualBenefits.ts';
const t = fs.readFileSync(file, 'utf8');
const line = '  c.netWorth = Math.round((prior + fee) * 10000) / 10000;\n';
if (t.split(line).length !== 2) throw new Error(`${file}: the fee helper's Cash line is not there once`);
fs.writeFileSync(file, t.replace(line, () => ''));
console.log(`${file}: the fee helper's Cash line removed`);
