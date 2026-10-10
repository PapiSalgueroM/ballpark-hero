/* Round 1218, closing fix: a STAND-IN ruling, applied on a runner only and never committed.
 * It closes the owed entry recent-seasons the way the lead's real ruling would (state accepted, a ruling text),
 * so the gates of the switch commit can be proven before the lead writes the real one. Then it runs the
 * generator, as the entry's own "closes" line says. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'scripts/data/cmVarRates.json';
const ledger = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const entry = (ledger.owed ?? []).find(o => o.id === 'recent-seasons');
if (!entry) { console.log('standin: no owed entry recent-seasons, nothing to stand in for'); process.exit(4); }
if (entry.state !== 'open') { console.log(`standin: the entry is already ${entry.state}`); process.exit(4); }
entry.state = 'accepted';
entry.ruling = 'STAND-IN, written on a runner by the closing fixer of Round 1218 to prove the gates of the switch commit. Not a ruling: the lead writes the real one (who, when, in what words).';
fs.writeFileSync(FILE, `${JSON.stringify(ledger, null, 2)}\n`);
console.log('standin: owed recent-seasons set to accepted with a stand-in ruling (runner only)');
console.log(execFileSync(process.execPath, ['scripts/genCmVarRates.mjs'], { encoding: 'utf8' }).trim());
