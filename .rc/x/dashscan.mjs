// Round 1592 fix: count en and em dashes on the ADDED lines of the round's diff (base 14a9af704 to HEAD), src and scripts.
// Control: DASH_CONTROL=1 adds one fake added line holding an en dash, which must count 1.
import { execSync } from 'node:child_process';
const en = String.fromCharCode(0x2013), em = String.fromCharCode(0x2014);
const diff = execSync('git diff 14a9af704 HEAD -- src scripts', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const added = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
if (process.env.DASH_CONTROL === '1') added.push(`+ a fake line ${en} for the control`);
const hits = added.filter(l => l.includes(en) || l.includes(em));
for (const h of hits.slice(0, 10)) console.log('  DASH: ' + h.slice(0, 160));
console.log(`dashscan: ${added.length} added lines, ${hits.length} with an en or em dash${process.env.DASH_CONTROL === '1' ? ' (control on)' : ''}`);
process.exit(hits.length ? 1 : 0);
