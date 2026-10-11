// Round 1304 reviewer seed families (extra file, runner only, restored by git checkout in the same line).
// node .rc/x/fam.mjs <offset> <harness> [base]   shifts every seed of one era harness by <offset>;
// with "base" the engine file is also put back to the base commit, so the same family can be read on both engines.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [offset, harness, base] = process.argv.slice(2);
const file = `scripts/${harness}.mjs`;
const anchor = 'let x = (s >>> 0) || 1;';
const src = fs.readFileSync(file, 'utf8');
const n = src.split(anchor).length - 1;
if (n !== 1 || !/^\d+$/.test(offset ?? '')) { console.error(`FAMILY did not apply: anchor in ${file} ${n} times, offset ${offset}`); process.exit(2); }
fs.writeFileSync(file, src.replace(anchor, `let x = ((s + ${offset}) >>> 0) || 1;`));
if (base === 'base') {
  const sha = process.env.PROBE_BASE || 'cbfa94fda6b5ffad32e927a6f89117da92f67f6c';
  const engine = execFileSync('git', ['show', `${sha}:src/lib/clubManager.ts`], { maxBuffer: 256 * 1024 * 1024 });
  fs.writeFileSync('src/lib/clubManager.ts', engine);
}
console.log(`FAMILY ${offset} applied to ${file}${base === 'base' ? ' on the base engine' : ''}`);
