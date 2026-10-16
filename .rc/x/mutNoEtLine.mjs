// Negative control for the viewer hunk of e0527b07: take the one line out and the banner test must go red.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'src/components/club-manager/LiveSimScreen.tsx';
const t = readFileSync(f, 'utf8');
const line = '          if (liveNow?.et && e.minute === liveNow.et.from && !e.plus) { small = big.segs; big = null; }\n';
if (!t.includes(line)) { console.log('MUTATION ABORTED: the viewer line is not in the file, so the control would change nothing'); process.exit(3); }
const out = t.replace(line, '');
if (out === t) { console.log('MUTATION ABORTED: nothing changed'); process.exit(3); }
writeFileSync(f, out);
console.log('MUTATION ON: the break before extra time line is gone from LiveSimScreen.tsx');
