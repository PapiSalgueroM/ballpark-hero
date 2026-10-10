// Reviewer probe (Round 1214, the run lens): no em dash or en dash in any file the round adds or edits.
// Reads the committed files of the checkout it runs in. Exit 1 when a dash is found.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const base = 'faf0a5f3';
const names = execSync(`git diff --name-only ${base} HEAD^`, { encoding: 'utf8' }).split('\n').filter(Boolean);
let bad = 0;
for (const f of names) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes(EN) || line.includes(EM)) {
      bad += 1;
      if (bad <= 20) console.log(`DASH ${f}:${i + 1}: ${line.slice(0, 160)}`);
    }
  });
}
const msgs = execSync(`git log --format=%B ${base}..HEAD^`, { encoding: 'utf8' });
const msgBad = msgs.split('\n').filter(l => l.includes(EN) || l.includes(EM));
msgBad.slice(0, 10).forEach(l => console.log(`DASH in a commit message: ${l.slice(0, 160)}`));
console.log(`revDashes: ${names.length} files read, ${bad} lines with a dash, ${msgBad.length} commit message lines with a dash`);
process.exit(bad || msgBad.length ? 1 : 0);
