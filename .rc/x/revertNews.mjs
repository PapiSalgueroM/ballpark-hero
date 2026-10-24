// Round 1568 fixer (never committed, sent as .rc/x/revertNews.mjs): takes the round's one What's New entry out of
// <dir>/src/pages/WhatsNew.tsx, the single input the re-record attribution names. Exits 3 unless it is there once.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const file = path.join(dir, 'src', 'pages', 'WhatsNew.tsx');
const src = fs.readFileSync(file, 'utf8');
const lines = src.split('\n');
const hits = lines.map((l, i) => [l, i]).filter(([l]) => l.includes("<li><strong className=\"text-foreground\">Club Manager's live match is back on top of the site menu.</strong>"));
if (hits.length !== 1) { console.log(`revertNews: ABORT, the entry is there ${hits.length} times, expected once`); process.exit(3); }
lines.splice(hits[0][1], 1);
fs.writeFileSync(file, lines.join('\n'));
if (fs.readFileSync(file, 'utf8') === src) { console.log('revertNews: ABORT, nothing changed'); process.exit(3); }
console.log(`revertNews: removed line ${hits[0][1] + 1} of src/pages/WhatsNew.tsx`);
