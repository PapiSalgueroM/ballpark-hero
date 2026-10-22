// Round 1540 fixer 3, item 7: read a debug run's output and print the trail of every man who "is at no rival club".
import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const lost = [];
for (const l of text) {
  const m = l.match(/FAIL \[2\]: (seed \d+ season \d+): (.+) let his sheet stand and is at no rival club/);
  if (m) lost.push({ where: m[1], name: m[2] });
}
console.log(`vanished sheet men: ${lost.length}`);
const sheets = text.filter(l => l.startsWith('DBG7 SHEET')).length;
console.log(`sheet arrivals logged: ${sheets}`);
for (const { where, name } of lost) {
  console.log(`--- ${where}: ${name}`);
  const trail = text.filter(l => l.startsWith('DBG7') && l.includes(name));
  for (const l of trail.slice(0, 12)) console.log(l);
}
// How often does a sheet arrival land on a roster already at 15 or more, with him the lowest?
let atLimit = 0, lowest = 0;
for (const l of text) {
  const m = l.match(/^DBG7 SHEET \d+ \S+ .+ ovr (\d+) years \d+ roster (\d+) lowest (\d+)/);
  if (!m) continue;
  if (Number(m[2]) > 15) { atLimit++; if (Number(m[1]) < Number(m[3])) lowest++; }
}
console.log(`sheet arrivals over 15 on arrival: ${atLimit}, of them the lowest rated man there: ${lowest}`);
