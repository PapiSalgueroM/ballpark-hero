// Release AV scratch (sent to the runner as .rc/x/addWeightRows.mjs, never committed): in the RUNNER'S copy of
// scripts/sweepWeight.mjs only, add three rows with a budget nobody can break, so the sweep prints the measured
// size of the three US My Career pages that have no row. The file is restored in the same request line.
import fs from 'node:fs';
const F = 'scripts/sweepWeight.mjs';
const src = fs.readFileSync(F, 'utf8');
const anchor = "  ['/transfer-path', ";
if (src.split(anchor).length !== 2) { console.error('addWeightRows: the anchor row is not in the table exactly once'); process.exit(2); }
const rows = ['/mlb-my-career', '/nba-my-career', '/nhl-my-career'].filter(r => !src.includes(`['${r}',`)).map(r => `  ['${r}', 99999],\n`).join('');
fs.writeFileSync(F, src.replace(anchor, rows + anchor));
console.log(`addWeightRows: ${rows.split('\n').filter(Boolean).length} rows added for this run only`);
