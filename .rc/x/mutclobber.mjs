// Round 1592 fix: the report fe949903 shape put back into src/lib/clubManagerHandOver.ts on a runner checkout,
// so a build of it shows playTwoTabs case 3's new slot 1 check firing. Exits 3 if the anchor is missing.
import fs from 'node:fs';
const file = 'src/lib/clubManagerHandOver.ts';
const src = fs.readFileSync(file, 'utf8');
const from = '  const free = freeSlot(views);\n';
if (!src.includes(from)) { console.log('MUTATION clobber: anchor missing, not applied'); process.exit(3); }
fs.writeFileSync(file, src.replace(from, '  const free = from;\n'));
console.log('MUTATION clobber: applied');
