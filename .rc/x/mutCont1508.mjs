// Release BI, part five (Round BIK): the negative control of x/contCmp1508.sh. Takes Round 1508's adoption bridge out
// of scripts/simManagerWorldContinuity.mjs's current arm in the checkout (the run must restore it: git checkout --
// scripts), so contCmp1508 must go red on the adoption's ledger in the inactive group, as r1508-g2 saw before the
// bridge. Fails closed (exit 2) unless the bridged line stands exactly once.
import fs from 'node:fs';
const F = 'scripts/simManagerWorldContinuity.mjs';
const text = fs.readFileSync(F, 'utf8');
const from = 'const bridged = withoutAdoption(withoutAiMoves(source, file), file);';
const to = 'const bridged = withoutAiMoves(source, file);';
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`mutCont1508: the bridged line stands ${n} times in ${F}, not once`); process.exit(2); }
fs.writeFileSync(F, text.replace(from, () => to));
console.log(`mutCont1508: the adoption bridge is out of ${F}`);
