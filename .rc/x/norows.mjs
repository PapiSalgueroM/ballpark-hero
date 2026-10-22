/* Round 1520 fix proof (never committed): take the review's four clubCountry rows (Welsh and Canadian clubs) out of
   src/lib/clubManager.ts in place on the runner, through the bridge's own anchors. The request line restores it. */
import fs from 'node:fs';
import { BRIDGE_EDITS_1520 } from '../../scripts/lib/cmNoMadeUpNations1520.mjs';
const F = 'src/lib/clubManager.ts';
const rows = BRIDGE_EDITS_1520.filter(([file, label]) => file === F && /Welsh|Swansea|Canadian|Vancouver/.test(label));
if (rows.length !== 4) { console.log(`norows: ${rows.length} row edits found, refusing`); process.exit(3); }
let src = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
for (const [, label, from, to] of rows) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`norows: "${label}" anchor found ${n} times, refusing`); process.exit(3); }
  src = src.replace(from, () => to);
}
fs.writeFileSync(F, src);
console.log('norows: the four clubCountry rows are out');
