// Fix probe for Round 1531. Usage:
//   node mut.mjs touch <file>             a later unrelated round: one comment line after line 1 and one at the end
//   node mut.mjs render                   the page floater loses formatMoneyText at its render site
// Each mode asserts its anchor exists exactly once and that the file changed, and prints MUT ok or MUT ABORT.
import fs from 'node:fs';
const [mode, arg] = process.argv.slice(2);
function abort(why) { console.log('MUT ABORT: ' + why); process.exit(2); }
function write(file, before, after) {
  if (after === before) abort('nothing changed in ' + file);
  fs.writeFileSync(file, after);
  console.log('MUT ok ' + mode + ' ' + file + ' lines ' + before.split('\n').length + ' -> ' + after.split('\n').length);
}
if (mode === 'touch') {
  if (!arg || !fs.existsSync(arg)) abort('no such file ' + arg);
  const before = fs.readFileSync(arg, 'utf8'), lines = before.split('\n');
  lines.splice(1, 0, '// a later, unrelated round edits this file near the top');
  write(arg, before, lines.join('\n') + '\n// and again at the end\n');
} else if (mode === 'render') {
  const file = 'src/pages/StadiumTycoon.tsx', before = fs.readFileSync(file, 'utf8'), from = '{formatMoneyText(f.text)}';
  if (before.split(from).length !== 2) abort('render anchor count ' + (before.split(from).length - 1));
  write(file, before, before.replace(from, '{f.text}'));
} else abort('unknown mode ' + mode);
