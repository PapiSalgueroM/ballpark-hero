// Reviewer probe: added lines of the round (vs e814c2de) that hold an en or em dash.
import { execSync } from 'node:child_process';
const EN = String.fromCharCode(0x2013), EM = String.fromCharCode(0x2014);
const diff = execSync('git diff -U0 e814c2de HEAD -- . ":(exclude).rc"', { maxBuffer: 64 * 1024 * 1024 }).toString();
let file = '', added = 0; const bad = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) { file = line.slice(6); continue; }
  if (line.startsWith('+') && !line.startsWith('+++')) { added++; if (line.includes(EN) || line.includes(EM)) bad.push(`${file}: ${line.slice(0, 120)}`); }
}
console.log(`${added} added lines scanned; with a dash: ${bad.length}`);
for (const b of bad) console.log('  ' + b);
process.exit(bad.length ? 1 : 0);
