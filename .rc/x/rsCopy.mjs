/* Reviewer helper: copy pictures from a folder into $RC_OUT/<sub>, smallest first, until a byte budget is spent,
   and write the full list (name and size) so the reviewer knows what was left behind.
   node .rc/x/rsCopy.mjs <from> <sub> <megabytes> */
import fs from 'node:fs';
import path from 'node:path';
const [from, sub, mb] = process.argv.slice(2);
const to = path.join(process.env.RC_OUT || '.tmp-fx/rs-out', sub);
fs.mkdirSync(to, { recursive: true });
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
const files = walk(from).filter(f => f.endsWith('.png') || f.endsWith('.jpg')).map(f => ({ f, size: fs.statSync(f).size })).sort((a, b) => a.size - b.size);
let spent = 0; const budget = Number(mb) * 1024 * 1024; const list = [];
for (const { f, size } of files) {
  const name = path.relative(from, f).split(path.sep).join('__');
  const take = spent + size <= budget;
  if (take) { fs.copyFileSync(f, path.join(to, name)); spent += size; }
  list.push(`${take ? 'copied ' : 'LEFT   '} ${String(size).padStart(8)} ${name}`);
}
fs.writeFileSync(path.join(to, 'LIST.txt'), list.join('\n') + '\n');
console.log(`rsCopy: ${files.length} pictures in ${from}, ${list.filter(l => l.startsWith('copied')).length} copied, ${(spent / 1048576).toFixed(1)} MB`);
