// Review rBUG-rest (never committed): mutation of the L3 seam. Takes intlRepairPending out of the Hall wall keep
// effect's dependency list (the early return keeps it), so the effect no longer re-runs when the hold lifts on a
// repair that changed nothing. Asserts the string exists first, so the control cannot silently do nothing.
import fs from 'node:fs';
const file = 'src/components/us-career/UsCareerBoard.tsx';
const src = fs.readFileSync(file, 'utf8');
const old = '}, [career, sport, saveFailure, intlRepairPending]);';
const count = src.split(old).length - 1;
if (count !== 1) { console.log(`rrmutdeps: ABORT, the deps line is in the board ${count} times`); process.exit(3); }
fs.writeFileSync(file, src.replace(old, '}, [career, sport, saveFailure]);'));
console.log('rrmutdeps: applied (intlRepairPending out of the keep effect deps)');
