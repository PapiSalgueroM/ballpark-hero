/* Round 1568 (never committed): counts en and em dashes in the lines this branch ADDS against a base, and in its
   commit messages. Usage on a runner: node .rc/x/dashscan.mjs <base sha>   Exit 0 only when both counts are 0.
   Control: DASH_CONTROL=1 counts one planted added line, so the scan must report 1 and exit 1. */
import { execFileSync } from 'node:child_process';
const base = process.argv[2];
if (!base) { console.error('dashscan: give the base sha'); process.exit(2); }
const EN = String.fromCharCode(0x2013), EM = String.fromCharCode(0x2014);
const diff = execFileSync('git', ['diff', '-U0', `${base}...HEAD`], { encoding: 'utf8', maxBuffer: 1 << 28 });
const added = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
if (process.env.DASH_CONTROL === '1') added.push('+planted ' + EN + ' line');
const bad = added.filter(l => l.includes(EN) || l.includes(EM));
const msgs = execFileSync('git', ['log', '--format=%B', `${base}..HEAD`], { encoding: 'utf8' });
const badMsg = msgs.split('\n').filter(l => l.includes(EN) || l.includes(EM));
for (const l of bad.slice(0, 10)) console.log('  dash in added line: ' + l.slice(0, 160));
for (const l of badMsg.slice(0, 10)) console.log('  dash in commit message: ' + l.slice(0, 160));
console.log(`dashscan: ${added.length} added lines against ${base.slice(0, 9)}, ${bad.length} with an en or em dash; commit messages: ${badMsg.length}`);
process.exit(bad.length || badMsg.length ? 1 : 0);
