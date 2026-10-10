// Reviewer: count added lines of the round's diff that hold an en dash or an em dash.
import { execFileSync } from 'node:child_process';
const BASE = '46e4231cc82b6c047da6e0b4bdb5dfae5628a928';
const diff = execFileSync('git', ['diff', `${BASE}..HEAD`, '--unified=0'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const en = String.fromCharCode(0x2013), em = String.fromCharCode(0x2014);
let file = '', bad = 0;
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) { file = line.slice(6); continue; }
  if (!line.startsWith('+')) continue;
  if (line.includes(en) || line.includes(em)) { bad += 1; if (bad <= 5) console.log(`${file}: ${line.slice(0, 160)}`); }
}
console.log(`added lines with an en or em dash: ${bad}`);
process.exit(bad ? 1 : 0);
