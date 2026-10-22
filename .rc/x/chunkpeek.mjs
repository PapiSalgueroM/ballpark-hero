/* Round 1523 probe (not committed): print the minified code this round added, from the built chunks. */
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.argv[2] || 'dist', 'assets');
const needles = ['no swing', 'new WeakMap', 'per:15', 'per:12', 'league game', 'Your morale is worth', 'data-morale-line', '2008'];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const n of needles) {
    let i = t.indexOf(n);
    if (i < 0 || (n === '2008' && !f.startsWith('AppearanceBuilder'))) continue;
    if (n === '2008') { const j = t.indexOf('2008', t.indexOf('Pusk')); i = j; if (i < 0) continue; }
    console.log(`== ${f} [${n}] at ${i}: ${t.slice(Math.max(0, i - 260), i + 260).replace(/\s+/g, ' ')}`);
  }
}
console.log('chunkpeek: done');
