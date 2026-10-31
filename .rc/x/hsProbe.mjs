// Release BV probe (never committed): make simManagers section 8 print where each Hot Seat run first differs from
// the base. Run from the checkout's root; restore with git checkout -- scripts.
import fs from 'node:fs';
const f = 'scripts/simManagers.mjs';
const s = fs.readFileSync(f, 'utf8');
const from = '    cmp(`Hot Seat at ${setup.club}`, a, b, false);';
if (s.split(from).length !== 2) { console.log(`hsProbe: the anchor stands ${s.split(from).length - 1} times, refusing`); process.exit(2); }
const to = "    { const d = firstDiff(a.value, b.value); console.log(`PROBE Hot Seat at ${setup.club}: ${JSON.stringify(d).slice(0, 600)}`); }\n" + from;
fs.writeFileSync(f, s.replace(from, to));
console.log('hsProbe: planted');
