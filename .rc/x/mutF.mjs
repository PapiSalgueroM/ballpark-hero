/* Review mutation F (a check dropped): N9's "the ledger holds the league's spelling" is taken out. If the
   harness stays green AND every control still fires, no control covers that sub-check.
   Refuses (exit 2) when the line is not there once. */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'scripts/simUsSeasonLedger.mjs';
const t = readFileSync(F, 'utf8');
const from = "if (league) check('N9', league.values.rounds[y][i].toLowerCase() === name.toLowerCase(),";
if (t.split(from).length !== 2) { console.log('MUTATION F ABORTED: the spelling check is not there once'); process.exit(2); }
writeFileSync(F, t.replace(from, "if (league) check('N9', true,"));
console.log('mutation F applied: N9 spelling check always true');
