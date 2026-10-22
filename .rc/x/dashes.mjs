// Round 1540 fixer 3: no en or em dash in the lines this fixer added, or in its commit messages.
import { execSync } from 'node:child_process';
const D = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const has = (s) => D.some(d => s.includes(d));
const added = (range) => execSync(`git diff ${range}`, { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
const lines = [...added('923fbfbe9 b6547cda2 -- scripts'), ...added('32c045f82 a862aa7fb -- docs/audits scripts')];
const msgs = ['b6547cda2', '32c045f82', 'dd9031ae6', 'a862aa7fb'].map(c => execSync(`git log -1 --format=%B ${c}`, { encoding: 'utf8' }));
const badLines = lines.filter(has).length;
const badMsgs = msgs.filter(has).length;
console.log(`added lines read: ${lines.length}, with a dash: ${badLines}; commit messages read: ${msgs.length}, with a dash: ${badMsgs}`);
process.exit(badLines || badMsgs ? 1 : 0);
