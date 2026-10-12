// Reviewer facts-screens-weight, Release AZ. Never committed. Reads the vitest JSON of the two unit files and
// prints the counts manager-world-continuity.yml asserts (135 total, 91 and 44 per file, its receipt step).
import fs from 'node:fs';
const units = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(`numTotalTests ${units.numTotalTests} passed ${units.numPassedTests} failed ${units.numFailedTests} (the workflow asserts 135 and 135)`);
for (const row of units.testResults) {
  const name = row.name.split('/').slice(-1)[0];
  console.log(`  ${name}: ${row.assertionResults.length} tests (${row.assertionResults.filter(a => a.status === 'passed').length} passed)`);
}
const kit = fs.readFileSync('scripts/qa/managerWorldContinuityKit.mjs', 'utf8').match(/export const BASE = '([0-9a-f]+)'/);
const wf = fs.readFileSync('.github/workflows/manager-world-continuity.yml', 'utf8').match(/assert\.equal\(controls\.base,'([0-9a-f]+)'\)/);
console.log(`kit BASE ${kit && kit[1]}; the workflow asserts controls.base ${wf && wf[1]}; equal ${!!(kit && wf && kit[1] === wf[1])}`);
const off = units.numTotalTests !== 135 || !(kit && wf && kit[1] === wf[1]);
console.log(off ? 'unitsCount: the receipt step of manager-world-continuity.yml would fail on this head' : 'unitsCount: the receipt step would hold');
process.exit(off ? 1 : 0);
