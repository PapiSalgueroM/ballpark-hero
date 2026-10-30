// Negative control for src/test/cmFreeAgentOldLedger1600.test.ts: put main's exact birth year comparison back in
// freeAgentRecord. Refuses to run unless the anchor is in the file exactly once, and proves the file changed.
import fs from 'node:fs';
const FILE = 'src/lib/clubManager.ts';
const FROM = '&& bornNear(birthYear, record.origin.birthYear, near) && record.player.position === fa.position';
const TO = '&& record.origin.birthYear === birthYear && record.player.position === fa.position';
const src = fs.readFileSync(FILE, 'utf8');
const n = src.split(FROM).length - 1;
if (n !== 1) { console.log(`mutExact: ABORT anchor appears ${n} times`); process.exit(2); }
const out = src.replace(FROM, TO);
if (out === src) { console.log('mutExact: ABORT nothing changed'); process.exit(2); }
fs.writeFileSync(FILE, out);
console.log('mutExact: applied (freeAgentRecord reads the birth year exactly)');
