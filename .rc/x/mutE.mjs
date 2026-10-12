/* Review mutation E (the two source rule weakened): N9's names need ONE group, not two. Expected: the harness
   green (the data is two sourced) and the controls semisone and onegroup MISFIRED, which proves the controls
   guard the rule. Refuses (exit 2) when the line is not there once. */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'scripts/simUsSeasonLedger.mjs';
const t = readFileSync(F, 'utf8');
const from = "check('N9', new Set(agree.map(s => s.group)).size >= 2,";
if (t.split(from).length !== 2) { console.log('MUTATION E ABORTED: the two group names check is not there once'); process.exit(2); }
writeFileSync(F, t.replace(from, "check('N9', new Set(agree.map(s => s.group)).size >= 1,"));
console.log('mutation E applied: N9 names need one group');
