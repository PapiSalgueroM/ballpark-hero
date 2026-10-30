// Reviewer fleet compare (runner only): node fleetCompare.mjs <base json> <head json>
// Each case is a list of "checkpoint:sha1" lines; equal means every checkpoint of every seed is byte equal.
import fs from 'node:fs';

const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
let bad = 0;
for (const sport of ['nfl', 'nhl']) {
  const ca = a[sport]?.cases ?? {}, cb = b[sport]?.cases ?? {};
  const ids = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].sort();
  const lines = Object.values(ca).flat();
  const distinct = new Set(lines.map(l => l.split(':')[1])).size;
  let diff = 0;
  for (const id of ids) {
    const x = ca[id] ?? [], y = cb[id] ?? [];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    diff += 1;
    const at = x.findIndex((l, i) => l !== y[i]);
    console.log(`FLEET ${sport} ${id}: DIFFERS first at checkpoint ${at} (${x[at]} vs ${y[at]}), lengths ${x.length} vs ${y.length}`);
  }
  console.log(`FLEET ${sport}: ${ids.length} cases, ${lines.length} checkpoints, ${distinct} distinct digests, ${diff} differ`);
  if (ids.length === 0 || diff > 0 || distinct < 10) bad += 1;
}
console.log(bad ? `FLEET RESULT: RED (${bad} sport(s))` : 'FLEET RESULT: every case of both sports equal to the base');
process.exit(bad ? 1 : 0);
