// Fixer mutation for Round 1537: edits src on the runner only; mut1537.sh restores it.
// Usage: node .rc/x/mut1537.mjs <mode>
//   everyround  the board passes the tip off floor in every round again (the code before this fix)
//   thirteen    the floor line and its dot only fire two or more short (the review's off by one)
import fs from 'node:fs';

const mode = process.argv[2] ?? '';
const edit = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`mut1537 ABORT: anchor found ${n} times in ${file}: ${from}`); process.exit(3); }
  fs.writeFileSync(file, src.replace(from, to));
};
if (mode === 'everyround') {
  edit('src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
    'rosterFloor: league.round === 1 ? NBA_TIPOFF_MIN : undefined,', 'rosterFloor: NBA_TIPOFF_MIN,');
} else if (mode === 'thirteen') {
  edit('src/lib/foHub.ts', '        : tooFew > 0\n', '        : tooFew > 1\n');
  edit('src/lib/foHub.ts', 'accent: hurt.length > 0 || tooMany > 0 || tooFew > 0,', 'accent: hurt.length > 0 || tooMany > 0 || tooFew > 1,');
} else { console.error('mut1537: unknown mode ' + mode); process.exit(2); }
console.log(`mut1537 ${mode}: applied`);
