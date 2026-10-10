/* Round 1229, a PROPOSED edit for the lead, applied here only inside a runner's checkout to prove it.
   scripts/simCmRealFixtures.mjs compares whole saves against an older engine read from git, so any new
   save field turns it red. This inserts one block after its imports: every whole save comparison leaves
   the league book out. The same anchor is in the gate's version of the file and in Round 1225's. */
import fs from 'node:fs';

const file = 'scripts/simCmRealFixtures.mjs';
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const anchor = "import { fileURLToPath } from 'node:url';\n";
if (text.split(anchor).length !== 2) { console.error('patchRealFixtures: the import anchor is not in the file exactly once'); process.exit(2); }
const block = [
  '',
  '/* Round 1229: the league book (leagueBook) is a save field newer than the engine this harness reads from',
  '   git as its baseline, so every whole save comparison leaves it out. scripts/simCmLeagueBook.mjs holds the',
  '   book itself, and that the match stream does not move with it in or out. */',
  '{',
  '  const strict = assert.deepEqual;',
  '  const sansBook = v => {',
  "    if (!v || typeof v !== 'object' || Array.isArray(v)) return v;",
  "    if ('leagueBook' in v) { const copy = { ...v }; delete copy.leagueBook; return copy; }",
  "    if (v.state && typeof v.state === 'object' && 'leagueBook' in v.state) { const state = { ...v.state }; delete state.leagueBook; return { ...v, state }; }",
  '    return v;',
  '  };',
  '  assert.deepEqual = (actual, expected, message) => strict(sansBook(actual), sansBook(expected), message);',
  '}',
  '',
].join('\n');
fs.writeFileSync(file, text.replace(anchor, anchor + block));
console.log('patchRealFixtures: the block is in, ' + block.split('\n').length + ' lines');
