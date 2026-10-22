// Review probe: append one harmless comment line to a source file, the smallest possible
// "later unrelated round edited this file" change. Prints the before and after line counts.
import fs from 'node:fs';
const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.log('TOUCH ABORT: no such file ' + file); process.exit(2); }
const before = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, before + '\n// a later, unrelated round edits this file\n');
const after = fs.readFileSync(file, 'utf8');
if (after === before) { console.log('TOUCH ABORT: nothing changed in ' + file); process.exit(2); }
console.log('TOUCH ok ' + file + ' lines ' + before.split('\n').length + ' -> ' + after.split('\n').length);
