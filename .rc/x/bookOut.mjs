/* Round 1229: takes the league book out of a COPY of the tree (never the checkout): the one line that opens a
   book becomes a no-op, so no book is ever opened and no result is ever noted. Usage: node bookOut.mjs <root> */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) { console.error('bookOut: name the copy of the tree'); process.exit(2); }
const file = path.join(root, 'src/lib/clubManager.ts');
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const line = '  state.leagueBook = openBook(bookStampOf(state, careerLeagueOf(state).id));';
if (text.split(line).length !== 2) { console.error('bookOut: the opening line is not in the engine exactly once'); process.exit(2); }
fs.writeFileSync(file, text.replace(line, '  void openBook;'));
console.log('bookOut: the book is out of ' + file);
