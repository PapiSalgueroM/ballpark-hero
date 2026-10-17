// Fix2 of Round 1508 (the closing check's finding 3): break the seedcarry control's anchor in
// src/lib/clubManagerCalendar.ts with one harmless space, so simCmWorldMoves section 0 must name THAT file.
// Exit 2 when the anchor is not there exactly once. The request line restores the checkout.
import fs from 'node:fs';

const FILE = 'src/lib/clubManagerCalendar.ts';
const from = '    ...(!livingWorldOf(departed) ? {} : seededJoinCarry(career, s, movedElsewhere)),\n';
const to = '    ...(!livingWorldOf(departed) ? {} : seededJoinCarry(career, s, movedElsewhere)) ,\n';
const src = fs.readFileSync(FILE, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`anchorMsg: ABORT, anchor found ${n} times in ${FILE}`); process.exit(2); }
fs.writeFileSync(FILE, src.replace(from, to));
console.log(`anchorMsg: the seedcarry anchor broken in ${FILE}`);
