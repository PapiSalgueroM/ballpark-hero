/* Round 1210, second fix pass. The lead's one hand step, as a script, and the edit a runner used to prove it.
   NOT part of the branch: the brief gives the budget rows of scripts/sweepWeight.mjs to the lead, so this moves
   the /footle row only where it is run (the runner's throwaway checkout, or the lead's release worktree).

   Usage: node footleRow.mjs <path to scripts/sweepWeight.mjs> <new ceiling> [path to a note file]
   It refuses unless the file holds exactly one /footle row, the new ceiling is a whole number above the one
   that is there, and the note (if given) is one line with no dash character and no comment end in it.
   With a note the row's comment becomes "<note> Before that: <the comment that was there>", the shape every
   other row in that table already has. Prints the old and the new ceiling. Exit 0 when the file was written. */
import fs from 'node:fs';

const [file, toArg, noteFile] = process.argv.slice(2);
const to = Number(toArg);
if (!file || !Number.isInteger(to)) { console.error('usage: footleRow.mjs <sweepWeight.mjs> <new ceiling> [note file]'); process.exit(2); }
const src = fs.readFileSync(file, 'utf-8');
const ROW = new RegExp("\\['/footle', (\\d+)\\], /[*] ", 'g');
const hits = [...src.matchAll(ROW)];
if (hits.length !== 1) { console.error(`footleRow: expected exactly one /footle row with a comment, found ${hits.length}; nothing written`); process.exit(2); }
const from = Number(hits[0][1]);
if (to <= from) { console.error(`footleRow: the row is already at ${from}, which is not below ${to}; nothing written`); process.exit(2); }
let note = '';
if (noteFile) {
  note = fs.readFileSync(noteFile, 'utf-8').trim();
  const bad = [String.fromCharCode(0x2013), String.fromCharCode(0x2014), '*/', '\n', '\r'].filter(c => note.includes(c));
  if (!note || bad.length) { console.error('footleRow: the note is empty, or holds a dash character, a line break or a comment end; nothing written'); process.exit(2); }
}
const next = src.replace(ROW, `['/footle', ${to}], /* ${note ? `${note} Before that: ` : ''}`);
if (next === src) { console.error('footleRow: the edit changed nothing; nothing written'); process.exit(2); }
fs.writeFileSync(file, next);
console.log(`footleRow: /footle ${from} to ${to}${note ? ', with the note' : ', number only'}`);
