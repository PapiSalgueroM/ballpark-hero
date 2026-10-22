// Reviewer mutation for Round 1537 (run lens): edits src/lib/foHub.ts on the runner only; mutFo.sh restores it.
// Usage: node .rc/x/mutFo.mjs <mode>
//   nofloorline  Round 722's floor line is gone (tooFew always 0): a short roster neither says so nor lights the box
//   offbyone     the floor count is one too many: 10 men read "5 short", 14 men read "1 short"
//   thirteen     the floor line and its dot only fire two or more short: a 13 man roster is never warned
import fs from 'node:fs';

const mode = process.argv[2] ?? '';
const FILE = 'src/lib/foHub.ts';
let src = fs.readFileSync(FILE, 'utf8');
const swap = (from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`mutFo ABORT: anchor found ${n} times: ${from}`); process.exit(3); }
  src = src.replace(from, to);
};
const TOOFEW = 'const tooFew = f.rosterFloor != null ? f.rosterFloor - f.roster.length : 0;';
if (mode === 'nofloorline') swap(TOOFEW, 'const tooFew = 0;');
else if (mode === 'offbyone') swap(TOOFEW, 'const tooFew = f.rosterFloor != null ? f.rosterFloor - f.roster.length + 1 : 0;');
else if (mode === 'thirteen') {
  swap('        : tooFew > 0\n', '        : tooFew > 1\n');
  swap('accent: hurt.length > 0 || tooMany > 0 || tooFew > 0,', 'accent: hurt.length > 0 || tooMany > 0 || tooFew > 1,');
} else { console.error('mutFo: unknown mode ' + mode); process.exit(2); }
fs.writeFileSync(FILE, src);
console.log(`mutFo ${mode}: applied to ${FILE}`);
