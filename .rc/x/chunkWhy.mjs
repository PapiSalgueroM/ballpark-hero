// Round 1328 probe: print where two builds' copies of a chunk differ once hashed names are blanked.
// Usage: node chunkWhy.mjs <baseDistAssets> <headDistAssets> <stem> [<stem> ...]
import fs from 'node:fs';
import path from 'node:path';
const [A, B, ...stems] = process.argv.slice(2);
const norm = s => s.replace(/-[A-Za-z0-9_-]{8}\.(js|css)/g, '-HASH.$1');
const find = (dir, stem) => fs.readdirSync(dir).filter(f => f.startsWith(stem + '-') && f.slice(stem.length + 1).length === 11 && f.endsWith('.js'));
for (const stem of stems) {
  const fa = find(A, stem), fb = find(B, stem);
  console.log(`== ${stem}: base ${fa.join(',')} head ${fb.join(',')}`);
  if (fa.length !== 1 || fb.length !== 1) continue;
  const a = norm(fs.readFileSync(path.join(A, fa[0]), 'utf8'));
  const b = norm(fs.readFileSync(path.join(B, fb[0]), 'utf8'));
  if (a === b) { console.log('  identical once hashes are blanked'); continue; }
  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j += 1;
  console.log(`  lengths ${a.length} and ${b.length}; first difference at ${i}, last ${j} from the end`);
  console.log(`  base: ...${a.slice(Math.max(0, i - 120), a.length - j + 40).slice(0, 700)}`);
  console.log(`  head: ...${b.slice(Math.max(0, i - 120), b.length - j + 40).slice(0, 700)}`);
}
