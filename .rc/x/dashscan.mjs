// reviewer scan: every file the round added against its base, for an en dash, an em dash, a horizontal bar or a minus sign
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const base = '5d6ffbefd0b7ddc3df4b48ff9e2e2ce2157e4f79';
const files = execSync(`git diff --name-only ${base} HEAD`, { encoding: 'utf8' }).split('\n').filter(Boolean).filter(f => !f.startsWith('.rc/') && !f.startsWith('.github/'));
const BAD = [0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map(c => String.fromCharCode(c));
let bad = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (BAD.some(b => l.includes(b))) { bad += 1; console.log(`${f}:${i + 1}: ${l.slice(0, 120)}`); }
  });
}
console.log(`dashscan: ${files.length} files, ${bad} lines with a dash of the forbidden kinds`);
process.exit(bad ? 1 : 0);
