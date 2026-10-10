/* Fixer's light check: each named file parses (esbuild transform, no type check) and holds no forbidden dash. */
import { transformSync } from 'esbuild';
import fs from 'node:fs';

const files = process.argv.slice(2);
const DASHES = [0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map(c => String.fromCharCode(c));
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const hit = src.split('\n').findIndex(l => DASHES.some(d => l.includes(d)));
  if (hit !== -1) { bad += 1; console.log(`${f}: a forbidden dash on line ${hit + 1}`); }
  if (/\.(ts|tsx|mjs|js)$/.test(f)) {
    try { transformSync(src, { loader: f.endsWith('x') ? 'tsx' : f.endsWith('.ts') ? 'ts' : 'js', format: 'esm' }); }
    catch (e) { bad += 1; console.log(`${f}: does not parse: ${String(e.message).split('\n').slice(0, 3).join(' / ')}`); }
  }
}
console.log(`fix-syntax: ${files.length} files, ${bad} problems`);
process.exit(bad ? 1 : 0);
