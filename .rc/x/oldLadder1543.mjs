// Round 1543 one shot legs (never committed). Writes the ladder before Round 1543 back
// into the head lib: the eleven moved rows and the two comment lines, each replacement
// asserted to occur exactly once.
//   node oldLadder1543.mjs <lib> --check <base lib>   identity leg: LF sha256 of the result
//                                                     equals the base file's (exit 0) or not (1)
//   node oldLadder1543.mjs <lib> --write              writes the result over <lib> (history leg 2)
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const [lib, mode, other] = process.argv.slice(2);
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const COMMENT = '// Round 1543: ids are save keys and never change; a threshold may only go down, so every saved badge stays true (contract section 23).\n';
const ROWS = [
  ["{ id: 'aw10', label: '8 career wins', emoji: '🏁', hit: s => s.totalWins >= 8 },", "{ id: 'aw10', label: '10 career wins', emoji: '🏁', hit: s => s.totalWins >= 10 },"],
  ["{ id: 'aw50', label: '35 career wins', emoji: '🏁', hit: s => s.totalWins >= 35 },", "{ id: 'aw50', label: '50 career wins', emoji: '🏁', hit: s => s.totalWins >= 50 },"],
  ["{ id: 'aw150', label: '125 career wins', emoji: '🏆', hit: s => s.totalWins >= 125 },", "{ id: 'aw150', label: '150 career wins', emoji: '🏆', hit: s => s.totalWins >= 150 },"],
  ["{ id: 'aw400', label: '300 career wins', emoji: '🏆', hit: s => s.totalWins >= 300 },", "{ id: 'aw400', label: '400 career wins', emoji: '🏆', hit: s => s.totalWins >= 400 },"],
  ["{ id: 'ag25', label: '10 goals', emoji: '⚽', hit: s => s.totalGoals >= 10 },", "{ id: 'ag25', label: '25 goals', emoji: '⚽', hit: s => s.totalGoals >= 25 },"],
  ["{ id: 'ag100', label: '30 goals', emoji: '⚽', hit: s => s.totalGoals >= 30 },", "{ id: 'ag100', label: '100 goals', emoji: '⚽', hit: s => s.totalGoals >= 100 },"],
  ["{ id: 'ag500', label: '75 goals', emoji: '⚽', hit: s => s.totalGoals >= 75 },", "{ id: 'ag500', label: '500 goals', emoji: '⚽', hit: s => s.totalGoals >= 500 },"],
  ["{ id: 'ag2000', label: '250 goals', emoji: '🥅', hit: s => s.totalGoals >= 250 },", "{ id: 'ag2000', label: '2,000 goals', emoji: '🥅', hit: s => s.totalGoals >= 2000 },"],
  ["{ id: 'win10', label: '8 wins', pay: 3000, hit: s => s.totalWins >= 8 },", "{ id: 'win10', label: '10 wins', pay: 3000, hit: s => s.totalWins >= 10 },"],
  ["{ id: 'win50', label: '35 wins', pay: 30000, hit: s => s.totalWins >= 35 },", "{ id: 'win50', label: '50 wins', pay: 30000, hit: s => s.totalWins >= 50 },"],
  ["{ id: 'goals25', label: '10 goals scored', pay: 4000, hit: s => s.totalGoals >= 10 },", "{ id: 'goals25', label: '25 goals scored', pay: 4000, hit: s => s.totalGoals >= 25 },"],
];
let text = read(lib);
const once = (from, to, what) => {
  const n = text.split(from).length - 1;
  if (n !== (what === 'comment' ? 2 : 1)) { console.error(`ABORT: ${what} occurs ${n} times`); process.exit(2); }
  text = text.split(from).join(to);
};
once(COMMENT, '', 'comment');
for (const [from, to] of ROWS) once(from, to, from.slice(0, 20));
console.log(`oldLadder1543: 2 comment lines and ${ROWS.length} rows written back`);
const sha = t => createHash('sha256').update(t).digest('hex');
if (mode === '--check') {
  const a = sha(text); const b = sha(read(other));
  console.log(`head with the old ladder ${a}\nbase file                ${b}\n${a === b ? 'IDENTICAL' : 'DIFFERENT'}`);
  process.exit(a === b ? 0 : 1);
}
if (mode === '--write') { fs.writeFileSync(lib, text); console.log(`written over ${lib}`); }
