// Reviewer mutation script for Round 1543 (runs on the runner only, from the repo root).
// node .rc/x/mut1543.mjs <name>   applies one mutation; each replaced text must occur exactly once.
import fs from 'node:fs';

const LIB = 'src/lib/stadiumTycoon.ts';
const BOTS = 'scripts/lib/tycoonBots.mjs';
const MUTS = {
  // M1: the goal pair at 20 (a NICE value, lowered from 25, family still rising: 20, 30, 75, 250).
  goals20: [[LIB, "{ id: 'ag25', label: '10 goals', emoji: '⚽', hit: s => s.totalGoals >= 10 },", "{ id: 'ag25', label: '20 goals', emoji: '⚽', hit: s => s.totalGoals >= 20 },"],
    [LIB, "{ id: 'goals25', label: '10 goals scored', pay: 4000, hit: s => s.totalGoals >= 10 },", "{ id: 'goals25', label: '20 goals scored', pay: 4000, hit: s => s.totalGoals >= 20 },"]],
  // M2: the win pair at 25 (wins 1, 8, 25, 125, 300).
  win25: [[LIB, "{ id: 'aw50', label: '35 career wins', emoji: '🏁', hit: s => s.totalWins >= 35 },", "{ id: 'aw50', label: '25 career wins', emoji: '🏁', hit: s => s.totalWins >= 25 },"],
    [LIB, "{ id: 'win50', label: '35 wins', pay: 30000, hit: s => s.totalWins >= 35 },", "{ id: 'win50', label: '25 wins', pay: 30000, hit: s => s.totalWins >= 25 },"]],
  // M4: an off by one on a moved rung that is not the control's ag2000.
  aw10gt: [[LIB, "{ id: 'aw10', label: '8 career wins', emoji: '🏁', hit: s => s.totalWins >= 8 },", "{ id: 'aw10', label: '8 career wins', emoji: '🏁', hit: s => s.totalWins > 8 },"]],
  // M5: the streak pair moved to four with honest labels (the lead fixed it at five).
  streak4: [[LIB, "{ id: 'as5', label: 'Five straight wins', emoji: '🔥', hit: s => s.streak >= 5 },", "{ id: 'as5', label: 'Four straight wins', emoji: '🔥', hit: s => s.streak >= 4 },"],
    [LIB, "{ id: 'streak5', label: 'Five wins in a row', pay: 6000, hit: s => s.streak >= 5 },", "{ id: 'streak5', label: 'Four wins in a row', pay: 6000, hit: s => s.streak >= 4 },"]],
  // M3: the measuring tool's counter minutes one count off (the new counts flag).
  countoff: [[BOTS, 'while (countTop[key] < v) { countTop[key] += 1; countFirsts[key][countTop[key]] = t; }', 'while (countTop[key] < v) { countTop[key] += 1; countFirsts[key][countTop[key] - 1] = t; }']],
};
const name = process.argv[2];
if (!MUTS[name]) { console.error(`MUTATION ABORT: unknown mutation ${name}`); process.exit(2); }
for (const [file, from, to] of MUTS[name]) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) { console.error(`MUTATION ABORT: ${name}: expected 1 occurrence in ${file}, found ${count}: ${from.slice(0, 80)}`); process.exit(2); }
  fs.writeFileSync(file, text.replace(from, to));
}
console.log(`MUTATION APPLIED: ${name} (${MUTS[name].length} replacement(s))`);
