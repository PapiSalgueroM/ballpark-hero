// Round 1556: count en and em dashes in every line this round added and in its commit messages.
// usage (on the runner, the request commit on top of the branch head): node .rc/x/dashes.mjs <base sha>
import { execFileSync } from 'node:child_process';
const base = process.argv[2];
const D = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const has = s => D.some(d => s.includes(d));
const diff = execFileSync('git', ['diff', '--unified=0', base, 'HEAD~1'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const added = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
const bad = added.filter(has);
const msgs = execFileSync('git', ['log', '--format=%B%x00', `${base}..HEAD~1`], { encoding: 'utf8' }).split('\0').filter(m => m.trim());
const badMsgs = msgs.filter(has);
console.log(`added lines read: ${added.length}, with a dash: ${bad.length}; commit messages read: ${msgs.length}, with a dash: ${badMsgs.length}`);
for (const l of bad.slice(0, 5)) console.log(`  ${l.slice(0, 120)}`);
process.exit(bad.length || badMsgs.length || !added.length ? 1 : 0);
