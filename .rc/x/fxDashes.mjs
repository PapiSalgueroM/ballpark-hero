// Round 1214 fix pass, runner only (never committed): no em dash or en dash in any file the branch
// adds or edits against main, nor in any of its own commit messages. On the runner HEAD is the
// request commit and HEAD^ is the pushed head. Exit 1 when a dash is found.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const sh = cmd => execSync(cmd, { encoding: 'utf8' }).trim();
sh('git fetch -q origin main');
const head = sh('git rev-parse HEAD^');
const base = sh(`git merge-base origin/main ${head}`);
const names = sh(`git diff --name-only ${base} ${head}`).split('\n').filter(Boolean);
let bad = 0;
for (const f of names) {
  if (!fs.existsSync(f)) continue;
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes(EN) || line.includes(EM)) {
      bad += 1;
      if (bad <= 20) console.log(`DASH ${f}:${i + 1}: ${line.slice(0, 160)}`);
    }
  });
}
const msgs = sh(`git log --no-merges --format=%B origin/main..${head}`).split('\n');
const subjects = sh(`git log --no-merges --format=%s origin/main..${head}`).split('\n').filter(Boolean);
const msgBad = msgs.filter(l => l.includes(EN) || l.includes(EM));
msgBad.slice(0, 10).forEach(l => console.log(`DASH in a commit message: ${l.slice(0, 160)}`));
const offShape = subjects.filter(s => !s.startsWith('Round 1214: '));
offShape.forEach(s => console.log(`a commit subject that does not start with the round: ${s.slice(0, 120)}`));
console.log(`files against main (${base.slice(0, 8)}): ${names.join(', ')}`);
console.log(`fxDashes: ${names.length} files read, ${bad} lines with a dash, ${subjects.length} commits, ${msgBad.length} commit message lines with a dash, ${offShape.length} subjects off shape`);
process.exit(bad || msgBad.length || offShape.length ? 1 : 0);
