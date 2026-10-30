// Never committed: count en and em dashes in the given files (or in the round's diff against a commit).
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const args = process.argv.slice(2);
let files = args;
if (args[0] === '--diff') files = execSync(`git diff --name-only ${args[1]} HEAD`, { encoding: 'utf8' }).split('\n').filter(Boolean).filter(f => fs.existsSync(f));
let total = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const n = [...t].filter(c => c === EN || c === EM).length;
  if (n) console.log(`${f}: ${n}`);
  total += n;
}
console.log(`dashes: ${total} in ${files.length} files`);
process.exit(total ? 1 : 0);
