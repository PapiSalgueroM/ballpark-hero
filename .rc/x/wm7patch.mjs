// Probe (never committed): makes simCmWorldMoves section 7 print every deal of mine that is not held to exactly one
// ledger record, with what the ledger holds under that name. Run from the repo root; restore with git checkout.
import fs from 'node:fs';
const file = 'scripts/simCmWorldMoves.mjs';
const src = fs.readFileSync(file, 'utf8');
const from = '    if (recs.length !== 1) row.refused += 1;';
if (!src.includes(from)) { console.log('wm7patch: anchor not found'); process.exit(2); }
const to = '    if (recs.length !== 1) { row.refused += 1; console.log(`   REFUSED ${arm} ${era} ${club} seed ${seed}: ${name} want ${status} at ${owner}, ${recs.length} held; under the name: ${JSON.stringify((M.ledger.readWorldRoster(st)?.records ?? []).filter(r => r.player.name === name).map(r => [r.status, r.owner, r.player.age, r.origin.club, r.origin.birthYear]))}`); }';
fs.writeFileSync(file, src.replace(from, to));
console.log('wm7patch: patched');
