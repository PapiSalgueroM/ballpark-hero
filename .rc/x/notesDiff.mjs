// Release BK triage, runner only: reads a qualifyManagerNoteSnapshots report.json and prints, for every saved() row
// whose loaded career differs from the career it saved, the keys that differ (two levels deep, values cut short).
// usage: node .rc/x/notesDiff.mjs <OUT>/report.json
import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const J = v => (v === undefined ? 'undefined' : JSON.stringify(v));
const rows = [];
(function walk(v) {
  if (Array.isArray(v)) { v.forEach(walk); return; }
  if (v && typeof v === 'object') {
    if ('before' in v && 'after' in v && 'raw' in v) rows.push(v);
    for (const k of Object.keys(v)) walk(v[k]);
  }
})(report);
let bad = 0;
for (const [i, r] of rows.entries()) {
  if (J(r.before) === J(r.after)) continue;
  bad += 1;
  if (bad > 2) continue;
  const a = r.before || {}, b = r.after || {};
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => J(a[k]) !== J(b[k]));
  console.log(`row ${i}: ${keys.length} top keys differ: ${keys.join(', ')}`);
  for (const k of keys.slice(0, 8)) {
    const x = a[k], y = b[k];
    if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) {
      const sub = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(s => J(x[s]) !== J(y[s]));
      console.log(`  ${k}: subkeys ${sub.join(', ').slice(0, 300)}`);
      for (const s of sub.slice(0, 4)) console.log(`    ${k}.${s} saved=${J(x[s]).slice(0, 200)} loaded=${J(y[s]).slice(0, 200)}`);
    } else {
      console.log(`  ${k} saved=${J(x).slice(0, 250)} loaded=${J(y).slice(0, 250)}`);
    }
  }
}
console.log(`notesDiff: ${rows.length} saved rows, ${bad} where the loaded career differs; report status ${report.status}`);
