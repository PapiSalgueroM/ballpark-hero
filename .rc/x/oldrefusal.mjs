// Release AZ, Y2: put PR224's refusal back in src/lib/clubManagerWorldRoster.ts (a runner checkout only), failing closed.
import fs from 'node:fs';
const file = 'src/lib/clubManagerWorldRoster.ts';
const NOW = '  if (year === null || !validPlayer(transfer.player) || (transfer.from !== null && !text(transfer.from))';
const OLD = '  if (year === null || ((career as WorldRosterCareer).worldRoster !== undefined && !held) || !validPlayer(transfer.player) || (transfer.from !== null && !text(transfer.from))';
const text = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const n = text.split(NOW).length - 1;
if (n !== 1) { console.error(`oldrefusal: the line is in ${file} ${n} times`); process.exit(2); }
fs.writeFileSync(file, text.replace(NOW, OLD));
console.log('oldrefusal: an unreadable ledger is refused for ever again, as in PR224');
