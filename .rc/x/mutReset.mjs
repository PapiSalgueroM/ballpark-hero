// Review probe (rBTG-us): the smallest fix for the two Start over leaks, applied to a scratch tree only.
// reset() in UsCareerBoard.tsx also clears the season curtain and the national team result.
// Usage: node mutReset.mjs <tree root>
import fs from 'node:fs';
import path from 'node:path';
const file = path.join(process.argv[2] || '.', 'src/components/us-career/UsCareerBoard.tsx');
const src = fs.readFileSync(file, 'utf8');
const from = '    setRetiredReview(false);\n';
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`MUT reset: the anchor is there ${hits} times, not once. Refusing.`); process.exit(2); }
const out = src.replace(from, `${from}    setReveal(null);\n    setIntlResult(null);\n`);
if (out === src) { console.error('MUT reset: nothing changed. Refusing.'); process.exit(2); }
fs.writeFileSync(file, out);
console.log('MUT reset applied: reset() now also clears reveal and intlResult');
