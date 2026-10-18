/* fix2-1509: the board's why line taken out of objectiveStatuses, in the checkout it is run from, to prove the unit
   test catches it. Fails closed: the line must stand exactly once. Never committed. */
import fs from 'node:fs';
const F = 'src/lib/clubManager.ts';
const from = '      if (why) return { objective, status, why };\n';
const t = fs.readFileSync(F, 'utf8').replaceAll('\r\n', '\n');
const n = t.split(from).length - 1;
if (n !== 1) { console.log(`mutWhy: refused, the line stands ${n} times`); process.exit(2); }
fs.writeFileSync(F, t.replace(from, ''));
console.log('mutWhy: objectiveStatuses no longer carries the why line');
