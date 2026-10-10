// Round 1225 fixer: added lines and commit messages since the reviewed head that hold an en dash or an em dash.
import { execFileSync } from 'node:child_process';

const FROM = process.argv[2] || 'f238da12b14c3d5f2c5f8b614b0f22174bf0438d';
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
const en = String.fromCharCode(0x2013), em = String.fromCharCode(0x2014);
let file = '', bad = 0, added = 0;
for (const line of git(['diff', `${FROM}..HEAD`, '--unified=0']).split('\n')) {
  if (line.startsWith('+++ ')) { file = line.slice(6); continue; }
  if (!line.startsWith('+')) continue;
  added += 1;
  if (line.includes(en) || line.includes(em)) { bad += 1; if (bad <= 5) console.log(`${file}: ${line.slice(0, 160)}`); }
}
const log = git(['log', `${FROM}..HEAD`, '--format=%H%n%B']);
const inLog = log.split('\n').filter(line => line.includes(en) || line.includes(em));
inLog.slice(0, 5).forEach(line => console.log(`commit message: ${line.slice(0, 160)}`));
console.log(`since ${FROM.slice(0, 8)}: ${added} added lines, ${bad} with an en or em dash; commit message lines with one: ${inLog.length}`);
process.exit(bad || inLog.length ? 1 : 0);
