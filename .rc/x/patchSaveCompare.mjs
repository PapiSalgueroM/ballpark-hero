/* Round 1229, a PROPOSED edit for the lead, applied by the builder only inside a runner's checkout to prove it.
   Usage: node patchSaveCompare.mjs scripts/simCmVar.mjs [scripts/simCmRealFixtures.mjs ...]
   Some harnesses compare a WHOLE save against an older engine read from git, so any new save field turns
   them red. This inserts one block under the assert import of each file named: every whole save comparison
   then leaves the league book out. The anchor is the same line in the gate's versions and in the versions
   Rounds 1218 and 1225 carry. */
import fs from 'node:fs';

const anchor = "import assert from 'node:assert/strict';\n";
const block = [
  '/* Round 1229: the league book (leagueBook) is a save field newer than the engine this harness reads from',
  '   git as its baseline. That engine carries the book it is handed untouched while the engine of today',
  '   writes rows into it, so every whole save comparison leaves the field out on both sides.',
  '   scripts/simCmLeagueBook.mjs holds the book itself, and that the match stream does not move with it. */',
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
const files = process.argv.slice(2);
if (!files.length) { console.error('patchSaveCompare: name at least one harness file'); process.exit(2); }
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (text.split(anchor).length !== 2) { console.error(`patchSaveCompare: the assert import is not in ${file} exactly once`); process.exit(2); }
  fs.writeFileSync(file, text.replace(anchor, anchor + block));
  console.log(`patchSaveCompare: ${file} now leaves the league book out of its whole save comparisons`);
}
