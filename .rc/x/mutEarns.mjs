// Round 1533 control: GmXpPanel ignores the `earns` prop (prints its own six source sentence whatever the desk passes).
// Run from the repo root on a runner; the request line restores the file with git checkout afterwards.
import fs from 'node:fs';
const f = 'src/components/front-office-shared/GmXpPanel.tsx';
const src = fs.readFileSync(f, 'utf8');
const from = '{earns === undefined && (';
if (src.split(from).length !== 2) { console.error(`mutEarns: CANNOT RUN, the anchor is not in ${f} exactly once`); process.exit(2); }
fs.writeFileSync(f, src.replace(from, '{(earns === undefined || earns !== undefined) && ('));
console.log('mutEarns: GmXpPanel now ignores earns');
