// Round 1540 fix2: read a p9 run's output. Counts sheet arrivals by roster size on arrival and what became of each.
// argv[3] is the sport's roster limit (a roster above it on arrival is one the engine's summer may waive down).
import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const limit = Number(process.argv[3] || 15);
const sizes = {};
let over = 0, arrivals = 0;
for (const l of text) {
  const m = l.match(/^P9 SHEET \d+ \S+ .+ roster (\d+)$/);
  if (!m) continue;
  arrivals++;
  sizes[m[1]] = (sizes[m[1]] || 0) + 1;
  if (Number(m[1]) > limit) over++;
}
const fate = { 'ON-SHEET-CLUB': 0, 'ON-OTHER': 0, POOL: 0, LOST: 0 };
const odd = [];
for (const l of text) {
  const m = l.match(/^P9 (ON-SHEET-CLUB|ON-OTHER|POOL|LOST) /);
  if (!m) continue;
  fate[m[1]]++;
  if (m[1] !== 'ON-SHEET-CLUB') odd.push(l);
}
console.log(`p9 arrivals ${arrivals}, over the limit ${limit} on arrival ${over}, roster sizes ${JSON.stringify(sizes)}`);
console.log(`p9 after the engine's summer: ${JSON.stringify(fate)}`);
for (const l of odd.slice(0, 12)) console.log(`  ${l.slice(0, 160)}`);
const fails = text.filter(l => /is at no rival club|is not there after the summer/.test(l));
console.log(`harness vanish lines: ${fails.length}`);
for (const l of fails.slice(0, 6)) console.log(`  ${l.slice(0, 180)}`);
const last = text.filter(l => /^sim\w+GmDesk/.test(l)).pop();
console.log(`harness last: ${last ? last.slice(0, 160) : '(none)'}`);
