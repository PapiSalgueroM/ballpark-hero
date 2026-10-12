/* Review mutation D (a check dropped from the harness): N10's "the two receipts print the same series" is
   taken out. If the harness stays green AND every control still fires, no control covers that sub-check.
   With MUT_D_PLUS_A=1 mutation A is applied as well (one source misread), to show what then goes unseen.
   Refuses (exit 2) when the line is not there once. */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'scripts/simUsSeasonLedger.mjs';
const t = readFileSync(F, 'utf8');
const from = "check('N10', prints.every(s => sorted(s) === sorted(prints[0])),";
if (t.split(from).length !== 2) { console.log('MUTATION D ABORTED: the agreement check is not there once'); process.exit(2); }
writeFileSync(F, t.replace(from, "check('N10', true || prints.every(s => sorted(s) === sorted(prints[0])),"));
console.log('mutation D applied: N10 agreement check always true');
