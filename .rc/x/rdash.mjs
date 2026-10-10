/* Reviewer (run lens), Round 1215: no em dash and no en dash in the round's three files. */
import fs from 'node:fs';
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
let found = 0;
for (const file of ['scripts/lib/pageSeed.mjs', 'scripts/playLiveMatchFit.mjs', 'docs/audits/ROUND-1215-NOTES.md']) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes(EN) || line.includes(EM)) { found += 1; console.log(`${file}:${i + 1}: ${line.slice(0, 120)}`); }
  });
  console.log(`${file}: ${lines.length} lines read`);
}
console.log(`dashes found: ${found}`);
process.exit(found ? 1 : 0);
