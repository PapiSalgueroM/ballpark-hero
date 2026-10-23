// Release BF join: the fixed-phase check of Round 1350's workflow step "Actual creator build loading and callback journeys",
// copied from .github/workflows/soccer-career-daily-life.yml (fixed arm only) so it runs on an rc runner.
// env: BUILD_METHOD_EXIT, SOCCER_ROUTINE_OUT (absolute), SOCCER_BUILD_BASELINE_REPORT (the qualified baseline report.json)
import fs from 'node:fs';
import assert from 'node:assert/strict';
const report = JSON.parse(fs.readFileSync(process.env.SOCCER_ROUTINE_OUT + '/build-lazy/fixed/report.json'));
console.log('lazyCheck: status=' + report.status + ' checks=' + report.checks + ' failures=' + report.failures + ' eager=' + report.eagerBuildFetches + ' inventory=' + report.inventory.length + ' issues=' + JSON.stringify(report.issues).slice(0, 600));
assert.equal(Number(process.env.BUILD_METHOD_EXIT), 0);
assert.equal(report.status, 'passed');
assert.equal(report.eagerBuildFetches, 0);
assert.equal(report.healthyFlows, 3);
assert.equal(report.cases.length, 3);
assert.deepEqual(report.cases.map(row => row.width), [320, 390, 1280]);
assert.equal(report.controls.length, 1);
assert.equal(report.recoveries.length, 1);
assert.equal(report.inventory.length, 12);
assert.equal(report.failures, 0);
assert.equal(report.setupFailures, 0);
for (const held of ['sourceHeld', 'distHeld', 'toolsHeld', 'installedHeld', 'fontsHeld']) assert.equal(report[held], true, held);
assert(report.checks > 0);
for (const row of report.cases) {
  assert.equal(row.issues.length, 0);
  assert.equal(row.errors.length, 0);
  assert.equal(row.coldBuildLoads.length, 0);
}
const before = JSON.parse(fs.readFileSync(process.env.SOCCER_BUILD_BASELINE_REPORT));
assert.equal(before.sourceHead, '6ebe56db92ce4f2075582eb49899cb849f3cc739');
assert.equal(before.status, 'baseline-reproduced');
assert.equal(before.healthyFlows, 3);
assert.equal(before.eagerBuildFetches, 3);
assert.equal(before.failures, 0);
assert.equal(before.setupFailures, 0);
assert.equal(before.inventory.length, 9);
for (const row of report.cases) {
  const previous = before.cases.find(candidate => candidate.width === row.width);
  assert(previous);
  assert.equal(row.stages.length, 1);
  assert.equal(previous.stages.length, 1);
  for (const key of ['generated', 'first', 'physique', 'carriedFrame', 'second', 'liveOvr', 'locked']) {
    assert.deepEqual(row.stages[0][key], previous.stages[0][key], `${row.width}: ${key} differs from the qualified creator baseline`);
  }
}
console.log('lazyCheck FIXED: three healthy creator flows load the editor on Customize, with actual failed-chunk recovery and omission control.');
