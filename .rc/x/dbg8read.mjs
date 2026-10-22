// Round 1540 fixer 3, item 8: summarise the DBG8 lines of one harness log (deduped by season and man).
import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8');
const seen = new Map();
const re = /^DBG8 SHEET (\d+) (\S+) svc (\S+) round (\S+) ovr (\d+) salary ([\d.]+) years (\d+) max ([\d.]+) cap ([\d.]+)/;
for (const line of text.split('\n')) {
  const m = re.exec(line);
  if (!m) continue;
  seen.set(`${m[1]}:${m[2]}`, { svc: m[3], round: m[4], ovr: +m[5], salary: +m[6], years: +m[7], max: +m[8], cap: +m[9] });
}
const groups = {};
for (const s of seen.values()) {
  const k = `service ${s.svc}, round ${s.round}`;
  (groups[k] ??= []).push(s);
}
console.log(`sheets tabled (distinct man and season): ${seen.size}`);
for (const [k, list] of Object.entries(groups).sort()) {
  const sal = list.map(s => s.salary).sort((a, b) => a - b);
  const share = list.map(s => (100 * s.salary) / s.cap).sort((a, b) => a - b);
  const ovr = list.map(s => s.ovr).sort((a, b) => a - b);
  const mid = (a) => a[Math.floor(a.length / 2)];
  console.log(`${k}: ${list.length} sheets, salary ${sal[0]} to ${sal[sal.length - 1]} (median ${mid(sal)}), share of cap ${share[0].toFixed(1)} to ${share[share.length - 1].toFixed(1)} percent (median ${mid(share).toFixed(1)}), rating ${ovr[0]} to ${ovr[ovr.length - 1]}, years ${[...new Set(list.map(s => s.years))].sort().join('/')}`);
}
