/* Reviewer, runner only: a copy of the tree whose takeover keeps the failed objectives (the harness control
   keepfailed, applied to the source a dist is built from), to see whether playCmBoardVerdict's check (d) can
   go red. Usage: node ctlD.mjs <tree> */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const file = path.join(process.argv[2], 'src/lib/clubManager.ts');
const t = readFileSync(file, 'utf8');
const from = "  return objectiveStatuses(s).filter(x => x.status !== 'failed').map(x => x.objective);";
const n = t.split(from).length - 1;
if (n !== 1) { console.log(`ctlD: anchor found ${n} times; could not run`); process.exit(2); }
writeFileSync(file, t.replace(from, '  return s.boardObjectives ?? [];'));
console.log(`ctlD: patched ${file}`);
