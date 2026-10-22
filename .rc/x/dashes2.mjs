// Round 1540 fix2: no en or em dash in the lines this fixer added, or in its commit messages.
import { execSync } from 'node:child_process';
const D = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const has = (s) => D.some(d => s.includes(d));
const base = process.argv[2] || 'a862aa7fb';
const added = execSync(`git diff ${base} HEAD -- scripts docs/audits src`, { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
const commits = execSync(`git rev-list --no-merges ${base}..HEAD`, { encoding: 'utf8' }).split('\n').filter(Boolean);
const msgs = commits.map(c => execSync(`git log -1 --format=%B ${c}`, { encoding: 'utf8' }));
const badLines = added.filter(has).length;
const badMsgs = msgs.filter(has).length;
console.log(`since ${base}: added lines read: ${added.length}, with a dash: ${badLines}; commit messages read: ${msgs.length}, with a dash: ${badMsgs}`);
process.exit(badLines || badMsgs ? 1 : 0);
