// Round 1328 probe: where a minified symbol is defined in a chunk, and which chunks import a given export alias.
// Usage: node symWhy.mjs <assetsDir> <chunkStem> <symbol> [<symbol> ...]
import fs from 'node:fs';
import path from 'node:path';
const [dir, stem, ...syms] = process.argv.slice(2);
const file = fs.readdirSync(dir).find(f => f.startsWith(stem + '-') && f.slice(stem.length + 1).length === 11 && f.endsWith('.js'));
const src = fs.readFileSync(path.join(dir, file), 'utf8');
const esc = s => s.replace(/[$]/g, '\\$');
for (const s of syms) {
  const re = new RegExp(`(function ${esc(s)}\\(|[,{ ;]${esc(s)}=)`);
  const m = re.exec(src);
  console.log(`== ${file} ${s}: ${m ? src.slice(Math.max(0, m.index - 60), m.index + 260) : 'no definition found'}`);
  const alias = new RegExp(`${esc(s)} as ([A-Za-z0-9_$]+)[,}]`).exec(src.slice(src.lastIndexOf('export{')));
  if (alias) {
    const users = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== file && new RegExp(`[{,]${esc(alias[1])} as [A-Za-z0-9_$]+[,}][^;]*from"\\./${stem}-`).test(fs.readFileSync(path.join(dir, f), 'utf8')));
    console.log(`   exported as ${alias[1]}, imported by ${users.join(', ') || 'nobody found'}`);
  }
}
