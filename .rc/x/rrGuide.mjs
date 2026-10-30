// Fixer re-record proof (runner only, restored by git checkout in the same line):
//   node rrGuide.mjs <hockeyFrom> <recordFrom>
// Puts the frozen guide record of commit <recordFrom> in place, then in src/data/gameContent/hockey.ts restores to
// commit <hockeyFrom>'s text every changed line whose old sentence that record holds (and no other line). Prints each
// line it restored. simGuideHeadings then says whether the old record replays green with only those inputs reverted.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const [hockeyFrom, recordFrom] = process.argv.slice(2);
if (!hockeyFrom || !recordFrom) { console.error('RR ABORT: name two commits'); process.exit(2); }
const HOCKEY = 'src/data/gameContent/hockey.ts';
const RECORD = 'scripts/data/guideHeadingsFrozen.json';
const show = (sha, p) => execSync(`git show ${sha}:${p}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n');
const record = show(recordFrom, RECORD);
fs.writeFileSync(RECORD, record);
const held = new Set();
const walk = v => { if (typeof v === 'string') held.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
walk(JSON.parse(record));
const old = show(hockeyFrom, HOCKEY).split('\n');
const now = fs.readFileSync(HOCKEY, 'utf8').replace(/\r\n/g, '\n').split('\n');
if (old.length !== now.length) { console.error(`RR ABORT: hockey.ts has ${now.length} lines, ${hockeyFrom} had ${old.length}`); process.exit(2); }
const sentence = line => { const a = line.indexOf('"'), b = line.lastIndexOf('"'); return a >= 0 && b > a ? JSON.parse(line.slice(a, b + 1)) : null; };
let restored = 0;
for (let i = 0; i < now.length; i += 1) {
  if (old[i] === now[i]) continue;
  const s = sentence(old[i]);
  if (s !== null && held.has(s)) { now[i] = old[i]; restored += 1; console.log(`RR RESTORED line ${i + 1}: ${s.slice(0, 90)}`); }
  else console.log(`RR KEPT line ${i + 1} (its old text is not in the record)`);
}
if (restored === 0) { console.error('RR ABORT: no line restored, the proof would prove nothing'); process.exit(2); }
fs.writeFileSync(HOCKEY, now.join('\n'));
console.log(`RR READY: record of ${recordFrom}, ${restored} line(s) of hockey.ts back to ${hockeyFrom}`);
