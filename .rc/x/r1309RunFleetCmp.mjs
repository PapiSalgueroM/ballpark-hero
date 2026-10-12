// Round 1309 review: compare the fleet the base wrote with the fleet the head wrote, press for press.
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
let presses = 0, differ = 0, errors = 0, olds = 0;
for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
  const x = a[i], y = b[i];
  if (!x || !y) { console.log(`case ${i}: missing on one side`); differ += 1; continue; }
  const n = Math.max(x.steps.length, y.steps.length);
  for (let k = 0; k < n; k += 1) {
    const s = x.steps[k], t = y.steps[k];
    presses += 1;
    if (!s || !t || s.error || t.error) { errors += 1; console.log(`case ${i} press ${k}: base ${JSON.stringify(s)} head ${JSON.stringify(t)}`); continue; }
    if (s.label.startsWith('Play the final')) olds += 1;
    const same = s.sha === t.sha && s.len === t.len && s.draws === t.draws && s.label === t.label;
    if (!same) { differ += 1; console.log(`case ${i} (${x.kind}, desk ${x.desk}, week ${x.w}) press ${k} "${s.label}": base ${s.sha}/${s.len}/${s.draws} head ${t.sha}/${t.len}/${t.draws}`); }
  }
}
console.log(`fleet: ${a.length} cases, ${presses} presses (${olds} on the old button), ${differ} differ, ${errors} errors`);
process.exit(differ || errors ? 1 : 0);
