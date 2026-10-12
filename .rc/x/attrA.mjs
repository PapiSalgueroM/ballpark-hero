// Round 1311, digest attribution leg A: in a copy of the tree (argv[2]) the awards are never read from the
// book (bookDecides answers false: the rule before the round). Exits 2 when its anchor is not there once.
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const file = path.join(root, 'src/lib/clubManagerLeagueBoards.ts');
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const from = '  return bookIsWhole(input.book) && bookShare(input.book, input.clubs).share >= AWARD_FLOOR;';
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`attrA: the anchor occurs ${n} times, not once`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, '  void AWARD_FLOOR; return false;'));
console.log('attrA: bookDecides answers false in the copy');
