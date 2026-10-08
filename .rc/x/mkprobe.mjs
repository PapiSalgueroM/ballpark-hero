/* Release AN fix pass 2, never committed. Widens what src/test/dailySaveShapes.test.tsx prints when a damaged
   save draws a different page, and prints the fresh page beside it, in the tree named by argv[2] (a throwaway
   runner checkout). The assertion itself is not touched. Exit 3 when the anchor is not there exactly once. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const file = path.join(root, 'src/test/dailySaveShapes.test.tsx');
const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const from = 'first at ${at}: "${html.slice(Math.max(0, at - 60), at + 60)}"`);';
const to = 'first at ${at}: "${html.slice(Math.max(0, at - 60), at + 60)}" GOT: [[${html.slice(Math.max(0, at - 20), at + 700)}]] FRESH: [[${fresh.slice(Math.max(0, at - 20), at + 700)}]] LENGTHS ${html.length} ${fresh.length}`);';
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`mkprobe: the anchor is in ${file} ${hits} times, not once`); process.exit(3); }
fs.writeFileSync(file, src.split(from).join(to));
console.log(`mkprobe: ${file} now prints both pages around the first difference`);
