// Join probe (runner only, never committed): added lines since DASH_BASE (default e814c2de) that hold an en or em
// dash. The rc request commit's own .rc folder is left out.
import { execSync } from 'node:child_process';
const BASE = process.env.DASH_BASE || 'e814c2de';
const EN = String.fromCharCode(0x2013), EM = String.fromCharCode(0x2014);
const diff = execSync(`git diff -U0 ${BASE} HEAD -- . ":(exclude).rc" ":(exclude).github/workflows/lane-remote-check.yml"`, { maxBuffer: 256 * 1024 * 1024 }).toString();
let file = '', added = 0; const bad = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) { file = line.slice(6); continue; }
  if (line.startsWith('+') && !line.startsWith('+++')) { added++; if (line.includes(EN) || line.includes(EM)) bad.push(`${file}: ${line.slice(0, 120)}`); }
}
console.log(`dashBase: ${added} added lines since ${BASE} scanned; with a dash: ${bad.length}`);
for (const b of bad.slice(0, 20)) console.log('  ' + b);
process.exit(bad.length ? 1 : 0);
